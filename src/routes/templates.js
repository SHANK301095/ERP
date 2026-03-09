// ─── src/routes/templates.js ────────────────────────────────────────────────
const express = require('express');
const router  = express.Router();
const db      = require('../db/database');

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM templates WHERE deleted = 0 ORDER BY sort_order ASC, created_at ASC').all());
});

router.post('/', (req, res) => {
  const d = req.body;
  if (!d.id || !d.name) return res.status(400).json({ error: 'id and name required' });
  try {
    db.prepare(`
      INSERT INTO templates (
        id, name, description, preset,
        page_width_mm, page_height_mm, margin_top_mm, margin_right_mm, margin_bottom_mm, margin_left_mm,
        label_width_mm, label_height_mm, gap_x_mm, gap_y_mm,
        show_brand, show_product_name, show_barcode, show_sku_text,
        show_size, show_color, show_mrp, show_discounted_price, show_category, show_border,
        brand_font_size_pt, name_font_size_pt, price_font_size_pt, size_font_size_pt, sku_font_size_pt,
        barcode_height_mm, is_default, sort_order
      ) VALUES (
        @id, @name, @description, @preset,
        @pageWidthMm, @pageHeightMm, @marginTopMm, @marginRightMm, @marginBottomMm, @marginLeftMm,
        @labelWidthMm, @labelHeightMm, @gapXMm, @gapYMm,
        @showBrand, @showProductName, @showBarcode, @showSkuText,
        @showSize, @showColor, @showMrp, @showDiscountedPrice, @showCategory, @showBorder,
        @brandFontSizePt, @nameFontSizePt, @priceFontSizePt, @sizeFontSizePt, @skuFontSizePt,
        @barcodeHeightMm, @isDefault, @sortOrder
      )
    `).run(mapTemplate(d));
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', (req, res) => {
  const d = { ...req.body, id: req.params.id };
  try {
    db.prepare(`
      UPDATE templates SET
        name = @name, description = @description, preset = @preset,
        page_width_mm = @pageWidthMm, page_height_mm = @pageHeightMm,
        margin_top_mm = @marginTopMm, margin_right_mm = @marginRightMm,
        margin_bottom_mm = @marginBottomMm, margin_left_mm = @marginLeftMm,
        label_width_mm = @labelWidthMm, label_height_mm = @labelHeightMm,
        gap_x_mm = @gapXMm, gap_y_mm = @gapYMm,
        show_brand = @showBrand, show_product_name = @showProductName,
        show_barcode = @showBarcode, show_sku_text = @showSkuText,
        show_size = @showSize, show_color = @showColor, show_mrp = @showMrp,
        show_discounted_price = @showDiscountedPrice, show_category = @showCategory,
        show_border = @showBorder,
        brand_font_size_pt = @brandFontSizePt, name_font_size_pt = @nameFontSizePt,
        price_font_size_pt = @priceFontSizePt, size_font_size_pt = @sizeFontSizePt,
        sku_font_size_pt = @skuFontSizePt, barcode_height_mm = @barcodeHeightMm,
        is_default = @isDefault, updated_at = datetime('now')
      WHERE id = @id AND deleted = 0
    `).run(mapTemplate(d));
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', (req, res) => {
  db.prepare("UPDATE templates SET deleted = 1 WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

function mapTemplate(d) {
  return {
    id: d.id, name: d.name, description: d.description || '', preset: d.preset || 'standard',
    pageWidthMm: +d.pageWidthMm || 210, pageHeightMm: +d.pageHeightMm || 297,
    marginTopMm: +d.marginTopMm || 10, marginRightMm: +d.marginRightMm || 8,
    marginBottomMm: +d.marginBottomMm || 10, marginLeftMm: +d.marginLeftMm || 10,
    labelWidthMm: +d.labelWidthMm || 62, labelHeightMm: +d.labelHeightMm || 38,
    gapXMm: +d.gapXMm || 3, gapYMm: +d.gapYMm || 3,
    showBrand: d.showBrand ? 1 : 0, showProductName: d.showProductName ? 1 : 0,
    showBarcode: d.showBarcode ? 1 : 0, showSkuText: d.showSkuText ? 1 : 0,
    showSize: d.showSize ? 1 : 0, showColor: d.showColor ? 1 : 0,
    showMrp: d.showMrp ? 1 : 0, showDiscountedPrice: d.showDiscountedPrice ? 1 : 0,
    showCategory: d.showCategory ? 1 : 0, showBorder: d.showBorder ? 1 : 0,
    brandFontSizePt: +d.brandFontSizePt || 7, nameFontSizePt: +d.nameFontSizePt || 8,
    priceFontSizePt: +d.priceFontSizePt || 11, sizeFontSizePt: +d.sizeFontSizePt || 8,
    skuFontSizePt: +d.skuFontSizePt || 6, barcodeHeightMm: +d.barcodeHeightMm || 14,
    isDefault: d.isDefault ? 1 : 0, sortOrder: +d.sortOrder || 0,
  };
}

module.exports = router;
