const express = require('express');
const router  = express.Router();
const db      = require('../db/database');

router.get('/', (req, res) => {
  const row = db.prepare('SELECT * FROM settings WHERE id = 1').get();
  res.json(row || {});
});

router.post('/', (req, res) => {
  const d = req.body;
  try {
    db.prepare(`
      INSERT INTO settings (id, brand_name, brand_code, currency, sku_format, default_gst)
      VALUES (1, @brandName, @brandCode, @currency, @skuFormat, @defaultGst)
      ON CONFLICT(id) DO UPDATE SET
        brand_name  = @brandName,
        brand_code  = @brandCode,
        currency    = @currency,
        sku_format  = @skuFormat,
        default_gst = @defaultGst,
        updated_at  = datetime('now')
    `).run({
      brandName: d.brandName || 'My Brand',
      brandCode: (d.brandCode || 'MB').toUpperCase(),
      currency:  d.currency  || '₹',
      skuFormat: d.skuFormat || '{BRAND}-{FAMILY}-{VARIANT}',
      defaultGst: +d.defaultGst || 5
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
