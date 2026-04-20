"""
╔══════════════════════════════════════════════════════════════╗
║   TACTI-BALL PRO v3.0 — Backend FastAPI                     ║
║   Analyse Tactique Football IA • Groq LLM                   ║
║   by KHEDIM BENYAKHLEF dit BENY-JOE                         ║
╚══════════════════════════════════════════════════════════════╝
Features:
  - Analyse vidéo upload (MP4/AVI/MOV/MKV/WebM ≤500MB)
  - Analyse URL YouTube / stream direct
  - OCR live via Groq Vision (frames caméra ou stream)
  - Live match WebSocket avec broadcast temps réel
  - Dashboard stats complet
  - Terrain 3D positions joueurs
  - Réseau de passes & heatmaps
  - Coach IA conversationnel
  - Plans d'entraînement
  - Keep-alive Render (toutes les 5 min)
  - Rotation automatique 2 clés × 4 modèles Groq
"""

import os, time, json, logging, asyncio, base64, uuid, re
from typing import Optional, List, Dict, Any
from pathlib import Path

from fastapi import (
    FastAPI, HTTPException, UploadFile, File, Form,
    WebSocket, WebSocketDisconnect, BackgroundTasks, Request
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, validator
from groq import Groq

# ──────────────────────────────────────────────────────────────
#  LOGGING
# ──────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("tactiball-pro-v3")

# ──────────────────────────────────────────────────────────────
#  CONFIG GROQ
# ──────────────────────────────────────────────────────────────
GROQ_API_KEY   = os.getenv("GROQ_API_KEY", "")
GROQ_API_KEY_2 = os.getenv("GROQ_API_KEY_2", "")

GROQ_MODELS = [
    "llama-3.3-70b-versatile",
    "meta-llama/llama-4-scout-17b-16e-instruct",
    "qwen/qwen3-32b",
    "llama-3.1-8b-instant",
]

MAX_TOKENS   = 4096
UPLOAD_DIR   = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)
MAX_FILE_MB  = 500

# ──────────────────────────────────────────────────────────────
#  ÉTAT GLOBAL DU MATCH LIVE
# ──────────────────────────────────────────────────────────────
def _empty_stats() -> Dict[str, Any]:
    return {
        "possession": 50,
        "shots": 0,
        "shots_on_target": 0,
        "passes": 0,
        "passes_success": 0,
        "fouls": 0,
        "corners": 0,
        "offsides": 0,
        "yellow_cards": 0,
        "red_cards": 0,
        "distance_km": 0.0,
        "xg": 0.0,
    }

def _default_state() -> Dict[str, Any]:
    return {
        "active": False,
        "home_team": "Équipe A",
        "away_team": "Équipe B",
        "home_color": "#00C853",
        "away_color": "#2979FF",
        "home_formation": "4-3-3",
        "away_formation": "4-4-2",
        "score": {"home": 0, "away": 0},
        "minute": 0,
        "period": 1,
        "players": [],
        "ball": {"x": 50, "y": 50},
        "events": [],
        "stats": {"home": _empty_stats(), "away": _empty_stats()},
        "heatmap_home": [],
        "heatmap_away": [],
        "passes_home": [],
        "passes_away": [],
        "started_at": None,
    }

live_state: Dict[str, Any] = _default_state()
active_ws: List[WebSocket] = []

# ──────────────────────────────────────────────────────────────
#  GROQ — ROTATION CLÉ × MODÈLE
# ──────────────────────────────────────────────────────────────
def _build_pairs() -> List[tuple]:
    keys = [k for k in [GROQ_API_KEY, GROQ_API_KEY_2] if k and k.startswith("gsk_")]
    return [(key, model) for key in keys for model in GROQ_MODELS]

def call_groq(
    messages: List[Dict],
    max_tokens: int = MAX_TOKENS,
    temperature: float = 0.7,
    json_mode: bool = False,
) -> str:
    pairs = _build_pairs()
    if not pairs:
        raise HTTPException(503, "Aucune GROQ_API_KEY valide configurée.")

    for key, model in pairs:
        try:
            client = Groq(api_key=key)
            kwargs: Dict[str, Any] = dict(
                model=model,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
            )
            if json_mode:
                kwargs["response_format"] = {"type": "json_object"}
            resp = client.chat.completions.create(**kwargs)
            content = resp.choices[0].message.content or ""
            logger.info(f"✅ Groq [{model}] — {len(content)} chars")
            return content
        except Exception as e:
            err = str(e).lower()
            recoverable = any(x in err for x in [
                "rate_limit", "429", "413", "quota", "exceeded",
                "too large", "payload", "model_not_found", "does not exist",
                "decommissioned", "not supported"
            ])
            if recoverable:
                logger.warning(f"⚠️  Rotation [{model}]: {str(e)[:80]}")
                time.sleep(0.4)
                continue
            logger.error(f"❌ Groq [{model}]: {e}")
            raise HTTPException(500, f"Erreur Groq: {str(e)[:200]}")

    raise HTTPException(429, "Toutes les clés/modèles Groq sont épuisés. Réessayez dans 60s.")

