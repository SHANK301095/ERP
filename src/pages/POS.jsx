import { useState, useMemo, useRef, useEffect } from 'react'
import { Icon, useToast } from '../components/ui/index.jsx'
import { uid, today } from '../utils/csv.js'
import { calcInvoiceTotals, nextInvoiceNo, fmtINR } from '../utils/gst.js'

export function POS({ state, dispatch, toast }) {
  const { variants, products, inventory, customers, salesInvoices, settings } = state
  const [cart, setCart] = useState([])
  const [scanQ, setScanQ] = useState('')
  const [customerId, setCustomerId] = useState('c2')
  const [payMode, setPayMode] = useState('cash')
  const [cashGiven, setCashGiven] = useState('')
  const [showReceipt, setShowReceipt] = useState(null)
  const scanRef = useRef(null)

  useEffect(() => { scanRef.current?.focus() }, [])

  const customer = customers.find(c => c.id === customerId)

  function findVariant(q) {
    const lq = q.trim().toLowerCase()
    return variants.find(v => v.sku.toLowerCase() === lq || v.sku.toLowerCase().includes(lq))
  }

  function addToCart(variantId) {
    const v = variants.find(x => x.id === variantId)
    const p = products.find(x => x.id === v?.productId)
    const inv = inventory.find(i => i.variantId === variantId)
    if (!v || !p) return
    if ((inv?.qty || 0) === 0) { toast.show('Out of stock!', 'err'); return }
    setCart(prev => {
      const exists = prev.find(i => i.variantId === variantId)
      if (exists) return prev.map(i => i.variantId === variantId ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, { variantId, sku: v.sku, name: `${p.shortName || p.name} ${v.size || ''} ${v.color || ''}`.trim(), qty: 1, unitPrice: v.priceOverride || p.mrp, gstRate: p.gst || 5, hsnCode: p.hsnCode || '', maxQty: inv?.qty || 0 }]
    })
    setScanQ('')
    scanRef.current?.focus()
  }

  function handleScan(e) {
    if (e.key === 'Enter') {
      const v = findVariant(scanQ)
      if (v) addToCart(v.id)
      else toast.show('SKU not found: ' + scanQ, 'err')
    }
  }

  function updateQty(variantId, delta) {
    setCart(prev => prev.map(i => i.variantId === variantId
      ? { ...i, qty: Math.max(0, Math.min(i.maxQty, i.qty + delta)) }
      : i
    ).filter(i => i.qty > 0))
  }

  function removeItem(variantId) { setCart(prev => prev.filter(i => i.variantId !== variantId)) }

  const totals = useMemo(() => calcInvoiceTotals(cart, false), [cart])
  const change = cashGiven ? Math.max(0, parseFloat(cashGiven) - totals.grandTotal) : 0

  function checkout() {
    if (!cart.length) { toast.show('Cart is empty', 'err'); return }
    const invNumber = nextInvoiceNo(salesInvoices.map(i => i.invoiceNumber), settings.invoicePrefix || 'INV')
    const invoice = {
      id: uid(), invoiceNumber: invNumber, customerId, customerName: customer?.name || 'Walk-in',
      customerAddress: customer?.address || '', customerGstin: customer?.gstin || '',
      date: today(), dueDate: today(), status: 'paid', paymentDate: today(),
      paymentMode: payMode, interstate: false,
      items: cart.map(i => ({ ...i, discount: 0 })),
      ...totals, createdAt: new Date().toISOString()
    }
    dispatch({ type: 'ADD_INVOICE', payload: invoice })
    toast.show('Sale complete! ' + invNumber, 'ok')
    setShowReceipt(invoice)
    setCart([])
    setCashGiven('')
    scanRef.current?.focus()
  }

  const stockOf = id => inventory.find(i => i.variantId === id)?.qty || 0

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 14, height: 'calc(100vh - 110px)' }}>
      {/* LEFT — Product grid + scan */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden' }}>
        <div className="card" style={{ padding: '10px 14px' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--amber)', fontSize: 16 }}>⊟</span>
              <input ref={scanRef} className="field" style={{ paddingLeft: 32, fontFamily: 'JetBrains Mono', fontSize: 14, fontWeight: 600 }}
                placeholder="Scan barcode or type SKU + Enter…"
                value={scanQ} onChange={e => setScanQ(e.target.value)} onKeyDown={handleScan} autoFocus />
            </div>
            <span style={{ fontSize: 11, color: 'var(--t3)', whiteSpace: 'nowrap' }}>↵ to add</span>
          </div>
        </div>

        {/* Quick product buttons */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
            {variants.filter(v => v.status === 'active').map(v => {
              const p = products.find(x => x.id === v.productId)
              const qty = stockOf(v.id)
              const inCart = cart.find(i => i.variantId === v.id)
              return (
                <div key={v.id} onClick={() => qty > 0 && addToCart(v.id)}
                  style={{ background: inCart ? 'var(--ad)' : 'var(--bg2)', border: `1px solid ${inCart ? 'var(--ab)' : qty === 0 ? 'var(--rd)' : 'var(--b1)'}`, borderRadius: 'var(--rl)', padding: '10px 11px', cursor: qty > 0 ? 'pointer' : 'not-allowed', opacity: qty === 0 ? 0.5 : 1, transition: 'all .1s', userSelect: 'none' }}>
                  <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: inCart ? 'var(--amber)' : 'var(--t3)', marginBottom: 4 }}>{v.sku}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t1)', lineHeight: 1.3, marginBottom: 6 }}>{p?.shortName || p?.name}</div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
                    {v.size && <span style={{ fontSize: 9.5, background: 'var(--ad)', color: 'var(--amber)', padding: '1px 5px', borderRadius: 10, fontWeight: 700 }}>{v.size}</span>}
                    {v.color && <span style={{ fontSize: 9.5, background: 'var(--bd)', color: 'var(--blue)', padding: '1px 5px', borderRadius: 10 }}>{v.color}</span>}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 13, color: 'var(--green)' }}>₹{v.priceOverride || p?.mrp}</span>
                    <span style={{ fontSize: 10, color: qty <= 10 ? 'var(--amber)' : 'var(--t3)' }}>{qty} left</span>
                  </div>
                  {inCart && <div style={{ marginTop: 4, fontSize: 10, color: 'var(--amber)', fontWeight: 700 }}>✓ In cart ×{inCart.qty}</div>}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* RIGHT — Cart + Checkout */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden' }}>
        <div className="card" style={{ padding: '10px 14px', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 700 }}>CUSTOMER</span>
          </div>
          <select className="field" style={{ fontSize: 12 }} value={customerId} onChange={e => setCustomerId(e.target.value)}>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="card" style={{ padding: 0, flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--b1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 13 }}>Cart</span>
            {cart.length > 0 && <button className="btn btn-sm" style={{ background: 'var(--rd)', color: 'var(--red)', borderColor: 'transparent', fontSize: 11 }} onClick={() => setCart([])}>Clear All</button>}
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {cart.length === 0 ? (
              <div style={{ padding: 30, textAlign: 'center', color: 'var(--t4)' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🛒</div>
                <div style={{ fontSize: 12 }}>Scan or tap product to add</div>
              </div>
            ) : cart.map(item => (
              <div key={item.variantId} style={{ padding: '9px 14px', borderBottom: '1px solid var(--b1)', display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--amber)', marginBottom: 1 }}>{item.sku}</div>
                  <div style={{ fontSize: 12, color: 'var(--t1)', fontWeight: 500 }}>{item.name}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <button onClick={() => updateQty(item.variantId, -1)} style={{ width: 22, height: 22, borderRadius: 4, background: 'var(--bg4)', border: '1px solid var(--b2)', color: 'var(--t1)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                  <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 13, minWidth: 20, textAlign: 'center' }}>{item.qty}</span>
                  <button onClick={() => updateQty(item.variantId, 1)} style={{ width: 22, height: 22, borderRadius: 4, background: 'var(--bg4)', border: '1px solid var(--b2)', color: 'var(--t1)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                </div>
                <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, color: 'var(--amber)', fontSize: 12, minWidth: 55, textAlign: 'right' }}>₹{(item.qty * item.unitPrice).toLocaleString('en-IN')}</div>
                <button onClick={() => removeItem(item.variantId)} style={{ background: 'none', border: 'none', color: 'var(--t4)', cursor: 'pointer', fontSize: 14, padding: 2 }}>✕</button>
              </div>
            ))}
          </div>
          {cart.length > 0 && (
            <div style={{ borderTop: '1px solid var(--b2)', padding: '10px 14px', background: 'var(--bg3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--t3)', marginBottom: 4 }}>
                <span>Subtotal</span><span>₹{(totals.subtotal || 0).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--t3)', marginBottom: 6 }}>
                <span>GST</span><span>₹{(totals.totalGst || 0).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'Syne', fontWeight: 800, fontSize: 20, color: 'var(--amber)' }}>
                <span>TOTAL</span><span>₹{(totals.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          )}
        </div>

        <div className="card" style={{ padding: '12px 14px', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            {[['cash', '💵 Cash'], ['upi', '📱 UPI'], ['card', '💳 Card'], ['credit', '📋 Credit']].map(([v, l]) => (
              <button key={v} onClick={() => setPayMode(v)}
                style={{ flex: 1, padding: '6px 4px', borderRadius: 'var(--r)', fontSize: 11, fontWeight: 600, cursor: 'pointer', border: `1px solid ${payMode === v ? 'var(--amber)' : 'var(--b1)'}`, background: payMode === v ? 'var(--ad)' : 'var(--bg3)', color: payMode === v ? 'var(--amber)' : 'var(--t3)' }}>{l}</button>
            ))}
          </div>
          {payMode === 'cash' && (
            <div style={{ marginBottom: 10 }}>
              <input className="field" style={{ fontFamily: 'JetBrains Mono', fontSize: 16, textAlign: 'right', marginBottom: 4 }}
                type="number" placeholder="Cash received…" value={cashGiven} onChange={e => setCashGiven(e.target.value)} />
              {cashGiven && totals.grandTotal > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, color: change >= 0 ? 'var(--green)' : 'var(--red)', padding: '4px 8px', background: change >= 0 ? 'var(--gd)' : 'var(--rd)', borderRadius: 'var(--r)' }}>
                  <span>Change</span><span>₹{change.toFixed(2)}</span>
                </div>
              )}
            </div>
          )}
          <button className="btn bp" style={{ width: '100%', fontSize: 15, padding: '11px', fontFamily: 'Syne', fontWeight: 700 }} onClick={checkout} disabled={!cart.length}>
            ✓ CHARGE ₹{(totals.grandTotal || 0).toLocaleString('en-IN')}
          </button>
        </div>
      </div>

      {showReceipt && <ReceiptModal inv={showReceipt} settings={settings} onClose={() => setShowReceipt(null)} />}
    </div>
  )
}

function ReceiptModal({ inv, settings, onClose }) {
  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-sm">
        <div className="mhd" style={{ padding: '14px 18px 10px' }}>
          <div className="mt">Receipt — {inv.invoiceNumber}</div>
          <button className="xbtn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ background: 'white', color: '#111', fontFamily: 'monospace', fontSize: 12 }}>
          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            {settings.logoBase64 && <img src={settings.logoBase64} style={{ height: 36, marginBottom: 6 }} />}
            <div style={{ fontWeight: 800, fontSize: 16 }}>{settings.brandName}</div>
            {settings.address && <div style={{ fontSize: 11, color: '#555' }}>{settings.address}</div>}
            {settings.phone && <div style={{ fontSize: 11, color: '#555' }}>📞 {settings.phone}</div>}
            <div style={{ borderTop: '1px dashed #999', margin: '8px 0' }} />
            <div style={{ fontSize: 11 }}>{inv.invoiceNumber} · {inv.date}</div>
            <div style={{ fontSize: 11 }}>Customer: {inv.customerName}</div>
            <div style={{ fontSize: 11 }}>Payment: {inv.paymentMode?.toUpperCase()}</div>
            <div style={{ borderTop: '1px dashed #999', margin: '8px 0' }} />
          </div>
          {inv.items.map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700 }}>{item.name}</div>
                <div style={{ fontSize: 10, color: '#777' }}>{item.sku} × {item.qty} @ ₹{item.unitPrice}</div>
              </div>
              <div style={{ fontWeight: 700 }}>₹{(item.qty * item.unitPrice).toLocaleString('en-IN')}</div>
            </div>
          ))}
          <div style={{ borderTop: '1px dashed #999', margin: '8px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}><span>Subtotal</span><span>₹{(inv.subtotal || 0).toFixed(2)}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}><span>GST</span><span>₹{(inv.totalGst || 0).toFixed(2)}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 15, marginTop: 6 }}><span>TOTAL</span><span>₹{(inv.grandTotal || 0).toLocaleString('en-IN')}</span></div>
          <div style={{ borderTop: '1px dashed #999', margin: '8px 0' }} />
          <div style={{ textAlign: 'center', fontSize: 11, color: '#777' }}>Thank you for shopping!<br />{settings.brandName}</div>
        </div>
        <div className="mft">
          <button className="btn bg" onClick={onClose}>Close</button>
          <button className="btn bp" onClick={() => window.print()}>🖨 Print Receipt</button>
        </div>
      </div>
    </div>
  )
}
