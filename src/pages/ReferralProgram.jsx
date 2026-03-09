import { useState } from 'react'
import { uid, today } from '../utils/csv.js'

export function ReferralProgram({ state, dispatch, toast }) {
  const { settings, customers, salesInvoices } = state
  const referrals = settings.referrals || []
  const refConfig  = settings.refConfig || { rewardReferrer:200, rewardReferee:100, minPurchase:500, active:true }
  const [showConfig, setShowConfig] = useState(false)
  const [cfg, setCfg] = useState(refConfig)
  const [showForm, setShowForm] = useState(false)
  const [f, setF] = useState({ referrerId:'', refereeName:'', refereePhone:'', invoiceId:'' })
  const set=(k,v)=>setF(p=>({...p,[k]:v}))

  function saveConfig() {
    dispatch({ type:'SET_SETTINGS', payload:{ refConfig:cfg } })
    toast.show('Config saved ✓','ok'); setShowConfig(false)
  }

  function addReferral() {
    if (!f.referrerId||!f.refereeName) { toast.show('Referrer & referee required','err'); return }
    const ref = customers.find(c=>c.id===f.referrerId)
    const r = { ...f, id:uid(), refNo:'REF-'+String(referrals.length+1).padStart(4,'0'), date:today(), status:'pending', referrerName:ref?.name||'' }
    dispatch({ type:'SET_SETTINGS', payload:{ referrals:[r,...referrals] } })
    toast.show('Referral recorded: '+r.refNo,'ok')
    setShowForm(false); setF({ referrerId:'',refereeName:'',refereePhone:'',invoiceId:'' })
  }

  function markRewarded(id) {
    const updated = referrals.map(r=>r.id===id?{...r,status:'rewarded',rewardedOn:today()}:r)
    dispatch({ type:'SET_SETTINGS', payload:{ referrals:updated } })
    toast.show('Reward marked ✓','ok')
  }

  const stats = {
    total:referrals.length,
    pending:referrals.filter(r=>r.status==='pending').length,
    rewarded:referrals.filter(r=>r.status==='rewarded').length,
    totalRewards:referrals.filter(r=>r.status==='rewarded').length*(refConfig.rewardReferrer+refConfig.rewardReferee)
  }

  const topReferrers = customers.map(c=>({...c,refs:referrals.filter(r=>r.referrerId===c.id).length})).sort((a,b)=>b.refs-a.refs).filter(c=>c.refs>0).slice(0,5)

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:18}}>
        <div className="sh" style={{margin:0}}><h2>Referral Program</h2><p>Customer refers friend, both get rewarded</p></div>
        <div style={{display:'flex',gap:8}}>
          <button className="btn bs btn-sm" onClick={()=>{setCfg(refConfig);setShowConfig(true)}}>⚙ Config</button>
          <button className="btn bp" onClick={()=>setShowForm(true)}>+ Add Referral</button>
        </div>
      </div>

      {/* Config banner */}
      <div style={{background:'var(--ad)',border:'1px solid var(--ab)',borderRadius:'var(--rl)',padding:'12px 16px',marginBottom:16,display:'flex',gap:20,alignItems:'center',flexWrap:'wrap'}}>
        <span style={{fontSize:13,fontWeight:700,color:'var(--amber)'}}>🎁 Program {refConfig.active?'ACTIVE':'PAUSED'}</span>
        <span style={{fontSize:12,color:'var(--t2)'}}>Referrer gets: <strong>₹{refConfig.rewardReferrer}</strong></span>
        <span style={{fontSize:12,color:'var(--t2)'}}>New customer gets: <strong>₹{refConfig.rewardReferee}</strong></span>
        <span style={{fontSize:12,color:'var(--t2)'}}>Min purchase: <strong>₹{refConfig.minPurchase}</strong></span>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:18}}>
        {[{l:'Total Referrals',v:stats.total,c:'var(--blue)'},{l:'Pending',v:stats.pending,c:'var(--amber)'},{l:'Rewarded',v:stats.rewarded,c:'var(--green)'},{l:'Rewards Given',v:'₹'+stats.totalRewards.toLocaleString('en-IN'),c:'var(--purple)'}].map(s=>(
          <div key={s.l} className="stat"><div className="stat-v" style={{color:s.c}}>{s.v}</div><div className="stat-l">{s.l}</div></div>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:16}}>
        <div className="card" style={{padding:0}}>
          <table className="tbl">
            <thead><tr><th>Ref No.</th><th>Referrer</th><th>New Customer</th><th>Date</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {referrals.length===0&&<tr><td colSpan={6}><div className="empty"><p>No referrals yet</p></div></td></tr>}
              {referrals.map(r=>(
                <tr key={r.id}>
                  <td style={{fontFamily:'JetBrains Mono',fontSize:11,color:'var(--amber)'}}>{r.refNo}</td>
                  <td style={{fontWeight:500}}>{r.referrerName}</td>
                  <td><div style={{fontWeight:500,fontSize:12.5}}>{r.refereeName}</div><div style={{fontSize:10.5,color:'var(--t3)'}}>{r.refereePhone}</div></td>
                  <td style={{fontSize:11,color:'var(--t4)'}}>{r.date}</td>
                  <td><span style={{padding:'2px 9px',borderRadius:20,fontSize:10,fontWeight:700,background:r.status==='rewarded'?'var(--gd)':'var(--ad)',color:r.status==='rewarded'?'var(--green)':'var(--amber)'}}>{r.status}</span></td>
                  <td>{r.status==='pending'&&<button className="btn btn-sm" style={{background:'var(--gd)',color:'var(--green)',border:'none',fontSize:10}} onClick={()=>markRewarded(r.id)}>✓ Give Reward</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <div style={{fontFamily:'Syne',fontWeight:700,fontSize:13,marginBottom:12,color:'var(--amber)'}}>🏆 Top Referrers</div>
          {topReferrers.length===0?<div style={{color:'var(--t4)',fontSize:12,textAlign:'center',padding:'20px 0'}}>No referrals yet</div>:topReferrers.map((c,i)=>(
            <div key={c.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 0',borderBottom:'1px solid var(--b1)'}}>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <span style={{fontFamily:'JetBrains Mono',fontSize:11,color:'var(--t4)'}}>{i+1}</span>
                <div style={{fontWeight:500,fontSize:12.5}}>{c.name}</div>
              </div>
              <span style={{fontFamily:'JetBrains Mono',fontWeight:700,color:'var(--amber)'}}>{c.refs} refs</span>
            </div>
          ))}
        </div>
      </div>

      {showForm&&(
        <div className="overlay" onClick={e=>e.target===e.currentTarget&&setShowForm(false)}>
          <div className="modal modal-sm">
            <div className="mhd"><div className="mt">Add Referral</div><button className="xbtn" onClick={()=>setShowForm(false)}>✕</button></div>
            <div className="modal-body">
              <div className="fg"><label className="fl">Referrer (existing customer) *</label>
                <select className="field" value={f.referrerId} onChange={e=>set('referrerId',e.target.value)}>
                  <option value="">Select Customer</option>
                  {customers.map(c=><option key={c.id} value={c.id}>{c.name} — {c.phone}</option>)}
                </select>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div className="fg"><label className="fl">New Customer Name *</label><input className="field" value={f.refereeName} onChange={e=>set('refereeName',e.target.value)}/></div>
                <div className="fg"><label className="fl">New Customer Phone</label><input className="field" value={f.refereePhone} onChange={e=>set('refereePhone',e.target.value)}/></div>
              </div>
            </div>
            <div className="mft"><button className="btn bg" onClick={()=>setShowForm(false)}>Cancel</button><button className="btn bp" onClick={addReferral}>Add Referral</button></div>
          </div>
        </div>
      )}

      {showConfig&&(
        <div className="overlay" onClick={e=>e.target===e.currentTarget&&setShowConfig(false)}>
          <div className="modal modal-sm">
            <div className="mhd"><div className="mt">Referral Program Settings</div><button className="xbtn" onClick={()=>setShowConfig(false)}>✕</button></div>
            <div className="modal-body">
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div className="fg"><label className="fl">Referrer Reward ₹</label><input className="field" type="number" value={cfg.rewardReferrer} onChange={e=>setCfg(p=>({...p,rewardReferrer:+e.target.value}))}/></div>
                <div className="fg"><label className="fl">New Customer Reward ₹</label><input className="field" type="number" value={cfg.rewardReferee} onChange={e=>setCfg(p=>({...p,rewardReferee:+e.target.value}))}/></div>
                <div className="fg"><label className="fl">Min Purchase ₹</label><input className="field" type="number" value={cfg.minPurchase} onChange={e=>setCfg(p=>({...p,minPurchase:+e.target.value}))}/></div>
                <div className="fg"><label className="fl">Program Status</label>
                  <select className="field" value={cfg.active?'active':'paused'} onChange={e=>setCfg(p=>({...p,active:e.target.value==='active'}))}>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="mft"><button className="btn bg" onClick={()=>setShowConfig(false)}>Cancel</button><button className="btn bp" onClick={saveConfig}>Save Config</button></div>
          </div>
        </div>
      )}
    </div>
  )
}
