// auth.js - Gestion de l'authentification côté client

class AuthManager {
    constructor() {
        this.token = localStorage.getItem('auth_token');
        this.user = JSON.parse(localStorage.getItem('auth_user')) || null;
        this.init();
    }
    
    init() {
        this.updateUI();
        this.setupEventListeners();
    }
    
    async login(email, password) {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (data.ok) {
                this.token = data.token;
                this.user = data.user;
                
                localStorage.setItem('auth_token', this.token);
                localStorage.setItem('auth_user', JSON.stringify(this.user));
                
                this.updateUI();
                window.showNotification('Connexion réussie !', 'success');
                return true;
            } else {
                window.showNotification(data.error || 'Erreur de connexion', 'error');
                return false;
            }
        } catch (error) {
            console.error('Erreur de connexion:', error);
            window.showNotification('Erreur de connexion', 'error');
            return false;
        }
    }
    
    async register(name, email, password) {
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });
            
            const data = await response.json();
            
            if (data.ok) {
                this.token = data.token;
                this.user = data.user;
                
                localStorage.setItem('auth_token', this.token);
                localStorage.setItem('auth_user', JSON.stringify(this.user));
                
                this.updateUI();
                window.showNotification('Inscription réussie !', 'success');
                return true;
            } else {
                window.showNotification(data.error || 'Erreur d\'inscription', 'error');
                return false;
            }
        } catch (error) {
            console.error('Erreur d\'inscription:', error);
            window.showNotification('Erreur d\'inscription', 'error');
            return false;
        }
    }
    
    logout() {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        this.token = null;
        this.user = null;
        
        this.updateUI();
        window.showNotification('Déconnexion réussie', 'info');
    }
    
    updateUI() {
        const loginBtn = document.getElementById('login-btn');
        const mobileLoginBtn = document.getElementById('mobile-login-btn');
        const userMenuBtn = document.getElementById('user-menu-btn');
        const userDropdown = document.getElementById('user-dropdown');
        const mobileUserMenu = document.getElementById('mobile-user-menu');
        
        if (this.user) {
            // Cacher les boutons de connexion
            if (loginBtn) loginBtn.style.display = 'none';
            if (mobileLoginBtn) mobileLoginBtn.style.display = 'none';
            
            // Afficher le menu utilisateur
            if (userMenuBtn) {
                userMenuBtn.style.display = 'flex';
                document.getElementById('user-name').textContent = this.user.name;
                document.getElementById('user-initials').textContent = this.getInitials(this.user.name);
            }
            
            // Afficher le menu mobile utilisateur
            if (mobileUserMenu) {
                mobileUserMenu.style.display = 'block';
                document.getElementById('mobile-user-name').textContent = this.user.name;
                document.getElementById('mobile-user-email').textContent = this.user.email;
                document.getElementById('mobile-user-initials').textContent = this.getInitials(this.user.name);
            }
            
            // Afficher l'accès admin si nécessaire
            if (this.user.role === 'ADMIN') {
                const adminNav = document.getElementById('admin-nav');
                const adminNavMobile = document.getElementById('admin-nav-mobile');
                const adminSection = document.getElementById('admin');
                
                if (adminNav) adminNav.style.display = 'flex';
                if (adminNavMobile) adminNavMobile.style.display = 'flex';
                if (adminSection) adminSection.style.display = 'block';
            }
        } else {
            // Afficher les boutons de connexion
            if (loginBtn) loginBtn.style.display = 'block';
            if (mobileLoginBtn) mobileLoginBtn.style.display = 'block';
            
            // Cacher le menu utilisateur
            if (userMenuBtn) userMenuBtn.style.display = 'none';
            if (userDropdown) userDropdown.classList.add('hidden');
            if (mobileUserMenu) mobileUserMenu.style.display = 'none';
        }
    }
    
    getInitials(name) {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    }
    
    setupEventListeners() {
        // Menu utilisateur desktop
        const userMenuBtn = document.getElementById('user-menu-btn');
        const userDropdown = document.getElementById('user-dropdown');
        
        if (userMenuBtn && userDropdown) {
            userMenuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                userDropdown.classList.toggle('hidden');
            });
            
            document.addEventListener('click', () => {
                userDropdown.classList.add('hidden');
            });
        }
        
        // Menu mobile
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        const mobileMenu = document.getElementById('mobile-menu');
        
        if (mobileMenuBtn && mobileMenu) {
            mobileMenuBtn.addEventListener('click', () => {
                mobileMenu.classList.toggle('hidden');
            });
        }
    }
    
    getAuthHeader() {
        return this.token ? { 'Authorization': `Bearer ${this.token}` } : {};
    }
    
    async fetchWithAuth(url, options = {}) {
        const headers = {
            ...options.headers,
            ...this.getAuthHeader(),
            'Content-Type': 'application/json'
        };
        
        return fetch(url, { ...options, headers });
    }
}

// Initialiser le gestionnaire d'authentification
window.authManager = new AuthManager();

