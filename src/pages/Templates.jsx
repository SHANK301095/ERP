import { useState, useMemo, useEffect } from 'react'
import { Icon, Modal, Confirm } from '../components/ui/index.jsx'
import { LabelEngine } from '../engine/LabelEngine.js'
import { uid, today } from '../utils/csv.js'

export function Templates({ state, dispatch, toast }) {
  const { templates } = state
  const [showForm, setShowForm] = useState(false)
  const [editTmpl, setEditTmpl] = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)

  function saveTmpl(data) {
    const grid = LabelEngine.calcGrid(data)
    const payload = { ...data, cols:grid.cols, rows:grid.rows }
    if (editTmpl) {
      dispatch({ type:'UPDATE_TEMPLATE', payload:{ ...editTmpl, ...payload } })
      toast.show('Template updated','ok')
    } else {
      dispatch({ type:'ADD_TEMPLATE', payload:{ id:uid(), ...payload, createdAt:today() } })
      toast.show('Template created','ok')
    }
    setShowForm(false); setEditTmpl(null)
  }

  function duplicate(t) {
    const grid = LabelEngine.calcGrid(t)
    dispatch({ type:'ADD_TEMPLATE', payload:{ ...t, id:uid(), name:t.name+' (Copy)', isDefault:false, createdAt:today(), cols:grid.cols, rows:grid.rows } })
    toast.show('Template duplicated','ok')
  }

  return (
    <div>
      <div className="row-between mb-20">
        <div className="section-head" style={{margin:0}}>
          <h2>Label Templates</h2>
          <p>Define label layouts for different printing needs</p>
        </div>
        <button className="btn btn-primary" onClick={()=>{ setEditTmpl(null); setShowForm(true) }}>
          <Icon n="plus" s={13}/> New Template
        </button>
      </div>

      {templates.length===0 ? (
        <div className="card"><div className="empty"><Icon n="layout" s={28}/><h3>No templates</h3><p>Create your first label template.</p></div></div>
      ) : (
        <div className="grid-3 gap-16">
          {templates.map(t => {
            const grid = LabelEngine.calcGrid(t)
            const fields = [['Brand',t.showBrand],['Name',t.showProductName],['Barcode',t.showBarcode],['Size',t.showSize],['Price',t.showMrp],['Border',t.showBorder]]
            return (
              <div key={t.id} className="card">
                {/* Mini preview */}
                <div className="tmpl-mini-preview">
                  <div className="mini-lbl" style={{width:Math.min(100,t.labelWidthMm*1.5),height:Math.min(70,t.labelHeightMm*1.5),fontSize:'3.5px'}}>
                    {t.showBrand && <div style={{fontWeight:800,borderBottom:'0.3px solid #888',paddingBottom:1,marginBottom:1}}>BRAND</div>}
                    {t.showProductName && <div style={{fontWeight:700,marginBottom:1}}>Product Name</div>}
                    {t.showBarcode && <div style={{flex:1,background:'repeating-linear-gradient(90deg,#222 0,#222 0.7px,white 0.7px,white 1.8px)',margin:'1px 0',minHeight:8}}/>}
                    <div style={{display:'flex',justifyContent:'space-between',borderTop:'0.3px solid #888',paddingTop:1,marginTop:'auto'}}>
                      {t.showSize&&<span>SIZE</span>}{t.showMrp&&<span style={{fontWeight:700}}>₹MRP</span>}
                    </div>
                  </div>
                </div>
                <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:6}}>
                  <div className="card-title" style={{fontSize:13.5}}>{t.name}</div>
                  {t.isDefault&&<span className="badge badge-amber">Default</span>}
                </div>
                <div className="card-sub mb-12">{t.labelWidthMm}mm × {t.labelHeightMm}mm · {grid.cols}×{grid.rows} = {grid.perPage}/page</div>
                <div className="pill-toggle mb-14">
                  {fields.map(([lbl,on])=><span key={lbl} className={`pill ${on?'on':''}`} style={{fontSize:11,cursor:'default'}}>{lbl}</span>)}
                </div>
                <div className="row gap-8">
                  <button className="btn btn-secondary btn-sm" style={{flex:1}} onClick={()=>{ setEditTmpl(t); setShowForm(true) }}><Icon n="edit" s={12}/> Edit</button>
                  <button className="btn btn-ghost btn-sm" onClick={()=>duplicate(t)}><Icon n="copy" s={12}/></button>
                  <button className="btn btn-danger btn-sm" onClick={()=>setConfirmDel(t.id)}><Icon n="trash" s={12}/></button>
                </div>
              </div>
            )
          })}
        </div>
      )}
      <TemplateFormModal open={showForm} onClose={()=>{ setShowForm(false); setEditTmpl(null) }} onSave={saveTmpl} initial={editTmpl}/>
      <Confirm open={!!confirmDel} onClose={()=>setConfirmDel(null)} onConfirm={()=>{ dispatch({type:'DELETE_TEMPLATE',payload:confirmDel}); toast.show('Template deleted','info') }} msg="Delete this template?"/>
    </div>
  )
}

