import { useState, useMemo, useEffect } from 'react'
import { Icon, Modal, Confirm } from '../components/ui/index.jsx'
import { Barcode } from '../components/Barcode.jsx'
import { SKUEngine } from '../engine/SKUEngine.js'
import { uid, today } from '../utils/csv.js'

export function Products({ state, dispatch, toast }) {
  const { products, variants, settings } = state
  const [q, setQ] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCat, setFilterCat] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [editProd, setEditProd] = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [manageVariants, setManageVariants] = useState(null)

  const cats = [...new Set(products.map(p => p.category).filter(Boolean))]

  const filtered = useMemo(() => products.filter(p => {
    if (filterStatus !== 'all' && p.status !== filterStatus) return false
    if (filterCat !== 'all' && p.category !== filterCat) return false
    if (q) {
      const lq = q.toLowerCase()
      return p.name.toLowerCase().includes(lq) || (p.familyCode||'').toLowerCase().includes(lq) || (p.shortName||'').toLowerCase().includes(lq)
    }
    return true
  }), [products, q, filterStatus, filterCat])

  function saveProd(data) {
    if (editProd) {
      dispatch({ type:'UPDATE_PRODUCT', payload:{ ...editProd, ...data, updatedAt:today() } })
      toast.show('Product updated', 'ok')
    } else {
      dispatch({ type:'ADD_PRODUCT', payload:{ id:uid(), ...data, createdAt:today() } })
      toast.show('Product created', 'ok')
    }
    setShowForm(false); setEditProd(null)
  }

  return (
    <div>
      <div className="row-between mb-20">
        <div className="section-head" style={{margin:0}}>
          <h2>Products</h2>
          <p>{products.length} products · {variants.length} total variants</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditProd(null); setShowForm(true) }}>
          <Icon n="plus" s={13}/> Add Product
        </button>
      </div>

      <div className="card mb-14">
        <div className="row gap-12" style={{flexWrap:'wrap'}}>
          <div className="search-wrap" style={{flex:'1 1 180px'}}>
            <span className="s-ic"><Icon n="search" s={13}/></span>
            <input className="field" placeholder="Search name, code, short name…" value={q} onChange={e => setQ(e.target.value)}/>
          </div>
          <select className="field" style={{width:140}} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select className="field" style={{width:160}} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
            <option value="all">All Categories</option>
            {cats.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <span style={{fontSize:12,color:'var(--t3)',alignSelf:'center'}}>{filtered.length} shown</span>
        </div>
      </div>

      <div className="card" style={{padding:0}}>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Product Name</th><th>Family Code</th><th>Category</th><th>MRP</th><th>Variants</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7}>
                  <div className="empty"><Icon n="box" s={28}/><h3>No products found</h3><p>Click "Add Product" to get started.</p></div>
                </td></tr>
              )}
              {filtered.map(p => {
                const vc = variants.filter(v => v.productId === p.id).length
                return (
                  <tr key={p.id}>
                    <td><div className="td-p">{p.name}</div>{p.shortName && <div className="td-dim">{p.shortName}</div>}</td>
                    <td><span className="td-mono">{p.familyCode || '—'}</span></td>
                    <td style={{color:'var(--t2)'}}>{p.category || '—'}</td>
                    <td><span style={{fontFamily:'JetBrains Mono',fontWeight:700,color:'var(--amber)'}}>₹{p.mrp}</span></td>
                    <td><span className="badge badge-blue" style={{cursor:'pointer'}} onClick={() => setManageVariants(p)}>{vc} SKU{vc!==1?'s':''}</span></td>
                    <td><span className={`badge badge-${p.status==='active'?'active':'inactive'}`}>{p.status}</span></td>
                    <td>
                      <div className="row gap-6">
                        <button className="btn btn-ghost btn-xs" onClick={() => setManageVariants(p)}><Icon n="layers" s={12}/></button>
                        <button className="btn btn-ghost btn-xs" onClick={() => { setEditProd(p); setShowForm(true) }}><Icon n="edit" s={12}/></button>
                        <button className="btn btn-danger btn-xs" onClick={() => setConfirmDel(p.id)}><Icon n="trash" s={12}/></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ProductFormModal open={showForm} onClose={() => { setShowForm(false); setEditProd(null) }} onSave={saveProd} initial={editProd}/>
      {manageVariants && (
        <VariantsModal open={!!manageVariants} onClose={() => setManageVariants(null)}
          product={manageVariants}
          productVariants={variants.filter(v => v.productId === manageVariants.id)}
          allVariants={variants} settings={settings} dispatch={dispatch} toast={toast}/>
      )}
      <Confirm open={!!confirmDel} onClose={() => setConfirmDel(null)}
        onConfirm={() => { dispatch({ type:'DELETE_PRODUCT', payload:confirmDel }); toast.show('Product deleted','info') }}
        msg="This will permanently delete the product and ALL its variants and SKUs. Are you sure?"/>
    </div>
  )
}

// ─── Product Form Modal ──────────────────────────────────────────
function ProductFormModal({ open, onClose, onSave, initial }) {
  const blank = { name:'', shortName:'', familyCode:'', category:'', subcategory:'', brand:'Hari Vastra', mrp:'', discountedPrice:'', gst:5, description:'', status:'active' }
  const [f, setF] = useState(blank)
  const [errs, setErrs] = useState({})
  useEffect(() => { setF(initial ? {...blank,...initial} : blank); setErrs({}) }, [open])
  const set = (k,v) => { setF(p=>({...p,[k]:v})); setErrs(p=>({...p,[k]:''})) }
  function validate() {
    const e = {}
    if (!f.name.trim()) e.name = 'Product name is required'
    if (!f.mrp || isNaN(+f.mrp) || +f.mrp <= 0) e.mrp = 'Valid MRP required'
    if (f.discountedPrice && (isNaN(+f.discountedPrice) || +f.discountedPrice >= +f.mrp)) e.discountedPrice = 'Must be less than MRP'
    if (f.familyCode && !/^[A-Z0-9\-]+$/i.test(f.familyCode)) e.familyCode = 'Letters, numbers, hyphens only'
    setErrs(e); return !Object.keys(e).length
  }
  return (
    <Modal open={open} onClose={onClose} title={initial?'Edit Product':'Add New Product'} size="modal-lg"
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={() => validate() && onSave(f)}>{initial?'Save Changes':'Create Product'}</button></>}>
      <div className="fg2">
        <div className="form-group"><label className="form-label">Full Product Name <span className="req">*</span></label><input className="field" value={f.name} onChange={e=>set('name',e.target.value)} placeholder="Pearl Stone Shringar Lehenga Patka"/>{errs.name&&<div className="field-error">{errs.name}</div>}</div>
        <div className="form-group"><label className="form-label">Short Label Name</label><input className="field" value={f.shortName} onChange={e=>set('shortName',e.target.value)} placeholder="Shringar Patka"/><div className="field-hint">Shown on label (max 30 chars)</div></div>
      </div>
      <div className="fg3">
        <div className="form-group"><label className="form-label">Family / Design Code</label><input className="field mono" value={f.familyCode} onChange={e=>set('familyCode',e.target.value.toUpperCase())} placeholder="HVK034"/><div className="field-hint">Used in SKU. Letters + numbers only.</div>{errs.familyCode&&<div className="field-error">{errs.familyCode}</div>}</div>
        <div className="form-group"><label className="form-label">Category</label><input className="field" value={f.category} onChange={e=>set('category',e.target.value)} placeholder="Lehenga"/></div>
        <div className="form-group"><label className="form-label">Sub-Category</label><input className="field" value={f.subcategory} onChange={e=>set('subcategory',e.target.value)} placeholder="Patka"/></div>
      </div>
      <div className="fg4">
        <div className="form-group"><label className="form-label">Brand</label><input className="field" value={f.brand} onChange={e=>set('brand',e.target.value)}/></div>
        <div className="form-group"><label className="form-label">MRP (₹) <span className="req">*</span></label><input className="field" type="number" min="1" value={f.mrp} onChange={e=>set('mrp',e.target.value)}/>{errs.mrp&&<div className="field-error">{errs.mrp}</div>}</div>
        <div className="form-group"><label className="form-label">Sale Price (₹)</label><input className="field" type="number" value={f.discountedPrice} onChange={e=>set('discountedPrice',e.target.value)} placeholder="Optional"/>{errs.discountedPrice&&<div className="field-error">{errs.discountedPrice}</div>}</div>
        <div className="form-group"><label className="form-label">GST %</label><select className="field" value={f.gst} onChange={e=>set('gst',+e.target.value)}>{[0,5,12,18,28].map(g=><option key={g} value={g}>{g}%</option>)}</select></div>
      </div>
      <div className="fg2">
        <div className="form-group"><label className="form-label">Status</label><select className="field" value={f.status} onChange={e=>set('status',e.target.value)}><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
        <div className="form-group"><label className="form-label">Description</label><input className="field" value={f.description} onChange={e=>set('description',e.target.value)} placeholder="Optional"/></div>
      </div>
    </Modal>
  )
}

// ─── Variants Modal ──────────────────────────────────────────────
function VariantsModal({ open, onClose, product, productVariants, allVariants, settings, dispatch, toast }) {
  const [bulkInput, setBulkInput] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editVar, setEditVar] = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)

  const skuPreview = SKUEngine.generate(product, { size:'SIZE', color:'' }, settings)

  function addBulkVariants() {
    const raw = bulkInput.split(/[\n,]+/).map(s=>s.trim()).filter(Boolean)
    if (!raw.length) { toast.show('Enter at least one size','err'); return }
    const newVars = []; let added = 0
    for (const size of raw) {
      const varObj = { size, color:'' }
      const { sku, conflicted } = SKUEngine.resolveConflict(SKUEngine.generate(product, varObj, settings), [...allVariants, ...newVars])
      if (!SKUEngine.validate(sku).ok) continue
      newVars.push({ id:uid(), productId:product.id, size, color:'', style:'', sku, priceOverride:null, status:'active', createdAt:today() })
      added++
    }
    if (!added) { toast.show('No variants added','err'); return }
    dispatch({ type:'ADD_VARIANTS', payload:newVars })
    toast.show(`${added} variant${added>1?'s':''} created`, 'ok')
    setBulkInput('')
  }

  function saveVariant(data) {
    if (editVar) {
      dispatch({ type:'UPDATE_VARIANT', payload:{...editVar,...data} })
      toast.show('Variant updated','ok'); setEditVar(null)
    } else {
      const { sku } = SKUEngine.resolveConflict(data.sku || SKUEngine.generate(product, data, settings), allVariants)
      dispatch({ type:'ADD_VARIANT', payload:{ id:uid(), productId:product.id, ...data, sku, status:'active', createdAt:today() } })
      toast.show('Variant added: '+sku,'ok'); setShowAddForm(false)
    }
  }

  function regenSKU(v) {
    const { sku, conflicted } = SKUEngine.resolveConflict(SKUEngine.generate(product, v, settings), allVariants, v.id)
    dispatch({ type:'UPDATE_VARIANT', payload:{...v,sku} })
    toast.show(`SKU: ${sku}${conflicted?' (conflict resolved)':''}`, 'ok')
  }

  return (
    <Modal open={open} onClose={onClose} title={`Variants — ${product.shortName||product.name}`} size="modal-xl"
      footer={<button className="btn btn-ghost" onClick={onClose}>Close</button>}>
      <div className="grid-2 gap-16 mb-16">
        <div className="card" style={{padding:14}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>Bulk Add by Size</div>
          <textarea className="field" style={{minHeight:90,fontSize:12}} value={bulkInput} onChange={e=>setBulkInput(e.target.value)}
            placeholder="Enter sizes, one per line or comma-separated:&#10;2NO, 3NO, 4NO&#10;5NO&#10;6NO, FREE SIZE"/>
          <div className="field-hint">Each size gets a unique SKU automatically</div>
          <button className="btn btn-primary btn-sm" style={{marginTop:8}} onClick={addBulkVariants}><Icon n="zap" s={12}/> Generate Variants</button>
        </div>
        <div className="card" style={{padding:14}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>SKU Preview</div>
          <div style={{fontFamily:'JetBrains Mono',fontSize:20,fontWeight:700,color:'var(--amber)',background:'var(--bg-3)',padding:'10px 12px',borderRadius:'var(--r)',border:'1px solid var(--b2)',marginBottom:8}}>{skuPreview}</div>
          <div style={{fontSize:12,color:'var(--t3)',marginBottom:10}}>Format: <code style={{color:'var(--t2)'}}>{settings.skuFormat}</code></div>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowAddForm(true)}><Icon n="plus" s={12}/> Add Single Variant</button>
        </div>
      </div>
      <div className="card" style={{padding:0}}>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>SKU</th><th>Size</th><th>Color</th><th>Price</th><th>Status</th><th>Barcode</th><th>Actions</th></tr></thead>
            <tbody>
              {productVariants.length === 0 && <tr><td colSpan={7}><div className="empty" style={{padding:24}}><p>No variants. Use bulk add above.</p></div></td></tr>}
              {productVariants.map(v => (
                <tr key={v.id}>
                  <td><span className="td-mono">{v.sku}</span></td>
                  <td>{v.size ? <span className="badge badge-amber">{v.size}</span> : <span className="td-dim">—</span>}</td>
                  <td style={{color:'var(--t2)'}}>{v.color||'—'}</td>
                  <td><span style={{fontFamily:'JetBrains Mono',fontWeight:700,color:'var(--green)'}}>₹{v.priceOverride||(product.mrp)}</span></td>
                  <td><span className={`badge badge-${v.status==='active'?'active':'inactive'}`}>{v.status}</span></td>
                  <td>
                    <div style={{width:96,height:30,background:'white',borderRadius:3,padding:2,overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center'}}>
                      <Barcode value={v.sku} height={22} fontSize={5} width={0.85}/>
                    </div>
                  </td>
                  <td>
                    <div className="row gap-6">
                      <button className="btn btn-ghost btn-xs" title="Re-generate SKU" onClick={() => regenSKU(v)}><Icon n="refresh" s={11}/></button>
                      <button className="btn btn-ghost btn-xs" onClick={() => { setEditVar(v); setShowAddForm(false) }}><Icon n="edit" s={11}/></button>
                      <button className="btn btn-danger btn-xs" onClick={() => setConfirmDel(v.id)}><Icon n="trash" s={11}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {(showAddForm || editVar) && (
        <VariantFormModal open={true} onClose={() => { setShowAddForm(false); setEditVar(null) }}
          onSave={saveVariant} initial={editVar} product={product} settings={settings} allVariants={allVariants}/>
      )}
      <Confirm open={!!confirmDel} onClose={() => setConfirmDel(null)}
        onConfirm={() => { dispatch({ type:'DELETE_VARIANT', payload:confirmDel }); toast.show('Variant deleted','info') }}
        msg="Delete this variant and its SKU?"/>
    </Modal>
  )
}

function VariantFormModal({ open, onClose, onSave, initial, product, settings, allVariants }) {
  const blank = { size:'', color:'', style:'', priceOverride:'', status:'active', sku:'', labelNameOverride:'' }
  const [f, setF] = useState(blank)
  const [manualSku, setManualSku] = useState(false)
  const [skuErr, setSkuErr] = useState('')
  useEffect(() => { setF(initial ? {...blank,...initial,priceOverride:initial.priceOverride||''} : blank); setManualSku(!!initial); setSkuErr('') }, [open])
  function set(k,v) {
    setF(p => {
      const next = {...p,[k]:v}
      if (!manualSku && k !== 'sku') next.sku = SKUEngine.generate(product, next, settings)
      return next
    })
  }
  function save() {
    const check = SKUEngine.validate(f.sku)
    if (!check.ok) { setSkuErr(check.reason); return }
    if (allVariants.find(v => v.sku === f.sku && v.id !== initial?.id)) { setSkuErr('This SKU is already in use'); return }
    onSave(f)
  }
  return (
    <Modal open={open} onClose={onClose} title={initial?'Edit Variant':'Add Variant'} size="modal-sm"
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={save}>{initial?'Save':'Add Variant'}</button></>}>
      <div className="fg2">
        <div className="form-group"><label className="form-label">Size</label><input className="field" value={f.size} onChange={e=>set('size',e.target.value)} placeholder="2NO, XL, FREE…"/></div>
        <div className="form-group"><label className="form-label">Color</label><input className="field" value={f.color} onChange={e=>set('color',e.target.value)} placeholder="Red, Blue…"/></div>
      </div>
      <div className="fg2">
        <div className="form-group"><label className="form-label">Style / Pack</label><input className="field" value={f.style} onChange={e=>set('style',e.target.value)}/></div>
        <div className="form-group"><label className="form-label">Price Override (₹)</label><input className="field" type="number" value={f.priceOverride} onChange={e=>set('priceOverride',e.target.value)} placeholder={`Default: ₹${product.mrp}`}/></div>
      </div>
      <div className="form-group">
        <label className="form-label" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          SKU
          <label style={{display:'flex',alignItems:'center',gap:6,fontWeight:400,cursor:'pointer'}}>
            <input type="checkbox" checked={manualSku} onChange={e=>setManualSku(e.target.checked)} style={{accentColor:'var(--amber)'}}/>
            <span style={{fontSize:11}}>Manual override</span>
          </label>
        </label>
        <input className="field mono" value={f.sku} onChange={e=>{set('sku',e.target.value.toUpperCase());setSkuErr('')}} readOnly={!manualSku} style={{background:manualSku?'':'var(--bg-1)',opacity:manualSku?1:0.9}}/>
        {skuErr && <div className="field-error">{skuErr}</div>}
        <div className="field-hint">{manualSku?'Manual — ensure uniqueness yourself':'Auto-generated from product + size/color'}</div>
      </div>
    </Modal>
  )
}
