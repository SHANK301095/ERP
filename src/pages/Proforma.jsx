import { useState, useMemo, useEffect } from 'react'
import { Icon, Modal } from '../components/ui/index.jsx'
import { uid, today } from '../utils/csv.js'
import { calcInvoiceTotals, nextInvoiceNo, numToWords } from '../utils/gst.js'

export function Proforma({ state, dispatch, toast }) {
  const { customers, products, variants, inventory, settings, salesInvoices } = state
  const [showForm, setShowForm] = useState(false)
  const [docType, setDocType] = useState('proforma')  // proforma | challan | creditnote
  const [docs, setDocs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('lfp_proforma') || '[]') } catch { return [] }
  })
  const [viewDoc, setViewDoc] = useState(null)

  function saveDoc(data) {
    const prefix = docType === 'proforma' ? 'PRO' : docType === 'challan' ? 'DC' : 'CN'
    const existing = docs.filter(d => d.docType === docType)
    const num = existing.length + 1
    const doc = { id: uid(), docType, docNumber: `${prefix}-${new Date().getFullYear()}-${String(num).padStart(4,'0')}`, ...data, createdAt: today() }
    const newDocs = [doc, ...docs]
    setDocs(newDocs)
    localStorage.setItem('lfp_proforma', JSON.stringify(newDocs))
    toast.show(`${docType === 'proforma' ? 'Proforma Invoice' : docType === 'challan' ? 'Delivery Challan' : 'Credit Note'} created`, 'ok')
    setShowForm(false)
  }

  const labels = { proforma: 'Proforma Invoice', challan: 'Delivery Challan', creditnote: 'Credit Note' }
  const colors  = { proforma: 'var(--blue)', challan: 'var(--green)', creditnote: 'var(--amber)' }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
        <div className="sh" style={{ margin: 0 }}><h2>Other Documents</h2><p>Proforma Invoices, Delivery Challans, Credit Notes</p></div>
        <div style={{ display: 'flex', gap: 6 }}>
          {Object.entries(labels).map(([k, l]) => (
            <button key={k} className={`btn btn-sm ${docType === k ? 'bp' : 'bg'}`} onClick={() => { setDocType(k); setShowForm(true) }}>+ {l}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
        {Object.entries(labels).map(([k, l]) => {
          const count = docs.filter(d => d.docType === k).length
          return (
            <div key={k} className="stat" style={{ cursor: 'default' }}>
              <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 28, color: colors[k] }}>{count}</div>
              <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 4 }}>{l}s</div>
            </div>
          )
        })}
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table className="tbl">
          <thead><tr><th>Document No.</th><th>Type</th><th>Customer</th><th>Date</th><th>Amount</th><th>Action</th></tr></thead>
          <tbody>
            {docs.length === 0 && <tr><td colSpan={6}><div className="empty"><p>No documents yet. Create a Proforma Invoice, Challan, or Credit Note.</p></div></td></tr>}
            {docs.map(doc => (
              <tr key={doc.id}>
                <td style={{ fontFamily: 'JetBrains Mono', fontSize: 11 }}>{doc.docNumber}</td>
                <td><span className="badge" style={{ background: `${colors[doc.docType]}18`, color: colors[doc.docType] }}>{labels[doc.docType]}</span></td>
                <td style={{ color: 'var(--t1)' }}>{doc.customerName}</td>
                <td style={{ color: 'var(--t3)', fontSize: 11.5 }}>{doc.date || doc.createdAt}</td>
                <td style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, color: 'var(--amber)' }}>₹{(doc.grandTotal || 0).toLocaleString('en-IN')}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn bg btn-sm" onClick={() => setViewDoc(doc)}>👁 View</button>
                    {doc.docType === 'proforma' && (
                      <button className="btn btn-sm" style={{ background: 'var(--gd)', color: 'var(--green)', borderColor: 'transparent' }}
                        onClick={() => { dispatch({ type: 'ADD_INVOICE', payload: { id: uid(), invoiceNumber: nextInvoiceNo(salesInvoices.map(i => i.invoiceNumber), settings.invoicePrefix || 'INV'), ...doc, status: 'unpaid', createdAt: today() } }); toast.show('Converted to Invoice', 'ok') }}>
                        → Invoice
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <DocForm open={showForm} onClose={() => setShowForm(false)} onSave={saveDoc} docType={docType} customers={customers} products={products} variants={variants} inventory={inventory} />
      {viewDoc && <DocView doc={viewDoc} onClose={() => setViewDoc(null)} settings={settings} labels={labels} />}
    </div>
  )
}

function DocForm({ open, onClose, onSave, docType, customers, products, variants, inventory }) {
  const blank = { customerId: '', customerName: '', customerAddress: '', customerGstin: '', date: today(), notes: '', items: [], interstate: false }
  const [f, setF] = useState(blank)
  const [addItem, setAddItem] = useState({ variantId: '', qty: 1, unitPrice: '', gstRate: 5, discount: 0 })
  useEffect(() => setF(blank), [open])

  function addLine() {
    if (!addItem.variantId || !addItem.unitPrice) return
    const v = variants.find(x => x.id === addItem.variantId)
    const p = products.find(x => x.id === v?.productId)
    const item = { variantId: addItem.variantId, sku: v?.sku || '', productName: `${p?.shortName || p?.name || ''} ${v?.size || ''} ${v?.color || ''}`.trim(), qty: parseInt(addItem.qty) || 1, unitPrice: parseFloat(addItem.unitPrice) || 0, gstRate: parseFloat(addItem.gstRate) || 5, discount: parseFloat(addItem.discount) || 0, hsnCode: p?.hsnCode || '' }
    setF(prev => { const items = [...prev.items, item]; return { ...prev, items, ...calcInvoiceTotals(items, prev.interstate) } })
    setAddItem({ variantId: '', qty: 1, unitPrice: '', gstRate: 5, discount: 0 })
  }

  const docLabels = { proforma: 'Proforma Invoice', challan: 'Delivery Challan', creditnote: 'Credit Note' }

  return (
    <Modal open={open} onClose={onClose} title={`New ${docLabels[docType] || 'Document'}`} size="modal-xl"
      footer={<><button className="btn bg" onClick={onClose}>Cancel</button><button className="btn bp" onClick={() => f.customerId && f.items.length && onSave(f)} disabled={!f.customerId || !f.items.length}>Create</button></>}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div className="fg"><label className="fl">Customer *</label>
          <select className="field" value={f.customerId} onChange={e => { const c = customers.find(x => x.id === e.target.value); setF(p => ({ ...p, customerId: e.target.value, customerName: c?.name || '', customerAddress: c?.address || '', customerGstin: c?.gstin || '' })) }}>
            <option value="">Select Customer</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="fg"><label className="fl">Date</label><input className="field" type="date" value={f.date} onChange={e => setF(p => ({ ...p, date: e.target.value }))} /></div>
        <div className="fg"><label className="fl">Notes</label><input className="field" value={f.notes} onChange={e => setF(p => ({ ...p, notes: e.target.value }))} /></div>
      </div>
      <div className="card" style={{ background: 'var(--bg3)', marginBottom: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 12.5, marginBottom: 10 }}>Add Items</div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: 8, alignItems: 'flex-end' }}>
          <div className="fg" style={{ margin: 0 }}><label className="fl">SKU</label>
            <select className="field" value={addItem.variantId} onChange={e => { const v = variants.find(x => x.id === e.target.value); const p = products.find(x => x.id === v?.productId); setAddItem(prev => ({ ...prev, variantId: e.target.value, unitPrice: v?.priceOverride || p?.mrp || '', gstRate: p?.gst || 5 })) }}>
              <option value="">Select</option>
              {variants.map(v => { const p = products.find(x => x.id === v.productId); return <option key={v.id} value={v.id}>{v.sku} — {p?.shortName || p?.name}</option> })}
            </select>
          </div>
          <div className="fg" style={{ margin: 0 }}><label className="fl">Qty</label><input className="field" type="number" min="1" value={addItem.qty} onChange={e => setAddItem(p => ({ ...p, qty: e.target.value }))} /></div>
          <div className="fg" style={{ margin: 0 }}><label className="fl">Rate (₹)</label><input className="field" type="number" value={addItem.unitPrice} onChange={e => setAddItem(p => ({ ...p, unitPrice: e.target.value }))} /></div>
          <div className="fg" style={{ margin: 0 }}><label className="fl">GST%</label><select className="field" value={addItem.gstRate} onChange={e => setAddItem(p => ({ ...p, gstRate: +e.target.value }))}>{[0, 5, 12, 18, 28].map(g => <option key={g} value={g}>{g}%</option>)}</select></div>
          <button className="btn bp btn-sm" style={{ marginBottom: 12 }} onClick={addLine}>+ Add</button>
        </div>
      </div>
      {f.items.length > 0 && (
        <div className="card" style={{ padding: 0, marginBottom: 12 }}>
          <table className="tbl">
            <thead><tr><th>SKU</th><th>Description</th><th>Qty</th><th>Rate</th><th>GST</th><th>Total</th><th></th></tr></thead>
            <tbody>
              {f.items.map((item, i) => {
                const taxable = item.qty * item.unitPrice
                const gst = (taxable * item.gstRate) / 100
                return (
                  <tr key={i}>
                    <td style={{ fontFamily: 'JetBrains Mono', fontSize: 11 }}>{item.sku}</td>
                    <td style={{ fontSize: 12 }}>{item.productName}</td>
                    <td>{item.qty}</td>
                    <td style={{ fontFamily: 'JetBrains Mono' }}>₹{item.unitPrice}</td>
                    <td style={{ color: 'var(--t3)' }}>{item.gstRate}%</td>
                    <td style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, color: 'var(--amber)' }}>₹{(taxable + gst).toFixed(2)}</td>
                    <td><button className="btn bd btn-sm" onClick={() => { const items = f.items.filter((_, j) => j !== i); setF(p => ({ ...p, items, ...calcInvoiceTotals(items, p.interstate) })) }}>✕</button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div style={{ padding: '10px 16px', background: 'var(--bg3)', borderTop: '1px solid var(--b1)', textAlign: 'right', fontFamily: 'JetBrains Mono', fontWeight: 700, color: 'var(--amber)', fontSize: 15 }}>
            Grand Total: ₹{(f.grandTotal || 0).toFixed(2)}
          </div>
        </div>
      )}
    </Modal>
  )
}

function DocView({ doc, onClose, settings, labels }) {
  const colors = { proforma: '#3b82f6', challan: '#22c55e', creditnote: '#f59e0b' }
  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="mhd"><div className="mt">{labels[doc.docType]} — {doc.docNumber}</div><div style={{ display: 'flex', gap: 8 }}><button className="btn bs btn-sm" onClick={() => window.print()}>🖨 Print</button><button className="xbtn" onClick={onClose}>✕</button></div></div>
        <div className="modal-body" style={{ background: 'white', color: '#111' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 12, borderBottom: '2px solid #111' }}>
            <div>
              {settings.logoBase64 && <img src={settings.logoBase64} style={{ height: 40, marginBottom: 6 }} />}
              <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 20 }}>{settings.brandName}</div>
              {settings.address && <div style={{ fontSize: 11.5, color: '#555' }}>{settings.address}</div>}
              {settings.gstin && <div style={{ fontSize: 11.5, fontFamily: 'monospace', color: '#555' }}>GSTIN: {settings.gstin}</div>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 18, color: colors[doc.docType] }}>{labels[doc.docType]?.toUpperCase()}</div>
              <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: colors[doc.docType] }}>{doc.docNumber}</div>
              <div style={{ fontSize: 11.5, color: '#555', marginTop: 3 }}>Date: {doc.date}</div>
            </div>
          </div>
          <div style={{ background: '#f8f9fa', padding: '10px 12px', borderRadius: 6, marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#888', marginBottom: 4 }}>Customer</div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{doc.customerName}</div>
            {doc.customerAddress && <div style={{ fontSize: 12, color: '#555' }}>{doc.customerAddress}</div>}
            {doc.customerGstin && <div style={{ fontSize: 12, fontFamily: 'monospace', color: '#555' }}>GSTIN: {doc.customerGstin}</div>}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 12 }}>
            <thead><tr style={{ background: '#111', color: 'white' }}>{['#', 'Description', 'HSN', 'Qty', 'Rate', 'GST%', 'Total'].map(h => <th key={h} style={{ padding: '6px 10px', textAlign: 'left' }}>{h}</th>)}</tr></thead>
            <tbody>
              {(doc.items || []).map((item, i) => {
                const taxable = item.qty * item.unitPrice
                const gst = (taxable * item.gstRate) / 100
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '7px 10px', color: '#888' }}>{i + 1}</td>
                    <td style={{ padding: '7px 10px' }}><div style={{ fontWeight: 600 }}>{item.productName}</div><div style={{ fontSize: 10, fontFamily: 'monospace', color: '#888' }}>{item.sku}</div></td>
                    <td style={{ padding: '7px 10px', fontFamily: 'monospace', fontSize: 11 }}>{item.hsnCode || '—'}</td>
                    <td style={{ padding: '7px 10px' }}>{item.qty}</td>
                    <td style={{ padding: '7px 10px', fontFamily: 'monospace' }}>₹{item.unitPrice}</td>
                    <td style={{ padding: '7px 10px' }}>{item.gstRate}%</td>
                    <td style={{ padding: '7px 10px', fontFamily: 'monospace', fontWeight: 700 }}>₹{(taxable + gst).toFixed(2)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ width: 240, background: '#f8f9fa', borderRadius: 6, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 16 }}><span>Grand Total</span><span style={{ fontFamily: 'monospace', color: colors[doc.docType] }}>₹{(doc.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
              <div style={{ fontSize: 11, color: '#777', marginTop: 6 }}>{numToWords(Math.round(doc.grandTotal || 0))}</div>
            </div>
          </div>
          {doc.notes && <div style={{ marginTop: 10, fontSize: 12, color: '#555', fontStyle: 'italic' }}>Note: {doc.notes}</div>}
          {doc.docType === 'proforma' && <div style={{ marginTop: 12, fontSize: 11, color: '#888', borderTop: '1px dashed #ddd', paddingTop: 8 }}>This is a Proforma Invoice and not a tax invoice. Goods will be dispatched after confirmation of order.</div>}
        </div>
        <div className="mft"><button className="btn bg" onClick={onClose}>Close</button><button className="btn bp" onClick={() => window.print()}>🖨 Print</button></div>
      </div>
    </div>
  )
}
