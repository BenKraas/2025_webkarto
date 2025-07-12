// Initialize the map
var map = L.map('map').setView([51.505, -0.09], 13);

// Add OpenStreetMap tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
	attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Load GeoJSON from local file
fetch('../data/geodata/bahnhoefe_running.geojson')
	.then(response => response.text())
	.then(text => {
		let data;
		try {
			data = JSON.parse(text);
		} catch (e) {
			console.error('Could not parse GeoJSON:', e);
			return;
		}
		L.geoJSON(data, {
			pointToLayer: function(feature, latlng) {
				return L.marker(latlng);
			},
			onEachFeature: function(feature, layer) {
				layer.on('click', function() {
					let props = feature.properties;
					let html = '<table>';
					for (let key in props) {
						html += `<tr><td><strong>${key}</strong></td><td>${props[key]}</td></tr>`;
					}
					html += '</table>';
					layer.bindPopup(html).openPopup();
				});
			}
		}).addTo(map);
	})
	.catch(error => {
		console.error('Error loading GeoJSON:', error);
	});
