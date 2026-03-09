/**
 * src/db/database.js
 * SQLite database — creates file at ./data/labelforge.db on first run
 * Uses better-sqlite3 (synchronous, no async complexity)
 */

const Database = require('better-sqlite3');
const path     = require('path');
const fs       = require('fs');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DB_PATH  = path.join(DATA_DIR, 'labelforge.db');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(DB_PATH);

// Performance pragmas
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('synchronous = NORMAL');

// ── Schema ─────────────────────────────────────────────────────

db.exec(`
-- Settings (single row, id=1)
CREATE TABLE IF NOT EXISTS settings (
  id            INTEGER PRIMARY KEY DEFAULT 1,
  brand_name    TEXT    DEFAULT 'My Brand',
  brand_code    TEXT    DEFAULT 'MB',
  currency      TEXT    DEFAULT '₹',
  sku_format    TEXT    DEFAULT '{BRAND}-{FAMILY}-{VARIANT}',
  default_gst   INTEGER DEFAULT 5,
  updated_at    TEXT    DEFAULT (datetime('now'))
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id              TEXT    PRIMARY KEY,
  name            TEXT    NOT NULL,
  short_name      TEXT    DEFAULT '',
  family_code     TEXT    DEFAULT '',
  category        TEXT    DEFAULT '',
  subcategory     TEXT    DEFAULT '',
  brand           TEXT    DEFAULT '',
  mrp             REAL    NOT NULL DEFAULT 0,
  discounted_price REAL   DEFAULT NULL,
  gst             INTEGER DEFAULT 5,
  description     TEXT    DEFAULT '',
  status          TEXT    DEFAULT 'active',
  created_at      TEXT    DEFAULT (datetime('now')),
  updated_at      TEXT    DEFAULT (datetime('now')),
  deleted         INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status) WHERE deleted = 0;
CREATE INDEX IF NOT EXISTS idx_products_family ON products(family_code) WHERE deleted = 0;

-- Variants / SKUs
CREATE TABLE IF NOT EXISTS variants (
  id                  TEXT    PRIMARY KEY,
  product_id          TEXT    NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku                 TEXT    NOT NULL UNIQUE,
  size                TEXT    DEFAULT '',
  color               TEXT    DEFAULT '',
  style               TEXT    DEFAULT '',
  price_override      REAL    DEFAULT NULL,
  label_name_override TEXT    DEFAULT '',
  status              TEXT    DEFAULT 'active',
  sort_order          INTEGER DEFAULT 0,
  created_at          TEXT    DEFAULT (datetime('now')),
  updated_at          TEXT    DEFAULT (datetime('now')),
  deleted             INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_variants_product ON variants(product_id) WHERE deleted = 0;
CREATE UNIQUE INDEX IF NOT EXISTS idx_variants_sku ON variants(sku) WHERE deleted = 0;

-- Label Templates
CREATE TABLE IF NOT EXISTS templates (
  id                    TEXT    PRIMARY KEY,
  name                  TEXT    NOT NULL,
  description           TEXT    DEFAULT '',
  preset                TEXT    DEFAULT 'standard',
  page_width_mm         REAL    DEFAULT 210,
  page_height_mm        REAL    DEFAULT 297,
  margin_top_mm         REAL    DEFAULT 10,
  margin_right_mm       REAL    DEFAULT 8,
  margin_bottom_mm      REAL    DEFAULT 10,
  margin_left_mm        REAL    DEFAULT 10,
  label_width_mm        REAL    NOT NULL DEFAULT 62,
  label_height_mm       REAL    NOT NULL DEFAULT 38,
  gap_x_mm              REAL    DEFAULT 3,
  gap_y_mm              REAL    DEFAULT 3,
  show_brand            INTEGER DEFAULT 1,
  show_product_name     INTEGER DEFAULT 1,
  show_barcode          INTEGER DEFAULT 1,
  show_sku_text         INTEGER DEFAULT 1,
  show_size             INTEGER DEFAULT 1,
  show_color            INTEGER DEFAULT 0,
  show_mrp              INTEGER DEFAULT 1,
  show_discounted_price INTEGER DEFAULT 0,
  show_category         INTEGER DEFAULT 0,
  show_border           INTEGER DEFAULT 1,
  brand_font_size_pt    REAL    DEFAULT 7,
  name_font_size_pt     REAL    DEFAULT 8,
  price_font_size_pt    REAL    DEFAULT 11,
  size_font_size_pt     REAL    DEFAULT 8,
  sku_font_size_pt      REAL    DEFAULT 6,
  barcode_height_mm     REAL    DEFAULT 14,
  is_default            INTEGER DEFAULT 0,
  sort_order            INTEGER DEFAULT 0,
  field_overrides       TEXT    DEFAULT '{}',
  created_at            TEXT    DEFAULT (datetime('now')),
  updated_at            TEXT    DEFAULT (datetime('now')),
  deleted               INTEGER DEFAULT 0
);

-- Print Jobs
CREATE TABLE IF NOT EXISTS print_jobs (
  id            TEXT    PRIMARY KEY,
  name          TEXT    NOT NULL,
  template_id   TEXT,
  template_name TEXT    DEFAULT '',
  total_skus    INTEGER DEFAULT 0,
  total_labels  INTEGER DEFAULT 0,
  total_pages   INTEGER DEFAULT 0,
  items         TEXT    DEFAULT '[]',
  created_at    TEXT    DEFAULT (datetime('now')),
  printed_at    TEXT    DEFAULT NULL
);
CREATE INDEX IF NOT EXISTS idx_jobs_created ON print_jobs(created_at DESC);
`);

