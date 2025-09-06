// Contrôleur pour gérer les fonctionnalités de recherche et de gestion des films
const Movie = require('../models/movie');
const config = require('../config');
const path = require('path');
const fs = require('fs-extra');
const { promisify } = require('util');
const childProcess = require('child_process');
const exec = promisify(childProcess.exec);
const sqlite3 = require('sqlite3').verbose();
const https = require('https');
const http = require('http');
const crypto = require('crypto');

// Fonction pour vérifier la connectivité réseau
function isNetworkAvailable() {
  return !config.offlineMode.enabled || !config.offlineMode.skipNetworkFeatures;
}

// Connexion à la base de données pour les requêtes directes
const db = new sqlite3.Database(config.database.path);

const MovieController = {
  // Obtenir tous les films en base de données
  getAllMovies: (req, res) => {
    Movie.getAll((err, movies) => {
      if (err) {
        console.error('Erreur lors de la récupération des films:', err.message);
        return res.status(500).json({
          success: false,
          message: 'Erreur lors de la récupération des films'
        });
      }
      
      // Formater les données pour l'affichage
      const formattedMovies = movies.map(movie => {
        return {
          ...movie,
          // Convertir la durée en format lisible (HH:MM:SS)
          formattedDuration: formatDuration(movie.duration),
          // Convertir la taille en format lisible (MB, GB)
          formattedSize: formatFileSize(movie.size_bytes)
        };
      });
      
      res.status(200).json({
        success: true,
        count: movies.length,
        movies: formattedMovies
      });
    });
  },
  
  // Lancer une recherche de films sur un lecteur spécifique
  scanDrive: async (req, res) => {
    const { drivePath } = req.body;
    
    if (!drivePath || !fs.existsSync(drivePath)) {
      return res.status(400).json({
        success: false,
        message: 'Chemin de lecteur invalide ou inaccessible'
      });
    }
    
    try {
      // Informer le client que la recherche a commencé
      res.status(200).json({
        success: true,
        message: 'Recherche de films démarrée. Cela peut prendre du temps...'
      });
      
      // Lancer le processus de recherche de manière asynchrone
      // Note: La réponse a déjà été envoyée, donc ce processus s'exécute en arrière-plan
      await scanDirectoryForMovies(drivePath);
      
      console.log('Recherche de films terminée avec succès');
    } catch (error) {
      console.error('Erreur lors de la recherche de films:', error.message);
    }
  },
  
  // Récupérer un film pour le visionner
  streamMovie: (req, res) => {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'ID du film requis'
      });
    }
    
    // Récupérer le film depuis la base de données
    db.get('SELECT * FROM movies WHERE id = ?', [id], (err, movie) => {
      if (err) {
        console.error('Erreur lors de la récupération du film:', err.message);
        return res.status(500).json({
          success: false,
          message: 'Erreur lors de la récupération du film'
        });
      }
      
      if (!movie) {
        return res.status(404).json({
          success: false,
          message: 'Film non trouvé'
        });
      }
      
      // Vérifier que le fichier existe toujours
      if (!fs.existsSync(movie.path)) {
        return res.status(404).json({
          success: false,
          message: 'Fichier vidéo introuvable sur le disque'
        });
      }
      
      // Obtenir la taille du fichier
      const stat = fs.statSync(movie.path);
      const fileSize = stat.size;
      
      // Récupérer la plage de lecture (si requête de streaming partiell)
      const range = req.headers.range;
      
      if (range) {
        // Analyser la plage de lecture
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunkSize = (end - start) + 1;
        
        // Créer un flux de lecture pour la plage spécifiée
        const fileStream = fs.createReadStream(movie.path, { start, end });
        
        // Définir les en-têtes pour la lecture en streaming
        const headers = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize,
          'Content-Type': `video/${movie.format}`
        };
        
        // Envoyer le contenu partiel
        res.writeHead(206, headers);
        fileStream.pipe(res);
      } else {
        // Définir les en-têtes pour la lecture complète
        const headers = {
          'Content-Length': fileSize,
          'Content-Type': `video/${movie.format}`
        };
        
        // Envoyer le fichier complet
        res.writeHead(200, headers);
        fs.createReadStream(movie.path).pipe(res);
      }
    });
  },

  // Supprimer un film de la base de données
  deleteMovie: (req, res) => {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'ID du film requis'
      });
    }

    Movie.delete(id, (err, result) => {
      if (err) {
        console.error('Erreur lors de la suppression du film:', err.message);
        return res.status(500).json({
          success: false,
          message: 'Erreur lors de la suppression du film'
        });
      }

      if (result.changes === 0) {
        return res.status(404).json({
          success: false,
          message: 'Film non trouvé'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Film supprimé avec succès'
      });
    });
  },

  // Obtenir les statistiques des fichiers
  getFileStats: (req, res) => {
    Movie.getStats((err, stats) => {
      if (err) {
        console.error('Erreur lors de la récupération des statistiques:', err.message);
        return res.status(500).json({
          success: false,
          message: 'Erreur lors de la récupération des statistiques'
        });
      }

      res.status(200).json({
        success: true,
        stats: stats
      });
    });
  },

  // Télécharger une affiche et la stocker localement
  downloadPoster: async (req, res) => {
    try {
      const { movieId, posterUrl } = req.body;

      if (!movieId || !posterUrl) {
        return res.status(400).json({
          success: false,
          message: 'ID du film et URL de l\'affiche requis'
        });
      }
      
      // Vérifier si le mode hors ligne est activé
      if (!isNetworkAvailable()) {
        return res.status(503).json({
          success: false,
          message: 'Fonctionnalité de téléchargement d\'affiches désactivée en mode hors ligne',
          offline: true
        });
      }

      // Créer le dossier des affiches s'il n'existe pas
      await fs.ensureDir(config.paths.posters);

      // Télécharger l'affiche
      const localPosterPath = await downloadPosterFromUrl(posterUrl, movieId);

      if (localPosterPath) {
        // Mettre à jour la base de données avec le chemin local
        Movie.updateLocalPoster(movieId, localPosterPath, (err, result) => {
          if (err) {
            console.error('Erreur lors de la mise à jour de la base de données:', err);
            return res.status(500).json({
              success: false,
              message: 'Affiche téléchargée mais erreur de mise à jour BDD'
            });
          }

          res.status(200).json({
            success: true,
            message: 'Affiche téléchargée et sauvegardée avec succès',
            localPath: localPosterPath
          });
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Erreur lors du téléchargement de l\'affiche'
        });
      }
    } catch (error) {
      console.error('Erreur lors du téléchargement de l\'affiche:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors du téléchargement de l\'affiche'
      });
    }
  }
};

