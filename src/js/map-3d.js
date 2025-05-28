// 3D Three.js Map Component

class Map3D {
    constructor(targetId) {
        this.targetId = targetId;
        this.container = document.getElementById(targetId);
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.terrain = null;
        this.demData = null;
        this.elevationScale = 1;
        
        this.init();
        this.setupControls();
        this.animate();
    }

    init() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Sky blue

        // Camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            this.container.clientWidth / this.container.clientHeight,
            0.1,
            10000
        );
        this.camera.position.set(0, 800, 800);
        this.camera.lookAt(0, 0, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // Lighting
        this.setupLighting();

        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
    }

    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(ambientLight);

        // Directional light (sun)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1000, 1000, 500);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 3000;
        directionalLight.shadow.camera.left = -1000;
        directionalLight.shadow.camera.right = 1000;
        directionalLight.shadow.camera.top = 1000;
        directionalLight.shadow.camera.bottom = -1000;
        this.scene.add(directionalLight);

        // Add a helper to visualize the light direction (optional)
        // const helper = new THREE.DirectionalLightHelper(directionalLight, 100);
        // this.scene.add(helper);
    }

    setupControls() {
        // Simple orbit controls using mouse
        this.mouse = { x: 0, y: 0 };
        this.isMouseDown = false;
        this.cameraDistance = 1200;
        this.cameraAngleX = 0;
        this.cameraAngleY = Math.PI / 6;

        this.renderer.domElement.addEventListener('mousedown', (e) => {
            this.isMouseDown = true;
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        });

        this.renderer.domElement.addEventListener('mousemove', (e) => {
            if (!this.isMouseDown) return;

            const deltaX = e.clientX - this.mouse.x;
            const deltaY = e.clientY - this.mouse.y;

            this.cameraAngleX -= deltaX * 0.01;
            this.cameraAngleY -= deltaY * 0.01;
            this.cameraAngleY = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.cameraAngleY));

            this.updateCamera();

            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        });

        this.renderer.domElement.addEventListener('mouseup', () => {
            this.isMouseDown = false;
        });

        this.renderer.domElement.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.cameraDistance += e.deltaY * 2;
            this.cameraDistance = Math.max(100, Math.min(3000, this.cameraDistance));
            this.updateCamera();
        });

        // Touch controls for mobile
        this.renderer.domElement.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                this.isMouseDown = true;
                this.mouse.x = e.touches[0].clientX;
                this.mouse.y = e.touches[0].clientY;
            }
        });

        this.renderer.domElement.addEventListener('touchmove', (e) => {
            if (e.touches.length === 1 && this.isMouseDown) {
                e.preventDefault();
                const deltaX = e.touches[0].clientX - this.mouse.x;
                const deltaY = e.touches[0].clientY - this.mouse.y;

                this.cameraAngleX -= deltaX * 0.01;
                this.cameraAngleY -= deltaY * 0.01;
                this.cameraAngleY = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.cameraAngleY));

                this.updateCamera();

                this.mouse.x = e.touches[0].clientX;
                this.mouse.y = e.touches[0].clientY;
            }
        });

        this.renderer.domElement.addEventListener('touchend', () => {
            this.isMouseDown = false;
        });
    }

    updateCamera() {
        const x = Math.cos(this.cameraAngleY) * Math.sin(this.cameraAngleX) * this.cameraDistance;
        const y = Math.sin(this.cameraAngleY) * this.cameraDistance;
        const z = Math.cos(this.cameraAngleY) * Math.cos(this.cameraAngleX) * this.cameraDistance;

        this.camera.position.set(x, y, z);
        this.camera.lookAt(0, 0, 0);
    }

    loadTerrain(demData) {
        // Remove existing terrain
        if (this.terrain) {
            this.scene.remove(this.terrain);
        }

        this.demData = demData;
        
        // Create terrain geometry
        const terrainGenerator = new TerrainGenerator();
        const geometry = terrainGenerator.createTerrainGeometry(demData, this.elevationScale);
        const texture = terrainGenerator.createElevationTexture(demData);

        // Create material
        const material = new THREE.MeshLambertMaterial({
            map: texture,
            wireframe: false
        });

        // Create mesh
        this.terrain = new THREE.Mesh(geometry, material);
        this.terrain.rotation.x = -Math.PI / 2; // Rotate to make it horizontal
        this.terrain.receiveShadow = true;
        this.terrain.castShadow = true;

        this.scene.add(this.terrain);

        // Hide loading message
        const loading = document.getElementById('loading');
        if (loading) {
            loading.style.display = 'none';
        }

        console.log('Terrain loaded:', {
            width: demData.width,
            height: demData.height,
            minElevation: demData.minElevation,
            maxElevation: demData.maxElevation
        });
    }

    updateElevationScale(scale) {
        this.elevationScale = scale;
        if (this.demData && this.terrain) {
            // Update geometry
            const terrainGenerator = new TerrainGenerator();
            const newGeometry = terrainGenerator.createTerrainGeometry(this.demData, scale);
            
            this.terrain.geometry.dispose();
            this.terrain.geometry = newGeometry;
            this.terrain.rotation.x = -Math.PI / 2;
        }
    }

    resetCamera() {
        this.cameraAngleX = 0;
        this.cameraAngleY = Math.PI / 6;
        this.cameraDistance = 1200;
        this.updateCamera();
    }

    onWindowResize() {
        if (!this.container) return;
        
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.renderer.render(this.scene, this.camera);
    }

    // Add wireframe toggle
    toggleWireframe() {
        if (this.terrain && this.terrain.material) {
            this.terrain.material.wireframe = !this.terrain.material.wireframe;
        }
    }

    // Get scene info for debugging
    getSceneInfo() {
        return {
            terrainLoaded: !!this.terrain,
            cameraPosition: this.camera.position,
            sceneChildren: this.scene.children.length,
            elevationScale: this.elevationScale
        };
    }
}