// ── Seed data (runs only if tables are empty) ──────────────────

const seedIfEmpty = db.transaction(() => {

  // Settings
  const settingsExist = db.prepare('SELECT id FROM settings WHERE id = 1').get();
  if (!settingsExist) {
    db.prepare(`
      INSERT INTO settings (id, brand_name, brand_code, currency, sku_format, default_gst)
      VALUES (1, 'Hari Vastra', 'HV', '₹', '{BRAND}-{FAMILY}-{VARIANT}', 5)
    `).run();
  }

  // Products
  const prodCount = db.prepare('SELECT COUNT(*) as c FROM products').get();
  if (prodCount.c === 0) {
    const insertProd = db.prepare(`
      INSERT INTO products (id, name, short_name, family_code, category, subcategory, brand, mrp, gst, status)
      VALUES (@id, @name, @shortName, @familyCode, @category, @subcategory, @brand, @mrp, @gst, @status)
    `);
    const insertVar = db.prepare(`
      INSERT INTO variants (id, product_id, sku, size, color, style, status)
      VALUES (@id, @productId, @sku, @size, @color, @style, @status)
    `);

    const products = [
      { id:'p1', name:'Pearl Stone Shringar Lehenga Patka', shortName:'Shringar Patka', familyCode:'HVK034', category:'Lehenga', subcategory:'Patka', brand:'Hari Vastra', mrp:349, gst:5, status:'active' },
      { id:'p2', name:'Royal Silk Dupatta with Zari Border', shortName:'Zari Dupatta', familyCode:'HVD012', category:'Dupatta', subcategory:'Silk', brand:'Hari Vastra', mrp:499, gst:5, status:'active' },
      { id:'p3', name:'Cotton Printed Kurta Fabric', shortName:'Kurta Fabric', familyCode:'HVF088', category:'Fabric', subcategory:'Cotton', brand:'Hari Vastra', mrp:229, gst:5, status:'active' },
    ];
    products.forEach(p => insertProd.run(p));

    const variants = [
      { id:'v1',  productId:'p1', sku:'HV-HVK034-2NO',  size:'2NO',  color:'', style:'', status:'active' },
      { id:'v2',  productId:'p1', sku:'HV-HVK034-3NO',  size:'3NO',  color:'', style:'', status:'active' },
      { id:'v3',  productId:'p1', sku:'HV-HVK034-4NO',  size:'4NO',  color:'', style:'', status:'active' },
      { id:'v4',  productId:'p1', sku:'HV-HVK034-5NO',  size:'5NO',  color:'', style:'', status:'active' },
      { id:'v5',  productId:'p1', sku:'HV-HVK034-6NO',  size:'6NO',  color:'', style:'', status:'active' },
      { id:'v6',  productId:'p2', sku:'HV-HVD012-RED',  size:'FREE', color:'Red',   style:'', status:'active' },
      { id:'v7',  productId:'p2', sku:'HV-HVD012-BLU',  size:'FREE', color:'Blue',  style:'', status:'active' },
      { id:'v8',  productId:'p2', sku:'HV-HVD012-GRN',  size:'FREE', color:'Green', style:'', status:'active' },
      { id:'v9',  productId:'p3', sku:'HV-HVF088-1MB',  size:'1M',   color:'Blue Print', style:'', status:'active' },
      { id:'v10', productId:'p3', sku:'HV-HVF088-25B',  size:'2.5M', color:'Blue Print', style:'', status:'active' },
    ];
    variants.forEach(v => insertVar.run(v));
  }

  // Templates
  const tmplCount = db.prepare('SELECT COUNT(*) as c FROM templates').get();
  if (tmplCount.c === 0) {
    const insertTmpl = db.prepare(`
      INSERT INTO templates (
        id, name, description, preset,
        label_width_mm, label_height_mm, gap_x_mm, gap_y_mm,
        margin_top_mm, margin_right_mm, margin_bottom_mm, margin_left_mm,
        show_brand, show_product_name, show_barcode, show_sku_text,
        show_size, show_color, show_mrp, show_discounted_price, show_category, show_border,
        brand_font_size_pt, name_font_size_pt, price_font_size_pt,
        size_font_size_pt, sku_font_size_pt, barcode_height_mm,
        is_default, sort_order
      ) VALUES (
        @id, @name, @description, @preset,
        @labelWidthMm, @labelHeightMm, @gapXMm, @gapYMm,
        @marginTopMm, @marginRightMm, @marginBottomMm, @marginLeftMm,
        @showBrand, @showProductName, @showBarcode, @showSkuText,
        @showSize, @showColor, @showMrp, @showDiscountedPrice, @showCategory, @showBorder,
        @brandFontSizePt, @nameFontSizePt, @priceFontSizePt,
        @sizeFontSizePt, @skuFontSizePt, @barcodeHeightMm,
        @isDefault, @sortOrder
      )
    `);

    const templates = [
      { id:'t1', name:'Standard Retail Label', description:'62×38mm · 3×7 = 21 labels per A4 page', preset:'standard', labelWidthMm:62, labelHeightMm:38, gapXMm:3, gapYMm:3, marginTopMm:10, marginRightMm:8, marginBottomMm:10, marginLeftMm:10, showBrand:1, showProductName:1, showBarcode:1, showSkuText:1, showSize:1, showColor:0, showMrp:1, showDiscountedPrice:0, showCategory:0, showBorder:1, brandFontSizePt:7, nameFontSizePt:8, priceFontSizePt:11, sizeFontSizePt:8, skuFontSizePt:6, barcodeHeightMm:14, isDefault:1, sortOrder:1 },
      { id:'t2', name:'Barcode Only Strip', description:'62×25mm · 3×10 = 30 labels per A4 page', preset:'barcode_only', labelWidthMm:62, labelHeightMm:25, gapXMm:3, gapYMm:3, marginTopMm:12, marginRightMm:8, marginBottomMm:10, marginLeftMm:8, showBrand:0, showProductName:0, showBarcode:1, showSkuText:1, showSize:1, showColor:0, showMrp:1, showDiscountedPrice:0, showCategory:0, showBorder:1, brandFontSizePt:0, nameFontSizePt:0, priceFontSizePt:9, sizeFontSizePt:8, skuFontSizePt:6, barcodeHeightMm:12, isDefault:0, sortOrder:2 },
      { id:'t3', name:'Premium Hang Tag', description:'90×55mm · 2×5 = 10 labels per A4 page', preset:'premium', labelWidthMm:90, labelHeightMm:55, gapXMm:5, gapYMm:5, marginTopMm:15, marginRightMm:10, marginBottomMm:10, marginLeftMm:10, showBrand:1, showProductName:1, showBarcode:1, showSkuText:1, showSize:1, showColor:1, showMrp:1, showDiscountedPrice:1, showCategory:1, showBorder:1, brandFontSizePt:9, nameFontSizePt:11, priceFontSizePt:13, sizeFontSizePt:9, skuFontSizePt:7, barcodeHeightMm:20, isDefault:0, sortOrder:3 },
      { id:'t4', name:'Small Sticker', description:'38×25mm · 5×11 = 55 labels per A4 page', preset:'small', labelWidthMm:38, labelHeightMm:25, gapXMm:2, gapYMm:2, marginTopMm:8, marginRightMm:5, marginBottomMm:8, marginLeftMm:5, showBrand:0, showProductName:0, showBarcode:1, showSkuText:1, showSize:1, showColor:0, showMrp:1, showDiscountedPrice:0, showCategory:0, showBorder:0, brandFontSizePt:0, nameFontSizePt:0, priceFontSizePt:8, sizeFontSizePt:7, skuFontSizePt:5, barcodeHeightMm:10, isDefault:0, sortOrder:4 },
    ];
    templates.forEach(t => insertTmpl.run(t));
  }
});

seedIfEmpty();

module.exports = db;
