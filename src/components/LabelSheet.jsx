import { LabelEngine } from '../engine/LabelEngine.js'
import { Label } from './Label.jsx'

/** Renders paginated A4 sheets of labels */
export function LabelSheet({ items, template: t, products, variants }) {
  const grid     = LabelEngine.calcGrid(t)
  const expanded = LabelEngine.expandItems(items, variants, products)
  const pages    = LabelEngine.paginate(expanded, grid.perPage)

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: `repeat(${grid.cols}, ${t.labelWidthMm}mm)`,
    gridAutoRows: `${t.labelHeightMm}mm`,
    gap: `${t.gapYMm}mm ${t.gapXMm}mm`,
    padding: `${t.marginTopMm}mm ${t.marginRightMm}mm ${t.marginBottomMm}mm ${t.marginLeftMm}mm`,
    background: 'white',
  }

  return (
    <>
      {pages.map((pageItems, pi) => (
        <div key={pi} className="sheet-page">
          <div style={gridStyle}>
            {pageItems.map((item, idx) => (
              <Label key={idx} variant={item.variant} product={item.product} template={t} />
            ))}
          </div>
        </div>
      ))}
    </>
  )
}
