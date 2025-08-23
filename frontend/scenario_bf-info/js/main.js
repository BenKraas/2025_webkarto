

/**
 * main.js - Interactive Map for Ruhr Region Train Stations
 *
 * This script initializes a Leaflet map centered on the Ruhr region, Germany, and loads train station data from a local GeoJSON file.
 * Each station is shown as a colored circle marker, where the color indicates the average train delay at that station (green = low, orange = moderate, red = high).
 * Clicking a marker highlights it and sends its details to a handler for further display or processing.
 * The map automatically highlights Bochum Hbf on load if present.
 */

// Initialize the map over the Ruhr region, Germany
var map = L.map('map').setView([51.4, 7.0], 10);

// Add OpenStreetMap tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
	attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Load GeoJSON from local file
fetch('/data/geodata/generated/bahnhoefe_running.geojson')
	.then(response => response.text())
	.then(text => {
		let data;
		try {
			data = JSON.parse(text);
		} catch (e) {
			console.error('Could not parse GeoJSON:', e);
			return;
		}
let bochumLayer = null;
let selectedLayer = null;
let selectedOutline = null; // Store the outline circle
let allLayers = [];
L.geoJSON(data, {
	pointToLayer: function(feature, latlng) {
		// Calculate average delay
		let avgDelay = 0;
		if (feature.properties && Array.isArray(feature.properties.delays) && feature.properties.delays.length > 0) {
			const sum = feature.properties.delays.reduce((a, b) => a + b, 0);
			avgDelay = sum / feature.properties.delays.length;
		}
		// Determine color based on average delay
		let color = '#00cc44'; // green
		if (avgDelay > 20) {
			color = '#ff0000'; // red
		} else if (avgDelay > 1) {
			color = '#ffa500'; // orange
		}
		// Use a circle marker for all points, fully opaque
		const marker = L.circleMarker(latlng, {
			radius: 8,
			fillColor: color,
			color: color,
			weight: 2,
			opacity: 1,
			fillOpacity: 1 // Fully opaque
		});
		// Add popup with average delay
		marker.bindPopup("Average delay: " + avgDelay.toFixed(1) + " min");
		return marker;
	},
	onEachFeature: function(feature, layer) {
		allLayers.push(layer);
		// Check for Bochum Hbf and store the layer
		if (feature.properties && feature.properties.stop === "Bochum Hbf") {
			bochumLayer = layer;
		}
		layer.on('click', function() {
			// Remove indicator from previous selection
			if (selectedOutline) {
				map.removeLayer(selectedOutline);
				selectedOutline = null;
			}
			if (selectedLayer && selectedLayer !== layer) {
				// Optionally reset style of previously selected layer if needed
				// selectedLayer.setStyle({ ... }); // Remove or comment out
			}
			// Do NOT change the color of the selected marker
			// layer.setStyle({ ... }); // Remove or comment out

			// Add a black outline circle beneath the selected marker
			selectedOutline = L.circleMarker(layer.getLatLng(), {
				radius: 12, // Larger than the marker
				color: '#000000',
				weight: 4,
				fill: false,
				opacity: 1,
				interactive: false // Prevent outline from capturing events
			}).addTo(map);
			selectedLayer = layer;
			let props = feature.properties;
			console.log('Feature properties:', props); // Debug: log all properties
			// No popup, just send to feature_share.js for creative manipulation
			if (window.displayFeatureDetails) {
				window.displayFeatureDetails(props);
			}
		});
	}
}).addTo(map);
// After all features are added, trigger click for Bochum Hbf if found (no popup)
if (bochumLayer) {
	bochumLayer.fire('click');
}
	})
	.catch(error => {
		console.error('Error loading GeoJSON:', error);
	});
// After all features are added, trigger click for Bochum Hbf if found (no popup)

