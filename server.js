const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir les fichiers statiques
app.use(express.static('public'));
app.use(express.static('.'));

// Route principale
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Route API de test
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Serveur TactiBall Pro en ligne',
        version: '4.0.0'
    });
});

// Démarrer le serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`? Serveur TactiBall Pro démarré sur http://localhost:${PORT}`);
    console.log(`?? Dossier public: ${__dirname}`);
});