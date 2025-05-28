// main.jsx
// Entry point of the React application.
// - Imports the main App component.
// - Loads CesiumJS CSS for widgets.
// - Sets the base URL for Cesium assets (required for static deployment).
// - Renders the React app into the root element.

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "cesium/Build/Cesium/Widgets/widgets.css";

window.CESIUM_BASE_URL = "/cesium";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
