import { useMemo, useState } from 'react'
import { downloadCSV } from '../utils/csv.js'

export function StockAlerts({ state, dispatch, toast, navigate }) {
  const { variants, products, inventory, purchaseOrders, settings, suppliers } = state
  const LOW = settings.lowStockThreshold || 10
  const [tab, setTab] = useState('low')

  const stockData = useMemo(() => variants.map(v => {
    const p = products.find(x => x.id === v.productId)
    const inv = inventory.find(i => i.variantId === v.id)
    const qty = inv?.qty || 0
    const pendingPO = purchaseOrders.filter(po => po.status === 'pending' && po.items?.some(item => item.variantId === v.id)).reduce((s, po) => s + (po.items?.find(i => i.variantId === v.id)?.qty || 0), 0)
    return { variantId: v.id, sku: v.sku, name: `${p?.name || 'Unknown'}`, size: v.size, color: v.color, qty, pendingPO, category: p?.category || 'Other', reorderQty: LOW * 3, isLow: qty <= LOW && qty > 0, isOut: qty === 0, isExcess: qty > LOW * 20 }
  }), [variants, products, inventory, purchaseOrders, LOW])

  const low    = stockData.filter(s => s.isLow)
  const out    = stockData.filter(s => s.isOut)
  const excess = stockData.filter(s => s.isExcess)
  const all    = tab === 'low' ? low : tab === 'out' ? out : excess

  function exportAlerts() {
    const rows = [['SKU','Product','Size','Color','Current Qty','Status','Recommended Order'],
      ...all.map(s => [s.sku, s.name, s.size, s.color, s.qty, s.isOut ? 'Out of Stock' : s.isLow ? 'Low Stock' : 'Excess', s.isOut ? s.reorderQty : s.isLow ? s.reorderQty - s.qty : 0])]
    downloadCSV('stock_alerts.csv', rows)
  }

  function quickPO(item) {
    navigate('purchase')
    toast.show('Go to Purchase Orders to create a PO for: ' + item.sku, 'info')
  }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:18 }}>
        <div className="sh" style={{ margin:0 }}><h2>Stock Alerts</h2><p>Low stock, out of stock, and excess inventory</p></div>
        <button className="btn bs btn-sm" onClick={exportAlerts}>⬇ Export</button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:18 }}>
        {[
          { id:'out',    label:'Out of Stock',  count:out.length,    c:'var(--red)',   bg:'var(--rd)' },
          { id:'low',    label:'Low Stock',     count:low.length,    c:'var(--amber)', bg:'var(--ad)' },
          { id:'excess', label:'Excess Stock',  count:excess.length, c:'var(--blue)',  bg:'var(--bi)' },
        ].map(s => (
          <div key={s.id} className="stat" onClick={() => setTab(s.id)} style={{ cursor:'pointer', background: tab === s.id ? s.bg : 'var(--bg2)', borderColor: tab === s.id ? s.c + '44' : 'var(--b1)', borderWidth: tab === s.id ? 2 : 1 }}>
            <div className="stat-v" style={{ color:s.c }}>{s.count}</div>
            <div className="stat-l">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding:0 }}>
        <table className="tbl">
          <thead><tr><th>SKU</th><th>Product</th><th>Size</th><th>Color</th><th>Current Stock</th><th>Pending PO</th><th>Action</th></tr></thead>
          <tbody>
            {all.length === 0 && <tr><td colSpan={7}><div className="empty"><div style={{ fontSize:28, marginBottom:8 }}>✅</div><p>No {tab === 'low' ? 'low stock' : tab === 'out' ? 'out of stock' : 'excess stock'} items!</p></div></td></tr>}
            {all.map(item => (
              <tr key={item.variantId}>
                <td style={{ fontFamily:'JetBrains Mono', fontSize:11, color:'var(--amber)' }}>{item.sku}</td>
                <td style={{ fontWeight:500, color:'var(--t1)' }}>{item.name}</td>
                <td style={{ fontSize:12, color:'var(--t3)' }}>{item.size || '—'}</td>
                <td style={{ fontSize:12, color:'var(--t3)' }}>{item.color || '—'}</td>
                <td>
                  <span style={{ fontFamily:'JetBrains Mono', fontWeight:700, fontSize:14, color: item.isOut ? 'var(--red)' : item.isLow ? 'var(--amber)' : 'var(--blue)' }}>{item.qty}</span>
                  <span style={{ marginLeft:6, fontSize:10, padding:'1px 7px', borderRadius:10, background: item.isOut ? 'var(--rd)' : item.isLow ? 'var(--ad)' : 'var(--bi)', color: item.isOut ? 'var(--red)' : item.isLow ? 'var(--amber)' : 'var(--blue)' }}>
                    {item.isOut ? 'OUT' : item.isLow ? 'LOW' : 'EXCESS'}
                  </span>
                </td>
                <td style={{ fontFamily:'JetBrains Mono', color:'var(--blue)', fontSize:12 }}>{item.pendingPO > 0 ? `+${item.pendingPO} incoming` : '—'}</td>
                <td>
                  {(item.isOut || item.isLow) && (
                    <button className="btn bs btn-sm" onClick={() => quickPO(item)}>📦 Create PO</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
