import { useState, useMemo } from 'react'

const WA_TEMPLATES = [
  { id:'invoice', name:'Invoice Ready', vars:['customerName','invoiceNo','amount','dueDate'], body:'Namaste {customerName} ji! 🙏\n\nAapka invoice *{invoiceNo}* ready hai.\nAmount: *₹{amount}*\nDue Date: *{dueDate}*\n\nPayment ke liye:\n📱 UPI: {upiId}\n\nDhanyawad! 🙏\n_{brandName}_' },
  { id:'payment', name:'Payment Received', vars:['customerName','amount','invoiceNo'], body:'Namaste {customerName} ji! 🙏\n\n*Payment Received!* ✅\nAmount: *₹{amount}*\nAgainst: {invoiceNo}\n\nBhugtan ke liye bahut bahut dhanyawad! 🙏\n_{brandName}_' },
  { id:'reminder', name:'Payment Reminder', vars:['customerName','invoiceNo','amount','daysOverdue'], body:'Namaste {customerName} ji,\n\nYeh ek vinamra yaad dilana hai:\n\n📋 Invoice: *{invoiceNo}*\n💰 Amount: *₹{amount}*\n⏰ {daysOverdue} din se pending\n\nKripaya jald bhugtaan karein.\n\nDhanyawad 🙏\n_{brandName}_' },
  { id:'order', name:'Order Confirmed', vars:['customerName','orderNo','items','deliveryDate'], body:'Namaste {customerName} ji! 🙏\n\n*Aapka order confirm ho gaya!* 🎉\nOrder No: *{orderNo}*\nItems: {items}\nDelivery: *{deliveryDate}*\n\nHum jald deliver karenge.\n\n_{brandName}_' },
  { id:'lowstock', name:'Reorder Alert (Supplier)', vars:['supplierName','skuList'], body:'Namaste {supplierName} ji,\n\nHumein neeche diye SKUs ki zaroorat hai:\n\n{skuList}\n\nKripaya quotation bhejein.\n\nDhanyawad\n_{brandName}_' },
  { id:'custom', name:'Custom Message', vars:[], body:'' },
]

