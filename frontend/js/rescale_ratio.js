// rescale_ratio.js
// Handles the resizable ratio between map and feature list
(function() {
  const mapDiv = document.getElementById('map');
  const featureDiv = document.getElementById('feature-details');
  const handle = document.getElementById('resize-handle');
  const container = document.getElementById('map-feature-container');
  let dragging = false;

  function setFlexHeights(y) {
    // Clamp min/max heights
    const minMap = 50, minFeature = 40, handleHeight = 8;
    const containerHeight = container.getBoundingClientRect().height;
    y = Math.max(minMap, Math.min(y, containerHeight - minFeature - handleHeight));
    mapDiv.style.flex = `0 0 ${y}px`;
    featureDiv.style.flex = `1 1 ${containerHeight - y - handleHeight}px`;
    // If using Leaflet, trigger map resize
    if (window.L && window.L.Map && window.map) {
      setTimeout(() => { window.map.invalidateSize(); }, 100);
    }
  }

  function onMouseMove(e) {
    if (!dragging) return;
    const containerRect = container.getBoundingClientRect();
    setFlexHeights(e.clientY - containerRect.top);
  }

  function onMouseUp() {
    dragging = false;
    document.body.style.userSelect = '';
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  }

  handle.addEventListener('mousedown', function(e) {
    dragging = true;
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  });
})();
