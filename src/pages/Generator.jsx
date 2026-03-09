import { useState, useMemo } from 'react'
import { Icon, Modal } from '../components/ui/index.jsx'
import { LabelSheet } from '../components/LabelSheet.jsx'
import { LabelEngine } from '../engine/LabelEngine.js'
import { uid, today } from '../utils/csv.js'

export function Generator({ state, dispatch, toast, initialJob }) {
  const { products, variants, templates } = state
  const [step, setStep] = useState(1)
  const [selVariants, setSelVariants] = useState(initialJob?.items?.map(i=>i.variantId)||[])
  const [qtys, setQtys] = useState(()=>{
    const q={}
    if(initialJob?.items) initialJob.items.forEach(i=>{ q[i.variantId]=i.qty })
    return q
  })
  const [selTemplate, setSelTemplate] = useState(()=>initialJob ? templates.find(t=>t.id===initialJob.templateId)||null : null)
  const [filterProd, setFilterProd] = useState('all')
  const [jobName, setJobName] = useState(()=>initialJob ? initialJob.name+' (reprint)' : 'Print Job '+new Date().toLocaleDateString('en-IN'))

  const activeVariants = useMemo(()=>{
    const av = variants.filter(v=>v.status==='active')
    return filterProd==='all' ? av : av.filter(v=>v.productId===filterProd)
  },[variants,filterProd])

  const toggleVar = id => { setSelVariants(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]); setQtys(p=>({...p,[id]:p[id]||1})) }
  const selectAll = () => { setSelVariants(activeVariants.map(v=>v.id)); const q={...qtys}; activeVariants.forEach(v=>q[v.id]=q[v.id]||1); setQtys(q) }
  const setQty = (id,val) => setQtys(p=>({...p,[id]:Math.max(1,Math.min(999,parseInt(val)||1))}))
  const setAllQty = val => { const q={...qtys}; selVariants.forEach(id=>q[id]=Math.max(1,parseInt(val)||1)); setQtys(q) }

  const totalLabels = selVariants.reduce((s,id)=>s+(qtys[id]||1),0)
  const totalPages  = selTemplate ? Math.ceil(totalLabels/LabelEngine.calcGrid(selTemplate).perPage) : 0
  const printItems  = selVariants.map(id=>({ variantId:id, qty:qtys[id]||1 }))
  const stepState   = n => n<step?'done':n===step?'current':'future'

  function handlePrint() {
    const job = { id:uid(), name:jobName, date:today(), templateId:selTemplate.id, templateName:selTemplate.name, items:printItems, totalSkus:selVariants.length, totalLabels, totalPages }
    dispatch({ type:'ADD_PRINT_JOB', payload:job })
    window.print()
    toast.show(`Sent to printer — ${totalLabels} labels, ${totalPages} page${totalPages!==1?'s':''}`, 'ok')
  }

  return (
    <div>
      <div className="section-head mb-16 no-print">
        <h2>Label Generator</h2>
        <p>Select variants → choose template → preview and print</p>
      </div>

      {/* Step indicator */}
      <div className="wizard-steps no-print">
        {[['Select Variants','Select SKUs to print'],['Choose Template','Pick a label layout'],['Preview & Print','Review then export']].map(([label,sub],i)=>(
          <div key={i}>
            <div className={`step-item ${stepState(i+1)}`} onClick={()=>i+1<step&&setStep(i+1)}>
              <div className="step-num">{stepState(i+1)==='done'?<Icon n="check" s={11}/>:i+1}</div>
              <div>
                <div className="step-label">{label}</div>
                <div style={{fontSize:10.5,opacity:0.7,marginTop:1}}>{sub}</div>
              </div>
              {i===0&&selVariants.length>0&&<span className="badge badge-amber" style={{marginLeft:8}}>{selVariants.length}</span>}
            </div>
            {i<2&&<span className="step-arrow">›</span>}
          </div>
        ))}
        <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:10}}>
          <div style={{textAlign:'right'}}>
            <div style={{fontFamily:'JetBrains Mono',fontSize:22,fontWeight:700,color:'var(--amber)',lineHeight:1}}>{totalLabels}</div>
            <div style={{fontSize:10.5,color:'var(--t3)'}}>labels</div>
          </div>
          {totalPages>0&&<div style={{textAlign:'right'}}>
            <div style={{fontFamily:'JetBrains Mono',fontSize:22,fontWeight:700,color:'var(--blue)',lineHeight:1}}>{totalPages}</div>
            <div style={{fontSize:10.5,color:'var(--t3)'}}>pages</div>
          </div>}
        </div>
      </div>

      {/* STEP 1 */}
      {step===1&&(
        <div>
          <div className="row gap-12 mb-14 no-print" style={{flexWrap:'wrap'}}>
            <select className="field" style={{width:220}} value={filterProd} onChange={e=>setFilterProd(e.target.value)}>
              <option value="all">All Products</option>
              {products.map(p=><option key={p.id} value={p.id}>{p.shortName||p.name}</option>)}
            </select>
            <button className="btn btn-secondary btn-sm" onClick={selectAll}>Select All</button>
            <button className="btn btn-ghost btn-sm" onClick={()=>setSelVariants([])}>Clear</button>
            <div className="row gap-8" style={{marginLeft:'auto'}}>
              <span style={{fontSize:12,color:'var(--t3)'}}>Set all qty:</span>
              <input type="number" className="qty-field" min={1} max={999} defaultValue={1} onBlur={e=>setAllQty(e.target.value)} style={{width:64}}/>
            </div>
          </div>
          <div className="card" style={{padding:0}}>
            <div className="table-wrap">
              <table className="tbl">
                <thead><tr>
                  <th style={{width:36}}>
                    <input type="checkbox" style={{accentColor:'var(--amber)'}}
                      checked={selVariants.length===activeVariants.length&&activeVariants.length>0}
                      onChange={e=>e.target.checked?selectAll():setSelVariants([])}/>
                  </th>
                  <th>Product</th><th>SKU</th><th>Variant</th><th>Price</th><th>Qty to Print</th>
                </tr></thead>
                <tbody>
                  {activeVariants.length===0&&<tr><td colSpan={6}><div className="empty" style={{padding:30}}><p>No active variants. Add products and variants first.</p></div></td></tr>}
                  {activeVariants.map(v=>{
                    const p=products.find(x=>x.id===v.productId)
                    const sel=selVariants.includes(v.id)
                    return (
                      <tr key={v.id} style={{cursor:'pointer',background:sel?'var(--amber-dim)':''}} onClick={()=>toggleVar(v.id)}>
                        <td onClick={e=>e.stopPropagation()}><input type="checkbox" style={{accentColor:'var(--amber)'}} checked={sel} onChange={()=>toggleVar(v.id)}/></td>
                        <td><div className="td-p" style={{fontSize:12.5}}>{p?.shortName||p?.name}</div><div className="td-dim">{p?.brand}</div></td>
                        <td><span className="td-mono">{v.sku}</span></td>
                        <td>{v.size&&<span className="badge badge-amber" style={{marginRight:4}}>{v.size}</span>}{v.color&&<span className="badge badge-blue">{v.color}</span>}</td>
                        <td><span style={{fontFamily:'JetBrains Mono',fontWeight:700,color:'var(--green)'}}>₹{v.priceOverride||p?.mrp}</span></td>
                        <td onClick={e=>e.stopPropagation()}>
                          <input type="number" className="qty-field" min={1} max={999} value={qtys[v.id]||1} onChange={e=>setQty(v.id,e.target.value)} style={{opacity:sel?1:0.3}}/>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <div className="row-between mt-16 no-print">
            <span style={{fontSize:12.5,color:'var(--t3)'}}>{selVariants.length} selected · {totalLabels} labels</span>
            <button className="btn btn-primary" disabled={selVariants.length===0} onClick={()=>setStep(2)}>Next: Choose Template →</button>
          </div>
        </div>
      )}

      {/* STEP 2 */}
      {step===2&&(
        <div>
          {templates.length===0 ? <div className="card"><div className="empty"><h3>No templates found</h3><p>Create a template first.</p></div></div> : (
            <div className="grid-3 gap-16">
              {templates.map(t=>{
                const grid=LabelEngine.calcGrid(t)
                const pages=Math.ceil(totalLabels/grid.perPage)
                const sel=selTemplate?.id===t.id
                return (
                  <div key={t.id} className="card" style={{cursor:'pointer',border:`1px solid ${sel?'var(--amber)':'var(--b1)'}`,background:sel?'var(--amber-dim)':'var(--bg-2)',transition:'all .15s'}} onClick={()=>setSelTemplate(t)}>
                    {sel&&<div style={{display:'flex',justifyContent:'flex-end',marginBottom:4}}><span className="badge badge-amber"><Icon n="check" s={10}/> Selected</span></div>}
                    <div className="tmpl-mini-preview">
                      <div className="mini-lbl" style={{width:Math.min(90,t.labelWidthMm*1.3),height:Math.min(62,t.labelHeightMm*1.3),fontSize:'3.5px'}}>
                        {t.showBrand&&<div style={{fontWeight:800,borderBottom:'0.3px solid #888',paddingBottom:1,marginBottom:1}}>BRAND</div>}
                        {t.showProductName&&<div style={{fontWeight:700,marginBottom:1}}>Product Name</div>}
                        {t.showBarcode&&<div style={{flex:1,background:'repeating-linear-gradient(90deg,#222 0,#222 0.7px,white 0.7px,white 1.8px)',margin:'1px 0',minHeight:8}}/>}
                        <div style={{display:'flex',justifyContent:'space-between',borderTop:'0.3px solid #888',paddingTop:1,marginTop:'auto'}}>
                          {t.showSize&&<span>SIZE</span>}{t.showMrp&&<span style={{fontWeight:700}}>₹MRP</span>}
                        </div>
                      </div>
                    </div>
                    <div style={{fontWeight:700,fontSize:13,marginBottom:4,color:'var(--t1)'}}>{t.name}</div>
                    <div style={{fontSize:11.5,color:'var(--t3)',marginBottom:8}}>{t.labelWidthMm}×{t.labelHeightMm}mm · {grid.cols}×{grid.rows}/page</div>
                    <div style={{fontFamily:'JetBrains Mono',fontSize:12.5,color:'var(--amber)'}}>{pages} page{pages!==1?'s':''} for {totalLabels} labels</div>
                  </div>
                )
              })}
            </div>
          )}
          <div className="row gap-8 mt-16 no-print">
            <button className="btn btn-ghost" onClick={()=>setStep(1)}>← Back</button>
            <button className="btn btn-primary" disabled={!selTemplate} onClick={()=>setStep(3)}>Next: Preview & Print →</button>
          </div>
        </div>
      )}

      {/* STEP 3 */}
      {step===3&&selTemplate&&(
        <div>
          <div className="card mb-14 no-print">
            <div className="row-between" style={{flexWrap:'wrap',gap:12}}>
              <div>
                <div style={{fontSize:11.5,color:'var(--t3)',marginBottom:4}}>Print Job Name</div>
                <input className="field" style={{width:280}} value={jobName} onChange={e=>setJobName(e.target.value)}/>
              </div>
              <div className="row gap-8">
                <span className="badge badge-amber">{totalLabels} labels</span>
                <span className="badge badge-blue">{totalPages} page{totalPages!==1?'s':''}</span>
                <span style={{fontSize:12,color:'var(--t2)'}}>{selTemplate.name}</span>
              </div>
              <div className="row gap-8">
                <button className="btn btn-ghost" onClick={()=>setStep(2)}>← Template</button>
                <button className="btn btn-primary btn-lg" onClick={handlePrint}><Icon n="print" s={15}/> Print Labels</button>
              </div>
            </div>
          </div>
          <div className="info-box mb-14 no-print">
            <Icon n="info" s={15}/>
            <div><strong>Print Tips:</strong> In the print dialog — Paper: <strong>A4</strong>, Margins: <strong>None</strong>, disable <strong>Headers and Footers</strong>, enable <strong>Background Graphics</strong>. Save as PDF to download.</div>
          </div>
          <div className="sheet-bg">
            <LabelSheet items={printItems} template={selTemplate} products={products} variants={variants}/>
          </div>
        </div>
      )}
    </div>
  )
}