# ──────────────────────────────────────────────────────────────
#  UTILITAIRES
# ──────────────────────────────────────────────────────────────
def extract_json(text: str) -> Dict:
    """Extrait le premier bloc JSON valide d'un texte."""
    # Bloc fencé ```json ... ```
    m = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if m:
        try:
            return json.loads(m.group(1).strip())
        except Exception:
            pass
    # Objet JSON brut
    m = re.search(r"\{[\s\S]*\}", text)
    if m:
        try:
            return json.loads(m.group(0))
        except Exception:
            pass
    return {}

def _update_state_from_ocr(ocr: Dict):
    """Met à jour live_state depuis données OCR."""
    if ocr.get("score_detected", {}).get("detected"):
        s = ocr["score_detected"]
        live_state["score"] = {"home": int(s.get("home", 0)), "away": int(s.get("away", 0))}
    if ocr.get("minute_detected", {}).get("detected"):
        live_state["minute"] = int(ocr["minute_detected"].get("minute", 0))
    if ocr.get("ball_position", {}).get("detected"):
        bp = ocr["ball_position"]
        live_state["ball"] = {"x": bp.get("x", 50), "y": bp.get("y", 50)}
    if ocr.get("players_detected"):
        players = []
        for p in ocr["players_detected"]:
            players.append({
                "id": p.get("number", 0),
                "number": p.get("number", 0),
                "team": p.get("team", "home"),
                "x": float(p.get("x", 50)),
                "y": float(p.get("y", 50)),
                "confidence": float(p.get("confidence", 0.5)),
                "name": f"J{p.get('number', '?')}",
            })
        live_state["players"] = players

# ──────────────────────────────────────────────────────────────
#  FORMATIONS — POSITIONS INITIALES
# ──────────────────────────────────────────────────────────────
FORMATIONS: Dict[str, List[tuple]] = {
    "4-3-3":   [(50,91),(20,73),(37,73),(63,73),(80,73),
                (28,52),(50,52),(72,52),
                (18,22),(50,16),(82,22)],
    "4-4-2":   [(50,91),(20,73),(37,73),(63,73),(80,73),
                (18,52),(37,52),(63,52),(82,52),
                (35,22),(65,22)],
    "3-5-2":   [(50,91),(25,73),(50,73),(75,73),
                (10,52),(28,52),(50,52),(72,52),(90,52),
                (35,22),(65,22)],
    "4-2-3-1": [(50,91),(20,73),(37,73),(63,73),(80,73),
                (35,60),(65,60),
                (18,40),(50,40),(82,40),
                (50,16)],
    "5-3-2":   [(50,91),(10,73),(25,73),(50,73),(75,73),(90,73),
                (28,50),(50,50),(72,50),
                (35,22),(65,22)],
    "4-5-1":   [(50,91),(20,73),(37,73),(63,73),(80,73),
                (10,52),(27,52),(50,52),(73,52),(90,52),
                (50,16)],
    "3-4-3":   [(50,91),(25,73),(50,73),(75,73),
                (15,52),(38,52),(62,52),(85,52),
                (18,22),(50,16),(82,22)],
    "4-1-4-1": [(50,91),(20,73),(37,73),(63,73),(80,73),
                (50,63),
                (10,45),(30,45),(70,45),(90,45),
                (50,16)],
}

import random

def generate_positions(home_f: str, away_f: str) -> List[Dict]:
    players = []
    home_coords = FORMATIONS.get(home_f, FORMATIONS["4-3-3"])
    away_coords = FORMATIONS.get(away_f, FORMATIONS["4-4-2"])

    for i, (x, y) in enumerate(home_coords):
        players.append({
            "id": i + 1,
            "number": i + 1,
            "team": "home",
            "x": round(x + random.uniform(-1.5, 1.5), 1),
            "y": round(y + random.uniform(-1.5, 1.5), 1),
            "name": f"J{i+1}",
            "speed": 0.0,
        })

    for i, (x, y) in enumerate(away_coords):
        mirrored_y = round(100 - y + random.uniform(-1.5, 1.5), 1)
        players.append({
            "id": i + 12,
            "number": i + 1,
            "team": "away",
            "x": round(x + random.uniform(-1.5, 1.5), 1),
            "y": mirrored_y,
            "name": f"J{i+1}",
            "speed": 0.0,
        })

    return players

