import { useState } from 'react'

// Customer-facing view - they enter their phone to see their data
export function CustomerPortal({ state }) {
  const { salesInvoices, customers, settings } = state
  const [phone, setPhone] = useState('')
  const [customer, setCustomer] = useState(null)
  const [notFound, setNotFound] = useState(false)

  function lookup() {
    const clean = phone.replace(/[^0-9]/g,'')
    const found = customers.find(c=>c.phone?.replace(/[^0-9]/g,'')===clean)
    if (found) { setCustomer(found); setNotFound(false) }
    else { setCustomer(null); setNotFound(true) }
  }

  const custInvoices = customer ? salesInvoices.filter(i=>i.customerId===customer.id||i.customerPhone===customer.phone).sort((a,b)=>b.date?.localeCompare(a.date||'')):[]
  const totalSpent   = custInvoices.filter(i=>i.status!=='cancelled').reduce((s,i)=>s+(i.grandTotal||0),0)
  const points       = customer?.loyaltyPoints||0
  const tier         = points>=5000?'Platinum':points>=2000?'Gold':points>=500?'Silver':'Bronze'
  const tierColor    = {Bronze:'#cd7f32',Silver:'#94a3b8',Gold:'var(--amber)',Platinum:'#c084fc'}

  return (
    <div>
      <div className="sh" style={{marginBottom:18}}><h2>Customer Portal</h2><p>Customers can look up their orders & loyalty points</p></div>

      <div style={{maxWidth:500,margin:'0 auto'}}>
        <div className="card" style={{textAlign:'center',marginBottom:20}}>
          <div style={{fontSize:40,marginBottom:10}}>🛍️</div>
          <div style={{fontFamily:'Syne',fontWeight:700,fontSize:16,marginBottom:6}}>{settings.brandName||'Our Store'}</div>
          <div style={{fontSize:13,color:'var(--t3)',marginBottom:16}}>Enter your phone number to view your orders & rewards</div>
          <div style={{display:'flex',gap:8}}>
            <input className="field" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Enter phone number" style={{flex:1,fontSize:15,textAlign:'center',letterSpacing:2}} onKeyDown={e=>e.key==='Enter'&&lookup()}/>
            <button className="btn bp" onClick={lookup}>Search</button>
          </div>
          {notFound&&<div style={{marginTop:10,color:'var(--red)',fontSize:13}}>❌ No account found for this number</div>}
        </div>

        {customer&&(
          <div>
            {/* Profile card */}
            <div className="card" style={{marginBottom:14,background:'linear-gradient(135deg,var(--bg3),var(--bg4))'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                <div>
                  <div style={{fontFamily:'Syne',fontWeight:800,fontSize:18,color:'var(--amber)',marginBottom:4}}>{customer.name}</div>
                  <div style={{fontSize:12.5,color:'var(--t3)'}}>{customer.phone} · {customer.city||'—'}</div>
                  {customer.gstin&&<div style={{fontSize:11,color:'var(--t4)',fontFamily:'JetBrains Mono',marginTop:2}}>GSTIN: {customer.gstin}</div>}
                </div>
                <div style={{textAlign:'center'}}>
                  <div style={{fontFamily:'Syne',fontWeight:800,fontSize:22,color:tierColor[tier]}}>{points}</div>
                  <div style={{fontSize:10,color:'var(--t4)'}}>POINTS</div>
                  <div style={{marginTop:4,padding:'2px 10px',borderRadius:20,fontSize:11,fontWeight:700,background:tierColor[tier]+'22',color:tierColor[tier]}}>{tier}</div>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginTop:14}}>
                {[['Total Spent','₹'+totalSpent.toLocaleString('en-IN',{maximumFractionDigits:0}),'var(--amber)'],[`Orders`,custInvoices.length,'var(--blue)'],['Points',points,tierColor[tier]]].map(([l,v,c])=>(
                  <div key={l} style={{background:'var(--bg2)',borderRadius:'var(--r)',padding:'8px',textAlign:'center'}}>
                    <div style={{fontFamily:'Syne',fontWeight:700,fontSize:16,color:c}}>{v}</div>
                    <div style={{fontSize:10,color:'var(--t4)'}}>{l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order history */}
            <div className="card" style={{padding:0}}>
              <div style={{padding:'12px 16px',borderBottom:'1px solid var(--b1)',fontFamily:'Syne',fontWeight:700,fontSize:13,color:'var(--amber)'}}>📦 Order History</div>
              {custInvoices.length===0?<div style={{padding:'30px',textAlign:'center',color:'var(--t4)'}}>No orders yet</div>:custInvoices.map(inv=>(
                <div key={inv.id} style={{padding:'12px 16px',borderBottom:'1px solid var(--b1)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <div style={{fontFamily:'JetBrains Mono',fontSize:11,color:'var(--amber)',marginBottom:2}}>{inv.invoiceNumber}</div>
                    <div style={{fontSize:12,color:'var(--t3)'}}>{inv.date} · {(inv.items||[]).length} items</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontFamily:'Syne',fontWeight:700,fontSize:15,color:'var(--amber)'}}>₹{inv.grandTotal?.toLocaleString('en-IN')}</div>
                    <span style={{padding:'1px 8px',borderRadius:20,fontSize:10,fontWeight:700,background:inv.status==='paid'?'var(--gd)':inv.status==='unpaid'?'var(--rd)':'var(--bg4)',color:inv.status==='paid'?'var(--green)':inv.status==='unpaid'?'var(--red)':'var(--t4)'}}>{inv.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
