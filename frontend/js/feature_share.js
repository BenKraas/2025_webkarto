/**
 * feature_share.js - Display Train Station Feature Details
 *
 * This script receives properties of a selected train station (feature) and displays its list-type properties (like departures, delays, etc.) as a table.
 * Only columns listed in FEATURE_SHARE_COLUMNS are shown. The function is called automatically when a station is selected on the map.
 */

// List of columns (array property names) to keep. Modify this array to control which columns are shown.
let FEATURE_SHARE_COLUMNS = ['stop', 'platforms', 'lines', 'scheduled_departures', 'real_departures', 'delays'];

function displayFeatureDetails(props) {
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

// Accepts a GeoJSON FeatureCollection and displays details for a selected feature
function displayFeatureCollectionDetails(featureCollection, featureIndex = 0) {
    if (!featureCollection || !featureCollection.features || featureCollection.features.length === 0) {
        document.getElementById('feature-details').innerHTML = '<em>No features to display.</em>';
        return;
    }
    const feature = featureCollection.features[featureIndex];
    if (!feature || !feature.properties) {
        document.getElementById('feature-details').innerHTML = '<em>No properties to display.</em>';
        return;
    }
    // Parse array-like strings to arrays if needed
    const props = { ...feature.properties };
    Object.keys(props).forEach(k => {
        if (typeof props[k] === 'string' && props[k].startsWith("['")) {
            try {
                // Replace single quotes with double quotes, handle None/NaN
                let arrStr = props[k].replace(/'/g, '"').replace(/None/g, 'null').replace(/NaN/g, 'null');
                props[k] = JSON.parse(arrStr);
            } catch (e) {
                // fallback: leave as string
            }
        }
    });
    // Call the original displayFeatureDetails with parsed props
    displayFeatureDetails(props);
}

// Expose globally
window.displayFeatureDetails = displayFeatureDetails;
window.displayFeatureCollectionDetails = displayFeatureCollectionDetails;