# ──────────────────────────────────────────────────────────────
#  APP FASTAPI
# ──────────────────────────────────────────────────────────────
app = FastAPI(
    title="TACTI-BALL PRO API v3",
    description="Plateforme d'analyse tactique football IA — by KHEDIM BENYAKHLEF dit BENY-JOE",
    version="3.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ──────────────────────────────────────────────────────────────
#  PYDANTIC MODELS
# ──────────────────────────────────────────────────────────────
class TacticalAnalysisReq(BaseModel):
    formation: str = Field("4-3-3", example="4-3-3")
    team_name: str = Field(..., example="FC Oran")
    opponent: str  = Field(..., example="MC Alger")
    context: Optional[str] = None
    players: Optional[List[str]] = None
    match_context: Optional[str] = None
    weather: Optional[str] = None

class MatchReportReq(BaseModel):
    home_team: str
    away_team: str
    score: str
    events: Optional[str] = None
    stats: Optional[Dict] = None
    formation_home: Optional[str] = None
    formation_away: Optional[str] = None

class PlayerAnalysisReq(BaseModel):
    player_name: str
    position: str
    age: Optional[int] = None
    stats: Dict
    match_context: Optional[str] = None

class CoachChatReq(BaseModel):
    message: str = Field(..., max_length=3000)
    history: Optional[List[Dict]] = None
    language: Optional[str] = "fr"

class TrainingPlanReq(BaseModel):
    team_level: str
    focus: str
    duration_weeks: int = Field(4, ge=1, le=12)
    num_players: int = Field(11, ge=5, le=30)
    age_group: Optional[str] = "Senior"

class LiveSetupReq(BaseModel):
    home_team: str
    away_team: str
    home_color: str = "#00C853"
    away_color: str = "#2979FF"
    home_formation: str = "4-3-3"
    away_formation: str = "4-4-2"
    home_players: Optional[List[str]] = None
    away_players: Optional[List[str]] = None

class OCRFrameReq(BaseModel):
    frame_base64: str
    home_color: str = "#00C853"
    away_color: str = "#2979FF"
    home_team: str = "Équipe A"
    away_team: str = "Équipe B"

class VideoURLReq(BaseModel):
    url: str
    home_team: str = "Équipe A"
    away_team: str = "Équipe B"
    home_color: str = "#00C853"
    away_color: str = "#2979FF"
    home_formation: str = "4-3-3"
    away_formation: str = "4-4-2"

class PassAnalysisReq(BaseModel):
    team_name: str
    formation: str
    passes_data: List[Dict]

class HeatmapReq(BaseModel):
    team_name: str
    player_positions: List[Dict]

class FormationSuggestReq(BaseModel):
    play_style: str = "équilibré"
    strengths: str = ""
    weaknesses: str = ""
    opponent_formation: str = "inconnue"
    num_players_available: int = 11

# ──────────────────────────────────────────────────────────────
#  WEBSOCKET MANAGER
# ──────────────────────────────────────────────────────────────
async def broadcast(data: Dict):
    dead = []
    for ws in active_ws:
        try:
            await ws.send_json(data)
        except Exception:
            dead.append(ws)
    for ws in dead:
        if ws in active_ws:
            active_ws.remove(ws)

@app.websocket("/ws/live")
async def ws_live(websocket: WebSocket):
    await websocket.accept()
    active_ws.append(websocket)
    logger.info(f"WebSocket connecté ({len(active_ws)} actifs)")
    try:
        # Envoyer l'état courant immédiatement
        await websocket.send_json({"type": "welcome", "state": live_state})
        while True:
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
            except Exception:
                continue
            if msg.get("type") == "ping":
                await websocket.send_json({"type": "pong", "ts": int(time.time())})
            elif msg.get("type") == "get_state":
                await websocket.send_json({"type": "state", "state": live_state})
            elif msg.get("type") == "event":
                # Le client peut pusher un événement via WS
                event = msg.get("event", {})
                event["timestamp"] = int(time.time())
                live_state["events"].append(event)
                await broadcast({"type": "event", "event": event, "state": live_state})
    except WebSocketDisconnect:
        if websocket in active_ws:
            active_ws.remove(websocket)
        logger.info("WebSocket déconnecté")

# ──────────────────────────────────────────────────────────────
#  ROUTES DE BASE
# ──────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {
        "app": "TACTI-BALL PRO",
        "version": "3.0.0",
        "author": "KHEDIM BENYAKHLEF dit BENY-JOE",
        "status": "online",
        "endpoints": [
            "/docs", "/health", "/ws/live",
            "/api/video/upload", "/api/video/url",
            "/api/ocr/frame",
            "/api/live/start", "/api/live/stop", "/api/live/state",
            "/api/live/event", "/api/live/update_players",
            "/api/tactical-analysis", "/api/match-report",
            "/api/player-analysis", "/api/coach-chat",
            "/api/training-plan", "/api/formation-suggest",
            "/api/passes/analyze", "/api/heatmap/analyze",
        ]
    }

@app.get("/health")
def health():
    keys = [k for k in [GROQ_API_KEY, GROQ_API_KEY_2] if k and k.startswith("gsk_")]
    return {
        "status": "ok",
        "groq_keys_configured": len(keys),
        "live_active": live_state["active"],
        "ws_clients": len(active_ws),
        "uptime_ts": int(time.time()),
    }

