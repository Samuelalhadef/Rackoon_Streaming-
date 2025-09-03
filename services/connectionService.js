// Service pour gérer la connectivité réseau et le statut en ligne/hors ligne
const config = require('../config');
const { EventEmitter } = require('events');

class ConnectionService extends EventEmitter {
  constructor() {
    super();
    this.isConnected = false;
    this.checkInterval = null;
  }

  // Vérifier si l'application est configurée pour fonctionner hors ligne
  isOfflineModeEnabled() {
    return config.offlineMode && config.offlineMode.enabled;
  }

  // Vérifier si les fonctionnalités réseau doivent être ignorées
  shouldSkipNetworkFeatures() {
    return config.offlineMode && config.offlineMode.skipNetworkFeatures;
  }

  // Vérifier la connectivité réseau (pour usage futur)
  async checkNetworkConnectivity() {
    if (this.isOfflineModeEnabled()) {
      this.isConnected = false;
      return false;
    }

    try {
      // Test simple de connectivité (peut être adapté selon les besoins)
      const dns = require('dns');
      return new Promise((resolve) => {
        dns.lookup('google.com', (err) => {
          this.isConnected = !err;
          resolve(this.isConnected);
        });
      });
    } catch (error) {
      this.isConnected = false;
      return false;
    }
  }

  // Démarrer la surveillance de la connectivité (pour usage futur)
  startConnectivityMonitoring(intervalMs = 30000) {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkInterval = setInterval(async () => {
      const wasConnected = this.isConnected;
      await this.checkNetworkConnectivity();
      
      if (wasConnected !== this.isConnected) {
        this.emit('connectionChanged', this.isConnected);
      }
    }, intervalMs);
  }

  // Arrêter la surveillance
  stopConnectivityMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  // Déterminer si une fonctionnalité nécessitant le réseau est disponible
  isNetworkFeatureAvailable() {
    if (this.shouldSkipNetworkFeatures()) {
      return false;
    }
    return true; // Pour l'instant, toujours disponible si pas en mode hors ligne
  }

  // Obtenir le statut de connexion formaté
  getConnectionStatus() {
    return {
      offline: this.isOfflineModeEnabled(),
      connected: this.isConnected,
      networkFeaturesAvailable: this.isNetworkFeatureAvailable(),
      mode: this.isOfflineModeEnabled() ? 'offline' : 'online'
    };
  }
}

// Instance singleton
const connectionService = new ConnectionService();

module.exports = connectionService;