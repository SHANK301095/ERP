import { useState, useMemo, useEffect } from 'react'
import { Icon, Modal, Confirm } from '../components/ui/index.jsx'
import { uid, today } from '../utils/csv.js'
import { calcInvoiceTotals, nextInvoiceNo, fmtINR, numToWords } from '../utils/gst.js'

export function Sales({ state, dispatch, toast }) {
  const { salesInvoices, customers, products, variants, inventory, settings } = state
  const [showForm, setShowForm] = useState(false)
  const [viewInv, setViewInv] = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [q, setQ] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  const filtered = useMemo(()=>salesInvoices.filter(inv=>{
    if (filterStatus!=='all'&&inv.status!==filterStatus) return false
    if (q) return inv.invoiceNumber.toLowerCase().includes(q.toLowerCase())||(inv.customerName||'').toLowerCase().includes(q.toLowerCase())
    return true
  }),[salesInvoices,q,filterStatus])

  function createInvoice(data) {
    const invoiceNumber = nextInvoiceNo(salesInvoices.map(i=>i.invoiceNumber), settings.invoicePrefix||'INV')
    dispatch({ type:'ADD_INVOICE', payload:{ id:uid(), invoiceNumber, ...data, createdAt:today() } })
    toast.show('Invoice created: '+invoiceNumber, 'ok')
    setShowForm(false)
  }

  const totals = {
    total:    salesInvoices.length,
    paid:     salesInvoices.filter(i=>i.status==='paid').length,
    unpaid:   salesInvoices.filter(i=>i.status==='unpaid').length,
    revenue:  salesInvoices.filter(i=>i.status==='paid').reduce((s,i)=>s+(i.grandTotal||0),0),
  }

  return (
    <div>
      <div className="row-between mb-20">
        <div className="section-head" style={{margin:0}}><h2>Sales & Invoices</h2><p>GST invoices and billing</p></div>
        <button className="btn btn-primary" onClick={()=>setShowForm(true)}><Icon n="plus" s={13}/> New Invoice</button>
      </div>

      <div className="stats-row mb-16">
        {[
          {label:'Total Invoices', val:totals.total,   color:'var(--blue)',   icon:'file'},
          {label:'Paid',          val:totals.paid,     color:'var(--green)',  icon:'check'},
          {label:'Unpaid',        val:totals.unpaid,   color:'var(--red)',    icon:'clock'},
          {label:'Revenue (Paid)',val:'₹'+totals.revenue.toLocaleString('en-IN'), color:'var(--amber)', icon:'zap'},
        ].map(s=>(
          <div key={s.label} className="stat">
            <div className="stat-icon" style={{background:`${s.color}18`,color:s.color}}><Icon n={s.icon} s={17}/></div>
            <div className="stat-val" style={{color:s.color,fontSize:s.label.includes('Revenue')&&totals.revenue>0?16:28}}>{s.val}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card mb-14">
        <div className="row gap-12" style={{flexWrap:'wrap'}}>
          <div className="search-wrap" style={{flex:'1 1 200px'}}><span className="s-ic"><Icon n="search" s={13}/></span><input className="field" placeholder="Search invoice number, customer…" value={q} onChange={e=>setQ(e.target.value)}/></div>
          {[['all','All'],['paid','Paid'],['unpaid','Unpaid'],['cancelled','Cancelled']].map(([v,l])=>(
            <button key={v} className={`btn ${filterStatus===v?'btn-primary':'btn-ghost'} btn-sm`} onClick={()=>setFilterStatus(v)}>{l}</button>
          ))}
        </div>
      </div>

      <div className="card" style={{padding:0}}>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Invoice No.</th><th>Customer</th><th>Date</th><th>Items</th><th>GST</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.length===0&&<tr><td colSpan={8}><div className="empty"><p>No invoices found.</p></div></td></tr>}
              {filtered.map(inv=>(
                <tr key={inv.id}>
                  <td><span className="td-mono">{inv.invoiceNumber}</span></td>
                  <td className="td-p">{inv.customerName}</td>
                  <td className="td-dim">{inv.date}</td>
                  <td><span className="badge badge-blue">{inv.items?.length||0}</span></td>
                  <td style={{fontFamily:'JetBrains Mono',fontSize:12,color:'var(--t3)'}}>₹{(inv.totalGst||0).toFixed(0)}</td>
                  <td><span style={{fontFamily:'JetBrains Mono',fontWeight:700,color:'var(--amber)'}}>₹{(inv.grandTotal||0).toLocaleString('en-IN')}</span></td>
                  <td>
                    <span className={`badge ${inv.status==='paid'?'badge-active':inv.status==='unpaid'?'badge-red':'badge-inactive'}`}>{inv.status}</span>
                  </td>
                  <td>
                    <div className="row gap-6">
                      <button className="btn btn-ghost btn-xs" onClick={()=>setViewInv(inv)}><Icon n="eye" s={11}/></button>
                      {inv.status==='unpaid'&&<button className="btn btn-success btn-xs" onClick={()=>dispatch({type:'UPDATE_INVOICE',payload:{...inv,status:'paid',paymentDate:today()}})&&toast.show('Marked as paid','ok')}><Icon n="check" s={11}/></button>}
                      <button className="btn btn-danger btn-xs" onClick={()=>setConfirmDel(inv.id)}><Icon n="trash" s={11}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <InvoiceForm open={showForm} onClose={()=>setShowForm(false)} onSave={createInvoice} customers={customers} products={products} variants={variants} inventory={inventory} settings={settings}/>
      {viewInv&&<InvoiceView inv={viewInv} onClose={()=>setViewInv(null)} settings={settings}/>}
      <Confirm open={!!confirmDel} onClose={()=>setConfirmDel(null)} onConfirm={()=>{dispatch({type:'DELETE_INVOICE',payload:confirmDel});toast.show('Invoice deleted','info')}} msg="Delete this invoice? Stock deductions will NOT be reversed."/>
    </div>
  )
}

function InvoiceForm({ open, onClose, onSave, customers, products, variants, inventory, settings }) {
  const blank = { customerId:'', customerName:'', customerAddress:'', customerGstin:'', date:today(), dueDate:'', status:'unpaid', interstate:false, notes:'', items:[] }
  const [f, setF] = useState(blank)
  const [addItem, setAddItem] = useState({ variantId:'', qty:1, unitPrice:'', gstRate:5, discount:0 })
  useEffect(()=>setF(blank),[open])

  function setCustomer(id) {
    const c = customers.find(x=>x.id===id)
    setF(p=>({...p, customerId:id, customerName:c?.name||'', customerAddress:c?.address||'', customerGstin:c?.gstin||''}))
  }

  function addLine() {
    if (!addItem.variantId||!addItem.unitPrice) return
    const v = variants.find(x=>x.id===addItem.variantId)
    const p = products.find(x=>x.id===v?.productId)
    const inv = inventory.find(i=>i.variantId===addItem.variantId)
    const item = { variantId:addItem.variantId, sku:v?.sku||'', productName:`${p?.shortName||p?.name||''} ${v?.size||''} ${v?.color||''}`.trim(), qty:parseInt(addItem.qty)||1, unitPrice:parseFloat(addItem.unitPrice)||0, gstRate:parseFloat(addItem.gstRate)||5, discount:parseFloat(addItem.discount)||0, hsnCode:p?.hsnCode||'', availableStock:inv?.qty||0 }
    setF(prev=>{
      const items=[...prev.items,item]
      return {...prev,items,...calcInvoiceTotals(items,prev.interstate)}
    })
    setAddItem({variantId:'',qty:1,unitPrice:'',gstRate:5,discount:0})
  }

  function save() {
    if (!f.customerId||!f.items.length) return
    onSave(f)
  }

  const variantById = id => variants.find(v=>v.id===id)

  return (
    <Modal open={open} onClose={onClose} title="Create Sales Invoice" size="modal-xl"
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={save} disabled={!f.customerId||!f.items.length}>Create Invoice</button></>}>
      <div className="fg3 mb-14">
        <div className="form-group"><label className="form-label">Customer <span className="req">*</span></label>
          <select className="field" value={f.customerId} onChange={e=>setCustomer(e.target.value)}>
            <option value="">Select Customer</option>
            {customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="form-group"><label className="form-label">Invoice Date</label><input className="field" type="date" value={f.date} onChange={e=>setF(p=>({...p,date:e.target.value}))}/></div>
        <div className="form-group"><label className="form-label">Due Date</label><input className="field" type="date" value={f.dueDate} onChange={e=>setF(p=>({...p,dueDate:e.target.value}))}/></div>
      </div>
      {f.customerGstin&&<div className="fg2 mb-14"><div className="form-group"><label className="form-label">Customer GSTIN</label><input className="field mono" value={f.customerGstin} onChange={e=>setF(p=>({...p,customerGstin:e.target.value.toUpperCase()}))}/></div><div className="form-group"><label className="form-label" style={{display:'flex',gap:8,alignItems:'center'}}>Interstate Supply <input type="checkbox" style={{accentColor:'var(--amber)'}} checked={f.interstate} onChange={e=>setF(p=>({...p,interstate:e.target.checked}))}/></label><div className="field-hint">{f.interstate?'IGST will apply':'CGST + SGST will apply'}</div></div></div>}

      <div className="card mb-14" style={{background:'var(--bg-3)'}}>
        <div style={{fontWeight:700,fontSize:13,marginBottom:12}}>Add Line Items</div>
        <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr auto',gap:10,alignItems:'flex-end'}}>
          <div className="form-group" style={{margin:0}}>
            <label className="form-label">SKU / Variant</label>
            <select className="field" value={addItem.variantId} onChange={e=>{const v=variants.find(x=>x.id===e.target.value);const p=products.find(x=>x.id===v?.productId);setAddItem(prev=>({...prev,variantId:e.target.value,unitPrice:v?.priceOverride||p?.mrp||'',gstRate:p?.gst||5}))}}>
              <option value="">Select</option>
              {variants.map(v=>{const p=products.find(x=>x.id===v.productId);const inv=inventory.find(i=>i.variantId===v.id);return <option key={v.id} value={v.id}>{v.sku} (Stock: {inv?.qty||0})</option>})}
            </select>
          </div>
          <div className="form-group" style={{margin:0}}><label className="form-label">Qty</label><input className="field mono" type="number" min="1" value={addItem.qty} onChange={e=>setAddItem(p=>({...p,qty:e.target.value}))}/></div>
          <div className="form-group" style={{margin:0}}><label className="form-label">Rate (₹)</label><input className="field mono" type="number" value={addItem.unitPrice} onChange={e=>setAddItem(p=>({...p,unitPrice:e.target.value}))}/></div>
          <div className="form-group" style={{margin:0}}><label className="form-label">Disc%</label><input className="field mono" type="number" min="0" max="100" value={addItem.discount} onChange={e=>setAddItem(p=>({...p,discount:e.target.value}))}/></div>
          <div className="form-group" style={{margin:0}}><label className="form-label">GST%</label><select className="field" value={addItem.gstRate} onChange={e=>setAddItem(p=>({...p,gstRate:+e.target.value}))}>{[0,5,12,18,28].map(g=><option key={g} value={g}>{g}%</option>)}</select></div>
          <button className="btn btn-primary btn-sm" style={{marginBottom:1}} onClick={addLine}><Icon n="plus" s={12}/></button>
        </div>
      </div>

      {f.items.length>0&&(
        <div className="card mb-14" style={{padding:0}}>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>SKU</th><th>Product</th><th>Qty</th><th>Rate</th><th>Disc%</th><th>Taxable</th><th>GST</th><th>Total</th><th></th></tr></thead>
              <tbody>
                {f.items.map((item,i)=>{
                  const lineAmt=item.qty*item.unitPrice
                  const discAmt=(lineAmt*item.discount)/100
                  const taxable=lineAmt-discAmt
                  const gstAmt=(taxable*item.gstRate)/100
                  return (
                    <tr key={i}>
                      <td className="td-mono">{item.sku}</td>
                      <td style={{fontSize:12,color:'var(--t2)'}}>{item.productName}</td>
                      <td>{item.qty}</td>
                      <td style={{fontFamily:'JetBrains Mono'}}>₹{item.unitPrice}</td>
                      <td style={{color:'var(--t3)'}}>{item.discount||0}%</td>
                      <td style={{fontFamily:'JetBrains Mono',fontSize:12}}>₹{taxable.toFixed(2)}</td>
                      <td style={{fontFamily:'JetBrains Mono',fontSize:12,color:'var(--t3)'}}>₹{gstAmt.toFixed(2)}</td>
                      <td style={{fontFamily:'JetBrains Mono',fontWeight:700,color:'var(--amber)'}}>₹{(taxable+gstAmt).toFixed(2)}</td>
                      <td><button className="btn btn-danger btn-xs" onClick={()=>{const items=f.items.filter((_,j)=>j!==i);setF(p=>({...p,items,...calcInvoiceTotals(items,p.interstate)}))}}>✕</button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div style={{padding:'14px 16px',background:'var(--bg-3)',borderTop:'1px solid var(--b1)'}}>
            <div style={{display:'flex',gap:24,justifyContent:'flex-end',flexWrap:'wrap'}}>
              <span style={{fontSize:12.5,color:'var(--t3)'}}>Subtotal: <strong style={{color:'var(--t1)'}}>₹{(f.subtotal||0).toFixed(2)}</strong></span>
              {(f.totalDiscount||0)>0&&<span style={{fontSize:12.5,color:'var(--t3)'}}>Discount: <strong style={{color:'var(--red)'}}>-₹{(f.totalDiscount||0).toFixed(2)}</strong></span>}
              <span style={{fontSize:12.5,color:'var(--t3)'}}>GST: <strong style={{color:'var(--t1)'}}>₹{(f.totalGst||0).toFixed(2)}</strong></span>
              <span style={{fontSize:15,fontWeight:700,color:'var(--amber)'}}>Grand Total: ₹{(f.grandTotal||0).toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
      <div className="fg2">
        <div className="form-group"><label className="form-label">Status</label><select className="field" value={f.status} onChange={e=>setF(p=>({...p,status:e.target.value}))}><option value="unpaid">Unpaid</option><option value="paid">Paid</option></select></div>
        <div className="form-group"><label className="form-label">Notes</label><input className="field" value={f.notes} onChange={e=>setF(p=>({...p,notes:e.target.value}))}/></div>
      </div>
    </Modal>
  )
}

function InvoiceView({ inv, onClose, settings }) {
  return (
    <div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal modal-lg" style={{fontFamily:'DM Sans'}}>
        <div className="modal-hd">
          <div className="modal-title">Invoice — {inv.invoiceNumber}</div>
          <div className="row gap-8">
            <button className="btn btn-secondary btn-sm" onClick={()=>window.print()}><Icon n="print" s={12}/> Print</button>
            <button className="close-btn" onClick={onClose}><Icon n="x" s={13}/></button>
          </div>
        </div>
        <div className="modal-body" style={{background:'white',color:'#111'}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:20,paddingBottom:16,borderBottom:'2px solid #111'}}>
            <div>
              <div style={{fontFamily:'Syne',fontWeight:800,fontSize:22,color:'#111'}}>{settings.brandName}</div>
              {settings.address&&<div style={{fontSize:12,color:'#555',marginTop:3}}>{settings.address}</div>}
              {settings.gstin&&<div style={{fontSize:12,color:'#555',fontFamily:'monospace'}}>GSTIN: {settings.gstin}</div>}
              {settings.phone&&<div style={{fontSize:12,color:'#555'}}>Ph: {settings.phone}</div>}
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontFamily:'Syne',fontWeight:800,fontSize:20,color:'#111'}}>TAX INVOICE</div>
              <div style={{fontFamily:'monospace',fontSize:14,fontWeight:700,color:'#f59e0b',marginTop:4}}>{inv.invoiceNumber}</div>
              <div style={{fontSize:12,color:'#555',marginTop:4}}>Date: {inv.date}</div>
              {inv.dueDate&&<div style={{fontSize:12,color:'#555'}}>Due: {inv.dueDate}</div>}
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
            <div style={{background:'#f8f9fa',padding:'12px 14px',borderRadius:6}}>
              <div style={{fontWeight:700,fontSize:11,textTransform:'uppercase',letterSpacing:'0.8px',color:'#888',marginBottom:6}}>Bill To</div>
              <div style={{fontWeight:700,fontSize:14}}>{inv.customerName}</div>
              {inv.customerAddress&&<div style={{fontSize:12,color:'#555',marginTop:3}}>{inv.customerAddress}</div>}
              {inv.customerGstin&&<div style={{fontSize:12,fontFamily:'monospace',color:'#555',marginTop:2}}>GSTIN: {inv.customerGstin}</div>}
            </div>
            <div style={{background:'#f8f9fa',padding:'12px 14px',borderRadius:6}}>
              <div style={{fontWeight:700,fontSize:11,textTransform:'uppercase',letterSpacing:'0.8px',color:'#888',marginBottom:6}}>Payment</div>
              <div style={{fontSize:13,fontWeight:600,color:inv.status==='paid'?'#22c55e':'#f87171',textTransform:'uppercase'}}>{inv.status}</div>
              {inv.paymentDate&&<div style={{fontSize:12,color:'#555',marginTop:2}}>Paid on: {inv.paymentDate}</div>}
              <div style={{fontSize:12,color:'#555',marginTop:2}}>{inv.interstate?'IGST Applied':'CGST + SGST Applied'}</div>
            </div>
          </div>

          <table style={{width:'100%',borderCollapse:'collapse',marginBottom:12,fontSize:12}}>
            <thead>
              <tr style={{background:'#111',color:'white'}}>
                {['#','HSN','Description','Qty','Rate','Disc%','Taxable','GST%','GST Amt','Total'].map(h=><th key={h} style={{padding:'7px 10px',textAlign:h==='#'||h==='HSN'||h==='Qty'||h==='Disc%'||h==='GST%'?'center':'left',fontWeight:600,fontSize:11}}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {(inv.items||[]).map((item,i)=>{
                const lineAmt=item.qty*item.unitPrice
                const discAmt=(lineAmt*(item.discount||0))/100
                const taxable=lineAmt-discAmt
                const gstAmt=(taxable*item.gstRate)/100
                return (
                  <tr key={i} style={{borderBottom:'1px solid #e5e7eb'}}>
                    <td style={{padding:'7px 10px',textAlign:'center',color:'#888'}}>{i+1}</td>
                    <td style={{padding:'7px 10px',textAlign:'center',fontFamily:'monospace',fontSize:11,color:'#555'}}>{item.hsnCode||'—'}</td>
                    <td style={{padding:'7px 10px'}}><div style={{fontWeight:600}}>{item.productName}</div><div style={{fontSize:10,color:'#888',fontFamily:'monospace'}}>{item.sku}</div></td>
                    <td style={{padding:'7px 10px',textAlign:'center'}}>{item.qty}</td>
                    <td style={{padding:'7px 10px',fontFamily:'monospace'}}>₹{item.unitPrice}</td>
                    <td style={{padding:'7px 10px',textAlign:'center',color:'#888'}}>{item.discount||0}%</td>
                    <td style={{padding:'7px 10px',fontFamily:'monospace'}}>₹{taxable.toFixed(2)}</td>
                    <td style={{padding:'7px 10px',textAlign:'center'}}>{item.gstRate}%</td>
                    <td style={{padding:'7px 10px',fontFamily:'monospace'}}>₹{gstAmt.toFixed(2)}</td>
                    <td style={{padding:'7px 10px',fontFamily:'monospace',fontWeight:700}}>₹{(taxable+gstAmt).toFixed(2)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <div style={{display:'flex',justifyContent:'flex-end',marginBottom:12}}>
            <div style={{width:280,background:'#f8f9fa',borderRadius:6,padding:14}}>
              {[['Subtotal','₹'+(inv.subtotal||0).toFixed(2)],inv.totalDiscount?['Discount','-₹'+(inv.totalDiscount||0).toFixed(2)]:null,['Taxable Amt','₹'+(inv.taxable||0).toFixed(2)],inv.interstate?['IGST','₹'+(inv.totalGst||0).toFixed(2)]:['CGST','₹'+((inv.totalGst||0)/2).toFixed(2)],!inv.interstate?['SGST','₹'+((inv.totalGst||0)/2).toFixed(2)]:null].filter(Boolean).map(([l,v])=>(
                <div key={l} style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:5,color:'#555'}}><span>{l}</span><span style={{fontFamily:'monospace'}}>{v}</span></div>
              ))}
              <div style={{display:'flex',justifyContent:'space-between',fontWeight:700,fontSize:16,borderTop:'2px solid #111',paddingTop:8,marginTop:8}}><span>Grand Total</span><span style={{fontFamily:'monospace',color:'#f59e0b'}}>₹{(inv.grandTotal||0).toLocaleString('en-IN',{minimumFractionDigits:2})}</span></div>
            </div>
          </div>
          <div style={{fontSize:11.5,color:'#555',borderTop:'1px solid #e5e7eb',paddingTop:10}}>Amount in words: <em>{numToWords(Math.round(inv.grandTotal||0))}</em></div>
          {settings.bankAccount&&<div style={{marginTop:10,fontSize:11.5,color:'#555'}}>Bank: {settings.bankName} · A/C: {settings.bankAccount} · IFSC: {settings.bankIFSC}</div>}
          {inv.notes&&<div style={{marginTop:8,fontSize:12,color:'#555',fontStyle:'italic'}}>Note: {inv.notes}</div>}
        </div>
        <div className="modal-foot no-print"><button className="btn btn-ghost" onClick={onClose}>Close</button><button className="btn btn-primary" onClick={()=>window.print()}><Icon n="print" s={13}/> Print Invoice</button></div>
      </div>
    </div>
  )
}
