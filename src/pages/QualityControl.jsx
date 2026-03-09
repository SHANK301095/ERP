import { useState } from 'react'
import { uid, today } from '../utils/csv.js'

const DEFECT_TYPES = ['Stitching issue','Color fading','Wrong size','Fabric defect','Missing button','Zipper issue','Print/embroidery issue','Measurement error','Packaging damage','Other']

export function QualityControl({ state, dispatch, toast }) {
  const { settings, products, variants, purchaseOrders } = state
  const qcChecks = settings.qcChecks || []
  const [showForm, setShowForm] = useState(false)
  const [f, setF] = useState({ poId:'', productId:'', variantId:'', sampleSize:10, passCount:10, defects:[], inspector:'', notes:'' })
  const set=(k,v)=>setF(p=>({...p,[k]:v}))

  function toggleDefect(d) {
    setF(p=>({...p,defects:p.defects.includes(d)?p.defects.filter(x=>x!==d):[...p.defects,d]}))
  }

  function saveQC() {
    if (!f.productId||!f.sampleSize) { toast.show('Product & sample size required','err'); return }
    const failCount = f.sampleSize - f.passCount
    const passRate = (f.passCount/f.sampleSize*100).toFixed(1)
    const status = passRate>=95?'pass':passRate>=80?'conditional':'fail'
    const p = products.find(x=>x.id===f.productId)
    const v = variants.find(x=>x.id===f.variantId)
    const po = purchaseOrders.find(x=>x.id===f.poId)
    const check = { ...f, id:uid(), qcNo:'QC-'+String(qcChecks.length+1).padStart(4,'0'), date:today(),
      passRate:+passRate, failCount, status,
      productName:`${p?.shortName||p?.name||''} ${v?.size||''}`.trim(),
      poNumber:po?.poNumber||'' }
    dispatch({ type:'SET_SETTINGS', payload:{ qcChecks:[check,...qcChecks] } })
    toast.show(`QC ${status.toUpperCase()}: ${passRate}% pass rate`,'ok')
    setShowForm(false); setF({ poId:'',productId:'',variantId:'',sampleSize:10,passCount:10,defects:[],inspector:'',notes:'' })
  }

  const stats = { total:qcChecks.length, pass:qcChecks.filter(q=>q.status==='pass').length, conditional:qcChecks.filter(q=>q.status==='conditional').length, fail:qcChecks.filter(q=>q.status==='fail').length }
  const statusBg = {pass:'var(--gd)',conditional:'var(--ad)',fail:'var(--rd)'}
  const statusColor = {pass:'var(--green)',conditional:'var(--amber)',fail:'var(--red)'}

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:18}}>
        <div className="sh" style={{margin:0}}><h2>Quality Control</h2><p>Incoming inspection, defect tracking, pass/fail</p></div>
        <button className="btn bp" onClick={()=>setShowForm(true)}>+ QC Inspection</button>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:18}}>
        {[{l:'Total Checks',v:stats.total,c:'var(--blue)'},{l:'Pass',v:stats.pass,c:'var(--green)'},{l:'Conditional',v:stats.conditional,c:'var(--amber)'},{l:'Fail',v:stats.fail,c:'var(--red)'}].map(s=>(
          <div key={s.l} className="stat"><div className="stat-v" style={{color:s.c}}>{s.v}</div><div className="stat-l">{s.l}</div></div>
        ))}
      </div>

      <div className="card" style={{padding:0}}>
        <table className="tbl">
          <thead><tr><th>QC No.</th><th>Date</th><th>Product</th><th>PO</th><th>Sample</th><th>Pass</th><th>Fail</th><th>Pass Rate</th><th>Defects</th><th>Status</th></tr></thead>
          <tbody>
            {qcChecks.length===0&&<tr><td colSpan={10}><div className="empty"><p>No QC checks yet</p></div></td></tr>}
            {qcChecks.map(q=>(
              <tr key={q.id}>
                <td style={{fontFamily:'JetBrains Mono',fontSize:11,color:'var(--amber)'}}>{q.qcNo}</td>
                <td style={{fontSize:11,color:'var(--t4)'}}>{q.date}</td>
                <td style={{fontWeight:500,fontSize:12.5}}>{q.productName}</td>
                <td style={{fontFamily:'JetBrains Mono',fontSize:11,color:'var(--t3)'}}>{q.poNumber||'—'}</td>
                <td style={{fontFamily:'JetBrains Mono',textAlign:'center'}}>{q.sampleSize}</td>
                <td style={{fontFamily:'JetBrains Mono',textAlign:'center',color:'var(--green)',fontWeight:700}}>{q.passCount}</td>
                <td style={{fontFamily:'JetBrains Mono',textAlign:'center',color:q.failCount>0?'var(--red)':'var(--t4)',fontWeight:700}}>{q.failCount}</td>
                <td style={{fontFamily:'JetBrains Mono',fontWeight:700,color:q.passRate>=95?'var(--green)':q.passRate>=80?'var(--amber)':'var(--red)'}}>{q.passRate}%</td>
                <td style={{fontSize:11,color:'var(--t3)',maxWidth:120,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{q.defects?.join(', ')||'None'}</td>
                <td><span style={{padding:'2px 10px',borderRadius:20,fontSize:10,fontWeight:700,background:statusBg[q.status],color:statusColor[q.status],textTransform:'uppercase'}}>{q.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm&&(
        <div className="overlay" onClick={e=>e.target===e.currentTarget&&setShowForm(false)}>
          <div className="modal modal-md">
            <div className="mhd"><div className="mt">QC Inspection</div><button className="xbtn" onClick={()=>setShowForm(false)}>✕</button></div>
            <div className="modal-body" style={{maxHeight:'70vh',overflowY:'auto'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div className="fg"><label className="fl">Product *</label>
                  <select className="field" value={f.productId} onChange={e=>set('productId',e.target.value)}>
                    <option value="">Select Product</option>
                    {products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="fg"><label className="fl">Variant</label>
                  <select className="field" value={f.variantId} onChange={e=>set('variantId',e.target.value)}>
                    <option value="">All sizes</option>
                    {variants.filter(v=>v.productId===f.productId).map(v=><option key={v.id} value={v.id}>{v.sku} — {v.size}</option>)}
                  </select>
                </div>
                <div className="fg"><label className="fl">Linked PO</label>
                  <select className="field" value={f.poId} onChange={e=>set('poId',e.target.value)}>
                    <option value="">No PO</option>
                    {purchaseOrders.map(p=><option key={p.id} value={p.id}>{p.poNumber} — {p.supplierName}</option>)}
                  </select>
                </div>
                <div className="fg"><label className="fl">Inspector</label><input className="field" value={f.inspector} onChange={e=>set('inspector',e.target.value)}/></div>
                <div className="fg"><label className="fl">Sample Size *</label><input className="field" type="number" value={f.sampleSize} onChange={e=>set('sampleSize',+e.target.value)}/></div>
                <div className="fg"><label className="fl">Pass Count</label><input className="field" type="number" value={f.passCount} max={f.sampleSize} onChange={e=>set('passCount',Math.min(+e.target.value,f.sampleSize))}/>
                  <div style={{fontSize:11,color:'var(--t4)',marginTop:3}}>Pass rate: {f.sampleSize>0?(f.passCount/f.sampleSize*100).toFixed(0):0}%</div>
                </div>
              </div>
              <div style={{marginTop:4}}>
                <label className="fl">Defects Found</label>
                <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:6}}>
                  {DEFECT_TYPES.map(d=>(
                    <button key={d} onClick={()=>toggleDefect(d)} className={`pill ${f.defects.includes(d)?'on':''}`} style={{fontSize:11}}>{d}</button>
                  ))}
                </div>
              </div>
              <div className="fg" style={{marginTop:12}}><label className="fl">Notes</label><textarea className="field" style={{minHeight:60}} value={f.notes} onChange={e=>set('notes',e.target.value)}/></div>
              {f.sampleSize>0&&(
                <div style={{background:f.passCount/f.sampleSize>=0.95?'var(--gd)':f.passCount/f.sampleSize>=0.8?'var(--ad)':'var(--rd)',border:'1px solid',borderColor:f.passCount/f.sampleSize>=0.95?'var(--green)':f.passCount/f.sampleSize>=0.8?'var(--amber)':'var(--red)',borderRadius:'var(--r)',padding:'10px 14px',marginTop:4,fontSize:13,fontWeight:700,textAlign:'center',color:f.passCount/f.sampleSize>=0.95?'var(--green)':f.passCount/f.sampleSize>=0.8?'var(--amber)':'var(--red)'}}>
                  Result: {(f.passCount/f.sampleSize*100).toFixed(0)}% Pass Rate → {f.passCount/f.sampleSize>=0.95?'✅ PASS':f.passCount/f.sampleSize>=0.8?'⚠️ CONDITIONAL':'❌ FAIL'}
                </div>
              )}
            </div>
            <div className="mft"><button className="btn bg" onClick={()=>setShowForm(false)}>Cancel</button><button className="btn bp" onClick={saveQC}>Save QC Report</button></div>
          </div>
        </div>
      )}
    </div>
  )
}