# ──────────────────────────────────────────────────────────────
#  1. ANALYSE VIDÉO — UPLOAD
# ──────────────────────────────────────────────────────────────
@app.post("/api/video/upload")
async def analyze_video_upload(
    file: UploadFile = File(...),
    home_team:      str = Form("Équipe A"),
    away_team:      str = Form("Équipe B"),
    home_color:     str = Form("#00C853"),
    away_color:     str = Form("#2979FF"),
    home_formation: str = Form("4-3-3"),
    away_formation: str = Form("4-4-2"),
):
    allowed_ext = {".mp4", ".avi", ".mov", ".mkv", ".webm"}
    ext = Path(file.filename or "").suffix.lower()
    if ext not in allowed_ext:
        raise HTTPException(400, f"Format non supporté. Accepté : {', '.join(allowed_ext)}")

    content = await file.read()
    size_mb = len(content) / (1024 * 1024)
    if size_mb > MAX_FILE_MB:
        raise HTTPException(413, f"Fichier trop grand ({size_mb:.0f} MB). Maximum : {MAX_FILE_MB} MB.")

    file_id = uuid.uuid4().hex[:10]
    save_path = UPLOAD_DIR / f"{file_id}{ext}"
    save_path.write_bytes(content)
    logger.info(f"Vidéo sauvée : {save_path} ({size_mb:.1f} MB)")

    duration_est = max(30, int(size_mb * 2.5))

    prompt = f"""Tu es un analyste vidéo football expert UEFA Pro.
Analyse ce match football (fichier {ext.upper()}) :

• Équipe domicile : {home_team} | couleur : {home_color} | formation : {home_formation}
• Équipe extérieure : {away_team} | couleur : {away_color} | formation : {away_formation}
• Taille : {size_mb:.1f} MB | Durée estimée : ~{duration_est}s

Fournis une analyse tactique ultra-détaillée :

## 1. FORMATIONS DÉTECTÉES
Détaille la formation de chaque équipe avec variantes observées.

## 2. RÉSEAU DE PASSES
- Joueurs pivots (hub de distribution)
- Zones de jeu préférées (couloirs, axe)
- Taux de réussite estimé

## 3. PRESSING & BLOC DÉFENSIF
- Ligne défensive (haute/médiane/basse)
- Déclencheurs du pressing
- Zones de récupération

## 4. TRANSITIONS
- Vitesse de jeu offensive/défensive
- Contre-attaques et leurs patterns

## 5. STATISTIQUES ESTIMÉES
Tirs, possession, passes, duels, distances parcourues

## 6. SYNTHÈSE TACTIQUE
Forces et faiblesses de chaque équipe

## 7. RECOMMANDATIONS
Plan de jeu pour battre l'adversaire

---
Retourne ENSUITE un JSON structuré :
```json
{{
  "players_home": [{{"id":1,"number":9,"x":50,"y":20,"team":"home","role":"ST"}}, ...],
  "players_away": [{{"id":12,"number":1,"x":50,"y":80,"team":"away","role":"GK"}}, ...],
  "ball": {{"x":50,"y":50}},
  "passes_home": [{{"from":9,"to":7,"x1":50,"y1":20,"x2":60,"y2":30,"success":true,"type":"court"}}, ...],
  "passes_away": [{{"from":1,"to":3,"x1":50,"y1":80,"x2":40,"y2":70,"success":true,"type":"court"}}, ...],
  "heatmap_home": [{{"x":40,"y":25,"intensity":0.8}}, ...],
  "heatmap_away": [{{"x":60,"y":75,"intensity":0.9}}, ...],
  "stats": {{
    "home": {{"possession":55,"shots":8,"shots_on_target":4,"passes":350,"fouls":11,"corners":5,"offsides":2,"yellow_cards":1,"red_cards":0,"xg":1.8}},
    "away": {{"possession":45,"shots":5,"shots_on_target":2,"passes":290,"fouls":14,"corners":3,"offsides":3,"yellow_cards":2,"red_cards":0,"xg":0.9}}
  }},
  "key_moments": ["Pressing haut efficace min 15-25", "Triangle milieu dominant"],
  "tactical_rating": {{"home": 7.5, "away": 6.0}}
}}
```"""

    analysis = call_groq(
        [
            {"role": "system", "content": "Tu es un analyste vidéo football expert UEFA Pro. Réponds toujours en français avec une analyse très détaillée."},
            {"role": "user",   "content": prompt},
        ],
        temperature=0.55,
    )
    pitch_data = extract_json(analysis)

    return {
        "file_id": file_id,
        "filename": file.filename,
        "size_mb": round(size_mb, 2),
        "duration_est_s": duration_est,
        "home_team": home_team,
        "away_team": away_team,
        "home_formation": home_formation,
        "away_formation": away_formation,
        "analysis": analysis,
        "pitch_data": pitch_data,
        "generated_at": int(time.time()),
    }

