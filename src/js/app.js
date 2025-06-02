// MapLibre GL JS 3D WebMap Dashboard

let map;
let demSourceId = null;
let demLayerId = null;
let wmsCount = 0;
let currentDEMInfo = null;
let elevationScale = 1.0;

function initMap() {
    map = new maplibregl.Map({
        container: 'map',
        style: {
            version: 8,
            sources: {
                osm: {
                    type: 'raster',
                    tiles: [
                        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
                        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
                        'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
                    ],
                    tileSize: 256,
                    attribution: '© OpenStreetMap contributors'
                }
            },
            layers: [
                {
                    id: 'osm',
                    type: 'raster',
                    source: 'osm',
                    minzoom: 0,
                    maxzoom: 22
                }
            ]
        },
        center: [7.1, 51.5],
        zoom: 12,
        pitch: 60,
        bearing: 0,
        antialias: true
    });

    map.on('load', () => {
        // If DEM already loaded, re-add it
        if (currentDEMInfo) {
            addDEMTerrain(currentDEMInfo);
        }
    });
}

function showLoading(msg) {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = 'block';
        loading.textContent = msg;
    }
}

function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'none';
}

function showDEMInfo(info) {
    const demInfo = document.getElementById('dem-info');
    if (!demInfo) return;
    if (!info) {
        demInfo.textContent = '';
        return;
    }
    demInfo.innerHTML =
        `<b>DEM:</b> ${info.originalName || 'Imported'}<br>` +
        `Size: ${info.width} × ${info.height}<br>` +
        `Elevation: ${info.minElevation}–${info.maxElevation} m`;
}

async function uploadDEMFile(file) {
    showLoading('Uploading DEM file...');
    const formData = new FormData();
    formData.append('demFile', file);
    const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData
    });
    const uploadData = await uploadRes.json();
    if (!uploadData.success) throw new Error(uploadData.message || 'Upload failed');
    return uploadData.file.fileId;
}

async function processDEM(fileId) {
    showLoading('Processing DEM...');
    const processRes = await fetch('/api/dem/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, options: { width: 512, height: 512, elevationScale } })
    });
    const processData = await processRes.json();
    if (!processData.success || !processData.data || !processData.data.bounds) {
        throw new Error(processData.message || 'Processing failed or DEM metadata missing');
    }
    return processData.data;
}

function addDEMTerrain(demInfo) {
    // Remove previous DEM source/layer/terrain
    if (demSourceId && map.getSource(demSourceId)) {
        if (demLayerId && map.getLayer(demLayerId)) {
            map.removeLayer(demLayerId);
        }
        map.removeSource(demSourceId);
    }
    if (map.getTerrain()) {
        map.setTerrain(null);
    }

    // Add DEM as raster-dem source
    demSourceId = 'dem-terrain';
    demLayerId = 'dem-terrain-layer';
    const demUrl = `/processed/${demInfo.fileId || demInfo.id || demInfo.file_id || 'unknown'}.tif`;

    map.addSource(demSourceId, {
        type: 'raster-dem',
        url: demUrl,
        tileSize: 512,
        encoding: 'mapbox',
    });

    map.setTerrain({ source: demSourceId, exaggeration: elevationScale });

    map.addLayer({
        id: demLayerId,
        type: 'hillshade',
        source: demSourceId,
        layout: {},
        paint: {
            'hillshade-exaggeration': 0.7
        }
    });

    // Fit map to DEM bounds if available
    if (demInfo.bounds && isFinite(demInfo.bounds.minX) && isFinite(demInfo.bounds.minY) && isFinite(demInfo.bounds.maxX) && isFinite(demInfo.bounds.maxY)) {
        map.fitBounds([
            [demInfo.bounds.minX, demInfo.bounds.minY],
            [demInfo.bounds.maxX, demInfo.bounds.maxY]
        ], { padding: 40 });
    }

    showDEMInfo(demInfo);
    hideLoading();
}

function resetView() {
    if (currentDEMInfo && currentDEMInfo.bounds) {
        map.fitBounds([
            [currentDEMInfo.bounds.minX, currentDEMInfo.bounds.minY],
            [currentDEMInfo.bounds.maxX, currentDEMInfo.bounds.maxY]
        ], { padding: 40 });
    } else {
        map.flyTo({ center: [7.1, 51.5], zoom: 12, pitch: 60, bearing: 0 });
    }
}

function addWMSLayer(url, layerName) {
    wmsCount++;
    const wmsId = `wms-${wmsCount}`;
    map.addSource(wmsId, {
        type: 'raster',
        tiles: [
            `${url}?service=WMS&request=GetMap&version=1.1.1&layers=${layerName}&styles=&format=image/png&transparent=true&srs=EPSG:3857&width=256&height=256&bbox={bbox-epsg-3857}`
        ],
        tileSize: 256
    });
    map.addLayer({
        id: wmsId,
        type: 'raster',
        source: wmsId,
        paint: { 'raster-opacity': 0.8 }
    });
    // Add to WMS list in sidebar
    const wmsList = document.getElementById('wms-list');
    if (wmsList) {
        const li = document.createElement('li');
        li.textContent = `${layerName} (${url})`;
        li.style.cursor = 'pointer';
        li.onclick = () => {
            map.setLayoutProperty(wmsId, 'visibility', map.getLayoutProperty(wmsId, 'visibility') === 'none' ? 'visible' : 'none');
        };
        wmsList.appendChild(li);
    }
}

function setupUI() {
    document.getElementById('import-dem-btn').onclick = () => {
        document.getElementById('dem-file').click();
    };
    document.getElementById('dem-file').onchange = async (e) => {
        if (e.target.files.length > 0) {
            try {
                showLoading('Uploading DEM...');
                const fileId = await uploadDEMFile(e.target.files[0]);
                const demInfo = await processDEM(fileId);
                currentDEMInfo = { ...demInfo, fileId };
                addDEMTerrain(currentDEMInfo);
            } catch (err) {
                hideLoading();
                alert('DEM import failed: ' + err.message);
            }
        }
    };
    document.getElementById('elevation-scale').oninput = (e) => {
        elevationScale = parseFloat(e.target.value);
        document.getElementById('scale-value').textContent = elevationScale.toFixed(1) + 'x';
        if (map && map.getTerrain()) {
            map.setTerrain({ source: demSourceId, exaggeration: elevationScale });
        }
    };
    document.getElementById('add-wms-btn').onclick = () => {
        const url = document.getElementById('wms-url').value.trim();
        const layerName = document.getElementById('wms-layer').value.trim();
        if (!url || !layerName) {
            alert('Please enter both WMS URL and Layer Name');
            return;
        }
        try {
            addWMSLayer(url, layerName);
        } catch (err) {
            alert('Failed to add WMS: ' + err.message);
        }
    };
    document.getElementById('reset-view-btn').onclick = resetView;
}

window.addEventListener('DOMContentLoaded', () => {
    initMap();
    setupUI();
    hideLoading();
});