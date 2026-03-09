import { LabelEngine } from '../engine/LabelEngine.js'
import { Barcode } from './Barcode.jsx'

/** Renders a single label at exact mm dimensions */
export function Label({ variant, product, template: t, scale = 1 }) {
  const w = LabelEngine.mmToPx(t.labelWidthMm) * scale
  const h = LabelEngine.mmToPx(t.labelHeightMm) * scale
  const bc = LabelEngine.mmToPx(t.barcodeHeightMm) * scale

  const price     = LabelEngine.effectivePrice(variant, product)
  const labelName = LabelEngine.effectiveName(variant, product)

  return (
    <div className="lbl" style={{
      width, height, minWidth:w, minHeight:h,
      border: t.showBorder ? '0.5px solid #555' : 'none',
    }}>
      <div className="lbl-inner">

        {/* Top row: brand + category */}
        {(t.showBrand || t.showCategory) && (
          <div className="lbl-brand-row" style={{ fontSize: t.brandFontSizePt * scale + 'pt' }}>
            {t.showBrand && (
              <span className="lbl-brand" style={{ fontSize: t.brandFontSizePt * scale + 'pt' }}>
                {product.brand}
              </span>
            )}
            {t.showCategory && (
              <span style={{ fontSize: Math.max(4, (t.brandFontSizePt - 1) * scale) + 'pt', opacity:0.7 }}>
                {product.category}
              </span>
            )}
          </div>
        )}

        {/* Product name */}
        {t.showProductName && labelName && (
          <div className="lbl-name" style={{ fontSize: t.nameFontSizePt * scale + 'pt', marginBottom:'0.8mm' }}>
            {labelName}
          </div>
        )}

        {/* Barcode */}
        {t.showBarcode && (
          <div className="lbl-barcode-wrap" style={{ flex:1 }}>
            <Barcode
              value={variant.sku}
              height={bc * 0.85}
              fontSize={Math.max(4, t.skuFontSizePt * scale)}
              width={1.0 * scale}
            />
          </div>
        )}

        {/* SKU text only (no barcode) */}
        {!t.showBarcode && t.showSkuText && (
          <div className="lbl-sku-only" style={{ fontSize: t.skuFontSizePt * scale + 'pt', marginBottom:'0.5mm' }}>
            {variant.sku}
          </div>
        )}

        {/* Footer: size + price */}
        <div className="lbl-footer" style={{ fontSize: t.sizeFontSizePt * scale + 'pt' }}>
          <span style={{ fontWeight:700 }}>
            {t.showSize  && variant.size  && <span>{variant.size}</span>}
            {t.showColor && variant.color && <span style={{ marginLeft:'1.5mm', opacity:0.75 }}>{variant.color}</span>}
          </span>
          {t.showMrp && (
            <span className="lbl-price" style={{ fontSize: t.priceFontSizePt * scale + 'pt' }}>
              ₹{price}
              {t.showDiscountedPrice && product.discountedPrice && (
                <span style={{
                  fontSize: Math.max(4, (t.priceFontSizePt - 2) * scale) + 'pt',
                  opacity:0.55, marginLeft:'1mm', textDecoration:'line-through',
                }}>
                  ₹{product.discountedPrice}
                </span>
              )}
            </span>
          )}
        </div>

      </div>
    </div>
  )
}
