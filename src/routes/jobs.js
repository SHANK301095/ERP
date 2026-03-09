const express = require('express');
const router  = express.Router();
const db      = require('../db/database');

router.get('/', (req, res) => {
  const jobs = db.prepare('SELECT * FROM print_jobs ORDER BY created_at DESC LIMIT 500').all();
  res.json(jobs.map(j => ({ ...j, items: tryParse(j.items, []) })));
});

router.post('/', (req, res) => {
  const d = req.body;
  if (!d.id || !d.name) return res.status(400).json({ error: 'id and name required' });
  try {
    db.prepare(`
      INSERT INTO print_jobs (id, name, template_id, template_name, total_skus, total_labels, total_pages, items, printed_at)
      VALUES (@id, @name, @templateId, @templateName, @totalSkus, @totalLabels, @totalPages, @items, datetime('now'))
    `).run({
      id: d.id, name: d.name,
      templateId: d.templateId || null, templateName: d.templateName || '',
      totalSkus: +d.totalSkus || 0, totalLabels: +d.totalLabels || 0,
      totalPages: +d.totalPages || 0,
      items: JSON.stringify(d.items || [])
    });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM print_jobs WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

function tryParse(str, fallback) {
  try { return str ? JSON.parse(str) : fallback; } catch { return fallback; }
}

module.exports = router;
