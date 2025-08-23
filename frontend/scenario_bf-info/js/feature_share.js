/**
 * feature_share.js - Display Train Station Feature Details
 *
 * This script receives properties of a selected train station (feature) and displays its list-type properties (like departures, delays, etc.) as a table.
 * Only columns listed in FEATURE_SHARE_COLUMNS are shown. The function is called automatically when a station is selected on the map.
 */

// List of columns (array property names) to keep. Modify this array to control which columns are shown.
let FEATURE_SHARE_COLUMNS = ['stop', 'platforms', 'lines', 'scheduled_departures', 'real_departures', 'delays'];

// Station statistics data
const STATION_STATS = {
    "Düsseldorf Hbf": {
        passengers: "≈ 246.000",
        trains: "243 / 450 / 500",
        trainTypes: "Fern / Nah / S-Bahn"
    },
    "Essen Hbf": {
        passengers: "≈ 152.000",
        trains: "123 / 198 / 403",
        trainTypes: "Fern / Nah / S-Bahn"
    },
    "Duisburg Hbf": {
        passengers: "≈ 130.000",
        trains: "ca. 700",
        trainTypes: "gesamt"
    },
    "Dortmund Hbf": {
        passengers: "≈ 150.000",
        trains: "200 / 500 / 300",
        trainTypes: "Fern / Nah / S-Bahn"
    },
    "Wuppertal Hbf": {
        passengers: "≈ 50.000*",
        trains: "300–400",
        trainTypes: "gesamt geschätzt"
    },
    "Mönchengladbach Hbf": {
        passengers: "≈ 50.000*",
        trains: "200–300",
        trainTypes: "gesamt geschätzt"
    },
    "Bochum Hbf": {
        passengers: "≈ 100.000*",
        trains: "400–600",
        trainTypes: "gesamt geschätzt"
    }
};

function displayStationInfo(props) {
    const stationName = props.stop;
    const stationInfo = document.getElementById('station-info');
    
    if (!stationName) {
        stationInfo.innerHTML = 'Station information not available.';
        return;
    }
    
    const stats = STATION_STATS[stationName];
    
    if (stats) {
        stationInfo.innerHTML = `
            <div class="station-details">
                <h3>${stationName}</h3>
                <div class="station-stat">
                    <strong>Fahrgäste/Tag:</strong><br>
                    ${stats.passengers}
                </div>
                <div class="station-stat">
                    <strong>Züge/Tag:</strong><br>
                    ${stats.trains}<br>
                    <small>(${stats.trainTypes})</small>
                </div>
            </div>
        `;
    } else {
        stationInfo.innerHTML = `
            <div class="station-details">
                <h3>${stationName}</h3>
                <p>Keine detaillierten Statistiken verfügbar.</p>
                <p><small>Klicken Sie auf eine andere Station für mehr Informationen.</small></p>
            </div>
        `;
    }
}

function displayFeatureDetails(props) {
    // Display station info in left panel
    displayStationInfo(props);
    
    // Display departure details in bottom panel (existing functionality)
    // Find all keys whose values are arrays of the same length > 1
    let arrayKeys = Object.keys(props).filter(
        k => Array.isArray(props[k]) && props[k].length > 0
    );
    // If a filter is set, use only those columns
    if (Array.isArray(FEATURE_SHARE_COLUMNS)) {
        arrayKeys = arrayKeys.filter(k => FEATURE_SHARE_COLUMNS.includes(k));
    }
    if (arrayKeys.length === 0) {
        document.getElementById('feature-details').innerHTML = '<em>No list data to display.</em>';
        return;
    }
    // Find the max length among all arrays
    const maxLen = Math.max(...arrayKeys.map(k => props[k].length));
    // Build table header with modern-list-table class
    let html = '<table class="modern-list-table"><thead><tr><th>#</th>';
    arrayKeys.forEach(k => { html += `<th>${k}</th>`; });
    html += '</tr></thead><tbody>';
    // Build table rows
    for (let i = 0; i < maxLen; i++) {
        html += `<tr><td>${i}</td>`;
        arrayKeys.forEach(k => {
            html += `<td>${props[k][i] !== undefined ? props[k][i] : ''}</td>`;
        });
        html += '</tr>';
    }
    html += '</tbody></table>';
    document.getElementById('feature-details').innerHTML = html;
}

// Expose globally
window.displayFeatureDetails = displayFeatureDetails;
