// Initialize the map over the Ruhr region, Germany
var map = L.map('map').setView([51.4, 7.0], 10);

// Add OpenStreetMap tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
	attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Load GeoJSON from local file
fetch('../data/geodata/generated/bahnhoefe_running.geojson')
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
let allLayers = [];
L.geoJSON(data, {
	pointToLayer: function(feature, latlng) {
		// Use a circle marker for all points
		return L.circleMarker(latlng, {
			radius: 8,
			fillColor: '#3388ff',
			color: '#3388ff',
			weight: 2,
			opacity: 1,
			fillOpacity: 0.5
		});
	},
	onEachFeature: function(feature, layer) {
		allLayers.push(layer);
		// Check for Bochum Hbf and store the layer
		if (feature.properties && feature.properties.stop === "Bochum Hbf") {
			bochumLayer = layer;
		}
		layer.on('click', function() {
			// Remove indicator from previous selection
			if (selectedLayer && selectedLayer !== layer) {
				selectedLayer.setStyle({
					color: '#3388ff',
					fillColor: '#3388ff',
					weight: 2,
					fillOpacity: 0.5
				});
			}
			// Set indicator for current selection
			layer.setStyle({
				color: '#ff3333',
				fillColor: '#ff3333',
				weight: 4,
				fillOpacity: 0.7
			});
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
