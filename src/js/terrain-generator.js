// Terrain Generator - Creates sample DEM data and utilities

class TerrainGenerator {
    constructor() {
        this.width = 128;
        this.height = 128;
        this.bounds = {
            minX: 7.0, maxX: 7.2,  // Longitude (Bochum area)
            minY: 51.4, maxY: 51.6  // Latitude
        };
    }

    // Generate sample mountainous terrain
    generateSampleDEM() {
        const data = new Float32Array(this.width * this.height);
        const centerX = this.width / 2;
        const centerY = this.height / 2;

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                let elevation = 0;

                // Create multiple peaks
                const peaks = [
                    { x: centerX - 20, y: centerY - 20, height: 400 },
                    { x: centerX + 25, y: centerY - 15, height: 350 },
                    { x: centerX - 10, y: centerY + 30, height: 300 },
                    { x: centerX + 15, y: centerY + 10, height: 280 }
                ];

                peaks.forEach(peak => {
                    const distance = Math.sqrt(
                        Math.pow(x - peak.x, 2) + Math.pow(y - peak.y, 2)
                    );
                    const influence = Math.exp(-distance / 25);
                    elevation += peak.height * influence;
                });

                // Add some noise for realism
                elevation += (Math.random() - 0.5) * 20;

                // Add base elevation
                elevation += 100;

                // Smooth valleys
                const valleyFactor = Math.sin((x / this.width) * Math.PI * 2) * 
                                  Math.sin((y / this.height) * Math.PI * 2);
                elevation += valleyFactor * 50;

                data[y * this.width + x] = Math.max(0, elevation);
            }
        }

        return {
            data: data,
            width: this.width,
            height: this.height,
            bounds: this.bounds,
            minElevation: Math.min(...data),
            maxElevation: Math.max(...data)
        };
    }

    // Convert DEM data to Three.js geometry
    createTerrainGeometry(demData, elevationScale = 1) {
        const geometry = new THREE.PlaneGeometry(
            1000, 1000, 
            demData.width - 1, 
            demData.height - 1
        );

        const vertices = geometry.attributes.position.array;
        
        for (let i = 0, j = 0; i < vertices.length; i += 3, j++) {
            if (j < demData.data.length) {
                vertices[i + 2] = demData.data[j] * elevationScale * 0.5;
            }
        }

        geometry.attributes.position.needsUpdate = true;
        geometry.computeVertexNormals();
        
        return geometry;
    }

    // Create texture from elevation data
    createElevationTexture(demData) {
        const canvas = document.createElement('canvas');
        canvas.width = demData.width;
        canvas.height = demData.height;
        const ctx = canvas.getContext('2d');
        
        const imageData = ctx.createImageData(demData.width, demData.height);
        const { minElevation, maxElevation } = demData;
        const range = maxElevation - minElevation;

        for (let i = 0; i < demData.data.length; i++) {
            const elevation = demData.data[i];
            const normalized = (elevation - minElevation) / range;
            
            // Color gradient: blue (low) -> green -> yellow -> red (high)
            let r, g, b;
            if (normalized < 0.25) {
                // Blue to green
                const t = normalized * 4;
                r = 0;
                g = Math.floor(t * 255);
                b = Math.floor((1 - t) * 255);
            } else if (normalized < 0.5) {
                // Green to yellow
                const t = (normalized - 0.25) * 4;
                r = Math.floor(t * 255);
                g = 255;
                b = 0;
            } else if (normalized < 0.75) {
                // Yellow to orange
                const t = (normalized - 0.5) * 4;
                r = 255;
                g = Math.floor((1 - t * 0.5) * 255);
                b = 0;
            } else {
                // Orange to red
                const t = (normalized - 0.75) * 4;
                r = 255;
                g = Math.floor((1 - t) * 128);
                b = Math.floor(t * 50);
            }

            const pixelIndex = i * 4;
            imageData.data[pixelIndex] = r;
            imageData.data[pixelIndex + 1] = g;
            imageData.data[pixelIndex + 2] = b;
            imageData.data[pixelIndex + 3] = 255;
        }

        ctx.putImageData(imageData, 0, 0);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.flipY = false;
        
        return texture;
    }

    // Convert geographic bounds to mercator coordinates for OpenLayers
    getBoundsInMercator() {
        const extent = ol.proj.transformExtent(
            [this.bounds.minX, this.bounds.minY, this.bounds.maxX, this.bounds.maxY],
            'EPSG:4326',
            'EPSG:3857'
        );
        return extent;
    }
}