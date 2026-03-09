import { useState } from 'react'
import { uid, today } from '../utils/csv.js'

export function Campaigns({ state, dispatch, toast }) {
  const { settings, customers, salesInvoices } = state
  const campaigns = settings.campaigns || []
  const [showForm, setShowForm] = useState(false)
  const [showSend, setShowSend] = useState(null)
  const [f, setF] = useState({ name:'', type:'whatsapp', target:'all', message:'', discount:'', validTill:'', minPurchase:'' })
  const set=(k,v)=>setF(p=>({...p,[k]:v}))

  // Smart targeting
  function getTargetCustomers(target) {
    if (target==='all') return customers
    if (target==='inactive') {
      const cutoff = new Date(Date.now()-90*86400000).toISOString().slice(0,10)
      const activeIds = new Set(salesInvoices.filter(i=>i.date>=cutoff).map(i=>i.customerId))
      return customers.filter(c=>!activeIds.has(c.id))
    }
    if (target==='high_value') {
      const rev = customers.map(c=>({...c,rev:salesInvoices.filter(i=>i.customerId===c.id).reduce((s,i)=>s+(i.grandTotal||0),0)}))
      const avg = rev.reduce((s,c)=>s+c.rev,0)/(rev.length||1)
      return rev.filter(c=>c.rev>avg*1.5)
    }
    if (target==='loyal') return customers.filter(c=>(c.visitCount||0)>=5||(c.loyaltyPoints||0)>=500)
    return customers
  }

  function createCampaign() {
    if (!f.name||!f.message) { toast.show('Name & message required','err'); return }
    const targets = getTargetCustomers(f.target)
    const c = { ...f, id:uid(), campaignNo:'CMP-'+String(campaigns.length+1).padStart(3,'0'), createdOn:today(), status:'draft', targetCount:targets.length, sentCount:0 }
    dispatch({ type:'SET_SETTINGS', payload:{ campaigns:[c,...campaigns] } })
    toast.show('Campaign created: '+c.campaignNo,'ok')
    setShowForm(false); setF({ name:'',type:'whatsapp',target:'all',message:'',discount:'',validTill:'',minPurchase:'' })
  }

  function sendCampaign(campaign) {
    const targets = getTargetCustomers(campaign.target)
    const withPhone = targets.filter(c=>c.phone)
    if (!withPhone.length) { toast.show('No customers with phone numbers','err'); return }
    // Open WhatsApp for first 3 (browser limitation)
    withPhone.slice(0,3).forEach((c,i)=>{
      setTimeout(()=>{
        const msg = campaign.message.replace('{name}',c.name||'Customer').replace('{discount}',campaign.discount||'').replace('{validTill}',campaign.validTill||'')
        window.open(`https://wa.me/91${c.phone?.replace(/[^0-9]/g,'')}?text=${encodeURIComponent(msg)}`)
      },i*1000)
    })
    const updated = campaigns.map(cp=>cp.id===campaign.id?{...cp,status:'sent',sentCount:withPhone.length,sentOn:today()}:cp)
    dispatch({ type:'SET_SETTINGS', payload:{ campaigns:updated } })
    toast.show(`Campaign sent to ${withPhone.length} customers ✓`,'ok')
    setShowSend(null)
  }

  const TEMPLATES = [
    {l:'Festival Sale',msg:`Namaste {name} ji! 🎉\n\n✨ Festival Special Sale!\n💰 Flat {discount}% OFF on all items\n📅 Valid till {validTill}\n\nVisit us today!\n_Hari Vastra_`},
    {l:'Re-engage',msg:`Namaste {name} ji! 🙏\n\nAapko yaad kar rahe hain! ❤️\nKafi time ho gaya aapka visit nahi hua.\n\n🎁 Special welcome back offer awaits you!\n📞 Call us or visit the store.\n\n_Hari Vastra_`},
    {l:'New Arrival',msg:`Namaste {name} ji! ✨\n\n🆕 New Collection Aa Gayi!\nLatest designs & styles now available.\n\nEarly bird offer: {discount}% OFF\n\nJaldi aao! 🏃\n_Hari Vastra_`},
  ]

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:18}}>
        <div className="sh" style={{margin:0}}><h2>Marketing Campaigns</h2><p>WhatsApp blasts, targeted offers, promotions</p></div>
        <button className="btn bp" onClick={()=>setShowForm(true)}>+ New Campaign</button>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:18}}>
        {[{l:'Total Campaigns',v:campaigns.length,c:'var(--blue)'},{l:'Sent',v:campaigns.filter(c=>c.status==='sent').length,c:'var(--green)'},{l:'Customers Reached',v:campaigns.filter(c=>c.status==='sent').reduce((s,c)=>s+(c.sentCount||0),0),c:'var(--amber)'},{l:'Draft',v:campaigns.filter(c=>c.status==='draft').length,c:'var(--t3)'}].map(s=>(
          <div key={s.l} className="stat"><div className="stat-v" style={{color:s.c}}>{s.v}</div><div className="stat-l">{s.l}</div></div>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:14}}>
        {campaigns.length===0&&<div className="card" style={{textAlign:'center',padding:'40px',color:'var(--t4)',gridColumn:'1/-1'}}>No campaigns yet. Create your first!</div>}
        {campaigns.map(c=>(
          <div key={c.id} className="card">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
              <div>
                <div style={{fontFamily:'Syne',fontWeight:700,fontSize:13}}>{c.name}</div>
                <div style={{fontSize:10.5,color:'var(--t4)',fontFamily:'JetBrains Mono'}}>{c.campaignNo} · {c.createdOn}</div>
              </div>
              <span style={{padding:'2px 9px',borderRadius:20,fontSize:10,fontWeight:700,background:c.status==='sent'?'var(--gd)':'var(--ad)',color:c.status==='sent'?'var(--green)':'var(--amber)'}}>{c.status}</span>
            </div>
            <div style={{fontSize:12,color:'var(--t3)',marginBottom:8}}>
              📱 {c.type} · 🎯 {c.target?.replace('_',' ')} · 👥 {c.targetCount} customers
            </div>
            {c.discount&&<div style={{fontSize:12,color:'var(--amber)',marginBottom:6}}>💰 {c.discount}% discount{c.validTill?` · till ${c.validTill}`:''}</div>}
            <div style={{fontSize:11.5,color:'var(--t2)',background:'var(--bg3)',borderRadius:'var(--r)',padding:'8px 10px',marginBottom:10,maxHeight:60,overflow:'hidden'}}>{c.message}</div>
            {c.status==='draft'&&(
              <button className="btn bp btn-sm" style={{width:'100%'}} onClick={()=>setShowSend(c)}>📤 Send Campaign</button>
            )}
            {c.status==='sent'&&<div style={{fontSize:11,color:'var(--green)',textAlign:'center'}}>✅ Sent to {c.sentCount} customers on {c.sentOn}</div>}
          </div>
        ))}
      </div>

      {showForm&&(
        <div className="overlay" onClick={e=>e.target===e.currentTarget&&setShowForm(false)}>
          <div className="modal modal-md">
            <div className="mhd"><div className="mt">New Campaign</div><button className="xbtn" onClick={()=>setShowForm(false)}>✕</button></div>
            <div className="modal-body" style={{maxHeight:'70vh',overflowY:'auto'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div className="fg"><label className="fl">Campaign Name *</label><input className="field" value={f.name} onChange={e=>set('name',e.target.value)} autoFocus/></div>
                <div className="fg"><label className="fl">Target Audience</label>
                  <select className="field" value={f.target} onChange={e=>set('target',e.target.value)}>
                    <option value="all">All Customers ({customers.length})</option>
                    <option value="inactive">Inactive 90+ days</option>
                    <option value="high_value">High Value Customers</option>
                    <option value="loyal">Loyal Customers (5+ visits)</option>
                  </select>
                </div>
                <div className="fg"><label className="fl">Discount %</label><input className="field" type="number" value={f.discount} onChange={e=>set('discount',e.target.value)} placeholder="Optional"/></div>
                <div className="fg"><label className="fl">Valid Till</label><input className="field" type="date" value={f.validTill} onChange={e=>set('validTill',e.target.value)}/></div>
              </div>
              <div style={{marginBottom:10}}>
                <div style={{fontSize:12,color:'var(--t3)',marginBottom:6}}>Quick Templates:</div>
                <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                  {TEMPLATES.map(t=><button key={t.l} className="pill" onClick={()=>set('message',t.msg)}>{t.l}</button>)}
                </div>
              </div>
              <div className="fg"><label className="fl">Message * (use {'{name}'}, {'{discount}'}, {'{validTill}'})</label>
                <textarea className="field" style={{minHeight:120,fontFamily:'JetBrains Mono',fontSize:12}} value={f.message} onChange={e=>set('message',e.target.value)}/>
              </div>
              <div style={{fontSize:11,color:'var(--t3)'}}>Preview: {f.message.replace('{name}','Ramesh').replace('{discount}',f.discount||'10').replace('{validTill}',f.validTill||'31 Mar')}</div>
            </div>
            <div className="mft"><button className="btn bg" onClick={()=>setShowForm(false)}>Cancel</button><button className="btn bp" onClick={createCampaign}>Create Campaign</button></div>
          </div>
        </div>
      )}

      {showSend&&(
        <div className="overlay" onClick={e=>e.target===e.currentTarget&&setShowSend(null)}>
          <div className="modal modal-sm">
            <div className="mhd"><div className="mt">Send Campaign</div><button className="xbtn" onClick={()=>setShowSend(null)}>✕</button></div>
            <div className="modal-body">
              <div style={{fontSize:13,color:'var(--t2)',marginBottom:12}}>
                <strong>{showSend.name}</strong> ko <strong style={{color:'var(--amber)'}}>{showSend.targetCount}</strong> customers ko bhejoge?
              </div>
              <div style={{background:'var(--ad)',border:'1px solid var(--ab)',borderRadius:'var(--r)',padding:'10px 14px',fontSize:12,color:'var(--amber)'}}>
                ℹ️ Browser limitation: WhatsApp ek ek customer ke liye alag window mein khulega. Bulk ke liye WhatsApp Business API use karo.
              </div>
            </div>
            <div className="mft">
              <button className="btn bg" onClick={()=>setShowSend(null)}>Cancel</button>
              <button className="btn bp" onClick={()=>sendCampaign(showSend)}>📤 Send Now</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
