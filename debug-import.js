// Script de debug temporaire pour diagnostiquer les problèmes d'import

console.log('🔍 Script de debug chargé');

// Vérifier que l'API Electron est disponible
if (window.electronAPI) {
    console.log('✅ ElectronAPI disponible');
    console.log('📝 Méthodes disponibles:', Object.keys(window.electronAPI));
} else {
    console.error('❌ ElectronAPI non disponible');
}

// Test de sauvegarde
window.debugSaveTest = async function(testData = null) {
    const defaultTest = {
        filePath: 'C:\\Test\\test-video.mp4',
        category: 'films',
        title: 'Test Video'
    };
    
    const data = testData || defaultTest;
    
    console.log('🧪 Test de sauvegarde avec:', data);
    
    try {
        const result = await window.electronAPI.saveClassifiedMovie(data);
        console.log('📊 Résultat:', result);
        return result;
    } catch (error) {
        console.error('❌ Erreur lors du test:', error);
        return { success: false, message: error.message };
    }
};

// Test des catégories
window.debugCategoriesTest = async function() {
    console.log('🔍 Test des catégories...');
    
    try {
        const result = await window.electronAPI.getAllCategories();
        console.log('📊 Catégories récupérées:', result);
        return result;
    } catch (error) {
        console.error('❌ Erreur lors de la récupération des catégories:', error);
        return { success: false, message: error.message };
    }
};

// Vérifier l'état du système d'import
window.debugImportSystemState = function() {
    console.log('🔍 État du système d\'import:');
    
    if (window.importClassificationSystem) {
        const system = window.importClassificationSystem;
        console.log('📋 Fichiers actuels:', system.currentFiles?.length || 0);
        console.log('📋 Fichiers classifiés:', system.classifiedFiles?.length || 0);
        console.log('📋 Catégories chargées:', system.categories?.length || 0);
        console.log('📋 En cours de traitement:', system.isProcessing);
        
        if (system.categories) {
            console.log('📂 Détail des catégories:', system.categories);
        }
        
        if (system.currentFiles?.length > 0) {
            console.log('📁 Premier fichier:', system.currentFiles[0]);
        }
        
    } else {
        console.error('❌ Système d\'import non initialisé');
    }
};

console.log('🛠️  Fonctions de debug disponibles:');
console.log('   - debugSaveTest() : Tester la sauvegarde');
console.log('   - debugCategoriesTest() : Tester les catégories');  
console.log('   - debugImportSystemState() : Vérifier l\'état du système');