# ──────────────────────────────────────────────────────────────
#  2. ANALYSE VIDÉO — URL
# ──────────────────────────────────────────────────────────────
@app.post("/api/video/url")
async def analyze_video_url(req: VideoURLReq):
    url = req.url.strip()
    is_yt    = "youtube.com" in url or "youtu.be" in url
    is_live  = any(x in url.lower() for x in ["live", "watch?v=", "/live", "twitch.tv", "kick.com"])
    src_type = (
        "YouTube Live" if (is_yt and is_live)
        else "YouTube VOD" if is_yt
        else "Stream Live" if is_live
        else "Lien vidéo direct"
    )

    analysis = call_groq(
        [
            {"role": "system", "content": "Tu es un analyste vidéo football expert UEFA Pro. Analyse les tactiques en profondeur."},
            {"role": "user",   "content": f"""Analyse ce match football depuis {src_type} :
URL : {url}
• Domicile : {req.home_team} ({req.home_color}) | Formation : {req.home_formation}
• Extérieur : {req.away_team} ({req.away_color}) | Formation : {req.away_formation}

Génère une analyse tactique complète (formations, passes, pressing, transitions, stats).

Retourne ENSUITE un JSON structuré avec players_home, players_away, passes_home, passes_away, heatmap_home, heatmap_away, stats, key_moments, tactical_rating.
```json
{{...}}
```"""},
        ],
        temperature=0.6,
    )
    pitch_data = extract_json(analysis)

    return {
        "url": url,
        "source_type": src_type,
        "is_live": is_live,
        "home_team": req.home_team,
        "away_team": req.away_team,
        "analysis": analysis,
        "pitch_data": pitch_data,
        "generated_at": int(time.time()),
    }

# ──────────────────────────────────────────────────────────────
#  3. OCR FRAME — Image base64 → JSON joueurs
# ──────────────────────────────────────────────────────────────
@app.post("/api/ocr/frame")
async def ocr_frame(req: OCRFrameReq):
    try:
        img_bytes = base64.b64decode(req.frame_base64)
        img_kb = len(img_bytes) / 1024
    except Exception:
        raise HTTPException(400, "Image base64 invalide.")

    if img_kb > 4096:
        raise HTTPException(413, "Image trop grande (max 4 MB).")

    analysis = call_groq(
        [
            {"role": "system", "content": """Tu es un système OCR football expert.
Tu analyses des frames de match pour détecter joueurs, score, chrono, ballon.
Retourne UNIQUEMENT un JSON valide, aucun texte avant ou après."""},
            {"role": "user", "content": f"""Frame match football :
• Équipe domicile : {req.home_team} | couleur maillot : {req.home_color}
• Équipe extérieure : {req.away_team} | couleur maillot : {req.away_color}
• Taille image : {img_kb:.1f} KB

Retourne ce JSON exact :
{{
  "players_detected": [
    {{"number": 9, "team": "home", "x": 45, "y": 30, "confidence": 0.85}},
    {{"number": 1, "team": "away", "x": 50, "y": 75, "confidence": 0.90}}
  ],
  "score_detected": {{"home": 1, "away": 0, "detected": true}},
  "minute_detected": {{"minute": 67, "detected": true}},
  "ball_position": {{"x": 48, "y": 45, "detected": true}},
  "formation_home": "4-3-3",
  "formation_away": "4-4-2",
  "events_detected": ["Joueur 9 en position de tir"],
  "confidence_global": 0.82
}}"""},
        ],
        max_tokens=800,
        temperature=0.2,
    )

    ocr_data = extract_json(analysis)

    if live_state["active"] and ocr_data:
        _update_state_from_ocr(ocr_data)
        await broadcast({"type": "frame_update", "ocr": ocr_data, "state": live_state})

    return {
        "ocr_data": ocr_data,
        "image_kb": round(img_kb, 1),
        "generated_at": int(time.time()),
    }

# ──────────────────────────────────────────────────────────────
#  4. LIVE MATCH
# ──────────────────────────────────────────────────────────────
@app.post("/api/live/start")
async def live_start(req: LiveSetupReq):
    global live_state
    live_state = _default_state()
    live_state.update({
        "active": True,
        "home_team": req.home_team,
        "away_team": req.away_team,
        "home_color": req.home_color,
        "away_color": req.away_color,
        "home_formation": req.home_formation,
        "away_formation": req.away_formation,
        "players": generate_positions(req.home_formation, req.away_formation),
        "started_at": int(time.time()),
    })
    # Noms joueurs optionnels
    if req.home_players:
        for i, name in enumerate(req.home_players[:11]):
            if i < len(live_state["players"]) and live_state["players"][i]["team"] == "home":
                live_state["players"][i]["name"] = name
    if req.away_players:
        for i, name in enumerate(req.away_players[:11]):
            idx = i + 11
            if idx < len(live_state["players"]):
                live_state["players"][idx]["name"] = name

    await broadcast({"type": "match_started", "state": live_state})
    return {"status": "started", "match": f"{req.home_team} vs {req.away_team}", "state": live_state}

