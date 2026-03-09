import { useState } from 'react'
import { uid, today } from '../utils/csv.js'

export function WarrantyService({ state, dispatch, toast }) {
  const { settings, salesInvoices, customers, products } = state
  const tickets = settings.serviceTickets || []
  const [showForm, setShowForm] = useState(false)
  const [tab, setTab] = useState('open')
  const [f, setF] = useState({ invoiceId:'', productName:'', issue:'', type:'warranty', customerName:'', customerPhone:'', priority:'medium' })
  const set=(k,v)=>setF(p=>({...p,[k]:v}))

  function createTicket() {
    if (!f.customerName||!f.issue) { toast.show('Customer & issue required','err'); return }
    const t = { ...f, id:uid(), ticketNo:'SRV-'+String(tickets.length+1).padStart(4,'0'), createdOn:today(), status:'open', updates:[{date:today(),note:'Ticket created',by:'System'}] }
    dispatch({ type:'SET_SETTINGS', payload:{ serviceTickets:[t,...tickets] } })
    toast.show('Service ticket: '+t.ticketNo,'ok')
    setShowForm(false); setF({ invoiceId:'',productName:'',issue:'',type:'warranty',customerName:'',customerPhone:'',priority:'medium' })
  }

  function updateTicket(id, status, note) {
    const updated = tickets.map(t=>t.id===id?{...t,status,closedOn:['closed','resolved'].includes(status)?today():t.closedOn,updates:[...(t.updates||[]),{date:today(),note:note||status,by:'You'}]}:t)
    dispatch({ type:'SET_SETTINGS', payload:{ serviceTickets:updated } })
    toast.show('Ticket updated ✓','ok')
  }

  const filtered = tickets.filter(t=>tab==='open'?['open','in_progress'].includes(t.status):tab==='closed'?['closed','resolved'].includes(t.status):true)
  const priorityColor = {high:'var(--red)',medium:'var(--amber)',low:'var(--green)'}

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:18}}>
        <div className="sh" style={{margin:0}}><h2>Warranty & After-Sales</h2><p>Service tickets, warranty claims, repairs</p></div>
        <button className="btn bp" onClick={()=>setShowForm(true)}>+ New Ticket</button>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:18}}>
        {[{l:'Total Tickets',v:tickets.length,c:'var(--blue)'},{l:'Open',v:tickets.filter(t=>t.status==='open').length,c:'var(--amber)'},{l:'In Progress',v:tickets.filter(t=>t.status==='in_progress').length,c:'var(--blue)'},{l:'Resolved',v:tickets.filter(t=>t.status==='resolved'||t.status==='closed').length,c:'var(--green)'}].map(s=>(
          <div key={s.l} className="stat"><div className="stat-v" style={{color:s.c}}>{s.v}</div><div className="stat-l">{s.l}</div></div>
        ))}
      </div>

      <div style={{display:'flex',gap:4,marginBottom:14,borderBottom:'1px solid var(--b1)'}}>
        {[['open','🔴 Open / In Progress'],['closed','✅ Closed'],['all','All']].map(([id,l])=>(
          <button key={id} onClick={()=>setTab(id)} style={{padding:'7px 16px',background:'none',border:'none',borderBottom:tab===id?'2px solid var(--amber)':'2px solid transparent',color:tab===id?'var(--amber)':'var(--t3)',cursor:'pointer',fontSize:12.5,fontWeight:600,marginBottom:-1}}>{l}</button>
        ))}
      </div>

      <div className="card" style={{padding:0}}>
        <table className="tbl">
          <thead><tr><th>Ticket</th><th>Customer</th><th>Product</th><th>Type</th><th>Priority</th><th>Issue</th><th>Date</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {filtered.length===0&&<tr><td colSpan={9}><div className="empty"><p>No tickets</p></div></td></tr>}
            {filtered.map(t=>(
              <tr key={t.id}>
                <td style={{fontFamily:'JetBrains Mono',fontSize:11,color:'var(--amber)'}}>{t.ticketNo}</td>
                <td><div style={{fontWeight:500,fontSize:12.5}}>{t.customerName}</div><div style={{fontSize:10.5,color:'var(--t3)'}}>{t.customerPhone}</div></td>
                <td style={{fontSize:12}}>{t.productName||'—'}</td>
                <td><span style={{padding:'2px 8px',borderRadius:20,fontSize:10,fontWeight:700,background:'var(--bi)',color:'var(--blue)',textTransform:'capitalize'}}>{t.type}</span></td>
                <td><span style={{padding:'2px 8px',borderRadius:20,fontSize:10,fontWeight:700,background:priorityColor[t.priority]+'22',color:priorityColor[t.priority],textTransform:'capitalize'}}>{t.priority}</span></td>
                <td style={{fontSize:11,color:'var(--t2)',maxWidth:150,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.issue}</td>
                <td style={{fontSize:11,color:'var(--t4)'}}>{t.createdOn}</td>
                <td><span style={{padding:'2px 9px',borderRadius:20,fontSize:10,fontWeight:700,background:t.status==='resolved'||t.status==='closed'?'var(--gd)':t.status==='in_progress'?'var(--bi)':'var(--ad)',color:t.status==='resolved'||t.status==='closed'?'var(--green)':t.status==='in_progress'?'var(--blue)':'var(--amber)',textTransform:'capitalize'}}>{t.status?.replace('_',' ')}</span></td>
                <td>
                  {['open','in_progress'].includes(t.status)&&(
                    <div style={{display:'flex',gap:4}}>
                      {t.status==='open'&&<button className="btn bg btn-sm" style={{fontSize:10}} onClick={()=>updateTicket(t.id,'in_progress','Work started')}>Start</button>}
                      <button className="btn btn-sm" style={{background:'var(--gd)',color:'var(--green)',border:'none',fontSize:10}} onClick={()=>updateTicket(t.id,'resolved','Issue resolved')}>Resolve</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm&&(
        <div className="overlay" onClick={e=>e.target===e.currentTarget&&setShowForm(false)}>
          <div className="modal modal-md">
            <div className="mhd"><div className="mt">New Service Ticket</div><button className="xbtn" onClick={()=>setShowForm(false)}>✕</button></div>
            <div className="modal-body">
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div className="fg"><label className="fl">Customer Name *</label><input className="field" value={f.customerName} onChange={e=>set('customerName',e.target.value)}/></div>
                <div className="fg"><label className="fl">Customer Phone</label><input className="field" value={f.customerPhone} onChange={e=>set('customerPhone',e.target.value)}/></div>
                <div className="fg"><label className="fl">Product Name</label><input className="field" value={f.productName} onChange={e=>set('productName',e.target.value)} placeholder="e.g. Blue Shirt XL"/></div>
                <div className="fg"><label className="fl">Invoice (optional)</label>
                  <select className="field" value={f.invoiceId} onChange={e=>set('invoiceId',e.target.value)}>
                    <option value="">No invoice</option>
                    {salesInvoices.map(i=><option key={i.id} value={i.id}>{i.invoiceNumber} — {i.customerName}</option>)}
                  </select>
                </div>
                <div className="fg"><label className="fl">Type</label>
                  <select className="field" value={f.type} onChange={e=>set('type',e.target.value)}>
                    {['warranty','repair','exchange','complaint','alteration','other'].map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="fg"><label className="fl">Priority</label>
                  <select className="field" value={f.priority} onChange={e=>set('priority',e.target.value)}>
                    <option value="high">🔴 High</option>
                    <option value="medium">🟡 Medium</option>
                    <option value="low">🟢 Low</option>
                  </select>
                </div>
              </div>
              <div className="fg"><label className="fl">Issue Description *</label><textarea className="field" style={{minHeight:80}} value={f.issue} onChange={e=>set('issue',e.target.value)} placeholder="Describe the problem in detail…"/></div>
            </div>
            <div className="mft"><button className="btn bg" onClick={()=>setShowForm(false)}>Cancel</button><button className="btn bp" onClick={createTicket}>Create Ticket</button></div>
          </div>
        </div>
      )}
    </div>
  )
}
