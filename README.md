# TACTI-BALL PRO v3.0
### Plateforme d'Analyse Tactique Football IA
**by KHEDIM BENYAKHLEF dit BENY-JOE**

---

## STACK TECHNIQUE
- **Backend** : Python 3.11 + FastAPI + Groq LLM
- **Frontend** : HTML5 + CSS3 + JavaScript Vanilla (SPA mono-fichier)
- **IA** : Groq API (llama-3.3-70b, llama-4-scout, qwen3-32b, llama-3.1-8b)
- **Déploiement Backend** : Render.com (gratuit)
- **Déploiement Frontend** : InfinityFree / Netlify / GitHub Pages

---

## FONCTIONNALITÉS

| Feature | Description |
|---------|-------------|
| 🔴 LIVE | Match en direct avec WebSocket, scoreboard, stats, OCR caméra |
| 🎬 Vidéo | Upload fichier (500 MB) ou URL YouTube/stream |
| 🏟 Terrain 3D | Canvas avec perspective trapèze, animation, heatmap, passes |
| 🧠 Tactique | Analyse IA complète + rapport match + profil joueur |
| 💬 Coach IA | Chat conversationnel TACTI-BOT avec historique |
| 🏋 Entraînement | Plan semaine par semaine + suggestion formation |

---

## DÉPLOIEMENT BACKEND (Render.com)

### Étape 1 — Créer un compte Groq
1. Allez sur https://console.groq.com
2. Créez 1 ou 2 clés API (gratuites, quota généreux)
3. Copiez vos clés `gsk_...`

### Étape 2 — Déployer sur Render
1. Créez un compte sur https://render.com
2. New → Web Service → Connect GitHub (ou upload manuel)
3. **Root Directory** : `backend`
4. **Build Command** : `pip install -r requirements.txt`
5. **Start Command** : `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. **Environment Variables** :
   ```
   GROQ_API_KEY=gsk_votre_cle_1
   GROQ_API_KEY_2=gsk_votre_cle_2
   RENDER_EXTERNAL_URL=https://votre-app.onrender.com
   ```
7. Plan : **Free**
8. Cliquez **Create Web Service**

### Étape 3 — Vérifier le déploiement
- Ouvrez : `https://votre-app.onrender.com/health`
- Vous devez voir : `{"status":"ok","groq_keys_configured":2,...}`
- Documentation API : `https://votre-app.onrender.com/docs`

---

## DÉPLOIEMENT FRONTEND

### Option A — GitHub Pages (recommandé, gratuit)
1. Créez un repo GitHub public
2. Uploadez `frontend/index.html`
3. Settings → Pages → Source: main branch → `/root`
4. URL: `https://votre-username.github.io/tactiball-pro/`

### Option B — Netlify (drag & drop)
1. Allez sur https://netlify.com
2. Drag & drop le dossier `frontend/`
3. URL générée automatiquement

### Option C — InfinityFree
1. Créez un compte sur https://www.infinityfree.com
2. Créez un hébergement
3. Uploadez `index.html` via File Manager dans le dossier `htdocs`

### Configuration URL API
Dans `frontend/index.html`, ligne `const API = '...'`, remplacez par votre URL Render :
```javascript
const API = 'https://votre-app.onrender.com';
```

---

## VARIABLES D'ENVIRONNEMENT BACKEND

| Variable | Description | Obligatoire |
|----------|-------------|-------------|
| `GROQ_API_KEY` | Clé Groq principale | ✅ Oui |
| `GROQ_API_KEY_2` | Clé Groq de backup (rotation) | Recommandé |
| `RENDER_EXTERNAL_URL` | URL publique Render (keep-alive) | Recommandé |
| `PORT` | Port (injecté auto par Render) | Auto |

---

## ARCHITECTURE

```
tactiball-pro-v3/
├── backend/
│   ├── main.py              # FastAPI + tous les endpoints
│   ├── requirements.txt     # Dépendances Python
│   ├── .env.example         # Variables d'environnement exemple
│   └── render.yaml          # Configuration déploiement Render
└── frontend/
    └── index.html           # SPA complète (HTML + CSS + JS)
```

---

## ENDPOINTS API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Infos API |
| GET | `/health` | Santé + clés configurées |
| WS | `/ws/live` | WebSocket live match |
| POST | `/api/video/upload` | Analyse vidéo upload |
| POST | `/api/video/url` | Analyse URL YouTube/stream |
| POST | `/api/ocr/frame` | OCR frame base64 |
| POST | `/api/live/start` | Démarrer match live |
| POST | `/api/live/stop` | Arrêter + rapport final |
| GET | `/api/live/state` | État match actuel |
| POST | `/api/live/event` | Ajouter événement (but, carton...) |
| POST | `/api/live/update_players` | Mise à jour positions joueurs |
| POST | `/api/tactical-analysis` | Analyse tactique IA |
| POST | `/api/match-report` | Rapport de match |
| POST | `/api/player-analysis` | Analyse joueur individuel |
| POST | `/api/coach-chat` | Chat TACTI-BOT |
| POST | `/api/training-plan` | Plan d'entraînement |
| POST | `/api/formation-suggest` | Suggestion de formation |
| POST | `/api/passes/analyze` | Analyse réseau de passes |
| POST | `/api/heatmap/analyze` | Analyse heatmap |

---

## ROTATION GROQ — MODÈLES SUPPORTÉS
- `llama-3.3-70b-versatile` — Analyse tactique principale
- `meta-llama/llama-4-scout-17b-16e-instruct` — Multimodal
- `qwen/qwen3-32b` — Analyses détaillées
- `llama-3.1-8b-instant` — Réponses rapides

La rotation automatique bascule vers le modèle suivant en cas de rate-limit (429) ou d'erreur.

---

## FORMATIONS SUPPORTÉES
`4-3-3` · `4-4-2` · `3-5-2` · `4-2-3-1` · `5-3-2` · `4-5-1` · `3-4-3` · `4-1-4-1`

---

## DÉPANNAGE

**API non connectée ?**
- Vérifiez l'URL dans `const API = '...'` dans `index.html`
- Le plan gratuit Render s'éteint après 15min d'inactivité → première requête prend ~30s
- Le keep-alive interne toutes les 5min maintient le service actif

**Erreur 429 / quota ?**
- Ajoutez une 2ème clé Groq dans `GROQ_API_KEY_2`
- La rotation automatique gère les rate-limits

**Caméra OCR ne fonctionne pas ?**
- Autorisez la caméra dans votre navigateur
- Fonctionne uniquement en HTTPS ou localhost

---

*TACTI-BALL PRO v3.0 — by KHEDIM BENYAKHLEF dit BENY-JOE*
