import { useState, useMemo } from 'react'
import { uid, today } from '../utils/csv.js'

const CRITERIA = ['Quality','Delivery Speed','Price','Communication','Packaging','Returns Policy']

export function VendorRating({ state, dispatch, toast }) {
  const { suppliers, purchaseOrders, settings } = state
  const ratings = settings.vendorRatings || []
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState('')
  const [scores, setScores] = useState({})
  const [review, setReview] = useState('')
  const [poId, setPoId] = useState('')

  function submitRating() {
    if (!selected || Object.keys(scores).length < CRITERIA.length) {
      toast.show('Rate all criteria', 'err'); return
    }
    const avg = Object.values(scores).reduce((s,v)=>s+v,0) / CRITERIA.length
    const newR = { id:uid(), supplierId:selected, poId, scores, avg:+avg.toFixed(1), review, date:today() }
    dispatch({ type:'SET_SETTINGS', payload:{ vendorRatings:[newR,...ratings] } })
    toast.show('Rating submitted ✓','ok')
    setShowForm(false); setScores({}); setReview(''); setSelected(''); setPoId('')
  }

  function supplierStats(supId) {
    const supRatings = ratings.filter(r=>r.supplierId===supId)
    if (!supRatings.length) return null
    const avg = supRatings.reduce((s,r)=>s+r.avg,0)/supRatings.length
    const criteriaAvg = {}
    CRITERIA.forEach(c=>{ criteriaAvg[c] = supRatings.reduce((s,r)=>s+(r.scores[c]||0),0)/supRatings.length })
    return { avg:+avg.toFixed(1), count:supRatings.length, criteriaAvg, latest:supRatings[0] }
  }

  function StarRating({ value, onChange, size=20 }) {
    return (
      <div style={{display:'flex',gap:3}}>
        {[1,2,3,4,5].map(s=>(
          <span key={s} onClick={()=>onChange&&onChange(s)}
            style={{fontSize:size,cursor:onChange?'pointer':'default',color:s<=value?'var(--amber)':'var(--bg4)',lineHeight:1}}>★</span>
        ))}
      </div>
    )
  }

  const rankedSuppliers = suppliers.map(s=>{
    const st = supplierStats(s.id)
    const pos = purchaseOrders.filter(p=>p.supplierId===s.id)
    return { ...s, stats:st, poCount:pos.length, totalBiz:pos.reduce((sum,p)=>sum+(p.grandTotal||0),0) }
  }).sort((a,b)=>(b.stats?.avg||0)-(a.stats?.avg||0))

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:18}}>
        <div className="sh" style={{margin:0}}><h2>Vendor Ratings</h2><p>Rate suppliers on quality, delivery & service</p></div>
        <button className="btn bp" onClick={()=>setShowForm(true)}>+ Rate Vendor</button>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:14}}>
        {rankedSuppliers.map((s,idx)=>{
          const st = s.stats
          const medal = idx===0?'🥇':idx===1?'🥈':idx===2?'🥉':'  '
          return (
            <div key={s.id} className="card">
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
                <div>
                  <div style={{fontFamily:'Syne',fontWeight:700,fontSize:14}}>{medal} {s.name}</div>
                  <div style={{fontSize:11,color:'var(--t3)',marginTop:2}}>{s.city||s.phone||'—'}</div>
                </div>
                {st ? (
                  <div style={{textAlign:'center'}}>
                    <div style={{fontFamily:'Syne',fontWeight:800,fontSize:24,color:st.avg>=4?'var(--green)':st.avg>=3?'var(--amber)':'var(--red)',lineHeight:1}}>{st.avg}</div>
                    <div style={{fontSize:9,color:'var(--t4)'}}>{st.count} review{st.count>1?'s':''}</div>
                  </div>
                ) : <div style={{fontSize:11,color:'var(--t4)'}}>Not rated</div>}
              </div>

              {st && <div style={{marginBottom:10}}>
                <StarRating value={Math.round(st.avg)} size={16}/>
              </div>}

              {st && CRITERIA.map(c=>(
                <div key={c} style={{marginBottom:5}}>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:11,marginBottom:2}}>
                    <span style={{color:'var(--t3)'}}>{c}</span>
                    <span style={{color:'var(--amber)',fontWeight:700}}>{st.criteriaAvg[c].toFixed(1)}</span>
                  </div>
                  <div style={{background:'var(--bg4)',borderRadius:4,height:5}}>
                    <div style={{background:st.criteriaAvg[c]>=4?'var(--green)':st.criteriaAvg[c]>=3?'var(--amber)':'var(--red)',height:'100%',width:`${st.criteriaAvg[c]/5*100}%`,borderRadius:4}}/>
                  </div>
                </div>
              ))}

              <div style={{display:'flex',justifyContent:'space-between',marginTop:10,paddingTop:10,borderTop:'1px solid var(--b1)',fontSize:11.5}}>
                <span style={{color:'var(--t3)'}}>📦 {s.poCount} orders</span>
                <span style={{color:'var(--t3)'}}>₹{(s.totalBiz/1000).toFixed(1)}K business</span>
                <button className="btn bg btn-sm" onClick={()=>{setSelected(s.id);setShowForm(true)}}>Rate</button>
              </div>

              {st?.latest?.review && (
                <div style={{marginTop:8,background:'var(--bg3)',borderRadius:'var(--r)',padding:'8px 10px',fontSize:11.5,color:'var(--t3)',fontStyle:'italic'}}>
                  "{st.latest.review}"
                </div>
              )}
            </div>
          )
        })}
        {suppliers.length===0&&<div className="card" style={{textAlign:'center',padding:'40px',color:'var(--t4)'}}>Add suppliers first to rate them.</div>}
      </div>

      {showForm&&(
        <div className="overlay" onClick={e=>e.target===e.currentTarget&&setShowForm(false)}>
          <div className="modal modal-md">
            <div className="mhd"><div className="mt">Rate Vendor</div><button className="xbtn" onClick={()=>setShowForm(false)}>✕</button></div>
            <div className="modal-body">
              <div className="fg"><label className="fl">Supplier *</label>
                <select className="field" value={selected} onChange={e=>setSelected(e.target.value)}>
                  <option value="">Select Supplier</option>
                  {suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="fg"><label className="fl">Link to PO (optional)</label>
                <select className="field" value={poId} onChange={e=>setPoId(e.target.value)}>
                  <option value="">No PO</option>
                  {purchaseOrders.filter(p=>!selected||p.supplierId===selected).map(p=><option key={p.id} value={p.id}>{p.poNumber} — {p.date}</option>)}
                </select>
              </div>
              <div style={{background:'var(--bg3)',borderRadius:'var(--r)',padding:14,marginBottom:12}}>
                <div style={{fontWeight:700,fontSize:12.5,marginBottom:12,color:'var(--amber)'}}>Rate Each Criteria</div>
                {CRITERIA.map(c=>(
                  <div key={c} style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                    <span style={{fontSize:12.5,color:'var(--t2)',width:140}}>{c}</span>
                    <div style={{display:'flex',gap:4}}>
                      {[1,2,3,4,5].map(s=>(
                        <span key={s} onClick={()=>setScores(p=>({...p,[c]:s}))}
                          style={{fontSize:26,cursor:'pointer',color:s<=(scores[c]||0)?'var(--amber)':'var(--bg4)',lineHeight:1,transition:'color .1s'}}>★</span>
                      ))}
                    </div>
                    <span style={{fontFamily:'JetBrains Mono',color:'var(--amber)',width:20,textAlign:'center'}}>{scores[c]||'—'}</span>
                  </div>
                ))}
                {Object.keys(scores).length===CRITERIA.length&&(
                  <div style={{textAlign:'center',fontFamily:'Syne',fontWeight:800,fontSize:18,color:'var(--amber)',marginTop:8}}>
                    Overall: {(Object.values(scores).reduce((s,v)=>s+v,0)/CRITERIA.length).toFixed(1)} ★
                  </div>
                )}
              </div>
              <div className="fg"><label className="fl">Written Review (optional)</label>
                <textarea className="field" style={{minHeight:70}} value={review} onChange={e=>setReview(e.target.value)} placeholder="Delivery time, quality, packaging ke baare mein likho…"/>
              </div>
            </div>
            <div className="mft">
              <button className="btn bg" onClick={()=>setShowForm(false)}>Cancel</button>
              <button className="btn bp" onClick={submitRating}>Submit Rating</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
