/**
 * Configuration API pour BENY-JOE TACTI-BALL
 * Variables d'environnement et endpoints
 */

const API_CONFIG = {
    // URLs de base
    BASE_URL: window.location.origin,
    API_BASE: '/api',
    
    // Endpoints
    ENDPOINTS: {
        // Authentification
        LOGIN: '/auth/login',
        REGISTER: '/auth/register',
        LOGOUT: '/auth/logout',
        REFRESH_TOKEN: '/auth/refresh',
        
        // Analyse
        UPLOAD: '/analyze/upload',
        ANALYZE: '/analyze/process',
        ANALYZE_LIVE: '/analyze/live',
        GET_ANALYSIS: '/analyze/:id',
        GET_RECENT: '/analyze/recent',
        
        // DeepSeek IA
        DEEPSEEK_ANALYZE: '/deepseek/analyze',
        DEEPSEEK_CHAT: '/deepseek/chat',
        DEEPSEEK_VISION: '/deepseek/vision',
        DEEPSEEK_STATUS: '/deepseek/status',
        
        // Designs
        SAVE_DESIGN: '/designs/save',
        GET_DESIGNS: '/designs',
        GET_DESIGN: '/designs/:id',
        DELETE_DESIGN: '/designs/:id',
        EXPORT_DESIGN: '/designs/:id/export',
        
        // Statistiques
        GET_STATS: '/stats',
        GET_LIVE_STATS: '/stats/live',
        GET_PLAYER_STATS: '/stats/players',
        GET_TEAM_STATS: '/stats/teams',
        EXPORT_STATS: '/stats/export',
        
        // Administration
        ADMIN_USERS: '/admin/users',
        ADMIN_ANALYSES: '/admin/analyses',
        ADMIN_DESIGNS: '/admin/designs',
        ADMIN_STATS: '/admin/stats',
        ADMIN_SETTINGS: '/admin/settings'
    },
    
    // Configuration DeepSeek
    DEEPSEEK: {
        API_KEY: 'sk-demo-deepseek-api-key',
        BASE_URL: 'https://api.deepseek.com',
        MODELS: {
            CHAT: 'deepseek-chat',
            VISION: 'deepseek-vision',
            CODER: 'deepseek-coder'
        },
        RATE_LIMIT: 1000, // Requêtes par jour
        TIMEOUT: 30000 // 30 secondes
    },
    
    // Configuration upload
    UPLOAD: {
        MAX_SIZE: 100 * 1024 * 1024, // 100MB
        ALLOWED_TYPES: [
            'image/jpeg',
            'image/png',
            'image/webp',
            'video/mp4',
            'video/webm'
        ],
        CHUNK_SIZE: 5 * 1024 * 1024 // 5MB
    },
    
    // Configuration stockage
    STORAGE: {
        USER_DATA: 'tactiball_user',
        USER_SETTINGS: 'tactiball_settings',
        RECENT_ANALYSES: 'tactiball_recent',
        SAVED_DESIGNS: 'tactiball_designs',
        CACHE_PREFIX: 'tactiball_cache_',
        CACHE_DURATION: 3600000 // 1 heure
    },
    
    // Paramètres d'application
    APP: {
        VERSION: '2.0.0',
        NAME: 'BENY-JOE TACTI-BALL PRO ULTRA',
        AUTHOR: 'KHEDIM BENYAKHLEF (BENY-JOE)',
        CONTACT_EMAILS: [
            'khedimbenyakhlef@gmail.com',
            'khe.bonde@gmail.com'
        ],
        SUPPORT_PHONES: [
            '+213 554 37 73 95',
            '+213 796 61 85 65'
        ]
    },
    
    // Configuration UI
    UI: {
        THEME: {
            PRIMARY: '#1a5c36',
            SECONDARY: '#8B4513',
            ACCENT: '#FF4500',
            DARK: '#0A1A0A',
            DARKER: '#050A05'
        },
        ANIMATIONS: {
            ENABLED: true,
            DURATION: 300,
            EASING: 'cubic-bezier(0.4, 0, 0.2, 1)'
        },
        NOTIFICATIONS: {
            TIMEOUT: 5000,
            MAX_VISIBLE: 3
        }
    },
    
    // Configuration performance
    PERFORMANCE: {
        DEBOUNCE_DELAY: 300,
        THROTTLE_DELAY: 1000,
        LAZY_LOAD_OFFSET: 200,
        IMAGE_QUALITY: 0.8
    }
};

// Export pour les navigateurs
if (typeof window !== 'undefined') {
    window.API_CONFIG = API_CONFIG;
}

// Export pour modules ES6
export default API_CONFIG;

// Fonctions utilitaires
export const getApiUrl = (endpoint, params = {}) => {
    let url = `${API_CONFIG.API_BASE}${endpoint}`;
    
    // Remplacer les paramètres dans l'URL
    Object.keys(params).forEach(key => {
        url = url.replace(`:${key}`, encodeURIComponent(params[key]));
    });
    
    return url;
};

export const getDeepSeekHeaders = () => ({
    'Authorization': `Bearer ${API_CONFIG.DEEPSEEK.API_KEY}`,
    'Content-Type': 'application/json'
});

export const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
    };
};

// Validation des fichiers
export const validateFile = (file) => {
    const errors = [];
    
    if (file.size > API_CONFIG.UPLOAD.MAX_SIZE) {
        errors.push(`Fichier trop volumineux (max: ${API_CONFIG.UPLOAD.MAX_SIZE / 1024 / 1024}MB)`);
    }
    
    if (!API_CONFIG.UPLOAD.ALLOWED_TYPES.includes(file.type)) {
        errors.push('Type de fichier non supporté');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
};

// Gestion du cache
export const cacheManager = {
    set(key, data, duration = API_CONFIG.STORAGE.CACHE_DURATION) {
        const item = {
            data,
            expiry: Date.now() + duration
        };
        localStorage.setItem(`${API_CONFIG.STORAGE.CACHE_PREFIX}${key}`, JSON.stringify(item));
    },
    
    get(key) {
        const item = localStorage.getItem(`${API_CONFIG.STORAGE.CACHE_PREFIX}${key}`);
        if (!item) return null;
        
        const parsed = JSON.parse(item);
        if (Date.now() > parsed.expiry) {
            this.remove(key);
            return null;
        }
        
        return parsed.data;
    },
    
    remove(key) {
        localStorage.removeItem(`${API_CONFIG.STORAGE.CACHE_PREFIX}${key}`);
    },
    
    clear() {
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith(API_CONFIG.STORAGE.CACHE_PREFIX)) {
                localStorage.removeItem(key);
            }
        });
    }
};

// Gestion des erreurs API
export class ApiError extends Error {
    constructor(message, status, data = null) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.data = data;
    }
}

// Client HTTP basique
export const apiClient = {
    async request(endpoint, options = {}) {
        const url = getApiUrl(endpoint);
        const headers = {
            ...getAuthHeaders(),
            ...options.headers
        };
        
        const config = {
            ...options,
            headers
        };
        
        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch {
                    errorData = { message: response.statusText };
                }
                
                throw new ApiError(
                    errorData.message || 'Erreur API',
                    response.status,
                    errorData
                );
            }
            
            return await response.json();
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            throw new ApiError('Erreur réseau', 0, { originalError: error.message });
        }
    },
    
    get(endpoint, params = {}) {
        const urlParams = new URLSearchParams(params).toString();
        const url = urlParams ? `${endpoint}?${urlParams}` : endpoint;
        return this.request(url, { method: 'GET' });
    },
    
    post(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },
    
    put(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },
    
    delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
};