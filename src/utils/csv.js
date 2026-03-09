// ═══════════════════════════════════════════════════════════════
// CSV UTILITIES
// ═══════════════════════════════════════════════════════════════

/** Convert 2D array to CSV string */
export function toCSV(rows) {
  return rows
    .map(row => row.map(cell => `"${(cell ?? '').toString().replace(/"/g, '""')}"`).join(','))
    .join('\n')
}

/** Trigger CSV file download in browser */
export function downloadCSV(filename, rows) {
  const blob = new Blob([toCSV(rows)], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Parse CSV text into array of objects (first row = headers).
 * Headers are lowercased and spaces replaced with underscores.
 */
export function parseCSV(text) {
  const lines = text.trim().split('\n').filter(l => l.trim())
  if (lines.length < 2) return []

  const headers = lines[0]
    .split(',')
    .map(h => h.trim().replace(/^"|"$/g, '').toLowerCase().replace(/\s+/g, '_'))

  return lines.slice(1).map(line => {
    // Handle quoted fields with commas inside
    const cols = []
    let current = ''
    let inQuote = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') { inQuote = !inQuote; continue }
      if (ch === ',' && !inQuote) { cols.push(current.trim()); current = ''; continue }
      current += ch
    }
    cols.push(current.trim())

    const obj = {}
    headers.forEach((h, i) => { obj[h] = (cols[i] || '').replace(/^"|"$/g, '').trim() })
    return obj
  }).filter(row => Object.values(row).some(v => v !== ''))
}

/** Today's date as YYYY-MM-DD */
export function today() {
  return new Date().toISOString().slice(0, 10)
}

/** Generate a unique ID */
export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}