function TemplateFormModal({ open, onClose, onSave, initial }) {
  const blank = {
    name:'',description:'',pageWidthMm:210,pageHeightMm:297,
    marginTopMm:10,marginRightMm:8,marginBottomMm:10,marginLeftMm:10,
    labelWidthMm:62,labelHeightMm:38,gapXMm:3,gapYMm:3,
    showBrand:true,showProductName:true,showBarcode:true,showSkuText:true,
    showSize:true,showColor:false,showMrp:true,showDiscountedPrice:false,
    showCategory:false,showBorder:true,
    brandFontSizePt:7,nameFontSizePt:8,priceFontSizePt:11,
    sizeFontSizePt:8,skuFontSizePt:6,barcodeHeightMm:14,isDefault:false
  }
  const [f, setF] = useState(blank)
  const grid = useMemo(()=>LabelEngine.calcGrid(f),[f.pageWidthMm,f.pageHeightMm,f.marginTopMm,f.marginRightMm,f.marginBottomMm,f.marginLeftMm,f.labelWidthMm,f.labelHeightMm,f.gapXMm,f.gapYMm])
  useEffect(()=>setF(initial?{...blank,...initial}:blank),[open])
  const n=(k,v)=>setF(p=>({...p,[k]:Number(v)}))
  const s=(k,v)=>setF(p=>({...p,[k]:v}))
  const tgl=(k)=>setF(p=>({...p,[k]:!p[k]}))
  const fieldToggles=[['showBrand','Brand'],['showProductName','Product Name'],['showBarcode','Barcode'],['showSkuText','SKU Text'],['showSize','Size'],['showColor','Color'],['showMrp','MRP Price'],['showDiscountedPrice','Sale Price'],['showCategory','Category'],['showBorder','Border']]
  return (
    <Modal open={open} onClose={onClose} title={initial?'Edit Template':'Create Label Template'} size="modal-lg"
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={()=>onSave(f)}>{initial?'Save Changes':'Create Template'}</button></>}>
      <div className="fg2">
        <div className="form-group"><label className="form-label">Template Name</label><input className="field" value={f.name} onChange={e=>s('name',e.target.value)}/></div>
        <div className="form-group"><label className="form-label">Description</label><input className="field" value={f.description} onChange={e=>s('description',e.target.value)} placeholder="e.g. 62×38mm standard retail"/></div>
      </div>
      <div className="divider"/>
      <div style={{fontWeight:700,fontSize:13,color:'var(--t2)',marginBottom:12}}>Label Size & Grid</div>
      <div className="fg4">
        {[['labelWidthMm','Width (mm)'],['labelHeightMm','Height (mm)'],['gapXMm','Gap X (mm)'],['gapYMm','Gap Y (mm)']].map(([k,lbl])=>(
          <div key={k} className="form-group"><label className="form-label">{lbl}</label><input className="field mono" type="number" value={f[k]} onChange={e=>n(k,e.target.value)} min="0"/></div>
        ))}
      </div>
      <div className="warn-box mb-16"><Icon n="info" s={14}/><span>Grid: <strong>{grid.cols}</strong> cols × <strong>{grid.rows}</strong> rows = <strong>{grid.perPage}</strong> labels per A4</span></div>
      <div style={{fontWeight:700,fontSize:13,color:'var(--t2)',marginBottom:12}}>Page Margins (mm)</div>
      <div className="fg4">
        {[['marginTopMm','Top'],['marginRightMm','Right'],['marginBottomMm','Bottom'],['marginLeftMm','Left']].map(([k,lbl])=>(
          <div key={k} className="form-group"><label className="form-label">{lbl}</label><input className="field mono" type="number" value={f[k]} onChange={e=>n(k,e.target.value)} min="0"/></div>
        ))}
      </div>
      <div style={{fontWeight:700,fontSize:13,color:'var(--t2)',marginBottom:12}}>Fields to Display</div>
      <div className="pill-toggle mb-16">{fieldToggles.map(([k,lbl])=><span key={k} className={`pill ${f[k]?'on':''}`} onClick={()=>tgl(k)}>{lbl}</span>)}</div>
      <div style={{fontWeight:700,fontSize:13,color:'var(--t2)',marginBottom:12}}>Font Sizes (pt)</div>
      <div className="fg5">
        {[['brandFontSizePt','Brand'],['nameFontSizePt','Name'],['priceFontSizePt','Price'],['sizeFontSizePt','Size'],['skuFontSizePt','SKU']].map(([k,lbl])=>(
          <div key={k} className="form-group"><label className="form-label">{lbl}</label><input className="field mono" type="number" value={f[k]} onChange={e=>n(k,e.target.value)} min="4" max="24"/></div>
        ))}
      </div>
      <div className="form-group"><label className="form-label">Barcode Height (mm)</label><input className="field mono" type="number" style={{width:110}} value={f.barcodeHeightMm} onChange={e=>n('barcodeHeightMm',e.target.value)} min="6" max="50"/></div>
    </Modal>
  )
}
