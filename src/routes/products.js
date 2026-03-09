const express = require('express');
const router  = express.Router();
const db      = require('../db/database');

// GET /api/products
router.get('/', (req, res) => {
  const { status, search } = req.query;
  let sql  = 'SELECT * FROM products WHERE deleted = 0';
  const params = [];
  if (status && status !== 'all') { sql += ' AND status = ?'; params.push(status); }
  if (search) { sql += ' AND (name LIKE ? OR family_code LIKE ? OR short_name LIKE ?)'; const s = '%' + search + '%'; params.push(s, s, s); }
  sql += ' ORDER BY created_at DESC';
  res.json(db.prepare(sql).all(...params));
});

// POST /api/products
router.post('/', (req, res) => {
  const d = req.body;
  if (!d.id || !d.name) return res.status(400).json({ error: 'id and name required' });
  if (!d.mrp || isNaN(+d.mrp)) return res.status(400).json({ error: 'valid mrp required' });
  try {
    db.prepare(`
      INSERT INTO products (id, name, short_name, family_code, category, subcategory, brand, mrp, discounted_price, gst, description, status)
      VALUES (@id, @name, @shortName, @familyCode, @category, @subcategory, @brand, @mrp, @discountedPrice, @gst, @description, @status)
    `).run({
      id: d.id, name: d.name, shortName: d.shortName || '',
      familyCode: d.familyCode || '', category: d.category || '',
      subcategory: d.subcategory || '', brand: d.brand || '',
      mrp: +d.mrp, discountedPrice: d.discountedPrice ? +d.discountedPrice : null,
      gst: +d.gst || 5, description: d.description || '', status: d.status || 'active'
    });
    res.json({ ok: true, id: d.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/products/:id
router.put('/:id', (req, res) => {
  const d = req.body;
  try {
    db.prepare(`
      UPDATE products SET
        name = @name, short_name = @shortName, family_code = @familyCode,
        category = @category, subcategory = @subcategory, brand = @brand,
        mrp = @mrp, discounted_price = @discountedPrice, gst = @gst,
        description = @description, status = @status,
        updated_at = datetime('now')
      WHERE id = @id AND deleted = 0
    `).run({
      id: req.params.id, name: d.name, shortName: d.shortName || '',
      familyCode: d.familyCode || '', category: d.category || '',
      subcategory: d.subcategory || '', brand: d.brand || '',
      mrp: +d.mrp, discountedPrice: d.discountedPrice ? +d.discountedPrice : null,
      gst: +d.gst || 5, description: d.description || '', status: d.status || 'active'
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/products/:id  (soft delete)
router.delete('/:id', (req, res) => {
  db.prepare("UPDATE products SET deleted = 1, updated_at = datetime('now') WHERE id = ?").run(req.params.id);
  db.prepare("UPDATE variants SET deleted = 1 WHERE product_id = ?").run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
