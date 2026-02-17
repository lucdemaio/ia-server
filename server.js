const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const UPLOAD_DIR = path.join(__dirname, 'uploaded-models');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, Date.now() + '_' + file.originalname.replace(/\s+/g,'_'))
});
const upload = multer({ storage });

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health
app.get('/health', (req, res) => res.json({ ok: true }));

// List uploaded models
app.get('/models', (req, res) => {
  const files = fs.readdirSync(UPLOAD_DIR).map(f => ({ name: f, path: `/models/${f}` }));
  res.json({ models: files });
});

// Serve uploaded files (for convenience)
app.use('/models', express.static(UPLOAD_DIR));

// Upload model file (multipart/form-data, field `file`)
app.post('/upload-model', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nessun file ricevuto' });
  // Risposta minima — in produzione dovrai validare e spostare il file
  res.json({ model: req.file.filename, name: req.file.originalname, size: req.file.size });
});

// Infer (demo/mocking)
// body: { model: string, prompt: string }
app.post('/infer', (req, res) => {
  const { model, prompt } = req.body || {};
  if (!prompt) return res.status(400).json({ error: 'Prompt mancante' });

  // Se il modello corrisponde a un file caricato -> simulazione
  const uploaded = fs.readdirSync(UPLOAD_DIR).find(f => f === model || model && model.includes(f));
  if (uploaded) {
    // Mock response: echo + info
    return res.json({ model: uploaded, result: `Risposta simulata dal modello caricato '${uploaded}': ${prompt}` });
  }

  // Per modelli remoti (es. Hugging Face) qui potresti integrare real inference
  // Per ora ritorniamo una risposta dimostrativa
  return res.json({ model: model || 'demo', result: `Risposta simulata (server demo) — Echo: ${prompt}` });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`IA mock server in ascolto su http://localhost:${PORT}`));
