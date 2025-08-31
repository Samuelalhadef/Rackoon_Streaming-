// import-classification.js - Système de classification des médias en 2 étapes

class ImportClassificationSystem {
  constructor() {
    this.importModal = null;
    this.detailsModal = null;
    this.currentFiles = [];
    this.classifiedFiles = [];
    this.categories = [];
    this.isProcessing = false;
    
    this.init();
  }

  async init() {
    // Charger les catégories disponibles
    await this.loadCategories();
    
    // Attacher les événements
    this.attachEventListeners();
  }

  async loadCategories() {
    try {
      const result = await window.electronAPI.getAllCategories();
      if (result.success) {
        this.categories = result.categories;
      }
    } catch (error) {
      console.error('Erreur lors du chargement des catégories:', error);
    }
  }

  attachEventListeners() {
    // Écouteurs pour les boutons de scan existants
    const scanFolderBtn = document.getElementById('scan-folder-btn');
    const scanFileBtn = document.getElementById('scan-file-btn');

    if (scanFolderBtn) {
      scanFolderBtn.addEventListener('click', () => {
        this.startScan('folder');
      });
    }

    if (scanFileBtn) {
      scanFileBtn.addEventListener('click', () => {
        this.startScan('file');
      });
    }
  }

  async startScan(type) {
    try {
      this.isProcessing = true;
      
      // Démarrer le scan selon le type (utiliser la nouvelle API)
      const result = await window.electronAPI.scanMoviesForClassification({ type: type });

      if (result.success && result.files && result.files.length > 0) {
        // Stocker les fichiers trouvés
        this.currentFiles = result.files.map((file, index) => ({
          id: `file_${index}`,
          ...file,
          classification: null,
          selectedCategory: null
        }));

        // Afficher la modale de classification (Étape 1)
        this.showClassificationModal();
      } else {
        alert(result.message || 'Aucun fichier vidéo trouvé.');
      }
    } catch (error) {
      console.error('Erreur lors du scan:', error);
      alert('Erreur lors du scan des fichiers');
    } finally {
      this.isProcessing = false;
    }
  }

  showClassificationModal() {
    // Créer ou mettre à jour la modale de classification
    this.createClassificationModal();
    
    // Remplir avec les fichiers trouvés
    this.populateClassificationTable();
    
    // Afficher la modale
    const modal = document.getElementById('import-classification-modal');
    if (modal) {
      modal.style.display = 'flex';
    }
  }

  createClassificationModal() {
    // Vérifier si la modale existe déjà
    let modal = document.getElementById('import-classification-modal');
    
    if (!modal) {
      // Créer la modale
      modal = document.createElement('div');
      modal.id = 'import-classification-modal';
      modal.className = 'import-modal';
      modal.innerHTML = this.getClassificationModalHTML();
      document.body.appendChild(modal);
      
      // Attacher les événements de la modale
      this.attachClassificationModalEvents();
    }
    
    // Mettre à jour le compteur
    const countElement = modal.querySelector('#classification-count');
    if (countElement) {
      countElement.textContent = `${this.currentFiles.length} fichier${this.currentFiles.length > 1 ? 's' : ''} trouvé${this.currentFiles.length > 1 ? 's' : ''}`;
    }
  }

  getClassificationModalHTML() {
    return `
      <div class="import-modal-content">
        <div class="import-modal-header">
          <h2>Classification des médias - Étape 1</h2>
          <span class="import-modal-count" id="classification-count">0 fichiers trouvés</span>
        </div>
        
        <div class="import-modal-body">
          <div class="classification-instructions">
            <p>Classez chaque média dans la catégorie appropriée. Vous pourrez ajouter des informations détaillées à l'étape suivante.</p>
          </div>
          
          <div class="import-table-container">
            <table class="import-table">
              <thead>
                <tr>
                  <th>Aperçu</th>
                  <th>Nom du fichier</th>
                  <th>Durée</th>
                  <th>Taille</th>
                  <th>Catégorie</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="classification-table-body">
                <!-- Les lignes seront ajoutées dynamiquement -->
              </tbody>
            </table>
          </div>
        </div>
        
        <div class="import-modal-footer">
          <div class="classification-actions">
            <button class="btn-secondary" id="cancel-classification-btn">Annuler</button>
            <button class="btn-secondary" id="skip-all-classification-btn">Tout passer en "Non trié"</button>
            <button class="btn-primary" id="proceed-to-details-btn" disabled>Procéder aux détails</button>
          </div>
          <div class="classification-progress" id="classification-progress" style="display: none;">
            <div class="progress-bar">
              <div class="progress-fill" id="classification-progress-fill"></div>
            </div>
            <span class="progress-text" id="classification-progress-text">Classification en cours...</span>
          </div>
        </div>
      </div>
    `;
  }

