// feature_share.js
// Receives feature properties, transforms list properties into rows, and displays them.

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

// Expose globally
window.displayFeatureDetails = displayFeatureDetails;
