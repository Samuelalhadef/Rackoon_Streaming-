// File Manager JavaScript

class FileManager {
  constructor() {
    this.files = [];
    this.filteredFiles = [];
    this.selectedFiles = new Set();
    this.currentSort = 'title';
    
    this.init();
  }

  init() {
    this.loadUserInfo();
    this.attachEventListeners();
    this.loadStats();
    this.loadFiles();
  }

  // Charger les informations utilisateur
  loadUserInfo() {
    fetch('/api/auth/me')
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          document.getElementById('username').textContent = data.user.username;
        }
      })
      .catch(error => {
        console.error('Erreur lors du chargement des informations utilisateur:', error);
      });
  }

  // Attacher les événements
  attachEventListeners() {
    // Bouton de déconnexion
    document.getElementById('logout-btn').addEventListener('click', this.logout);
    
    // Recherche
    document.getElementById('search-input').addEventListener('input', (e) => {
      this.filterFiles();
    });
    
    // Filtres
    document.getElementById('format-filter').addEventListener('change', () => {
      this.filterFiles();
    });
    
    document.getElementById('sort-filter').addEventListener('change', (e) => {
      this.currentSort = e.target.value;
      this.sortAndDisplayFiles();
    });
    
    // Bouton actualiser
    document.getElementById('refresh-btn').addEventListener('click', () => {
      this.loadStats();
      this.loadFiles();
    });
    
    // Sélection de fichiers
    document.getElementById('master-checkbox').addEventListener('change', (e) => {
      this.toggleAllSelection(e.target.checked);
    });
    
    document.getElementById('select-all-btn').addEventListener('click', () => {
      this.toggleAllSelection(true);
    });
    
    document.getElementById('delete-selected-btn').addEventListener('click', () => {
      this.deleteSelectedFiles();
    });
    
    // Modales
    this.setupModals();
  }

  // Configuration des modales
  setupModals() {
    // Modal de suppression
    const deleteModal = document.getElementById('delete-modal');
    const closeDeleteModal = document.getElementById('close-delete-modal');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    
    closeDeleteModal.addEventListener('click', () => {
      deleteModal.style.display = 'none';
    });
    
    cancelDeleteBtn.addEventListener('click', () => {
      deleteModal.style.display = 'none';
    });
    
    confirmDeleteBtn.addEventListener('click', () => {
      this.executeDelete();
    });
    
    // Modal de détails
    const detailsModal = document.getElementById('details-modal');
    const closeDetailsModal = document.getElementById('close-details-modal');
    const closeDetailsBtn = document.getElementById('close-details-btn');
    
    closeDetailsModal.addEventListener('click', () => {
      detailsModal.style.display = 'none';
    });
    
    closeDetailsBtn.addEventListener('click', () => {
      detailsModal.style.display = 'none';
    });
    
    // Fermer les modales en cliquant sur l'overlay
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-overlay')) {
        e.target.style.display = 'none';
      }
    });
  }

  // Charger les statistiques
  async loadStats() {
    try {
      const response = await fetch('/api/movies/stats');
      const data = await response.json();
      
      if (data.success) {
        this.updateStatsDisplay(data.stats);
        this.populateFormatFilter(data.stats.formats);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    }
  }

  // Mettre à jour l'affichage des statistiques
  updateStatsDisplay(stats) {
    document.getElementById('total-files').textContent = stats.totalFiles || 0;
    document.getElementById('total-size').textContent = this.formatFileSize(stats.totalSize || 0);
    document.getElementById('total-duration').textContent = this.formatDuration(stats.totalDuration || 0);
    document.getElementById('files-with-thumbnails').textContent = stats.filesWithThumbnails || 0;
  }

  // Peupler le filtre des formats
  populateFormatFilter(formats) {
    const formatFilter = document.getElementById('format-filter');
    
    // Garder l'option "Tous les formats"
    formatFilter.innerHTML = '<option value="">Tous les formats</option>';
    
    formats.forEach(format => {
      const option = document.createElement('option');
      option.value = format.format;
      option.textContent = `${format.format.toUpperCase()} (${format.count})`;
      formatFilter.appendChild(option);
    });
  }

  // Charger la liste des fichiers
  async loadFiles() {
    try {
      const response = await fetch('/api/movies');
      const data = await response.json();
      
      if (data.success) {
        this.files = data.movies;
        this.filteredFiles = [...this.files];
        this.sortAndDisplayFiles();
        this.updateFilesCount();
      } else {
        console.error('Erreur:', data.message);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des fichiers:', error);
    }
  }

  // Filtrer les fichiers
  filterFiles() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const formatFilter = document.getElementById('format-filter').value;
    
    this.filteredFiles = this.files.filter(file => {
      const matchesSearch = !searchTerm || 
        file.title.toLowerCase().includes(searchTerm) ||
        file.path.toLowerCase().includes(searchTerm);
      
      const matchesFormat = !formatFilter || file.format === formatFilter;
      
      return matchesSearch && matchesFormat;
    });
    
    this.sortAndDisplayFiles();
    this.updateFilesCount();
  }

  // Trier et afficher les fichiers
  sortAndDisplayFiles() {
    this.filteredFiles.sort((a, b) => {
      switch (this.currentSort) {
        case 'size_bytes':
          return (b.size_bytes || 0) - (a.size_bytes || 0);
        case 'duration':
          return (b.duration || 0) - (a.duration || 0);
        case 'last_scan':
          return new Date(b.last_scan) - new Date(a.last_scan);
        default: // title
          return (a.title || '').localeCompare(b.title || '');
      }
    });
    
    this.displayFiles();
  }

  // Afficher les fichiers dans le tableau
  displayFiles() {
    const tbody = document.getElementById('files-table-body');
    tbody.innerHTML = '';
    
    if (this.filteredFiles.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 40px; color: #888;">
            <i class="fas fa-search" style="font-size: 24px; margin-bottom: 10px; display: block;"></i>
            Aucun fichier trouvé
          </td>
        </tr>
      `;
      return;
    }
    
    this.filteredFiles.forEach(file => {
      const row = this.createFileRow(file);
      tbody.appendChild(row);
    });
  }

  // Créer une ligne de fichier
  createFileRow(file) {
    const tr = document.createElement('tr');
    tr.setAttribute('data-file-id', file.id);
    
    const fileExists = this.checkFileExists(file.path);
    const statusClass = fileExists ? 'status-ok' : 'status-missing';
    const statusText = fileExists ? 'Accessible' : 'Introuvable';
    
    tr.innerHTML = `
      <td>
        <input type="checkbox" class="file-checkbox" data-file-id="${file.id}">
      </td>
      <td>
        <div class="file-thumbnail">
          ${file.thumbnail ? 
            `<img src="${file.thumbnail}" alt="Miniature" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
             <i class="fas fa-film" style="display: none;"></i>` :
            `<i class="fas fa-film"></i>`
          }
        </div>
      </td>
      <td>
        <div class="file-name">${this.escapeHtml(file.title || 'Sans titre')}</div>
        <div class="file-path">${this.escapeHtml(file.path || '')}</div>
      </td>
      <td>
        <span class="format-badge">${(file.format || 'N/A').toUpperCase()}</span>
      </td>
      <td>${this.formatDuration(file.duration || 0)}</td>
      <td>${this.formatFileSize(file.size_bytes || 0)}</td>
      <td>
        <span class="status-badge ${statusClass}">${statusText}</span>
      </td>
      <td>
        <div class="file-actions">
          ${fileExists ? `<button class="action-btn btn-view" onclick="fileManager.playFile(${file.id})">
            <i class="fas fa-play"></i>
          </button>` : ''}
          <button class="action-btn btn-details" onclick="fileManager.showFileDetails(${file.id})">
            <i class="fas fa-info"></i>
          </button>
          <button class="action-btn btn-delete" onclick="fileManager.deleteFile(${file.id})">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </td>
    `;
    
    // Ajouter l'événement de sélection
    const checkbox = tr.querySelector('.file-checkbox');
    checkbox.addEventListener('change', (e) => {
      this.toggleFileSelection(file.id, e.target.checked);
    });
    
    return tr;
  }

  // Vérifier si un fichier existe (simulation)
  checkFileExists(path) {
    // En production, ceci devrait être une vraie vérification côté serveur
    return Math.random() > 0.1; // 90% de chance que le fichier existe
  }

  // Basculer la sélection d'un fichier
  toggleFileSelection(fileId, selected) {
    if (selected) {
      this.selectedFiles.add(fileId);
    } else {
      this.selectedFiles.delete(fileId);
    }
    
    this.updateBulkActions();
    this.updateMasterCheckbox();
  }

  // Basculer la sélection de tous les fichiers
  toggleAllSelection(selectAll) {
    const checkboxes = document.querySelectorAll('.file-checkbox');
    
    checkboxes.forEach(checkbox => {
      checkbox.checked = selectAll;
      const fileId = parseInt(checkbox.dataset.fileId);
      
      if (selectAll) {
        this.selectedFiles.add(fileId);
      } else {
        this.selectedFiles.delete(fileId);
      }
    });
    
    this.updateBulkActions();
  }

  // Mettre à jour les actions en masse
  updateBulkActions() {
    const bulkActions = document.getElementById('bulk-actions');
    const hasSelection = this.selectedFiles.size > 0;
    
    bulkActions.style.display = hasSelection ? 'flex' : 'none';
  }

  // Mettre à jour la case de sélection principale
  updateMasterCheckbox() {
    const masterCheckbox = document.getElementById('master-checkbox');
    const totalFiles = this.filteredFiles.length;
    const selectedCount = this.selectedFiles.size;
    
    masterCheckbox.checked = selectedCount === totalFiles && totalFiles > 0;
    masterCheckbox.indeterminate = selectedCount > 0 && selectedCount < totalFiles;
  }

  // Mettre à jour le compteur de fichiers
  updateFilesCount() {
    document.getElementById('files-count').textContent = this.filteredFiles.length;
  }

  // Jouer un fichier
  playFile(fileId) {
    window.location.href = `/stream/${fileId}`;
  }

  // Afficher les détails d'un fichier
  showFileDetails(fileId) {
    const file = this.files.find(f => f.id === fileId);
    if (!file) return;
    
    document.getElementById('detail-title').textContent = file.title || 'Sans titre';
    document.getElementById('detail-path').textContent = file.path || 'N/A';
    document.getElementById('detail-format').textContent = (file.format || 'N/A').toUpperCase();
    document.getElementById('detail-duration').textContent = this.formatDuration(file.duration || 0);
    document.getElementById('detail-size').textContent = this.formatFileSize(file.size_bytes || 0);
    document.getElementById('detail-last-scan').textContent = this.formatDate(file.last_scan);
    
    const thumbnailStatus = document.getElementById('detail-thumbnail-status');
    const thumbnailImg = document.getElementById('detail-thumbnail-img');
    const thumbnailPreview = document.getElementById('thumbnail-preview');
    
    if (file.thumbnail) {
      thumbnailStatus.textContent = 'Disponible';
      thumbnailImg.src = file.thumbnail;
      thumbnailImg.style.display = 'block';
      thumbnailPreview.style.display = 'block';
    } else {
      thumbnailStatus.textContent = 'Non disponible';
      thumbnailPreview.style.display = 'none';
    }
    
    document.getElementById('details-modal').style.display = 'flex';
  }

  // Supprimer un fichier
  deleteFile(fileId) {
    this.fileToDelete = fileId;
    document.getElementById('delete-message').textContent = 
      'Êtes-vous sûr de vouloir supprimer ce fichier de la base de données ?';
    document.getElementById('delete-modal').style.display = 'flex';
  }

  // Supprimer les fichiers sélectionnés
  deleteSelectedFiles() {
    if (this.selectedFiles.size === 0) return;
    
    this.filesToDelete = Array.from(this.selectedFiles);
    document.getElementById('delete-message').textContent = 
      `Êtes-vous sûr de vouloir supprimer ${this.selectedFiles.size} fichier(s) de la base de données ?`;
    document.getElementById('delete-modal').style.display = 'flex';
  }

  // Exécuter la suppression
  async executeDelete() {
    const filesToDelete = this.filesToDelete || [this.fileToDelete];
    
    try {
      const deletePromises = filesToDelete.map(fileId => 
        fetch(`/api/movies/${fileId}`, { method: 'DELETE' })
          .then(response => response.json())
      );
      
      const results = await Promise.all(deletePromises);
      const successful = results.filter(r => r.success).length;
      
      if (successful > 0) {
        // Recharger les données
        await this.loadStats();
        await this.loadFiles();
        
        // Réinitialiser la sélection
        this.selectedFiles.clear();
        this.updateBulkActions();
        
        console.log(`${successful} fichier(s) supprimé(s) avec succès`);
      }
      
      document.getElementById('delete-modal').style.display = 'none';
      
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
    }
    
    this.fileToDelete = null;
    this.filesToDelete = null;
  }

  // Déconnexion
  logout() {
    fetch('/api/auth/logout', { method: 'POST' })
      .then(() => {
        window.location.href = '/';
      })
      .catch(error => {
        console.error('Erreur lors de la déconnexion:', error);
        window.location.href = '/';
      });
  }

  // Utilitaires
  formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  }

  formatDuration(seconds) {
    if (!seconds) return '0:00:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('fr-FR');
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialiser le gestionnaire de fichiers
const fileManager = new FileManager();