/**
 * Three.js Jersey 3D Renderer
 * Pour le designer de maillot 3D
 */

class Jersey3DRenderer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('Conteneur 3D non trouvé:', containerId);
            return;
        }
        
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.jersey = null;
        this.controls = null;
        this.isInitialized = false;
        
        this.init();
    }
    
    async init() {
        try {
            // Charger Three.js dynamiquement
            if (typeof THREE === 'undefined') {
                await this.loadThreeJS();
            }
            
            this.setupScene();
            this.setupCamera();
            this.setupRenderer();
            this.setupLights();
            this.setupControls();
            this.createJersey();
            this.animate();
            
            this.isInitialized = true;
            console.log('✅ Three.js Jersey Renderer initialisé');
            
        } catch (error) {
            console.error('Erreur d\'initialisation Three.js:', error);
            this.showFallback();
        }
    }
    
    async loadThreeJS() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/three@0.162.0/build/three.module.js';
            script.type = 'module';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    
    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a0a);
        this.scene.fog = new THREE.Fog(0x0a0a0a, 10, 50);
    }
    
    setupCamera() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        
        this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        this.camera.position.set(0, 0, 5);
        this.camera.lookAt(0, 0, 0);
    }
    
    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true 
        });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        this.container.appendChild(this.renderer.domElement);
        
        // Redimensionnement
        window.addEventListener('resize', () => this.onWindowResize());
    }
    
    setupLights() {
        // Lumière principale
        const mainLight = new THREE.DirectionalLight(0xffffff, 1);
        mainLight.position.set(5, 5, 5);
        mainLight.castShadow = true;
        this.scene.add(mainLight);
        
        // Lumière ambiante
        const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
        this.scene.add(ambientLight);
        
        // Lumière de remplissage
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
        fillLight.position.set(-5, -5, -5);
        this.scene.add(fillLight);
    }
    
    setupControls() {
        if (typeof THREE.OrbitControls !== 'undefined') {
            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.05;
            this.controls.rotateSpeed = 0.5;
            this.controls.enableZoom = true;
            this.controls.zoomSpeed = 0.5;
        }
    }
    
    createJersey() {
        // Créer la géométrie du maillot
        const geometry = new THREE.Group();
        
        // Corps du maillot
        const bodyGeometry = new THREE.BoxGeometry(2, 3, 0.5);
        const bodyMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x1a5c36,
            shininess: 50,
            specular: 0x222222
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.castShadow = true;
        body.receiveShadow = true;
        geometry.add(body);
        
        // Manches
        const sleeveGeometry = new THREE.CylinderGeometry(0.3, 0.4, 1.5, 16);
        const sleeveMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x8B4513,
            shininess: 30
        });
        
        const leftSleeve = new THREE.Mesh(sleeveGeometry, sleeveMaterial);
        leftSleeve.position.set(-1.2, 0, 0);
        leftSleeve.rotation.z = Math.PI / 2;
        leftSleeve.castShadow = true;
        geometry.add(leftSleeve);
        
        const rightSleeve = new THREE.Mesh(sleepeGeometry, sleeveMaterial);
        rightSleeve.position.set(1.2, 0, 0);
        rightSleeve.rotation.z = Math.PI / 2;
        rightSleeve.castShadow = true;
        geometry.add(rightSleeve);
        
        // Numéro
        const numberGeometry = new THREE.PlaneGeometry(0.8, 1);
        const numberMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xFF4500,
            side: THREE.DoubleSide
        });
        const number = new THREE.Mesh(numberGeometry, numberMaterial);
        number.position.set(0, 0.5, 0.26);
        geometry.add(number);
        
        this.jersey = geometry;
        this.scene.add(this.jersey);
    }
    
    updateJersey(design) {
        if (!this.jersey || !this.isInitialized) return;
        
        // Mettre à jour les couleurs
        const body = this.jersey.children[0];
        const sleeves = [this.jersey.children[1], this.jersey.children[2]];
        const number = this.jersey.children[3];
        
        if (body.material) {
            body.material.color.set(design.primaryColor);
            body.material.shininess = design.shininess;
        }
        
        sleeves.forEach(sleeve => {
            if (sleeve.material) {
                sleeve.material.color.set(design.secondaryColor);
            }
        });
        
        if (number.material) {
            number.material.color.set(design.accentColor);
        }
        
        // Animation de rotation pour la vue 360°
        if (design.viewMode === '360') {
            this.jersey.rotation.y += 0.01;
        }
    }
    
    setView(mode) {
        if (!this.camera || !this.jersey) return;
        
        switch(mode) {
            case 'front':
                this.camera.position.set(0, 0, 5);
                this.jersey.rotation.set(0, 0, 0);
                break;
            case 'back':
                this.camera.position.set(0, 0, -5);
                this.jersey.rotation.set(0, Math.PI, 0);
                break;
            case '360':
                // Mode rotation automatique
                break;
        }
        
        if (this.controls) {
            this.controls.update();
        }
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        if (this.controls) {
            this.controls.update();
        }
        
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
    
    onWindowResize() {
        if (!this.camera || !this.renderer) return;
        
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }
    
    showFallback() {
        this.container.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full text-center p-8">
                <div class="w-32 h-32 mb-6 rounded-full bg-gradient-to-br from-green-700 to-blue-700 
                            flex items-center justify-center animate-pulse">
                    <i class="fas fa-tshirt text-5xl text-white"></i>
                </div>
                <h3 class="text-xl font-bold mb-2">Aperçu 3D</h3>
                <p class="text-gray-400 mb-4">
                    La prévisualisation 3D nécessite WebGL. Votre navigateur ne supporte pas cette fonctionnalité.
                </p>
                <div class="flex space-x-2">
                    <div class="w-12 h-12 rounded" style="background: #1a5c36"></div>
                    <div class="w-12 h-12 rounded" style="background: #8B4513"></div>
                    <div class="w-12 h-12 rounded" style="background: #FF4500"></div>
                </div>
            </div>
        `;
    }
    
    exportAsPNG() {
        if (!this.renderer) return;
        
        const dataURL = this.renderer.domElement.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = dataURL;
        link.download = `maillot-tactiball-${Date.now()}.png`;
        link.click();
        
        return dataURL;
    }
}

// Exporter pour utilisation globale
if (typeof window !== 'undefined') {
    window.Jersey3DRenderer = Jersey3DRenderer;
}