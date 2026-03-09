// ═══════════════════════════════════════════════════════════════
// SKU GENERATION ENGINE
// All SKU logic lives here. Edit this file to change SKU rules.
// ═══════════════════════════════════════════════════════════════

export const SKUEngine = {

  /** Remove all non-alphanumeric chars, uppercase, limit length */
  clean(s, max = 99) {
    return (s || '').replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, max)
  },

  /** Clean a family code: "HVK-034" → "HVK034" */
  cleanFamily(code) { return this.clean(code, 10) },

  /** Build variant code from size + color */
  cleanVariant(size, color, max = 6) {
    const s = this.clean(size, 4)
    const c = this.clean(color, 3)
    return (s + c).slice(0, max) || 'STD'
  },

  /** Zero-pad a number: (5, 3) → "005" */
  padSeq(n, digits = 3) { return String(n).padStart(digits, '0') },

  /**
   * Generate a SKU from template format string.
   * Supported tokens:
   *   {BRAND}   → brand code (e.g. "HV")
   *   {FAMILY}  → product family code cleaned (e.g. "HVK034")
   *   {VARIANT} → size + color combined (e.g. "5NORED")
   *   {SIZE}    → size only (e.g. "5NO")
   *   {COLOR}   → first 3 chars of color (e.g. "RED")
   *   {SEQ}     → padded sequence number (e.g. "001")
   *   {YEAR}    → current year (e.g. "2025")
   */
  generate(product, variant, config, seq = null) {
    const fmt = config.skuFormat || '{BRAND}-{FAMILY}-{VARIANT}'
    const brand   = this.clean(config.brandCode, 6) || 'XX'
    const family  = this.cleanFamily(product.familyCode || product.family_code || '')
    const varCode = this.cleanVariant(variant.size, variant.color)
    const seqStr  = seq !== null ? this.padSeq(seq) : this.padSeq(1)

    return fmt
      .replace('{BRAND}',   brand)
      .replace('{FAMILY}',  family || 'XXX')
      .replace('{VARIANT}', varCode)
      .replace('{SIZE}',    this.clean(variant.size, 6) || 'STD')
      .replace('{COLOR}',   this.clean(variant.color, 3) || '')
      .replace('{SEQ}',     seqStr)
      .replace('{YEAR}',    String(new Date().getFullYear()))
      .replace(/-+/g, '-')      // collapse double dashes
      .replace(/^-|-$/g, '')    // trim leading/trailing dash
      .toUpperCase()
  },

  /**
   * Resolve SKU conflicts: if baseSku already taken, try baseSku-2, -3 etc.
   * @param {string} baseSku
   * @param {Array}  allVariants  — full array of variant objects {id, sku}
   * @param {string|null} excludeId — when editing, exclude this variant's own SKU
   * @returns {{ sku: string, conflicted: boolean }}
   */
  resolveConflict(baseSku, allVariants, excludeId = null) {
    const taken = new Set(
      allVariants
        .filter(v => v.id !== excludeId)
        .map(v => v.sku)
    )
    if (!taken.has(baseSku)) return { sku: baseSku, conflicted: false }
    for (let i = 2; i <= 99; i++) {
      const candidate = `${baseSku}-${i}`
      if (!taken.has(candidate)) return { sku: candidate, conflicted: true }
    }
    // Fallback: append timestamp suffix (extremely rare)
    return { sku: `${baseSku}-${Date.now().toString(36).toUpperCase()}`, conflicted: true }
  },

  /**
   * Validate a SKU string.
   * Returns { ok: true } or { ok: false, reason: string }
   */
  validate(sku) {
    if (!sku || !sku.trim()) return { ok: false, reason: 'SKU cannot be empty' }
    const s = sku.trim()
    if (s.length < 3)  return { ok: false, reason: 'SKU must be at least 3 characters' }
    if (s.length > 50) return { ok: false, reason: 'SKU must be under 50 characters' }
    if (!/^[A-Z0-9][A-Z0-9\-.]*[A-Z0-9]$/i.test(s)) {
      return { ok: false, reason: 'Only letters, numbers, hyphens, and dots allowed' }
    }
    return { ok: true }
  },

  /** Predefined format templates for the Settings page */
  PRESETS: [
    { fmt: '{BRAND}-{FAMILY}-{VARIANT}', example: 'HV-HVK034-5NO'    },
    { fmt: '{BRAND}-{FAMILY}-{SIZE}',    example: 'HV-HVK034-5NO'    },
    { fmt: '{FAMILY}-{VARIANT}',         example: 'HVK034-5NO'       },
    { fmt: '{BRAND}{FAMILY}{SIZE}',      example: 'HVHVK0345NO'      },
    { fmt: '{FAMILY}-{SEQ}',            example: 'HVK034-001'        },
    { fmt: '{BRAND}-{FAMILY}-{SEQ}',    example: 'HV-HVK034-001'     },
  ],
}
