import { useState, useMemo } from 'react'

export function Loyalty({ state, dispatch, toast }) {
  const { customers, salesInvoices, settings } = state
  const config = settings.loyaltyConfig || { pointsPerRupee:1, redeemRate:100, minRedeem:500, tiers:{ bronze:0, silver:10000, gold:50000, platinum:150000 } }
  const [tab, setTab] = useState('overview')
  const [search, setSearch] = useState('')
  const [redeemModal, setRedeemModal] = useState(null)
  const [redeemAmt, setRedeemAmt] = useState('')

  function getPoints(customerId) {
    const earned = salesInvoices.filter(i=>i.customerId===customerId&&i.status!=='cancelled').reduce((s,i)=>s+Math.floor((i.grandTotal||0)*config.pointsPerRupee/100),0)
    const redeemed = (settings.pointsRedeemed||[]).filter(r=>r.customerId===customerId).reduce((s,r)=>s+r.points,0)
    return Math.max(0, earned-redeemed)
  }

  function getTier(spend) {
    if (spend>=config.tiers.platinum) return {name:'Platinum',color:'#E5E7EB',emoji:'💎',bg:'linear-gradient(135deg,#667eea,#764ba2)'}
    if (spend>=config.tiers.gold)     return {name:'Gold',color:'var(--amber)',emoji:'🥇',bg:'linear-gradient(135deg,#f59e0b,#d97706)'}
    if (spend>=config.tiers.silver)   return {name:'Silver',color:'#94a3b8',emoji:'🥈',bg:'linear-gradient(135deg,#64748b,#475569)'}
    return {name:'Bronze',color:'#b45309',emoji:'🥉',bg:'linear-gradient(135deg,#92400e,#78350f)'}
  }

  function redeemPoints(cust, points) {
    const value = Math.floor(points/config.redeemRate)*10
    if (points < config.minRedeem) { toast.show(`Minimum ${config.minRedeem} points needed`,'err'); return }
    const redemptions = [...(settings.pointsRedeemed||[]), { customerId:cust.id, points, value, date:new Date().toISOString().slice(0,10) }]
    dispatch({ type:'SET_SETTINGS', payload:{ pointsRedeemed: redemptions } })
    toast.show(`₹${value} redeemed for ${cust.name} ✓`,'ok')
    setRedeemModal(null); setRedeemAmt('')
  }

  const custData = customers.map(c=>{
    const spend = salesInvoices.filter(i=>i.customerId===c.id&&i.status!=='cancelled').reduce((s,i)=>s+(i.grandTotal||0),0)
    const points = getPoints(c.id)
    const tier = getTier(spend)
    return { ...c, spend, points, tier }
  }).sort((a,b)=>b.points-a.points)

  const filtered = custData.filter(c=>c.name.toLowerCase().includes(search.toLowerCase()))

  const stats = {
    totalPoints: custData.reduce((s,c)=>s+c.points,0),
    platinum: custData.filter(c=>c.tier.name==='Platinum').length,
    gold: custData.filter(c=>c.tier.name==='Gold').length,
    silver: custData.filter(c=>c.tier.name==='Silver').length,
  }

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:18}}>
        <div className="sh" style={{margin:0}}><h2>Loyalty Program</h2><p>Points, tiers & rewards management</p></div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:18}}>
        {[
          {l:'Total Points Issued',v:stats.totalPoints.toLocaleString('en-IN'),c:'var(--amber)'},
          {l:'💎 Platinum',v:stats.platinum,c:'#c084fc'},
          {l:'🥇 Gold',v:stats.gold,c:'var(--amber)'},
          {l:'🥈 Silver',v:stats.silver,c:'#94a3b8'},
        ].map(s=><div key={s.l} className="stat"><div className="stat-v" style={{color:s.c,fontSize:20}}>{s.v}</div><div className="stat-l">{s.l}</div></div>)}
      </div>

      <div style={{display:'flex',gap:4,marginBottom:16,borderBottom:'1px solid var(--b1)'}}>
        {[['overview','🏆 Leaderboard'],['config','⚙️ Program Settings']].map(([id,l])=>(
          <button key={id} onClick={()=>setTab(id)} style={{padding:'7px 16px',background:'none',border:'none',borderBottom:tab===id?'2px solid var(--amber)':'2px solid transparent',color:tab===id?'var(--amber)':'var(--t3)',cursor:'pointer',fontSize:13,fontWeight:600,marginBottom:-1}}>{l}</button>
        ))}
      </div>

      {tab==='overview'&&(
        <>
          <input className="field" placeholder="Search customer…" value={search} onChange={e=>setSearch(e.target.value)} style={{marginBottom:12,maxWidth:300}}/>
          <div className="card" style={{padding:0}}>
            <table className="tbl">
              <thead><tr><th>#</th><th>Customer</th><th>Tier</th><th>Total Spend</th><th>Points Balance</th><th>Redeem Value</th><th>Action</th></tr></thead>
              <tbody>
                {filtered.map((c,i)=>(
                  <tr key={c.id}>
                    <td style={{fontFamily:'JetBrains Mono',color:'var(--t4)',fontSize:11}}>{i+1}</td>
                    <td>
                      <div style={{fontWeight:600,color:'var(--t1)'}}>{c.name}</div>
                      <div style={{fontSize:11,color:'var(--t3)'}}>{c.phone||c.email||'—'}</div>
                    </td>
                    <td>
                      <span style={{background:c.tier.bg,color:'white',padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:700,whiteSpace:'nowrap'}}>
                        {c.tier.emoji} {c.tier.name}
                      </span>
                    </td>
                    <td style={{fontFamily:'JetBrains Mono',color:'var(--t2)'}}>₹{c.spend.toLocaleString('en-IN',{maximumFractionDigits:0})}</td>
                    <td style={{fontFamily:'JetBrains Mono',fontWeight:700,color:'var(--amber)',fontSize:14}}>{c.points.toLocaleString('en-IN')}</td>
                    <td style={{fontFamily:'JetBrains Mono',color:'var(--green)',fontWeight:600}}>₹{Math.floor(c.points/config.redeemRate)*10}</td>
                    <td>
                      {c.points>=config.minRedeem&&(
                        <button className="btn btn-sm" style={{background:'var(--gd)',color:'var(--green)',borderColor:'transparent',fontSize:11}} onClick={()=>setRedeemModal(c)}>
                          Redeem
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab==='config'&&(
        <div style={{maxWidth:500}}>
          <div className="card">
            <div style={{fontFamily:'Syne',fontWeight:700,fontSize:13,marginBottom:14,color:'var(--amber)'}}>Program Configuration</div>
            {[
              {l:'Points per ₹100 spent',k:'pointsPerRupee',hint:'e.g. 1 = 1 point per ₹100'},
              {l:'Points to Redeem for ₹10',k:'redeemRate',hint:'e.g. 100 = 100 points = ₹10'},
              {l:'Min points for redemption',k:'minRedeem',hint:'e.g. 500 = minimum 500 points'},
            ].map(({l,k,hint})=>(
              <div key={k} className="fg">
                <label className="fl">{l}</label>
                <input className="field" type="number" value={config[k]} onChange={e=>dispatch({type:'SET_SETTINGS',payload:{loyaltyConfig:{...config,[k]:+e.target.value}}})}/>
                <div style={{fontSize:11,color:'var(--t4)',marginTop:3}}>{hint}</div>
              </div>
            ))}
            <div style={{fontFamily:'Syne',fontWeight:700,fontSize:12,marginBottom:10,marginTop:4,color:'var(--t2)'}}>Tier Thresholds (Total Spend)</div>
            {[['bronze','Bronze 🥉'],['silver','Silver 🥈'],['gold','Gold 🥇'],['platinum','Platinum 💎']].map(([k,l])=>(
              <div key={k} className="fg">
                <label className="fl">{l} (₹)</label>
                <input className="field" type="number" value={config.tiers[k]} onChange={e=>dispatch({type:'SET_SETTINGS',payload:{loyaltyConfig:{...config,tiers:{...config.tiers,[k]:+e.target.value}}}})}/>
              </div>
            ))}
          </div>
        </div>
      )}

      {redeemModal&&(
        <div className="overlay" onClick={e=>e.target===e.currentTarget&&setRedeemModal(null)}>
          <div className="modal modal-sm">
            <div className="mhd"><div className="mt">Redeem Points — {redeemModal.name}</div><button className="xbtn" onClick={()=>setRedeemModal(null)}>✕</button></div>
            <div className="modal-body">
              <div style={{textAlign:'center',padding:'12px 0 20px'}}>
                <div style={{fontFamily:'Syne',fontWeight:800,fontSize:32,color:'var(--amber)'}}>{redeemModal.points.toLocaleString('en-IN')}</div>
                <div style={{fontSize:12,color:'var(--t3)'}}>points available</div>
                <div style={{marginTop:8,fontSize:13,color:'var(--green)'}}>Max redeem value: ₹{Math.floor(redeemModal.points/config.redeemRate)*10}</div>
              </div>
              <div className="fg">
                <label className="fl">Points to Redeem</label>
                <input className="field" type="number" value={redeemAmt} onChange={e=>setRedeemAmt(e.target.value)} max={redeemModal.points} min={config.minRedeem} step={config.redeemRate} placeholder={`Min: ${config.minRedeem}`}/>
                {redeemAmt&&<div style={{fontSize:12,color:'var(--green)',marginTop:4}}>Discount value: ₹{Math.floor(+redeemAmt/config.redeemRate)*10}</div>}
              </div>
            </div>
            <div className="mft">
              <button className="btn bg" onClick={()=>setRedeemModal(null)}>Cancel</button>
              <button className="btn bp" disabled={!redeemAmt||+redeemAmt<config.minRedeem||+redeemAmt>redeemModal.points} onClick={()=>redeemPoints(redeemModal,+redeemAmt)}>Redeem Points</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