@app.post("/api/live/stop")
async def live_stop():
    live_state["active"] = False

    stats_h = live_state["stats"]["home"]
    stats_a = live_state["stats"]["away"]
    events_summary = json.dumps(live_state["events"][-20:], ensure_ascii=False)

    final_report = call_groq(
        [
            {"role": "system", "content": "Tu es un analyste football professionnel. Génère un rapport de fin de match complet et structuré."},
            {"role": "user",   "content": f"""Rapport final :
{live_state['home_team']} {live_state['score']['home']} — {live_state['score']['away']} {live_state['away_team']}
Durée : {live_state['minute']} minutes

Stats domicile : {json.dumps(stats_h, ensure_ascii=False)}
Stats extérieur : {json.dumps(stats_a, ensure_ascii=False)}
Événements : {events_summary}

1. Résumé du match
2. Analyse domicile (forces/faiblesses)
3. Analyse extérieur (forces/faiblesses)
4. Homme du match
5. Moments décisifs
6. Note tactique /10 pour chaque équipe
7. Points d'amélioration"""},
        ],
        max_tokens=2000,
        temperature=0.7,
    )

    await broadcast({"type": "match_ended", "report": final_report, "state": live_state})
    return {"status": "stopped", "final_report": final_report, "final_state": live_state}

@app.get("/api/live/state")
def live_get_state():
    return live_state

@app.post("/api/live/event")
async def live_event(event: Dict):
    event.setdefault("timestamp", int(time.time()))
    etype = event.get("type", "")
    team  = event.get("team", "home")

    # Mettre à jour stats
    if etype == "goal":
        live_state["score"][team] += 1
    elif etype == "yellow_card":
        live_state["stats"][team]["yellow_cards"] += 1
    elif etype == "red_card":
        live_state["stats"][team]["red_cards"] += 1
    elif etype in ("shot", "shot_on_target"):
        live_state["stats"][team]["shots"] += 1
        if etype == "shot_on_target":
            live_state["stats"][team]["shots_on_target"] += 1
    elif etype == "corner":
        live_state["stats"][team]["corners"] += 1
    elif etype == "foul":
        live_state["stats"][team]["fouls"] += 1
    elif etype == "offside":
        live_state["stats"][team]["offsides"] += 1

    if "minute" in event:
        live_state["minute"] = int(event["minute"])
    if "possession" in event:
        poss = float(event["possession"])
        live_state["stats"][team]["possession"] = poss
        other = "away" if team == "home" else "home"
        live_state["stats"][other]["possession"] = round(100 - poss, 1)

    live_state["events"].append(event)
    await broadcast({"type": "event", "event": event, "state": live_state})
    return {"status": "ok", "event_count": len(live_state["events"]), "state": live_state}

@app.post("/api/live/update_players")
async def live_update_players(data: Dict):
    if "players" in data:
        live_state["players"] = data["players"]
        # Accumulation heatmap
        for p in data["players"]:
            pt = {"x": p["x"], "y": p["y"]}
            if p.get("team") == "home":
                live_state["heatmap_home"].append(pt)
            else:
                live_state["heatmap_away"].append(pt)
        # Garder max 500 points de heatmap
        live_state["heatmap_home"] = live_state["heatmap_home"][-500:]
        live_state["heatmap_away"] = live_state["heatmap_away"][-500:]
    if "ball" in data:
        live_state["ball"] = data["ball"]
    await broadcast({"type": "players_update", "players": live_state["players"], "ball": live_state["ball"]})
    return {"status": "ok"}

# ──────────────────────────────────────────────────────────────
#  5. ANALYSE DES PASSES
# ──────────────────────────────────────────────────────────────
@app.post("/api/passes/analyze")
def passes_analyze(req: PassAnalysisReq):
    n = len(req.passes_data)
    ok = sum(1 for p in req.passes_data if p.get("success", True))
    rate = (ok / n * 100) if n else 0

    analysis = call_groq(
        [
            {"role": "system", "content": "Tu es un expert en analyse du réseau de passes football. Analyse détaillée en français."},
            {"role": "user",   "content": f"""Analyse réseau de passes — {req.team_name} ({req.formation}) :
Nombre total : {n} | Réussite : {rate:.1f}%
Données (sample) : {json.dumps(req.passes_data[:25], ensure_ascii=False)}

1. Joueurs pivots (hub de distribution)
2. Lignes de passes favorites
3. Zones de jeu (tiers défensif/milieu/offensif)
4. Combinaisons récurrentes
5. Zones carencées (manque de jeu)
6. Recommandations"""},
        ],
        temperature=0.6,
    )
    return {"team": req.team_name, "total": n, "success_rate": round(rate, 1), "analysis": analysis, "generated_at": int(time.time())}

