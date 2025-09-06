// Configuration principale de l'application
const path = require('path');

module.exports = {
  // Configuration du serveur (local uniquement, pas de réseau externe requis)
  server: {
    port: 3000,
    host: 'localhost' // Strictement localhost pour fonctionnement hors ligne
  },
  
  // Configuration pour le mode hors ligne
  offlineMode: {
    enabled: true, // Mode hors ligne activé par défaut
    skipNetworkFeatures: true // Ignorer les fonctionnalités nécessitant le réseau
  },
  
  // Configuration pour les fonctionnalités futures nécessitant le réseau
  onlineFeatures: {
    // Liste des fonctionnalités qui nécessitent une connexion
    posterDownload: false, // Téléchargement d'affiches depuis internet
    metadataSync: false,   // Synchronisation des métadonnées en ligne
    streamingServices: false, // Intégration services de streaming
    cloudSync: false,      // Synchronisation cloud des données
    updates: false         // Vérification des mises à jour en ligne
  },
  
  // Configuration de la base de données
  database: {
    path: path.join(__dirname, 'database.sqlite')
  },
  
  // Configuration de l'authentification
  auth: {
    sessionSecret: 'votre-clé-secrète-pour-les-sessions',
    saltRounds: 10 // Nombre de tours pour le hachage des mots de passe
  },
  
  // Configuration des fichiers vidéo
  video: {
    minDurationInMinutes: 15, // Durée minimale en minutes pour qu'un fichier soit considéré comme un film
    supportedFormats: ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm'] // Formats de fichiers vidéo supportés
  },
  
  // Configuration des chemins
  paths: {
    uploads: path.join(__dirname, 'uploads'),
    posters: path.join(__dirname, 'uploads', 'posters')
  }
};