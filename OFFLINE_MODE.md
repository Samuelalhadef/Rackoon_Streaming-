# Mode Hors Ligne - Documentation

## 📱 État Actuel

L'application **Rackoon Streaming** fonctionne désormais entièrement **hors ligne** par défaut, tout en conservant l'architecture pour les fonctionnalités en ligne futures.

## ✅ Fonctionnalités Opérationnelles Hors Ligne

### 🎬 Gestion des Films
- ✅ Scan des dossiers locaux pour trouver les films
- ✅ Stockage des métadonnées dans SQLite local
- ✅ Génération automatique de miniatures (si FFmpeg installé)
- ✅ Lecture des vidéos en local
- ✅ Recherche et filtrage des films

### 💾 Stockage
- ✅ Base de données SQLite locale (`database.sqlite`)
- ✅ Miniatures stockées dans `/uploads`
- ✅ Affiches téléchargées stockées dans `/uploads/posters`
- ✅ Configuration locale complète

### 🖥️ Interface
- ✅ Interface web locale (port 3000)
- ✅ Application Electron native
- ✅ Pas de dépendance externe requise

## 🚫 Fonctionnalités Désactivées (Mode Hors Ligne)

### 📥 Téléchargements
- ❌ Téléchargement automatique d'affiches depuis Internet
- ❌ Récupération de métadonnées en ligne
- ❌ Vérification des mises à jour

## ⚙️ Configuration

### Activer/Désactiver le Mode Hors Ligne

Dans `config.js` :

```javascript
offlineMode: {
  enabled: true,              // true = mode hors ligne
  skipNetworkFeatures: true   // true = ignore les fonctionnalités réseau
}
```

### Fonctionnalités Futures (Préparées)

```javascript
onlineFeatures: {
  posterDownload: false,      // Téléchargement d'affiches
  metadataSync: false,        // Sync métadonnées 
  streamingServices: false,   // Services streaming
  cloudSync: false,           // Sync cloud
  updates: false              // Vérif mises à jour
}
```

## 🔧 Architecture Technique

### Services
- `services/connectionService.js` : Gestion statut connexion
- `controllers/movieController.js` : Logique films avec vérifications hors ligne
- `main.js` : Application Electron avec mode hors ligne

### Vérifications Automatiques
```javascript
// Vérification mode hors ligne avant toute action réseau
if (!isNetworkAvailable()) {
  return { 
    success: false, 
    message: 'Fonctionnalité désactivée en mode hors ligne',
    offline: true 
  };
}
```

## 🚀 Migration Future vers Mode En Ligne

Pour activer les fonctionnalités en ligne :

1. **Désactiver le mode hors ligne :**
   ```javascript
   offlineMode: {
     enabled: false,
     skipNetworkFeatures: false
   }
   ```

2. **Activer les fonctionnalités souhaitées :**
   ```javascript
   onlineFeatures: {
     posterDownload: true,  // Exemple
     metadataSync: true
   }
   ```

3. **L'infrastructure est déjà prête !**

## 📈 Avantages de cette Approche

- ✅ **Fonctionnement immédiat** sans dépendances externes
- ✅ **Performances optimales** (tout en local)
- ✅ **Confidentialité totale** (aucune donnée envoyée)
- ✅ **Architecture extensible** pour le futur
- ✅ **Transition fluide** vers les fonctionnalités en ligne

---

L'application est maintenant **entièrement fonctionnelle hors ligne** tout en gardant la flexibilité pour ajouter des fonctionnalités en ligne à l'avenir ! 🎉