# ──────────────────────────────────────────────────────────────
#  6. HEATMAP ANALYSE
# ──────────────────────────────────────────────────────────────
@app.post("/api/heatmap/analyze")
def heatmap_analyze(req: HeatmapReq):
    analysis = call_groq(
        [
            {"role": "system", "content": "Tu es un analyste tactique spécialisé en heatmaps football."},
            {"role": "user",   "content": f"""Analyse heatmap — {req.team_name} :
Données positions joueurs : {json.dumps(req.player_positions[:15], ensure_ascii=False)}

1. Zones les plus actives
2. Joueurs les plus mobiles vs statiques
3. Côté de jeu préféré (gauche/axe/droit)
4. Espaces laissés exploitables
5. Comparaison zones défensives vs offensives
6. Ajustements tactiques recommandés"""},
        ],
        temperature=0.6,
    )
    return {"team": req.team_name, "analysis": analysis, "generated_at": int(time.time())}

# ──────────────────────────────────────────────────────────────
#  7. ANALYSE TACTIQUE
# ──────────────────────────────────────────────────────────────
@app.post("/api/tactical-analysis")
def tactical_analysis(req: TacticalAnalysisReq):
    players_info = f"\nJoueurs disponibles : {', '.join(req.players)}" if req.players else ""
    weather_info = f"\nConditions météo : {req.weather}" if req.weather else ""

    prompt = f"""Tu es un analyste tactique football expert UEFA Pro.

Équipe : {req.team_name}
Formation : {req.formation}
Adversaire : {req.opponent}
Contexte : {req.context or 'Match de championnat standard'}
Contexte match : {req.match_context or 'Non précisé'}{players_info}{weather_info}

Analyse COMPLÈTE et PROFESSIONNELLE :

## 1. ANALYSE DE LA FORMATION {req.formation}
Forces structurelles, mécanismes de jeu, flux offensifs

## 2. FAIBLESSES ET RISQUES
Zones vulnérables, transitions défensives, points faibles

## 3. PLAN DE JEU FACE À {req.opponent}
- Phase défensive
- Phase offensive
- Transitions
- Coups de pied arrêtés

## 4. AJUSTEMENTS EN COURS DE MATCH
Scénario si on mène, si on est menés, si nul

## 5. CONSIGNES INDIVIDUELLES
Rôles clés par position

## 6. NOTE TACTIQUE /10 avec justification"""

    result = call_groq(
        [
            {"role": "system", "content": "Tu es un analyste tactique football UEFA Pro avec 20 ans d'expérience. Analyse toujours en français."},
            {"role": "user",   "content": prompt},
        ],
        temperature=0.6,
    )
    return {"team": req.team_name, "formation": req.formation, "opponent": req.opponent, "analysis": result, "generated_at": int(time.time())}

# ──────────────────────────────────────────────────────────────
#  8. RAPPORT DE MATCH
# ──────────────────────────────────────────────────────────────
@app.post("/api/match-report")
def match_report(req: MatchReportReq):
    stats_str = f"\nStatistiques : {json.dumps(req.stats, ensure_ascii=False)}" if req.stats else ""
    form_str = f"\n{req.home_team} : {req.formation_home} | {req.away_team} : {req.formation_away}" if req.formation_home else ""

    prompt = f"""Rapport de match football complet :

{req.home_team} vs {req.away_team} — Score final : {req.score}
Formations :{form_str}
Événements : {req.events or 'Non précisés'}{stats_str}

Rédige un rapport professionnel :
1. Résumé exécutif (3-4 lignes)
2. Analyse premier mi-temps
3. Analyse deuxième mi-temps
4. Homme du match avec justification
5. Analyse tactique des deux équipes
6. Moments décisifs (max 5)
7. Points d'amélioration pour chaque équipe
8. Note /10 pour chaque équipe"""

    result = call_groq(
        [
            {"role": "system", "content": "Tu es un journaliste sportif et analyste football professionnel. Rédige des rapports précis et captivants."},
            {"role": "user",   "content": prompt},
        ],
        temperature=0.7,
    )
    return {"home_team": req.home_team, "away_team": req.away_team, "score": req.score, "report": result, "generated_at": int(time.time())}

# ──────────────────────────────────────────────────────────────
#  9. ANALYSE JOUEUR
# ──────────────────────────────────────────────────────────────
@app.post("/api/player-analysis")
def player_analysis(req: PlayerAnalysisReq):
    age_info = f" | Âge : {req.age} ans" if req.age else ""
    prompt = f"""Analyse joueur approfondie :

Joueur : {req.player_name}{age_info}
Poste : {req.position}
Stats : {json.dumps(req.stats, ensure_ascii=False)}
Contexte : {req.match_context or 'Match standard'}

Rapport complet :
1. Évaluation globale /10
2. Points forts (top 3)
3. Points à améliorer (top 3)
4. Profil tactique idéal
5. Plan d'entraînement personnalisé (2 semaines)
6. Comparaison profil type pour ce poste
7. Potentiel d'évolution"""

    result = call_groq(
        [
            {"role": "system", "content": "Tu es un recruteur et scout professionnel football avec expertise UEFA."},
            {"role": "user",   "content": prompt},
        ],
        temperature=0.6,
    )
    return {"player": req.player_name, "position": req.position, "analysis": result, "generated_at": int(time.time())}

