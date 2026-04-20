/**
 * BENY-JOE TACTI-BALL PRO ULTRA
 * Application JavaScript Principale
 * Développé par KHEDIM BENYAKHLEF (BENY-JOE)
 */

// ============================================
// INITIALISATION DE L'APPLICATION
// ============================================

class TactiBallApp {
    constructor() {
        this.currentUser = null;
        this.isAdmin = false;
        this.currentAnalysis = null;
        this.jerseyDesign = null;
        this.init();
    }

    init() {
        console.log('🚀 BENY-JOE TACTI-BALL PRO ULTRA - Initialisation');
        
        // Initialiser les composants
        this.initEventListeners();
        this.initAnimations();
        this.initCounters();
        this.initCharts();
        this.initField();
        this.checkAuth();
        
        // Charger les données initiales
        this.loadRecentAnalyses();
        this.loadDesignGallery();
        this.loadPlayerStats();
        
        // Initialiser le système de notifications
        this.notificationSystem();
        
        console.log('✅ Application initialisée avec succès');
    }

    // ============================================
    // SYSTÈME D'AUTHENTIFICATION
    // ============================================

    checkAuth() {
        // Vérifier si un utilisateur est connecté (simulation)
        const storedUser = localStorage.getItem('tactiball_user');
        if (storedUser) {
            try {
                this.currentUser = JSON.parse(storedUser);
                this.isAdmin = this.currentUser.role === 'admin';
                this.updateUserInterface();
            } catch (error) {
                console.error('Erreur de parsing utilisateur:', error);
                localStorage.removeItem('tactiball_user');
            }
        }
    }

    async login(email, password) {
        try {
            // Simulation d'authentification
            const mockUsers = [
                {
                    id: 1,
                    name: 'KHEDIM BENYAKHLEF',
                    email: 'khedimbenyakhlef@gmail.com',
                    role: 'admin',
                    initials: 'KB',
                    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=beny-joe'
                },
                {
                    id: 2,
                    name: 'Utilisateur Démo',
                    email: 'demo@tactiball.com',
                    role: 'user',
                    initials: 'UD',
                    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo'
                }
            ];

            const user = mockUsers.find(u => u.email === email && password === 'password123');
            
            if (user) {
                this.currentUser = user;
                this.isAdmin = user.role === 'admin';
                
                // Sauvegarder en localStorage
                localStorage.setItem('tactiball_user', JSON.stringify(user));
                
                // Mettre à jour l'interface
                this.updateUserInterface();
                
                // Afficher notification
                this.showNotification(`Bienvenue ${user.name} !`, 'success');
                
                return { success: true, user };
            } else {
                throw new Error('Identifiants incorrects');
            }
        } catch (error) {
            this.showNotification(error.message, 'error');
            return { success: false, error: error.message };
        }
    }

    logout() {
        this.currentUser = null;
        this.isAdmin = false;
        localStorage.removeItem('tactiball_user');
        this.updateUserInterface();
        this.showNotification('Déconnexion réussie', 'success');
    }

    updateUserInterface() {
        const userMenuBtn = document.getElementById('user-menu-btn');
        const loginBtn = document.getElementById('login-btn');
        const adminNav = document.getElementById('admin-nav');
        const adminNavMobile = document.getElementById('admin-nav-mobile');
        const mobileUserMenu = document.getElementById('mobile-user-menu');
        const mobileLoginBtn = document.getElementById('mobile-login-btn');

        if (this.currentUser) {
            // Desktop
            if (userMenuBtn) {
                userMenuBtn.style.display = 'flex';
                document.getElementById('user-name').textContent = this.currentUser.name;
                document.getElementById('user-initials').textContent = this.currentUser.initials;
            }
            
            if (loginBtn) loginBtn.style.display = 'none';
            
            if (adminNav) {
                adminNav.style.display = this.isAdmin ? 'flex' : 'none';
                adminNavMobile.style.display = this.isAdmin ? 'block' : 'none';
            }

            // Mobile
            if (mobileUserMenu) {
                mobileUserMenu.style.display = 'block';
                document.getElementById('mobile-user-name').textContent = this.currentUser.name;
                document.getElementById('mobile-user-initials').textContent = this.currentUser.initials;
                document.getElementById('mobile-user-email').textContent = this.currentUser.email;
            }
            
            if (mobileLoginBtn) mobileLoginBtn.style.display = 'none';
        } else {
            // Desktop
            if (userMenuBtn) userMenuBtn.style.display = 'none';
            if (loginBtn) loginBtn.style.display = 'block';
            if (adminNav) adminNav.style.display = 'none';

            // Mobile
            if (mobileUserMenu) mobileUserMenu.style.display = 'none';
            if (mobileLoginBtn) mobileLoginBtn.style.display = 'block';
            if (adminNavMobile) adminNavMobile.style.display = 'none';
        }
    }

    // ============================================
    // SYSTÈME DE NOTIFICATIONS
    // ============================================

    notificationSystem() {
        this.notificationContainer = document.getElementById('notification-container');
        if (!this.notificationContainer) {
            this.notificationContainer = document.createElement('div');
            this.notificationContainer.id = 'notification-container';
            this.notificationContainer.className = 'fixed top-20 right-4 z-50 w-96 max-w-full';
            document.body.appendChild(this.notificationContainer);
        }
    }

