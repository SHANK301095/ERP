import { useState, useMemo } from 'react'
import { downloadCSV } from '../utils/csv.js'

export function PriceManager({ state, dispatch, toast }) {
  const { products, variants, settings } = state
  const [tab, setTab] = useState('prices')
  const [search, setSearch] = useState('')
  const [bulkPct, setBulkPct] = useState('')
  const [bulkType, setBulkType] = useState('increase')
  const [selected, setSelected] = useState([])
  const discounts = settings.discounts || []
  const [showDisc, setShowDisc] = useState(false)
  const [df, setDf] = useState({ name:'', type:'percentage', value:0, minQty:1, validTill:'', applyTo:'all', productId:'' })

  const varRows = useMemo(()=>variants.map(v=>{
    const p=products.find(x=>x.id===v.productId)
    return { ...v, productName:p?.name||'', mrp:v.priceOverride||p?.mrp||0, cost:p?.costPrice||0 }
  }).filter(v=>v.productName.toLowerCase().includes(search.toLowerCase())||v.sku.toLowerCase().includes(search.toLowerCase())),[variants,products,search])

  function updatePrice(variantId, newPrice) {
    const v = variants.find(x=>x.id===variantId)
    if (!v) return
    dispatch({ type:'UPDATE_VARIANT', payload:{ ...v, priceOverride:+newPrice } })
  }

  function applyBulk() {
    if (!bulkPct||!selected.length) { toast.show('Select SKUs and enter %','err'); return }
    const pct = +bulkPct/100
    selected.forEach(vid=>{
      const v = variants.find(x=>x.id===vid)
      const p = products.find(x=>x.id===v?.productId)
      if (!v||!p) return
      const current = v.priceOverride||p.mrp||0
      const newPrice = bulkType==='increase' ? Math.round(current*(1+pct)) : Math.round(current*(1-pct))
      dispatch({ type:'UPDATE_VARIANT', payload:{ ...v, priceOverride: newPrice } })
    })
    toast.show(`Prices updated for ${selected.length} SKUs ✓`,'ok')
    setSelected([]); setBulkPct('')
  }

  function saveDiscount() {
    if (!df.name||!df.value) { toast.show('Name & value required','err'); return }
    const newDiscs = [...discounts, { ...df, id:Date.now().toString(), value:+df.value, minQty:+df.minQty }]
    dispatch({ type:'SET_SETTINGS', payload:{ discounts: newDiscs } })
    toast.show('Discount rule added ✓','ok'); setShowDisc(false)
    setDf({ name:'', type:'percentage', value:0, minQty:1, validTill:'', applyTo:'all', productId:'' })
  }

  const toggleSel = id => setSelected(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id])

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:18}}>
        <div className="sh" style={{margin:0}}><h2>Price Manager</h2><p>Update prices, bulk changes, discount rules</p></div>
        <div style={{display:'flex',gap:8}}>
          <button className="btn bs btn-sm" onClick={()=>downloadCSV('Price_List.csv',[['SKU','Product','Size','Color','MRP','Cost','Margin%'],...variants.map(v=>{const p=products.find(x=>x.id===v.productId);const mrp=v.priceOverride||p?.mrp||0;const cost=p?.costPrice||0;return[v.sku,p?.name,v.size,v.color,mrp,cost,mrp&&cost?((mrp-cost)/mrp*100).toFixed(1):'—']})])}>⬇ Price List CSV</button>
        </div>
      </div>

      <div style={{display:'flex',gap:4,marginBottom:16,borderBottom:'1px solid var(--b1)'}}>
        {[['prices','💰 SKU Prices'],['bulk','⚡ Bulk Update'],['discounts','🏷 Discount Rules']].map(([id,l])=>(
          <button key={id} onClick={()=>setTab(id)} style={{padding:'7px 16px',background:'none',border:'none',borderBottom:tab===id?'2px solid var(--amber)':'2px solid transparent',color:tab===id?'var(--amber)':'var(--t3)',cursor:'pointer',fontSize:13,fontWeight:600,marginBottom:-1}}>{l}</button>
        ))}
      </div>

      {tab==='prices'&&(
        <>
          <input className="field" placeholder="Search SKU or product…" value={search} onChange={e=>setSearch(e.target.value)} style={{marginBottom:12,maxWidth:300}}/>
          <div className="card" style={{padding:0}}>
            <table className="tbl">
              <thead><tr><th>SKU</th><th>Product</th><th>Size</th><th>Color</th><th>Cost Price</th><th>MRP / Sale Price</th><th>Margin</th></tr></thead>
              <tbody>
                {varRows.map(v=>{
                  const margin = v.cost ? ((v.mrp-v.cost)/v.mrp*100).toFixed(1) : null
                  return(
                    <tr key={v.id}>
                      <td style={{fontFamily:'JetBrains Mono',fontSize:11,color:'var(--amber)'}}>{v.sku}</td>
                      <td style={{fontWeight:500,fontSize:12.5}}>{v.productName}</td>
                      <td style={{color:'var(--t3)',fontSize:12}}>{v.size||'—'}</td>
                      <td style={{color:'var(--t3)',fontSize:12}}>{v.color||'—'}</td>
                      <td style={{fontFamily:'JetBrains Mono',fontSize:12,color:'var(--t3)'}}>₹{v.cost||'—'}</td>
                      <td>
                        <input type="number" value={v.mrp} onChange={e=>updatePrice(v.id,e.target.value)}
                          style={{width:90,padding:'4px 8px',border:'1px solid var(--b2)',borderRadius:'var(--r)',background:'var(--bg3)',color:'var(--amber)',fontFamily:'JetBrains Mono',fontWeight:700,fontSize:13,textAlign:'right'}}/>
                      </td>
                      <td style={{fontFamily:'JetBrains Mono',fontSize:12,color:margin>40?'var(--green)':margin>20?'var(--amber)':'var(--red)'}}>
                        {margin ? margin+'%' : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab==='bulk'&&(
        <div>
          <div className="card" style={{marginBottom:16,maxWidth:500}}>
            <div style={{fontFamily:'Syne',fontWeight:700,fontSize:13,marginBottom:14,color:'var(--amber)'}}>⚡ Bulk Price Update</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
              <div className="fg"><label className="fl">Action</label>
                <select className="field" value={bulkType} onChange={e=>setBulkType(e.target.value)}>
                  <option value="increase">Increase Price</option>
                  <option value="decrease">Decrease Price</option>
                </select>
              </div>
              <div className="fg"><label className="fl">Percentage (%)</label>
                <input className="field" type="number" value={bulkPct} onChange={e=>setBulkPct(e.target.value)} placeholder="e.g. 10"/>
              </div>
            </div>
            <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:10}}>
              <button className="btn bg btn-sm" onClick={()=>setSelected(variants.map(v=>v.id))}>Select All</button>
              <button className="btn bg btn-sm" onClick={()=>setSelected([])}>Clear</button>
              <span style={{fontSize:12,color:'var(--t3)'}}>{selected.length} selected</span>
            </div>
            {selected.length>0&&bulkPct&&(
              <div style={{background:'var(--ad)',border:'1px solid var(--ab)',borderRadius:'var(--r)',padding:'10px 12px',marginBottom:12,fontSize:12}}>
                Will {bulkType} prices of <strong style={{color:'var(--amber)'}}>{selected.length}</strong> SKUs by <strong style={{color:'var(--amber)'}}>{bulkPct}%</strong>
              </div>
            )}
            <button className="btn bp" style={{width:'100%'}} onClick={applyBulk} disabled={!selected.length||!bulkPct}>Apply Bulk Update</button>
          </div>
          <div className="card" style={{padding:0}}>
            <table className="tbl">
              <thead><tr><th style={{width:40}}><input type="checkbox" onChange={e=>setSelected(e.target.checked?variants.map(v=>v.id):[])} checked={selected.length===variants.length}/></th><th>SKU</th><th>Product</th><th>Current Price</th><th>New Price</th></tr></thead>
              <tbody>
                {variants.map(v=>{
                  const p=products.find(x=>x.id===v.productId)
                  const current=v.priceOverride||p?.mrp||0
                  const newP=bulkPct?Math.round(current*(bulkType==='increase'?1+(+bulkPct/100):1-(+bulkPct/100))):null
                  return(
                    <tr key={v.id} style={{opacity:selected.includes(v.id)?1:0.5}}>
                      <td><input type="checkbox" checked={selected.includes(v.id)} onChange={()=>toggleSel(v.id)}/></td>
                      <td style={{fontFamily:'JetBrains Mono',fontSize:11}}>{v.sku}</td>
                      <td style={{fontSize:12.5}}>{p?.name} {v.size}</td>
                      <td style={{fontFamily:'JetBrains Mono',color:'var(--t2)'}}>₹{current}</td>
                      <td style={{fontFamily:'JetBrains Mono',fontWeight:700,color:newP&&selected.includes(v.id)?bulkType==='increase'?'var(--green)':'var(--red)':'var(--t4)'}}>{newP&&selected.includes(v.id)?'₹'+newP:'—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab==='discounts'&&(
        <div>
          <div style={{display:'flex',justifyContent:'flex-end',marginBottom:12}}>
            <button className="btn bp" onClick={()=>setShowDisc(true)}>+ Add Discount Rule</button>
          </div>
          <div className="card" style={{padding:0}}>
            <table className="tbl">
              <thead><tr><th>Name</th><th>Type</th><th>Value</th><th>Min Qty</th><th>Apply To</th><th>Valid Till</th><th></th></tr></thead>
              <tbody>
                {discounts.length===0&&<tr><td colSpan={7}><div className="empty"><p>No discount rules yet</p></div></td></tr>}
                {discounts.map(d=>(
                  <tr key={d.id}>
                    <td style={{fontWeight:600}}>{d.name}</td>
                    <td><span className="badge bb">{d.type}</span></td>
                    <td style={{fontFamily:'JetBrains Mono',fontWeight:700,color:'var(--green)'}}>{d.type==='percentage'?d.value+'%':'₹'+d.value}</td>
                    <td style={{fontFamily:'JetBrains Mono',fontSize:12}}>{d.minQty}+ pcs</td>
                    <td style={{color:'var(--t3)',fontSize:12}}>{d.applyTo==='all'?'All Products':products.find(p=>p.id===d.productId)?.name||d.applyTo}</td>
                    <td style={{color:'var(--t3)',fontSize:11.5}}>{d.validTill||'No expiry'}</td>
                    <td><button className="btn bd btn-sm" onClick={()=>dispatch({type:'SET_SETTINGS',payload:{discounts:discounts.filter(x=>x.id!==d.id)}})}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {showDisc&&(
            <div className="overlay" onClick={e=>e.target===e.currentTarget&&setShowDisc(false)}>
              <div className="modal modal-sm">
                <div className="mhd"><div className="mt">Add Discount Rule</div><button className="xbtn" onClick={()=>setShowDisc(false)}>✕</button></div>
                <div className="modal-body">
                  <div className="fg"><label className="fl">Discount Name *</label><input className="field" value={df.name} onChange={e=>setDf(p=>({...p,name:e.target.value}))} placeholder="e.g. Bulk 10+ pcs"/></div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                    <div className="fg"><label className="fl">Type</label>
                      <select className="field" value={df.type} onChange={e=>setDf(p=>({...p,type:e.target.value}))}>
                        <option value="percentage">Percentage (%)</option>
                        <option value="flat">Flat (₹)</option>
                      </select>
                    </div>
                    <div className="fg"><label className="fl">Value *</label><input className="field" type="number" value={df.value} onChange={e=>setDf(p=>({...p,value:+e.target.value}))}/></div>
                    <div className="fg"><label className="fl">Min Quantity</label><input className="field" type="number" value={df.minQty} onChange={e=>setDf(p=>({...p,minQty:+e.target.value}))}/></div>
                    <div className="fg"><label className="fl">Valid Till</label><input className="field" type="date" value={df.validTill} onChange={e=>setDf(p=>({...p,validTill:e.target.value}))}/></div>
                  </div>
                  <div className="fg"><label className="fl">Apply To</label>
                    <select className="field" value={df.applyTo} onChange={e=>setDf(p=>({...p,applyTo:e.target.value}))}>
                      <option value="all">All Products</option>
                      {products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="mft">
                  <button className="btn bg" onClick={()=>setShowDisc(false)}>Cancel</button>
                  <button className="btn bp" onClick={saveDiscount}>Save Rule</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
