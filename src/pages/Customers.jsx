import { useState, useEffect } from 'react'
import { Icon, Modal, Confirm } from '../components/ui/index.jsx'
import { uid, today } from '../utils/csv.js'

export function Customers({ state, dispatch, toast }) {
  const { customers, salesInvoices } = state
  const [showForm, setShowForm] = useState(false)
  const [editCust, setEditCust] = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [q, setQ] = useState('')

  const filtered = customers.filter(c => !q || c.name.toLowerCase().includes(q.toLowerCase()) || (c.phone||'').includes(q) || (c.gstin||'').toLowerCase().includes(q.toLowerCase()))

  function save(data) {
    if (editCust) { dispatch({ type:'UPDATE_CUSTOMER', payload:{...editCust,...data} }); toast.show('Customer updated','ok') }
    else { dispatch({ type:'ADD_CUSTOMER', payload:{id:uid(),...data,createdAt:today()} }); toast.show('Customer added','ok') }
    setShowForm(false); setEditCust(null)
  }

  return (
    <div>
      <div className="row-between mb-20">
        <div className="section-head" style={{margin:0}}><h2>Customers</h2><p>{customers.length} customers</p></div>
        <button className="btn btn-primary" onClick={()=>{setEditCust(null);setShowForm(true)}}><Icon n="plus" s={13}/> Add Customer</button>
      </div>
      <div className="card mb-14">
        <div className="search-wrap"><span className="s-ic"><Icon n="search" s={13}/></span><input className="field" placeholder="Search name, phone, GSTIN…" value={q} onChange={e=>setQ(e.target.value)}/></div>
      </div>
      <div className="grid-3 gap-14">
        {filtered.map(c => {
          const invCount = salesInvoices.filter(i=>i.customerId===c.id).length
          const totalBuy = salesInvoices.filter(i=>i.customerId===c.id).reduce((s,i)=>s+(i.grandTotal||0),0)
          return (
            <div key={c.id} className="card">
              <div className="row-between mb-10">
                <div>
                  <div style={{fontFamily:'Syne',fontWeight:700,fontSize:14,color:'var(--t1)'}}>{c.name}</div>
                  <div style={{fontSize:11,color:'var(--t3)',marginTop:2}}>{c.type==='wholesale'?'Wholesale':'Retail'} Customer</div>
                </div>
                <span className={`badge badge-${c.status==='active'?'active':'inactive'}`}>{c.status}</span>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:12}}>
                {[['Phone',c.phone||'—'],['Invoices',invCount],['GSTIN',c.gstin||'—'],['Total Purchase','₹'+totalBuy.toLocaleString('en-IN')]].map(([lbl,val])=>(
                  <div key={lbl} style={{background:'var(--bg-3)',borderRadius:'var(--r)',padding:'6px 9px'}}>
                    <div style={{fontSize:10,color:'var(--t4)',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.7px'}}>{lbl}</div>
                    <div style={{fontSize:12,color:'var(--t1)'}}>{val}</div>
                  </div>
                ))}
              </div>
              {c.address&&<div style={{fontSize:11.5,color:'var(--t3)',marginBottom:10}}>{c.address}</div>}
              <div className="row gap-8">
                <button className="btn btn-secondary btn-sm" style={{flex:1}} onClick={()=>{setEditCust(c);setShowForm(true)}}><Icon n="edit" s={12}/> Edit</button>
                <button className="btn btn-danger btn-sm" onClick={()=>setConfirmDel(c.id)}><Icon n="trash" s={12}/></button>
              </div>
            </div>
          )
        })}
        {filtered.length===0&&<div className="card" style={{gridColumn:'1/-1'}}><div className="empty"><Icon n="tag" s={28}/><h3>No customers</h3><p>Add your first customer.</p></div></div>}
      </div>
      <CustomerForm open={showForm} onClose={()=>{setShowForm(false);setEditCust(null)}} onSave={save} initial={editCust}/>
      <Confirm open={!!confirmDel} onClose={()=>setConfirmDel(null)} onConfirm={()=>{dispatch({type:'DELETE_CUSTOMER',payload:confirmDel});toast.show('Customer deleted','info')}} msg="Delete this customer?"/>
    </div>
  )
}

function CustomerForm({ open, onClose, onSave, initial }) {
  const blank = { name:'', contactPerson:'', phone:'', email:'', address:'', gstin:'', pan:'', type:'retail', creditLimit:0, status:'active', notes:'' }
  const [f, setF] = useState(blank)
  useEffect(()=>setF(initial?{...blank,...initial}:blank),[open])
  const s=(k,v)=>setF(p=>({...p,[k]:v}))
  return (
    <Modal open={open} onClose={onClose} title={initial?'Edit Customer':'Add Customer'} size="modal-lg"
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={()=>f.name.trim()&&onSave(f)}>{initial?'Save':'Add Customer'}</button></>}>
      <div className="fg2">
        <div className="form-group"><label className="form-label">Customer Name <span className="req">*</span></label><input className="field" value={f.name} onChange={e=>s('name',e.target.value)}/></div>
        <div className="form-group"><label className="form-label">Contact Person</label><input className="field" value={f.contactPerson} onChange={e=>s('contactPerson',e.target.value)}/></div>
      </div>
      <div className="fg2">
        <div className="form-group"><label className="form-label">Phone</label><input className="field" value={f.phone} onChange={e=>s('phone',e.target.value)}/></div>
        <div className="form-group"><label className="form-label">Email</label><input className="field" type="email" value={f.email} onChange={e=>s('email',e.target.value)}/></div>
      </div>
      <div className="form-group"><label className="form-label">Address</label><textarea className="field" style={{minHeight:56}} value={f.address} onChange={e=>s('address',e.target.value)}/></div>
      <div className="fg3">
        <div className="form-group"><label className="form-label">GSTIN</label><input className="field mono" value={f.gstin} onChange={e=>s('gstin',e.target.value.toUpperCase())} maxLength={15}/></div>
        <div className="form-group"><label className="form-label">Type</label><select className="field" value={f.type} onChange={e=>s('type',e.target.value)}><option value="retail">Retail</option><option value="wholesale">Wholesale</option></select></div>
        <div className="form-group"><label className="form-label">Credit Limit (₹)</label><input className="field" type="number" value={f.creditLimit} onChange={e=>s('creditLimit',+e.target.value)}/></div>
      </div>
      <div className="form-group"><label className="form-label">Status</label><select className="field" style={{width:180}} value={f.status} onChange={e=>s('status',e.target.value)}><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
    </Modal>
  )
}