// Fonctions utilitaires

// Formater la durée en HH:MM:SS
function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  return [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    remainingSeconds.toString().padStart(2, '0')
  ].join(':');
}

// Formater la taille du fichier
function formatFileSize(bytes) {
  if (bytes < 1024) {
    return bytes + ' B';
  } else if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(2) + ' KB';
  } else if (bytes < 1024 * 1024 * 1024) {
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  } else {
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  }
}

// Fonction récursive pour scanner un répertoire à la recherche de films
async function scanDirectoryForMovies(directoryPath) {
  try {
    // Obtenir tous les fichiers et dossiers dans le répertoire
    const items = await fs.readdir(directoryPath);
    
    // Parcourir chaque élément
    for (const item of items) {
      const itemPath = path.join(directoryPath, item);
      
      try {
        // Obtenir les statistiques de l'élément
        const stats = await fs.stat(itemPath);
        
        if (stats.isDirectory()) {
          // Si c'est un dossier, continuer la recherche de manière récursive
          await scanDirectoryForMovies(itemPath);
        } else if (stats.isFile()) {
          // Si c'est un fichier, vérifier si c'est potentiellement un film
          const extension = path.extname(itemPath).toLowerCase();
          
          if (config.video.supportedFormats.includes(extension)) {
            // Chercher si le film existe déjà dans la base de données
            Movie.findByPath(itemPath, async (err, existingMovie) => {
              if (err) {
                console.error(`Erreur lors de la recherche du film ${itemPath} dans la base de données:`, err.message);
                return;
              }
              
              if (existingMovie) {
                // Le film existe déjà, mettre à jour les informations si nécessaire
                console.log(`Film déjà en base: ${itemPath}`);
                return;
              }
              
              try {
                // Analyser le fichier vidéo pour extraire les métadonnées
                Movie.analyzeVideoFile(itemPath, (err, movieData) => {
                  if (err) {
                    console.error(`Erreur lors de l'analyse de ${itemPath}:`, err.message);
                    return;
                  }
                  
                  // Ajouter le film à la base de données
                  Movie.create(movieData, (err, movie) => {
                    if (err) {
                      console.error(`Erreur lors de l'ajout du film ${itemPath} à la base de données:`, err.message);
                      return;
                    }
                    
                    console.log(`Nouveau film ajouté: ${movie.title}`);
                  });
                });
              } catch (error) {
                console.error(`Erreur lors du traitement du fichier ${itemPath}:`, error.message);
              }
            });
          }
        }
      } catch (error) {
        console.error(`Erreur lors du traitement de ${itemPath}:`, error.message);
      }
    }
  } catch (error) {
    console.error(`Erreur lors de la lecture du répertoire ${directoryPath}:`, error.message);
  }
}