    showNotification(message, type = 'info', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type} animate-slide-in-right`;
        
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        
        const colors = {
            success: 'text-green-400',
            error: 'text-red-400',
            warning: 'text-yellow-400',
            info: 'text-blue-400'
        };
        
        notification.innerHTML = `
            <i class="fas fa-${icons[type]} ${colors[type]}"></i>
            <div class="flex-1">
                <div class="font-medium">${message}</div>
            </div>
            <button onclick="this.parentElement.remove()" class="text-gray-400 hover:text-white transition">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        this.notificationContainer.appendChild(notification);
        
        // Supprimer automatiquement après la durée
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.opacity = '0';
                notification.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 300);
            }
        }, duration);
    }

    // ============================================
    // SYSTÈME D'ANALYSE
    // ============================================

    async analyzeFile(file) {
        try {
            this.showNotification('Analyse en cours...', 'info');
            
            // Simulation d'analyse
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Générer des résultats simulés
            const results = {
                success: true,
                playerNumber: Math.floor(Math.random() * 99) + 1,
                position: ['Gardien', 'Défenseur', 'Milieu', 'Attaquant'][Math.floor(Math.random() * 4)],
                confidence: 85 + Math.random() * 15,
                formation: ['4-3-3', '4-4-2', '3-5-2', '4-2-3-1'][Math.floor(Math.random() * 4)],
                colors: [
                    '#1a5c36',
                    '#8B4513',
                    '#FF4500',
                    '#228B22',
                    '#1C1C1C'
                ].sort(() => Math.random() - 0.5).slice(0, 3),
                playersDetected: 11 + Math.floor(Math.random() * 11),
                analysis: "L'IA DeepSeek a détecté une formation équilibrée avec un pressing haut. Recommandation: exploiter les espaces sur les ailes."
            };
            
            this.currentAnalysis = results;
            this.displayAnalysisResults(results);
            this.showNotification('Analyse terminée avec succès!', 'success');
            
            return results;
        } catch (error) {
            this.showNotification('Erreur lors de l\'analyse: ' + error.message, 'error');
            return { success: false, error: error.message };
        }
    }

    displayAnalysisResults(results) {
        // Mettre à jour l'interface avec les résultats
        const resultsArea = document.getElementById('results-area');
        const loadingIndicator = document.getElementById('loading-indicator');
        const deepseekLoading = document.getElementById('deepseek-loading');
        const previewArea = document.getElementById('preview-area');
        
        // Cacher les indicateurs de chargement
        if (loadingIndicator) loadingIndicator.classList.add('hidden');
        if (deepseekLoading) deepseekLoading.classList.add('hidden');
        
        // Afficher les résultats
        if (resultsArea) {
            resultsArea.classList.remove('hidden');
            
            // Mettre à jour les données
            document.getElementById('detected-number').textContent = results.playerNumber;
            document.getElementById('player-position').textContent = results.position;
            document.getElementById('number-confidence').textContent = results.confidence.toFixed(1) + '%';
            document.getElementById('confidence-score').textContent = results.confidence.toFixed(0) + '%';
            document.getElementById('formation-detected').textContent = results.formation;
            document.getElementById('players-detected').textContent = results.playersDetected;
            document.getElementById('formation-confidence').style.width = results.confidence + '%';
            document.getElementById('deepseek-analysis').textContent = results.analysis;
            
            // Afficher la palette de couleurs
            const colorPalette = document.getElementById('color-palette');
            if (colorPalette) {
                colorPalette.innerHTML = '';
                results.colors.forEach(color => {
                    const colorElement = document.createElement('div');
                    colorElement.className = 'w-12 h-12 rounded-lg cursor-pointer transition-transform hover:scale-110';
                    colorElement.style.backgroundColor = color;
                    colorElement.title = color;
                    colorElement.onclick = () => {
                        navigator.clipboard.writeText(color);
                        this.showNotification(`Couleur ${color} copiée!`, 'success');
                    };
                    colorPalette.appendChild(colorElement);
                });
            }
            
            // Afficher les boutons d'action
            document.getElementById('design-from-analysis').classList.remove('hidden');
            document.getElementById('export-analysis').classList.remove('hidden');
            document.getElementById('view-details').classList.remove('hidden');
            document.getElementById('deepseek-reanalyze').classList.remove('hidden');
        }
        
        // Mettre à jour la prévisualisation
        if (previewArea) {
            previewArea.innerHTML = `
                <div class="relative">
                    <img src="https://api.dicebear.com/7.x/shapes/svg?seed=${results.playerNumber}" 
                         class="w-full h-48 object-cover rounded-lg mb-4">
                    <div class="absolute top-2 right-2 badge-primary">
                        <i class="fas fa-futbol mr-1"></i> ${results.formation}
                    </div>
                </div>
            `;
        }
    }

    // ============================================
    // DESIGNER DE MAILLOT
    // ============================================

    initJerseyDesigner() {
        this.jerseyDesign = {
            primaryColor: '#1a5c36',
            secondaryColor: '#8B4513',
            accentColor: '#FF4500',
            template: 'classic',
            playerNumber: '7',
            playerName: 'BENY-JOE',
            material: 'cotton',
            pattern: 'stripes',
            shininess: 50,
            roughness: 30
        };
        
        this.setupJerseyControls();
        this.updateJerseyPreview();
    }

    setupJerseyControls() {
        // Gérer les changements de couleur
        document.getElementById('primary-color')?.addEventListener('input', (e) => {
            this.jerseyDesign.primaryColor = e.target.value;
            document.getElementById('primary-hex').value = e.target.value;
            this.updateJerseyPreview();
        });
        
        document.getElementById('secondary-color')?.addEventListener('input', (e) => {
            this.jerseyDesign.secondaryColor = e.target.value;
            document.getElementById('secondary-hex').value = e.target.value;
            this.updateJerseyPreview();
        });
        
        document.getElementById('accent-color')?.addEventListener('input', (e) => {
            this.jerseyDesign.accentColor = e.target.value;
            document.getElementById('accent-hex').value = e.target.value;
            this.updateJerseyPreview();
        });
        
        // Gérer les palettes prédéfinies
        document.querySelectorAll('.color-preset').forEach(preset => {
            preset.addEventListener('click', () => {
                const primary = preset.getAttribute('data-primary');
                const secondary = preset.getAttribute('data-secondary');
                const accent = preset.getAttribute('data-accent');
                
                this.jerseyDesign.primaryColor = primary;
                this.jerseyDesign.secondaryColor = secondary;
                this.jerseyDesign.accentColor = accent;
                
                document.getElementById('primary-color').value = primary;
                document.getElementById('primary-hex').value = primary;
                document.getElementById('secondary-color').value = secondary;
                document.getElementById('secondary-hex').value = secondary;
                document.getElementById('accent-color').value = accent;
                document.getElementById('accent-hex').value = accent;
                
                this.updateJerseyPreview();
                this.showNotification('Palette de couleurs appliquée', 'success');
            });
        });
        
        // Gérer les modèles
        document.querySelectorAll('.template-preview').forEach(template => {
            template.addEventListener('click', () => {
                document.querySelectorAll('.template-preview').forEach(t => t.classList.remove('selected'));
                template.classList.add('selected');
                this.jerseyDesign.template = template.getAttribute('data-template');
                this.updateJerseyPreview();
            });
        });
        
        // Gérer les sliders
        document.getElementById('shininess')?.addEventListener('input', (e) => {
            this.jerseyDesign.shininess = e.target.value;
            document.getElementById('shininess-value').textContent = e.target.value + '%';
            this.updateJerseyPreview();
        });
        
        document.getElementById('roughness')?.addEventListener('input', (e) => {
            this.jerseyDesign.roughness = e.target.value;
            document.getElementById('roughness-value').textContent = e.target.value + '%';
            this.updateJerseyPreview();
        });
        
        // Gérer les matériaux
        document.querySelectorAll('.material-option').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.material-option').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.jerseyDesign.material = btn.getAttribute('data-material');
                this.updateJerseyPreview();
            });
        });
        
        // Gérer les numéros et noms
        document.getElementById('jersey-number')?.addEventListener('input', (e) => {
            this.jerseyDesign.playerNumber = e.target.value;
            this.updateJerseyPreview();
        });
        
        document.getElementById('player-name')?.addEventListener('input', (e) => {
            this.jerseyDesign.playerName = e.target.value;
            this.updateJerseyPreview();
        });
        
        // Gérer les styles de numéro
        document.querySelectorAll('.number-style').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.number-style').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.updateJerseyPreview();
            });
        });
        
        // Gérer les motifs
        document.querySelectorAll('.pattern-option').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.pattern-option').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.jerseyDesign.pattern = btn.getAttribute('data-pattern');
                this.updateJerseyPreview();
            });
        });
    }

    updateJerseyPreview() {
        // Mettre à jour l'aperçu visuel
        const canvas = document.getElementById('3d-container');
        if (canvas) {
            // Créer un aperçu simple (remplacé par Three.js dans une version avancée)
            canvas.innerHTML = `
                <div class="flex items-center justify-center h-full">
                    <div class="relative w-64 h-80">
                        <!-- Corps du maillot -->
                        <div class="absolute inset-0 rounded-t-full rounded-b-lg" 
                             style="background: ${this.jerseyDesign.primaryColor}"></div>
                        
                        <!-- Manches -->
                        <div class="absolute top-0 left-0 w-16 h-40 rounded-full -translate-x-4" 
                             style="background: ${this.jerseyDesign.secondaryColor}"></div>
                        <div class="absolute top-0 right-0 w-16 h-40 rounded-full translate-x-4" 
                             style="background: ${this.jerseyDesign.secondaryColor}"></div>
                        
                        <!-- Numéro -->
                        <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
                                    text-6xl font-bold" 
                             style="color: ${this.jerseyDesign.accentColor}">
                            ${this.jerseyDesign.playerNumber}
                        </div>
                        
                        <!-- Nom -->
                        <div class="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-xl font-bold" 
                             style="color: ${this.jerseyDesign.accentColor}">
                            ${this.jerseyDesign.playerName}
                        </div>
                    </div>
                </div>
            `;
        }
    }

    saveJerseyDesign() {
        if (!this.currentUser) {
            this.showNotification('Veuillez vous connecter pour sauvegarder', 'warning');
            return;
        }
        
        const design = { ...this.jerseyDesign, date: new Date().toISOString() };
        
        // Sauvegarder dans localStorage
        let designs = JSON.parse(localStorage.getItem('tactiball_designs') || '[]');
        designs.push(design);
        localStorage.setItem('tactiball_designs', JSON.stringify(designs));
        
        this.showNotification('Design sauvegardé avec succès!', 'success');
        this.loadDesignGallery();
    }

    // ============================================
    // TERRAIN TACTIQUE
    // ============================================

    initField() {
        this.fieldPlayers = {
            home: [],
            away: [],
            ball: { x: 50, y: 50 }
        };
        
        this.createFieldElements();
    }

    createFieldElements() {
        const field = document.getElementById('tactical-field');
        if (!field) return;
        
        // Nettoyer le terrain
        field.innerHTML = '';
        
        // Ajouter les lignes du terrain
        this.createFieldLines(field);
        
        // Ajouter les joueurs
        this.createPlayers(field);
        
        // Ajouter le ballon
        this.createBall(field);
    }

    createFieldLines(container) {
        // Ligne médiane
        const midline = document.createElement('div');
        midline.className = 'absolute top-1/2 left-0 right-0 h-1 bg-white/30 -translate-y-1/2';
        container.appendChild(midline);
        
        // Cercle central
        const centerCircle = document.createElement('div');
        centerCircle.className = 'absolute top-1/2 left-1/2 w-20 h-20 border-2 border-white/30 rounded-full -translate-x-1/2 -translate-y-1/2';
        container.appendChild(centerCircle);
        
        // Surface de réparation gauche
        const leftBox = document.createElement('div');
        leftBox.className = 'absolute top-1/2 left-0 w-16 h-48 border-2 border-white/30 -translate-y-1/2';
        container.appendChild(leftBox);
        
        // Surface de réparation droite
        const rightBox = document.createElement('div');
        rightBox.className = 'absolute top-1/2 right-0 w-16 h-48 border-2 border-white/30 -translate-y-1/2';
        container.appendChild(rightBox);
    }

    createPlayers(container) {
        // Formation 4-3-3 pour l'équipe domicile
        const homeFormation = [
            { x: 10, y: 50, number: 1 }, // Gardien
            { x: 25, y: 25, number: 2 }, // Défenseur
            { x: 25, y: 40, number: 3 },
            { x: 25, y: 60, number: 4 },
            { x: 25, y: 75, number: 5 },
            { x: 40, y: 30, number: 6 }, // Milieu
            { x: 40, y: 50, number: 7 },
            { x: 40, y: 70, number: 8 },
            { x: 60, y: 35, number: 9 }, // Attaquant
            { x: 60, y: 50, number: 10 },
            { x: 60, y: 65, number: 11 }
        ];
        
        // Formation 4-4-2 pour l'équipe extérieure
        const awayFormation = [
            { x: 90, y: 50, number: 1 },
            { x: 75, y: 25, number: 2 },
            { x: 75, y: 40, number: 3 },
            { x: 75, y: 60, number: 4 },
            { x: 75, y: 75, number: 5 },
            { x: 60, y: 20, number: 6 },
            { x: 60, y: 40, number: 7 },
            { x: 60, y: 60, number: 8 },
            { x: 60, y: 80, number: 9 },
            { x: 80, y: 40, number: 10 },
            { x: 80, y: 60, number: 11 }
        ];
        
        // Créer les joueurs domicile
        homeFormation.forEach(player => {
            const playerElement = document.createElement('div');
            playerElement.className = 'player-home cursor-pointer';
            playerElement.style.left = `${player.x}%`;
            playerElement.style.top = `${player.y}%`;
            playerElement.textContent = player.number;
            playerElement.title = `Joueur ${player.number}`;
            
            playerElement.addEventListener('click', () => this.selectPlayer(player, 'home'));
            container.appendChild(playerElement);
            
            this.fieldPlayers.home.push({ element: playerElement, ...player });
        });
        
        // Créer les joueurs extérieur
        awayFormation.forEach(player => {
            const playerElement = document.createElement('div');
            playerElement.className = 'player-away cursor-pointer';
            playerElement.style.left = `${player.x}%`;
            playerElement.style.top = `${player.y}%`;
            playerElement.textContent = player.number;
            playerElement.title = `Joueur ${player.number}`;
            
            playerElement.addEventListener('click', () => this.selectPlayer(player, 'away'));
            container.appendChild(playerElement);
            
            this.fieldPlayers.away.push({ element: playerElement, ...player });
        });
    }

    createBall(container) {
        const ball = document.createElement('div');
        ball.className = 'ball cursor-pointer animate-ball-bounce';
        ball.style.left = `${this.fieldPlayers.ball.x}%`;
        ball.style.top = `${this.fieldPlayers.ball.y}%`;
        ball.innerHTML = '<i class="fas fa-futbol"></i>';
        ball.title = 'Ballon';
        
        ball.addEventListener('click', () => this.selectBall());
        container.appendChild(ball);
        
        this.fieldPlayers.ball.element = ball;
    }

    selectPlayer(player, team) {
        this.showNotification(`Joueur ${player.number} (${team === 'home' ? 'Domicile' : 'Extérieur'}) sélectionné`, 'info');
        
        // Mettre en surbrillance le joueur sélectionné
        document.querySelectorAll('.player-home, .player-away').forEach(p => {
            p.classList.remove('selected-pulse');
        });
        
        const playerElement = [...this.fieldPlayers.home, ...this.fieldPlayers.away]
            .find(p => p.number === player.number && p.x === player.x && p.y === player.y)?.element;
        
        if (playerElement) {
            playerElement.classList.add('selected-pulse');
        }
    }

    selectBall() {
        this.showNotification('Ballon sélectionné', 'info');
        this.fieldPlayers.ball.element.classList.add('selected-pulse');
    }

    // ============================================
    // STATISTIQUES ET GRAPHIQUES
    // ============================================

    initCharts() {
        // Chart.js doit être chargé
        if (typeof Chart === 'undefined') {
            console.warn('Chart.js non chargé');
            return;
        }
        
        this.createSeasonPerformanceChart();
        this.createDistanceChart();
        this.createHeatmapChart();
        this.createMatchRhythmChart();
    }

    createSeasonPerformanceChart() {
        const ctx = document.getElementById('season-performance-chart');
        if (!ctx) return;
        
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['J1', 'J2', 'J3', 'J4', 'J5', 'J6', 'J7', 'J8', 'J9', 'J10'],
                datasets: [
                    {
                        label: 'Buts marqués',
                        data: [2, 3, 1, 2, 4, 3, 2, 1, 3, 2],
                        borderColor: '#10B981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: 'Buts encaissés',
                        data: [1, 0, 2, 1, 1, 2, 0, 1, 2, 1],
                        borderColor: '#EF4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { color: '#9CA3AF' }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { color: '#9CA3AF' }
                    },
                    x: {
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { color: '#9CA3AF' }
                    }
                }
            }
        });
    }

    createDistanceChart() {
        const ctx = document.getElementById('distance-chart');
        if (!ctx) return;
        
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Messi', 'Ronaldo', 'Mbappé', 'Neymar', 'De Bruyne', 'Salah'],
                datasets: [{
                    label: 'Distance (km)',
                    data: [12.5, 11.8, 13.2, 10.9, 12.1, 11.5],
                    backgroundColor: [
                        'rgba(59, 130, 246, 0.7)',
                        'rgba(239, 68, 68, 0.7)',
                        'rgba(245, 158, 11, 0.7)',
                        'rgba(34, 197, 94, 0.7)',
                        'rgba(139, 92, 246, 0.7)',
                        'rgba(14, 165, 233, 0.7)'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { color: '#9CA3AF' }
                    },
                    x: {
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { color: '#9CA3AF' }
                    }
                }
            }
        });
    }

    // ============================================
    // ADMINISTRATION
    // ============================================

    initAdminPanel() {
        if (!this.isAdmin) return;
        
        this.loadAdminStats();
        this.loadAdminUsers();
        this.loadAdminAnalyses();
        this.loadAdminDesigns();
        
        // Gérer les onglets admin
        document.querySelectorAll('#admin-tab-users, #admin-tab-analyses, #admin-tab-designs, #admin-tab-deepseek')
            .forEach(tab => {
                tab.addEventListener('click', (e) => {
                    const tabId = e.target.id.replace('admin-tab-', '');
                    this.switchAdminTab(tabId);
                });
            });
    }

    switchAdminTab(tab) {
        // Cacher tous les contenus
        ['users', 'analyses', 'designs', 'deepseek'].forEach(t => {
            const content = document.getElementById(`admin-${t}-content`);
            if (content) content.classList.add('hidden');
        });
        
        // Afficher le contenu sélectionné
        const content = document.getElementById(`admin-${tab}-content`);
        if (content) content.classList.remove('hidden');
    }

    loadAdminStats() {
        // Statistiques simulées
        const stats = {
            totalUsers: 142,
            activeUsers: 89,
            newUsers: 12,
            totalAnalyses: 1250,
            todayAnalyses: 24,
            successRate: 94,
            totalDesigns: 589,
            todayDesigns: 8,
            popularDesign: 'Classique',
            storageUsed: '24.5 GB',
            storagePercent: 49,
            storageAvailable: '25.5 GB'
        };
        
        // Mettre à jour l'interface
        Object.keys(stats).forEach(key => {
            const element = document.getElementById(`admin-${key}`);
            if (element) element.textContent = stats[key];
        });
    }

    // ============================================
    // DONNÉES ET CHARGEMENT
    // ============================================

    async loadRecentAnalyses() {
        const container = document.getElementById('recent-analyses');
        if (!container) return;
        
        // Analyses simulées
        const analyses = [
            { id: 1, title: 'Finale Champions League', date: '2024-05-15', formation: '4-3-3', confidence: 96 },
            { id: 2, title: 'Classico Espagnol', date: '2024-05-10', formation: '4-4-2', confidence: 92 },
            { id: 3, title: 'Derby Manchester', date: '2024-05-08', formation: '3-5-2', confidence: 88 }
        ];
        
        container.innerHTML = '';
        
        analyses.forEach(analysis => {
            const card = document.createElement('div');
            card.className = 'card interactive-card';
            card.innerHTML = `
                <div class="flex items-center justify-between mb-4">
                    <div class="text-sm text-gray-400">${analysis.date}</div>
                    <span class="badge-primary">${analysis.confidence}%</span>
                </div>
                <h4 class="font-bold mb-2">${analysis.title}</h4>
                <p class="text-gray-400 text-sm mb-4">Formation: ${analysis.formation}</p>
                <div class="flex items-center text-green-400 text-sm">
                    <i class="fas fa-chart-line mr-2"></i>
                    <span>Voir l'analyse</span>
                </div>
            `;
            container.appendChild(card);
        });
    }

    async loadDesignGallery() {
        const container = document.getElementById('design-gallery');
        if (!container) return;
        
        // Designs simulés
        const designs = [
            { id: 1, name: 'Forêt Émeraude', colors: ['#1a5c36', '#8B4513'], likes: 142 },
            { id: 2, name: 'Crévette Marine', colors: ['#FF6347', '#20B2AA'], likes: 89 },
            { id: 3, name: 'Marron Classique', colors: ['#8B4513', '#000000'], likes: 76 },
            { id: 4, name: 'Vert Lime', colors: ['#228B22', '#8B4513'], likes: 65 }
        ];
        
        container.innerHTML = '';
        
        designs.forEach(design => {
            const card = document.createElement('div');
            card.className = 'card interactive-card';
            card.innerHTML = `
                <div class="h-40 rounded-lg mb-4" 
                     style="background: linear-gradient(135deg, ${design.colors[0]} 50%, ${design.colors[1]} 50%)">
                </div>
                <h4 class="font-bold mb-2">${design.name}</h4>
                <div class="flex justify-between items-center">
                    <div class="flex space-x-1">
                        ${design.colors.map(color => `
                            <div class="w-4 h-4 rounded-full" style="background: ${color}"></div>
                        `).join('')}
                    </div>
                    <div class="flex items-center text-gray-400 text-sm">
                        <i class="fas fa-heart mr-1"></i>
                        <span>${design.likes}</span>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    }

    async loadPlayerStats() {
        const container = document.getElementById('player-stats-table');
        if (!container) return;
        
        // Joueurs simulés
        const players = [
            { name: 'L. Messi', position: 'ATQ', matches: 10, goals: 8, assists: 6, distance: 105.2, accuracy: 89, rating: 9.2 },
            { name: 'K. Mbappé', position: 'ATQ', matches: 10, goals: 7, assists: 5, distance: 112.5, accuracy: 85, rating: 8.8 },
            { name: 'K. De Bruyne', position: 'MIL', matches: 9, goals: 3, assists: 9, distance: 108.7, accuracy: 92, rating: 9.0 },
            { name: 'V. van Dijk', position: 'DEF', matches: 10, goals: 1, assists: 2, distance: 98.4, accuracy: 94, rating: 8.5 },
            { name: 'T. Courtois', position: 'GAR', matches: 10, goals: 0, assists: 0, distance: 45.2, accuracy: 88, rating: 8.7 }
        ];
        
        container.innerHTML = '';
        
        players.forEach(player => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="font-medium">${player.name}</td>
                <td>${player.position}</td>
                <td>${player.matches}</td>
                <td class="font-bold">${player.goals}</td>
                <td>${player.assists}</td>
                <td>${player.distance}</td>
                <td>
                    <div class="flex items-center">
                        <div class="w-16 h-2 bg-gray-700 rounded-full mr-2">
                            <div class="h-full rounded-full bg-green-500" style="width: ${player.accuracy}%"></div>
                        </div>
                        <span>${player.accuracy}%</span>
                    </div>
                </td>
                <td class="font-bold text-yellow-400">${player.rating}</td>
            `;
            container.appendChild(row);
        });
    }

    // ============================================
    // ANIMATIONS ET EFFETS VISUELS
    // ============================================

    initAnimations() {
        // Animation des compteurs
        this.initCounters();
        
        // Animation des particules
        this.createParticles();
        
        // Animation des données en direct
        this.startLiveDataAnimation();
    }

    initCounters() {
        const counters = document.querySelectorAll('.live-counter');
        counters.forEach(counter => {
            const target = parseFloat(counter.getAttribute('data-target'));
            const increment = target / 100;
            let current = 0;
            
            const timer = setInterval(() => {
                current += increment;
                if (current >= target) {
                    counter.textContent = target % 1 === 0 ? target : target.toFixed(1);
                    clearInterval(timer);
                } else {
                    counter.textContent = current % 1 === 0 ? Math.floor(current) : current.toFixed(1);
                }
            }, 30);
        });
    }

    createParticles() {
        const container = document.getElementById('particles');
        if (!container) return;
        
        for (let i = 0; i < 20; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            
            // Position aléatoire
            const left = Math.random() * 100;
            const top = Math.random() * 100;
            
            // Taille aléatoire
            const size = Math.random() * 4 + 1;
            
            // Couleur aléatoire (dans le thème)
            const colors = ['#1a5c36', '#8B4513', '#FF4500', '#228B22', '#20B2AA'];
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            // Animation aléatoire
            const duration = Math.random() * 20 + 10;
            const delay = Math.random() * 5;
            
            particle.style.cssText = `
                width: ${size}px;
                height: ${size}px;
                background: ${color};
                left: ${left}%;
                top: ${top}%;
                animation-duration: ${duration}s;
                animation-delay: ${delay}s;
                opacity: ${Math.random() * 0.3 + 0.1};
            `;
            
            container.appendChild(particle);
        }
    }

    startLiveDataAnimation() {
        // Animer les statistiques en direct
        setInterval(() => {
            this.updateLiveStats();
        }, 3000);
    }

    updateLiveStats() {
        // Mettre à jour les statistiques en direct avec des valeurs aléatoires
        const stats = {
            possession: 58 + Math.random() * 8,
            shots: 10 + Math.floor(Math.random() * 6),
            shotsOn: 6 + Math.floor(Math.random() * 4),
            shotsOff: 4 + Math.floor(Math.random() * 3),
            passes: 480 + Math.floor(Math.random() * 80),
            passAccuracy: 82 + Math.random() * 8,
            foulsHome: 5 + Math.floor(Math.random() * 4),
            foulsAway: 4 + Math.floor(Math.random() * 3)
        };
        
        // Mettre à jour l'interface
        const elements = {
            'live-possession': Math.round(stats.possession),
            'possession-home': Math.round(stats.possession) + '%',
            'possession-away': (100 - Math.round(stats.possession)) + '%',
            'possession-bar-home': (stats.possession * 0.32) + 'px',
            'possession-bar-away': ((100 - stats.possession) * 0.32) + 'px',
            'live-shots': stats.shots,
            'shots-on': stats.shotsOn,
            'shots-off': stats.shotsOff,
            'shots-bar-on': (stats.shotsOn / stats.shots * 40) + 'px',
            'shots-bar-off': (stats.shotsOff / stats.shots * 40) + 'px',
            'live-passes': stats.passes,
            'pass-accuracy': Math.round(stats.passAccuracy),
            'passes-bar-success': (stats.passAccuracy * 0.28) + 'px',
            'passes-bar-failed': ((100 - stats.passAccuracy) * 0.28) + 'px',
            'live-fouls': stats.foulsHome + stats.foulsAway,
            'fouls-home': stats.foulsHome,
            'fouls-away': stats.foulsAway,
            'fouls-bar-home': (stats.foulsHome * 20) + 'px',
            'fouls-bar-away': (stats.foulsAway * 20) + 'px'
        };
        
        Object.keys(elements).forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                if (id.includes('bar')) {
                    element.style.width = elements[id];
                } else {
                    element.textContent = elements[id];
                }
            }
        });
    }

    // ============================================
    // GESTION DES ÉVÉNEMENTS
    // ============================================

    initEventListeners() {
        // Navigation
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = anchor.getAttribute('href').substring(1);
                const target = document.getElementById(targetId);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });
        
        // Menu mobile
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener('click', () => {
                const menu = document.getElementById('mobile-menu');
                menu.classList.toggle('hidden');
                mobileMenuBtn.innerHTML = menu.classList.contains('hidden') 
                    ? '<i class="fas fa-bars"></i>' 
                    : '<i class="fas fa-times"></i>';
            });
        }
        
        // Dropdown utilisateur
        const userMenuBtn = document.getElementById('user-menu-btn');
        if (userMenuBtn) {
            userMenuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const dropdown = document.getElementById('user-dropdown');
                dropdown.classList.toggle('hidden');
            });
            
            // Fermer le dropdown en cliquant ailleurs
            document.addEventListener('click', () => {
                const dropdown = document.getElementById('user-dropdown');
                if (!dropdown.classList.contains('hidden')) {
                    dropdown.classList.add('hidden');
                }
            });
        }
        
        // Gestion des fichiers
        const fileInput = document.getElementById('file-input');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }
        
        const uploadZone = document.getElementById('upload-zone');
        if (uploadZone) {
            uploadZone.addEventListener('click', () => fileInput.click());
            uploadZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadZone.classList.add('border-green-500');
            });
            uploadZone.addEventListener('dragleave', () => {
                uploadZone.classList.remove('border-green-500');
            });
            uploadZone.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadZone.classList.remove('border-green-500');
                if (e.dataTransfer.files.length) {
                    this.handleFileSelect({ target: { files: e.dataTransfer.files } });
                }
            });
        }
        
        // Onglets d'upload
        const tabs = ['upload', 'live', 'camera', 'deepseek'];
        tabs.forEach(tab => {
            const tabBtn = document.getElementById(`tab-${tab}`);
            if (tabBtn) {
                tabBtn.addEventListener('click', () => {
                    tabs.forEach(t => {
                        document.getElementById(`tab-${t}`).classList.remove('active');
                        document.getElementById(`${t}-content`).classList.add('hidden');
                    });
                    tabBtn.classList.add('active');
                    document.getElementById(`${tab}-content`).classList.remove('hidden');
                });
            }
        });
        
        // Caméra
        const startCameraBtn = document.querySelector('[onclick="startCamera()"]');
        if (startCameraBtn) {
            startCameraBtn.addEventListener('click', () => this.startCamera());
        }
        
        // DeepSeek
        const deepSeekBtn = document.querySelector('[onclick="startDeepSeekAnalysis()"]');
        if (deepSeekBtn) {
            deepSeekBtn.addEventListener('click', () => this.startDeepSeekAnalysis());
        }
        
        // Formulaire de contact
        const contactForm = document.getElementById('contact-form');
        if (contactForm) {
            contactForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.showNotification('Message envoyé avec succès!', 'success');
                contactForm.reset();
            });
        }
    }

    handleFileSelect(event) {
        const files = event.target.files;
        const fileList = document.getElementById('file-list');
        const fileItems = document.getElementById('file-items');
        
        if (files.length > 0) {
            fileList.classList.remove('hidden');
            fileItems.innerHTML = '';
            
            Array.from(files).forEach((file, index) => {
                const item = document.createElement('div');
                item.className = 'card flex items-center justify-between';
                item.innerHTML = `
                    <div class="flex items-center space-x-3">
                        <i class="fas fa-file ${file.type.startsWith('image/') ? 'text-green-400' : 'text-blue-400'}"></i>
                        <div>
                            <div class="font-medium">${file.name}</div>
                            <div class="text-xs text-gray-500">${(file.size / 1024 / 1024).toFixed(2)} MB</div>
                        </div>
                    </div>
                    <button onclick="this.parentElement.remove()" class="text-red-400 hover:text-red-300">
                        <i class="fas fa-times"></i>
                    </button>
                `;
                fileItems.appendChild(item);
            });
            
            // Démarrer l'analyse
            this.analyzeFile(files[0]);
        }
    }

    // ============================================
    // FONCTIONS PUBLIQUES
    // ============================================

    openLoginModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-2xl font-bold">Connexion</h3>
                    <button onclick="this.closest('.modal-overlay').remove()" 
                            class="text-gray-400 hover:text-white text-2xl">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <form id="modal-login-form" class="space-y-6">
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Email</label>
                        <input type="email" required class="styled-input" placeholder="votre@email.com" 
                               value="${this.currentUser?.email || 'demo@tactiball.com'}">
                    </div>
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Mot de passe</label>
                        <input type="password" required class="styled-input" placeholder="Votre mot de passe" 
                               value="password123">
                    </div>
                    <div class="flex items-center justify-between">
                        <div class="flex items-center">
                            <input type="checkbox" id="remember-me" class="mr-2 w-5 h-5 rounded border-gray-700 bg-gray-800 text-green-600">
                            <label for="remember-me" class="text-sm text-gray-400">Se souvenir de moi</label>
                        </div>
                        <a href="#" class="text-sm text-green-400 hover:text-green-300">Mot de passe oublié?</a>
                    </div>
                    <button type="submit" class="btn-primary w-full">
                        <i class="fas fa-sign-in-alt mr-2"></i>Se connecter
                    </button>
                    <div class="text-center text-gray-400 mt-4">
                        Pas encore de compte? <a href="#" class="text-green-400 hover:text-green-300">S'inscrire</a>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Gérer la soumission
        modal.querySelector('#modal-login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = modal.querySelector('input[type="email"]').value;
            const password = modal.querySelector('input[type="password"]').value;
            
            const result = await this.login(email, password);
            if (result.success) {
                modal.remove();
            }
        });
    }

    startCamera() {
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(stream => {
                const preview = document.getElementById('camera-preview');
                const feed = document.getElementById('camera-feed');
                
                feed.srcObject = stream;
                preview.classList.remove('hidden');
                
                this.showNotification('Caméra activée', 'success');
            })
            .catch(error => {
                this.showNotification('Erreur d\'accès à la caméra: ' + error.message, 'error');
            });
    }

    async startDeepSeekAnalysis() {
        this.showNotification('Lancement de l\'analyse DeepSeek IA...', 'info');
        
        const loadingDiv = document.getElementById('deepseek-loading');
        const previewArea = document.getElementById('preview-area');
        
        if (loadingDiv) loadingDiv.classList.remove('hidden');
        if (previewArea) {
            previewArea.innerHTML = `
                <div class="text-center py-8">
                    <div class="loader mx-auto mb-6" style="border-top-color: #007AFF;"></div>
                    <p class="text-gray-400 text-lg mb-2">Analyse DeepSeek en cours...</p>
                    <p class="text-sm text-gray-600">Notre IA DeepSeek analyse le contenu, veuillez patienter</p>
                </div>
            `;
        }
        
        // Simulation d'analyse
        setTimeout(async () => {
            if (loadingDiv) loadingDiv.classList.add('hidden');
            
            const mockAnalysis = await this.analyzeFile({ name: 'deepseek_analysis.jpg' });
            this.displayAnalysisResults(mockAnalysis);
            
            this.showNotification('Analyse DeepSeek terminée avec succès!', 'success');
        }, 3000);
    }

    // ============================================
    // FONCTIONS UTILITAIRES
    // ============================================

    scrollToSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            section.scrollIntoView({ behavior: 'smooth' });
        }
    }

    refreshLiveStats() {
        this.updateLiveStats();
        this.showNotification('Statistiques actualisées', 'success');
    }

    exportAnalysisResults() {
        if (!this.currentAnalysis) {
            this.showNotification('Aucune analyse à exporter', 'warning');
            return;
        }
        
        const data = JSON.stringify(this.currentAnalysis, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analyse-tactiball-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showNotification('Analyse exportée avec succès!', 'success');
    }
}

