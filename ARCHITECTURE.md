# LabelForge Pro — Production Architecture & Technical Design

---

## PHASE 1 — ARCHITECTURE DECISION

### Problem Statement
A garment/textile business (Hari Vastra) currently creates product labels one-by-one in Canva.
Each label requires: product name, brand, size, SKU, barcode, MRP.
With 1,000+ products and 10,000+ variants, manual Canva work is unscalable.

**Core pain points:**
- Every size variant needs its own label (HVK-034 has 6 sizes = 6 manual Canva edits)
- Barcode generation is manual and error-prone
- No central product database — labels are disconnected from inventory logic
- Bulk printing requires positioning 21+ labels on A4 manually

**What this system must do:**
- One-time product data entry → instant all-variant label generation
- Barcode auto-generates from SKU (no third-party tool)
- Print-ready A4 sheets that go directly to printer
- Non-technical staff can operate it daily with zero friction

---

### Tech Stack — Final Decision

```
DEPLOYMENT TARGET: Browser-based (zero install for end user)
SERVER: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
FRONTEND FRAMEWORK: Next.js 14 (App Router) + TypeScript
STYLING: Tailwind CSS + custom CSS properties
STATE: Zustand (client) + TanStack Query (server state)
PDF ENGINE: React-PDF (@react-pdf/renderer) — renders to real PDF, not browser print
BARCODE: JsBarcode (Code128) + jsQR for QR support
IMPORT/EXPORT: Papa Parse (CSV) + SheetJS (XLSX)
DEPLOYMENT: Vercel (frontend) + Supabase Cloud (backend)
```

**Why not plain HTML/LocalStorage?**
- LocalStorage is capped at 5MB — 10,000 variants breaks it
- No multi-user / multi-device access
- No real PDF generation (browser print is unreliable at scale)
- No file storage for logo uploads

**Why Supabase over custom Node/Express?**
- PostgreSQL is included — no separate DB setup
- Built-in Auth (email/password, magic link)
- Storage for logo/brand assets
- Row Level Security for future multi-brand support
- Real-time for future multi-user scenarios
- Dashboard for non-technical database viewing

**Why React-PDF over browser print?**
- Browser print produces inconsistent margins across printers
- React-PDF renders identical output on every machine
- PDF is downloadable, shareable, archivable
- Barcodes render as crisp vectors in PDF

---

### System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     BROWSER (User)                       │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  Products   │  │  Templates   │  │   Generator   │  │
│  │  & Variants │  │  Designer    │  │   (Preview +  │  │
│  │  CRUD       │  │              │  │    PDF)       │  │
│  └──────┬──────┘  └──────┬───────┘  └───────┬───────┘  │
│         │                │                  │           │
│  ┌──────▼────────────────▼──────────────────▼───────┐   │
│  │              Zustand Store + TanStack Query       │   │
│  └──────────────────────┬────────────────────────────┘   │
└─────────────────────────┼───────────────────────────────┘
                          │ HTTPS / Supabase Client
┌─────────────────────────▼───────────────────────────────┐
│                    SUPABASE                              │
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │ PostgreSQL  │  │   Storage   │  │  Edge Functions │ │
│  │  (data)     │  │  (logos,    │  │  (PDF gen,      │ │
│  │             │  │   assets)   │  │   bulk ops)     │ │
│  └─────────────┘  └─────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## PHASE 2 — DATABASE SCHEMA

### Design Principles
- UUID primary keys (globally unique, safe for sync/merge)
- All timestamps in UTC
- Soft deletes via `deleted_at` (never hard-delete labels/SKUs)
- `meta JSONB` column on most tables for extensibility
- Check constraints enforce data integrity at DB level
- Partial indexes for performance on filtered queries

### Complete SQL Schema

