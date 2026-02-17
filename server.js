const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const { pipeline } = require('@xenova/transformers');

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

let generator = null;
let modelReady = false;
let initError = null;

// Carica il modello al startup (distilgpt2 è leggero ~80MB)
const initModel = async () => {
  try {
    console.log('🤖 Loading Xenova/distilgpt2 model (questo richiede 20-60 sec)...');
    generator = await pipeline('text-generation', 'Xenova/distilgpt2');
    modelReady = true;
    console.log('✓ Model ready per inferenze!');
  } catch (err) {
    initError = err.message;
    console.error('❌ Model loading error:', err.message);
    modelReady = false;
  }
};

// Avvia il caricamento del modello all'avvio
initModel();

// Health endpoint
app.get('/health', (req, res) => {
  res.json({ ok: true, modelReady, initError: initError || null });
});

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
  res.json({ model: req.file.filename, name: req.file.originalname, size: req.file.size });
});

// Infer endpoint - fa vere inferenze con transformers.js
// body: { model: string, prompt: string }
app.post('/infer', async (req, res) => {
  const { model, prompt } = req.body || {};
  if (!prompt) return res.status(400).json({ error: 'Prompt mancante' });

  // Se il modello è un file caricato, rispondi con mock (non carica file locali)
  const uploaded = fs.readdirSync(UPLOAD_DIR).find(f => f === model || (model && model.includes(f)));
  if (uploaded) {
    return res.json({ model: uploaded, result: `Modello caricato '${uploaded}' - Echo: ${prompt}` });
  }

  // Se il modello non è distilgpt2, risposta mock
  if (model && model !== 'distilgpt2' && !model.includes('Xenova')) {
    return res.json({ model, result: `Echo (modello non riconosciuto): ${prompt}` });
  }

  // Se il modello non è pronto, ritorna errore
  if (!modelReady) {
    return res.status(503).json({ 
      error: 'Modello non caricato', 
      message: initError || 'Il modello distilgpt2 sta caricando. Riprova in 30-60 secondi.'
    });
  }

  try {
    // Limita la lunghezza dell'input per risparmiar memoria
    const input = prompt.length > 200 ? prompt.substring(0, 200) : prompt;
    console.log(`🎯 Inferring... prompt="${input}"`);
    
    // Genera testo
    const outputs = await generator(input, { max_new_tokens: 80, temperature: 0.8 });
    const result = outputs[0].generated_text || outputs[0].text || JSON.stringify(outputs[0]);
    
    res.json({ 
      model: 'Xenova/distilgpt2', 
      result, 
      inference_time: new Date().toISOString()
    });
  } catch (err) {
    console.error('❌ Inference error:', err.message);
    res.status(500).json({ error: 'Errore durante inferenza', details: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n✅ IA Server avviato su porta ${PORT}`);
  console.log(`📌 Health: http://localhost:${PORT}/health`);
  console.log(`📌 Infer: POST http://localhost:${PORT}/infer\n`);
});
