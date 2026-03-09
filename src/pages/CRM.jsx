import { useState, useMemo } from 'react'
import { today } from '../utils/csv.js'

export function CRM({ state, dispatch, toast }) {
  const { customers, salesInvoices } = state
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)

  const enriched = useMemo(() => customers.map(c => {
    const invs = salesInvoices.filter(i => i.customerId === c.id)
    const totalSpend = invs.reduce((s, i) => s + (i.grandTotal || 0), 0)
    const lastDate = invs.sort((a,b) => b.date > a.date ? 1 : -1)[0]?.date
    const daysAgo = lastDate ? Math.floor((new Date() - new Date(lastDate)) / 86400000) : 999
    const tier = totalSpend > 100000 ? 'Platinum' : totalSpend > 50000 ? 'Gold' : totalSpend > 20000 ? 'Silver' : 'Bronze'
    const churnRisk = daysAgo > 60
    return { ...c, totalSpend, invoiceCount: invs.length, lastDate, daysAgo, tier, churnRisk, avgOrderValue: invs.length ? totalSpend / invs.length : 0 }
  }), [customers, salesInvoices])

  const filtered = enriched.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || (c.phone || '').includes(search))
  const sel = enriched.find(c => c.id === selected)

  const tierColors = { Platinum:'#e2e8f0', Gold:'var(--amber)', Silver:'#94a3b8', Bronze:'#b45309' }
  const tierBg = { Platinum:'rgba(226,232,240,0.1)', Gold:'var(--ad)', Silver:'rgba(148,163,184,0.1)', Bronze:'rgba(180,83,9,0.1)' }

  const stats = {
    total: customers.length,
    active: enriched.filter(c => c.daysAgo <= 30).length,
    churn: enriched.filter(c => c.churnRisk).length,
    avgLTV: enriched.length ? enriched.reduce((s,c) => s + c.totalSpend, 0) / enriched.length : 0
  }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:18 }}>
        <div className="sh" style={{ margin:0 }}><h2>CRM — Customer Insights</h2><p>Loyalty tiers, spend analysis, churn detection</p></div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
        {[
          { l:'Total Customers', v:stats.total, c:'var(--blue)' },
          { l:'Active (30d)', v:stats.active, c:'var(--green)' },
          { l:'Churn Risk (60d+)', v:stats.churn, c:'var(--red)' },
          { l:'Avg Customer Value', v:'₹' + stats.avgLTV.toLocaleString('en-IN', { maximumFractionDigits:0 }), c:'var(--amber)' },
        ].map(s => (
          <div key={s.l} className="stat"><div className="stat-v" style={{ color:s.c, fontSize:20 }}>{s.v}</div><div className="stat-l">{s.l}</div></div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 360px', gap:14 }}>
        <div>
          <input className="field" style={{ marginBottom:12 }} placeholder="Search customers…" value={search} onChange={e => setSearch(e.target.value)} />
          <div className="card" style={{ padding:0 }}>
            <table className="tbl">
              <thead><tr><th>Customer</th><th>Tier</th><th>Orders</th><th>Total Spend</th><th>Last Order</th><th>Status</th></tr></thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} onClick={() => setSelected(c.id)} style={{ cursor:'pointer', background: selected === c.id ? 'var(--ad)' : '' }}>
                    <td>
                      <div style={{ fontWeight:600, color:'var(--t1)' }}>{c.name}</div>
                      <div style={{ fontSize:11, color:'var(--t3)' }}>{c.phone || c.email || '—'}</div>
                    </td>
                    <td>
                      <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:10, background:tierBg[c.tier], color:tierColors[c.tier] }}>
                        {c.tier === 'Platinum' ? '💎' : c.tier === 'Gold' ? '🥇' : c.tier === 'Silver' ? '🥈' : '🥉'} {c.tier}
                      </span>
                    </td>
                    <td style={{ fontFamily:'JetBrains Mono', fontSize:13, fontWeight:700 }}>{c.invoiceCount}</td>
                    <td style={{ fontFamily:'JetBrains Mono', fontWeight:700, color:'var(--amber)' }}>₹{c.totalSpend.toLocaleString('en-IN', { maximumFractionDigits:0 })}</td>
                    <td style={{ color:'var(--t3)', fontSize:11.5 }}>{c.lastDate || 'Never'}</td>
                    <td>
                      {c.churnRisk
                        ? <span style={{ fontSize:11, color:'var(--red)', fontWeight:600 }}>⚠ At Risk</span>
                        : c.daysAgo <= 30 ? <span style={{ fontSize:11, color:'var(--green)', fontWeight:600 }}>● Active</span>
                        : <span style={{ fontSize:11, color:'var(--t3)', fontWeight:600 }}>~ Dormant</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {sel ? (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <div className="card">
              <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:14 }}>
                <div style={{ width:44, height:44, borderRadius:'50%', background:tierBg[sel.tier], display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Syne', fontWeight:800, fontSize:18, color:tierColors[sel.tier] }}>{sel.name.charAt(0)}</div>
                <div>
                  <div style={{ fontFamily:'Syne', fontWeight:700, fontSize:14, color:'var(--t1)' }}>{sel.name}</div>
                  <div style={{ fontSize:11, color:'var(--t3)' }}>{sel.phone || sel.email}</div>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {[
                  { l:'Total Spend', v:'₹' + sel.totalSpend.toLocaleString('en-IN', { maximumFractionDigits:0 }), c:'var(--amber)' },
                  { l:'Orders', v:sel.invoiceCount, c:'var(--blue)' },
                  { l:'Avg Order', v:'₹' + sel.avgOrderValue.toLocaleString('en-IN', { maximumFractionDigits:0 }), c:'var(--green)' },
                  { l:'Days Since Last Order', v:sel.daysAgo === 999 ? 'Never' : sel.daysAgo + 'd', c: sel.churnRisk ? 'var(--red)' : 'var(--t2)' },
                ].map(s => (
                  <div key={s.l} style={{ background:'var(--bg3)', borderRadius:'var(--r)', padding:'10px 12px' }}>
                    <div style={{ fontSize:10, color:'var(--t3)', fontWeight:700, marginBottom:3 }}>{s.l}</div>
                    <div style={{ fontFamily:'Syne', fontWeight:800, fontSize:15, color:s.c }}>{s.v}</div>
                  </div>
                ))}
              </div>
            </div>
            {sel.churnRisk && (
              <div style={{ background:'var(--rd)', border:'1px solid rgba(248,113,113,0.3)', borderRadius:'var(--r)', padding:'10px 12px' }}>
                <div style={{ fontWeight:700, color:'var(--red)', fontSize:12, marginBottom:4 }}>⚠ Churn Risk Detected</div>
                <div style={{ fontSize:11.5, color:'var(--t2)' }}>{sel.name} hasn't ordered in {sel.daysAgo} days. Consider sending a follow-up message or discount offer.</div>
              </div>
            )}
            {sel.address && (
              <div className="card" style={{ padding:'12px 14px' }}>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--t3)', marginBottom:4 }}>ADDRESS</div>
                <div style={{ fontSize:12.5, color:'var(--t2)' }}>{sel.address}</div>
              </div>
            )}
            {sel.gstin && (
              <div className="card" style={{ padding:'12px 14px' }}>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--t3)', marginBottom:4 }}>GSTIN</div>
                <div style={{ fontFamily:'JetBrains Mono', fontSize:12.5, color:'var(--amber)' }}>{sel.gstin}</div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', color:'var(--t4)', fontSize:13 }}>
            <div style={{ textAlign:'center' }}><div style={{ fontSize:32, marginBottom:8 }}>👤</div>Click a customer to see insights</div>
          </div>
        )}
      </div>
    </div>
  )
}