```sql
-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for fuzzy search

-- ============================================================
-- ENUM TYPES
-- ============================================================
CREATE TYPE product_status AS ENUM ('active', 'inactive', 'archived');
CREATE TYPE variant_status AS ENUM ('active', 'inactive', 'discontinued');
CREATE TYPE print_job_status AS ENUM ('draft', 'queued', 'printed', 'cancelled');
CREATE TYPE import_status AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE barcode_format AS ENUM ('CODE128', 'EAN13', 'QR', 'CODE39');

-- ============================================================
-- BRANDS (supports future multi-brand)
-- ============================================================
CREATE TABLE brands (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            TEXT NOT NULL,
    code            TEXT NOT NULL UNIQUE CHECK (length(code) BETWEEN 2 AND 10),
    logo_url        TEXT,
    tagline         TEXT,
    address         TEXT,
    gstin           TEXT,
    currency        TEXT DEFAULT '₹' CHECK (length(currency) <= 3),
    meta            JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_brands_code ON brands(code) WHERE deleted_at IS NULL;

-- ============================================================
-- CATEGORIES
-- ============================================================
CREATE TABLE categories (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id        UUID REFERENCES brands(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    slug            TEXT NOT NULL,
    parent_id       UUID REFERENCES categories(id),
    sort_order      INT DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(brand_id, slug)
);

-- ============================================================
-- PRODUCTS (Master Records)
-- ============================================================
CREATE TABLE products (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id        UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    category_id     UUID REFERENCES categories(id) ON DELETE SET NULL,
    
    -- Identification
    name            TEXT NOT NULL CHECK (length(name) BETWEEN 2 AND 200),
    short_name      TEXT CHECK (length(short_name) <= 60),
    family_code     TEXT CHECK (family_code ~ '^[A-Z0-9\-]+$'),
    
    -- Classification
    subcategory     TEXT,
    tags            TEXT[],
    
    -- Pricing
    mrp             NUMERIC(10,2) NOT NULL CHECK (mrp > 0),
    discounted_price NUMERIC(10,2) CHECK (discounted_price IS NULL OR discounted_price <= mrp),
    gst_percent     NUMERIC(5,2) DEFAULT 5 CHECK (gst_percent IN (0, 5, 12, 18, 28)),
    
    -- Content
    description     TEXT,
    notes           TEXT,
    
    -- State
    status          product_status DEFAULT 'active',
    
    -- Audit
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,
    created_by      UUID,
    
    -- Extensibility
    meta            JSONB DEFAULT '{}'
);

-- Performance indexes
CREATE INDEX idx_products_brand ON products(brand_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_status ON products(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_family_code ON products(family_code) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_search ON products USING gin(
    (to_tsvector('english', name || ' ' || COALESCE(short_name,'') || ' ' || COALESCE(family_code,'')))
);

-- ============================================================
-- VARIANT ATTRIBUTES (define what variants a product has)
-- ============================================================
CREATE TABLE variant_attributes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,  -- 'size', 'color', 'fabric', 'pack_size'
    values          TEXT[],         -- ['S','M','L','XL'] or ['Red','Blue']
    sort_order      INT DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PRODUCT VARIANTS (SKU-level records)
-- ============================================================
CREATE TABLE product_variants (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    
    -- SKU (the critical identifier)
    sku             TEXT NOT NULL,
    barcode_value   TEXT,           -- if different from SKU
    barcode_format  barcode_format DEFAULT 'CODE128',
    
    -- Variant dimensions
    size            TEXT,
    color           TEXT,
    fabric          TEXT,
    style           TEXT,
    pack_size       TEXT,
    custom_attrs    JSONB DEFAULT '{}', -- any extra attributes
    
    -- Pricing (inherits from product if null)
    price_override  NUMERIC(10,2) CHECK (price_override IS NULL OR price_override > 0),
    
    -- Label customization
    label_name_override TEXT,  -- override product short_name on label
    
    -- State
    status          variant_status DEFAULT 'active',
    
    -- Audit
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT uq_sku UNIQUE (sku),
    CONSTRAINT valid_sku CHECK (sku ~ '^[A-Z0-9\-]+$' AND length(sku) BETWEEN 4 AND 50)
);

CREATE INDEX idx_variants_product ON product_variants(product_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_variants_sku ON product_variants(sku) WHERE deleted_at IS NULL;
CREATE INDEX idx_variants_status ON product_variants(status) WHERE deleted_at IS NULL;

-- ============================================================
-- SKU SEQUENCES (for auto-increment per product)
-- ============================================================
CREATE TABLE sku_sequences (
    product_id      UUID PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
    last_sequence   INT DEFAULT 0,
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- LABEL TEMPLATES
-- ============================================================
CREATE TABLE label_templates (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id        UUID REFERENCES brands(id) ON DELETE SET NULL,
    
    name            TEXT NOT NULL,
    description     TEXT,
    
    -- Page layout
    page_size       TEXT DEFAULT 'A4',          -- A4, A5, custom
    page_width_mm   NUMERIC(8,2) DEFAULT 210,
    page_height_mm  NUMERIC(8,2) DEFAULT 297,
    margin_top_mm   NUMERIC(8,2) DEFAULT 10,
    margin_right_mm NUMERIC(8,2) DEFAULT 10,
    margin_bottom_mm NUMERIC(8,2) DEFAULT 10,
    margin_left_mm  NUMERIC(8,2) DEFAULT 10,
    
    -- Label dimensions
    label_width_mm  NUMERIC(8,2) NOT NULL CHECK (label_width_mm > 0),
    label_height_mm NUMERIC(8,2) NOT NULL CHECK (label_height_mm > 0),
    gap_x_mm        NUMERIC(8,2) DEFAULT 3,
    gap_y_mm        NUMERIC(8,2) DEFAULT 3,
    
    -- Grid (auto-calculated but storable for override)
    cols            INT,
    rows            INT,
    
    -- Field visibility flags
    show_brand      BOOLEAN DEFAULT true,
    show_product_name BOOLEAN DEFAULT true,
    show_short_name BOOLEAN DEFAULT true,
    show_barcode    BOOLEAN DEFAULT true,
    show_sku_text   BOOLEAN DEFAULT true,
    show_size       BOOLEAN DEFAULT true,
    show_color      BOOLEAN DEFAULT false,
    show_mrp        BOOLEAN DEFAULT true,
    show_discounted_price BOOLEAN DEFAULT false,
    show_category   BOOLEAN DEFAULT false,
    show_gstin      BOOLEAN DEFAULT false,
    show_border     BOOLEAN DEFAULT true,
    
    -- Typography
    font_family     TEXT DEFAULT 'helvetica',
    brand_font_size NUMERIC(5,2) DEFAULT 7,
    name_font_size  NUMERIC(5,2) DEFAULT 8,
    price_font_size NUMERIC(5,2) DEFAULT 10,
    size_font_size  NUMERIC(5,2) DEFAULT 8,
    sku_font_size   NUMERIC(5,2) DEFAULT 6,
    
    -- Barcode
    barcode_height_mm NUMERIC(8,2) DEFAULT 12,
    barcode_width_factor NUMERIC(5,2) DEFAULT 1.2,
    
    -- Layout style  
    layout_style    TEXT DEFAULT 'standard', -- standard, barcode_only, premium, compact
    
    -- Audit
    is_default      BOOLEAN DEFAULT false,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    
    meta            JSONB DEFAULT '{}'
);

CREATE INDEX idx_templates_brand ON label_templates(brand_id);

-- ============================================================
-- PRINT JOBS
-- ============================================================
CREATE TABLE print_jobs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id        UUID REFERENCES brands(id),
    template_id     UUID REFERENCES label_templates(id) ON DELETE SET NULL,
    
    name            TEXT NOT NULL,
    status          print_job_status DEFAULT 'draft',
    
    -- Snapshot of template used (so reprints are identical)
    template_snapshot JSONB,
    
    -- Job stats
    total_skus      INT DEFAULT 0,
    total_labels    INT DEFAULT 0,
    total_pages     INT DEFAULT 0,
    
    -- Output
    pdf_url         TEXT,  -- stored in Supabase Storage
    
    -- Audit
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    printed_at      TIMESTAMPTZ,
    created_by      UUID,
    
    notes           TEXT
);

-- ============================================================
-- PRINT JOB LINE ITEMS
-- ============================================================
CREATE TABLE print_job_items (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id          UUID NOT NULL REFERENCES print_jobs(id) ON DELETE CASCADE,
    variant_id      UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
    
    quantity        INT NOT NULL DEFAULT 1 CHECK (quantity BETWEEN 1 AND 9999),
    
    -- Snapshot of variant data at print time
    variant_snapshot JSONB,
    
    sort_order      INT DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_job_items_job ON print_job_items(job_id);
CREATE INDEX idx_job_items_variant ON print_job_items(variant_id);

-- ============================================================
-- IMPORT JOBS (track bulk imports)
-- ============================================================
CREATE TABLE import_jobs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id        UUID REFERENCES brands(id),
    
    type            TEXT NOT NULL, -- 'products', 'variants', 'full_catalog'
    filename        TEXT,
    status          import_status DEFAULT 'pending',
    
    total_rows      INT DEFAULT 0,
    processed_rows  INT DEFAULT 0,
    success_rows    INT DEFAULT 0,
    error_rows      INT DEFAULT 0,
    
    -- Validation errors (JSON array of {row, field, error, value})
    errors          JSONB DEFAULT '[]',
    warnings        JSONB DEFAULT '[]',
    
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    completed_at    TIMESTAMPTZ
);

-- ============================================================
-- SKU FORMAT CONFIGS (per brand)
-- ============================================================
CREATE TABLE sku_configs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id        UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE UNIQUE,
    
    -- Format: {BRAND}-{FAMILY}-{VARIANT}
    format_template TEXT DEFAULT '{BRAND}-{FAMILY}-{VARIANT}',
    separator       TEXT DEFAULT '-',
    uppercase       BOOLEAN DEFAULT true,
    
    -- Token rules
    brand_token_length    INT DEFAULT 2,
    family_token_length   INT DEFAULT 6,
    variant_token_length  INT DEFAULT 4,
    
    -- Conflict resolution
    auto_suffix_on_conflict BOOLEAN DEFAULT true,
    
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TRIGGERS — auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_products_updated BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_variants_updated BEFORE UPDATE ON product_variants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_templates_updated BEFORE UPDATE ON label_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- FUNCTION: Get next SKU sequence for a product
-- ============================================================
CREATE OR REPLACE FUNCTION get_next_sku_sequence(p_product_id UUID)
RETURNS INT AS $$
DECLARE
    next_seq INT;
BEGIN
    INSERT INTO sku_sequences(product_id, last_sequence)
    VALUES (p_product_id, 1)
    ON CONFLICT (product_id) DO UPDATE
        SET last_sequence = sku_sequences.last_sequence + 1,
            updated_at = NOW()
    RETURNING last_sequence INTO next_seq;
    RETURN next_seq;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNCTION: Check SKU uniqueness (returns true if available)
-- ============================================================
CREATE OR REPLACE FUNCTION is_sku_available(p_sku TEXT, p_exclude_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN NOT EXISTS (
        SELECT 1 FROM product_variants
        WHERE sku = p_sku
        AND deleted_at IS NULL
        AND (p_exclude_id IS NULL OR id != p_exclude_id)
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- SEED: Default brand
-- ============================================================
INSERT INTO brands (id, name, code, currency)
VALUES (
    'b1000000-0000-0000-0000-000000000001',
    'Hari Vastra',
    'HV',
    '₹'
);

INSERT INTO sku_configs (brand_id, format_template, separator)
VALUES (
    'b1000000-0000-0000-0000-000000000001',
    '{BRAND}-{FAMILY}-{VARIANT}',
    '-'
);
```

