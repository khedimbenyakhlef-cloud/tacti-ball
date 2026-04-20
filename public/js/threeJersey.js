
### 7. **public/js/threeJersey.js** - Designer 3D amélioré
```javascript
// threeJersey.js - Designer de maillot 3D avec Three.js

class ThreeJerseyDesigner {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.jerseyMesh = null;
        this.lights = [];
        this.currentRotation = 0;
        this.autoRotate = false;
        this.rotationSpeed = 0.002;
        
        this.colors = {
            primary: '#1a5c36',
            secondary: '#8B4513',
            accent: '#FF4500'
        };
        
        this.template = 'classic';
        this.texture = 'cotton';
        this.shininess = 50;
        this.roughness = 30;
        this.pattern = 'stripes';
        
        this.init();
    }
    
    init() {
        // Vérifier si Three.js est disponible
        if (typeof THREE === 'undefined') {
            console.error('Three.js n\'est pas chargé');
            return;
        }
        
        // Initialiser la scène
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0A1A0A);
        
        // Initialiser la caméra
        this.camera = new THREE.PerspectiveCamera(
            45,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 0, 5);
        
        // Initialiser le renderer
        const container = document.getElementById('3d-container');
        if (!container) return;
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        container.appendChild(this.renderer.domElement);
        
        // Initialiser les contrôles orbitaux
        if (typeof THREE.OrbitControls !== 'undefined') {
            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.05;
            this.controls.minDistance = 2;
            this.controls.maxDistance = 10;
        }
        
        // Ajouter l'éclairage
        this.setupLights();
        
        // Créer le maillot
        this.createJersey();
        
        // Gestion du redimensionnement
        window.addEventListener('resize', () => this.onWindowResize());
        
        // Démarrer l'animation
        this.animate();
        
        // Écouter les changements de couleur
        this.setupColorListeners();
    }
    
    setupLights() {
        // Lumière ambiante
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        this.lights.push(ambientLight);
        
        // Lumière directionnelle principale
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 10, 7);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);
        this.lights.push(directionalLight);
        
        // Lumière d'accentuation
        const accentLight = new THREE.PointLight(0xff4500, 0.5);
        accentLight.position.set(-3, 2, 4);
        this.scene.add(accentLight);
        this.lights.push(accentLight);
    }
    
    createJersey() {
        // Supprimer l'ancien maillot s'il existe
        if (this.jerseyMesh) {
            this.scene.remove(this.jerseyMesh);
        }
        
        // Créer la géométrie selon le modèle
        let geometry;
        switch (this.template) {
            case 'modern':
                geometry = this.createModernGeometry();
                break;
            case 'vintage':
                geometry = this.createVintageGeometry();
                break;
            case 'sleeveless':
                geometry = this.createSleevelessGeometry();
                break;
            default: // 'classic'
                geometry = this.createClassicGeometry();
        }
        
        // Créer le matériau
        const material = this.createMaterial();
        
        // Créer le mesh
        this.jerseyMesh = new THREE.Mesh(geometry, material);
        this.jerseyMesh.castShadow = true;
        this.jerseyMesh.receiveShadow = true;
        
        // Ajouter à la scène
        this.scene.add(this.jerseyMesh);
        
        // Ajouter les détails (numéros, badges, etc.)
        this.addDetails();
    }
    
    createClassicGeometry() {
        // Géométrie de base pour un maillot classique
        const geometry = new THREE.BufferGeometry();
        
        // Créer les sommets pour un maillot simple
        const vertices = new Float32Array([
            // Corps principal
            -1, -1.5, 0,
             1, -1.5, 0,
             1,  1.5, 0,
            -1,  1.5, 0,
            
            // Épaules
            -1.2,  1.2, 0.3,
             1.2,  1.2, 0.3,
            -1.2,  1.2, -0.3,
             1.2,  1.2, -0.3,
        ]);
        
        // Créer les faces
        const indices = [
            0, 1, 2, 2, 3, 0, // Face avant
            4, 5, 6, 7, 6, 5, // Épaules
        ];
        
        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        
        return geometry;
    }
    
    createMaterial() {
        // Couleur principale
        const primaryColor = new THREE.Color(this.colors.primary);
        
        // Propriétés du matériau selon le type de tissu
        let materialProps = {};
        
        switch (this.texture) {
            case 'polyester':
                materialProps = {
                    shininess: this.shininess,
                    specular: new THREE.Color(0x222222),
                    color: primaryColor
                };
                break;
            case 'mesh':
                materialProps = {
                    shininess: 10,
                    specular: new THREE.Color(0x111111),
                    color: primaryColor,
                    transparent: true,
                    opacity: 0.9
                };
                break;
            default: // 'cotton'
                materialProps = {
                    shininess: 5,
                    specular: new THREE.Color(0x050505),
                    color: primaryColor,
                    roughness: this.roughness / 100
                };
        }
        
        // Appliquer le motif
        if (this.pattern !== 'solid') {
            // Pour les motifs, nous utiliserions une texture
            // Pour la simplicité, nous changeons juste les propriétés du matériau
            materialProps.shininess *= 0.7;
        }
        
        return new THREE.MeshPhongMaterial(materialProps);
    }
    
    addDetails() {
        // Ajouter le numéro
        this.addNumber();
        
        // Ajouter le nom
        this.addName();
        
        // Ajouter les badges
        if (document.getElementById('add-badge')?.checked) {
            this.addBadge();
        }
        
        // Ajouter les sponsors
        if (document.getElementById('add-sponsor')?.checked) {
            this.addSponsor();
        }
    }
    
    addNumber() {
        const number = document.getElementById('jersey-number')?.value || '7';
        const style = document.querySelector('.number-style.active')?.dataset.style || 'block';
        
        // Créer un canvas pour le texte
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 256;
        
        // Dessiner le numéro
        ctx.fillStyle = this.colors.accent;
        ctx.font = 'bold 180px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        if (style === 'outline') {
            ctx.strokeStyle = this.colors.secondary;
            ctx.lineWidth = 10;
            ctx.strokeText(number, 128, 128);
            ctx.fillText(number, 128, 128);
        } else if (style === 'gradient') {
            const gradient = ctx.createLinearGradient(0, 0, 256, 256);
            gradient.addColorStop(0, this.colors.accent);
            gradient.addColorStop(1, this.colors.secondary);
            ctx.fillStyle = gradient;
            ctx.fillText(number, 128, 128);
        } else {
            ctx.fillText(number, 128, 128);
        }
        
        // Créer une texture à partir du canvas
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(1, 1, 1);
        sprite.position.set(0, 0, 0.1);
        
        this.jerseyMesh.add(sprite);
    }
    
    addName() {
        const name = document.getElementById('player-name')?.value || 'BENY-JOE';
        
        // Similaire à addNumber, mais positionné plus bas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 512;
        canvas.height = 128;
        
        ctx.fillStyle = this.colors.accent;
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(name, 256, 64);
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(1.5, 0.4, 1);
        sprite.position.set(0, -0.8, 0.1);
        
        this.jerseyMesh.add(sprite);
    }
    
    addBadge() {
        // Simuler un badge simple
        const geometry = new THREE.CircleGeometry(0.2, 32);
        const material = new THREE.MeshBasicMaterial({ 
            color: new THREE.Color(this.colors.secondary)
        });
        const badge = new THREE.Mesh(geometry, material);
        badge.position.set(0.8, 1, 0.1);
        
        this.jerseyMesh.add(badge);
    }
    
    addSponsor() {
        // Simuler un sponsor
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('BENY-JOE', 128, 32);
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(1, 0.25, 1);
        sprite.position.set(0, 0.2, 0.1);
        
        this.jerseyMesh.add(sprite);
    }
    
    updateColors(primary, secondary, accent) {
        this.colors = { primary, secondary, accent };
        this.createJersey();
    }
    
    updateTemplate(template) {
        this.template = template;
        this.createJersey();
    }
    
    updateTexture(texture) {
        this.texture = texture;
        this.createJersey();
    }
    
    updatePattern(pattern) {
        this.pattern = pattern;
        this.createJersey();
    }
    
    updateShininess(value) {
        this.shininess = value;
        this.createJersey();
    }
    
    updateRoughness(value) {
        this.roughness = value;
        this.createJersey();
    }
    
    setupColorListeners() {
        // Écouter les changements de couleur
        const colorInputs = ['primary-color', 'secondary-color', 'accent-color'];
        colorInputs.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('input', (e) => {
                    const color = e.target.value;
                    const hexInput = document.getElementById(id.replace('color', 'hex'));
                    if (hexInput) hexInput.value = color;
                    
                    this.updateColors(
                        document.getElementById('primary-color').value,
                        document.getElementById('secondary-color').value,
                        document.getElementById('accent-color').value
                    );
                });
            }
        });
        
        // Palettes prédéfinies
        document.querySelectorAll('.color-preset').forEach(preset => {
            preset.addEventListener('click', () => {
                const primary = preset.dataset.primary;
                const secondary = preset.dataset.secondary;
                const accent = preset.dataset.accent;
                
                document.getElementById('primary-color').value = primary;
                document.getElementById('secondary-color').value = secondary;
                document.getElementById('accent-color').value = accent;
                
                document.getElementById('primary-hex').value = primary;
                document.getElementById('secondary-hex').value = secondary;
                document.getElementById('accent-hex').value = accent;
                
                this.updateColors(primary, secondary, accent);
            });
        });
        
        // Modèles de maillot
        document.querySelectorAll('.template-preview').forEach(template => {
            template.addEventListener('click', () => {
                document.querySelectorAll('.template-preview').forEach(t => {
                    t.classList.remove('selected');
                });
                template.classList.add('selected');
                
                this.updateTemplate(template.dataset.template);
            });
        });
        
        // Matériaux
        document.querySelectorAll('.material-option').forEach(material => {
            material.addEventListener('click', () => {
                document.querySelectorAll('.material-option').forEach(m => {
                    m.classList.remove('active');
                });
                material.classList.add('active');
                
                this.updateTexture(material.dataset.material);
            });
        });
        
        // Motifs
        document.querySelectorAll('.pattern-option').forEach(pattern => {
            pattern.addEventListener('click', () => {
                document.querySelectorAll('.pattern-option').forEach(p => {
                    p.classList.remove('active');
                });
                pattern.classList.add('active');
                
                this.updatePattern(pattern.dataset.pattern);
            });
        });
        
        // Contrôles de brillance/rugosité
        const shininessInput = document.getElementById('shininess');
        const roughnessInput = document.getElementById('roughness');
        
        if (shininessInput) {
            shininessInput.addEventListener('input', (e) => {
                const value = e.target.value;
                document.getElementById('shininess-value').textContent = value + '%';
                this.updateShininess(value);
            });
        }
        
        if (roughnessInput) {
            roughnessInput.addEventListener('input', (e) => {
                const value = e.target.value;
                document.getElementById('roughness-value').textContent = value + '%';
                this.updateRoughness(value);
            });
        }
        
        // Vues
        document.getElementById('view-front')?.addEventListener('click', () => {
            this.camera.position.set(0, 0, 5);
            this.camera.lookAt(0, 0, 0);
            this.autoRotate = false;
        });
        
        document.getElementById('view-back')?.addEventListener('click', () => {
            this.camera.position.set(0, 0, -5);
            this.camera.lookAt(0, 0, 0);
            this.autoRotate = false;
        });
        
        document.getElementById('view-360')?.addEventListener('click', () => {
            this.autoRotate = !this.autoRotate;
        });
        
        document.getElementById('reset-view')?.addEventListener('click', () => {
            if (this.controls) {
                this.controls.reset();
            }
            this.camera.position.set(0, 0, 5);
            this.camera.lookAt(0, 0, 0);
            this.autoRotate = false;
        });
    }
    
    onWindowResize() {
        const container = document.getElementById('3d-container');
        if (!container || !this.camera || !this.renderer) return;
        
        this.camera.aspect = container.clientWidth / container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(container.clientWidth, container.clientHeight);
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        if (this.autoRotate && this.jerseyMesh) {
            this.jerseyMesh.rotation.y += this.rotationSpeed;
        }
        
        if (this.controls) {
            this.controls.update();
        }
        
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
    
    exportAsPNG() {
        if (!this.renderer) return;
        
        const dataURL = this.renderer.domElement.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = dataURL;
        link.download = `maillot-benyjoe-${Date.now()}.png`;
        link.click();
    }
    
    exportAs3D() {
        // Export au format GLTF (simplifié pour la démo)
        if (!this.jerseyMesh) return;
        
        const exporter = new THREE.GLTFExporter();
        exporter.parse(this.jerseyMesh, (gltf) => {
            const blob = new Blob([JSON.stringify(gltf)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `maillot-3d-${Date.now()}.gltf`;
            link.click();
            URL.revokeObjectURL(url);
        });
    }
}

// Initialiser le designer quand la page est prête
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (document.getElementById('3d-container')) {
            window.jerseyDesigner = new ThreeJerseyDesigner();
        }
    }, 1000);
});