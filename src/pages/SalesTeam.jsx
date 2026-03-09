import { useState, useMemo } from 'react'
import { uid, today } from '../utils/csv.js'

export function SalesTeam({ state, dispatch, toast }) {
  const { salesInvoices, customers, settings } = state
  const salespeople = settings.salespeople || []
  const targets     = settings.salesTargets || []

  const [tab, setTab]       = useState('team')
  const [showForm, setShowForm] = useState(false)
  const [showTarget, setShowTarget] = useState(false)
  const [showQuote, setShowQuote]   = useState(false)
  const [quotes, setQuotes] = useState(() => { try { return JSON.parse(localStorage.getItem('quotes')||'[]') } catch { return [] } })

  const [f, setF] = useState({ name:'', phone:'', email:'', commissionRate:5, target:0 })
  const [tForm, setTForm] = useState({ spId:'', month: new Date().toISOString().slice(0,7), target:0 })
  const set = (k,v) => setF(p=>({...p,[k]:v}))

  function saveSP() {
    if (!f.name) { toast.show('Name required','err'); return }
    const newSPs = [...salespeople, { ...f, id:uid(), createdAt:today() }]
    dispatch({ type:'SET_SETTINGS', payload:{ salespeople: newSPs } })
    toast.show('Salesperson added ✓','ok'); setShowForm(false); setF({ name:'', phone:'', email:'', commissionRate:5, target:0 })
  }

  function saveTarget() {
    if (!tForm.spId) { toast.show('Select salesperson','err'); return }
    const newTargets = [...targets.filter(t=>!(t.spId===tForm.spId&&t.month===tForm.month)), { ...tForm, id:uid() }]
    dispatch({ type:'SET_SETTINGS', payload:{ salesTargets: newTargets } })
    toast.show('Target set ✓','ok'); setShowTarget(false)
  }

  // Assign salesperson to invoice
  function assignSP(invId, spId) {
    const inv = salesInvoices.find(i=>i.id===invId)
    if (!inv) return
    dispatch({ type:'UPDATE_INVOICE', payload:{ ...inv, salespersonId:spId } })
    toast.show('Salesperson assigned ✓','ok')
  }

  // Stats per salesperson
  function spStats(spId) {
    const month = new Date().toISOString().slice(0,7)
    const invs = salesInvoices.filter(i=>i.salespersonId===spId && i.status!=='cancelled')
    const thisMonth = invs.filter(i=>(i.date||'').startsWith(month))
    const revenue = thisMonth.reduce((s,i)=>s+(i.grandTotal||0),0)
    const sp = salespeople.find(x=>x.id===spId)
    const commission = revenue*(sp?.commissionRate||5)/100
    const t = targets.find(x=>x.spId===spId&&x.month===month)
    const achievement = t?.target ? (revenue/t.target*100) : null
    return { revenue, invoices:thisMonth.length, commission, achievement, target:t?.target||0 }
  }

  // Quotations
  const { products, variants } = state
  const [qForm, setQForm] = useState({ customerId:'', items:[], notes:'', validDays:7 })

  function saveQuote() {
    if (!qForm.customerId || !qForm.items.length) { toast.show('Select customer & add items','err'); return }
    const c = customers.find(x=>x.id===qForm.customerId)
    const q = { id:uid(), quoteNo:'QT-'+String(quotes.length+1).padStart(4,'0'), customerId:qForm.customerId, customerName:c?.name||'', items:qForm.items, notes:qForm.notes, validTill: new Date(Date.now()+qForm.validDays*86400000).toLocaleDateString('en-IN'), status:'sent', createdAt:today(), total:qForm.items.reduce((s,i)=>s+i.qty*i.unitPrice,0) }
    const newQ = [q,...quotes]
    setQuotes(newQ)
    localStorage.setItem('quotes', JSON.stringify(newQ))
    toast.show('Quotation created: '+q.quoteNo,'ok'); setShowQuote(false)
    setQForm({ customerId:'', items:[], notes:'', validDays:7 })
  }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:18 }}>
        <div className="sh" style={{ margin:0 }}><h2>Sales Team</h2><p>Salesperson commission, targets & quotations</p></div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn bs btn-sm" onClick={()=>setShowQuote(true)}>+ Quotation</button>
          <button className="btn bs btn-sm" onClick={()=>setShowTarget(true)}>🎯 Set Target</button>
          <button className="btn bp" onClick={()=>setShowForm(true)}>+ Salesperson</button>
        </div>
      </div>

      <div style={{ display:'flex', gap:4, marginBottom:16, borderBottom:'1px solid var(--b1)' }}>
        {[['team','👥 Team Performance'],['quotations','📋 Quotations'],['commission','💰 Commission']].map(([id,l])=>(
          <button key={id} onClick={()=>setTab(id)} style={{ padding:'7px 16px', background:'none', border:'none', borderBottom:tab===id?'2px solid var(--amber)':'2px solid transparent', color:tab===id?'var(--amber)':'var(--t3)', cursor:'pointer', fontSize:13, fontWeight:600, marginBottom:-1 }}>{l}</button>
        ))}
      </div>

      {tab==='team' && (
        <>
          {salespeople.length===0 ? (
            <div className="card" style={{ textAlign:'center', padding:'40px 20px' }}>
              <div style={{ fontSize:40, marginBottom:10 }}>👥</div>
              <div style={{ fontWeight:600, color:'var(--t1)', marginBottom:6 }}>No salesperson added yet</div>
              <button className="btn bp" onClick={()=>setShowForm(true)}>+ Add Salesperson</button>
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14 }}>
              {salespeople.map(sp=>{
                const s = spStats(sp.id)
                return (
                  <div key={sp.id} className="card">
                    <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:14 }}>
                      <div style={{ width:42, height:42, borderRadius:'50%', background:'var(--ad)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Syne', fontWeight:800, fontSize:18, color:'var(--amber)', flexShrink:0 }}>{sp.name.charAt(0)}</div>
                      <div>
                        <div style={{ fontFamily:'Syne', fontWeight:700, fontSize:13 }}>{sp.name}</div>
                        <div style={{ fontSize:11, color:'var(--t3)' }}>{sp.phone||sp.email||'—'}</div>
                      </div>
                      <div style={{ marginLeft:'auto', fontSize:12, fontWeight:700, color:'var(--green)' }}>{sp.commissionRate}% comm.</div>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
                      {[
                        {l:'This Month',v:'₹'+s.revenue.toLocaleString('en-IN',{maximumFractionDigits:0}),c:'var(--amber)'},
                        {l:'Invoices',v:s.invoices,c:'var(--blue)'},
                        {l:'Commission',v:'₹'+s.commission.toLocaleString('en-IN',{maximumFractionDigits:0}),c:'var(--green)'},
                        {l:'Target',v:s.target?'₹'+s.target.toLocaleString('en-IN',{maximumFractionDigits:0}):'Not set',c:'var(--t3)'},
                      ].map(x=>(
                        <div key={x.l} style={{ background:'var(--bg3)', borderRadius:'var(--r)', padding:'8px 10px' }}>
                          <div style={{ fontSize:9.5, color:'var(--t4)', fontWeight:700, marginBottom:2 }}>{x.l}</div>
                          <div style={{ fontFamily:'JetBrains Mono', fontWeight:700, fontSize:13, color:x.c }}>{x.v}</div>
                        </div>
                      ))}
                    </div>
                    {s.achievement!==null && (
                      <div>
                        <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:4 }}>
                          <span style={{ color:'var(--t3)' }}>Target Achievement</span>
                          <span style={{ color: s.achievement>=100?'var(--green)':s.achievement>=70?'var(--amber)':'var(--red)', fontWeight:700 }}>{s.achievement.toFixed(0)}%</span>
                        </div>
                        <div style={{ background:'var(--bg4)', borderRadius:4, height:6 }}>
                          <div style={{ background: s.achievement>=100?'var(--green)':s.achievement>=70?'var(--amber)':'var(--red)', height:'100%', width:`${Math.min(100,s.achievement)}%`, borderRadius:4 }} />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {tab==='quotations' && (
        <div>
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:12 }}>
            <button className="btn bp" onClick={()=>setShowQuote(true)}>+ New Quotation</button>
          </div>
          <div className="card" style={{ padding:0 }}>
            <table className="tbl">
              <thead><tr><th>Quote No.</th><th>Customer</th><th>Amount</th><th>Valid Till</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {quotes.length===0&&<tr><td colSpan={6}><div className="empty"><p>No quotations yet</p></div></td></tr>}
                {quotes.map(q=>(
                  <tr key={q.id}>
                    <td style={{ fontFamily:'JetBrains Mono', fontSize:11, color:'var(--amber)' }}>{q.quoteNo}</td>
                    <td style={{ fontWeight:500 }}>{q.customerName}</td>
                    <td style={{ fontFamily:'JetBrains Mono', fontWeight:700, color:'var(--amber)' }}>₹{q.total?.toLocaleString('en-IN')}</td>
                    <td style={{ color:'var(--t3)', fontSize:11.5 }}>{q.validTill}</td>
                    <td>
                      <select value={q.status} onChange={e=>{const nq=quotes.map(x=>x.id===q.id?{...x,status:e.target.value}:x);setQuotes(nq);localStorage.setItem('quotes',JSON.stringify(nq))}}
                        style={{ padding:'3px 8px', borderRadius:20, fontSize:11, fontWeight:600, border:'none', background:q.status==='accepted'?'var(--gd)':q.status==='rejected'?'var(--rd)':'var(--ad)', color:q.status==='accepted'?'var(--green)':q.status==='rejected'?'var(--red)':'var(--amber)', cursor:'pointer', outline:'none' }}>
                        <option value="sent">Sent</option>
                        <option value="accepted">Accepted</option>
                        <option value="rejected">Rejected</option>
                        <option value="expired">Expired</option>
                      </select>
                    </td>
                    <td>
                      {q.status==='accepted'&&<button className="btn btn-sm" style={{ background:'var(--gd)', color:'var(--green)', borderColor:'transparent', fontSize:11 }}>→ Convert to Invoice</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab==='commission' && (
        <div style={{ maxWidth:700 }}>
          <div className="card" style={{ padding:0 }}>
            <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--b1)' }}>
              <div style={{ fontFamily:'Syne', fontWeight:700, fontSize:13 }}>Commission Summary — {new Date().toLocaleString('en-IN',{month:'long',year:'numeric'})}</div>
            </div>
            <table className="tbl">
              <thead><tr><th>Salesperson</th><th>Rate</th><th>Invoices</th><th>Revenue</th><th>Commission Earned</th><th>Status</th></tr></thead>
              <tbody>
                {salespeople.length===0&&<tr><td colSpan={6}><div className="empty"><p>No salespeople added yet</p></div></td></tr>}
                {salespeople.map(sp=>{
                  const s=spStats(sp.id)
                  return(
                    <tr key={sp.id}>
                      <td style={{ fontWeight:600 }}>{sp.name}</td>
                      <td style={{ color:'var(--green)', fontWeight:700 }}>{sp.commissionRate}%</td>
                      <td style={{ fontFamily:'JetBrains Mono' }}>{s.invoices}</td>
                      <td style={{ fontFamily:'JetBrains Mono', color:'var(--amber)' }}>₹{s.revenue.toLocaleString('en-IN',{maximumFractionDigits:0})}</td>
                      <td style={{ fontFamily:'JetBrains Mono', fontWeight:700, color:'var(--green)' }}>₹{s.commission.toLocaleString('en-IN',{maximumFractionDigits:0})}</td>
                      <td><span className="badge bi">Payable</span></td>
                    </tr>
                  )
                })}
                {salespeople.length>0&&(
                  <tr style={{ background:'var(--bg3)', fontWeight:700 }}>
                    <td colSpan={4} style={{ textAlign:'right', color:'var(--t2)' }}>Total Commission Payable</td>
                    <td style={{ fontFamily:'JetBrains Mono', fontWeight:800, color:'var(--amber)', fontSize:15 }}>₹{salespeople.reduce((s,sp)=>s+spStats(sp.id).commission,0).toLocaleString('en-IN',{maximumFractionDigits:0})}</td>
                    <td/>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Salesperson Modal */}
      {showForm&&(
        <div className="overlay" onClick={e=>e.target===e.currentTarget&&setShowForm(false)}>
          <div className="modal modal-sm">
            <div className="mhd"><div className="mt">Add Salesperson</div><button className="xbtn" onClick={()=>setShowForm(false)}>✕</button></div>
            <div className="modal-body">
              <div className="fg"><label className="fl">Full Name *</label><input className="field" value={f.name} onChange={e=>set('name',e.target.value)} autoFocus /></div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div className="fg"><label className="fl">Phone</label><input className="field" value={f.phone} onChange={e=>set('phone',e.target.value)} /></div>
                <div className="fg"><label className="fl">Email</label><input className="field" type="email" value={f.email} onChange={e=>set('email',e.target.value)} /></div>
              </div>
              <div className="fg"><label className="fl">Commission Rate (%)</label><input className="field" type="number" min="0" max="30" step="0.5" value={f.commissionRate} onChange={e=>set('commissionRate',+e.target.value)} /></div>
            </div>
            <div className="mft">
              <button className="btn bg" onClick={()=>setShowForm(false)}>Cancel</button>
              <button className="btn bp" onClick={saveSP}>Add</button>
            </div>
          </div>
        </div>
      )}

      {/* Set Target Modal */}
      {showTarget&&(
        <div className="overlay" onClick={e=>e.target===e.currentTarget&&setShowTarget(false)}>
          <div className="modal modal-sm">
            <div className="mhd"><div className="mt">Set Monthly Target</div><button className="xbtn" onClick={()=>setShowTarget(false)}>✕</button></div>
            <div className="modal-body">
              <div className="fg"><label className="fl">Salesperson</label>
                <select className="field" value={tForm.spId} onChange={e=>setTForm(p=>({...p,spId:e.target.value}))}>
                  <option value="">Select</option>
                  {salespeople.map(sp=><option key={sp.id} value={sp.id}>{sp.name}</option>)}
                </select>
              </div>
              <div className="fg"><label className="fl">Month</label><input className="field" type="month" value={tForm.month} onChange={e=>setTForm(p=>({...p,month:e.target.value}))} /></div>
              <div className="fg"><label className="fl">Revenue Target (₹)</label><input className="field" type="number" value={tForm.target} onChange={e=>setTForm(p=>({...p,target:+e.target.value}))} placeholder="e.g. 100000" /></div>
            </div>
            <div className="mft">
              <button className="btn bg" onClick={()=>setShowTarget(false)}>Cancel</button>
              <button className="btn bp" onClick={saveTarget}>Set Target</button>
            </div>
          </div>
        </div>
      )}

      {/* Quotation Modal */}
      {showQuote&&(
        <div className="overlay" onClick={e=>e.target===e.currentTarget&&setShowQuote(false)}>
          <div className="modal modal-md">
            <div className="mhd"><div className="mt">New Quotation</div><button className="xbtn" onClick={()=>setShowQuote(false)}>✕</button></div>
            <div className="modal-body">
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
                <div className="fg"><label className="fl">Customer *</label>
                  <select className="field" value={qForm.customerId} onChange={e=>setQForm(p=>({...p,customerId:e.target.value}))}>
                    <option value="">Select</option>
                    {customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="fg"><label className="fl">Valid for (days)</label><input className="field" type="number" value={qForm.validDays} onChange={e=>setQForm(p=>({...p,validDays:+e.target.value}))} /></div>
              </div>
              <div style={{ background:'var(--bg3)', borderRadius:'var(--r)', padding:12, marginBottom:12 }}>
                <div style={{ fontWeight:700, fontSize:12.5, marginBottom:10 }}>Add Items</div>
                <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr auto', gap:8, alignItems:'flex-end' }}>
                  <div className="fg" style={{ margin:0 }}><label className="fl">Product</label>
                    <select className="field" id="qv" onChange={e=>{
                      const v=variants.find(x=>x.id===e.target.value)
                      const p=products.find(x=>x.id===v?.productId)
                      if(v&&p){setQForm(prev=>({...prev,items:[...prev.items,{variantId:v.id,sku:v.sku,name:`${p.shortName||p.name} ${v.size||''}`.trim(),qty:1,unitPrice:v.priceOverride||p.mrp}]}))}
                      e.target.value=''
                    }}>
                      <option value="">Add item</option>
                      {variants.map(v=>{const p=products.find(x=>x.id===v.productId);return <option key={v.id} value={v.id}>{v.sku} — {p?.shortName||p?.name}</option>})}
                    </select>
                  </div>
                </div>
                {qForm.items.map((item,i)=>(
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:8, marginTop:6 }}>
                    <span style={{ flex:1, fontSize:12 }}>{item.name}</span>
                    <input style={{ width:50, padding:'4px', border:'1px solid var(--b2)', borderRadius:'var(--r)', background:'var(--bg2)', color:'var(--t1)', textAlign:'center', fontFamily:'JetBrains Mono', fontSize:12 }} type="number" value={item.qty} onChange={e=>setQForm(p=>({...p,items:p.items.map((x,j)=>j===i?{...x,qty:+e.target.value}:x)}))} />
                    <span style={{ fontFamily:'JetBrains Mono', fontSize:12, color:'var(--amber)', minWidth:60, textAlign:'right' }}>₹{(item.qty*item.unitPrice).toLocaleString('en-IN')}</span>
                    <button onClick={()=>setQForm(p=>({...p,items:p.items.filter((_,j)=>j!==i)}))} style={{ background:'none', border:'none', color:'var(--t4)', cursor:'pointer' }}>✕</button>
                  </div>
                ))}
              </div>
              <div className="fg"><label className="fl">Notes</label><input className="field" value={qForm.notes} onChange={e=>setQForm(p=>({...p,notes:e.target.value}))} /></div>
              {qForm.items.length>0&&<div style={{ textAlign:'right', fontFamily:'Syne', fontWeight:700, fontSize:16, color:'var(--amber)' }}>Total: ₹{qForm.items.reduce((s,i)=>s+i.qty*i.unitPrice,0).toLocaleString('en-IN')}</div>}
            </div>
            <div className="mft">
              <button className="btn bg" onClick={()=>setShowQuote(false)}>Cancel</button>
              <button className="btn bp" onClick={saveQuote}>Create Quotation</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
