// Main Application Controller

class WebMapApp {
    constructor() {
        this.map2d = null;
        this.map3d = null;
        this.terrainGenerator = null;
        this.currentDEM = null;
        
        this.init();
        this.setupEventListeners();
        this.loadSampleData();
    }

    init() {
        console.log('Initializing 3D WebMap Application...');
        
        // Initialize components
        this.terrainGenerator = new TerrainGenerator();
        this.map2d = new Map2D('map-2d');
        this.map3d = new Map3D('map-3d');
        
        console.log('Components initialized successfully');
    }

    setupEventListeners() {
        // Elevation scale control
        const elevationScale = document.getElementById('elevation-scale');
        const scaleValue = document.getElementById('scale-value');
        
        elevationScale.addEventListener('input', (e) => {
            const scale = parseFloat(e.target.value);
            scaleValue.textContent = scale.toFixed(1) + 'x';
            this.map3d.updateElevationScale(scale);
        });

        // DEM loading controls
        document.getElementById('load-sample-dem').addEventListener('click', (e) => {
            this.loadSampleData();
            this.setActiveButton(e.target, 'load-file-dem');
        });

        document.getElementById('load-file-dem').addEventListener('click', () => {
            document.getElementById('dem-file').click();
        });

        document.getElementById('dem-file').addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.loadDEMFile(e.target.files[0]);
                this.setActiveButton(document.getElementById('load-file-dem'), 'load-sample-dem');
            }
        });

        // Layer toggle controls
        document.getElementById('toggle-osm').addEventListener('click', (e) => {
            this.map2d.toggleLayer('osm');
            this.setActiveButton(e.target, ['toggle-satellite', 'toggle-terrain']);
        });

        document.getElementById('toggle-satellite').addEventListener('click', (e) => {
            this.map2d.toggleLayer('satellite');
            this.setActiveButton(e.target, ['toggle-osm', 'toggle-terrain']);
        });

        document.getElementById('toggle-terrain').addEventListener('click', (e) => {
            this.map2d.toggleLayer('terrain');
            this.setActiveButton(e.target, ['toggle-osm', 'toggle-satellite']);
        });

        // View controls
        document.getElementById('reset-view').addEventListener('click', () => {
            this.map3d.resetCamera();
        });

        document.getElementById('sync-views').addEventListener('click', () => {
            this.syncViews();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            switch(e.key.toLowerCase()) {
                case 'r':
                    this.map3d.resetCamera();
                    break;
                case 'w':
                    this.map3d.toggleWireframe();
                    break;
                case 's':
                    this.syncViews();
                    break;
            }
        });
    }

    setActiveButton(activeButton, inactiveButtons) {
        // Remove active class from inactive buttons
        if (Array.isArray(inactiveButtons)) {
            inactiveButtons.forEach(id => {
                const btn = typeof id === 'string' ? document.getElementById(id) : id;
                if (btn) btn.classList.remove('active');
            });
        } else {
            const btn = typeof inactiveButtons === 'string' ? document.getElementById(inactiveButtons) : inactiveButtons;
            if (btn) btn.classList.remove('active');
        }
        
        // Add active class to active button
        if (activeButton) activeButton.classList.add('active');
    }

    loadSampleData() {
        console.log('Loading sample DEM data...');
        
        try {
            this.currentDEM = this.terrainGenerator.generateSampleDEM();
            this.map3d.loadTerrain(this.currentDEM);
            this.map2d.addDEMExtent(this.currentDEM.bounds);
            
            console.log('Sample DEM loaded successfully');
        } catch (error) {
            console.error('Error loading sample DEM:', error);
            this.showError('Failed to load sample terrain data');
        }
    }

    async loadDEMFile(file) {
        console.log('Loading DEM file:', file.name);
        
        try {
            // Show loading state
            const loading = document.getElementById('loading');
            if (loading) {
                loading.style.display = 'block';
                loading.textContent = 'Loading DEM file...';
            }

            // For now, we'll simulate file loading since we don't have a backend
            // In a real implementation, you'd parse GeoTIFF or ASCII grid files here
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Generate sample data as fallback
            this.currentDEM = this.terrainGenerator.generateSampleDEM();
            this.map3d.loadTerrain(this.currentDEM);
            this.map2d.addDEMExtent(this.currentDEM.bounds);
            
            console.log('DEM file processed (simulated)');
            this.showInfo('DEM file loaded successfully (simulated with sample data)');
            
        } catch (error) {
            console.error('Error loading DEM file:', error);
            this.showError('Failed to load DEM file: ' + error.message);
        }
    }

    syncViews() {
        if (!this.currentDEM) return;
        
        // Get center of DEM bounds
        const centerLon = (this.currentDEM.bounds.minX + this.currentDEM.bounds.maxX) / 2;
        const centerLat = (this.currentDEM.bounds.minY + this.currentDEM.bounds.maxY) / 2;
        
        // Update 2D map view
        this.map2d.setCenter([centerLon, centerLat], 13);
        
        // Reset 3D camera
        this.map3d.resetCamera();
        
        console.log('Views synchronized');
    }

    showError(message) {
        console.error(message);
        // You could add a toast notification system here
        alert('Error: ' + message);
    }

    showInfo(message) {
        console.info(message);
        // You could add a toast notification system here
        // For now, just log to console
    }

    // Add custom WMS layer
    addWMSLayer(name, url, layerName, options = {}) {
        try {
            this.map2d.addWMSLayer(name, url, layerName, options);
            console.log(`Added WMS layer: ${name}`);
            return true;
        } catch (error) {
            console.error('Error adding WMS layer:', error);
            this.showError('Failed to add WMS layer: ' + error.message);
            return false;
        }
    }

    // Get application status
    getStatus() {
        return {
            initialized: !!(this.map2d && this.map3d),
            demLoaded: !!this.currentDEM,
            terrainVisible: !!this.map3d.terrain,
            map2dLayers: Object.keys(this.map2d.layers),
            map3dInfo: this.map3d.getSceneInfo()
        };
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new WebMapApp();
    
    // Expose some functions globally for debugging
    window.addWMSLayer = (name, url, layerName, options) => {
        return window.app.addWMSLayer(name, url, layerName, options);
    };
    
    window.getAppStatus = () => {
        return window.app.getStatus();
    };
    
    console.log('3D WebMap Application ready!');
    console.log('Keyboard shortcuts:');
    console.log('  R - Reset 3D camera');
    console.log('  W - Toggle wireframe');
    console.log('  S - Sync views');
    console.log('');
    console.log('Use addWMSLayer(name, url, layerName, options) to add custom WMS layers');
    console.log('Use getAppStatus() to check application status');
});