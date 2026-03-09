// ═══════════════════════════════════════════════════════════════
// LABEL LAYOUT ENGINE
// All label math and data transformation lives here.
// ═══════════════════════════════════════════════════════════════

export const LabelEngine = {

  /** 1 mm → pixels at 96 DPI */
  MM_TO_PX: 3.7795275591,
  mmToPx(mm) { return mm * this.MM_TO_PX },

  /**
   * Calculate how many labels fit on one page.
   * Uses template margin + label size + gap.
   */
  calcGrid(t) {
    const printableW = t.pageWidthMm  - t.marginLeftMm  - t.marginRightMm
    const printableH = t.pageHeightMm - t.marginTopMm   - t.marginBottomMm
    const cols = Math.max(1, Math.floor((printableW + t.gapXMm) / (t.labelWidthMm + t.gapXMm)))
    const rows = Math.max(1, Math.floor((printableH + t.gapYMm) / (t.labelHeightMm + t.gapYMm)))
    return { cols, rows, perPage: cols * rows }
  },

  /**
   * Expand print job items by quantity into a flat array.
   * [{variantId, qty}] → [{variant, product}, {variant, product}, ...]
   */
  expandItems(items, variants, products) {
    const out = []
    for (const { variantId, qty } of items) {
      const v = variants.find(x => x.id === variantId)
      if (!v) continue
      const p = products.find(x => x.id === v.productId)
      if (!p) continue
      for (let i = 0; i < (qty || 1); i++) out.push({ variant: v, product: p })
    }
    return out
  },

  /** Split flat label array into pages based on perPage capacity */
  paginate(expanded, perPage) {
    if (!expanded.length) return [[]]
    const pages = []
    for (let i = 0; i < expanded.length; i += perPage) {
      pages.push(expanded.slice(i, i + perPage))
    }
    return pages
  },

  /** Get the effective price: variant override first, then product MRP */
  effectivePrice(variant, product) {
    return variant.priceOverride || product.mrp || 0
  },

  /** Get the label display name: variant override → short name → full name */
  effectiveName(variant, product) {
    return variant.labelNameOverride || product.shortName || product.name || ''
  },

  /** Build variant display string: "5NO / Red" */
  variantDesc(variant) {
    return [variant.size, variant.color].filter(Boolean).join(' / ')
  },

  /**
   * Built-in template presets.
   * These are the defaults shown on the Templates page.
   */
  PRESETS: [
    {
      key: 'standard',
      name: 'Standard Retail Label',
      description: '62×38mm · 3 cols × 7 rows · 21 per A4',
      labelWidthMm: 62, labelHeightMm: 38, cols: 3, rows: 7,
      gapXMm: 3, gapYMm: 3, marginTopMm: 10, marginRightMm: 8, marginBottomMm: 10, marginLeftMm: 10,
    },
    {
      key: 'barcode_only',
      name: 'Barcode Only Strip',
      description: '62×25mm · 3 cols × 10 rows · 30 per A4',
      labelWidthMm: 62, labelHeightMm: 25, cols: 3, rows: 10,
      gapXMm: 3, gapYMm: 3, marginTopMm: 12, marginRightMm: 8, marginBottomMm: 10, marginLeftMm: 8,
    },
    {
      key: 'premium',
      name: 'Premium Hang Tag',
      description: '90×55mm · 2 cols × 5 rows · 10 per A4',
      labelWidthMm: 90, labelHeightMm: 55, cols: 2, rows: 5,
      gapXMm: 5, gapYMm: 5, marginTopMm: 15, marginRightMm: 10, marginBottomMm: 10, marginLeftMm: 10,
    },
    {
      key: 'small',
      name: 'Small Sticker',
      description: '38×25mm · 5 cols × 11 rows · 55 per A4',
      labelWidthMm: 38, labelHeightMm: 25, cols: 5, rows: 11,
      gapXMm: 2, gapYMm: 2, marginTopMm: 8, marginRightMm: 5, marginBottomMm: 8, marginLeftMm: 5,
    },
  ],
}