export function Communications({ state, toast }) {
  const { customers, salesInvoices, settings, suppliers } = state
  const [tab, setTab]           = useState('whatsapp')
  const [templateId, setTemplId] = useState('invoice')
  const [vars, setVars]         = useState({})
  const [bulk, setBulk]         = useState([])
  const [preview, setPreview]   = useState('')
  const [emailForm, setEmailForm] = useState({ to:'', subject:'', body:'' })

  const template = WA_TEMPLATES.find(t => t.id === templateId) || WA_TEMPLATES[0]

  function fillVars(text) {
    let out = text
    const allVars = {
      brandName: settings.brandName || 'Hari Vastra',
      upiId: settings.upiId || 'yourupi@upi',
      ...vars
    }
    Object.entries(allVars).forEach(([k,v]) => { out = out.replaceAll(`{${k}}`, v) })
    return out
  }

  function buildPreview() { setPreview(fillVars(template.body)) }

  function openWhatsApp(phone, msg) {
    const clean = phone.replace(/[^0-9]/g,'')
    const num = clean.startsWith('91') ? clean : '91' + clean
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  function sendBulk() {
    if (!bulk.length) { toast.show('Select customers first','err'); return }
    bulk.forEach(customerId => {
      const c = customers.find(x => x.id === customerId)
      if (!c?.phone) return
      const msg = fillVars(template.body.replace('{customerName}', c.name))
      openWhatsApp(c.phone, msg)
    })
    toast.show(`Opened WhatsApp for ${bulk.length} customers`,'ok')
  }

  // Unpaid invoice list for quick reminder
  const unpaidInvs = salesInvoices.filter(i => i.status === 'unpaid')

  const toggleBulk = id => setBulk(p => p.includes(id) ? p.filter(x=>x!==id) : [...p, id])

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:18}}>
        <div className="sh" style={{margin:0}}><h2>Communications</h2><p>WhatsApp, SMS, Email templates</p></div>
      </div>

      <div style={{display:'flex',gap:4,marginBottom:16,borderBottom:'1px solid var(--b1)'}}>
        {[['whatsapp','💬 WhatsApp'],['bulkwa','📢 Bulk WhatsApp'],['email','📧 Email'],['reminders','⏰ Payment Reminders']].map(([id,l])=>(
          <button key={id} onClick={()=>setTab(id)} style={{padding:'7px 16px',background:'none',border:'none',borderBottom:tab===id?'2px solid var(--amber)':'2px solid transparent',color:tab===id?'var(--amber)':'var(--t3)',cursor:'pointer',fontSize:13,fontWeight:600,marginBottom:-1}}>{l}</button>
        ))}
      </div>

      {tab==='whatsapp'&&(
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <div>
            <div className="card" style={{marginBottom:14}}>
              <div style={{fontFamily:'Syne',fontWeight:700,fontSize:13,marginBottom:12,color:'var(--amber)'}}>Template</div>
              <div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:14}}>
                {WA_TEMPLATES.map(t=>(
                  <div key={t.id} onClick={()=>{setTemplId(t.id);setVars({});setPreview('')}}
                    style={{padding:'8px 12px',borderRadius:'var(--r)',cursor:'pointer',border:`1px solid ${templateId===t.id?'var(--amber)':'var(--b1)'}`,background:templateId===t.id?'var(--ad)':'var(--bg3)'}}>
                    <div style={{fontWeight:600,fontSize:12.5,color:templateId===t.id?'var(--amber)':'var(--t1)'}}>{t.name}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div style={{fontFamily:'Syne',fontWeight:700,fontSize:13,marginBottom:12,color:'var(--amber)'}}>Fill Variables</div>
              {templateId==='custom' ? (
                <div className="fg"><label className="fl">Message Body</label>
                  <textarea className="field" style={{minHeight:120}} value={vars.body||''} onChange={e=>setVars(p=>({...p,body:e.target.value}))} placeholder="Type your message…" />
                </div>
              ) : template.vars.map(v=>(
                <div key={v} className="fg"><label className="fl">{v}</label>
                  <input className="field" value={vars[v]||''} onChange={e=>setVars(p=>({...p,[v]:e.target.value}))} placeholder={v} />
                </div>
              ))}
              <div style={{display:'flex',gap:8}}>
                <input className="field" placeholder="Customer phone (e.g. 9876543210)" value={vars._phone||''} onChange={e=>setVars(p=>({...p,_phone:e.target.value}))} />
                <button className="btn bp" onClick={buildPreview} style={{flexShrink:0}}>Preview</button>
              </div>
            </div>
          </div>

          <div>
            <div className="card">
              <div style={{fontFamily:'Syne',fontWeight:700,fontSize:13,marginBottom:12,color:'var(--green)'}}>💬 Preview</div>
              <div style={{background:'#128C7E',borderRadius:12,padding:'8px 12px',marginBottom:12,minHeight:100}}>
                <div style={{background:'#DCF8C6',borderRadius:'12px 12px 0 12px',padding:'10px 12px',maxWidth:'85%',marginLeft:'auto',whiteSpace:'pre-wrap',fontSize:13,color:'#111',lineHeight:1.5}}>
                  {preview || <span style={{color:'#888',fontSize:12}}>Fill variables and click Preview</span>}
                </div>
              </div>
              {preview&&vars._phone&&(
                <button className="btn" style={{width:'100%',background:'#25D366',color:'white',border:'none',fontSize:14,padding:'10px',borderRadius:'var(--r)',cursor:'pointer',fontWeight:700}}
                  onClick={()=>openWhatsApp(vars._phone, templateId==='custom'?(vars.body||''):fillVars(template.body))}>
                  📱 Send on WhatsApp
                </button>
              )}
              {!vars._phone&&preview&&<div style={{fontSize:11,color:'var(--t3)',textAlign:'center',marginTop:8}}>Enter phone number above to send</div>}
            </div>

            {/* Quick send from invoices */}
            <div className="card" style={{marginTop:14}}>
              <div style={{fontFamily:'Syne',fontWeight:700,fontSize:13,marginBottom:10,color:'var(--amber)'}}>Quick Send Invoice</div>
              {unpaidInvs.slice(0,5).map(inv=>{
                const c=customers.find(x=>x.id===inv.customerId)
                return (
                  <div key={inv.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid var(--b1)'}}>
                    <div>
                      <div style={{fontWeight:500,fontSize:12.5}}>{inv.customerName}</div>
                      <div style={{fontSize:11,color:'var(--t3)'}}>{inv.invoiceNumber} · ₹{inv.grandTotal?.toLocaleString('en-IN')}</div>
                    </div>
                    {c?.phone?(
                      <button className="btn btn-sm" style={{background:'#25D366',color:'white',border:'none',fontSize:11}} onClick={()=>{
                        const msg=`Namaste ${inv.customerName} ji! 🙏\n\nAapka invoice *${inv.invoiceNumber}* ready hai.\nAmount: *₹${inv.grandTotal?.toLocaleString('en-IN')}*\n\nDhanyawad! 🙏\n_${settings.brandName}_`
                        openWhatsApp(c.phone,msg)
                      }}>📱 Send</button>
                    ):<span style={{fontSize:11,color:'var(--t4)'}}>No phone</span>}
                  </div>
                )
              })}
              {unpaidInvs.length===0&&<div style={{fontSize:12,color:'var(--t4)',textAlign:'center',padding:'12px 0'}}>No unpaid invoices ✓</div>}
            </div>
          </div>
        </div>
      )}

      {tab==='bulkwa'&&(
        <div>
          <div className="card" style={{marginBottom:14}}>
            <div style={{fontFamily:'Syne',fontWeight:700,fontSize:13,marginBottom:10,color:'var(--amber)'}}>Select Template</div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:12}}>
              {WA_TEMPLATES.filter(t=>t.id!=='custom').map(t=>(
                <button key={t.id} onClick={()=>setTemplId(t.id)} className={`pill ${templateId===t.id?'on':''}`}>{t.name}</button>
              ))}
            </div>
            <div style={{display:'flex',gap:8,marginTop:12}}>
              <button className="btn bg btn-sm" onClick={()=>setBulk(customers.map(c=>c.id))}>Select All</button>
              <button className="btn bg btn-sm" onClick={()=>setBulk([])}>Clear</button>
              <span style={{fontSize:12,color:'var(--t3)',alignSelf:'center'}}>{bulk.length} selected</span>
              <button className="btn" style={{background:'#25D366',color:'white',border:'none',marginLeft:'auto'}} onClick={sendBulk} disabled={!bulk.length}>
                📱 Send to {bulk.length} Customers
              </button>
            </div>
          </div>
          <div className="card" style={{padding:0}}>
            <table className="tbl">
              <thead><tr><th style={{width:40}}><input type="checkbox" onChange={e=>setBulk(e.target.checked?customers.map(c=>c.id):[])} checked={bulk.length===customers.length} /></th><th>Customer</th><th>Phone</th><th>Last Order</th></tr></thead>
              <tbody>
                {customers.map(c=>{
                  const lastInv=salesInvoices.filter(i=>i.customerId===c.id).sort((a,b)=>b.date>a.date?1:-1)[0]
                  return(
                    <tr key={c.id}>
                      <td><input type="checkbox" checked={bulk.includes(c.id)} onChange={()=>toggleBulk(c.id)} /></td>
                      <td style={{fontWeight:500}}>{c.name}</td>
                      <td style={{fontFamily:'JetBrains Mono',fontSize:12,color:c.phone?'var(--t2)':'var(--t4)'}}>{c.phone||'No phone'}</td>
                      <td style={{color:'var(--t3)',fontSize:11.5}}>{lastInv?.date||'Never'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab==='email'&&(
        <div style={{maxWidth:600}}>
          <div className="card">
            <div style={{fontFamily:'Syne',fontWeight:700,fontSize:13,marginBottom:14,color:'var(--amber)'}}>📧 Compose Email</div>
            <div className="fg"><label className="fl">To</label><input className="field" type="email" value={emailForm.to} onChange={e=>setEmailForm(p=>({...p,to:e.target.value}))} placeholder="customer@email.com" /></div>
            <div className="fg"><label className="fl">Subject</label><input className="field" value={emailForm.subject} onChange={e=>setEmailForm(p=>({...p,subject:e.target.value}))} /></div>
            <div className="fg"><label className="fl">Body</label><textarea className="field" style={{minHeight:180}} value={emailForm.body} onChange={e=>setEmailForm(p=>({...p,body:e.target.value}))} /></div>
            <button className="btn bp" style={{width:'100%'}} onClick={()=>{
              const url=`mailto:${emailForm.to}?subject=${encodeURIComponent(emailForm.subject)}&body=${encodeURIComponent(emailForm.body)}`
              window.open(url)
              toast.show('Email client opened','ok')
            }}>📧 Open in Email Client</button>
            <div style={{fontSize:11,color:'var(--t4)',textAlign:'center',marginTop:8}}>Opens your default email app (Gmail, Outlook, etc.)</div>
          </div>
        </div>
      )}

      {tab==='reminders'&&(
        <div>
          <div className="card" style={{marginBottom:14}}>
            <div style={{fontFamily:'Syne',fontWeight:700,fontSize:13,marginBottom:4,color:'var(--amber)'}}>Unpaid Invoice Reminders</div>
            <div style={{fontSize:12,color:'var(--t3)',marginBottom:12}}>Send WhatsApp reminders to customers with unpaid invoices</div>
            <div style={{display:'flex',gap:8}}>
              <button className="btn bg btn-sm" onClick={()=>{
                unpaidInvs.forEach(inv=>{
                  const c=customers.find(x=>x.id===inv.customerId)
                  if(!c?.phone)return
                  const days=Math.floor((new Date()-new Date(inv.date))/86400000)
                  const msg=`Namaste ${inv.customerName} ji,\n\nYeh ek vinamra yaad dilana hai:\n\n📋 Invoice: *${inv.invoiceNumber}*\n💰 Amount: *₹${inv.grandTotal?.toLocaleString('en-IN')}*\n⏰ ${days} din se pending\n\nKripaya jald bhugtaan karein.\n\nDhanyawad 🙏\n_${settings.brandName}_`
                  openWhatsApp(c.phone,msg)
                })
                toast.show(`Reminders sent to ${unpaidInvs.filter(i=>customers.find(c=>c.id===i.customerId)?.phone).length} customers`,'ok')
              }}>📱 Send All Reminders</button>
            </div>
          </div>
          <div className="card" style={{padding:0}}>
            <table className="tbl">
              <thead><tr><th>Invoice</th><th>Customer</th><th>Amount</th><th>Date</th><th>Days Pending</th><th>Action</th></tr></thead>
              <tbody>
                {unpaidInvs.length===0&&<tr><td colSpan={6}><div className="empty"><p>✅ No unpaid invoices!</p></div></td></tr>}
                {unpaidInvs.map(inv=>{
                  const c=customers.find(x=>x.id===inv.customerId)
                  const days=Math.floor((new Date()-new Date(inv.date))/86400000)
                  return(
                    <tr key={inv.id}>
                      <td style={{fontFamily:'JetBrains Mono',fontSize:11}}>{inv.invoiceNumber}</td>
                      <td style={{fontWeight:500}}>{inv.customerName}</td>
                      <td style={{fontFamily:'JetBrains Mono',fontWeight:700,color:'var(--amber)'}}>₹{inv.grandTotal?.toLocaleString('en-IN')}</td>
                      <td style={{color:'var(--t3)',fontSize:11.5}}>{inv.date}</td>
                      <td><span style={{color:days>30?'var(--red)':days>15?'var(--amber)':'var(--t2)',fontWeight:700,fontFamily:'JetBrains Mono'}}>{days}d</span></td>
                      <td>{c?.phone?(
                        <button className="btn btn-sm" style={{background:'#25D366',color:'white',border:'none',fontSize:11}} onClick={()=>{
                          const msg=`Namaste ${inv.customerName} ji,\n\n📋 Invoice *${inv.invoiceNumber}* ke liye ₹${inv.grandTotal?.toLocaleString('en-IN')} pending hai (${days} din).\n\nKripaya jald bhugtaan karein.\n\n_${settings.brandName}_`
                          openWhatsApp(c.phone,msg)
                        }}>📱 Remind</button>
                      ):<span style={{fontSize:11,color:'var(--t4)'}}>No phone</span>}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
