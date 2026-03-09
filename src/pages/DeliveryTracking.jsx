import { useState } from 'react'
import { uid, today } from '../utils/csv.js'

const COURIERS = ['Delhivery','DTDC','BlueDart','Ekart','XpressBees','Shadowfax','Amazon Logistics','Shiprocket','India Post','Self Delivery']
const STATUSES = ['pending','packed','dispatched','in_transit','out_for_delivery','delivered','returned','failed']
const STATUS_COLOR = {pending:'var(--t4)',packed:'var(--blue)',dispatched:'var(--amber)',in_transit:'var(--amber)',out_for_delivery:'#c084fc',delivered:'var(--green)',returned:'var(--red)',failed:'var(--red)'}

export function DeliveryTracking({ state, dispatch, toast }) {
  const { salesInvoices, customers, settings } = state
  const deliveries = settings.deliveries || []
  const [tab, setTab] = useState('active')
  const [showForm, setShowForm] = useState(false)
  const [showDetail, setShowDetail] = useState(null)
  const [search, setSearch] = useState('')
  const [f, setF] = useState({ invoiceId:'', courierId:'', awb:'', expectedDate:'', address:'', notes:'' })
  const set = (k,v) => setF(p=>({...p,[k]:v}))

  function createDelivery() {
    if (!f.invoiceId || !f.awb) { toast.show('Invoice & AWB required','err'); return }
    const inv = salesInvoices.find(i=>i.id===f.invoiceId)
    const d = { ...f, id:uid(), deliveryNo:'DEL-'+String(deliveries.length+1).padStart(4,'0'), date:today(),
      customerName:inv?.customerName||'', customerPhone:inv?.customerPhone||'',
      invoiceNo:inv?.invoiceNumber||'', amount:inv?.grandTotal||0,
      status:'packed', timeline:[{status:'packed',date:today(),note:'Order packed'}] }
    dispatch({ type:'SET_SETTINGS', payload:{ deliveries:[d,...deliveries] } })
    toast.show('Delivery created: '+d.deliveryNo,'ok')
    setShowForm(false); setF({ invoiceId:'',courierId:'',awb:'',expectedDate:'',address:'',notes:'' })
  }

  function updateStatus(id, newStatus, note='') {
    const updated = deliveries.map(d=>d.id===id?{...d,status:newStatus,timeline:[...(d.timeline||[]),{status:newStatus,date:today(),note:note||newStatus}]}:d)
    dispatch({ type:'SET_SETTINGS', payload:{ deliveries:updated } })
    toast.show('Status updated: '+newStatus,'ok')
    if(showDetail?.id===id) setShowDetail(updated.find(d=>d.id===id))
  }

  const statusFlow = ['pending','packed','dispatched','in_transit','out_for_delivery','delivered']
  const filtered = deliveries.filter(d=>{
    const matchSearch = !search || d.deliveryNo?.includes(search) || d.customerName?.toLowerCase().includes(search.toLowerCase()) || d.awb?.includes(search)
    if (tab==='active') return matchSearch && !['delivered','returned','failed'].includes(d.status)
    if (tab==='delivered') return matchSearch && d.status==='delivered'
    if (tab==='failed') return matchSearch && ['returned','failed'].includes(d.status)
    return matchSearch
  })

  const stats = { total:deliveries.length, active:deliveries.filter(d=>!['delivered','returned','failed'].includes(d.status)).length, delivered:deliveries.filter(d=>d.status==='delivered').length, failed:deliveries.filter(d=>['returned','failed'].includes(d.status)).length }
  const unassigned = salesInvoices.filter(inv=>inv.status!=='cancelled'&&!deliveries.find(d=>d.invoiceId===inv.id))

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:18}}>
        <div className="sh" style={{margin:0}}><h2>Delivery Tracking</h2><p>Courier tracking, AWB, delivery status</p></div>
        <button className="btn bp" onClick={()=>setShowForm(true)}>+ Create Delivery</button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:18}}>
        {[{l:'Total',v:stats.total,c:'var(--blue)'},{l:'Active',v:stats.active,c:'var(--amber)'},{l:'Delivered',v:stats.delivered,c:'var(--green)'},{l:'Failed/Return',v:stats.failed,c:'var(--red)'}].map(s=>(
          <div key={s.l} className="stat"><div className="stat-v" style={{color:s.c}}>{s.v}</div><div className="stat-l">{s.l}</div></div>
        ))}
      </div>
      <div style={{display:'flex',gap:8,marginBottom:14,alignItems:'center'}}>
        {[['active','🚚 Active'],['delivered','✅ Delivered'],['failed','❌ Failed/Return'],['all','All']].map(([id,l])=>(
          <button key={id} onClick={()=>setTab(id)} style={{padding:'6px 14px',background:'none',border:'none',borderBottom:tab===id?'2px solid var(--amber)':'2px solid transparent',color:tab===id?'var(--amber)':'var(--t3)',cursor:'pointer',fontSize:12.5,fontWeight:600}}>{l}</button>
        ))}
        <input className="field" placeholder="Search AWB / customer…" value={search} onChange={e=>setSearch(e.target.value)} style={{marginLeft:'auto',maxWidth:220}}/>
      </div>
      <div className="card" style={{padding:0}}>
        <table className="tbl">
          <thead><tr><th>Del. No.</th><th>Invoice</th><th>Customer</th><th>Courier</th><th>AWB</th><th>Expected</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.length===0&&<tr><td colSpan={8}><div className="empty"><p>No deliveries found</p></div></td></tr>}
            {filtered.map(d=>(
              <tr key={d.id}>
                <td style={{fontFamily:'JetBrains Mono',fontSize:11,color:'var(--amber)'}}>{d.deliveryNo}</td>
                <td style={{fontSize:11,color:'var(--t3)'}}>{d.invoiceNo}</td>
                <td><div style={{fontWeight:500,fontSize:12.5}}>{d.customerName}</div><div style={{fontSize:10.5,color:'var(--t3)'}}>{d.customerPhone}</div></td>
                <td style={{fontSize:12}}>{d.courierId||'—'}</td>
                <td style={{fontFamily:'JetBrains Mono',fontSize:11,color:'var(--blue)'}}>{d.awb}</td>
                <td style={{fontSize:11,color:'var(--t3)'}}>{d.expectedDate||'—'}</td>
                <td><span style={{padding:'2px 9px',borderRadius:20,fontSize:10,fontWeight:700,background:STATUS_COLOR[d.status]+'22',color:STATUS_COLOR[d.status],textTransform:'capitalize'}}>{d.status?.replace(/_/g,' ')}</span></td>
                <td>
                  <div style={{display:'flex',gap:5}}>
                    <button className="btn bg btn-sm" onClick={()=>setShowDetail(d)}>Track</button>
                    {d.status!=='delivered'&&d.status!=='returned'&&(
                      <select className="field" style={{padding:'3px 6px',fontSize:11,height:'auto'}} value={d.status} onChange={e=>updateStatus(d.id,e.target.value)}>
                        {STATUSES.map(s=><option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
                      </select>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm&&(
        <div className="overlay" onClick={e=>e.target===e.currentTarget&&setShowForm(false)}>
          <div className="modal modal-md">
            <div className="mhd"><div className="mt">Create Delivery</div><button className="xbtn" onClick={()=>setShowForm(false)}>✕</button></div>
            <div className="modal-body">
              <div className="fg"><label className="fl">Invoice *</label>
                <select className="field" value={f.invoiceId} onChange={e=>set('invoiceId',e.target.value)}>
                  <option value="">Select Invoice</option>
                  {unassigned.map(i=><option key={i.id} value={i.id}>{i.invoiceNumber} — {i.customerName} — ₹{i.grandTotal?.toLocaleString('en-IN')}</option>)}
                </select>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div className="fg"><label className="fl">Courier</label>
                  <select className="field" value={f.courierId} onChange={e=>set('courierId',e.target.value)}>
                    <option value="">Select Courier</option>
                    {COURIERS.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="fg"><label className="fl">AWB / Tracking No. *</label><input className="field" style={{fontFamily:'JetBrains Mono',textTransform:'uppercase'}} value={f.awb} onChange={e=>set('awb',e.target.value.toUpperCase())}/></div>
                <div className="fg"><label className="fl">Expected Delivery</label><input className="field" type="date" value={f.expectedDate} onChange={e=>set('expectedDate',e.target.value)}/></div>
              </div>
              <div className="fg"><label className="fl">Delivery Address</label><textarea className="field" style={{minHeight:60}} value={f.address} onChange={e=>set('address',e.target.value)}/></div>
            </div>
            <div className="mft"><button className="btn bg" onClick={()=>setShowForm(false)}>Cancel</button><button className="btn bp" onClick={createDelivery}>Create Delivery</button></div>
          </div>
        </div>
      )}

      {showDetail&&(
        <div className="overlay" onClick={e=>e.target===e.currentTarget&&setShowDetail(null)}>
          <div className="modal modal-md">
            <div className="mhd"><div className="mt">Tracking — {showDetail.deliveryNo}</div><button className="xbtn" onClick={()=>setShowDetail(null)}>✕</button></div>
            <div className="modal-body">
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16,fontSize:12.5}}>
                <div><strong>Customer:</strong> {showDetail.customerName}</div>
                <div><strong>AWB:</strong> <span style={{fontFamily:'JetBrains Mono',color:'var(--blue)'}}>{showDetail.awb}</span></div>
                <div><strong>Courier:</strong> {showDetail.courierId||'—'}</div>
                <div><strong>Expected:</strong> {showDetail.expectedDate||'—'}</div>
              </div>
              {showDetail.address&&<div style={{background:'var(--bg3)',borderRadius:'var(--r)',padding:'10px 14px',fontSize:12,color:'var(--t2)',marginBottom:16}}>📍 {showDetail.address}</div>}
              <div style={{fontFamily:'Syne',fontWeight:700,fontSize:12.5,marginBottom:12,color:'var(--amber)'}}>Tracking Timeline</div>
              <div style={{position:'relative',paddingLeft:20}}>
                <div style={{position:'absolute',left:7,top:8,bottom:8,width:2,background:'var(--b1)'}}/>
                {(showDetail.timeline||[]).map((t,i)=>(
                  <div key={i} style={{position:'relative',marginBottom:14}}>
                    <div style={{position:'absolute',left:-17,top:4,width:10,height:10,borderRadius:'50%',background:STATUS_COLOR[t.status]||'var(--amber)',border:'2px solid var(--bg2)'}}/>
                    <div style={{fontWeight:600,fontSize:12.5,color:'var(--t1)',textTransform:'capitalize'}}>{t.status?.replace(/_/g,' ')}</div>
                    <div style={{fontSize:11,color:'var(--t3)'}}>{t.date} — {t.note}</div>
                  </div>
                ))}
              </div>
              {!['delivered','returned','failed'].includes(showDetail.status)&&(
                <div style={{marginTop:14,paddingTop:14,borderTop:'1px solid var(--b1)'}}>
                  <div style={{fontWeight:600,fontSize:12.5,marginBottom:8}}>Update Status:</div>
                  <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                    {statusFlow.slice(statusFlow.indexOf(showDetail.status)+1).map(s=>(
                      <button key={s} className="btn bs btn-sm" style={{textTransform:'capitalize'}} onClick={()=>updateStatus(showDetail.id,s)}>{s.replace(/_/g,' ')}</button>
                    ))}
                    <button className="btn btn-sm" style={{background:'var(--rd)',color:'var(--red)',border:'none'}} onClick={()=>updateStatus(showDetail.id,'returned','Customer returned')}>Returned</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
