// Routes pour la gestion des films
const express = require('express');
const router = express.Router();
const MovieController = require('../controllers/movieController');
const AuthController = require('../controllers/authController');

// Middleware pour vérifier l'authentification avant d'accéder aux routes
router.use(AuthController.ensureAuthenticated);

// Route pour obtenir tous les films
router.get('/', MovieController.getAllMovies);

// Route pour lancer une recherche de films sur un lecteur spécifique
router.post('/scan', MovieController.scanDrive);

// Route pour diffuser un film
router.get('/stream/:id', MovieController.streamMovie);

// Route pour supprimer un film de la base de données
router.delete('/:id', MovieController.deleteMovie);

// Route pour obtenir les statistiques des fichiers
router.get('/stats', MovieController.getFileStats);

// Route pour télécharger une affiche
router.post('/download-poster', MovieController.downloadPoster);

module.exports = router;