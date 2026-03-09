/**
 * LabelForge Pro — Local Server
 * Run: npm install && npm start
 * Open: http://localhost:3000
 */

const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ─────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── Routes ─────────────────────────────────────────────────────
app.use('/api/settings',  require('./src/routes/settings'));
app.use('/api/products',  require('./src/routes/products'));
app.use('/api/variants',  require('./src/routes/variants'));
app.use('/api/templates', require('./src/routes/templates'));
app.use('/api/jobs',      require('./src/routes/jobs'));

// Single combined load endpoint — frontend calls this once on start
app.get('/api/all', (req, res) => {
  const db = require('./src/db/database');
  try {
    const settings  = db.prepare('SELECT * FROM settings WHERE id = 1').get() || {};
    const products  = db.prepare('SELECT * FROM products  WHERE deleted = 0 ORDER BY created_at DESC').all();
    const variants  = db.prepare('SELECT * FROM variants  WHERE deleted = 0 ORDER BY created_at ASC').all();
    const templates = db.prepare('SELECT * FROM templates WHERE deleted = 0 ORDER BY sort_order ASC, created_at ASC').all();
    const jobs      = db.prepare('SELECT * FROM print_jobs ORDER BY created_at DESC LIMIT 200').all();

    // Parse JSON fields that were stored as strings
    const parseJSON = (arr, fields) => arr.map(r => {
      const out = { ...r };
      fields.forEach(f => { try { if (out[f]) out[f] = JSON.parse(out[f]); } catch {} });
      return out;
    });

    res.json({
      settings: { ...settings, _loaded: true },
      products:  products,
      variants:  variants,
      templates: parseJSON(templates, ['field_overrides']),
      jobs:      parseJSON(jobs, ['items']),
    });
  } catch (err) {
    console.error('GET /api/all error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Catch-all → serve React SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Boot ───────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════╗');
  console.log('  ║   LabelForge Pro — Server Running    ║');
  console.log(`  ║   http://localhost:${PORT}             ║`);
  console.log('  ║   Press Ctrl+C to stop               ║');
  console.log('  ╚══════════════════════════════════════╝');
  console.log('');
});
