import { useState } from 'react'
import { uid, today } from '../utils/csv.js'

export function StockTransfer({ state, dispatch, toast }) {
  const { variants, products, inventory, settings } = state
  const branches = settings.branches || []
  const transfers = settings.stockTransfers || []
  const [showForm, setShowForm] = useState(false)
  const [f, setF] = useState({ fromBranch:'', toBranch:'', items:[], notes:'' })
  const set = (k,v) => setF(p=>({...p,[k]:v}))
  const [search, setSearch] = useState('')

  function addItem(variantId) {
    const v = variants.find(x=>x.id===variantId)
    const p = products.find(x=>x.id===v?.productId)
    const inv = inventory.find(i=>i.variantId===variantId)
    if (!v||!p) return
    if (f.items.find(x=>x.variantId===variantId)) return
    setF(prev=>({...prev, items:[...prev.items, {variantId, sku:v.sku, name:`${p.shortName||p.name} ${v.size||''}`.trim(), qty:1, available:inv?.qty||0}]}))
  }

  function submitTransfer() {
    if (!f.fromBranch||!f.toBranch||!f.items.length) { toast.show('Fill all fields','err'); return }
    if (f.fromBranch===f.toBranch) { toast.show('From & To must be different','err'); return }
    const t = { ...f, id:uid(), transferNo:'TRF-'+String(transfers.length+1).padStart(4,'0'), date:today(), status:'completed' }
    // Adjust stock (in real multi-branch would be per-branch, here we just note it)
    f.items.forEach(item => {
      dispatch({ type:'ADJUST_STOCK', payload:{ variantId:item.variantId, delta:-item.qty, type:'transfer_out', refType:'TRF', refNumber:t.transferNo, note:`Transfer to ${f.toBranch}` }})
    })
    dispatch({ type:'SET_SETTINGS', payload:{ stockTransfers:[t,...transfers] } })
    toast.show('Transfer done: '+t.transferNo,'ok')
    setShowForm(false); setF({ fromBranch:'',toBranch:'',items:[],notes:'' })
  }

  const filteredVariants = variants.filter(v => {
    const p = products.find(x=>x.id===v.productId)
    return !search || v.sku?.toLowerCase().includes(search.toLowerCase()) || p?.name?.toLowerCase().includes(search.toLowerCase())
  }).slice(0,50)

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:18}}>
        <div className="sh" style={{margin:0}}><h2>Stock Transfer</h2><p>Move inventory between branches/warehouses</p></div>
        <button className="btn bp" onClick={()=>setShowForm(true)}>+ New Transfer</button>
      </div>

      {branches.length<2&&(
        <div style={{background:'var(--ad)',border:'1px solid var(--ab)',borderRadius:'var(--rl)',padding:16,marginBottom:16,fontSize:13,color:'var(--amber)'}}>
          ⚠️ Kam se kam 2 branches chahiye. Multi-Branch page pe jaake branches add karo.
        </div>
      )}

      <div className="card" style={{padding:0}}>
        <table className="tbl">
          <thead><tr><th>Transfer No.</th><th>Date</th><th>From</th><th>To</th><th>Items</th><th>Status</th><th>Notes</th></tr></thead>
          <tbody>
            {transfers.length===0&&<tr><td colSpan={7}><div className="empty"><p>No transfers yet</p></div></td></tr>}
            {transfers.map(t=>(
              <tr key={t.id}>
                <td style={{fontFamily:'JetBrains Mono',fontSize:11,color:'var(--amber)'}}>{t.transferNo}</td>
                <td style={{fontSize:11,color:'var(--t3)'}}>{t.date}</td>
                <td style={{fontWeight:500}}>{t.fromBranch}</td>
                <td style={{fontWeight:500,color:'var(--blue)'}}>{t.toBranch}</td>
                <td style={{fontSize:11,color:'var(--t3)'}}>{t.items?.length} SKUs · {t.items?.reduce((s,i)=>s+i.qty,0)} pcs</td>
                <td><span style={{padding:'2px 9px',borderRadius:20,fontSize:10,fontWeight:700,background:'var(--gd)',color:'var(--green)'}}>{t.status}</span></td>
                <td style={{fontSize:11,color:'var(--t3)'}}>{t.notes||'—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm&&(
        <div className="overlay" onClick={e=>e.target===e.currentTarget&&setShowForm(false)}>
          <div className="modal modal-xl">
            <div className="mhd"><div className="mt">New Stock Transfer</div><button className="xbtn" onClick={()=>setShowForm(false)}>✕</button></div>
            <div className="modal-body" style={{maxHeight:'70vh',overflowY:'auto'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:14}}>
                <div className="fg"><label className="fl">From Branch *</label>
                  <select className="field" value={f.fromBranch} onChange={e=>set('fromBranch',e.target.value)}>
                    <option value="">Select</option>
                    {branches.map(b=><option key={b.id} value={b.name}>{b.name}</option>)}
                  </select>
                </div>
                <div className="fg"><label className="fl">To Branch *</label>
                  <select className="field" value={f.toBranch} onChange={e=>set('toBranch',e.target.value)}>
                    <option value="">Select</option>
                    {branches.filter(b=>b.name!==f.fromBranch).map(b=><option key={b.id} value={b.name}>{b.name}</option>)}
                  </select>
                </div>
                <div className="fg"><label className="fl">Notes</label><input className="field" value={f.notes} onChange={e=>set('notes',e.target.value)}/></div>
              </div>
              <input className="field" placeholder="Search SKU/product…" value={search} onChange={e=>setSearch(e.target.value)} style={{marginBottom:10}}/>
              <select className="field" onChange={e=>{addItem(e.target.value);e.target.value=''}} style={{marginBottom:14}}>
                <option value="">+ Add product to transfer</option>
                {filteredVariants.map(v=>{
                  const p=products.find(x=>x.id===v.productId)
                  const inv=inventory.find(i=>i.variantId===v.id)
                  return<option key={v.id} value={v.id}>{v.sku} — {p?.shortName||p?.name} {v.size||''} (stock: {inv?.qty||0})</option>
                })}
              </select>
              {f.items.length>0&&(
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead><tr style={{fontSize:11,color:'var(--t4)'}}>
                    <th style={{textAlign:'left',padding:'4px 6px'}}>SKU / Product</th>
                    <th style={{textAlign:'center',padding:'4px 6px'}}>Available</th>
                    <th style={{textAlign:'center',padding:'4px 6px'}}>Transfer Qty</th>
                    <th/>
                  </tr></thead>
                  <tbody>
                    {f.items.map((item,i)=>(
                      <tr key={i} style={{borderBottom:'1px solid var(--b1)'}}>
                        <td style={{padding:'6px'}}><div style={{fontFamily:'JetBrains Mono',fontSize:11,color:'var(--amber)'}}>{item.sku}</div><div style={{fontSize:12}}>{item.name}</div></td>
                        <td style={{textAlign:'center',padding:'6px',fontFamily:'JetBrains Mono',color:'var(--t3)'}}>{item.available}</td>
                        <td style={{textAlign:'center',padding:'6px'}}>
                          <input type="number" min="1" max={item.available} value={item.qty} onChange={e=>setF(p=>({...p,items:p.items.map((x,j)=>j===i?{...x,qty:Math.min(+e.target.value,x.available)}:x)}))}
                            style={{width:60,padding:'4px',border:'1px solid var(--b2)',borderRadius:'var(--r)',background:'var(--bg2)',color:'var(--t1)',textAlign:'center',fontFamily:'JetBrains Mono'}}/>
                        </td>
                        <td style={{padding:'6px'}}><button onClick={()=>setF(p=>({...p,items:p.items.filter((_,j)=>j!==i)}))} style={{background:'none',border:'none',color:'var(--t4)',cursor:'pointer'}}>✕</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="mft"><button className="btn bg" onClick={()=>setShowForm(false)}>Cancel</button><button className="btn bp" disabled={!f.fromBranch||!f.toBranch||!f.items.length} onClick={submitTransfer}>Confirm Transfer</button></div>
          </div>
        </div>
      )}
    </div>
  )
}
