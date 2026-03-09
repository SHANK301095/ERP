import { useState, useMemo } from 'react'
import { today } from '../utils/csv.js'

export function TargetTracker({ state, dispatch, toast }) {
  const { settings, salesInvoices } = state
  const salespeople = settings.salespeople || []
  const targets = settings.salesTargets || {}
  const [month, setMonth] = useState(today().slice(0,7))
  const [editId, setEditId] = useState(null)
  const [tVal, setTVal] = useState('')

  function saveTarget(spId) {
    const newTargets = { ...targets, [`${spId}_${month}`]: +tVal }
    dispatch({ type:'SET_SETTINGS', payload:{ salesTargets:newTargets } })
    toast.show('Target set ✓','ok'); setEditId(null); setTVal('')
  }

  const performance = useMemo(()=>salespeople.map(sp=>{
    const spInvs = salesInvoices.filter(i=>i.salespersonId===sp.id&&(i.date||'').startsWith(month)&&i.status!=='cancelled')
    const achieved = spInvs.reduce((s,i)=>s+(i.grandTotal||0),0)
    const target = targets[`${sp.id}_${month}`] || 0
    const pct = target>0?(achieved/target*100):0
    const commission = achieved*(sp.commissionPct||0)/100
    return { ...sp, achieved, target, pct, commission, invoiceCount:spInvs.length }
  }),[salespeople,salesInvoices,targets,month])

  const teamAchieved = performance.reduce((s,sp)=>s+sp.achieved,0)
  const teamTarget   = performance.reduce((s,sp)=>s+sp.target,0)
  const teamPct      = teamTarget>0?(teamAchieved/teamTarget*100).toFixed(1):0

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:18}}>
        <div className="sh" style={{margin:0}}><h2>Sales Target Tracker</h2><p>Monthly targets, achievements & commissions</p></div>
        <input type="month" className="field" value={month} onChange={e=>setMonth(e.target.value)} style={{maxWidth:160}}/>
      </div>

      {/* Team summary */}
      <div className="card" style={{marginBottom:16}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <div style={{fontFamily:'Syne',fontWeight:700,fontSize:14,color:'var(--amber)'}}>Team Performance — {month}</div>
          <div style={{fontFamily:'Syne',fontWeight:800,fontSize:20,color:+teamPct>=100?'var(--green)':+teamPct>=75?'var(--amber)':'var(--red)'}}>{teamPct}%</div>
        </div>
        <div style={{background:'var(--bg4)',borderRadius:8,height:14,overflow:'hidden',marginBottom:8}}>
          <div style={{height:'100%',width:`${Math.min(100,+teamPct)}%`,background:+teamPct>=100?'var(--green)':+teamPct>=75?'var(--amber)':'var(--red)',borderRadius:8,transition:'width 0.5s'}}/>
        </div>
        <div style={{display:'flex',gap:20,fontSize:12.5}}>
          <span style={{color:'var(--t3)'}}>Target: <strong style={{color:'var(--t1)'}}>₹{teamTarget.toLocaleString('en-IN',{maximumFractionDigits:0})}</strong></span>
          <span style={{color:'var(--t3)'}}>Achieved: <strong style={{color:'var(--amber)'}}>₹{teamAchieved.toLocaleString('en-IN',{maximumFractionDigits:0})}</strong></span>
          <span style={{color:'var(--t3)'}}>Remaining: <strong style={{color:teamAchieved>=teamTarget?'var(--green)':'var(--red)'}}>₹{Math.max(0,teamTarget-teamAchieved).toLocaleString('en-IN',{maximumFractionDigits:0})}</strong></span>
        </div>
      </div>

      {salespeople.length===0?(
        <div className="card" style={{textAlign:'center',padding:'40px',color:'var(--t4)'}}>
          Pehle Sales Team page pe salespeople add karo.
        </div>
      ):(
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:14}}>
          {performance.sort((a,b)=>b.pct-a.pct).map((sp,idx)=>(
            <div key={sp.id} className="card">
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
                <div>
                  <div style={{fontFamily:'Syne',fontWeight:700,fontSize:13}}>{idx===0&&sp.achieved>0?'🏆 ':''}{sp.name}</div>
                  <div style={{fontSize:11,color:'var(--t3)'}}>{sp.role||'Sales'} · {sp.commissionPct||0}% commission</div>
                </div>
                <div style={{fontFamily:'Syne',fontWeight:800,fontSize:20,color:sp.pct>=100?'var(--green)':sp.pct>=75?'var(--amber)':'var(--red)'}}>{sp.pct.toFixed(0)}%</div>
              </div>
              <div style={{background:'var(--bg4)',borderRadius:6,height:10,overflow:'hidden',marginBottom:10}}>
                <div style={{height:'100%',width:`${Math.min(100,sp.pct)}%`,background:sp.pct>=100?'var(--green)':sp.pct>=75?'var(--amber)':'var(--red)',borderRadius:6,transition:'width 0.5s'}}/>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:10}}>
                {[['Target',sp.target>0?'₹'+(sp.target/1000).toFixed(1)+'K':'Not set','var(--t3)'],['Achieved','₹'+(sp.achieved/1000).toFixed(1)+'K','var(--amber)'],['Invoices',sp.invoiceCount,'var(--blue)'],['Commission','₹'+sp.commission.toFixed(0),'var(--green)']].map(([l,v,c])=>(
                  <div key={l} style={{background:'var(--bg3)',borderRadius:'var(--r)',padding:'6px 10px',textAlign:'center'}}>
                    <div style={{fontSize:9,color:'var(--t4)',fontWeight:700,marginBottom:2}}>{l.toUpperCase()}</div>
                    <div style={{fontFamily:'Syne',fontWeight:700,fontSize:13,color:c}}>{v}</div>
                  </div>
                ))}
              </div>
              {editId===sp.id?(
                <div style={{display:'flex',gap:6}}>
                  <input className="field" type="number" value={tVal} onChange={e=>setTVal(e.target.value)} placeholder="Enter target ₹" style={{flex:1}}/>
                  <button className="btn bp btn-sm" onClick={()=>saveTarget(sp.id)}>Save</button>
                  <button className="btn bg btn-sm" onClick={()=>setEditId(null)}>✕</button>
                </div>
              ):(
                <button className="btn bg btn-sm" style={{width:'100%'}} onClick={()=>{setEditId(sp.id);setTVal(sp.target||'')}}>📌 Set Target</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
