import { useEffect, useRef } from 'react'
import JsBarcode from 'jsbarcode'

export function Barcode({ value, height = 28, fontSize = 7, width = 1.2, hideText = false }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!ref.current || !value) return
    try {
      JsBarcode(ref.current, String(value).toUpperCase(), {
        format:       'CODE128',
        width,
        height,
        displayValue: !hideText,
        fontSize,
        margin:       2,
        lineColor:    '#000000',
        background:   'transparent',
        textAlign:    'center',
        textPosition: 'bottom',
        font:         'monospace',
      })
    } catch (err) {
      // Invalid value for CODE128 — silently fail
      console.warn('Barcode render failed for:', value, err.message)
    }
  }, [value, height, fontSize, width, hideText])

  if (!value) return null
  return <svg ref={ref} style={{ maxWidth:'100%', display:'block' }} />
}
