import { useState } from 'react'
import { uid, today } from '../utils/csv.js'

export function Returns({ state, dispatch, toast }) {
  const { salesInvoices, customers, variants, products, inventory } = state
  const returns_ = state.settings.returns_ || []
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState('all')
  const [f, setF] = useState({ invoiceId:'', customerId:'', items:[], reason:'Defective', returnType:'refund', notes:'' })
  const set = (k,v) => setF(p=>({...p,[k]:v}))

  const REASONS = ['Defective/Damaged','Wrong Item Sent','Size Issue','Quality Issue','Customer Changed Mind','Excess Quantity','Other']

  function addItem(variantId) {
    const v = variants.find(x=>x.id===variantId)
    const p = products.find(x=>x.id===v?.productId)
    if (!v||!p) return
    const invItem = f.invoiceId ? salesInvoices.find(i=>i.id===f.invoiceId)?.items?.find(it=>it.variantId===variantId) : null
    if (!f.items.find(x=>x.variantId===variantId))
      setF(prev=>({...prev,items:[...prev.items,{variantId,sku:v.sku,name:`${p.shortName||p.name} ${v.size||''}`.trim(),qty:1,unitPrice:v.priceOverride||p.mrp,maxQty:invItem?.qty||99}]}))
  }

  function processReturn() {
    if (!f.customerId || !f.items.length) { toast.show('Select customer & items','err'); return }
    const c = customers.find(x=>x.id===f.customerId)
    const total = f.items.reduce((s,i)=>s+i.qty*i.unitPrice,0)
    const ret = { ...f, id:uid(), returnNo:'RET-'+String(returns_.length+1).padStart(4,'0'), customerName:c?.name||'', total, date:today(), status:'processed' }
    const newReturns = [ret, ...returns_]
    dispatch({ type:'SET_SETTINGS', payload:{ returns_: newReturns } })

    // Restock if exchange/restock
    if (f.returnType==='restock'||f.returnType==='exchange') {
      f.items.forEach(item=>{
        const inv = inventory.find(i=>i.variantId===item.variantId)
        if (inv) dispatch({ type:'ADJUST_STOCK', payload:{ variantId:item.variantId, delta:item.qty, type:'return_in', refType:'Return', refNumber:ret.returnNo, note:'Customer return' }})
      })
    }
    toast.show(`Return ${ret.returnNo} processed ✓`,'ok'); setShowForm(false)
    setF({ invoiceId:'', customerId:'', items:[], reason:'Defective', returnType:'refund', notes:'' })
  }

  const filtered = filter==='all' ? returns_ : returns_.filter(r=>r.returnType===filter)

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:18}}>
        <div className="sh" style={{margin:0}}><h2>Returns & Refunds</h2><p>Customer returns, exchanges, credit notes</p></div>
        <button className="btn bp" onClick={()=>setShowForm(true)}>+ Process Return</button>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:18}}>
        {[
          {l:'Total Returns',v:returns_.length,c:'var(--amber)'},
          {l:'Refunds',v:returns_.filter(r=>r.returnType==='refund').length,c:'var(--red)'},
          {l:'Exchanges',v:returns_.filter(r=>r.returnType==='exchange').length,c:'var(--blue)'},
          {l:'Restocked',v:returns_.filter(r=>r.returnType==='restock').length,c:'var(--green)'},
        ].map(s=><div key={s.l} className="stat"><div className="stat-v" style={{color:s.c,fontSize:20}}>{s.v}</div><div className="stat-l">{s.l}</div></div>)}
      </div>

      <div style={{display:'flex',gap:6,marginBottom:12}}>
        {[['all','All'],['refund','Refund'],['exchange','Exchange'],['restock','Restock']].map(([v,l])=>(
          <button key={v} onClick={()=>setFilter(v)} className={`pill ${filter===v?'on':''}`}>{l}</button>
        ))}
      </div>

      <div className="card" style={{padding:0}}>
        <table className="tbl">
          <thead><tr><th>Return No.</th><th>Customer</th><th>Invoice</th><th>Items</th><th>Amount</th><th>Reason</th><th>Type</th><th>Date</th></tr></thead>
          <tbody>
            {filtered.length===0&&<tr><td colSpan={8}><div className="empty"><p>No returns yet</p></div></td></tr>}
            {filtered.map(r=>(
              <tr key={r.id}>
                <td style={{fontFamily:'JetBrains Mono',fontSize:11,color:'var(--amber)'}}>{r.returnNo}</td>
                <td style={{fontWeight:500}}>{r.customerName}</td>
                <td style={{fontFamily:'JetBrains Mono',fontSize:11,color:'var(--t3)'}}>{r.invoiceId?salesInvoices.find(i=>i.id===r.invoiceId)?.invoiceNumber||'—':'—'}</td>
                <td style={{fontSize:11.5,color:'var(--t3)'}}>{r.items?.map(i=>i.sku).join(', ')}</td>
                <td style={{fontFamily:'JetBrains Mono',fontWeight:700,color:'var(--red)'}}>₹{r.total?.toLocaleString('en-IN')}</td>
                <td style={{fontSize:11.5,color:'var(--t3)'}}>{r.reason}</td>
                <td>
                  <span style={{padding:'2px 8px',borderRadius:20,fontSize:10,fontWeight:700,background:r.returnType==='refund'?'var(--rd)':r.returnType==='exchange'?'var(--bi)':'var(--gd)',color:r.returnType==='refund'?'var(--red)':r.returnType==='exchange'?'var(--blue)':'var(--green)'}}>
                    {r.returnType?.toUpperCase()}
                  </span>
                </td>
                <td style={{color:'var(--t3)',fontSize:11.5}}>{r.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm&&(
        <div className="overlay" onClick={e=>e.target===e.currentTarget&&setShowForm(false)}>
          <div className="modal modal-md">
            <div className="mhd"><div className="mt">Process Return / Refund</div><button className="xbtn" onClick={()=>setShowForm(false)}>✕</button></div>
            <div className="modal-body">
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
                <div className="fg"><label className="fl">Customer *</label>
                  <select className="field" value={f.customerId} onChange={e=>set('customerId',e.target.value)}>
                    <option value="">Select Customer</option>
                    {customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="fg"><label className="fl">Original Invoice (optional)</label>
                  <select className="field" value={f.invoiceId} onChange={e=>set('invoiceId',e.target.value)}>
                    <option value="">Select Invoice</option>
                    {salesInvoices.filter(i=>!f.customerId||i.customerId===f.customerId).map(i=><option key={i.id} value={i.id}>{i.invoiceNumber} — {i.date}</option>)}
                  </select>
                </div>
                <div className="fg"><label className="fl">Return Type</label>
                  <select className="field" value={f.returnType} onChange={e=>set('returnType',e.target.value)}>
                    <option value="refund">Cash Refund</option>
                    <option value="exchange">Exchange</option>
                    <option value="credit">Credit Note</option>
                    <option value="restock">Restock Only</option>
                  </select>
                </div>
                <div className="fg"><label className="fl">Reason</label>
                  <select className="field" value={f.reason} onChange={e=>set('reason',e.target.value)}>
                    {REASONS.map(r=><option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              <div style={{background:'var(--bg3)',borderRadius:'var(--r)',padding:12,marginBottom:12}}>
                <div style={{fontWeight:700,fontSize:12.5,marginBottom:8}}>Return Items</div>
                <select className="field" style={{marginBottom:10}} onChange={e=>{addItem(e.target.value);e.target.value=''}}>
                  <option value="">+ Add Item</option>
                  {variants.map(v=>{const p=products.find(x=>x.id===v.productId);return<option key={v.id} value={v.id}>{v.sku} — {p?.shortName||p?.name}</option>})}
                </select>
                {f.items.map((item,i)=>(
                  <div key={i} style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                    <span style={{flex:1,fontSize:12,color:'var(--t1)'}}>{item.name}</span>
                    <input type="number" min="1" max={item.maxQty} value={item.qty} style={{width:50,padding:'4px',border:'1px solid var(--b2)',borderRadius:'var(--r)',background:'var(--bg2)',color:'var(--t1)',textAlign:'center',fontSize:12}} onChange={e=>setF(p=>({...p,items:p.items.map((x,j)=>j===i?{...x,qty:+e.target.value}:x)}))}/>
                    <span style={{fontFamily:'JetBrains Mono',fontSize:12,color:'var(--red)',minWidth:60,textAlign:'right'}}>₹{(item.qty*item.unitPrice).toLocaleString('en-IN')}</span>
                    <button onClick={()=>setF(p=>({...p,items:p.items.filter((_,j)=>j!==i)}))} style={{background:'none',border:'none',color:'var(--t4)',cursor:'pointer'}}>✕</button>
                  </div>
                ))}
                {f.items.length>0&&<div style={{textAlign:'right',fontFamily:'Syne',fontWeight:700,color:'var(--red)',fontSize:14}}>Return Total: ₹{f.items.reduce((s,i)=>s+i.qty*i.unitPrice,0).toLocaleString('en-IN')}</div>}
              </div>
              <div className="fg"><label className="fl">Notes</label><input className="field" value={f.notes} onChange={e=>set('notes',e.target.value)}/></div>
            </div>
            <div className="mft">
              <button className="btn bg" onClick={()=>setShowForm(false)}>Cancel</button>
              <button className="btn bp" onClick={processReturn}>Process Return</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
