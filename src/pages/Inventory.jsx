import { useState, useMemo } from 'react'
import { Icon, Modal, useToast } from '../components/ui/index.jsx'
import { uid, today } from '../utils/csv.js'

export function Inventory({ state, dispatch, toast }) {
  const { inventory, variants, products, settings } = state
  const LOW = settings.lowStockThreshold || 10
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')
  const [adjustModal, setAdjustModal] = useState(null)

  const rows = useMemo(() => {
    return variants.map(v => {
      const p   = products.find(x => x.id === v.productId)
      const inv = inventory.find(i => i.variantId === v.id) || { qty: 0, reservedQty: 0 }
      return { variant: v, product: p, qty: inv.qty || 0, reserved: inv.reservedQty || 0, location: inv.location || 'Main Store' }
    }).filter(r => {
      if (filter === 'low')  return r.qty <= LOW && r.qty > 0
      if (filter === 'out')  return r.qty === 0
      if (filter === 'ok')   return r.qty > LOW
      return true
    }).filter(r => {
      if (!q) return true
      const lq = q.toLowerCase()
      return r.variant.sku.toLowerCase().includes(lq) || r.product?.name?.toLowerCase().includes(lq) || (r.variant.size||'').toLowerCase().includes(lq)
    })
  }, [inventory, variants, products, q, filter, LOW])

  const totalStock = inventory.reduce((s, i) => s + (i.qty || 0), 0)
  const lowCount   = variants.filter(v => { const i = inventory.find(x => x.variantId === v.id); return (i?.qty || 0) <= LOW && (i?.qty || 0) > 0 }).length
  const outCount   = variants.filter(v => { const i = inventory.find(x => x.variantId === v.id); return (i?.qty || 0) === 0 }).length

  return (
    <div>
      <div className="row-between mb-20">
        <div className="section-head" style={{margin:0}}><h2>Inventory</h2><p>Stock levels for all variants</p></div>
      </div>

      <div className="stats-row mb-16" style={{gridTemplateColumns:'repeat(4,1fr)'}}>
        {[
          { label:'Total Stock Units', val:totalStock.toLocaleString('en-IN'), color:'var(--blue)',   icon:'layers' },
          { label:'Active SKUs', val:variants.length, color:'var(--amber)', icon:'barcode' },
          { label:'Low Stock',   val:lowCount, color:'var(--amber)', icon:'zap' },
          { label:'Out of Stock',val:outCount, color:'var(--red)',   icon:'x' },
        ].map(s => (
          <div key={s.label} className="stat">
            <div className="stat-icon" style={{background:`${s.color}18`,color:s.color}}><Icon n={s.icon} s={17}/></div>
            <div className="stat-val" style={{color:s.color}}>{s.val}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card mb-14">
        <div className="row gap-12" style={{flexWrap:'wrap'}}>
          <div className="search-wrap" style={{flex:'1 1 200px'}}>
            <span className="s-ic"><Icon n="search" s={13}/></span>
            <input className="field" placeholder="Search SKU, product, size…" value={q} onChange={e=>setQ(e.target.value)}/>
          </div>
          {[['all','All'],['ok','In Stock'],['low','Low Stock'],['out','Out of Stock']].map(([v,l])=>(
            <button key={v} className={`btn ${filter===v?'btn-primary':'btn-ghost'} btn-sm`} onClick={()=>setFilter(v)}>{l}</button>
          ))}
        </div>
      </div>

      <div className="card" style={{padding:0}}>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>SKU</th><th>Product</th><th>Variant</th><th>Location</th><th>In Stock</th><th>Status</th><th>Adjust</th></tr></thead>
            <tbody>
              {rows.length===0&&<tr><td colSpan={7}><div className="empty"><p>No items match filter.</p></div></td></tr>}
              {rows.map(r => {
                const status = r.qty === 0 ? 'out' : r.qty <= LOW ? 'low' : 'ok'
                return (
                  <tr key={r.variant.id}>
                    <td><span className="td-mono">{r.variant.sku}</span></td>
                    <td><div className="td-p" style={{fontSize:12.5}}>{r.product?.shortName||r.product?.name}</div></td>
                    <td>
                      {r.variant.size&&<span className="badge badge-amber" style={{marginRight:4}}>{r.variant.size}</span>}
                      {r.variant.color&&<span className="badge badge-blue">{r.variant.color}</span>}
                    </td>
                    <td style={{color:'var(--t3)',fontSize:12}}>{r.location}</td>
                    <td>
                      <span style={{fontFamily:'JetBrains Mono',fontWeight:700,fontSize:15,color:status==='out'?'var(--red)':status==='low'?'var(--amber)':'var(--green)'}}>{r.qty}</span>
                    </td>
                    <td>
                      <span className={`badge ${status==='out'?'badge-red':status==='low'?'badge-amber':'badge-active'}`}>
                        {status==='out'?'Out of Stock':status==='low'?'Low Stock':'In Stock'}
                      </span>
                    </td>
                    <td><button className="btn btn-ghost btn-xs" onClick={()=>setAdjustModal(r)}><Icon n="edit" s={12}/> Adjust</button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {adjustModal && <AdjustModal row={adjustModal} onClose={()=>setAdjustModal(null)} dispatch={dispatch} toast={toast}/>}
    </div>
  )
}

function AdjustModal({ row, onClose, dispatch, toast }) {
  const [type, setType] = useState('add')
  const [qty, setQty]   = useState('')
  const [note, setNote] = useState('')

  function save() {
    const n = parseInt(qty)
    if (!n || n <= 0) { toast.show('Enter valid quantity', 'err'); return }
    const delta = type === 'add' ? n : -n
    dispatch({ type:'ADJUST_STOCK', payload:{ variantId:row.variant.id, delta, type:'adjustment', refType:'MANUAL', refId:'', refNumber:'', note:note||'Manual adjustment' } })
    toast.show(`Stock ${type==='add'?'added':'removed'}: ${n} units`, 'ok')
    onClose()
  }

  return (
    <div className="overlay no-print" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal modal-sm">
        <div className="modal-hd"><div className="modal-title">Adjust Stock — {row.variant.sku}</div><button className="close-btn" onClick={onClose}><Icon n="x" s={13}/></button></div>
        <div className="modal-body">
          <div style={{background:'var(--bg-3)',borderRadius:'var(--r)',padding:'10px 14px',marginBottom:14}}>
            <div style={{fontSize:11,color:'var(--t3)'}}>CURRENT STOCK</div>
            <div style={{fontFamily:'JetBrains Mono',fontSize:24,fontWeight:700,color:'var(--amber)'}}>{row.qty} units</div>
          </div>
          <div className="form-group">
            <label className="form-label">Adjustment Type</label>
            <div className="row gap-8">
              <button className={`btn ${type==='add'?'btn-success':'btn-ghost'} btn-sm`} style={{flex:1}} onClick={()=>setType('add')}>+ Add Stock</button>
              <button className={`btn ${type==='remove'?'btn-danger':'btn-ghost'} btn-sm`} style={{flex:1}} onClick={()=>setType('remove')}>- Remove Stock</button>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Quantity</label>
            <input className="field mono" type="number" min="1" value={qty} onChange={e=>setQty(e.target.value)} placeholder="0"/>
            {qty && <div className="field-hint">New stock will be: <strong>{Math.max(0, row.qty + (type==='add'?parseInt(qty)||0:-(parseInt(qty)||0)))}</strong></div>}
          </div>
          <div className="form-group">
            <label className="form-label">Reason / Note</label>
            <input className="field" value={note} onChange={e=>setNote(e.target.value)} placeholder="e.g. Damaged goods, Stock count correction…"/>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className={`btn ${type==='add'?'btn-primary':'btn-danger'}`} onClick={save}>{type==='add'?'Add Stock':'Remove Stock'}</button>
        </div>
      </div>
    </div>
  )
}
