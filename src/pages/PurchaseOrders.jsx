import { useState, useMemo, useEffect } from 'react'
import { Icon, Modal, Confirm } from '../components/ui/index.jsx'
import { uid, today } from '../utils/csv.js'
import { nextInvoiceNo, fmtINR, calcGST } from '../utils/gst.js'

export function PurchaseOrders({ state, dispatch, toast }) {
  const { purchaseOrders, suppliers, products, variants, settings } = state
  const [showForm, setShowForm] = useState(false)
  const [viewPO, setViewPO] = useState(null)
  const [confirmReceive, setConfirmReceive] = useState(null)
  const [q, setQ] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  const filtered = useMemo(()=>purchaseOrders.filter(po=>{
    if (filterStatus!=='all'&&po.status!==filterStatus) return false
    if (q) return po.poNumber.toLowerCase().includes(q.toLowerCase())||(po.supplierName||'').toLowerCase().includes(q.toLowerCase())
    return true
  }),[purchaseOrders,q,filterStatus])

  function createPO(data) {
    const poNumber = nextInvoiceNo(purchaseOrders.map(p=>p.poNumber), settings.poPrefix||'PO')
    dispatch({ type:'ADD_PURCHASE_ORDER', payload:{ id:uid(), poNumber, ...data, status:'pending', createdAt:today() } })
    toast.show('Purchase Order created: '+poNumber, 'ok')
    setShowForm(false)
  }

  function receivePO(po) {
    dispatch({ type:'RECEIVE_PO', payload:{ poId:po.id, items:po.items } })
    toast.show('PO received — stock updated', 'ok')
    setConfirmReceive(null)
  }

  const totals = { total:purchaseOrders.length, pending:purchaseOrders.filter(p=>p.status==='pending').length, received:purchaseOrders.filter(p=>p.status==='received').length, spend:purchaseOrders.filter(p=>p.status==='received').reduce((s,p)=>s+(p.grandTotal||0),0) }

  return (
    <div>
      <div className="row-between mb-20">
        <div className="section-head" style={{margin:0}}><h2>Purchase Orders</h2><p>Supplier orders and stock inward</p></div>
        <button className="btn btn-primary" onClick={()=>setShowForm(true)}><Icon n="plus" s={13}/> New PO</button>
      </div>

      <div className="stats-row mb-16">
        {[
          {label:'Total POs',      val:totals.total,                               color:'var(--blue)',   icon:'file'},
          {label:'Pending',        val:totals.pending,                             color:'var(--amber)',  icon:'clock'},
          {label:'Received',       val:totals.received,                            color:'var(--green)',  icon:'check'},
          {label:'Total Spend',    val:'₹'+totals.spend.toLocaleString('en-IN'),   color:'var(--purple)', icon:'tag'},
        ].map(s=>(
          <div key={s.label} className="stat">
            <div className="stat-icon" style={{background:`${s.color}18`,color:s.color}}><Icon n={s.icon} s={17}/></div>
            <div className="stat-val" style={{color:s.color,fontSize:totals.spend>0&&s.label==='Total Spend'?18:28}}>{s.val}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card mb-14">
        <div className="row gap-12" style={{flexWrap:'wrap'}}>
          <div className="search-wrap" style={{flex:'1 1 200px'}}><span className="s-ic"><Icon n="search" s={13}/></span><input className="field" placeholder="Search PO number, supplier…" value={q} onChange={e=>setQ(e.target.value)}/></div>
          {[['all','All'],['pending','Pending'],['received','Received'],['cancelled','Cancelled']].map(([v,l])=>(
            <button key={v} className={`btn ${filterStatus===v?'btn-primary':'btn-ghost'} btn-sm`} onClick={()=>setFilterStatus(v)}>{l}</button>
          ))}
        </div>
      </div>

      <div className="card" style={{padding:0}}>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>PO Number</th><th>Supplier</th><th>Date</th><th>Items</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.length===0&&<tr><td colSpan={7}><div className="empty"><p>No purchase orders found.</p></div></td></tr>}
              {filtered.map(po=>(
                <tr key={po.id}>
                  <td><span className="td-mono">{po.poNumber}</span></td>
                  <td className="td-p">{po.supplierName}</td>
                  <td className="td-dim">{po.date}</td>
                  <td><span className="badge badge-blue">{po.items?.length||0} items</span></td>
                  <td><span style={{fontFamily:'JetBrains Mono',fontWeight:700,color:'var(--amber)'}}>₹{(po.grandTotal||0).toLocaleString('en-IN')}</span></td>
                  <td><span className={`badge ${po.status==='received'?'badge-active':po.status==='pending'?'badge-amber':'badge-red'}`}>{po.status}</span></td>
                  <td>
                    <div className="row gap-6">
                      <button className="btn btn-ghost btn-xs" onClick={()=>setViewPO(po)}><Icon n="eye" s={11}/></button>
                      {po.status==='pending'&&<button className="btn btn-success btn-xs" onClick={()=>setConfirmReceive(po)}><Icon n="check" s={11}/> Receive</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <POForm open={showForm} onClose={()=>setShowForm(false)} onSave={createPO} suppliers={suppliers} products={products} variants={variants}/>
      {viewPO&&<POView po={viewPO} onClose={()=>setViewPO(null)}/>}
      <Confirm open={!!confirmReceive} onClose={()=>setConfirmReceive(null)} title="Confirm Stock Receipt"
        onConfirm={()=>receivePO(confirmReceive)}
        msg={`Mark ${confirmReceive?.poNumber} as received? This will add stock for all ${confirmReceive?.items?.length} items.`}/>
    </div>
  )
}

function POForm({ open, onClose, onSave, suppliers, products, variants }) {
  const blank = { supplierId:'', supplierName:'', date:today(), expectedDate:'', notes:'', items:[], interstate:false }
  const [f, setF] = useState(blank)
  const [addItem, setAddItem] = useState({ variantId:'', qty:1, unitCost:'', gstRate:5 })
  useEffect(()=>setF(blank),[open])

  function addLineItem() {
    if (!addItem.variantId||!addItem.unitCost) return
    const v = variants.find(x=>x.id===addItem.variantId)
    const p = products.find(x=>x.id===v?.productId)
    const item = { variantId:addItem.variantId, sku:v?.sku||'', productName:`${p?.shortName||p?.name||''} ${v?.size||''} ${v?.color||''}`.trim(), qty:parseInt(addItem.qty)||1, receivedQty:0, unitCost:parseFloat(addItem.unitCost)||0, gstRate:parseFloat(addItem.gstRate)||5 }
    setF(prev=>{
      const items = [...prev.items, item]
      return { ...prev, items, ...calcTotals(items, prev.interstate) }
    })
    setAddItem({ variantId:'', qty:1, unitCost:'', gstRate:5 })
  }

  function calcTotals(items, interstate) {
    const subtotal = items.reduce((s,i)=>s+i.qty*i.unitCost,0)
    const totalGst = items.reduce((s,i)=>s+calcGST(i.qty*i.unitCost,i.gstRate,interstate).total,0)
    return { subtotal, totalGst, grandTotal:subtotal+totalGst }
  }

  function save() {
    if (!f.supplierId||!f.items.length) return
    onSave(f)
  }

  return (
    <Modal open={open} onClose={onClose} title="Create Purchase Order" size="modal-xl"
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={save} disabled={!f.supplierId||!f.items.length}>Create PO</button></>}>
      <div className="fg3 mb-14">
        <div className="form-group"><label className="form-label">Supplier <span className="req">*</span></label>
          <select className="field" value={f.supplierId} onChange={e=>{const s=suppliers.find(x=>x.id===e.target.value);setF(p=>({...p,supplierId:e.target.value,supplierName:s?.name||''}));}}>
            <option value="">Select Supplier</option>
            {suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="form-group"><label className="form-label">Order Date</label><input className="field" type="date" value={f.date} onChange={e=>setF(p=>({...p,date:e.target.value}))}/></div>
        <div className="form-group"><label className="form-label">Expected Delivery</label><input className="field" type="date" value={f.expectedDate} onChange={e=>setF(p=>({...p,expectedDate:e.target.value}))}/></div>
      </div>

      <div className="card mb-14" style={{background:'var(--bg-3)'}}>
        <div style={{fontWeight:700,fontSize:13,marginBottom:12}}>Add Items</div>
        <div className="fg4">
          <div className="form-group" style={{gridColumn:'1/3'}}><label className="form-label">Variant / SKU</label>
            <select className="field" value={addItem.variantId} onChange={e=>setAddItem(p=>({...p,variantId:e.target.value}))}>
              <option value="">Select Variant</option>
              {variants.map(v=>{const p=products.find(x=>x.id===v.productId);return <option key={v.id} value={v.id}>{v.sku} — {p?.shortName||p?.name} {v.size} {v.color}</option>})}
            </select>
          </div>
          <div className="form-group"><label className="form-label">Qty</label><input className="field mono" type="number" min="1" value={addItem.qty} onChange={e=>setAddItem(p=>({...p,qty:e.target.value}))}/></div>
          <div className="form-group"><label className="form-label">Cost per unit (₹)</label><input className="field mono" type="number" value={addItem.unitCost} onChange={e=>setAddItem(p=>({...p,unitCost:e.target.value}))}/></div>
          <div className="form-group"><label className="form-label">GST %</label><select className="field" value={addItem.gstRate} onChange={e=>setAddItem(p=>({...p,gstRate:+e.target.value}))}>{[0,5,12,18,28].map(g=><option key={g} value={g}>{g}%</option>)}</select></div>
          <button className="btn btn-primary btn-sm" style={{alignSelf:'flex-end',marginBottom:14}} onClick={addLineItem}><Icon n="plus" s={12}/> Add</button>
        </div>
      </div>

      {f.items.length>0&&(
        <div className="card mb-14" style={{padding:0}}>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>SKU</th><th>Product</th><th>Qty</th><th>Unit Cost</th><th>GST</th><th>Total</th><th></th></tr></thead>
              <tbody>
                {f.items.map((item,i)=>{
                  const gst=calcGST(item.qty*item.unitCost,item.gstRate,f.interstate)
                  return (
                    <tr key={i}>
                      <td className="td-mono">{item.sku}</td>
                      <td className="td-p" style={{fontSize:12}}>{item.productName}</td>
                      <td style={{fontFamily:'JetBrains Mono'}}>{item.qty}</td>
                      <td style={{fontFamily:'JetBrains Mono'}}>₹{item.unitCost}</td>
                      <td className="td-dim">{item.gstRate}%</td>
                      <td style={{fontFamily:'JetBrains Mono',fontWeight:700,color:'var(--amber)'}}>₹{(item.qty*item.unitCost+gst.total).toFixed(2)}</td>
                      <td><button className="btn btn-danger btn-xs" onClick={()=>{const items=f.items.filter((_,j)=>j!==i);setF(p=>({...p,items,...calcTotals(items,p.interstate)}))}}>✕</button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div style={{padding:'12px 16px',background:'var(--bg-3)',borderTop:'1px solid var(--b1)',display:'flex',justifyContent:'flex-end',gap:24}}>
            <span style={{fontSize:13,color:'var(--t3)'}}>Subtotal: <strong style={{color:'var(--t1)'}}>₹{(f.subtotal||0).toFixed(2)}</strong></span>
            <span style={{fontSize:13,color:'var(--t3)'}}>GST: <strong style={{color:'var(--t1)'}}>₹{(f.totalGst||0).toFixed(2)}</strong></span>
            <span style={{fontSize:14,fontWeight:700,color:'var(--amber)'}}>Grand Total: ₹{(f.grandTotal||0).toFixed(2)}</span>
          </div>
        </div>
      )}

      <div className="form-group"><label className="form-label">Notes</label><input className="field" value={f.notes} onChange={e=>setF(p=>({...p,notes:e.target.value}))}/></div>
    </Modal>
  )
}

function POView({ po, onClose }) {
  return (
    <div className="overlay no-print" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal modal-lg">
        <div className="modal-hd"><div className="modal-title">{po.poNumber} — {po.supplierName}</div><button className="close-btn" onClick={onClose}><Icon n="x" s={13}/></button></div>
        <div className="modal-body">
          <div className="fg3 mb-14">
            {[['Date',po.date],['Expected',po.expectedDate||'—'],['Status',po.status],['Received',po.receivedDate||'—']].map(([l,v])=>(
              <div key={l} style={{background:'var(--bg-3)',padding:'8px 12px',borderRadius:'var(--r)'}}><div style={{fontSize:10,color:'var(--t4)',textTransform:'uppercase',fontWeight:700}}>{l}</div><div style={{fontSize:13,color:'var(--t1)',marginTop:3}}>{v}</div></div>
            ))}
          </div>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>SKU</th><th>Product</th><th>Qty</th><th>Cost</th><th>GST%</th><th>Total</th></tr></thead>
              <tbody>
                {(po.items||[]).map((item,i)=>(
                  <tr key={i}><td className="td-mono">{item.sku}</td><td className="td-p" style={{fontSize:12}}>{item.productName}</td><td>{item.qty}</td><td>₹{item.unitCost}</td><td>{item.gstRate}%</td><td style={{fontFamily:'JetBrains Mono',fontWeight:700,color:'var(--amber)'}}>₹{(item.qty*item.unitCost*(1+item.gstRate/100)).toFixed(2)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{textAlign:'right',padding:'12px 0',fontSize:14,fontWeight:700,color:'var(--amber)'}}>Grand Total: ₹{(po.grandTotal||0).toLocaleString('en-IN')}</div>
          {po.notes&&<div className="info-box"><Icon n="info" s={14}/> {po.notes}</div>}
        </div>
        <div className="modal-foot"><button className="btn btn-ghost" onClick={onClose}>Close</button></div>
      </div>
    </div>
  )
}
