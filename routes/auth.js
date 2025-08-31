// Routes pour l'authentification
const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');

// Route d'inscription
router.post('/register', AuthController.register);

// Route de connexion
router.post('/login', AuthController.login);

// Route de déconnexion
router.post('/logout', AuthController.logout);

// Route pour vérifier l'état d'authentification
router.get('/check', AuthController.checkAuth);

// Route pour obtenir les informations de l'utilisateur connecté
router.get('/me', AuthController.ensureAuthenticated, (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.session.user.id,
      username: req.session.user.username
    }
  });
});

module.exports = router;