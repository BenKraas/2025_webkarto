import React, { useEffect, useRef, useState } from 'react';
import { Viewer, ImageryLayer, OpenStreetMapImageryProvider, BingMapsImageryProvider, ArcGisMapServerImageryProvider } from 'cesium';
// Simple SVG icons to replace lucide-react
const Globe = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
);

const Map = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
    <line x1="8" y1="2" x2="8" y2="18"/>
    <line x1="16" y1="6" x2="16" y2="22"/>
  </svg>
);

const Layers = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <polygon points="12 2 2 7 12 12 22 7 12 2"/>
    <polyline points="2,17 12,22 22,17"/>
    <polyline points="2,12 12,17 22,12"/>
  </svg>
);

const Eye = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const EyeOff = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

// Layer Switch Panel Component
const LayerSwitchPanel = ({ layers, onLayerToggle, onBaseLayerChange, currentBaseLayer }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="absolute top-4 right-4 z-10">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-white hover:bg-gray-50 border border-gray-300 rounded-lg p-2 shadow-lg transition-colors"
        title="Layer Control"
      >
        <Layers className="w-5 h-5 text-gray-700" />
      </button>
      
      {isOpen && (
        <div className="absolute top-12 right-0 bg-white border border-gray-300 rounded-lg shadow-lg p-4 w-64">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
            <Map className="w-4 h-4 mr-2" />
            Layer Control
          </h3>
          
          {/* Base Layers Section */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-600 mb-2">Base Layers</h4>
            <div className="space-y-2">
              {['osm', 'bing', 'esri'].map(layerType => (
                <label key={layerType} className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="baseLayer"
                    value={layerType}
                    checked={currentBaseLayer === layerType}
                    onChange={(e) => onBaseLayerChange(e.target.value)}
                    className="mr-2"
                  />
                  <span className="text-sm">
                    {layerType === 'osm' && 'OpenStreetMap'}
                    {layerType === 'bing' && 'Bing Maps Aerial'}
                    {layerType === 'esri' && 'Esri World Imagery'}
                  </span>
                </label>
              ))}
            </div>
          </div>
          
          {/* Overlay Layers Section */}
          <div>
            <h4 className="text-sm font-medium text-gray-600 mb-2">Overlay Layers</h4>
            <div className="space-y-2">
              {layers.map(layer => (
                <div key={layer.id} className="flex items-center justify-between">
                  <span className="text-sm">{layer.name}</span>
                  <button
                    onClick={() => onLayerToggle(layer.id)}
                    className={`p-1 rounded ${layer.visible ? 'text-blue-600' : 'text-gray-400'}`}
                    title={layer.visible ? 'Hide layer' : 'Show layer'}
                  >
                    {layer.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Main App Component
const App = () => {
  const viewerRef = useRef(null);
  const cesiumContainerRef = useRef(null);
  const [currentBaseLayer, setCurrentBaseLayer] = useState('osm');
  const [overlayLayers, setOverlayLayers] = useState([
    { id: 'buildings', name: 'OSM Buildings', visible: false },
    { id: 'boundaries', name: 'Country Boundaries', visible: true }
  ]);

  useEffect(() => {
    if (!cesiumContainerRef.current || viewerRef.current) return;

    // Initialize Cesium viewer with OSM as default
    const viewer = new Viewer(cesiumContainerRef.current, {
      imageryProvider: new OpenStreetMapImageryProvider({
        url: 'https://tile.openstreetmap.org/'
      }),
      terrainProvider: undefined,
      baseLayerPicker: false, // We'll use our custom layer picker
      geocoder: true,
      homeButton: true,
      sceneModePicker: true,
      navigationHelpButton: false,
      animation: false,
      timeline: false,
      fullscreenButton: true,
      vrButton: false
    });

    viewerRef.current = viewer;

    // Set initial camera position
    viewer.camera.setView({
      destination: {
        x: -2489245.6721894336,
        y: -4387614.599697696,
        z: 4070137.845692624
      },
      orientation: {
        heading: 6.283185307179586,
        pitch: -1.5707963267948966,
        roll: 0
      }
    });

    // Add some example overlay layers
    addOverlayLayers(viewer);

    return () => {
      if (viewer && !viewer.isDestroyed()) {
        viewer.destroy();
      }
      viewerRef.current = null;
    };
  }, []);

  const addOverlayLayers = (viewer) => {
    // Example: Add a simple overlay (you can customize this)
    // This is just a placeholder - in a real app you'd add actual data layers
  };

  const handleBaseLayerChange = (layerType) => {
    if (!viewerRef.current) return;

    const viewer = viewerRef.current;
    const imageryLayers = viewer.imageryLayers;
    
    // Remove current base layer
    imageryLayers.removeAll();

    let newProvider;
    switch (layerType) {
      case 'osm':
        newProvider = new OpenStreetMapImageryProvider({
          url: 'https://tile.openstreetmap.org/'
        });
        break;
      case 'bing':
        // Note: You'll need a Bing Maps API key for this to work
        newProvider = new BingMapsImageryProvider({
          url: 'https://dev.virtualearth.net',
          mapStyle: BingMapsImageryProvider.MapStyle.AERIAL
        });
        break;
      case 'esri':
        newProvider = new ArcGisMapServerImageryProvider({
          url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer'
        });
        break;
      default:
        newProvider = new OpenStreetMapImageryProvider({
          url: 'https://tile.openstreetmap.org/'
        });
    }

    // Add new base layer
    imageryLayers.addImageryProvider(newProvider);
    setCurrentBaseLayer(layerType);
  };

  const handleLayerToggle = (layerId) => {
    setOverlayLayers(prevLayers =>
      prevLayers.map(layer =>
        layer.id === layerId
          ? { ...layer, visible: !layer.visible }
          : layer
      )
    );
  };

  return (
    <div className="relative w-full h-screen">
      {/* Cesium Container */}
      <div
        ref={cesiumContainerRef}
        className="w-full h-full"
        style={{ backgroundColor: '#000' }}
      />
      
      {/* Layer Switch Panel */}
      <LayerSwitchPanel
        layers={overlayLayers}
        onLayerToggle={handleLayerToggle}
        onBaseLayerChange={handleBaseLayerChange}
        currentBaseLayer={currentBaseLayer}
      />
      
      {/* Info Panel */}
      <div className="absolute bottom-4 left-4 bg-white bg-opacity-90 rounded-lg p-3 shadow-lg max-w-sm">
        <div className="flex items-center mb-2">
          <Globe className="w-5 h-5 text-blue-600 mr-2" />
          <h2 className="font-semibold text-gray-800">Cesium with OSM</h2>
        </div>
        <p className="text-sm text-gray-600">
          Current base layer: <span className="font-medium">
            {currentBaseLayer === 'osm' && 'OpenStreetMap'}
            {currentBaseLayer === 'bing' && 'Bing Maps Aerial'}
            {currentBaseLayer === 'esri' && 'Esri World Imagery'}
          </span>
        </p>
        <div className="mt-2 text-xs text-gray-500">
          Use the layer control panel (top-right) to switch between base layers and toggle overlays.
        </div>
      </div>
    </div>
  );
};

export default App;