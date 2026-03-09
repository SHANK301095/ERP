import { useState } from 'react'
import { uid, today } from '../utils/csv.js'

export function GiftCards({ state, dispatch, toast }) {
  const { settings, salesInvoices, customers } = state
  const giftCards = settings.giftCards || []
  const [showForm, setShowForm] = useState(false)
  const [redeemCode, setRedeemCode] = useState('')
  const [redeemResult, setRedeemResult] = useState(null)
  const [f, setF] = useState({ amount:500, customerName:'', customerPhone:'', validDays:365, note:'' })
  const set=(k,v)=>setF(p=>({...p,[k]:v}))

  function generateCode() { return 'GC'+Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8) }

  function issueCard() {
    if (!f.amount||+f.amount<=0) { toast.show('Amount required','err'); return }
    const card = { ...f, id:uid(), code:generateCode(), amount:+f.amount, balance:+f.amount,
      issuedOn:today(), expiryDate:new Date(Date.now()+f.validDays*86400000).toISOString().slice(0,10),
      status:'active', usageHistory:[] }
    dispatch({ type:'SET_SETTINGS', payload:{ giftCards:[card,...giftCards] } })
    toast.show(`Gift Card issued: ${card.code}  ✓`,'ok')
    setShowForm(false); setF({ amount:500,customerName:'',customerPhone:'',validDays:365,note:'' })
  }

  function checkRedeem() {
    const card = giftCards.find(c=>c.code===redeemCode.toUpperCase())
    if (!card) { setRedeemResult({error:'Card not found'}); return }
    if (card.status!=='active') { setRedeemResult({error:'Card '+card.status}); return }
    if (card.expiryDate<today()) { setRedeemResult({error:'Card expired'}); return }
    setRedeemResult(card)
  }

  function redeemCard(cardId, useAmount) {
    const updated = giftCards.map(c=>c.id===cardId?{
      ...c,
      balance: c.balance-useAmount,
      status: c.balance-useAmount<=0?'used':'active',
      usageHistory:[...(c.usageHistory||[]),{date:today(),amount:useAmount}]
    }:c)
    dispatch({ type:'SET_SETTINGS', payload:{ giftCards:updated } })
    toast.show(`₹${useAmount} redeemed ✓`,'ok')
    setRedeemResult(null); setRedeemCode('')
  }

  const stats = { total:giftCards.length, active:giftCards.filter(c=>c.status==='active').length, totalValue:giftCards.reduce((s,c)=>s+c.amount,0), balanceRemaining:giftCards.filter(c=>c.status==='active').reduce((s,c)=>s+c.balance,0) }

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:18}}>
        <div className="sh" style={{margin:0}}><h2>Gift Cards</h2><p>Issue & redeem gift vouchers</p></div>
        <button className="btn bp" onClick={()=>setShowForm(true)}>+ Issue Gift Card</button>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:18}}>
        {[{l:'Total Issued',v:stats.total,c:'var(--blue)'},{l:'Active',v:stats.active,c:'var(--green)'},{l:'Total Value',v:'₹'+stats.totalValue.toLocaleString('en-IN'),c:'var(--amber)'},{l:'Remaining Balance',v:'₹'+stats.balanceRemaining.toLocaleString('en-IN'),c:'var(--purple)'}].map(s=>(
          <div key={s.l} className="stat"><div className="stat-v" style={{color:s.c,fontSize:18}}>{s.v}</div><div className="stat-l">{s.l}</div></div>
        ))}
      </div>

      {/* Redeem section */}
      <div className="card" style={{marginBottom:16}}>
        <div style={{fontFamily:'Syne',fontWeight:700,fontSize:13,marginBottom:12,color:'var(--amber)'}}>🎁 Redeem Gift Card</div>
        <div style={{display:'flex',gap:10,alignItems:'flex-end',flexWrap:'wrap'}}>
          <div className="fg" style={{flex:1,minWidth:200,margin:0}}>
            <label className="fl">Enter Card Code</label>
            <input className="field" style={{fontFamily:'JetBrains Mono',textTransform:'uppercase',fontSize:16,letterSpacing:2}} value={redeemCode} onChange={e=>{setRedeemCode(e.target.value.toUpperCase());setRedeemResult(null)}} placeholder="GC-XXXXXXXX"/>
          </div>
          <button className="btn bp" style={{marginBottom:0}} onClick={checkRedeem}>Check Card</button>
        </div>
        {redeemResult&&(
          <div style={{marginTop:14,padding:'14px 16px',background:redeemResult.error?'var(--rd)':'var(--gd)',border:`1px solid ${redeemResult.error?'var(--red)':'var(--green)'}`,borderRadius:'var(--r)'}}>
            {redeemResult.error?(
              <div style={{color:'var(--red)',fontWeight:700}}>❌ {redeemResult.error}</div>
            ):(
              <div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                  <div>
                    <div style={{fontFamily:'JetBrains Mono',fontWeight:800,fontSize:15,color:'var(--green)'}}>{redeemResult.code}</div>
                    <div style={{fontSize:12,color:'var(--t2)',marginTop:4}}>{redeemResult.customerName||'Anonymous'} · Expires: {redeemResult.expiryDate}</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontFamily:'Syne',fontWeight:800,fontSize:22,color:'var(--green)'}}>₹{redeemResult.balance}</div>
                    <div style={{fontSize:11,color:'var(--t3)'}}>of ₹{redeemResult.amount} remaining</div>
                  </div>
                </div>
                <div style={{marginTop:12,display:'flex',gap:8,flexWrap:'wrap'}}>
                  {[100,200,500,redeemResult.balance].filter((v,i,a)=>a.indexOf(v)===i&&v>0&&v<=redeemResult.balance).map(amt=>(
                    <button key={amt} className="btn bp btn-sm" onClick={()=>redeemCard(redeemResult.id,amt)}>Redeem ₹{amt}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cards list */}
      <div className="card" style={{padding:0}}>
        <table className="tbl">
          <thead><tr><th>Code</th><th>Customer</th><th>Issued</th><th>Expiry</th><th>Original</th><th>Balance</th><th>Status</th></tr></thead>
          <tbody>
            {giftCards.length===0&&<tr><td colSpan={7}><div className="empty"><p>No gift cards issued yet</p></div></td></tr>}
            {giftCards.map(c=>(
              <tr key={c.id}>
                <td style={{fontFamily:'JetBrains Mono',fontWeight:700,color:'var(--amber)',fontSize:12,letterSpacing:1}}>{c.code}</td>
                <td><div style={{fontWeight:500,fontSize:12.5}}>{c.customerName||'Anonymous'}</div><div style={{fontSize:10.5,color:'var(--t3)'}}>{c.customerPhone||''}</div></td>
                <td style={{fontSize:11,color:'var(--t3)'}}>{c.issuedOn}</td>
                <td style={{fontSize:11,color:c.expiryDate<today()?'var(--red)':'var(--t3)'}}>{c.expiryDate}</td>
                <td style={{fontFamily:'JetBrains Mono',color:'var(--t2)'}}>₹{c.amount.toLocaleString('en-IN')}</td>
                <td style={{fontFamily:'JetBrains Mono',fontWeight:700,color:c.balance>0?'var(--green)':'var(--t4)'}}>₹{c.balance.toLocaleString('en-IN')}</td>
                <td><span style={{padding:'2px 9px',borderRadius:20,fontSize:10,fontWeight:700,background:c.status==='active'?'var(--gd)':c.status==='used'?'var(--bg4)':'var(--rd)',color:c.status==='active'?'var(--green)':c.status==='used'?'var(--t4)':'var(--red)'}}>{c.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm&&(
        <div className="overlay" onClick={e=>e.target===e.currentTarget&&setShowForm(false)}>
          <div className="modal modal-sm">
            <div className="mhd"><div className="mt">Issue Gift Card</div><button className="xbtn" onClick={()=>setShowForm(false)}>✕</button></div>
            <div className="modal-body">
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div className="fg"><label className="fl">Amount ₹ *</label><input className="field" type="number" value={f.amount} onChange={e=>set('amount',e.target.value)}/></div>
                <div className="fg"><label className="fl">Valid (days)</label><input className="field" type="number" value={f.validDays} onChange={e=>set('validDays',+e.target.value)}/></div>
                <div className="fg"><label className="fl">Customer Name</label><input className="field" value={f.customerName} onChange={e=>set('customerName',e.target.value)}/></div>
                <div className="fg"><label className="fl">Customer Phone</label><input className="field" value={f.customerPhone} onChange={e=>set('customerPhone',e.target.value)}/></div>
              </div>
              <div className="fg"><label className="fl">Note</label><input className="field" value={f.note} onChange={e=>set('note',e.target.value)}/></div>
              <div style={{background:'var(--ad)',border:'1px solid var(--ab)',borderRadius:'var(--r)',padding:'10px 14px',marginTop:4,fontSize:12,color:'var(--amber)'}}>
                Card code will be auto-generated. Expiry: {new Date(Date.now()+f.validDays*86400000).toISOString().slice(0,10)}
              </div>
            </div>
            <div className="mft"><button className="btn bg" onClick={()=>setShowForm(false)}>Cancel</button><button className="btn bp" onClick={issueCard}>Issue Gift Card</button></div>
          </div>
        </div>
      )}
    </div>
  )
}
