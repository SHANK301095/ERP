const express = require('express');
const router  = express.Router();
const db      = require('../db/database');

// GET /api/variants?productId=...
router.get('/', (req, res) => {
  const { productId } = req.query;
  let sql = 'SELECT * FROM variants WHERE deleted = 0';
  const params = [];
  if (productId) { sql += ' AND product_id = ?'; params.push(productId); }
  sql += ' ORDER BY created_at ASC';
  res.json(db.prepare(sql).all(...params));
});

// Check SKU uniqueness
router.get('/check-sku', (req, res) => {
  const { sku, excludeId } = req.query;
  if (!sku) return res.json({ available: false, reason: 'No SKU provided' });
  let sql = 'SELECT id FROM variants WHERE sku = ? AND deleted = 0';
  const params = [sku.toUpperCase()];
  if (excludeId) { sql += ' AND id != ?'; params.push(excludeId); }
  const existing = db.prepare(sql).get(...params);
  res.json({ available: !existing });
});

// POST /api/variants  (single)
router.post('/', (req, res) => {
  const d = req.body;
  if (!d.id || !d.sku || !d.productId) return res.status(400).json({ error: 'id, sku, productId required' });

  const skuUpper = d.sku.toUpperCase();
  const conflict = db.prepare('SELECT id FROM variants WHERE sku = ? AND deleted = 0 AND id != ?').get(skuUpper, d.id);
  if (conflict) return res.status(409).json({ error: 'SKU already exists: ' + skuUpper });

  try {
    db.prepare(`
      INSERT INTO variants (id, product_id, sku, size, color, style, price_override, label_name_override, status, sort_order)
      VALUES (@id, @productId, @sku, @size, @color, @style, @priceOverride, @labelNameOverride, @status, @sortOrder)
    `).run({
      id: d.id, productId: d.productId, sku: skuUpper,
      size: d.size || '', color: d.color || '', style: d.style || '',
      priceOverride: d.priceOverride ? +d.priceOverride : null,
      labelNameOverride: d.labelNameOverride || '',
      status: d.status || 'active', sortOrder: d.sortOrder || 0
    });
    res.json({ ok: true, sku: skuUpper });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/variants/bulk  (array)
router.post('/bulk', (req, res) => {
  const variants = req.body;
  if (!Array.isArray(variants)) return res.status(400).json({ error: 'Expected array' });

  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO variants (id, product_id, sku, size, color, style, price_override, label_name_override, status, sort_order)
    VALUES (@id, @productId, @sku, @size, @color, @style, @priceOverride, @labelNameOverride, @status, @sortOrder)
  `);

  let added = 0, skipped = 0;
  const insertMany = db.transaction((rows) => {
    for (const d of rows) {
      const skuUpper = (d.sku || '').toUpperCase();
      const conflict = db.prepare('SELECT id FROM variants WHERE sku = ? AND deleted = 0').get(skuUpper);
      if (conflict) { skipped++; continue; }
      const result = insertStmt.run({
        id: d.id, productId: d.productId, sku: skuUpper,
        size: d.size || '', color: d.color || '', style: d.style || '',
        priceOverride: d.priceOverride ? +d.priceOverride : null,
        labelNameOverride: d.labelNameOverride || '',
        status: d.status || 'active', sortOrder: d.sortOrder || 0
      });
      if (result.changes) added++;
      else skipped++;
    }
  });

  try {
    insertMany(variants);
    res.json({ ok: true, added, skipped });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/variants/:id
router.put('/:id', (req, res) => {
  const d = req.body;
  const skuUpper = (d.sku || '').toUpperCase();
  const conflict = db.prepare('SELECT id FROM variants WHERE sku = ? AND deleted = 0 AND id != ?').get(skuUpper, req.params.id);
  if (conflict) return res.status(409).json({ error: 'SKU already exists: ' + skuUpper });

  try {
    db.prepare(`
      UPDATE variants SET
        sku = @sku, size = @size, color = @color, style = @style,
        price_override = @priceOverride, label_name_override = @labelNameOverride,
        status = @status, updated_at = datetime('now')
      WHERE id = @id AND deleted = 0
    `).run({
      id: req.params.id, sku: skuUpper, size: d.size || '', color: d.color || '',
      style: d.style || '', priceOverride: d.priceOverride ? +d.priceOverride : null,
      labelNameOverride: d.labelNameOverride || '', status: d.status || 'active'
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/variants/:id
router.delete('/:id', (req, res) => {
  db.prepare("UPDATE variants SET deleted = 1, updated_at = datetime('now') WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
