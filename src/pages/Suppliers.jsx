import { useState, useEffect } from 'react'
import { Icon, Modal, Confirm } from '../components/ui/index.jsx'
import { uid, today } from '../utils/csv.js'

export function Suppliers({ state, dispatch, toast }) {
  const { suppliers, purchaseOrders } = state
  const [showForm, setShowForm] = useState(false)
  const [editSupp, setEditSupp] = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [q, setQ] = useState('')

  const filtered = suppliers.filter(s => !q || s.name.toLowerCase().includes(q.toLowerCase()) || (s.contactPerson||'').toLowerCase().includes(q.toLowerCase()))

  function save(data) {
    if (editSupp) {
      dispatch({ type:'UPDATE_SUPPLIER', payload:{ ...editSupp, ...data } })
      toast.show('Supplier updated', 'ok')
    } else {
      dispatch({ type:'ADD_SUPPLIER', payload:{ id:uid(), ...data, createdAt:today() } })
      toast.show('Supplier added', 'ok')
    }
    setShowForm(false); setEditSupp(null)
  }

  return (
    <div>
      <div className="row-between mb-20">
        <div className="section-head" style={{margin:0}}><h2>Suppliers</h2><p>{suppliers.length} suppliers</p></div>
        <button className="btn btn-primary" onClick={()=>{setEditSupp(null);setShowForm(true)}}><Icon n="plus" s={13}/> Add Supplier</button>
      </div>
      <div className="card mb-14">
        <div className="search-wrap"><span className="s-ic"><Icon n="search" s={13}/></span><input className="field" placeholder="Search suppliers…" value={q} onChange={e=>setQ(e.target.value)}/></div>
      </div>
      <div className="grid-2 gap-14">
        {filtered.map(s => {
          const poCount = purchaseOrders.filter(po => po.supplierId === s.id).length
          const totalSpend = purchaseOrders.filter(po => po.supplierId === s.id && po.status === 'received').reduce((sum, po) => sum + (po.grandTotal || 0), 0)
          return (
            <div key={s.id} className="card">
              <div className="row-between mb-12">
                <div>
                  <div style={{fontFamily:'Syne',fontWeight:700,fontSize:14,color:'var(--t1)'}}>{s.name}</div>
                  <div style={{fontSize:12,color:'var(--t3)',marginTop:2}}>{s.contactPerson}</div>
                </div>
                <span className={`badge badge-${s.status==='active'?'active':'inactive'}`}>{s.status}</span>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:14}}>
                {[['Phone',s.phone||'—'],['Email',s.email||'—'],['GSTIN',s.gstin||'—'],['Payment Terms',s.paymentTerms?`${s.paymentTerms} days`:'—'],['Total POs',poCount],['Total Spend',`₹${totalSpend.toLocaleString('en-IN')}`]].map(([lbl,val])=>(
                  <div key={lbl} style={{background:'var(--bg-3)',borderRadius:'var(--r)',padding:'7px 10px'}}>
                    <div style={{fontSize:10,color:'var(--t4)',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.8px',marginBottom:3}}>{lbl}</div>
                    <div style={{fontSize:12.5,color:'var(--t1)',fontFamily:lbl==='GSTIN'?'JetBrains Mono':''}}>{val}</div>
                  </div>
                ))}
              </div>
              {s.address && <div style={{fontSize:12,color:'var(--t3)',marginBottom:12}}><Icon n="tag" s={11}/> {s.address}</div>}
              <div className="row gap-8">
                <button className="btn btn-secondary btn-sm" style={{flex:1}} onClick={()=>{setEditSupp(s);setShowForm(true)}}><Icon n="edit" s={12}/> Edit</button>
                <button className="btn btn-danger btn-sm" onClick={()=>setConfirmDel(s.id)}><Icon n="trash" s={12}/></button>
              </div>
            </div>
          )
        })}
        {filtered.length===0&&<div className="card" style={{gridColumn:'1/-1'}}><div className="empty"><Icon n="layers" s={28}/><h3>No suppliers</h3><p>Add your first supplier.</p></div></div>}
      </div>
      <SupplierForm open={showForm} onClose={()=>{setShowForm(false);setEditSupp(null)}} onSave={save} initial={editSupp}/>
      <Confirm open={!!confirmDel} onClose={()=>setConfirmDel(null)} onConfirm={()=>{dispatch({type:'DELETE_SUPPLIER',payload:confirmDel});toast.show('Supplier deleted','info')}} msg="Delete this supplier? Purchase orders will remain."/>
    </div>
  )
}

function SupplierForm({ open, onClose, onSave, initial }) {
  const blank = { name:'', contactPerson:'', phone:'', email:'', address:'', gstin:'', pan:'', paymentTerms:30, status:'active', notes:'' }
  const [f, setF] = useState(blank)
  useEffect(()=>setF(initial?{...blank,...initial}:blank),[open])
  const s=(k,v)=>setF(p=>({...p,[k]:v}))
  return (
    <Modal open={open} onClose={onClose} title={initial?'Edit Supplier':'Add Supplier'} size="modal-lg"
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={()=>f.name.trim()&&onSave(f)}>{initial?'Save':'Add Supplier'}</button></>}>
      <div className="fg2">
        <div className="form-group"><label className="form-label">Supplier Name <span className="req">*</span></label><input className="field" value={f.name} onChange={e=>s('name',e.target.value)}/></div>
        <div className="form-group"><label className="form-label">Contact Person</label><input className="field" value={f.contactPerson} onChange={e=>s('contactPerson',e.target.value)}/></div>
      </div>
      <div className="fg2">
        <div className="form-group"><label className="form-label">Phone</label><input className="field" value={f.phone} onChange={e=>s('phone',e.target.value)}/></div>
        <div className="form-group"><label className="form-label">Email</label><input className="field" type="email" value={f.email} onChange={e=>s('email',e.target.value)}/></div>
      </div>
      <div className="form-group"><label className="form-label">Address</label><textarea className="field" style={{minHeight:56}} value={f.address} onChange={e=>s('address',e.target.value)}/></div>
      <div className="fg3">
        <div className="form-group"><label className="form-label">GSTIN</label><input className="field mono" value={f.gstin} onChange={e=>s('gstin',e.target.value.toUpperCase())} maxLength={15}/></div>
        <div className="form-group"><label className="form-label">PAN</label><input className="field mono" value={f.pan} onChange={e=>s('pan',e.target.value.toUpperCase())} maxLength={10}/></div>
        <div className="form-group"><label className="form-label">Payment Terms (days)</label><input className="field" type="number" value={f.paymentTerms} onChange={e=>s('paymentTerms',+e.target.value)}/></div>
      </div>
      <div className="fg2">
        <div className="form-group"><label className="form-label">Status</label><select className="field" value={f.status} onChange={e=>s('status',e.target.value)}><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
        <div className="form-group"><label className="form-label">Notes</label><input className="field" value={f.notes} onChange={e=>s('notes',e.target.value)}/></div>
      </div>
    </Modal>
  )
}