---

## PHASE 3 — COMPLETE PAGE LIST

### Route Structure (Next.js App Router)

```
app/
├── (auth)/
│   ├── login/page.tsx              — Email + password login
│   └── setup/page.tsx             — First-time brand setup wizard
│
├── (app)/
│   ├── layout.tsx                  — Sidebar + topbar shell
│   ├── dashboard/page.tsx          — Stats + quick actions
│   │
│   ├── products/
│   │   ├── page.tsx                — Product list (search, filter, paginate)
│   │   ├── new/page.tsx            — Add product form
│   │   ├── [id]/page.tsx           — Product detail + variants table
│   │   ├── [id]/edit/page.tsx      — Edit product
│   │   └── [id]/variants/page.tsx  — Full variant management
│   │
│   ├── skus/
│   │   └── page.tsx                — All SKUs across all products (searchable)
│   │
│   ├── templates/
│   │   ├── page.tsx                — Template gallery
│   │   ├── new/page.tsx            — Template builder
│   │   └── [id]/edit/page.tsx      — Edit template
│   │
│   ├── generator/
│   │   ├── page.tsx                — Label generation wizard (3 steps)
│   │   └── [jobId]/page.tsx        — View/reprint existing job
│   │
│   ├── jobs/
│   │   └── page.tsx                — Print job history
│   │
│   ├── import/
│   │   └── page.tsx                — CSV/XLSX import wizard
│   │
│   ├── export/
│   │   └── page.tsx                — Export options + download center
│   │
│   └── settings/
│       ├── page.tsx                — General settings (brand, SKU format)
│       ├── brand/page.tsx          — Brand details + logo upload
│       └── sku-format/page.tsx     — SKU format builder
│
└── api/
    ├── products/route.ts
    ├── variants/route.ts
    ├── templates/route.ts
    ├── generate-pdf/route.ts       — PDF generation endpoint
    ├── validate-sku/route.ts       — SKU uniqueness check
    └── import/route.ts             — Import processing
```

