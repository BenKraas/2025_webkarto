// 2D OpenLayers Map Component

class Map2D {
    constructor(targetId) {
        this.targetId = targetId;
        this.map = null;
        this.layers = {};
        this.init();
    }

    init() {
        // Base layers
        this.layers.osm = new ol.layer.Tile({
            source: new ol.source.OSM(),
            visible: true
        });

        // Satellite layer (using Esri World Imagery)
        this.layers.satellite = new ol.layer.Tile({
            source: new ol.source.XYZ({
                url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                attributions: 'Tiles © Esri'
            }),
            visible: false
        });

        // Terrain layer (using USGS terrain)
        this.layers.terrain = new ol.layer.Tile({
            source: new ol.source.XYZ({
                url: 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryTopo/MapServer/tile/{z}/{y}/{x}',
                attributions: 'Tiles courtesy of the U.S. Geological Survey'
            }),
            visible: false
        });

        // WMS example layer (uncomment and modify URL as needed)
        /*
        this.layers.wms = new ol.layer.Tile({
            source: new ol.source.TileWMS({
                url: 'https://your-wms-server.com/wms',
                params: {
                    'LAYERS': 'your-layer-name',
                    'TILED': true,
                    'FORMAT': 'image/png',
                    'TRANSPARENT': true
                },
                serverType: 'geoserver'
            }),
            visible: false
        });
        */

        // Initialize map
        this.map = new ol.Map({
            target: this.targetId,
            layers: [
                this.layers.osm,
                this.layers.satellite,
                this.layers.terrain
            ],
            view: new ol.View({
                center: ol.proj.fromLonLat([7.1, 51.5]), // Bochum area
                zoom: 12,
                minZoom: 8,
                maxZoom: 18
            })
        });

        // Add click handler for coordinate display
        this.map.on('click', (evt) => {
            const coordinate = ol.proj.toLonLat(evt.coordinate);
            console.log('Clicked at:', coordinate);
        });

        // Add move handler for view synchronization
        this.map.getView().on('change', () => {
            if (window.app && window.app.map3d) {
                // Could sync 3D view here if needed
            }
        });
    }

    // Toggle layer visibility
    toggleLayer(layerName) {
        if (this.layers[layerName]) {
            const layer = this.layers[layerName];
            layer.setVisible(!layer.getVisible());
            
            // Ensure only one base layer is visible at a time
            if (layer.getVisible() && ['osm', 'satellite', 'terrain'].includes(layerName)) {
                Object.keys(this.layers).forEach(name => {
                    if (name !== layerName && ['osm', 'satellite', 'terrain'].includes(name)) {
                        this.layers[name].setVisible(false);
                    }
                });
            }
            
            return layer.getVisible();
        }
        return false;
    }

    // Add DEM extent overlay
    addDEMExtent(bounds) {
        // Remove existing DEM extent if any
        this.removeDEMExtent();

        const extent = ol.proj.transformExtent(
            [bounds.minX, bounds.minY, bounds.maxX, bounds.maxY],
            'EPSG:4326',
            'EPSG:3857'
        );

        const feature = new ol.Feature({
            geometry: new ol.geom.Polygon.fromExtent(extent)
        });

        const demLayer = new ol.layer.Vector({
            source: new ol.source.Vector({
                features: [feature]
            }),
            style: new ol.style.Style({
                stroke: new ol.style.Stroke({
                    color: '#ff0000',
                    width: 2
                }),
                fill: new ol.style.Fill({
                    color: 'rgba(255, 0, 0, 0.1)'
                })
            })
        });

        this.layers.demExtent = demLayer;
        this.map.addLayer(demLayer);

        // Fit view to DEM extent
        this.map.getView().fit(extent, {
            padding: [50, 50, 50, 50]
        });
    }

    // Remove DEM extent overlay
    removeDEMExtent() {
        if (this.layers.demExtent) {
            this.map.removeLayer(this.layers.demExtent);
            delete this.layers.demExtent;
        }
    }

    // Get current view center
    getCenter() {
        return ol.proj.toLonLat(this.map.getView().getCenter());
    }

    // Set view center
    setCenter(lonLat, zoom) {
        this.map.getView().setCenter(ol.proj.fromLonLat(lonLat));
        if (zoom !== undefined) {
            this.map.getView().setZoom(zoom);
        }
    }

    // Add custom WMS layer
    addWMSLayer(name, url, layerName, options = {}) {
        const wmsLayer = new ol.layer.Tile({
            source: new ol.source.TileWMS({
                url: url,
                params: {
                    'LAYERS': layerName,
                    'TILED': true,
                    'FORMAT': options.format || 'image/png',
                    'TRANSPARENT': options.transparent !== false,
                    ...options.params
                },
                serverType: options.serverType || 'geoserver'
            }),
            visible: options.visible || false,
            opacity: options.opacity || 1
        });

        this.layers[name] = wmsLayer;
        this.map.addLayer(wmsLayer);
        
        return wmsLayer;
    }

    // Remove layer
    removeLayer(layerName) {
        if (this.layers[layerName]) {
            this.map.removeLayer(this.layers[layerName]);
            delete this.layers[layerName];
        }
    }
}