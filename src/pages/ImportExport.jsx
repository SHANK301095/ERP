import { useState, useRef } from 'react'
import { Icon } from '../components/ui/index.jsx'
import { SKUEngine } from '../engine/SKUEngine.js'
import { parseCSV, downloadCSV, uid, today } from '../utils/csv.js'

export function ImportExport({ state, dispatch, toast }) {
  const { products, variants, settings } = state
  const [tab, setTab] = useState('import')
  const [importType, setImportType] = useState('products')
  const [validationResult, setValidationResult] = useState(null)
  const fileRef = useRef(null)

  function validateProducts(rows) {
    const errors=[], warnings=[], valid=[]
    rows.forEach((row,i)=>{
      const rowNum=i+2, rowErrs=[]
      if (!row.name?.trim()) rowErrs.push('name is required')
      if (!row.mrp||isNaN(+row.mrp)||+row.mrp<=0) rowErrs.push('mrp must be a positive number')
      if (row.family_code&&!/^[A-Z0-9\-]+$/i.test(row.family_code)) rowErrs.push('family_code: letters/numbers/hyphens only')
      if (row.status&&!['active','inactive'].includes(row.status)) rowErrs.push('status must be active or inactive')
      if (rowErrs.length) errors.push({row:rowNum,errors:rowErrs})
      else { if (!row.category) warnings.push({row:rowNum,msg:'No category'}); valid.push(row) }
    })
    return { errors, warnings, valid, total:rows.length }
  }

  function validateVariants(rows) {
    const errors=[], warnings=[], valid=[]
    rows.forEach((row,i)=>{
      const rowNum=i+2, rowErrs=[]
      const prod = products.find(p=>p.id===row.product_id || (row.family_code && p.familyCode?.toLowerCase()===row.family_code.toLowerCase()))
      if (!prod) rowErrs.push(`product not found: ${row.product_id||row.family_code||'(empty)'}`)
      if (row.sku_override) {
        const check=SKUEngine.validate(row.sku_override.toUpperCase())
        if (!check.ok) rowErrs.push('sku_override: '+check.reason)
      }
      if (rowErrs.length) errors.push({row:rowNum,errors:rowErrs})
      else valid.push({...row,_product:prod})
    })
    return { errors, warnings, valid, total:rows.length }
  }

  function handleFile(e) {
    const file=e.target.files[0]; if (!file) return
    const reader=new FileReader()
    reader.onload=ev=>{
      const rows=parseCSV(ev.target.result)
      if (!rows.length) { toast.show('Empty or invalid CSV','err'); return }
      const result=importType==='products'?validateProducts(rows):validateVariants(rows)
      setValidationResult(result)
    }
    reader.readAsText(file); e.target.value=''
  }

  function runImport() {
    if (!validationResult?.valid.length) return
    if (importType==='products') {
      const newProds=validationResult.valid.map(row=>({
        id:uid(), name:row.name.trim(), shortName:row.short_name?.trim()||'',
        familyCode:row.family_code?.trim().toUpperCase()||'', category:row.category?.trim()||'',
        subcategory:row.subcategory?.trim()||'', brand:row.brand?.trim()||settings.brandName,
        mrp:parseFloat(row.mrp), discountedPrice:row.discounted_price?parseFloat(row.discounted_price):null,
        gst:parseInt(row.gst)||5, description:row.description?.trim()||'',
        status:row.status||'active', createdAt:today()
      }))
      newProds.forEach(p=>dispatch({type:'ADD_PRODUCT',payload:p}))
      toast.show(`Imported ${newProds.length} products`,'ok')
    } else {
      const newVars=[]; 
      validationResult.valid.forEach(row=>{
        const prod=row._product
        const varObj={size:row.size?.trim()||'',color:row.color?.trim()||'',style:row.style?.trim()||''}
        const baseSku=row.sku_override?.toUpperCase()||SKUEngine.generate(prod,varObj,settings)
        const {sku}=SKUEngine.resolveConflict(baseSku,[...variants,...newVars])
        newVars.push({id:uid(),productId:prod.id,...varObj,sku,priceOverride:row.price?parseFloat(row.price):null,status:'active',createdAt:today()})
      })
      dispatch({type:'ADD_VARIANTS',payload:newVars})
      toast.show(`Imported ${newVars.length} variants`,'ok')
    }
    setValidationResult(null)
  }

  function dlTemplate(type) {
    if (type==='products') downloadCSV('import_products_template.csv',[
      ['name','short_name','family_code','category','subcategory','brand','mrp','discounted_price','gst','status'],
      ['Pearl Stone Lehenga Patka','Shringar Patka','HVK034','Lehenga','Patka','Hari Vastra','349','','5','active'],
    ])
    else downloadCSV('import_variants_template.csv',[
      ['product_id','family_code','size','color','style','price','sku_override'],
      ['','HVK034','2NO','','','',''],
      ['','HVK034','3NO','','','',''],
    ])
    toast.show('Template downloaded','info')
  }

  return (
    <div>
      <div className="section-head mb-20"><h2>Import / Export</h2><p>Bulk manage your product catalog via CSV</p></div>
      <div className="tabs">
        <button className={`tab ${tab==='import'?'active':''}`} onClick={()=>{setTab('import');setValidationResult(null)}}><Icon n="upload" s={12}/> Import</button>
        <button className={`tab ${tab==='export'?'active':''}`} onClick={()=>setTab('export')}><Icon n="download" s={12}/> Export</button>
      </div>

      {tab==='import'&&(
        <div className="grid-2 gap-20">
          <div>
            <div className="card mb-14">
              <div className="card-title mb-14">Import Configuration</div>
              <div className="form-group">
                <label className="form-label">What to import</label>
                <select className="field" value={importType} onChange={e=>{setImportType(e.target.value);setValidationResult(null)}}>
                  <option value="products">Products (master records)</option>
                  <option value="variants">Variants / SKUs</option>
                </select>
              </div>
              {!validationResult ? (
                <div>
                  <div className="import-zone" onClick={()=>fileRef.current?.click()}>
                    <Icon n="upload" s={28}/>
                    <div style={{marginTop:10,fontSize:13,fontWeight:600,color:'var(--t1)'}}>Click to upload CSV file</div>
                    <div style={{fontSize:11.5,color:'var(--t3)',marginTop:4}}>UTF-8 encoded, first row = column headers</div>
                    <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} style={{display:'none'}}/>
                  </div>
                  <button className="btn btn-ghost btn-sm" style={{marginTop:10}} onClick={()=>dlTemplate(importType)}>
                    <Icon n="download" s={12}/> Download {importType==='products'?'Products':'Variants'} Template
                  </button>
                </div>
              ) : (
                <div>
                  {validationResult.errors.length===0 ? (
                    <div className="ok-box mb-12"><Icon n="check" s={14}/><div><strong>Validation passed</strong> — {validationResult.valid.length} rows ready{validationResult.warnings.length>0?`, ${validationResult.warnings.length} warnings`:''}</div></div>
                  ) : (
                    <div className="mb-12">
                      <div style={{fontSize:12.5,fontWeight:600,color:'var(--red)',marginBottom:6}}>{validationResult.errors.length} rows have errors:</div>
                      <div style={{maxHeight:140,overflowY:'auto'}}>
                        {validationResult.errors.map((e,i)=><div key={i} className="error-row">Row {e.row}: {e.errors.join(', ')}</div>)}
                      </div>
                      {validationResult.valid.length>0&&<div style={{fontSize:12,color:'var(--t3)',marginTop:6}}>{validationResult.valid.length} valid rows can still be imported</div>}
                    </div>
                  )}
                  <div className="row gap-8">
                    <button className="btn btn-primary" disabled={!validationResult.valid.length} onClick={runImport}>
                      <Icon n="zap" s={13}/> Import {validationResult.valid.length} Rows
                    </button>
                    <button className="btn btn-ghost" onClick={()=>setValidationResult(null)}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="card">
            <div className="card-title mb-12">Column Reference</div>
            {importType==='products' ? (
              [['name','Required','Full product name'],['short_name','Optional','Label display name'],['family_code','Recommended','Design code (e.g. HVK034)'],['category','Optional','Product category'],['brand','Optional','Brand name'],['mrp','Required','Price in rupees'],['discounted_price','Optional','Sale price (< mrp)'],['gst','Optional','0, 5, 12, 18, or 28'],['status','Optional','active or inactive']].map(([col,req,desc])=>(
                <div key={col} style={{display:'flex',gap:8,padding:'5px 0',borderBottom:'1px solid var(--b1)',alignItems:'flex-start'}}>
                  <code style={{fontFamily:'JetBrains Mono',fontSize:11,color:'var(--amber)',width:110,flexShrink:0}}>{col}</code>
                  <span className={`badge ${req==='Required'?'badge-amber':'badge-inactive'}`} style={{fontSize:10,flexShrink:0}}>{req}</span>
                  <span style={{fontSize:11.5,color:'var(--t3)'}}>{desc}</span>
                </div>
              ))
            ) : (
              [['product_id','Required*','ID from products export'],['family_code','Required*','Family code if no product_id'],['size','Optional','Size code (2NO, XL…)'],['color','Optional','Color name'],['style','Optional','Style / fabric'],['price','Optional','Override price'],['sku_override','Optional','Manual SKU (auto if empty)']].map(([col,req,desc])=>(
                <div key={col} style={{display:'flex',gap:8,padding:'5px 0',borderBottom:'1px solid var(--b1)',alignItems:'flex-start'}}>
                  <code style={{fontFamily:'JetBrains Mono',fontSize:11,color:'var(--amber)',width:110,flexShrink:0}}>{col}</code>
                  <span className={`badge ${req.includes('Required')?'badge-amber':'badge-inactive'}`} style={{fontSize:10,flexShrink:0}}>{req}</span>
                  <span style={{fontSize:11.5,color:'var(--t3)'}}>{desc}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {tab==='export'&&(
        <div>
          <div className="grid-2 gap-14 mb-14">
            {[
              { title:'Export Products', sub:`${products.length} products`, icon:'box', color:'var(--amber)',
                fn:()=>{ downloadCSV('products_'+today()+'.csv',[['id','name','short_name','family_code','category','subcategory','brand','mrp','discounted_price','gst','status'],...products.map(p=>[p.id,p.name,p.shortName||'',p.familyCode||'',p.category||'',p.subcategory||'',p.brand||'',p.mrp,p.discountedPrice||'',p.gst,p.status])]); toast.show('Products exported','ok') }},
              { title:'Export Variants / SKUs', sub:`${variants.length} SKUs`, icon:'barcode', color:'var(--blue)',
                fn:()=>{ downloadCSV('variants_'+today()+'.csv',[['id','product_id','product_name','sku','size','color','style','price','status'],...variants.map(v=>{const p=products.find(x=>x.id===v.productId);return [v.id,v.productId,p?.name||'',v.sku,v.size||'',v.color||'',v.style||'',v.priceOverride||p?.mrp||'',v.status]})]); toast.show('Variants exported','ok') }},
            ].map(e=>(
              <div key={e.title} className="card">
                <div style={{display:'flex',gap:12,alignItems:'center',marginBottom:14}}>
                  <div style={{width:40,height:40,borderRadius:'var(--r)',background:`${e.color}20`,display:'flex',alignItems:'center',justifyContent:'center',color:e.color}}><Icon n={e.icon} s={20}/></div>
                  <div><div className="card-title">{e.title}</div><div className="card-sub">{e.sub}</div></div>
                </div>
                <button className="btn btn-secondary" onClick={e.fn}><Icon n="download" s={13}/> Download CSV</button>
              </div>
            ))}
          </div>
          <div className="card">
            <div className="card-title mb-8">Complete Label Data Export</div>
            <div style={{color:'var(--t2)',fontSize:13,marginBottom:14}}>All products + variants in one file — Canva bulk import ready, Google Sheets ready.</div>
            <button className="btn btn-secondary" onClick={()=>{ downloadCSV('label_data_'+today()+'.csv',[['sku','product_name','short_name','brand','category','family_code','size','color','mrp','sale_price'],...variants.map(v=>{const p=products.find(x=>x.id===v.productId);return [v.sku,p?.name||'',p?.shortName||'',p?.brand||'',p?.category||'',p?.familyCode||'',v.size||'',v.color||'',p?.mrp||'',p?.discountedPrice||'']})]); toast.show('Complete data exported','ok') }}>
              <Icon n="download" s={13}/> Export Complete Label Data
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
