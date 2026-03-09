import { useState, useMemo } from 'react'
import { uid, today, downloadCSV } from '../utils/csv.js'

const BLANK_RESELLER = {
  name:'', phone:'', email:'', address:'', city:'', gstin:'',
  marginPct:30, tier:'standard', creditLimit:0, notes:'',
  bankName:'', accountNo:'', ifsc:'', upiId:'',
  status:'active'
}

export function Resellers({ state, dispatch, toast }) {
  const { products, variants, inventory, settings } = state
  const resellers   = settings.resellers   || []
  const resellerOrders = settings.resellerOrders || []

  const [tab, setTab]         = useState('resellers')
  const [showForm, setShowForm]   = useState(false)
  const [showOrder, setShowOrder] = useState(false)
  const [showPriceList, setShowPriceList] = useState(null) // reseller object
  const [showInvoice, setShowInvoice] = useState(null)     // order object
  const [editId, setEditId]   = useState(null)
  const [search, setSearch]   = useState('')

  const [f, setF] = useState(BLANK_RESELLER)
  const set = (k,v) => setF(p=>({...p,[k]:v}))

  // Order form
  const [oForm, setOForm] = useState({ resellerId:'', items:[], notes:'', paymentMode:'credit', discount:0 })

  // Reseller price = cost + margin%
  function resellerPrice(product, variant, marginPct) {
    const cost = product?.costPrice || 0
    const mrp  = variant?.priceOverride || product?.mrp || 0
    if (cost > 0) return Math.round(cost * (1 + marginPct/100))
    // fallback: discount from MRP
    return Math.round(mrp * (1 - marginPct/100))
  }

  function saveReseller() {
    if (!f.name || !f.phone) { toast.show('Name & Phone required','err'); return }
    const newList = editId
      ? resellers.map(r => r.id===editId ? {...f, id:editId} : r)
      : [...resellers, {...f, id:uid(), code:'RSL-'+String(resellers.length+1).padStart(3,'0'), createdAt:today(), marginPct:+f.marginPct, creditLimit:+f.creditLimit}]
    dispatch({ type:'SET_SETTINGS', payload:{ resellers: newList } })
    toast.show(editId?'Reseller updated ✓':'Reseller added ✓','ok')
    setShowForm(false); setEditId(null); setF(BLANK_RESELLER)
  }

  function addItemToOrder(variantId) {
    const v = variants.find(x=>x.id===variantId)
    const p = products.find(x=>x.id===v?.productId)
    if (!v||!p) return
    const res = resellers.find(x=>x.id===oForm.resellerId)
    const margin = res?.marginPct||30
    const price = resellerPrice(p, v, margin)
    const inv = inventory.find(i=>i.variantId===variantId)
    if (!oForm.items.find(x=>x.variantId===variantId))
      setOForm(prev=>({...prev,items:[...prev.items,{variantId,sku:v.sku,name:`${p.shortName||p.name} ${v.size||''}`.trim(),qty:1,unitPrice:price,mrp:v.priceOverride||p?.mrp,costPrice:p.costPrice||0,stock:inv?.qty||0,gstRate:p.gst||5}]}))
  }

  function saveOrder() {
    if (!oForm.resellerId||!oForm.items.length) { toast.show('Select reseller & add items','err'); return }
    const res = resellers.find(x=>x.id===oForm.resellerId)
    const subtotal = oForm.items.reduce((s,i)=>s+i.qty*i.unitPrice,0)
    const discAmt  = subtotal * (oForm.discount/100)
    const taxable  = subtotal - discAmt
    const gst      = oForm.items.reduce((s,i)=>s+i.qty*i.unitPrice*(i.gstRate/100),0)*(1-oForm.discount/100)
    const grandTotal = taxable + gst
    const order = {
      ...oForm, id:uid(),
      orderNo: 'RSO-'+String(resellerOrders.length+1).padStart(4,'0'),
      resellerName: res?.name||'',
      resellerCode: res?.code||'',
      date: today(),
      subtotal, discAmt, taxable, gst, grandTotal,
      status: oForm.paymentMode==='credit' ? 'credit' : 'paid'
    }
    const newOrders = [order, ...resellerOrders]
    dispatch({ type:'SET_SETTINGS', payload:{ resellerOrders: newOrders } })
    // Deduct stock
    oForm.items.forEach(item => {
      dispatch({ type:'ADJUST_STOCK', payload:{ variantId:item.variantId, delta:-item.qty, type:'reseller_out', refType:'RSO', refNumber:order.orderNo, note:'Reseller order: '+res?.name }})
    })
    toast.show('Reseller order created: '+order.orderNo,'ok')
    setShowOrder(false); setOForm({ resellerId:'', items:[], notes:'', paymentMode:'credit', discount:0 })
    setShowInvoice(order)
  }

  function markOrderPaid(orderId) {
    const newOrders = resellerOrders.map(o=>o.id===orderId?{...o,status:'paid',paidAt:today()}:o)
    dispatch({ type:'SET_SETTINGS', payload:{ resellerOrders: newOrders } })
    toast.show('Marked as paid ✓','ok')
  }

  // Stats
  const stats = useMemo(()=>({
    total: resellers.length,
    active: resellers.filter(r=>r.status==='active').length,
    totalOrders: resellerOrders.length,
    revenue: resellerOrders.reduce((s,o)=>s+(o.grandTotal||0),0),
    pending: resellerOrders.filter(o=>o.status==='credit').reduce((s,o)=>s+(o.grandTotal||0),0),
  }),[resellers,resellerOrders])

  const filteredResellers = resellers.filter(r=>
    r.name.toLowerCase().includes(search.toLowerCase())||
    r.city?.toLowerCase().includes(search.toLowerCase())||
    r.code?.toLowerCase().includes(search.toLowerCase())
  )

  const tierColors = { standard:'var(--blue)', silver:'#94a3b8', gold:'var(--amber)', platinum:'#c084fc' }
  const tierBg     = { standard:'var(--bi)', silver:'var(--bg4)', gold:'var(--ad)', platinum:'rgba(192,132,252,0.1)' }

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:18}}>
        <div className="sh" style={{margin:0}}><h2>Reseller Network</h2><p>Wholesale pricing, reseller orders & commissions</p></div>
        <div style={{display:'flex',gap:8}}>
          <button className="btn bs btn-sm" onClick={()=>setShowOrder(true)}>+ Reseller Order</button>
          <button className="btn bp" onClick={()=>{setF(BLANK_RESELLER);setEditId(null);setShowForm(true)}}>+ Add Reseller</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:18}}>
        {[
          {l:'Total Resellers',v:stats.total,c:'var(--blue)'},
          {l:'Active',v:stats.active,c:'var(--green)'},
          {l:'Total Orders',v:stats.totalOrders,c:'var(--amber)'},
          {l:'Total Revenue',v:'₹'+(stats.revenue/1000).toFixed(1)+'K',c:'var(--amber)'},
          {l:'Credit Pending',v:'₹'+(stats.pending/1000).toFixed(1)+'K',c:'var(--red)'},
        ].map(s=>(
          <div key={s.l} className="stat"><div className="stat-v" style={{color:s.c,fontSize:18}}>{s.v}</div><div className="stat-l">{s.l}</div></div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:4,marginBottom:16,borderBottom:'1px solid var(--b1)'}}>
        {[['resellers','👥 Resellers'],['orders','📦 Orders'],['pricelist','💰 Price Lists'],['payouts','💳 Payouts']].map(([id,l])=>(
          <button key={id} onClick={()=>setTab(id)} style={{padding:'7px 16px',background:'none',border:'none',borderBottom:tab===id?'2px solid var(--amber)':'2px solid transparent',color:tab===id?'var(--amber)':'var(--t3)',cursor:'pointer',fontSize:13,fontWeight:600,marginBottom:-1}}>{l}</button>
        ))}
      </div>

      {/* ─── RESELLERS LIST ─── */}
      {tab==='resellers'&&(
        <>
          <input className="field" placeholder="Search reseller…" value={search} onChange={e=>setSearch(e.target.value)} style={{maxWidth:300,marginBottom:12}}/>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:14}}>
            {filteredResellers.length===0&&<div className="card" style={{textAlign:'center',padding:'30px',color:'var(--t4)',gridColumn:'1/-1'}}>No resellers yet. Add your first reseller!</div>}
            {filteredResellers.map(r=>{
              const rOrders = resellerOrders.filter(o=>o.resellerId===r.id)
              const rRevenue = rOrders.reduce((s,o)=>s+(o.grandTotal||0),0)
              const rPending = rOrders.filter(o=>o.status==='credit').reduce((s,o)=>s+(o.grandTotal||0),0)
              return(
                <div key={r.id} className="card" style={{borderLeft:`3px solid ${tierColors[r.tier]||'var(--b1)'}` }}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
                    <div>
                      <div style={{fontFamily:'Syne',fontWeight:700,fontSize:13,color:'var(--t1)'}}>{r.name}</div>
                      <div style={{fontSize:11,color:'var(--t4)',fontFamily:'JetBrains Mono'}}>{r.code}</div>
                    </div>
                    <div style={{display:'flex',gap:6,alignItems:'center'}}>
                      <span style={{fontSize:10,fontWeight:700,background:tierBg[r.tier],color:tierColors[r.tier],padding:'2px 9px',borderRadius:20,textTransform:'capitalize'}}>{r.tier}</span>
                      <span style={{fontSize:10,fontWeight:700,background:r.status==='active'?'var(--gd)':'var(--bg4)',color:r.status==='active'?'var(--green)':'var(--t4)',padding:'2px 9px',borderRadius:20}}>{r.status}</span>
                    </div>
                  </div>
                  <div style={{fontSize:12,color:'var(--t3)',marginBottom:10}}>
                    📍 {r.city||'—'} &nbsp;|&nbsp; 📱 {r.phone} &nbsp;|&nbsp; 🏷 {r.marginPct}% margin
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6,marginBottom:12}}>
                    <div style={{background:'var(--bg3)',borderRadius:'var(--r)',padding:'6px 10px',textAlign:'center'}}>
                      <div style={{fontSize:9,color:'var(--t4)',fontWeight:700}}>ORDERS</div>
                      <div style={{fontFamily:'Syne',fontWeight:700,fontSize:14,color:'var(--blue)'}}>{rOrders.length}</div>
                    </div>
                    <div style={{background:'var(--bg3)',borderRadius:'var(--r)',padding:'6px 10px',textAlign:'center'}}>
                      <div style={{fontSize:9,color:'var(--t4)',fontWeight:700}}>REVENUE</div>
                      <div style={{fontFamily:'Syne',fontWeight:700,fontSize:12,color:'var(--amber)'}}>₹{(rRevenue/1000).toFixed(1)}K</div>
                    </div>
                    <div style={{background:'var(--bg3)',borderRadius:'var(--r)',padding:'6px 10px',textAlign:'center'}}>
                      <div style={{fontSize:9,color:'var(--t4)',fontWeight:700}}>PENDING</div>
                      <div style={{fontFamily:'Syne',fontWeight:700,fontSize:12,color:rPending>0?'var(--red)':'var(--green)'}}>₹{(rPending/1000).toFixed(1)}K</div>
                    </div>
                  </div>
                  <div style={{display:'flex',gap:6}}>
                    <button className="btn bg btn-sm" style={{flex:1}} onClick={()=>setShowPriceList(r)}>💰 Price List</button>
                    <button className="btn bs btn-sm" style={{flex:1}} onClick={()=>{setOForm(p=>({...p,resellerId:r.id}));setShowOrder(true)}}>+ Order</button>
                    <button className="btn bg btn-sm" onClick={()=>{setF({...r});setEditId(r.id);setShowForm(true)}}>✏</button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* ─── ORDERS ─── */}
      {tab==='orders'&&(
        <div className="card" style={{padding:0}}>
          <table className="tbl">
            <thead><tr><th>Order No.</th><th>Reseller</th><th>Items</th><th>Subtotal</th><th>Disc.</th><th>GST</th><th>Grand Total</th><th>Payment</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {resellerOrders.length===0&&<tr><td colSpan={10}><div className="empty"><p>No reseller orders yet</p></div></td></tr>}
              {resellerOrders.map(o=>(
                <tr key={o.id}>
                  <td style={{fontFamily:'JetBrains Mono',fontSize:11,color:'var(--amber)'}}>{o.orderNo}</td>
                  <td style={{fontWeight:500}}>{o.resellerName}<div style={{fontSize:10,color:'var(--t4)'}}>{o.date}</div></td>
                  <td style={{fontSize:11,color:'var(--t3)'}}>{o.items?.length} items</td>
                  <td style={{fontFamily:'JetBrains Mono',fontSize:12}}>₹{o.subtotal?.toLocaleString('en-IN')}</td>
                  <td style={{fontFamily:'JetBrains Mono',fontSize:12,color:'var(--green)'}}>{o.discount>0?'-₹'+o.discAmt?.toFixed(0):'—'}</td>
                  <td style={{fontFamily:'JetBrains Mono',fontSize:12,color:'var(--t3)'}}>₹{o.gst?.toFixed(0)}</td>
                  <td style={{fontFamily:'JetBrains Mono',fontWeight:700,color:'var(--amber)'}}>₹{o.grandTotal?.toLocaleString('en-IN')}</td>
                  <td style={{fontSize:11,color:'var(--t3)',textTransform:'capitalize'}}>{o.paymentMode}</td>
                  <td>
                    <span style={{padding:'2px 9px',borderRadius:20,fontSize:10,fontWeight:700,background:o.status==='paid'?'var(--gd)':o.status==='credit'?'var(--rd)':'var(--ad)',color:o.status==='paid'?'var(--green)':o.status==='credit'?'var(--red)':'var(--amber)'}}>
                      {o.status==='credit'?'CREDIT DUE':o.status?.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <div style={{display:'flex',gap:5}}>
                      <button className="btn bg btn-sm" onClick={()=>setShowInvoice(o)}>Invoice</button>
                      {o.status==='credit'&&<button className="btn btn-sm" style={{background:'var(--gd)',color:'var(--green)',borderColor:'transparent',fontSize:10}} onClick={()=>markOrderPaid(o.id)}>✓ Paid</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── PRICE LIST ─── */}
      {tab==='pricelist'&&(
        <div>
          <div style={{display:'flex',gap:10,marginBottom:14,alignItems:'center'}}>
            <span style={{fontSize:13,color:'var(--t2)'}}>Reseller ke liye price dekhna:</span>
            {resellers.map(r=>(
              <button key={r.id} className={`pill`} onClick={()=>setShowPriceList(r)}>{r.name} ({r.marginPct}%)</button>
            ))}
            {resellers.length===0&&<span style={{fontSize:12,color:'var(--t4)'}}>Pehle reseller add karo</span>}
          </div>

          {/* Default wholesale price table (average margin) */}
          <div className="card" style={{padding:0}}>
            <div style={{padding:'12px 16px',borderBottom:'1px solid var(--b1)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div style={{fontFamily:'Syne',fontWeight:700,fontSize:13}}>All Products — Wholesale Price Preview</div>
              <button className="btn bs btn-sm" onClick={()=>{
                const rows=[['SKU','Product','Size','Color','Your Cost','MRP','30% Margin Price','40% Margin Price','50% Margin Price']]
                variants.forEach(v=>{
                  const p=products.find(x=>x.id===v.productId)
                  const mrp=v.priceOverride||p?.mrp||0
                  rows.push([v.sku,p?.name,v.size,v.color,p?.costPrice||'—',mrp,resellerPrice(p,v,30),resellerPrice(p,v,40),resellerPrice(p,v,50)])
                })
                downloadCSV('Wholesale_Price_List.csv',rows)
                toast.show('Wholesale price list exported ✓','ok')
              }}>⬇ Export All Price Lists</button>
            </div>
            <table className="tbl">
              <thead>
                <tr>
                  <th>SKU</th><th>Product</th><th>Size</th><th>MRP</th>
                  <th style={{color:'var(--blue)'}}>@ 30% margin</th>
                  <th style={{color:'var(--amber)'}}>@ 40% margin</th>
                  <th style={{color:'var(--green)'}}>@ 50% margin</th>
                </tr>
              </thead>
              <tbody>
                {variants.slice(0,30).map(v=>{
                  const p=products.find(x=>x.id===v.productId)
                  const mrp=v.priceOverride||p?.mrp||0
                  return(
                    <tr key={v.id}>
                      <td style={{fontFamily:'JetBrains Mono',fontSize:11,color:'var(--amber)'}}>{v.sku}</td>
                      <td style={{fontSize:12.5,fontWeight:500}}>{p?.shortName||p?.name} {v.color&&`(${v.color})`}</td>
                      <td style={{color:'var(--t3)',fontSize:12}}>{v.size||'—'}</td>
                      <td style={{fontFamily:'JetBrains Mono',color:'var(--t2)'}}>₹{mrp}</td>
                      <td style={{fontFamily:'JetBrains Mono',fontWeight:700,color:'var(--blue)'}}>₹{resellerPrice(p,v,30)}</td>
                      <td style={{fontFamily:'JetBrains Mono',fontWeight:700,color:'var(--amber)'}}>₹{resellerPrice(p,v,40)}</td>
                      <td style={{fontFamily:'JetBrains Mono',fontWeight:700,color:'var(--green)'}}>₹{resellerPrice(p,v,50)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── PAYOUTS ─── */}
      {tab==='payouts'&&(
        <div style={{maxWidth:700}}>
          <div className="card" style={{padding:0}}>
            <div style={{padding:'12px 16px',borderBottom:'1px solid var(--b1)'}}>
              <div style={{fontFamily:'Syne',fontWeight:700,fontSize:13}}>Credit Due — Reseller-wise</div>
            </div>
            <table className="tbl">
              <thead><tr><th>Reseller</th><th>Code</th><th>Tier</th><th>Total Orders</th><th>Total Business</th><th>Credit Due</th><th>Action</th></tr></thead>
              <tbody>
                {resellers.length===0&&<tr><td colSpan={7}><div className="empty"><p>No resellers yet</p></div></td></tr>}
                {resellers.map(r=>{
                  const rOrders=resellerOrders.filter(o=>o.resellerId===r.id)
                  const total=rOrders.reduce((s,o)=>s+(o.grandTotal||0),0)
                  const due=rOrders.filter(o=>o.status==='credit').reduce((s,o)=>s+(o.grandTotal||0),0)
                  return(
                    <tr key={r.id}>
                      <td style={{fontWeight:600}}>{r.name}</td>
                      <td style={{fontFamily:'JetBrains Mono',fontSize:11,color:'var(--t4)'}}>{r.code}</td>
                      <td><span style={{fontSize:10,fontWeight:700,background:tierBg[r.tier],color:tierColors[r.tier],padding:'2px 8px',borderRadius:20,textTransform:'capitalize'}}>{r.tier}</span></td>
                      <td style={{fontFamily:'JetBrains Mono',textAlign:'center'}}>{rOrders.length}</td>
                      <td style={{fontFamily:'JetBrains Mono',color:'var(--amber)'}}>₹{total.toLocaleString('en-IN',{maximumFractionDigits:0})}</td>
                      <td style={{fontFamily:'JetBrains Mono',fontWeight:700,color:due>0?'var(--red)':'var(--green)'}}>₹{due.toLocaleString('en-IN',{maximumFractionDigits:0})}</td>
                      <td>
                        {due>0&&(
                          <button className="btn btn-sm" style={{background:'#25D366',color:'white',border:'none',fontSize:11}} onClick={()=>{
                            const msg=`Namaste ${r.name} ji! 🙏\n\nAapka payment pending hai:\n💰 Amount: *₹${due.toLocaleString('en-IN')}*\n\nKripaya jald bhugtaan karein.\n\n_${settings.brandName}_`
                            window.open(`https://wa.me/91${r.phone?.replace(/[^0-9]/g,'')}?text=${encodeURIComponent(msg)}`)
                          }}>📱 Remind</button>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {resellers.length>0&&(
                  <tr style={{background:'var(--bg3)'}}>
                    <td colSpan={5} style={{fontWeight:700,textAlign:'right'}}>Total Credit Due</td>
                    <td style={{fontFamily:'JetBrains Mono',fontWeight:800,color:'var(--red)',fontSize:14}}>₹{resellers.reduce((s,r)=>s+resellerOrders.filter(o=>o.resellerId===r.id&&o.status==='credit').reduce((s2,o)=>s2+(o.grandTotal||0),0),0).toLocaleString('en-IN',{maximumFractionDigits:0})}</td>
                    <td/>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── ADD/EDIT RESELLER MODAL ─── */}
      {showForm&&(
        <div className="overlay" onClick={e=>e.target===e.currentTarget&&setShowForm(false)}>
          <div className="modal modal-xl">
            <div className="mhd"><div className="mt">{editId?'Edit':'Add'} Reseller</div><button className="xbtn" onClick={()=>setShowForm(false)}>✕</button></div>
            <div className="modal-body" style={{maxHeight:'70vh',overflowY:'auto'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>
                <div className="fg"><label className="fl">Full Name / Business Name *</label><input className="field" value={f.name} onChange={e=>set('name',e.target.value)} autoFocus/></div>
                <div className="fg"><label className="fl">Phone *</label><input className="field" value={f.phone} onChange={e=>set('phone',e.target.value)}/></div>
                <div className="fg"><label className="fl">Email</label><input className="field" type="email" value={f.email} onChange={e=>set('email',e.target.value)}/></div>
                <div className="fg"><label className="fl">City</label><input className="field" value={f.city} onChange={e=>set('city',e.target.value)}/></div>
                <div className="fg"><label className="fl">GSTIN</label><input className="field" style={{fontFamily:'JetBrains Mono',textTransform:'uppercase'}} value={f.gstin} onChange={e=>set('gstin',e.target.value.toUpperCase())}/></div>
                <div className="fg"><label className="fl">Address</label><input className="field" value={f.address} onChange={e=>set('address',e.target.value)}/></div>
              </div>

              <div style={{background:'var(--ad)',border:'1px solid var(--ab)',borderRadius:'var(--r)',padding:14,marginTop:4}}>
                <div style={{fontFamily:'Syne',fontWeight:700,fontSize:12.5,marginBottom:12,color:'var(--amber)'}}>💰 Wholesale Pricing</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:12}}>
                  <div className="fg">
                    <label className="fl">Margin % *</label>
                    <input className="field" type="number" min="5" max="70" value={f.marginPct} onChange={e=>set('marginPct',+e.target.value)}/>
                    <div style={{fontSize:11,color:'var(--t4)',marginTop:3}}>Reseller ko itna above cost milega</div>
                  </div>
                  <div className="fg">
                    <label className="fl">Tier</label>
                    <select className="field" value={f.tier} onChange={e=>set('tier',e.target.value)}>
                      <option value="standard">Standard</option>
                      <option value="silver">Silver</option>
                      <option value="gold">Gold</option>
                      <option value="platinum">Platinum</option>
                    </select>
                  </div>
                  <div className="fg">
                    <label className="fl">Credit Limit (₹)</label>
                    <input className="field" type="number" value={f.creditLimit} onChange={e=>set('creditLimit',+e.target.value)} placeholder="0 = no credit"/>
                  </div>
                  <div className="fg">
                    <label className="fl">Status</label>
                    <select className="field" value={f.status} onChange={e=>set('status',e.target.value)}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="blocked">Blocked</option>
                    </select>
                  </div>
                </div>

                {/* Price preview */}
                {products.length>0&&(()=>{
                  const firstP=products[0]
                  const firstV=variants.find(v=>v.productId===firstP.id)
                  const mrp=firstV?.priceOverride||firstP?.mrp||0
                  const wp=resellerPrice(firstP,firstV,f.marginPct)
                  return mrp>0&&(
                    <div style={{marginTop:10,fontSize:12,color:'var(--t2)'}}>
                      Example: {firstP.shortName||firstP.name} MRP <strong style={{color:'var(--t2)'}}>₹{mrp}</strong> →  Reseller price <strong style={{color:'var(--amber)'}}>₹{wp}</strong> (margin: {f.marginPct}%)
                    </div>
                  )
                })()}
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginTop:4}}>
                <div className="fg"><label className="fl">Bank Name</label><input className="field" value={f.bankName} onChange={e=>set('bankName',e.target.value)}/></div>
                <div className="fg"><label className="fl">Account No.</label><input className="field" style={{fontFamily:'JetBrains Mono'}} value={f.accountNo} onChange={e=>set('accountNo',e.target.value)}/></div>
                <div className="fg"><label className="fl">IFSC</label><input className="field" style={{fontFamily:'JetBrains Mono',textTransform:'uppercase'}} value={f.ifsc} onChange={e=>set('ifsc',e.target.value.toUpperCase())}/></div>
              </div>
              <div className="fg"><label className="fl">Notes</label><textarea className="field" style={{minHeight:60}} value={f.notes} onChange={e=>set('notes',e.target.value)}/></div>
            </div>
            <div className="mft">
              <button className="btn bg" onClick={()=>setShowForm(false)}>Cancel</button>
              <button className="btn bp" onClick={saveReseller}>Save Reseller</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── NEW ORDER MODAL ─── */}
      {showOrder&&(
        <div className="overlay" onClick={e=>e.target===e.currentTarget&&setShowOrder(false)}>
          <div className="modal modal-xl">
            <div className="mhd"><div className="mt">New Reseller Order</div><button className="xbtn" onClick={()=>setShowOrder(false)}>✕</button></div>
            <div className="modal-body" style={{maxHeight:'70vh',overflowY:'auto'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:14}}>
                <div className="fg"><label className="fl">Reseller *</label>
                  <select className="field" value={oForm.resellerId} onChange={e=>setOForm(p=>({...p,resellerId:e.target.value,items:[]}))}>
                    <option value="">Select Reseller</option>
                    {resellers.filter(r=>r.status==='active').map(r=><option key={r.id} value={r.id}>{r.name} ({r.marginPct}% margin)</option>)}
                  </select>
                </div>
                <div className="fg"><label className="fl">Payment Mode</label>
                  <select className="field" value={oForm.paymentMode} onChange={e=>setOForm(p=>({...p,paymentMode:e.target.value}))}>
                    <option value="credit">Credit (Pay Later)</option>
                    <option value="advance">Advance Paid</option>
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="neft">NEFT/Bank</option>
                  </select>
                </div>
                <div className="fg"><label className="fl">Extra Discount (%)</label>
                  <input className="field" type="number" min="0" max="30" value={oForm.discount} onChange={e=>setOForm(p=>({...p,discount:+e.target.value}))} placeholder="0"/>
                </div>
              </div>

              {oForm.resellerId&&(()=>{
                const res=resellers.find(r=>r.id===oForm.resellerId)
                return res&&(
                  <div style={{background:'var(--ad)',border:'1px solid var(--ab)',borderRadius:'var(--r)',padding:'10px 14px',marginBottom:14,fontSize:12}}>
                    <strong style={{color:'var(--amber)'}}>{res.name}</strong> · {res.tier} · {res.marginPct}% margin · Credit limit: {res.creditLimit>0?'₹'+res.creditLimit.toLocaleString('en-IN'):'None'}
                  </div>
                )
              })()}

              {/* Add items */}
              <div style={{background:'var(--bg3)',borderRadius:'var(--r)',padding:14,marginBottom:14}}>
                <div style={{fontWeight:700,fontSize:12.5,marginBottom:10,color:'var(--amber)'}}>Add Products</div>
                <select className="field" onChange={e=>{addItemToOrder(e.target.value);e.target.value=''}} disabled={!oForm.resellerId}>
                  <option value="">+ Add product (select)</option>
                  {variants.map(v=>{
                    const p=products.find(x=>x.id===v.productId)
                    const res=resellers.find(x=>x.id===oForm.resellerId)
                    const price=res?resellerPrice(p,v,res.marginPct):0
                    const inv=inventory.find(i=>i.variantId===v.id)
                    return<option key={v.id} value={v.id}>{v.sku} — {p?.shortName||p?.name} {v.size||''} — ₹{price} (stock: {inv?.qty||0})</option>
                  })}
                </select>

                {oForm.items.length>0&&(
                  <div style={{marginTop:12}}>
                    <table style={{width:'100%',borderCollapse:'collapse'}}>
                      <thead>
                        <tr style={{fontSize:11,color:'var(--t4)'}}>
                          <th style={{textAlign:'left',padding:'4px 6px'}}>SKU / Product</th>
                          <th style={{textAlign:'center',padding:'4px 6px'}}>Qty</th>
                          <th style={{textAlign:'right',padding:'4px 6px'}}>Reseller Price</th>
                          <th style={{textAlign:'right',padding:'4px 6px'}}>MRP</th>
                          <th style={{textAlign:'right',padding:'4px 6px'}}>Total</th>
                          <th/>
                        </tr>
                      </thead>
                      <tbody>
                        {oForm.items.map((item,i)=>(
                          <tr key={i} style={{borderBottom:'1px solid var(--b1)'}}>
                            <td style={{padding:'6px',fontSize:12}}>
                              <div style={{fontFamily:'JetBrains Mono',fontSize:11,color:'var(--amber)'}}>{item.sku}</div>
                              <div style={{color:'var(--t2)'}}>{item.name}</div>
                              <div style={{fontSize:10,color:'var(--t4)'}}>Stock: {item.stock}</div>
                            </td>
                            <td style={{textAlign:'center',padding:'6px'}}>
                              <input type="number" min="1" max={item.stock} value={item.qty}
                                style={{width:55,padding:'4px',border:'1px solid var(--b2)',borderRadius:'var(--r)',background:'var(--bg2)',color:'var(--t1)',textAlign:'center',fontFamily:'JetBrains Mono',fontSize:13}}
                                onChange={e=>setOForm(p=>({...p,items:p.items.map((x,j)=>j===i?{...x,qty:Math.min(+e.target.value,x.stock)}:x)}))}/>
                            </td>
                            <td style={{textAlign:'right',padding:'6px',fontFamily:'JetBrains Mono',fontWeight:700,color:'var(--amber)'}}>₹{item.unitPrice}</td>
                            <td style={{textAlign:'right',padding:'6px',fontFamily:'JetBrains Mono',fontSize:11,color:'var(--t4)',textDecoration:'line-through'}}>₹{item.mrp}</td>
                            <td style={{textAlign:'right',padding:'6px',fontFamily:'JetBrains Mono',fontWeight:700,color:'var(--t1)'}}>₹{(item.qty*item.unitPrice).toLocaleString('en-IN')}</td>
                            <td style={{padding:'6px'}}><button onClick={()=>setOForm(p=>({...p,items:p.items.filter((_,j)=>j!==i)}))} style={{background:'none',border:'none',color:'var(--t4)',cursor:'pointer'}}>✕</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {/* Totals */}
                    <div style={{marginTop:12,borderTop:'2px solid var(--b1)',paddingTop:12}}>
                      {(()=>{
                        const sub=oForm.items.reduce((s,i)=>s+i.qty*i.unitPrice,0)
                        const disc=sub*(oForm.discount/100)
                        const tax=sub*0.05
                        return(
                          <div style={{maxWidth:280,marginLeft:'auto',fontSize:12.5}}>
                            {[['Subtotal','₹'+sub.toLocaleString('en-IN')],oForm.discount>0&&[`Discount (${oForm.discount}%)`,'-₹'+(disc).toFixed(0)],['GST (avg 5%)','₹'+tax.toFixed(0)],].filter(Boolean).map(([k,v])=>(
                              <div key={k} style={{display:'flex',justifyContent:'space-between',marginBottom:4,color:'var(--t3)'}}>
                                <span>{k}</span><span style={{fontFamily:'JetBrains Mono'}}>{v}</span>
                              </div>
                            ))}
                            <div style={{display:'flex',justifyContent:'space-between',fontFamily:'Syne',fontWeight:800,fontSize:16,color:'var(--amber)',borderTop:'1px solid var(--b1)',paddingTop:8,marginTop:4}}>
                              <span>Grand Total</span>
                              <span>₹{(sub-sub*(oForm.discount/100)+sub*0.05).toLocaleString('en-IN',{maximumFractionDigits:0})}</span>
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                )}
              </div>
              <div className="fg"><label className="fl">Notes</label><input className="field" value={oForm.notes} onChange={e=>setOForm(p=>({...p,notes:e.target.value}))}/></div>
            </div>
            <div className="mft">
              <button className="btn bg" onClick={()=>setShowOrder(false)}>Cancel</button>
              <button className="btn bp" disabled={!oForm.resellerId||!oForm.items.length} onClick={saveOrder}>Create Order & Deduct Stock</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── RESELLER PRICE LIST MODAL ─── */}
      {showPriceList&&(
        <div className="overlay" onClick={e=>e.target===e.currentTarget&&setShowPriceList(null)}>
          <div className="modal modal-xl">
            <div className="mhd">
              <div className="mt">Price List — {showPriceList.name} ({showPriceList.marginPct}% margin)</div>
              <div style={{display:'flex',gap:8}}>
                <button className="btn bs btn-sm" onClick={()=>{
                  const rows=[['SKU','Product','Size','Color','MRP','Your Price','Savings'],
                    ...variants.map(v=>{const p=products.find(x=>x.id===v.productId);const mrp=v.priceOverride||p?.mrp||0;const wp=resellerPrice(p,v,showPriceList.marginPct);return[v.sku,p?.name,v.size,v.color,mrp,wp,mrp-wp]})]
                  downloadCSV(`PriceList_${showPriceList.name}.csv`,rows)
                  toast.show('Price list exported ✓','ok')
                }}>⬇ Export CSV</button>
                <button className="xbtn" onClick={()=>setShowPriceList(null)}>✕</button>
              </div>
            </div>
            <div className="modal-body" style={{maxHeight:'70vh',overflowY:'auto'}}>
              <div style={{background:'var(--ad)',border:'1px solid var(--ab)',borderRadius:'var(--r)',padding:'10px 14px',marginBottom:14,display:'flex',gap:20,fontSize:12}}>
                <span>👤 {showPriceList.name}</span>
                <span>🏷 Tier: <strong style={{color:'var(--amber)'}}>{showPriceList.tier}</strong></span>
                <span>💰 Margin: <strong style={{color:'var(--amber)'}}>{showPriceList.marginPct}%</strong></span>
                <span>📍 {showPriceList.city||'—'}</span>
              </div>
              <table className="tbl">
                <thead><tr><th>SKU</th><th>Product</th><th>Size</th><th>Color</th><th>MRP (Retail)</th><th>Your Price</th><th>You Save</th></tr></thead>
                <tbody>
                  {variants.map(v=>{
                    const p=products.find(x=>x.id===v.productId)
                    const mrp=v.priceOverride||p?.mrp||0
                    const wp=resellerPrice(p,v,showPriceList.marginPct)
                    const save=mrp-wp
                    return(
                      <tr key={v.id}>
                        <td style={{fontFamily:'JetBrains Mono',fontSize:11,color:'var(--amber)'}}>{v.sku}</td>
                        <td style={{fontWeight:500,fontSize:12.5}}>{p?.shortName||p?.name}</td>
                        <td style={{color:'var(--t3)',fontSize:12}}>{v.size||'—'}</td>
                        <td style={{color:'var(--t3)',fontSize:12}}>{v.color||'—'}</td>
                        <td style={{fontFamily:'JetBrains Mono',color:'var(--t3)',textDecoration:'line-through'}}>₹{mrp}</td>
                        <td style={{fontFamily:'JetBrains Mono',fontWeight:800,color:'var(--amber)',fontSize:14}}>₹{wp}</td>
                        <td style={{fontFamily:'JetBrains Mono',fontWeight:700,color:'var(--green)'}}>₹{save} ({((save/mrp)*100).toFixed(0)}%)</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── RESELLER INVOICE MODAL ─── */}
      {showInvoice&&(()=>{
        const res=resellers.find(r=>r.id===showInvoice.resellerId)
        return(
          <div className="overlay" onClick={e=>e.target===e.currentTarget&&setShowInvoice(null)}>
            <div className="modal modal-md">
              <div className="mhd"><div className="mt">Reseller Invoice — {showInvoice.orderNo}</div>
                <div style={{display:'flex',gap:8}}>
                  <button className="btn bs btn-sm" onClick={()=>window.print()}>🖨 Print</button>
                  <button className="xbtn" onClick={()=>setShowInvoice(null)}>✕</button>
                </div>
              </div>
              <div className="modal-body" style={{fontFamily:'JetBrains Mono',fontSize:12.5}}>
                <div style={{textAlign:'center',marginBottom:14,paddingBottom:12,borderBottom:'2px solid var(--b1)'}}>
                  <div style={{fontFamily:'Syne',fontWeight:800,fontSize:18,color:'var(--amber)'}}>{settings.brandName}</div>
                  {settings.gstin&&<div style={{fontSize:11,color:'var(--t3)'}}>GSTIN: {settings.gstin}</div>}
                  <div style={{fontSize:11,color:'var(--t3)'}}>WHOLESALE / RESELLER INVOICE</div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12,fontSize:11.5}}>
                  <div>
                    <div style={{fontWeight:700,color:'var(--t2)',marginBottom:4}}>BILL TO:</div>
                    <div style={{fontWeight:600,color:'var(--t1)'}}>{res?.name}</div>
                    <div style={{color:'var(--t3)'}}>{res?.city}</div>
                    {res?.gstin&&<div style={{color:'var(--t3)'}}>GSTIN: {res.gstin}</div>}
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div><strong>Order No:</strong> <span style={{color:'var(--amber)'}}>{showInvoice.orderNo}</span></div>
                    <div><strong>Date:</strong> {showInvoice.date}</div>
                    <div><strong>Payment:</strong> {showInvoice.paymentMode?.toUpperCase()}</div>
                    <div style={{marginTop:4}}><span style={{padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:700,background:showInvoice.status==='paid'?'var(--gd)':'var(--rd)',color:showInvoice.status==='paid'?'var(--green)':'var(--red)'}}>{showInvoice.status==='credit'?'CREDIT DUE':showInvoice.status?.toUpperCase()}</span></div>
                  </div>
                </div>
                <table style={{width:'100%',borderCollapse:'collapse',marginBottom:12}}>
                  <thead><tr style={{borderBottom:'2px solid var(--b1)',fontSize:11}}>{['SKU','Product','Qty','Rate','Total'].map(h=><th key={h} style={{padding:'6px',textAlign:h==='Qty'||h==='Rate'||h==='Total'?'right':'left',color:'var(--t3)'}}>{h}</th>)}</tr></thead>
                  <tbody>
                    {showInvoice.items?.map((item,i)=>(
                      <tr key={i} style={{borderBottom:'1px solid var(--b1)'}}>
                        <td style={{padding:'6px',color:'var(--amber)'}}>{item.sku}</td>
                        <td style={{padding:'6px'}}>{item.name}</td>
                        <td style={{padding:'6px',textAlign:'right'}}>{item.qty}</td>
                        <td style={{padding:'6px',textAlign:'right'}}>₹{item.unitPrice}</td>
                        <td style={{padding:'6px',textAlign:'right',fontWeight:700}}>₹{(item.qty*item.unitPrice).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{maxWidth:240,marginLeft:'auto'}}>
                  {[['Subtotal','₹'+showInvoice.subtotal?.toLocaleString('en-IN')],showInvoice.discount>0&&['Discount','−₹'+showInvoice.discAmt?.toFixed(0)],['GST','₹'+showInvoice.gst?.toFixed(0)]].filter(Boolean).map(([k,v])=>(
                    <div key={k} style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:3,color:'var(--t3)'}}><span>{k}</span><span>{v}</span></div>
                  ))}
                  <div style={{display:'flex',justifyContent:'space-between',fontFamily:'Syne',fontWeight:800,fontSize:16,color:'var(--amber)',borderTop:'2px solid var(--b1)',paddingTop:8,marginTop:4}}>
                    <span>TOTAL</span><span>₹{showInvoice.grandTotal?.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
