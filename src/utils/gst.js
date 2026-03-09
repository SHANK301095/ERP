// ═══════════════════════════════════════════════════════════════
// GST CALCULATION UTILITIES
// ═══════════════════════════════════════════════════════════════

export const GST_RATES = [0, 5, 12, 18, 28]

export const HSN_CODES = {
  'Lehenga':   '62046990',
  'Dupatta':   '62142090',
  'Fabric':    '52081200',
  'Kurta':     '62042990',
  'Saree':     '52086090',
  'Blouse':    '62046990',
  'Dhoti':     '52086090',
  'Shawl':     '62149090',
}

/**
 * Calculate GST breakdown for a line item
 * @param {number} taxableAmount
 * @param {number} gstRate  e.g. 5, 12, 18
 * @param {boolean} interstate - true = IGST, false = CGST+SGST
 */
export function calcGST(taxableAmount, gstRate, interstate = false) {
  const gstAmount = (taxableAmount * gstRate) / 100
  if (interstate) {
    return { igst: gstAmount, cgst: 0, sgst: 0, total: gstAmount }
  }
  return { igst: 0, cgst: gstAmount / 2, sgst: gstAmount / 2, total: gstAmount }
}

/**
 * Compute full invoice totals from line items
 * items = [{ qty, unitPrice, gstRate, discount }]
 */
export function calcInvoiceTotals(items, interstate = false) {
  let subtotal = 0, totalGst = 0, totalDiscount = 0
  const breakdown = {}

  items.forEach(item => {
    const disc    = (item.discount || 0)
    const lineAmt = item.qty * item.unitPrice
    const discAmt = (lineAmt * disc) / 100
    const taxable = lineAmt - discAmt
    const gst     = calcGST(taxable, item.gstRate || 0, interstate)

    subtotal      += lineAmt
    totalDiscount += discAmt
    totalGst      += gst.total

    const rate = item.gstRate || 0
    if (!breakdown[rate]) breakdown[rate] = { taxable: 0, cgst: 0, sgst: 0, igst: 0 }
    breakdown[rate].taxable += taxable
    breakdown[rate].cgst    += gst.cgst
    breakdown[rate].sgst    += gst.sgst
    breakdown[rate].igst    += gst.igst
  })

  const taxable   = subtotal - totalDiscount
  const grandTotal = taxable + totalGst

  return { subtotal, totalDiscount, taxable, totalGst, grandTotal, breakdown, interstate }
}

/** Format number as Indian currency */
export function fmtINR(n) {
  return '₹' + (Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Number to words (for invoice) */
export function numToWords(n) {
  const units  = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen']
  const tens   = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety']
  if (n === 0) return 'Zero'
  const convert = x => {
    if (x < 20) return units[x]
    if (x < 100) return tens[Math.floor(x/10)] + (x%10 ? ' '+units[x%10] : '')
    return units[Math.floor(x/100)] + ' Hundred' + (x%100 ? ' '+convert(x%100) : '')
  }
  let num = Math.floor(n), result = ''
  if (num >= 10000000) { result += convert(Math.floor(num/10000000))+' Crore '; num %= 10000000 }
  if (num >= 100000)   { result += convert(Math.floor(num/100000))+' Lakh ';   num %= 100000   }
  if (num >= 1000)     { result += convert(Math.floor(num/1000))+' Thousand '; num %= 1000     }
  if (num > 0)           result += convert(num)
  return result.trim() + ' Rupees Only'
}

/** Auto-increment invoice number */
export function nextInvoiceNo(existing, prefix = 'INV') {
  const year = new Date().getFullYear()
  const nums  = existing
    .filter(n => n?.startsWith(`${prefix}-${year}`))
    .map(n => parseInt(n.split('-').pop()) || 0)
  const next  = nums.length ? Math.max(...nums) + 1 : 1
  return `${prefix}-${year}-${String(next).padStart(4, '0')}`
}
