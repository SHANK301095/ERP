import { useMemo, useState } from 'react'
import { downloadCSV } from '../utils/csv.js'

export function ProfitLoss({ state }) {
  const { salesInvoices, purchaseOrders } = state
  const [period, setPeriod] = useState('month')
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [year, setYear]   = useState(new Date().getFullYear().toString())

  function inPeriod(dateStr) {
    if (!dateStr) return false
    if (period === 'month') return dateStr.startsWith(month)
    if (period === 'year')  return dateStr.startsWith(year)
    return true
  }

  const sales   = salesInvoices.filter(i => i.status !== 'cancelled' && inPeriod(i.date))
  const pos     = purchaseOrders.filter(po => inPeriod(po.date))

  const revenue     = sales.reduce((s, i) => s + (i.grandTotal || 0), 0)
  const gstOut      = sales.reduce((s, i) => s + (i.totalGst || 0), 0)
  const netRevenue  = revenue - gstOut

  const purchases   = pos.reduce((s, po) => s + (po.grandTotal || 0), 0)
  const gstIn       = pos.reduce((s, po) => s + (po.totalGst || 0), 0)
  const netPurchase = purchases - gstIn

  const grossProfit = netRevenue - netPurchase
  const grossMargin = netRevenue > 0 ? (grossProfit / netRevenue * 100) : 0

  // Monthly breakdown for last 12 months
  const months = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const key = d.toISOString().slice(0, 7)
    const label = d.toLocaleDateString('en-IN', { month: 'short', year:'2-digit' })
    const mSales = salesInvoices.filter(x => x.status !== 'cancelled' && (x.date || '').startsWith(key))
    const mPOs   = purchaseOrders.filter(x => (x.date || '').startsWith(key))
    const rev    = mSales.reduce((s, x) => s + (x.grandTotal || 0) - (x.totalGst || 0), 0)
    const cost   = mPOs.reduce((s, x) => s + (x.grandTotal || 0) - (x.totalGst || 0), 0)
    months.push({ key, label, revenue: rev, cost, profit: rev - cost, margin: rev > 0 ? (rev - cost) / rev * 100 : 0 })
  }

  const maxRev = Math.max(...months.map(m => m.revenue), 1)

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:18 }}>
        <div className="sh" style={{ margin:0 }}><h2>Profit & Loss</h2><p>Revenue, cost, gross profit analysis</p></div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <div style={{ display:'flex', gap:4 }}>
            {['month','year','all'].map(p => <button key={p} onClick={() => setPeriod(p)} className={`btn btn-sm ${period === p ? 'bp' : 'bg'}`}>{p.charAt(0).toUpperCase()+p.slice(1)}</button>)}
          </div>
          {period === 'month' && <input className="field" type="month" value={month} onChange={e => setMonth(e.target.value)} style={{ width:160 }} />}
          {period === 'year'  && <input className="field" type="number" value={year} onChange={e => setYear(e.target.value)} style={{ width:100 }} min="2020" max="2030" />}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:20 }}>
        {[
          { l:'Gross Revenue (incl. GST)', v:'₹' + revenue.toLocaleString('en-IN', { maximumFractionDigits:0 }), c:'var(--blue)' },
          { l:'GST Collected', v:'₹' + gstOut.toLocaleString('en-IN', { maximumFractionDigits:0 }), c:'var(--t3)' },
          { l:'Net Revenue (excl. GST)', v:'₹' + netRevenue.toLocaleString('en-IN', { maximumFractionDigits:0 }), c:'var(--amber)' },
          { l:'Purchase Cost', v:'₹' + netPurchase.toLocaleString('en-IN', { maximumFractionDigits:0 }), c:'var(--red)' },
          { l:'Gross Profit', v:'₹' + grossProfit.toLocaleString('en-IN', { maximumFractionDigits:0 }), c: grossProfit >= 0 ? 'var(--green)' : 'var(--red)' },
          { l:'Gross Margin', v:grossMargin.toFixed(1) + '%', c: grossMargin >= 30 ? 'var(--green)' : grossMargin >= 15 ? 'var(--amber)' : 'var(--red)' },
        ].map(s => (
          <div key={s.l} className="stat"><div className="stat-v" style={{ color:s.c, fontSize:18 }}>{s.v}</div><div className="stat-l">{s.l}</div></div>
        ))}
      </div>

      {/* P&L Summary Table */}
      <div className="card" style={{ marginBottom:16 }}>
        <div style={{ fontFamily:'Syne', fontWeight:700, fontSize:13, marginBottom:14, color:'var(--amber)' }}>P&L Summary Statement</div>
        {[
          { label:'Sales Revenue (Gross)', value: revenue, bold:false, indent:0, color:'var(--t1)' },
          { label:'Less: GST Collected', value: -gstOut, bold:false, indent:1, color:'var(--t3)' },
          { label:'Net Sales Revenue', value: netRevenue, bold:true, indent:0, color:'var(--amber)' },
          { label:'', value:null },
          { label:'Cost of Goods Sold', value: -netPurchase, bold:false, indent:0, color:'var(--t1)' },
          { label:'', value:null },
          { label:'GROSS PROFIT', value: grossProfit, bold:true, indent:0, color: grossProfit >= 0 ? 'var(--green)' : 'var(--red)' },
          { label:'Gross Margin %', value: null, boldLabel:true, extra: grossMargin.toFixed(1) + '%', color: grossMargin >= 30 ? 'var(--green)' : grossMargin >= 15 ? 'var(--amber)' : 'var(--red)' },
        ].map((row, i) => row.label === '' ? <div key={i} style={{ height:8 }} /> : (
          <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom: row.bold ? '2px solid var(--b2)' : '1px solid var(--b1)', paddingLeft: (row.indent || 0) * 16 }}>
            <span style={{ fontFamily: row.bold ? 'Syne' : 'DM Sans', fontWeight: row.bold ? 700 : 400, fontSize: row.bold ? 14 : 13, color: row.color || 'var(--t2)' }}>{row.label}</span>
            <span style={{ fontFamily:'JetBrains Mono', fontWeight: row.bold ? 700 : 400, fontSize: row.bold ? 15 : 13, color: row.color || 'var(--t2)' }}>
              {row.extra || (row.value !== null ? (row.value >= 0 ? '+ ' : '- ') + '₹' + Math.abs(row.value).toLocaleString('en-IN', { maximumFractionDigits:0 }) : '')}
            </span>
          </div>
        ))}
      </div>

      {/* Monthly trend */}
      <div className="card">
        <div style={{ fontFamily:'Syne', fontWeight:700, fontSize:13, marginBottom:16, color:'var(--amber)' }}>Monthly Revenue vs Profit (Last 12 Months)</div>
        <div style={{ display:'flex', alignItems:'flex-end', gap:6, height:160, marginBottom:8 }}>
          {months.map(m => (
            <div key={m.key} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
              <div style={{ width:'100%', position:'relative', height:140, display:'flex', flexDirection:'column', justifyContent:'flex-end', gap:2 }}>
                <div style={{ width:'100%', borderRadius:'3px 3px 0 0', background:'var(--blue-dim)', border:'1px solid var(--blue)', height: Math.max(2, (m.revenue / maxRev) * 120) }} title={`Revenue: ₹${m.revenue.toLocaleString('en-IN')}`} />
                <div style={{ position:'absolute', bottom:0, left:0, right:0, borderRadius:'3px 3px 0 0', background: m.profit >= 0 ? 'rgba(34,197,94,0.5)' : 'rgba(248,113,113,0.4)', border:`1px solid ${m.profit >= 0 ? 'var(--green)' : 'var(--red)'}`, height: Math.max(1, Math.abs(m.profit) / maxRev * 120) }} title={`Profit: ₹${m.profit.toLocaleString('en-IN')}`} />
              </div>
              <div style={{ fontSize:9.5, color:'var(--t4)', textAlign:'center' }}>{m.label}</div>
            </div>
          ))}
        </div>
        <div style={{ display:'flex', gap:14, justifyContent:'center', fontSize:11, color:'var(--t3)' }}>
          <span><span style={{ display:'inline-block', width:10, height:10, background:'var(--blue-dim)', border:'1px solid var(--blue)', borderRadius:2, marginRight:4 }} />Revenue</span>
          <span><span style={{ display:'inline-block', width:10, height:10, background:'rgba(34,197,94,0.5)', border:'1px solid var(--green)', borderRadius:2, marginRight:4 }} />Profit</span>
        </div>
      </div>
    </div>
  )
}