### Page Specifications

| Page | Purpose | Key Actions |
|------|---------|-------------|
| Dashboard | Overview metrics | Quick-add product, quick-generate |
| Products List | View all products | Search, filter status/category, bulk delete |
| Product Detail | See product + variants | Add variants, view barcodes, generate labels |
| Template Gallery | View all templates | Preview, duplicate, set default |
| Template Builder | Visual template editor | Live preview, field toggles, size config |
| Generator Step 1 | Select variants | Product filter, select-all, qty per SKU |
| Generator Step 2 | Choose template | Preview pages needed |
| Generator Step 3 | Preview + Export | Full A4 preview, download PDF, print |
| Print Jobs | History | View old jobs, regenerate exact reprint |
| Import Wizard | CSV upload | Column mapper, validation report, import |
| SKU Format Builder | Configure SKU logic | Format tokens, preview, test cases |

---

## PHASE 4 — SKU GENERATION ENGINE

### Design Goals
- Deterministic: same inputs → same SKU
- Unique: no two variants share a SKU
- Human-readable: staff can decode what product it refers to
- Compact: fits on small label (max 20 chars ideal)
- Configurable: each brand can set their own format

### Token Definitions

```
{BRAND}     → brand.code (e.g. "HV")
{FAMILY}    → product.family_code cleaned (e.g. "HVK034")
{VARIANT}   → composite of size+color, cleaned to alphanumeric
{SIZE}      → variant.size cleaned (e.g. "5NO", "XL", "FREE")
{COLOR}     → variant.color first 3 chars uppercased (e.g. "RED", "BLU")
{SEQ}       → auto-increment sequence per product (001, 002, ...)
{YEAR}      → current year (2025)
```

