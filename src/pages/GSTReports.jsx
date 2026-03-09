import { useMemo, useState } from 'react'
import { Icon } from '../components/ui/index.jsx'
import { downloadCSV } from '../utils/csv.js'
import { fmtINR } from '../utils/gst.js'

export function GSTReports({ state }) {
  const { salesInvoices, purchaseOrders, settings } = state
  const [tab, setTab] = useState('gstr1')
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))

  const filtered = useMemo(() =>
    salesInvoices.filter(inv => inv.date?.startsWith(month) && inv.status !== 'cancelled'),
    [salesInvoices, month]
  )

  // GSTR-1: B2B invoices
  const b2b = filtered.filter(inv => inv.customerGstin)
  const b2c = filtered.filter(inv => !inv.customerGstin)

  // HSN summary
  const hsnMap = {}
  filtered.forEach(inv => {
    (inv.items || []).forEach(item => {
      const hsn = item.hsnCode || 'NA'
      if (!hsnMap[hsn]) hsnMap[hsn] = { hsn, desc: item.productName, qty: 0, taxable: 0, igst: 0, cgst: 0, sgst: 0 }
      const lineAmt = item.qty * item.unitPrice
      const disc = (lineAmt * (item.discount || 0)) / 100
      const taxable = lineAmt - disc
      const gst = (taxable * item.gstRate) / 100
      hsnMap[hsn].qty += item.qty
      hsnMap[hsn].taxable += taxable
      if (inv.interstate) hsnMap[hsn].igst += gst
      else { hsnMap[hsn].cgst += gst / 2; hsnMap[hsn].sgst += gst / 2 }
    })
  })
  const hsnSummary = Object.values(hsnMap)

  // GSTR-3B summary
  const totalTaxable = filtered.reduce((s, i) => s + (i.taxable || 0), 0)
  const totalCGST    = filtered.filter(i => !i.interstate).reduce((s, i) => s + (i.totalGst || 0) / 2, 0)
  const totalSGST    = totalCGST
  const totalIGST    = filtered.filter(i => i.interstate).reduce((s, i) => s + (i.totalGst || 0), 0)
  const totalGST     = totalCGST + totalSGST + totalIGST

  // Purchase ITC
  const poFiltered = purchaseOrders.filter(po => po.receivedDate?.startsWith(month) || po.date?.startsWith(month))
  const itcCGST = poFiltered.reduce((s, po) => s + (po.totalGst || 0) / 2, 0)
  const itcSGST = itcCGST
  const netPayable = Math.max(0, totalGST - itcCGST - itcSGST)

  function exportGSTR1() {
    const rows = [
      ['Invoice No', 'Date', 'Customer', 'GSTIN', 'Taxable Value', 'IGST', 'CGST', 'SGST', 'Total Tax', 'Invoice Total'],
      ...filtered.map(inv => [
        inv.invoiceNumber, inv.date, inv.customerName, inv.customerGstin || 'B2C',
        (inv.taxable || 0).toFixed(2),
        inv.interstate ? (inv.totalGst || 0).toFixed(2) : '0.00',
        !inv.interstate ? ((inv.totalGst || 0) / 2).toFixed(2) : '0.00',
        !inv.interstate ? ((inv.totalGst || 0) / 2).toFixed(2) : '0.00',
        (inv.totalGst || 0).toFixed(2),
        (inv.grandTotal || 0).toFixed(2)
      ])
    ]
    downloadCSV(`GSTR1_${month}_${settings.brandName}.csv`, rows)
  }

  function exportHSN() {
    const rows = [
      ['HSN Code', 'Description', 'Total Qty', 'Taxable Value', 'IGST', 'CGST', 'SGST', 'Total GST'],
      ...hsnSummary.map(h => [h.hsn, h.desc, h.qty, h.taxable.toFixed(2), h.igst.toFixed(2), h.cgst.toFixed(2), h.sgst.toFixed(2), (h.igst + h.cgst + h.sgst).toFixed(2)])
    ]
    downloadCSV(`HSN_Summary_${month}.csv`, rows)
  }

  const tabs = [
    { id: 'gstr1', label: 'GSTR-1' },
    { id: 'gstr3b', label: 'GSTR-3B' },
    { id: 'hsn', label: 'HSN Summary' },
    { id: 'itc', label: 'ITC (Purchase)' },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
        <div className="sh" style={{ margin: 0 }}><h2>GST Reports</h2><p>GSTR-1, GSTR-3B, HSN Summary, ITC</p></div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input className="field" type="month" value={month} onChange={e => setMonth(e.target.value)} style={{ width: 160 }} />
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 18 }}>
        {[
          { l: 'Total Invoices', v: filtered.length, c: 'var(--blue)' },
          { l: 'Taxable Value', v: '₹' + totalTaxable.toLocaleString('en-IN', { maximumFractionDigits: 0 }), c: 'var(--amber)' },
          { l: 'GST Collected', v: '₹' + totalGST.toLocaleString('en-IN', { maximumFractionDigits: 0 }), c: 'var(--green)' },
          { l: 'Net Payable', v: '₹' + netPayable.toLocaleString('en-IN', { maximumFractionDigits: 0 }), c: 'var(--purple)' },
        ].map(s => (
          <div key={s.l} className="stat">
            <div className="stat-v" style={{ color: s.c, fontSize: 18 }}>{s.v}</div>
            <div className="stat-l">{s.l}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 14, borderBottom: '1px solid var(--b1)', paddingBottom: 0 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: '7px 16px', background: 'none', border: 'none', borderBottom: tab === t.id ? '2px solid var(--amber)' : '2px solid transparent', color: tab === t.id ? 'var(--amber)' : 'var(--t3)', cursor: 'pointer', fontSize: 13, fontWeight: 600, marginBottom: -1 }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'gstr1' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 13, color: 'var(--t2)' }}>
              <span className="badge bb" style={{ marginRight: 8 }}>B2B: {b2b.length}</span>
              <span className="badge bi">B2C: {b2c.length}</span>
            </div>
            <button className="btn bs btn-sm" onClick={exportGSTR1}>⬇ Export CSV</button>
          </div>
          <div className="card" style={{ padding: 0 }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="tbl">
                <thead><tr><th>Invoice No</th><th>Date</th><th>Customer</th><th>GSTIN</th><th>Type</th><th>Taxable</th><th>CGST</th><th>SGST</th><th>IGST</th><th>Total</th></tr></thead>
                <tbody>
                  {filtered.length === 0 && <tr><td colSpan={10}><div className="empty"><p>No invoices for {month}</p></div></td></tr>}
                  {filtered.map(inv => (
                    <tr key={inv.id}>
                      <td style={{ fontFamily: 'JetBrains Mono', fontSize: 11 }}>{inv.invoiceNumber}</td>
                      <td style={{ fontSize: 11.5, color: 'var(--t3)' }}>{inv.date}</td>
                      <td style={{ fontSize: 12, color: 'var(--t1)' }}>{inv.customerName}</td>
                      <td style={{ fontFamily: 'JetBrains Mono', fontSize: 10.5, color: 'var(--t3)' }}>{inv.customerGstin || '—'}</td>
                      <td><span className={`badge ${inv.customerGstin ? 'bb' : 'bi'}`}>{inv.customerGstin ? 'B2B' : 'B2C'}</span></td>
                      <td style={{ fontFamily: 'JetBrains Mono', fontSize: 12 }}>₹{(inv.taxable || 0).toFixed(2)}</td>
                      <td style={{ fontFamily: 'JetBrains Mono', fontSize: 11.5, color: 'var(--t3)' }}>{!inv.interstate ? '₹' + ((inv.totalGst || 0) / 2).toFixed(2) : '—'}</td>
                      <td style={{ fontFamily: 'JetBrains Mono', fontSize: 11.5, color: 'var(--t3)' }}>{!inv.interstate ? '₹' + ((inv.totalGst || 0) / 2).toFixed(2) : '—'}</td>
                      <td style={{ fontFamily: 'JetBrains Mono', fontSize: 11.5, color: 'var(--t3)' }}>{inv.interstate ? '₹' + (inv.totalGst || 0).toFixed(2) : '—'}</td>
                      <td style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, color: 'var(--amber)' }}>₹{(inv.grandTotal || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'gstr3b' && (
        <div style={{ maxWidth: 640 }}>
          <div className="card mb-16">
            <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14, marginBottom: 14, color: 'var(--amber)' }}>3.1 — Outward Supplies (Sales)</div>
            <table className="tbl">
              <thead><tr><th>Nature of Supply</th><th>Taxable Value</th><th>IGST</th><th>CGST</th><th>SGST</th></tr></thead>
              <tbody>
                <tr>
                  <td style={{ color: 'var(--t1)' }}>Taxable outward supplies (B2C + B2B)</td>
                  <td style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, color: 'var(--amber)' }}>₹{totalTaxable.toFixed(2)}</td>
                  <td style={{ fontFamily: 'JetBrains Mono' }}>₹{totalIGST.toFixed(2)}</td>
                  <td style={{ fontFamily: 'JetBrains Mono' }}>₹{totalCGST.toFixed(2)}</td>
                  <td style={{ fontFamily: 'JetBrains Mono' }}>₹{totalSGST.toFixed(2)}</td>
                </tr>
                <tr style={{ fontWeight: 700 }}>
                  <td style={{ color: 'var(--t1)', fontWeight: 700 }}>Total Tax Liability</td>
                  <td></td>
                  <td style={{ fontFamily: 'JetBrains Mono', color: 'var(--green)', fontWeight: 700 }}>₹{totalIGST.toFixed(2)}</td>
                  <td style={{ fontFamily: 'JetBrains Mono', color: 'var(--green)', fontWeight: 700 }}>₹{totalCGST.toFixed(2)}</td>
                  <td style={{ fontFamily: 'JetBrains Mono', color: 'var(--green)', fontWeight: 700 }}>₹{totalSGST.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="card mb-16">
            <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14, marginBottom: 14, color: 'var(--blue)' }}>4 — Eligible ITC (Input Tax Credit from Purchases)</div>
            <table className="tbl">
              <thead><tr><th>Type</th><th>IGST</th><th>CGST</th><th>SGST</th></tr></thead>
              <tbody>
                <tr>
                  <td style={{ color: 'var(--t1)' }}>ITC from purchases (Inputs)</td>
                  <td style={{ fontFamily: 'JetBrains Mono' }}>₹0.00</td>
                  <td style={{ fontFamily: 'JetBrains Mono', color: 'var(--blue)' }}>₹{itcCGST.toFixed(2)}</td>
                  <td style={{ fontFamily: 'JetBrains Mono', color: 'var(--blue)' }}>₹{itcSGST.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="card" style={{ background: 'var(--ad)', borderColor: 'var(--ab)' }}>
            <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14, marginBottom: 12, color: 'var(--amber)' }}>Net GST Payable</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              {[['IGST', totalIGST], ['CGST', Math.max(0, totalCGST - itcCGST)], ['SGST', Math.max(0, totalSGST - itcSGST)]].map(([l, v]) => (
                <div key={l} style={{ background: 'var(--bg2)', borderRadius: 'var(--r)', padding: '10px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 700, marginBottom: 4 }}>{l}</div>
                  <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 17, color: 'var(--amber)' }}>₹{v.toFixed(2)}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--bg2)', borderRadius: 'var(--r)', display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700 }}>
              <span style={{ color: 'var(--t1)' }}>Total Net Payable</span>
              <span style={{ color: 'var(--amber)', fontFamily: 'JetBrains Mono' }}>₹{netPayable.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {tab === 'hsn' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button className="btn bs btn-sm" onClick={exportHSN}>⬇ Export HSN CSV</button>
          </div>
          <div className="card" style={{ padding: 0 }}>
            <table className="tbl">
              <thead><tr><th>HSN Code</th><th>Description</th><th>Qty</th><th>Taxable Value</th><th>CGST</th><th>SGST</th><th>IGST</th><th>Total GST</th></tr></thead>
              <tbody>
                {hsnSummary.length === 0 && <tr><td colSpan={8}><div className="empty"><p>No data for {month}</p></div></td></tr>}
                {hsnSummary.map(h => (
                  <tr key={h.hsn}>
                    <td style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, color: 'var(--amber)' }}>{h.hsn}</td>
                    <td style={{ fontSize: 12, color: 'var(--t1)' }}>{h.desc}</td>
                    <td style={{ fontFamily: 'JetBrains Mono' }}>{h.qty}</td>
                    <td style={{ fontFamily: 'JetBrains Mono' }}>₹{h.taxable.toFixed(2)}</td>
                    <td style={{ fontFamily: 'JetBrains Mono', fontSize: 11.5, color: 'var(--t3)' }}>₹{h.cgst.toFixed(2)}</td>
                    <td style={{ fontFamily: 'JetBrains Mono', fontSize: 11.5, color: 'var(--t3)' }}>₹{h.sgst.toFixed(2)}</td>
                    <td style={{ fontFamily: 'JetBrains Mono', fontSize: 11.5, color: 'var(--t3)' }}>₹{h.igst.toFixed(2)}</td>
                    <td style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, color: 'var(--green)' }}>₹{(h.cgst + h.sgst + h.igst).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'itc' && (
        <div>
          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--b1)' }}>
              <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 13 }}>Input Tax Credit — Purchase Invoices ({month})</div>
            </div>
            <table className="tbl">
              <thead><tr><th>PO Number</th><th>Supplier</th><th>Date</th><th>Taxable</th><th>CGST Credit</th><th>SGST Credit</th><th>Total ITC</th></tr></thead>
              <tbody>
                {poFiltered.length === 0 && <tr><td colSpan={7}><div className="empty"><p>No purchases for {month}</p></div></td></tr>}
                {poFiltered.map(po => {
                  const taxable = po.subtotal || 0
                  const cgst = (po.totalGst || 0) / 2
                  return (
                    <tr key={po.id}>
                      <td style={{ fontFamily: 'JetBrains Mono', fontSize: 11 }}>{po.poNumber}</td>
                      <td style={{ color: 'var(--t1)' }}>{po.supplierName}</td>
                      <td style={{ color: 'var(--t3)', fontSize: 11.5 }}>{po.date}</td>
                      <td style={{ fontFamily: 'JetBrains Mono' }}>₹{taxable.toFixed(2)}</td>
                      <td style={{ fontFamily: 'JetBrains Mono', color: 'var(--blue)' }}>₹{cgst.toFixed(2)}</td>
                      <td style={{ fontFamily: 'JetBrains Mono', color: 'var(--blue)' }}>₹{cgst.toFixed(2)}</td>
                      <td style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, color: 'var(--green)' }}>₹{(po.totalGst || 0).toFixed(2)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {poFiltered.length > 0 && (
              <div style={{ padding: '10px 16px', background: 'var(--bg3)', borderTop: '1px solid var(--b1)', display: 'flex', justifyContent: 'flex-end', gap: 24 }}>
                <span style={{ fontSize: 12, color: 'var(--t3)' }}>Total ITC Available: <strong style={{ color: 'var(--blue)', fontFamily: 'JetBrains Mono' }}>₹{(itcCGST + itcSGST).toFixed(2)}</strong></span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