  attachClassificationModalEvents() {
    const modal = document.getElementById('import-classification-modal');
    if (!modal) return;

    // Bouton Annuler
    const cancelBtn = modal.querySelector('#cancel-classification-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.closeClassificationModal();
      });
    }

    // Bouton "Tout passer en non trié"
    const skipAllBtn = modal.querySelector('#skip-all-classification-btn');
    if (skipAllBtn) {
      skipAllBtn.addEventListener('click', () => {
        this.skipAllClassification();
      });
    }

    // Bouton "Procéder aux détails"
    const proceedBtn = modal.querySelector('#proceed-to-details-btn');
    if (proceedBtn) {
      proceedBtn.addEventListener('click', () => {
        this.proceedToDetailsStep();
      });
    }

    // Fermer la modale en cliquant à l'extérieur
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.closeClassificationModal();
      }
    });
  }

  populateClassificationTable() {
    const tableBody = document.querySelector('#classification-table-body');
    if (!tableBody) return;

    // Vider le tableau
    tableBody.innerHTML = '';

    // Ajouter chaque fichier
    this.currentFiles.forEach((file, index) => {
      const row = this.createClassificationRow(file, index);
      tableBody.appendChild(row);
    });
  }

  createClassificationRow(file, index) {
    const row = document.createElement('tr');
    row.className = 'import-row classification-row';
    row.dataset.fileIndex = index;

    row.innerHTML = `
      <td class="thumbnail-cell">
        <div class="file-thumbnail">
          <img src="${file.thumbnail || '../public/img/default-thumbnail.svg'}" alt="${file.title}" class="thumbnail-preview">
        </div>
      </td>
      <td class="filename-cell">
        <div class="filename-info">
          <span class="filename-title">${file.title || file.name}</span>
          <span class="filename-path">${file.path}</span>
        </div>
      </td>
      <td class="duration-cell">
        <span class="duration-value">${this.formatDuration(file.duration || 0)}</span>
      </td>
      <td class="size-cell">
        <span class="size-value">${this.formatFileSize(file.size || 0)}</span>
      </td>
      <td class="category-cell">
        <select class="category-selector" data-file-index="${index}">
          <option value="unsorted">À définir</option>
          ${this.categories.map(cat => 
            `<option value="${cat.id}">${cat.icon} ${cat.name}</option>`
          ).join('')}
        </select>
      </td>
      <td class="actions-cell">
        <button class="btn-small btn-outline quick-skip-classification" data-file-index="${index}" title="Passer en non trié">
          Passer
        </button>
      </td>
    `;

    // Attacher les événements pour cette ligne
    this.attachRowEvents(row, index);

    return row;
  }

  attachRowEvents(row, index) {
    // Sélecteur de catégorie
    const categorySelector = row.querySelector('.category-selector');
    if (categorySelector) {
      categorySelector.addEventListener('change', (e) => {
        this.updateFileClassification(index, e.target.value);
      });
    }

    // Bouton "Passer"
    const skipBtn = row.querySelector('.quick-skip-classification');
    if (skipBtn) {
      skipBtn.addEventListener('click', () => {
        this.skipFileClassification(index);
      });
    }
  }

  updateFileClassification(fileIndex, categoryId) {
    if (this.currentFiles[fileIndex]) {
      this.currentFiles[fileIndex].classification = categoryId;
      this.currentFiles[fileIndex].selectedCategory = categoryId;
      
      // Mettre à jour l'état du bouton "Procéder"
      this.updateProceedButtonState();
    }
  }

  skipFileClassification(fileIndex) {
    if (this.currentFiles[fileIndex]) {
      this.currentFiles[fileIndex].classification = 'unsorted';
      this.currentFiles[fileIndex].selectedCategory = 'unsorted';
      
      // Mettre à jour le sélecteur
      const selector = document.querySelector(`select[data-file-index="${fileIndex}"]`);
      if (selector) {
        selector.value = 'unsorted';
      }
      
      this.updateProceedButtonState();
    }
  }

  skipAllClassification() {
    this.currentFiles.forEach((file, index) => {
      file.classification = 'unsorted';
      file.selectedCategory = 'unsorted';
      
      // Mettre à jour le sélecteur
      const selector = document.querySelector(`select[data-file-index="${index}"]`);
      if (selector) {
        selector.value = 'unsorted';
      }
    });
    
    this.updateProceedButtonState();
  }

  updateProceedButtonState() {
    const proceedBtn = document.querySelector('#proceed-to-details-btn');
    if (!proceedBtn) return;

    // Vérifier si au moins un fichier a une classification
    const hasClassified = this.currentFiles.some(file => 
      file.classification && file.classification !== 'unsorted'
    );

    // Ou si tous les fichiers sont explicitement en "non trié"
    const allProcessed = this.currentFiles.every(file => 
      file.classification && file.classification !== null
    );

    proceedBtn.disabled = !allProcessed;
    
    if (allProcessed) {
      proceedBtn.textContent = hasClassified 
        ? 'Procéder aux détails' 
        : 'Enregistrer en non trié';
    } else {
      proceedBtn.textContent = 'Procéder aux détails';
    }
  }

  proceedToDetailsStep() {
    // Filtrer les fichiers qui ont besoin de détails (pas "unsorted")
    this.classifiedFiles = this.currentFiles.filter(file => 
      file.classification && file.classification !== 'unsorted'
    );

    if (this.classifiedFiles.length > 0) {
      // Il y a des fichiers classifiés, passer à l'étape des détails
      this.closeClassificationModal();
      this.showDetailsModal();
    } else {
      // Tous les fichiers sont en "non trié", les enregistrer directement
      this.saveUnsortedFiles();
    }
  }

  async saveUnsortedFiles() {
    try {
      const unsortedFiles = this.currentFiles.filter(file => file.classification === 'unsorted');
      
      // Enregistrer directement en base avec category = 'unsorted'
      const results = await Promise.all(
        unsortedFiles.map(async (file) => {
          try {
            console.log('Tentative d\'enregistrement en non trié:', {
              filePath: file.path,
              category: 'unsorted',
              title: file.title || file.name
            });
            
            const result = await window.electronAPI.saveClassifiedMovie({
              filePath: file.path,
              category: 'unsorted',
              title: file.title || file.name
            });
            
            if (!result.success) {
              console.error('Échec d\'enregistrement pour:', file.path, 'Raison:', result.message);
            }
            
            return result;
          } catch (fileError) {
            console.error('Erreur lors de l\'enregistrement du fichier non trié:', file.path, fileError);
            return { success: false, message: fileError.message };
          }
        })
      );
      
      const successCount = results.filter(r => r.success).length;
      const errorCount = results.length - successCount;
      const failedResults = results.filter(r => !r.success);
      
      if (errorCount > 0) {
        console.warn(`${errorCount} fichier${errorCount > 1 ? 's' : ''} n'ont pas pu être enregistré${errorCount > 1 ? 's' : ''}`);
        console.warn('Détails des échecs:', failedResults.map(r => r.message));
      }
      
      if (successCount > 0) {
        alert(`${successCount} fichier${successCount > 1 ? 's' : ''} enregistré${successCount > 1 ? 's' : ''} en "Médias non triés"`);
      }
      
      if (errorCount > 0) {
        const errorMessages = [...new Set(failedResults.map(r => r.message))].join('\n');
        alert(`${errorCount} fichier${errorCount > 1 ? 's' : ''} n'ont pas pu être enregistré${errorCount > 1 ? 's' : ''}:\n${errorMessages}`);
      }
      
      this.closeClassificationModal();
      this.resetImportState();
      
      // Actualiser le dashboard si on y est
      if (window.dashboardCategories) {
        window.dashboardCategories.refresh();
      }
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement:', error);
      alert('Erreur lors de l\'enregistrement des fichiers: ' + error.message);
    }
  }

  showDetailsModal() {
    // Créer ou mettre à jour la modale d'informations détaillées
    this.createDetailsModal();
    
    // Remplir avec les fichiers classifiés
    this.populateDetailsTable();
    
    // Afficher la modale
    const modal = document.getElementById('import-details-modal');
    if (modal) {
      modal.style.display = 'flex';
    }
  }

  createDetailsModal() {
    // Vérifier si la modale existe déjà
    let modal = document.getElementById('import-details-modal');
    
    if (!modal) {
      // Créer la modale
      modal = document.createElement('div');
      modal.id = 'import-details-modal';
      modal.className = 'import-modal';
      modal.innerHTML = this.getDetailsModalHTML();
      document.body.appendChild(modal);
      
      // Attacher les événements de la modale
      this.attachDetailsModalEvents();
    }
    
    // Mettre à jour le compteur
    const countElement = modal.querySelector('#details-count');
    if (countElement) {
      countElement.textContent = `${this.classifiedFiles.length} fichier${this.classifiedFiles.length > 1 ? 's' : ''} à compléter`;
    }
  }

  getDetailsModalHTML() {
    return `
      <div class="import-modal-content large">
        <div class="import-modal-header">
          <h2>Informations détaillées - Étape 2</h2>
          <span class="import-modal-count" id="details-count">0 fichiers à compléter</span>
        </div>
        
        <div class="import-modal-body">
          <div class="details-instructions">
            <p>Complétez les informations pour chaque média. Les champs marqués d'un <span style="color: #e74c3c;">*</span> sont obligatoires.</p>
          </div>
          
          <div class="import-table-container">
            <table class="import-table details-table">
              <thead>
                <tr>
                  <th>Aperçu</th>
                  <th>Titre *</th>
                  <th>Catégorie</th>
                  <th>Année</th>
                  <th>Description</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="details-table-body">
                <!-- Les lignes seront ajoutées dynamiquement -->
              </tbody>
            </table>
          </div>
        </div>
        
        <div class="import-modal-footer">
          <div class="details-actions">
            <button class="btn-secondary" id="back-to-classification-btn">← Retour à la classification</button>
            <button class="btn-secondary" id="skip-details-btn">Garder les valeurs par défaut</button>
            <button class="btn-primary" id="save-with-details-btn">Enregistrer avec les détails</button>
          </div>
          <div class="details-progress" id="details-progress" style="display: none;">
            <div class="progress-bar">
              <div class="progress-fill" id="details-progress-fill"></div>
            </div>
            <span class="progress-text" id="details-progress-text">Enregistrement en cours...</span>
          </div>
        </div>
      </div>
    `;
  }

  attachDetailsModalEvents() {
    const modal = document.getElementById('import-details-modal');
    if (!modal) return;

    // Bouton Retour à la classification
    const backBtn = modal.querySelector('#back-to-classification-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        this.closeDetailsModal();
        this.showClassificationModal();
      });
    }

    // Bouton "Garder les valeurs par défaut"
    const skipBtn = modal.querySelector('#skip-details-btn');
    if (skipBtn) {
      skipBtn.addEventListener('click', () => {
        this.saveClassifiedFiles();
      });
    }

    // Bouton "Enregistrer avec les détails"
    const saveBtn = modal.querySelector('#save-with-details-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        this.saveFilesWithDetails();
      });
    }

    // Fermer la modale en cliquant à l'extérieur
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.closeDetailsModal();
        this.showClassificationModal();
      }
    });
  }

  populateDetailsTable() {
    const tableBody = document.querySelector('#details-table-body');
    if (!tableBody) return;

    // Vider le tableau
    tableBody.innerHTML = '';

    // Ajouter chaque fichier classifié
    this.classifiedFiles.forEach((file, index) => {
      const row = this.createDetailsRow(file, index);
      tableBody.appendChild(row);
    });
  }

  createDetailsRow(file, index) {
    const row = document.createElement('tr');
    row.className = 'import-row details-row';
    row.dataset.fileIndex = index;

    const category = this.categories.find(cat => cat.id === file.classification);
    const categoryName = category ? `${category.icon} ${category.name}` : 'Non trié';

    row.innerHTML = `
      <td class="thumbnail-cell">
        <div class="file-thumbnail">
          <img src="${file.thumbnail || '../public/img/default-thumbnail.svg'}" alt="${file.title}" class="thumbnail-preview">
        </div>
      </td>
      <td class="title-cell">
        <input type="text" class="detail-input title-input" data-file-index="${index}" data-field="title" 
               value="${this.escapeHtml(file.title || file.name)}" placeholder="Titre du média *" required>
      </td>
      <td class="category-cell">
        <span class="category-badge">${categoryName}</span>
      </td>
      <td class="year-cell">
        <input type="number" class="detail-input year-input" data-file-index="${index}" data-field="year" 
               placeholder="2023" min="1900" max="2030">
      </td>
      <td class="description-cell">
        <textarea class="detail-input description-input" data-file-index="${index}" data-field="description" 
                  placeholder="Description courte..." rows="2" maxlength="500"></textarea>
      </td>
      <td class="actions-cell">
        <button class="btn-small btn-outline auto-fill-btn" data-file-index="${index}" title="Remplissage automatique">
          <i class="fas fa-magic"></i>
        </button>
      </td>
    `;

    // Attacher les événements pour cette ligne
    this.attachDetailsRowEvents(row, index);

    return row;
  }

  attachDetailsRowEvents(row, index) {
    // Tous les inputs
    const inputs = row.querySelectorAll('.detail-input');
    inputs.forEach(input => {
      input.addEventListener('change', (e) => {
        this.updateFileDetail(index, e.target.dataset.field, e.target.value);
      });
    });

    // Bouton de remplissage automatique
    const autoFillBtn = row.querySelector('.auto-fill-btn');
    if (autoFillBtn) {
      autoFillBtn.addEventListener('click', () => {
        this.autoFillDetails(index);
      });
    }
  }

  updateFileDetail(fileIndex, field, value) {
    if (this.classifiedFiles[fileIndex]) {
      if (!this.classifiedFiles[fileIndex].details) {
        this.classifiedFiles[fileIndex].details = {};
      }
      this.classifiedFiles[fileIndex].details[field] = value;
    }
  }

  autoFillDetails(fileIndex) {
    const file = this.classifiedFiles[fileIndex];
    if (!file) return;

    // Extraire les informations du nom de fichier
    const filename = file.title || file.name || '';
    let extractedTitle = filename.replace(/\.(mp4|avi|mkv|mov|wmv|flv|webm)$/i, '');
    
    // Essayer d'extraire une année
    const yearMatch = extractedTitle.match(/\b(19|20)\d{2}\b/);
    const extractedYear = yearMatch ? yearMatch[0] : '';
    
    // Nettoyer le titre (supprimer l'année, les underscores, etc.)
    extractedTitle = extractedTitle.replace(/\b(19|20)\d{2}\b/, '').replace(/[._-]/g, ' ').trim();
    
    // Mettre à jour les inputs
    const row = document.querySelector(`tr[data-file-index="${fileIndex}"]`);
    if (row) {
      const titleInput = row.querySelector('.title-input');
      const yearInput = row.querySelector('.year-input');
      
      if (titleInput && extractedTitle) {
        titleInput.value = extractedTitle;
        this.updateFileDetail(fileIndex, 'title', extractedTitle);
      }
      
      if (yearInput && extractedYear) {
        yearInput.value = extractedYear;
        this.updateFileDetail(fileIndex, 'year', extractedYear);
      }
    }
  }

  async saveFilesWithDetails() {
    try {
      const results = await Promise.all(
        this.classifiedFiles.map(async (file) => {
          try {
            const details = file.details || {};
            const saveData = {
              filePath: file.path,
              category: file.classification,
              title: details.title || file.title || file.name,
              year: details.year ? parseInt(details.year) : null,
              description: details.description || null
            };
            
            console.log('Tentative d\'enregistrement avec détails:', saveData);
            
            const result = await window.electronAPI.saveClassifiedMovie(saveData);
            
            if (!result.success) {
              console.error('Échec d\'enregistrement pour:', file.path, 'Raison:', result.message);
            }
            
            return result;
          } catch (fileError) {
            console.error('Erreur lors de l\'enregistrement du fichier avec détails:', file.path, fileError);
            return { success: false, message: fileError.message };
          }
        })
      );
      
      const successCount = results.filter(r => r.success).length;
      const errorCount = results.length - successCount;
      const failedResults = results.filter(r => !r.success);
      
      if (errorCount > 0) {
        console.warn(`${errorCount} fichier${errorCount > 1 ? 's' : ''} n'ont pas pu être enregistré${errorCount > 1 ? 's' : ''}`);
        console.warn('Détails des échecs:', failedResults.map(r => r.message));
      }
      
      if (successCount > 0) {
        alert(`${successCount} fichier${successCount > 1 ? 's' : ''} enregistré${successCount > 1 ? 's' : ''} avec les détails`);
      }
      
      if (errorCount > 0) {
        const errorMessages = [...new Set(failedResults.map(r => r.message))].join('\n');
        alert(`${errorCount} fichier${errorCount > 1 ? 's' : ''} n'ont pas pu être enregistré${errorCount > 1 ? 's' : ''}:\n${errorMessages}`);
      }
      
      this.closeDetailsModal();
      this.resetImportState();
      
      // Actualiser le dashboard
      if (window.dashboardCategories) {
        window.dashboardCategories.refresh();
      }
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement des fichiers avec détails:', error);
      alert('Erreur lors de l\'enregistrement des fichiers: ' + error.message);
    }
  }

  closeDetailsModal() {
    const modal = document.getElementById('import-details-modal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  async saveClassifiedFiles() {
    try {
      const results = await Promise.all(
        this.classifiedFiles.map(async (file) => {
          try {
            console.log('Tentative d\'enregistrement:', {
              filePath: file.path,
              category: file.classification,
              title: file.title || file.name
            });
            
            const result = await window.electronAPI.saveClassifiedMovie({
              filePath: file.path,
              category: file.classification,
              title: file.title || file.name
            });
            
            if (!result.success) {
              console.error('Échec d\'enregistrement pour:', file.path, 'Raison:', result.message);
            }
            
            return result;
          } catch (fileError) {
            console.error('Erreur lors de l\'enregistrement du fichier:', file.path, fileError);
            return { success: false, message: fileError.message };
          }
        })
      );
      
      const successCount = results.filter(r => r.success).length;
      const errorCount = results.length - successCount;
      const failedResults = results.filter(r => !r.success);
      
      if (errorCount > 0) {
        console.warn(`${errorCount} fichier${errorCount > 1 ? 's' : ''} n'ont pas pu être enregistré${errorCount > 1 ? 's' : ''}`);
        console.warn('Détails des échecs:', failedResults.map(r => r.message));
      }
      
      if (successCount > 0) {
        alert(`${successCount} fichier${successCount > 1 ? 's' : ''} classifié${successCount > 1 ? 's' : ''} et enregistré${successCount > 1 ? 's' : ''}`);
      }
      
      if (errorCount > 0) {
        const errorMessages = [...new Set(failedResults.map(r => r.message))].join('\n');
        alert(`${errorCount} fichier${errorCount > 1 ? 's' : ''} n'ont pas pu être enregistré${errorCount > 1 ? 's' : ''}:\n${errorMessages}`);
      }
      
      this.closeClassificationModal();
      this.resetImportState();
      
      // Actualiser le dashboard
      if (window.dashboardCategories) {
        window.dashboardCategories.refresh();
      }
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement des fichiers classifiés:', error);
      alert('Erreur lors de l\'enregistrement des fichiers: ' + error.message);
    }
  }

  closeClassificationModal() {
    const modal = document.getElementById('import-classification-modal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  resetImportState() {
    this.currentFiles = [];
    this.classifiedFiles = [];
    this.isProcessing = false;
    
    // Fermer toutes les modales
    this.closeClassificationModal();
    this.closeDetailsModal();
  }

  // Utilitaires
  formatDuration(seconds) {
    if (!seconds) return '--:--:--';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  formatFileSize(bytes) {
    if (!bytes) return '-- MB';
    
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  }
}

// Initialiser le système quand le DOM est chargé
document.addEventListener('DOMContentLoaded', () => {
  // Vérifier si on est sur la page dashboard
  if (document.getElementById('scan-folder-btn')) {
    window.importClassificationSystem = new ImportClassificationSystem();
  }
});