// App.jsx
// Main React component that initializes CesiumJS in a side effect.
// - Creates a Viewer instance in a full-screen div.
// - Adds a remote WMS layer (e.g. OSM from terrestris).
// - Demonstrates the minimal setup for loading remote geospatial layers.

import { useEffect } from "react";
import { Viewer, WebMapServiceImageryProvider } from "cesium";


function App() {
  useEffect(() => {
    // Initialize Cesium Viewer
    const viewer = new Viewer("cesiumContainer", {
      baseLayerPicker: false,
      timeline: false,
      animation: false,
      geocoder: false,
      homeButton: true,
      sceneModePicker: true,
      navigationHelpButton: true,
      infoBox: false,
      selectionIndicator: false,
      fullscreenButton: true,
      terrainProvider: undefined,
    });

    // Add OSM WMS layer
    viewer.imageryLayers.addImageryProvider(
      new WebMapServiceImageryProvider({
        url: "https://ows.terrestris.de/osm/service",
        layers: "OSM-WMS",
        parameters: {
          transparent: true,
          format: "image/png"
        }
      })
    );

    // Clean up on unmount
    return () => {
      viewer.destroy();
    };
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      {/* Navigation Bar */}
      <nav style={{
        width: "100%",
        height: "48px",
        background: "#222",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        paddingLeft: "1rem",
        position: "absolute",
        top: 0,
        left: 0,
        zIndex: 1000
      }}>
        <h2 style={{ margin: 0, fontSize: "1.2rem" }}>🗺️ WebCarto Map</h2>
      </nav>
      {/* Cesium Map Container */}
      <div
        id="cesiumContainer"
        style={{
          position: "absolute",
          top: "48px",
          left: 0,
          width: "100vw",
          height: "calc(100vh - 48px)",
        }}
      />
    </div>
  );
}

export default App;