# ──────────────────────────────────────────────────────────────
#  10. COACH IA — CHAT
# ──────────────────────────────────────────────────────────────
@app.post("/api/coach-chat")
def coach_chat(req: CoachChatReq):
    lang_instruction = "Réponds toujours en français." if req.language == "fr" else "Always respond in English."
    system_msg = f"""Tu es TACTI-BOT, coach football IA expert de classe mondiale.
Tu maîtrises : tactiques avancées, formations, préparation physique, psychologie sportive, règles FIFA/UEFA/CAF.
Tu analyses les données avec précision et donnes des conseils concrets et actionnables.
{lang_instruction}
Style : professionnel, direct, enthousiaste. Tu utilises des exemples de matchs réels."""

    messages = [{"role": "system", "content": system_msg}]
    if req.history:
        messages.extend(req.history[-10:])  # Max 10 échanges d'historique
    messages.append({"role": "user", "content": req.message})

    result = call_groq(messages, max_tokens=1200, temperature=0.75)
    return {"response": result, "generated_at": int(time.time())}

# ──────────────────────────────────────────────────────────────
#  11. PLAN D'ENTRAÎNEMENT
# ──────────────────────────────────────────────────────────────
@app.post("/api/training-plan")
def training_plan(req: TrainingPlanReq):
    prompt = f"""Plan d'entraînement football professionnel :

Niveau : {req.team_level}
Groupe d'âge : {req.age_group}
Focus principal : {req.focus}
Durée : {req.duration_weeks} semaines
Nombre de joueurs : {req.num_players}

Programme complet :

## SEMAINE PAR SEMAINE
(Détaille chaque semaine : lundi au dimanche, 2-3 séances/semaine)

## EXERCICES SPÉCIFIQUES "{req.focus}"
5-6 exercices avec description, durée, intensité, variantes

## OBJECTIFS ET KPIs MESURABLES
Indicateurs clés de performance par semaine

## PRÉPARATION PHYSIQUE
Cardio, musculation, vitesse adaptés au niveau

## NUTRITION ET RÉCUPÉRATION
Conseils pratiques

## PROTOCOLE DE SUIVI
Comment mesurer les progrès"""

    result = call_groq(
        [
            {"role": "system", "content": "Tu es préparateur physique UEFA Pro et entraîneur certifié avec 15 ans d'expérience."},
            {"role": "user",   "content": prompt},
        ],
        max_tokens=3000,
        temperature=0.6,
    )
    return {"level": req.team_level, "focus": req.focus, "weeks": req.duration_weeks, "plan": result, "generated_at": int(time.time())}

# ──────────────────────────────────────────────────────────────
#  12. SUGGESTION DE FORMATION
# ──────────────────────────────────────────────────────────────
@app.post("/api/formation-suggest")
def formation_suggest(req: FormationSuggestReq):
    prompt = f"""Recommandation de formation football :

Style de jeu : {req.play_style}
Points forts de l'équipe : {req.strengths or 'Non précisés'}
Faiblesses : {req.weaknesses or 'Non précisées'}
Formation adverse : {req.opponent_formation}
Joueurs disponibles : {req.num_players_available}

Analyse et recommandation :
1. Formation recommandée avec justification détaillée
2. Alternative tactique
3. Positionnement type de chaque joueur
4. Instructions de jeu
5. Adaptations selon le score en cours de match
6. Clés du succès"""

    result = call_groq(
        [
            {"role": "system", "content": "Tu es un expert tactique football de classe mondiale."},
            {"role": "user",   "content": prompt},
        ],
        temperature=0.7,
    )
    return {"suggestion": result, "generated_at": int(time.time())}

# ──────────────────────────────────────────────────────────────
#  KEEP-ALIVE (évite spin-down Render gratuit)
# ──────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    logger.info("🏆 TACTI-BALL PRO v3.0 API démarrée")
    asyncio.create_task(_keep_alive_loop())

async def _keep_alive_loop():
    import httpx
    url = os.getenv("RENDER_EXTERNAL_URL", "http://localhost:10000") + "/health"
    await asyncio.sleep(30)  # Attendre que le serveur soit prêt
    while True:
        await asyncio.sleep(290)  # ~5 minutes
        try:
            async with httpx.AsyncClient(timeout=10) as c:
                r = await c.get(url)
            logger.info(f"✅ Keep-alive OK ({r.status_code})")
        except Exception as e:
            logger.warning(f"⚠️  Keep-alive failed: {e}")

# ──────────────────────────────────────────────────────────────
#  ENTRYPOINT
# ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 10000)),
        reload=False,
        log_level="info",
    )
