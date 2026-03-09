import { useState, useMemo } from 'react'
import { uid, today, downloadCSV } from '../utils/csv.js'

const BLANK_BOM = { name:'', productId:'', category:'', description:'', materials:[], yieldQty:1, yieldUnit:'pcs', laborCost:0, overheadCost:0, notes:'' }
const BLANK_PO  = { bomId:'', qty:1, startDate:today(), targetDate:'', status:'planned', notes:'', workerId:'' }
const BLANK_JW  = { supplierName:'', workType:'', challanNo:'', dispatchDate:today(), returnDueDate:'', status:'sent', items:[], ratePerPiece:0, notes:'' }

export function Manufacturing({ state, dispatch, toast }) {
  const { products, variants, inventory, settings } = state
  const boms  = state.settings.boms  || []
  const wos   = state.settings.wos   || []  // work/production orders
  const jws   = state.settings.jws   || []  // job work orders

  const [tab, setTab]   = useState('bom')
  const [showBOM, setShowBOM]   = useState(false)
  const [showWO,  setShowWO]    = useState(false)
  const [showJW,  setShowJW]    = useState(false)
  const [editId,  setEditId]    = useState(null)
  const [viewWO,  setViewWO]    = useState(null)

  const [bom, setBom] = useState(BLANK_BOM)
  const [wo,  setWo]  = useState(BLANK_PO)
  const [jw,  setJw]  = useState(BLANK_JW)
  const [matLine, setMatLine] = useState({ name:'', qty:1, unit:'meters', costPerUnit:0 })

  function saveBOM() {
    if (!bom.name) { toast.show('BOM name required','err'); return }
    const newBoms = editId ? boms.map(b => b.id === editId ? {...bom, id:editId} : b) : [...boms, {...bom, id:uid(), createdAt:today()}]
    dispatch({ type:'SET_SETTINGS', payload:{ boms: newBoms } })
    toast.show('Bill of Materials saved ✓','ok'); setShowBOM(false); setEditId(null); setBom(BLANK_BOM)
  }

  function saveWO() {
    if (!wo.bomId || !wo.qty) { toast.show('Select BOM & Qty','err'); return }
    const b = boms.find(x => x.id === wo.bomId)
    const newWOs = [...wos, { ...wo, id:uid(), woNumber:`WO-${String(wos.length+1).padStart(4,'0')}`, bomName:b?.name||'', createdAt:today() }]
    dispatch({ type:'SET_SETTINGS', payload:{ wos: newWOs } })
    toast.show('Production Order created ✓','ok'); setShowWO(false); setWo(BLANK_PO)
  }

  function updateWOStatus(id, status) {
    const newWOs = wos.map(w => w.id === id ? { ...w, status, completedAt: status==='completed' ? today() : w.completedAt } : w)
    dispatch({ type:'SET_SETTINGS', payload:{ wos: newWOs } })
    if (status === 'completed') {
      const w = wos.find(x => x.id === id)
      const b = boms.find(x => x.id === w?.bomId)
      if (b?.productId) {
        const v = variants.find(x => x.productId === b.productId)
        if (v) dispatch({ type:'ADJUST_STOCK', payload:{ variantId:v.id, delta: w.qty * (b.yieldQty||1), type:'production_in', refType:'WO', refNumber:w.woNumber, note:'Production completed' }})
      }
      toast.show('Production completed! Stock updated ✓','ok')
    } else { toast.show('Status updated','ok') }
  }

  function saveJW() {
    if (!jw.supplierName) { toast.show('Supplier name required','err'); return }
    const newJWs = [...jws, { ...jw, id:uid(), jwNumber:`JW-${String(jws.length+1).padStart(4,'0')}`, createdAt:today() }]
    dispatch({ type:'SET_SETTINGS', payload:{ jws: newJWs } })
    toast.show('Job Work Order created ✓','ok'); setShowJW(false); setJw(BLANK_JW)
  }

  function addMaterial() {
    if (!matLine.name || !matLine.qty) return
    setBom(p => ({ ...p, materials:[...p.materials, {...matLine, id:uid()}] }))
    setMatLine({ name:'', qty:1, unit:'meters', costPerUnit:0 })
  }

  const bomCost = (b) => b.materials.reduce((s,m) => s + m.qty * m.costPerUnit, 0) + (b.laborCost||0) + (b.overheadCost||0)

  const stats = {
    boms:  boms.length,
    planned: wos.filter(w => w.status==='planned').length,
    inProg:  wos.filter(w => w.status==='in_progress').length,
    done:    wos.filter(w => w.status==='completed').length,
    jwActive: jws.filter(j => j.status==='sent').length,
  }

  const statusColors = { planned:'var(--t3)', in_progress:'var(--blue)', completed:'var(--green)', on_hold:'var(--amber)', cancelled:'var(--red)' }
  const statusBg     = { planned:'var(--bg4)', in_progress:'var(--bi)', completed:'var(--gd)', on_hold:'var(--ad)', cancelled:'var(--rd)' }

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:18}}>
        <div className="sh" style={{margin:0}}><h2>Manufacturing</h2><p>BOM, Production Orders, Job Work</p></div>
        <div style={{display:'flex',gap:8}}>
          <button className="btn bs btn-sm" onClick={()=>{setBom(BLANK_BOM);setEditId(null);setShowBOM(true)}}>+ BOM</button>
          <button className="btn bp btn-sm" onClick={()=>{setWo(BLANK_PO);setShowWO(true)}}>+ Production Order</button>
          <button className="btn btn-sm" style={{background:'var(--purple-dim)',color:'var(--purple)',borderColor:'transparent'}} onClick={()=>{setJw(BLANK_JW);setShowJW(true)}}>+ Job Work</button>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10,marginBottom:18}}>
        {[
          {l:'BOMs',v:stats.boms,c:'var(--amber)'},
          {l:'Planned WOs',v:stats.planned,c:'var(--t3)'},
          {l:'In Progress',v:stats.inProg,c:'var(--blue)'},
          {l:'Completed',v:stats.done,c:'var(--green)'},
          {l:'Active Job Work',v:stats.jwActive,c:'var(--purple)'},
        ].map(s=>(
          <div key={s.l} className="stat"><div className="stat-v" style={{color:s.c,fontSize:24}}>{s.v}</div><div className="stat-l">{s.l}</div></div>
        ))}
      </div>

      <div style={{display:'flex',gap:4,marginBottom:14,borderBottom:'1px solid var(--b1)'}}>
        {[['bom','📋 Bill of Materials'],['wo','🏭 Production Orders'],['jw','🧵 Job Work']].map(([id,l])=>(
          <button key={id} onClick={()=>setTab(id)} style={{padding:'7px 16px',background:'none',border:'none',borderBottom:tab===id?'2px solid var(--amber)':'2px solid transparent',color:tab===id?'var(--amber)':'var(--t3)',cursor:'pointer',fontSize:13,fontWeight:600,marginBottom:-1}}>{l}</button>
        ))}
      </div>

      {/* BOMs */}
      {tab==='bom' && (
        <div className="card" style={{padding:0}}>
          <table className="tbl">
            <thead><tr><th>BOM Name</th><th>Product</th><th>Materials</th><th>Yield</th><th>Material Cost</th><th>Total Cost/Unit</th><th>Actions</th></tr></thead>
            <tbody>
              {boms.length===0&&<tr><td colSpan={7}><div className="empty"><p>No BOMs yet. Create your first Bill of Materials.</p></div></td></tr>}
              {boms.map(b=>{
                const p=products.find(x=>x.id===b.productId)
                const cost=bomCost(b)
                return(
                  <tr key={b.id}>
                    <td style={{fontWeight:600,color:'var(--t1)'}}>{b.name}</td>
                    <td style={{color:'var(--t3)',fontSize:12}}>{p?.name||'—'}</td>
                    <td><span className="badge bb">{b.materials.length} items</span></td>
                    <td style={{fontFamily:'JetBrains Mono',fontSize:12}}>{b.yieldQty} {b.yieldUnit}</td>
                    <td style={{fontFamily:'JetBrains Mono',color:'var(--t2)'}}>₹{b.materials.reduce((s,m)=>s+m.qty*m.costPerUnit,0).toFixed(2)}</td>
                    <td style={{fontFamily:'JetBrains Mono',fontWeight:700,color:'var(--amber)'}}>₹{(cost/(b.yieldQty||1)).toFixed(2)}</td>
                    <td>
                      <div style={{display:'flex',gap:6}}>
                        <button className="btn bg btn-sm" onClick={()=>{setBom({...b});setEditId(b.id);setShowBOM(true)}}>Edit</button>
                        <button className="btn bp btn-sm" onClick={()=>{setWo({...BLANK_PO,bomId:b.id});setShowWO(true)}}>▶ Start WO</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Production Orders */}
      {tab==='wo' && (
        <div className="card" style={{padding:0}}>
          <table className="tbl">
            <thead><tr><th>WO No.</th><th>BOM</th><th>Qty</th><th>Start Date</th><th>Target Date</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {wos.length===0&&<tr><td colSpan={7}><div className="empty"><p>No production orders yet.</p></div></td></tr>}
              {wos.map(w=>(
                <tr key={w.id}>
                  <td style={{fontFamily:'JetBrains Mono',fontSize:11,color:'var(--amber)'}}>{w.woNumber}</td>
                  <td style={{fontWeight:500,color:'var(--t1)'}}>{w.bomName}</td>
                  <td style={{fontFamily:'JetBrains Mono',fontWeight:700}}>{w.qty}</td>
                  <td style={{color:'var(--t3)',fontSize:11.5}}>{w.startDate}</td>
                  <td style={{color:'var(--t3)',fontSize:11.5}}>{w.targetDate||'—'}</td>
                  <td>
                    <select value={w.status} onChange={e=>updateWOStatus(w.id,e.target.value)}
                      style={{padding:'3px 8px',borderRadius:20,fontSize:11,fontWeight:600,border:'none',background:statusBg[w.status]||'var(--bg4)',color:statusColors[w.status]||'var(--t3)',cursor:'pointer',outline:'none'}}>
                      {[['planned','Planned'],['in_progress','In Progress'],['completed','Completed'],['on_hold','On Hold'],['cancelled','Cancelled']].map(([v,l])=><option key={v} value={v}>{l}</option>)}
                    </select>
                  </td>
                  <td><button className="btn bg btn-sm" onClick={()=>setViewWO(w)}>View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Job Work */}
      {tab==='jw' && (
        <div className="card" style={{padding:0}}>
          <table className="tbl">
            <thead><tr><th>JW No.</th><th>Supplier</th><th>Work Type</th><th>Dispatch Date</th><th>Return Due</th><th>Rate/Pc</th><th>Status</th></tr></thead>
            <tbody>
              {jws.length===0&&<tr><td colSpan={7}><div className="empty"><p>No job work orders. Use for outsourced stitching, embroidery, etc.</p></div></td></tr>}
              {jws.map(j=>(
                <tr key={j.id}>
                  <td style={{fontFamily:'JetBrains Mono',fontSize:11,color:'var(--purple)'}}>{j.jwNumber}</td>
                  <td style={{fontWeight:500,color:'var(--t1)'}}>{j.supplierName}</td>
                  <td style={{color:'var(--t3)',fontSize:12}}>{j.workType||'—'}</td>
                  <td style={{color:'var(--t3)',fontSize:11.5}}>{j.dispatchDate}</td>
                  <td style={{color:j.status==='sent'&&j.returnDueDate<today()?'var(--red)':'var(--t3)',fontSize:11.5}}>{j.returnDueDate||'—'}</td>
                  <td style={{fontFamily:'JetBrains Mono'}}>₹{j.ratePerPiece}</td>
                  <td>
                    <select value={j.status} onChange={e=>{const nj=jws.map(x=>x.id===j.id?{...x,status:e.target.value}:x);dispatch({type:'SET_SETTINGS',payload:{jws:nj}})}}
                      style={{padding:'3px 8px',borderRadius:20,fontSize:11,fontWeight:600,border:'none',background:j.status==='received'?'var(--gd)':'var(--ad)',color:j.status==='received'?'var(--green)':'var(--amber)',cursor:'pointer',outline:'none'}}>
                      <option value="sent">Sent</option>
                      <option value="received">Received</option>
                      <option value="partial">Partial</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* BOM Form Modal */}
      {showBOM&&(
        <div className="overlay" onClick={e=>e.target===e.currentTarget&&setShowBOM(false)}>
          <div className="modal modal-xl">
            <div className="mhd"><div className="mt">{editId?'Edit':'New'} Bill of Materials</div><button className="xbtn" onClick={()=>setShowBOM(false)}>✕</button></div>
            <div className="modal-body" style={{maxHeight:'70vh',overflowY:'auto'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:16}}>
                <div className="fg"><label className="fl">BOM Name *</label><input className="field" value={bom.name} onChange={e=>setBom(p=>({...p,name:e.target.value}))} placeholder="e.g. Saree Standard BOM" /></div>
                <div className="fg"><label className="fl">Product</label>
                  <select className="field" value={bom.productId} onChange={e=>setBom(p=>({...p,productId:e.target.value}))}>
                    <option value="">Select Product (optional)</option>
                    {products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="fg"><label className="fl">Category</label><input className="field" value={bom.category} onChange={e=>setBom(p=>({...p,category:e.target.value}))} placeholder="Apparel, Fabric, etc." /></div>
                <div className="fg"><label className="fl">Yield Qty</label><input className="field" type="number" value={bom.yieldQty} onChange={e=>setBom(p=>({...p,yieldQty:+e.target.value}))} /></div>
                <div className="fg"><label className="fl">Yield Unit</label><input className="field" value={bom.yieldUnit} onChange={e=>setBom(p=>({...p,yieldUnit:e.target.value}))} placeholder="pcs, sets, etc." /></div>
                <div className="fg"><label className="fl">Description</label><input className="field" value={bom.description} onChange={e=>setBom(p=>({...p,description:e.target.value}))} /></div>
              </div>

              {/* Add Material */}
              <div style={{background:'var(--bg3)',borderRadius:'var(--r)',padding:14,marginBottom:14}}>
                <div style={{fontWeight:700,fontSize:12.5,marginBottom:10,color:'var(--amber)'}}>Add Raw Material</div>
                <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr auto',gap:8,alignItems:'flex-end'}}>
                  <div className="fg" style={{margin:0}}><label className="fl">Material Name</label><input className="field" value={matLine.name} onChange={e=>setMatLine(p=>({...p,name:e.target.value}))} placeholder="Fabric, Thread, Buttons…" /></div>
                  <div className="fg" style={{margin:0}}><label className="fl">Qty Per Unit</label><input className="field" type="number" step="0.1" value={matLine.qty} onChange={e=>setMatLine(p=>({...p,qty:+e.target.value}))} /></div>
                  <div className="fg" style={{margin:0}}><label className="fl">Unit</label>
                    <select className="field" value={matLine.unit} onChange={e=>setMatLine(p=>({...p,unit:e.target.value}))}>
                      {['meters','kg','grams','pcs','dozens','rolls','liters','ml'].map(u=><option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div className="fg" style={{margin:0}}><label className="fl">Cost/Unit (₹)</label><input className="field" type="number" value={matLine.costPerUnit} onChange={e=>setMatLine(p=>({...p,costPerUnit:+e.target.value}))} /></div>
                  <button className="btn bp btn-sm" style={{marginBottom:12}} onClick={addMaterial}>+ Add</button>
                </div>
              </div>

              {/* Materials List */}
              {bom.materials.length>0&&(
                <div className="card" style={{padding:0,marginBottom:14}}>
                  <table className="tbl">
                    <thead><tr><th>Material</th><th>Qty</th><th>Unit</th><th>Cost/Unit</th><th>Total Cost</th><th></th></tr></thead>
                    <tbody>
                      {bom.materials.map((m,i)=>(
                        <tr key={m.id||i}>
                          <td style={{fontWeight:500}}>{m.name}</td>
                          <td style={{fontFamily:'JetBrains Mono'}}>{m.qty}</td>
                          <td style={{color:'var(--t3)'}}>{m.unit}</td>
                          <td style={{fontFamily:'JetBrains Mono'}}>₹{m.costPerUnit}</td>
                          <td style={{fontFamily:'JetBrains Mono',fontWeight:700,color:'var(--amber)'}}>₹{(m.qty*m.costPerUnit).toFixed(2)}</td>
                          <td><button className="btn bd btn-sm" onClick={()=>setBom(p=>({...p,materials:p.materials.filter((_,j)=>j!==i)}))}>✕</button></td>
                        </tr>
                      ))}
                      <tr style={{background:'var(--bg3)'}}>
                        <td colSpan={4} style={{fontWeight:700,textAlign:'right'}}>Material Cost Total:</td>
                        <td style={{fontFamily:'JetBrains Mono',fontWeight:700,color:'var(--amber)'}}>₹{bom.materials.reduce((s,m)=>s+m.qty*m.costPerUnit,0).toFixed(2)}</td>
                        <td/>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div className="fg"><label className="fl">Labour Cost (₹ per yield)</label><input className="field" type="number" value={bom.laborCost} onChange={e=>setBom(p=>({...p,laborCost:+e.target.value}))} /></div>
                <div className="fg"><label className="fl">Overhead Cost (₹ per yield)</label><input className="field" type="number" value={bom.overheadCost} onChange={e=>setBom(p=>({...p,overheadCost:+e.target.value}))} /></div>
              </div>

              <div style={{background:'var(--ad)',border:'1px solid var(--ab)',borderRadius:'var(--r)',padding:'12px 16px',marginTop:8}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:13}}>
                  <span>Total Cost per {bom.yieldQty} {bom.yieldUnit}</span>
                  <span style={{fontFamily:'JetBrains Mono',fontWeight:700,fontSize:16,color:'var(--amber)'}}>₹{bomCost(bom).toFixed(2)}</span>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'var(--t3)',marginTop:4}}>
                  <span>Cost per unit</span>
                  <span style={{fontFamily:'JetBrains Mono',color:'var(--amber)'}}>₹{(bomCost(bom)/(bom.yieldQty||1)).toFixed(2)}</span>
                </div>
              </div>
            </div>
            <div className="mft">
              <button className="btn bg" onClick={()=>setShowBOM(false)}>Cancel</button>
              <button className="btn bp" onClick={saveBOM}>Save BOM</button>
            </div>
          </div>
        </div>
      )}

      {/* Production Order Modal */}
      {showWO&&(
        <div className="overlay" onClick={e=>e.target===e.currentTarget&&setShowWO(false)}>
          <div className="modal modal-sm">
            <div className="mhd"><div className="mt">New Production Order</div><button className="xbtn" onClick={()=>setShowWO(false)}>✕</button></div>
            <div className="modal-body">
              <div className="fg"><label className="fl">Bill of Materials *</label>
                <select className="field" value={wo.bomId} onChange={e=>setWo(p=>({...p,bomId:e.target.value}))}>
                  <option value="">Select BOM</option>
                  {boms.map(b=><option key={b.id} value={b.id}>{b.name} (Cost: ₹{(bomCost(b)/(b.yieldQty||1)).toFixed(0)}/unit)</option>)}
                </select>
              </div>
              <div className="fg"><label className="fl">Production Quantity *</label><input className="field" type="number" min="1" value={wo.qty} onChange={e=>setWo(p=>({...p,qty:+e.target.value}))} /></div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div className="fg"><label className="fl">Start Date</label><input className="field" type="date" value={wo.startDate} onChange={e=>setWo(p=>({...p,startDate:e.target.value}))} /></div>
                <div className="fg"><label className="fl">Target Date</label><input className="field" type="date" value={wo.targetDate} onChange={e=>setWo(p=>({...p,targetDate:e.target.value}))} /></div>
              </div>
              <div className="fg"><label className="fl">Notes</label><textarea className="field" style={{minHeight:60}} value={wo.notes} onChange={e=>setWo(p=>({...p,notes:e.target.value}))} /></div>
              {wo.bomId&&(()=>{const b=boms.find(x=>x.id===wo.bomId);return b&&(
                <div style={{background:'var(--ad)',border:'1px solid var(--ab)',borderRadius:'var(--r)',padding:'10px 12px',fontSize:12}}>
                  <div style={{fontWeight:700,color:'var(--amber)',marginBottom:6}}>Production Cost Estimate</div>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}><span style={{color:'var(--t3)'}}>Cost per unit</span><span style={{fontFamily:'JetBrains Mono'}}>₹{(bomCost(b)/(b.yieldQty||1)).toFixed(2)}</span></div>
                  <div style={{display:'flex',justifyContent:'space-between',fontWeight:700}}><span>Total Estimated Cost</span><span style={{fontFamily:'JetBrains Mono',color:'var(--amber)'}}>₹{(bomCost(b)/(b.yieldQty||1)*wo.qty).toFixed(2)}</span></div>
                </div>
              )})()}
            </div>
            <div className="mft">
              <button className="btn bg" onClick={()=>setShowWO(false)}>Cancel</button>
              <button className="btn bp" onClick={saveWO}>Create Production Order</button>
            </div>
          </div>
        </div>
      )}

      {/* Job Work Modal */}
      {showJW&&(
        <div className="overlay" onClick={e=>e.target===e.currentTarget&&setShowJW(false)}>
          <div className="modal modal-md">
            <div className="mhd"><div className="mt">New Job Work Order</div><button className="xbtn" onClick={()=>setShowJW(false)}>✕</button></div>
            <div className="modal-body">
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div className="fg"><label className="fl">Job Worker / Supplier *</label><input className="field" value={jw.supplierName} onChange={e=>setJw(p=>({...p,supplierName:e.target.value}))} placeholder="e.g. Ramesh Tailor" /></div>
                <div className="fg"><label className="fl">Work Type</label>
                  <select className="field" value={jw.workType} onChange={e=>setJw(p=>({...p,workType:e.target.value}))}>
                    <option value="">Select</option>
                    {['Stitching','Embroidery','Dyeing','Printing','Cutting','Finishing','Packaging','Weaving','Knitting'].map(w=><option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
                <div className="fg"><label className="fl">Challan No.</label><input className="field" style={{fontFamily:'JetBrains Mono'}} value={jw.challanNo} onChange={e=>setJw(p=>({...p,challanNo:e.target.value}))} /></div>
                <div className="fg"><label className="fl">Rate per Piece (₹)</label><input className="field" type="number" value={jw.ratePerPiece} onChange={e=>setJw(p=>({...p,ratePerPiece:+e.target.value}))} /></div>
                <div className="fg"><label className="fl">Dispatch Date</label><input className="field" type="date" value={jw.dispatchDate} onChange={e=>setJw(p=>({...p,dispatchDate:e.target.value}))} /></div>
                <div className="fg"><label className="fl">Return Due Date</label><input className="field" type="date" value={jw.returnDueDate} onChange={e=>setJw(p=>({...p,returnDueDate:e.target.value}))} /></div>
              </div>
              <div className="fg"><label className="fl">Notes / Instructions</label><textarea className="field" style={{minHeight:60}} value={jw.notes} onChange={e=>setJw(p=>({...p,notes:e.target.value}))} /></div>
            </div>
            <div className="mft">
              <button className="btn bg" onClick={()=>setShowJW(false)}>Cancel</button>
              <button className="btn" style={{background:'var(--purple-dim)',color:'var(--purple)',border:'1px solid transparent'}} onClick={saveJW}>Create Job Work</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