// ============================================
// INITIALISATION DE L'APPLICATION
// ============================================

let tactiBallApp;

document.addEventListener('DOMContentLoaded', () => {
    tactiBallApp = new TactiBallApp();
    
    // Exposer les fonctions globales
    window.openLoginModal = () => tactiBallApp.openLoginModal();
    window.logout = () => tactiBallApp.logout();
    window.scrollToSection = (sectionId) => tactiBallApp.scrollToSection(sectionId);
    window.startDeepSeekAnalysis = () => tactiBallApp.startDeepSeekAnalysis();
    window.startLiveDemo = () => tactiBallApp.scrollToSection('upload');
    window.applyColorsToDesigner = () => {
        if (tactiBallApp.currentAnalysis?.colors) {
            tactiBallApp.jerseyDesign.primaryColor = tactiBallApp.currentAnalysis.colors[0];
            tactiBallApp.jerseyDesign.secondaryColor = tactiBallApp.currentAnalysis.colors[1];
            tactiBallApp.jerseyDesign.accentColor = tactiBallApp.currentAnalysis.colors[2];
            
            tactiBallApp.updateJerseyPreview();
            tactiBallApp.scrollToSection('designer');
            tactiBallApp.showNotification('Couleurs appliquées au designer!', 'success');
        }
    };
    
    console.log('🎯 BENY-JOE TACTI-BALL PRO ULTRA - Prêt!');
});