### Cleaning Rules
```
family_code:  "HVK-034" → remove non-alphanumeric → "HVK034"
size:         "5NO" → "5NO", "Free Size" → "FREE", "2.5M" → "25M"
color:        "Royal Blue" → "RBLU", "Red" → "RED", "" → skipped
variant code: size || color, max 6 chars, uppercase
```

### Conflict Resolution
```
1. Generate SKU from format
2. Check DB uniqueness
3. If conflict: append "-2", "-3"... until unique
4. If using {SEQ}: atomic DB sequence prevents all conflicts
5. Store resolved SKU, flag if auto-suffixed (for admin review)
```

### Format Examples
```
Standard retail:        HV-HVK034-5NO         ← {BRAND}-{FAMILY}-{SIZE}
With color:             HV-HVK034-5NORED      ← {BRAND}-{FAMILY}-{SIZE}{COLOR_3}
Sequential:             HVK034-001            ← {FAMILY}-{SEQ_3}
Dense (small label):    HVHVK0345NO           ← {BRAND}{FAMILY}{SIZE}
Long style:             HARI-LEH-PAT-5NO      ← manual prefix possible
```

---

## PHASE 5 — LABEL TEMPLATE ENGINE

### Architecture

The template engine has three layers:

```
Layer 1: Template Definition (stored in DB)
         ↓ JSON config with all field specs
Layer 2: Renderer (converts template + variant data → visual)  
         ↓ For preview: HTML/CSS
         ↓ For PDF: React-PDF primitives
Layer 3: Sheet Calculator (positions labels on A4 grid)
         ↓ Calculates rows/cols from label size + margins
         ↓ Handles overflow → pagination
```

### Template Field Model

```typescript
interface TemplateField {
  id: FieldId;
  visible: boolean;
  
  // Position within label (mm from label top-left)
  x: number;
  y: number;
  width: number;   // max width before truncation
  height: number;
  
  // Typography
  fontSize: number;       // pt
  fontWeight: 'normal' | 'bold';
  fontFamily: string;
  align: 'left' | 'center' | 'right';
  
  // Display
  prefix?: string;        // e.g. "MRP: " or "₹"
  suffix?: string;        // e.g. "/-"
  truncate?: boolean;     // truncate long text
  maxChars?: number;
}

type FieldId = 
  | 'brand_name'
  | 'product_name'
  | 'short_name'
  | 'barcode'
  | 'sku_text'
  | 'size'
  | 'color'
  | 'mrp'
  | 'discounted_price'
  | 'category'
  | 'divider_top'
  | 'divider_bottom';
```

