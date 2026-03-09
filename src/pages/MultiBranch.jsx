import { useState, useMemo } from 'react'
import { uid, today } from '../utils/csv.js'

const BLANK = { name:'', address:'', city:'', phone:'', gstin:'', manager:'', isHQ:false }

export function MultiBranch({ state, dispatch, toast }) {
  const branches = state.settings.branches || [{ id:'b1', name: state.settings.brandName+' — Main Store', address: state.settings.address||'', city:'Jaipur', isHQ:true, createdAt:today() }]
  const [activeBranch, setActiveBranch] = useState(branches[0]?.id)
  const [showForm, setShowForm] = useState(false)
  const [f, setF] = useState(BLANK)
  const set = (k,v) => setF(p=>({...p,[k]:v}))

  const { salesInvoices, purchaseOrders, inventory, variants } = state

  // Simulate branch data (in real app, each record would have branchId)
  function branchStats(bid) {
    const isHQ = branches.find(b=>b.id===bid)?.isHQ
    const invs = isHQ ? salesInvoices : salesInvoices.filter((_,i)=>i%branches.length === branches.findIndex(b=>b.id===bid))
    const pos  = isHQ ? purchaseOrders : purchaseOrders.filter((_,i)=>i%branches.length === branches.findIndex(b=>b.id===bid))
    return {
      revenue: invs.reduce((s,i)=>s+(i.grandTotal||0),0),
      invoices: invs.length,
      unpaid: invs.filter(i=>i.status==='unpaid').length,
      purchases: pos.reduce((s,p)=>s+(p.grandTotal||0),0),
    }
  }

  function saveBranch() {
    if (!f.name || !f.city) { toast.show('Name & City required','err'); return }
    const newBranches = [...branches, { ...f, id:uid(), createdAt:today() }]
    dispatch({ type:'SET_SETTINGS', payload:{ branches: newBranches } })
    toast.show('Branch added ✓','ok'); setShowForm(false); setF(BLANK)
  }

  function deleteBranch(id) {
    if (branches.find(b=>b.id===id)?.isHQ) { toast.show("Can't delete HQ",'err'); return }
    if (!window.confirm('Delete this branch?')) return
    dispatch({ type:'SET_SETTINGS', payload:{ branches: branches.filter(b=>b.id!==id) } })
    toast.show('Branch removed','ok')
  }

  const active = branches.find(b=>b.id===activeBranch)
  const activeStats = activeBranch ? branchStats(activeBranch) : null

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:18 }}>
        <div className="sh" style={{ margin:0 }}><h2>Multi-Branch</h2><p>Manage multiple store locations</p></div>
        <button className="btn bp" onClick={()=>{ setF(BLANK); setShowForm(true) }}>+ Add Branch</button>
      </div>

      {/* Branch Cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:12, marginBottom:20 }}>
        {branches.map(b=>{
          const s = branchStats(b.id)
          const isActive = activeBranch===b.id
          return (
            <div key={b.id} onClick={()=>setActiveBranch(b.id)}
              style={{ background:'var(--bg2)', border:`2px solid ${isActive?'var(--amber)':'var(--b1)'}`, borderRadius:'var(--rl)', padding:'16px 18px', cursor:'pointer', transition:'all .15s' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                <div style={{ fontFamily:'Syne', fontWeight:700, fontSize:13, color: isActive?'var(--amber)':'var(--t1)' }}>{b.name}</div>
                {b.isHQ && <span style={{ fontSize:10, background:'var(--ad)', color:'var(--amber)', padding:'2px 7px', borderRadius:10, fontWeight:700 }}>HQ</span>}
              </div>
              <div style={{ fontSize:11.5, color:'var(--t3)', marginBottom:10 }}>📍 {b.city}</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                <div style={{ background:'var(--bg3)', borderRadius:'var(--r)', padding:'7px 10px' }}>
                  <div style={{ fontSize:9.5, color:'var(--t3)', fontWeight:700 }}>REVENUE</div>
                  <div style={{ fontFamily:'Syne', fontWeight:700, fontSize:13, color:'var(--amber)' }}>₹{(s.revenue/1000).toFixed(0)}K</div>
                </div>
                <div style={{ background:'var(--bg3)', borderRadius:'var(--r)', padding:'7px 10px' }}>
                  <div style={{ fontSize:9.5, color:'var(--t3)', fontWeight:700 }}>INVOICES</div>
                  <div style={{ fontFamily:'Syne', fontWeight:700, fontSize:13, color:'var(--blue)' }}>{s.invoices}</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Branch Detail */}
      {active && activeStats && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:16 }}>
          <div className="card">
            <div style={{ fontFamily:'Syne', fontWeight:700, fontSize:14, color:'var(--amber)', marginBottom:12 }}>{active.name}</div>
            {[
              ['City', active.city],
              ['Address', active.address||'—'],
              ['Phone', active.phone||'—'],
              ['Manager', active.manager||'—'],
              ['GSTIN', active.gstin||'—'],
              ['Added', active.createdAt],
            ].map(([k,v])=>(
              <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid var(--b1)', fontSize:12.5 }}>
                <span style={{ color:'var(--t3)' }}>{k}</span>
                <span style={{ color:'var(--t1)', fontWeight:500, textAlign:'right', maxWidth:'60%' }}>{v}</span>
              </div>
            ))}
            {!active.isHQ && (
              <button className="btn bd btn-sm" style={{ width:'100%', marginTop:12 }} onClick={()=>deleteBranch(active.id)}>Remove Branch</button>
            )}
          </div>

          <div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:12, marginBottom:14 }}>
              {[
                {l:'Revenue',v:'₹'+activeStats.revenue.toLocaleString('en-IN',{maximumFractionDigits:0}),c:'var(--amber)'},
                {l:'Total Invoices',v:activeStats.invoices,c:'var(--blue)'},
                {l:'Unpaid Invoices',v:activeStats.unpaid,c:'var(--red)'},
                {l:'Total Purchases',v:'₹'+activeStats.purchases.toLocaleString('en-IN',{maximumFractionDigits:0}),c:'var(--green)'},
              ].map(s=>(
                <div key={s.l} className="stat"><div className="stat-v" style={{color:s.c,fontSize:20}}>{s.v}</div><div className="stat-l">{s.l}</div></div>
              ))}
            </div>
            <div className="card" style={{ padding:'14px 16px' }}>
              <div style={{ fontFamily:'Syne', fontWeight:700, fontSize:13, marginBottom:10, color:'var(--amber)' }}>Branch Comparison</div>
              {branches.map(b=>{
                const s=branchStats(b.id)
                const maxRev=Math.max(...branches.map(x=>branchStats(x.id).revenue),1)
                return (
                  <div key={b.id} style={{ marginBottom:10 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:3 }}>
                      <span style={{ color:'var(--t2)', fontWeight:500 }}>{b.name}</span>
                      <span style={{ fontFamily:'JetBrains Mono', color:'var(--amber)' }}>₹{s.revenue.toLocaleString('en-IN',{maximumFractionDigits:0})}</span>
                    </div>
                    <div style={{ background:'var(--bg4)', borderRadius:4, height:8, overflow:'hidden' }}>
                      <div style={{ background:'var(--amber)', height:'100%', width:`${(s.revenue/maxRev)*100}%`, borderRadius:4, transition:'width .3s' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="overlay" onClick={e=>e.target===e.currentTarget&&setShowForm(false)}>
          <div className="modal modal-sm">
            <div className="mhd"><div className="mt">Add Branch</div><button className="xbtn" onClick={()=>setShowForm(false)}>✕</button></div>
            <div className="modal-body">
              <div className="fg"><label className="fl">Branch Name *</label><input className="field" value={f.name} onChange={e=>set('name',e.target.value)} placeholder="e.g. Hari Vastra — Mansarovar" /></div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div className="fg"><label className="fl">City *</label><input className="field" value={f.city} onChange={e=>set('city',e.target.value)} /></div>
                <div className="fg"><label className="fl">Phone</label><input className="field" value={f.phone} onChange={e=>set('phone',e.target.value)} /></div>
              </div>
              <div className="fg"><label className="fl">Address</label><textarea className="field" style={{ minHeight:60 }} value={f.address} onChange={e=>set('address',e.target.value)} /></div>
              <div className="fg"><label className="fl">Manager Name</label><input className="field" value={f.manager} onChange={e=>set('manager',e.target.value)} /></div>
              <div className="fg"><label className="fl">Branch GSTIN (if different)</label><input className="field" style={{ fontFamily:'JetBrains Mono' }} value={f.gstin} onChange={e=>set('gstin',e.target.value.toUpperCase())} /></div>
            </div>
            <div className="mft">
              <button className="btn bg" onClick={()=>setShowForm(false)}>Cancel</button>
              <button className="btn bp" onClick={saveBranch}>Add Branch</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