// Fonctions globales
window.openLoginModal = function() {
    const modal = `
        <div class="modal-overlay" id="login-modal">
            <div class="modal-content">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-2xl font-bold">Connexion</h3>
                    <button onclick="closeModal()" class="text-gray-400 hover:text-white">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <form id="login-form" class="space-y-6">
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Email</label>
                        <input type="email" id="login-email" class="styled-input" placeholder="votre@email.com" required>
                    </div>
                    
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Mot de passe</label>
                        <input type="password" id="login-password" class="styled-input" placeholder="••••••••" required>
                    </div>
                    
                    <div class="flex items-center justify-between">
                        <div class="flex items-center">
                            <input type="checkbox" id="remember-me" class="mr-2">
                            <label for="remember-me" class="text-sm text-gray-400">Se souvenir de moi</label>
                        </div>
                        <a href="#" class="text-sm text-green-400 hover:text-green-300">Mot de passe oublié?</a>
                    </div>
                    
                    <button type="submit" class="btn-primary w-full">
                        <i class="fas fa-sign-in-alt mr-2"></i>Se connecter
                    </button>
                </form>
                
                <div class="mt-6 text-center">
                    <p class="text-gray-400">Pas encore de compte?</p>
                    <button onclick="openRegisterModal()" class="text-green-400 hover:text-green-300 font-medium mt-2">
                        S'inscrire gratuitement
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('modal-container').innerHTML = modal;
    
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        const success = await authManager.login(email, password);
        if (success) {
            closeModal();
        }
    });
};

window.openRegisterModal = function() {
    const modal = `
        <div class="modal-overlay" id="register-modal">
            <div class="modal-content">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-2xl font-bold">Inscription</h3>
                    <button onclick="closeModal()" class="text-gray-400 hover:text-white">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <form id="register-form" class="space-y-6">
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Nom complet</label>
                        <input type="text" id="register-name" class="styled-input" placeholder="John Doe" required>
                    </div>
                    
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Email</label>
                        <input type="email" id="register-email" class="styled-input" placeholder="votre@email.com" required>
                    </div>
                    
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Mot de passe</label>
                        <input type="password" id="register-password" class="styled-input" placeholder="••••••••" required>
                    </div>
                    
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Confirmer le mot de passe</label>
                        <input type="password" id="register-confirm" class="styled-input" placeholder="••••••••" required>
                    </div>
                    
                    <div class="flex items-center">
                        <input type="checkbox" id="terms" class="mr-2" required>
                        <label for="terms" class="text-sm text-gray-400">
                            J'accepte les <a href="#" class="text-green-400 hover:text-green-300">conditions d'utilisation</a>
                        </label>
                    </div>
                    
                    <button type="submit" class="btn-primary w-full">
                        <i class="fas fa-user-plus mr-2"></i>S'inscrire
                    </button>
                </form>
                
                <div class="mt-6 text-center">
                    <p class="text-gray-400">Déjà un compte?</p>
                    <button onclick="openLoginModal()" class="text-green-400 hover:text-green-300 font-medium mt-2">
                        Se connecter
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('modal-container').innerHTML = modal;
    
    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const confirm = document.getElementById('register-confirm').value;
        
        if (password !== confirm) {
            window.showNotification('Les mots de passe ne correspondent pas', 'error');
            return;
        }
        
        const success = await authManager.register(name, email, password);
        if (success) {
            closeModal();
        }
    });
};

window.closeModal = function() {
    document.getElementById('modal-container').innerHTML = '';
};

window.showProfileModal = function() {
    if (!authManager.user) {
        openLoginModal();
        return;
    }
    
    const modal = `
        <div class="modal-overlay">
            <div class="modal-content">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-2xl font-bold">Mon Profil</h3>
                    <button onclick="closeModal()" class="text-gray-400 hover:text-white">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="space-y-6">
                    <div class="flex items-center space-x-4">
                        <div class="w-20 h-20 rounded-full bg-gradient-to-br from-green-700 to-teal-700 flex items-center justify-center text-2xl font-bold">
                            ${authManager.getInitials(authManager.user.name)}
                        </div>
                        <div>
                            <h4 class="text-xl font-bold">${authManager.user.name}</h4>
                            <p class="text-gray-400">${authManager.user.email}</p>
                            <p class="text-sm text-gray-500">Membre depuis ${new Date(authManager.user.createdAt).toLocaleDateString()}</p>
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-4">
                        <div class="stats-card">
                            <div class="text-2xl font-bold text-green-400">${authManager.user.role}</div>
                            <div class="text-gray-300">Rôle</div>
                        </div>
                        <div class="stats-card">
                            <div class="text-2xl font-bold text-blue-400">${authManager.user.lastLogin ? new Date(authManager.user.lastLogin).toLocaleDateString() : 'Jamais'}</div>
                            <div class="text-gray-300">Dernière connexion</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('modal-container').innerHTML = modal;
};

window.logout = function() {
    if (confirm('Êtes-vous sûr de vouloir vous déconnecter?')) {
        authManager.logout();
    }
};

// Remplacer la fonction startFreeTrial pour rediriger vers l'inscription
window.startFreeTrial = function() {
    openRegisterModal();
};