### Grid Calculator

```typescript
function calculateGrid(template: LabelTemplate): GridLayout {
  const printableWidth = template.pageWidthMm 
    - template.marginLeftMm 
    - template.marginRightMm;
  
  const printableHeight = template.pageHeightMm 
    - template.marginTopMm 
    - template.marginBottomMm;
  
  // How many labels fit?
  const cols = Math.floor(
    (printableWidth + template.gapXMm) / (template.labelWidthMm + template.gapXMm)
  );
  const rows = Math.floor(
    (printableHeight + template.gapYMm) / (template.labelHeightMm + template.gapYMm)
  );
  
  return { 
    cols, rows, 
    labelsPerPage: cols * rows,
    actualWidthUsed: cols * template.labelWidthMm + (cols-1) * template.gapXMm,
    actualHeightUsed: rows * template.labelHeightMm + (rows-1) * template.gapYMm
  };
}
```

### Preset Layouts (built-in)

| Preset | Size | Grid on A4 | Use Case |
|--------|------|-----------|----------|
| Standard Retail | 62×38mm | 3×7 = 21/page | Garment hang tags |
| Small Sticker | 38×25mm | 5×11 = 55/page | Small product stickers |
| Barcode Strip | 62×22mm | 3×10 = 30/page | Barcode-only labels |
| Premium Hang Tag | 90×55mm | 2×5 = 10/page | Premium products |
| Shelf Label | 100×30mm | 2×9 = 18/page | Shelf edge labels |
| Packing Label | 100×70mm | 2×4 = 8/page | Carton/box labels |

---

## PHASE 6 — IMPLEMENTATION SEQUENCE

### Order of Build
```
Week 1 — Foundation
  □ Supabase project setup + schema migration
  □ Next.js project scaffold (TypeScript + Tailwind)
  □ Auth (login page + session management)
  □ Brand + settings pages
  □ Core TypeScript types

Week 2 — Data Layer
  □ Products CRUD (list, add, edit, delete)
  □ Variants management (per product + bulk add)
  □ SKU generation engine
  □ Barcode rendering component
  □ All SKUs view

Week 3 — Label Engine
  □ Template data model + storage
  □ Template builder UI
  □ Label preview component (HTML rendering)
  □ Grid sheet calculator
  □ Print preview page

Week 4 — Generation + Output
  □ Generator wizard (3 steps)
  □ React-PDF label renderer
  □ PDF download endpoint
  □ Print job save/history
  □ Reprint from history

Week 5 — Import/Export
  □ CSV import (products)
  □ CSV import (variants)
  □ Validation report UI
  □ CSV/XLSX export
  □ Import job history

Week 6 — Polish + Deploy
  □ Error handling + loading states
  □ Empty states + onboarding
  □ Performance (virtualized lists)
  □ Vercel deployment
  □ User documentation
```

---

## PHASE 7 — CRITICAL IMPLEMENTATION DECISIONS

### Decision 1: SKU Validation
- Validate on client immediately (optimistic)
- Re-validate on server before save (authoritative)
- Show conflict suggestions instantly (append -2, -3)

### Decision 2: PDF Generation
- Use React-PDF for server-side PDF rendering (edge function)
- Client gets download URL from Supabase Storage
- PDF cached per job — reprint = re-download same PDF

### Decision 3: Barcode Format
- Default: CODE128 (supports all alphanumeric SKU characters)
- EAN-13 option for retail compatibility (requires 12-digit numeric SKU)
- QR option for future mobile scanning

### Decision 4: Import Handling
- Parse CSV client-side (Papa Parse)
- Validate all rows before any are inserted
- Show per-row errors before confirming import
- Import as a transaction (all or nothing per batch of 100)

### Decision 5: Offline Support
- Not required for v1
- Products/variants are small enough for in-memory caching
- React Query handles stale-while-revalidate

---

*End of Architecture Document*
*Next: schema.sql (standalone), then full implementation code*
