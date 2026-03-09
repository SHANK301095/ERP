-- ============================================================
-- LABELFORGE PRO — COMPLETE DATABASE SCHEMA
-- PostgreSQL 15+ / Supabase
-- Run this in Supabase SQL Editor in sequence
-- ============================================================

-- EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- ENUM TYPES
-- ============================================================
DO $$ BEGIN
    CREATE TYPE product_status   AS ENUM ('active', 'inactive', 'archived');
    CREATE TYPE variant_status   AS ENUM ('active', 'inactive', 'discontinued');
    CREATE TYPE print_job_status AS ENUM ('draft', 'queued', 'printed', 'cancelled');
    CREATE TYPE import_status    AS ENUM ('pending', 'processing', 'completed', 'failed');
    CREATE TYPE barcode_format   AS ENUM ('CODE128', 'EAN13', 'QR', 'CODE39');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- BRANDS
-- ============================================================
CREATE TABLE IF NOT EXISTS brands (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            TEXT NOT NULL,
    code            TEXT NOT NULL UNIQUE CHECK (length(code) BETWEEN 2 AND 10),
    logo_url        TEXT,
    tagline         TEXT,
    address         TEXT,
    phone           TEXT,
    email           TEXT,
    website         TEXT,
    gstin           TEXT,
    currency        TEXT DEFAULT '₹' CHECK (length(currency) <= 3),
    meta            JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_brands_code ON brands(code) WHERE deleted_at IS NULL;

-- ============================================================
-- CATEGORIES (hierarchical)
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id        UUID REFERENCES brands(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    slug            TEXT NOT NULL,
    parent_id       UUID REFERENCES categories(id) ON DELETE SET NULL,
    sort_order      INT DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(brand_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_categories_brand ON categories(brand_id);

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id            UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    category_id         UUID REFERENCES categories(id) ON DELETE SET NULL,

    -- Identification
    name                TEXT NOT NULL CHECK (length(name) BETWEEN 2 AND 200),
    short_name          TEXT CHECK (length(short_name) <= 60),
    family_code         TEXT,

    -- Classification
    subcategory         TEXT,
    tags                TEXT[] DEFAULT '{}',

    -- Pricing
    mrp                 NUMERIC(10,2) NOT NULL CHECK (mrp > 0),
    discounted_price    NUMERIC(10,2) CHECK (
                            discounted_price IS NULL
                            OR discounted_price > 0
                            AND discounted_price <= mrp
                        ),
    gst_percent         NUMERIC(5,2) DEFAULT 5 CHECK (gst_percent IN (0, 5, 12, 18, 28)),

    -- Content
    description         TEXT,
    notes               TEXT,

    -- State
    status              product_status DEFAULT 'active',

    -- Audit
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ,
    created_by          UUID,

    meta                JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_products_brand      ON products(brand_id)      WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_status     ON products(status)        WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_family     ON products(family_code)   WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_category   ON products(category_id)   WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_fts ON products USING gin(
    to_tsvector('simple',
        name
        || ' ' || COALESCE(short_name, '')
        || ' ' || COALESCE(family_code, '')
        || ' ' || COALESCE(subcategory, '')
    )
) WHERE deleted_at IS NULL;

-- ============================================================
-- PRODUCT VARIANTS
-- ============================================================
CREATE TABLE IF NOT EXISTS product_variants (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id          UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,

    -- SKU (primary business identifier)
    sku                 TEXT NOT NULL,
    barcode_value       TEXT,
    barcode_format      barcode_format DEFAULT 'CODE128',

    -- Variant dimensions
    size                TEXT,
    color               TEXT,
    fabric              TEXT,
    style               TEXT,
    pack_size           TEXT,
    custom_attrs        JSONB DEFAULT '{}',

    -- Pricing (null = inherit from product)
    price_override      NUMERIC(10,2) CHECK (price_override IS NULL OR price_override > 0),

    -- Label override
    label_name_override TEXT,

    -- State
    status              variant_status DEFAULT 'active',
    sort_order          INT DEFAULT 0,

    -- Audit
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT uq_variant_sku UNIQUE (sku),
    CONSTRAINT valid_sku_format CHECK (
        sku ~ '^[A-Z0-9][A-Z0-9\-\.]*[A-Z0-9]$'
        OR length(sku) <= 4
    ),
    CONSTRAINT valid_sku_length CHECK (length(sku) BETWEEN 3 AND 50)
);

CREATE INDEX IF NOT EXISTS idx_variants_product    ON product_variants(product_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_variants_sku        ON product_variants(sku)        WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_variants_status     ON product_variants(status)     WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_variants_fts ON product_variants USING gin(
    to_tsvector('simple', sku || ' ' || COALESCE(size,'') || ' ' || COALESCE(color,''))
) WHERE deleted_at IS NULL;

-- ============================================================
-- SKU AUTO-SEQUENCES
-- ============================================================
CREATE TABLE IF NOT EXISTS sku_sequences (
    product_id          UUID PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
    last_sequence       INT DEFAULT 0,
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SKU CONFIGURATION (per brand)
-- ============================================================
CREATE TABLE IF NOT EXISTS sku_configs (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id                UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,

    format_template         TEXT DEFAULT '{BRAND}-{FAMILY}-{VARIANT}',
    separator               TEXT DEFAULT '-',
    uppercase               BOOLEAN DEFAULT TRUE,

    brand_token_length      INT DEFAULT 2   CHECK (brand_token_length  BETWEEN 1 AND 10),
    family_token_length     INT DEFAULT 6   CHECK (family_token_length BETWEEN 1 AND 20),
    variant_token_length    INT DEFAULT 6   CHECK (variant_token_length BETWEEN 1 AND 10),

    strip_separators_in_family BOOLEAN DEFAULT TRUE,
    auto_suffix_on_conflict    BOOLEAN DEFAULT TRUE,

    UNIQUE(brand_id),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- LABEL TEMPLATES
-- ============================================================
CREATE TABLE IF NOT EXISTS label_templates (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id                UUID REFERENCES brands(id) ON DELETE SET NULL,

    name                    TEXT NOT NULL,
    description             TEXT,
    preset_key              TEXT,   -- 'standard', 'barcode_only', 'premium', etc.

    -- Page settings
    page_size               TEXT DEFAULT 'A4',
    page_width_mm           NUMERIC(8,2) DEFAULT 210,
    page_height_mm          NUMERIC(8,2) DEFAULT 297,
    margin_top_mm           NUMERIC(8,2) DEFAULT 10,
    margin_right_mm         NUMERIC(8,2) DEFAULT 10,
    margin_bottom_mm        NUMERIC(8,2) DEFAULT 10,
    margin_left_mm          NUMERIC(8,2) DEFAULT 10,

    -- Label dimensions
    label_width_mm          NUMERIC(8,2) NOT NULL CHECK (label_width_mm  BETWEEN 10 AND 210),
    label_height_mm         NUMERIC(8,2) NOT NULL CHECK (label_height_mm BETWEEN 10 AND 297),
    gap_x_mm                NUMERIC(8,2) DEFAULT 3 CHECK (gap_x_mm >= 0),
    gap_y_mm                NUMERIC(8,2) DEFAULT 3 CHECK (gap_y_mm >= 0),

    -- Grid (computed, stored for reference)
    cols                    INT CHECK (cols > 0),
    rows                    INT CHECK (rows > 0),

    -- Field visibility
    show_brand              BOOLEAN DEFAULT TRUE,
    show_product_name       BOOLEAN DEFAULT TRUE,
    show_short_name         BOOLEAN DEFAULT TRUE,
    show_barcode            BOOLEAN DEFAULT TRUE,
    show_sku_text           BOOLEAN DEFAULT TRUE,
    show_size               BOOLEAN DEFAULT TRUE,
    show_color              BOOLEAN DEFAULT FALSE,
    show_mrp                BOOLEAN DEFAULT TRUE,
    show_discounted_price   BOOLEAN DEFAULT FALSE,
    show_category           BOOLEAN DEFAULT FALSE,
    show_gstin              BOOLEAN DEFAULT FALSE,
    show_border             BOOLEAN DEFAULT TRUE,

    -- Typography
    font_family             TEXT DEFAULT 'helvetica',
    brand_font_size         NUMERIC(5,2) DEFAULT 7,
    name_font_size          NUMERIC(5,2) DEFAULT 8,
    price_font_size         NUMERIC(5,2) DEFAULT 10,
    size_font_size          NUMERIC(5,2) DEFAULT 8,
    sku_font_size           NUMERIC(5,2) DEFAULT 6,

    -- Barcode
    barcode_height_mm       NUMERIC(8,2) DEFAULT 12,
    barcode_width_factor    NUMERIC(5,2) DEFAULT 1.2,
    barcode_format          barcode_format DEFAULT 'CODE128',

    -- Layout
    layout_style            TEXT DEFAULT 'standard',

    -- Advanced: field-level overrides stored as JSON
    field_overrides         JSONB DEFAULT '{}',

    -- State
    is_default              BOOLEAN DEFAULT FALSE,
    is_active               BOOLEAN DEFAULT TRUE,
    sort_order              INT DEFAULT 0,

    -- Audit
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW(),

    meta                    JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_templates_brand ON label_templates(brand_id) WHERE is_active;

-- Ensure only one default per brand
CREATE UNIQUE INDEX IF NOT EXISTS uq_template_default
    ON label_templates(brand_id) WHERE is_default = TRUE AND is_active = TRUE;

-- ============================================================
-- PRINT JOBS
-- ============================================================
CREATE TABLE IF NOT EXISTS print_jobs (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id            UUID REFERENCES brands(id),
    template_id         UUID REFERENCES label_templates(id) ON DELETE SET NULL,

    name                TEXT NOT NULL,
    status              print_job_status DEFAULT 'draft',

    -- Full snapshot of template at print time (for exact reprints)
    template_snapshot   JSONB,

    -- Counts
    total_skus          INT DEFAULT 0 CHECK (total_skus >= 0),
    total_labels        INT DEFAULT 0 CHECK (total_labels >= 0),
    total_pages         INT DEFAULT 0 CHECK (total_pages >= 0),

    -- Output
    pdf_url             TEXT,
    pdf_size_bytes      INT,

    -- Audit
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    printed_at          TIMESTAMPTZ,
    created_by          UUID,

    notes               TEXT
);

CREATE INDEX IF NOT EXISTS idx_jobs_brand ON print_jobs(brand_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON print_jobs(status) WHERE status != 'cancelled';

-- ============================================================
-- PRINT JOB LINE ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS print_job_items (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id              UUID NOT NULL REFERENCES print_jobs(id) ON DELETE CASCADE,
    variant_id          UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,

    quantity            INT NOT NULL DEFAULT 1 CHECK (quantity BETWEEN 1 AND 9999),
    sort_order          INT DEFAULT 0,

    -- Snapshot for reprint fidelity
    variant_snapshot    JSONB,

    created_at          TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(job_id, variant_id)
);

CREATE INDEX IF NOT EXISTS idx_job_items_job     ON print_job_items(job_id);
CREATE INDEX IF NOT EXISTS idx_job_items_variant ON print_job_items(variant_id);

-- ============================================================
-- IMPORT JOBS
-- ============================================================
CREATE TABLE IF NOT EXISTS import_jobs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id        UUID REFERENCES brands(id),
    type            TEXT NOT NULL CHECK (type IN ('products', 'variants', 'full_catalog', 'price_update')),
    filename        TEXT,
    status          import_status DEFAULT 'pending',
    total_rows      INT DEFAULT 0,
    processed_rows  INT DEFAULT 0,
    success_rows    INT DEFAULT 0,
    error_rows      INT DEFAULT 0,
    errors          JSONB DEFAULT '[]',
    warnings        JSONB DEFAULT '[]',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    completed_at    TIMESTAMPTZ
);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION fn_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to relevant tables
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['brands','products','product_variants','label_templates','print_jobs','sku_configs'] LOOP
        EXECUTE format(
            'DROP TRIGGER IF EXISTS trg_%s_updated_at ON %s;
             CREATE TRIGGER trg_%s_updated_at
             BEFORE UPDATE ON %s
             FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();',
            t, t, t, t
        );
    END LOOP;
END $$;

-- Atomic sequence for SKU generation
CREATE OR REPLACE FUNCTION fn_next_sku_seq(p_product_id UUID)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
    next_seq INT;
BEGIN
    INSERT INTO sku_sequences(product_id, last_sequence)
    VALUES (p_product_id, 1)
    ON CONFLICT (product_id)
    DO UPDATE SET
        last_sequence = sku_sequences.last_sequence + 1,
        updated_at    = NOW()
    RETURNING last_sequence INTO next_seq;

    RETURN next_seq;
END;
$$;

-- Check SKU availability
CREATE OR REPLACE FUNCTION fn_is_sku_available(
    p_sku        TEXT,
    p_exclude_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
    SELECT NOT EXISTS (
        SELECT 1
        FROM product_variants
        WHERE sku         = p_sku
          AND deleted_at  IS NULL
          AND (p_exclude_id IS NULL OR id != p_exclude_id)
    );
$$;

-- Get computed variant price (falls back to product MRP)
CREATE OR REPLACE FUNCTION fn_variant_price(
    p_variant_id UUID
)
RETURNS NUMERIC
LANGUAGE sql
STABLE
AS $$
    SELECT COALESCE(v.price_override, p.mrp)
    FROM product_variants v
    JOIN products p ON p.id = v.product_id
    WHERE v.id = p_variant_id;
$$;

-- Full-text search across products + variants
CREATE OR REPLACE FUNCTION fn_search_catalog(
    p_brand_id  UUID,
    p_query     TEXT,
    p_limit     INT DEFAULT 50
)
RETURNS TABLE(
    product_id      UUID,
    product_name    TEXT,
    family_code     TEXT,
    variant_id      UUID,
    sku             TEXT,
    size            TEXT,
    color           TEXT,
    price           NUMERIC,
    rank            REAL
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        p.id,
        p.name,
        p.family_code,
        v.id,
        v.sku,
        v.size,
        v.color,
        COALESCE(v.price_override, p.mrp),
        ts_rank(
            to_tsvector('simple',
                p.name || ' ' || COALESCE(p.family_code,'') || ' ' || v.sku
            ),
            plainto_tsquery('simple', p_query)
        ) AS rank
    FROM product_variants v
    JOIN products p ON p.id = v.product_id
    WHERE p.brand_id    = p_brand_id
      AND p.deleted_at  IS NULL
      AND v.deleted_at  IS NULL
      AND v.status      = 'active'
      AND (
            v.sku ILIKE '%' || p_query || '%'
          OR p.name ILIKE '%' || p_query || '%'
          OR p.family_code ILIKE '%' || p_query || '%'
      )
    ORDER BY rank DESC, p.name
    LIMIT p_limit;
$$;

-- ============================================================
-- ROW LEVEL SECURITY (for Supabase multi-user)
-- ============================================================
ALTER TABLE brands          ENABLE ROW LEVEL SECURITY;
ALTER TABLE products        ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE label_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE print_jobs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE print_job_items ENABLE ROW LEVEL SECURITY;

-- Policies: authenticated users can read/write their brand's data
-- In a single-brand setup, all authenticated users see all data.
-- Extend this for multi-brand/multi-user role separation.

CREATE POLICY "allow_all_authenticated" ON brands
    FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "allow_all_authenticated" ON products
    FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "allow_all_authenticated" ON product_variants
    FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "allow_all_authenticated" ON label_templates
    FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "allow_all_authenticated" ON print_jobs
    FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "allow_all_authenticated" ON print_job_items
    FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- ============================================================
-- SEED DATA — Default Brand + Config + Templates
-- ============================================================
DO $$
DECLARE
    brand_id UUID := 'b1000000-0000-0000-0000-000000000001';
BEGIN
    -- Default brand
    INSERT INTO brands (id, name, code, currency)
    VALUES (brand_id, 'Hari Vastra', 'HV', '₹')
    ON CONFLICT (id) DO NOTHING;

    -- SKU config
    INSERT INTO sku_configs (brand_id, format_template, separator)
    VALUES (brand_id, '{BRAND}-{FAMILY}-{VARIANT}', '-')
    ON CONFLICT (brand_id) DO NOTHING;

    -- Default categories
    INSERT INTO categories (brand_id, name, slug) VALUES
        (brand_id, 'Lehenga',   'lehenga'),
        (brand_id, 'Dupatta',   'dupatta'),
        (brand_id, 'Saree',     'saree'),
        (brand_id, 'Fabric',    'fabric'),
        (brand_id, 'Kurta',     'kurta'),
        (brand_id, 'Accessories', 'accessories')
    ON CONFLICT (brand_id, slug) DO NOTHING;

    -- Standard Retail Label (62×38mm, 3×7 = 21/page)
    INSERT INTO label_templates (
        brand_id, name, description, preset_key,
        label_width_mm, label_height_mm, cols, rows,
        margin_top_mm, margin_left_mm, gap_x_mm, gap_y_mm,
        show_brand, show_product_name, show_barcode, show_sku_text,
        show_size, show_mrp, show_border,
        brand_font_size, name_font_size, price_font_size, sku_font_size,
        barcode_height_mm, is_default
    ) VALUES (
        brand_id,
        'Standard Retail Label', '62×38mm · 3 cols × 7 rows · 21 labels per A4 page',
        'standard',
        62, 38, 3, 7, 10, 10, 3, 3,
        TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE,
        7, 8, 11, 6, 14, TRUE
    ) ON CONFLICT DO NOTHING;

    -- Barcode Only (62×25mm, 3×10)
    INSERT INTO label_templates (
        brand_id, name, description, preset_key,
        label_width_mm, label_height_mm, cols, rows,
        margin_top_mm, margin_left_mm, gap_x_mm, gap_y_mm,
        show_brand, show_product_name, show_barcode, show_sku_text,
        show_size, show_mrp, show_border,
        brand_font_size, name_font_size, price_font_size, sku_font_size,
        barcode_height_mm, is_default
    ) VALUES (
        brand_id,
        'Barcode Only Label', '62×25mm · 3 cols × 10 rows · 30 labels per A4 page',
        'barcode_only',
        62, 25, 3, 10, 12, 8, 3, 3,
        FALSE, FALSE, TRUE, TRUE, TRUE, TRUE, TRUE,
        0, 0, 9, 6, 12, FALSE
    ) ON CONFLICT DO NOTHING;

    -- Premium Hang Tag (90×55mm, 2×5)
    INSERT INTO label_templates (
        brand_id, name, description, preset_key,
        label_width_mm, label_height_mm, cols, rows,
        margin_top_mm, margin_left_mm, gap_x_mm, gap_y_mm,
        show_brand, show_product_name, show_barcode, show_sku_text,
        show_size, show_mrp, show_color, show_border,
        brand_font_size, name_font_size, price_font_size, sku_font_size,
        barcode_height_mm, is_default
    ) VALUES (
        brand_id,
        'Premium Hang Tag', '90×55mm · 2 cols × 5 rows · 10 labels per A4 page',
        'premium',
        90, 55, 2, 5, 15, 10, 5, 5,
        TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE,
        9, 11, 13, 7, 20, FALSE
    ) ON CONFLICT DO NOTHING;

    -- Small Sticker (38×25mm, 5×11)
    INSERT INTO label_templates (
        brand_id, name, description, preset_key,
        label_width_mm, label_height_mm, cols, rows,
        margin_top_mm, margin_left_mm, gap_x_mm, gap_y_mm,
        show_brand, show_product_name, show_barcode, show_sku_text,
        show_size, show_mrp, show_border,
        brand_font_size, name_font_size, price_font_size, sku_font_size,
        barcode_height_mm, is_default
    ) VALUES (
        brand_id,
        'Small Sticker', '38×25mm · 5 cols × 11 rows · 55 labels per A4 page',
        'small',
        38, 25, 5, 11, 8, 5, 2, 2,
        FALSE, FALSE, TRUE, TRUE, TRUE, TRUE, FALSE,
        5, 6, 8, 5, 10, FALSE
    ) ON CONFLICT DO NOTHING;

END $$;

-- ============================================================
-- VIEWS — useful for frontend queries
-- ============================================================

-- v_variants_full: join variants with product and brand data
CREATE OR REPLACE VIEW v_variants_full AS
SELECT
    v.id                AS variant_id,
    v.sku,
    v.barcode_value,
    v.size,
    v.color,
    v.fabric,
    v.style,
    v.pack_size,
    v.custom_attrs,
    v.price_override,
    v.label_name_override,
    v.status            AS variant_status,
    v.sort_order,
    v.created_at        AS variant_created_at,

    p.id                AS product_id,
    p.name              AS product_name,
    p.short_name        AS product_short_name,
    p.family_code,
    p.mrp,
    p.discounted_price,
    p.gst_percent,
    p.status            AS product_status,

    b.id                AS brand_id,
    b.name              AS brand_name,
    b.code              AS brand_code,
    b.currency,

    COALESCE(v.price_override, p.mrp) AS effective_price,
    COALESCE(v.label_name_override, p.short_name, p.name) AS effective_label_name
FROM
    product_variants v
    JOIN products p  ON p.id = v.product_id
    JOIN brands b    ON b.id = p.brand_id
WHERE
    v.deleted_at IS NULL
    AND p.deleted_at IS NULL;

-- v_print_job_summary: job stats
CREATE OR REPLACE VIEW v_print_job_summary AS
SELECT
    j.id,
    j.name,
    j.status,
    j.created_at,
    j.printed_at,
    j.total_skus,
    j.total_labels,
    j.total_pages,
    j.pdf_url,
    t.name   AS template_name,
    b.name   AS brand_name,
    COUNT(i.id) AS item_count
FROM print_jobs j
LEFT JOIN label_templates t ON t.id = j.template_id
LEFT JOIN brands b          ON b.id = j.brand_id
LEFT JOIN print_job_items i ON i.job_id = j.id
GROUP BY j.id, t.name, b.name;

-- ============================================================
-- END OF SCHEMA
-- ============================================================