// Fonction pour télécharger une affiche depuis une URL
async function downloadPosterFromUrl(url, movieId) {
  return new Promise((resolve, reject) => {
    try {
      // Vérifier si le réseau est disponible
      if (!isNetworkAvailable()) {
        console.log('Mode hors ligne: téléchargement d\'affiche ignoré');
        resolve(null);
        return;
      }
      // Générer un nom de fichier unique basé sur l'ID du film et un hash de l'URL
      const urlHash = crypto.createHash('md5').update(url).digest('hex').substring(0, 8);
      const extension = path.extname(url.split('?')[0]) || '.jpg';
      const filename = `poster_${movieId}_${urlHash}${extension}`;
      const localPath = path.join(config.paths.posters, filename);

      // Vérifier si le fichier existe déjà
      if (fs.existsSync(localPath)) {
        console.log(`Affiche déjà téléchargée: ${localPath}`);
        resolve(localPath);
        return;
      }

      // Créer le flux d'écriture
      const file = fs.createWriteStream(localPath);
      
      // Déterminer le module à utiliser (http ou https)
      const requestModule = url.startsWith('https:') ? https : http;
      
      // Effectuer la requête
      const request = requestModule.get(url, (response) => {
        // Vérifier le code de statut
        if (response.statusCode !== 200) {
          console.error(`Erreur HTTP: ${response.statusCode} pour ${url}`);
          fs.unlink(localPath, () => {}); // Supprimer le fichier en cas d'erreur
          resolve(null);
          return;
        }

        // Pipe la réponse vers le fichier
        response.pipe(file);

        file.on('finish', () => {
          file.close(() => {
            console.log(`Affiche téléchargée avec succès: ${localPath}`);
            resolve(localPath);
          });
        });

        file.on('error', (err) => {
          console.error('Erreur lors de l\'écriture du fichier:', err);
          fs.unlink(localPath, () => {}); // Supprimer le fichier en cas d'erreur
          resolve(null);
        });
      });

      request.on('error', (err) => {
        console.error('Erreur lors du téléchargement:', err);
        fs.unlink(localPath, () => {}); // Supprimer le fichier en cas d'erreur
        resolve(null);
      });

      // Timeout après 30 secondes
      request.setTimeout(30000, () => {
        console.error('Timeout lors du téléchargement de l\'affiche');
        request.destroy();
        fs.unlink(localPath, () => {});
        resolve(null);
      });

    } catch (error) {
      console.error('Erreur lors du téléchargement de l\'affiche:', error);
      resolve(null);
    }
  });
}

module.exports = MovieController;