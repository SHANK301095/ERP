import { useState, useMemo } from 'react'
import { uid, today } from '../utils/csv.js'

const LEAVE_TYPES = ['Casual Leave','Sick Leave','Earned Leave','Maternity/Paternity','Unpaid Leave','Holiday']

export function LeaveManagement({ state, dispatch, toast }) {
  const { settings } = state
  const employees = settings.employees || []
  const leaves = settings.leaveRequests || []
  const holidays = settings.holidays || []
  const [tab, setTab] = useState('requests')
  const [showForm, setShowForm] = useState(false)
  const [showHoliday, setShowHoliday] = useState(false)
  const [f, setF] = useState({ empId:'', type:'Casual Leave', from:'', to:'', reason:'' })
  const [hf, setHf] = useState({ name:'', date:'', type:'National Holiday' })
  const set=(k,v)=>setF(p=>({...p,[k]:v}))

  function days(from,to){ if(!from||!to)return 0; return Math.max(1,Math.ceil((new Date(to)-new Date(from))/86400000)+1) }

  function applyLeave() {
    if (!f.empId||!f.from||!f.to) { toast.show('Fill all fields','err'); return }
    const emp = employees.find(e=>e.id===f.empId)
    const l = { ...f, id:uid(), empName:emp?.name||'', days:days(f.from,f.to), status:'pending', appliedOn:today() }
    dispatch({ type:'SET_SETTINGS', payload:{ leaveRequests:[l,...leaves] } })
    toast.show('Leave applied ✓','ok')
    setShowForm(false); setF({ empId:'',type:'Casual Leave',from:'',to:'',reason:'' })
  }

  function updateLeave(id, status) {
    const updated = leaves.map(l=>l.id===id?{...l,status,updatedOn:today()}:l)
    dispatch({ type:'SET_SETTINGS', payload:{ leaveRequests:updated } })
    toast.show(status==='approved'?'Leave approved ✓':'Leave rejected','ok')
  }

  function addHoliday() {
    if (!hf.name||!hf.date) { toast.show('Name & date required','err'); return }
    dispatch({ type:'SET_SETTINGS', payload:{ holidays:[...holidays,{...hf,id:uid()}] } })
    toast.show('Holiday added ✓','ok')
    setShowHoliday(false); setHf({ name:'',date:'',type:'National Holiday' })
  }

  const leaveBalance = useMemo(()=>{
    const bal = {}
    employees.forEach(e=>{
      const used = leaves.filter(l=>l.empId===e.id&&l.status==='approved')
      bal[e.id] = {
        casual: 12 - used.filter(l=>l.type==='Casual Leave').reduce((s,l)=>s+l.days,0),
        sick:   12 - used.filter(l=>l.type==='Sick Leave').reduce((s,l)=>s+l.days,0),
        earned: 15 - used.filter(l=>l.type==='Earned Leave').reduce((s,l)=>s+l.days,0),
      }
    })
    return bal
  },[employees,leaves])

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:18}}>
        <div className="sh" style={{margin:0}}><h2>Leave Management</h2><p>Leave requests, approvals & holiday calendar</p></div>
        <div style={{display:'flex',gap:8}}>
          <button className="btn bs btn-sm" onClick={()=>setShowHoliday(true)}>+ Holiday</button>
          <button className="btn bp" onClick={()=>setShowForm(true)}>+ Apply Leave</button>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:18}}>
        {[{l:'Total Requests',v:leaves.length,c:'var(--blue)'},{l:'Pending',v:leaves.filter(l=>l.status==='pending').length,c:'var(--amber)'},{l:'Approved',v:leaves.filter(l=>l.status==='approved').length,c:'var(--green)'},{l:'Holidays',v:holidays.length,c:'var(--purple)'}].map(s=>(
          <div key={s.l} className="stat"><div className="stat-v" style={{color:s.c}}>{s.v}</div><div className="stat-l">{s.l}</div></div>
        ))}
      </div>

      <div style={{display:'flex',gap:4,marginBottom:14,borderBottom:'1px solid var(--b1)'}}>
        {[['requests','📋 Requests'],['balance','📊 Leave Balance'],['holidays','🗓 Holidays']].map(([id,l])=>(
          <button key={id} onClick={()=>setTab(id)} style={{padding:'7px 16px',background:'none',border:'none',borderBottom:tab===id?'2px solid var(--amber)':'2px solid transparent',color:tab===id?'var(--amber)':'var(--t3)',cursor:'pointer',fontSize:12.5,fontWeight:600,marginBottom:-1}}>{l}</button>
        ))}
      </div>

      {tab==='requests'&&(
        <div className="card" style={{padding:0}}>
          <table className="tbl">
            <thead><tr><th>Employee</th><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Reason</th><th>Applied On</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {leaves.length===0&&<tr><td colSpan={9}><div className="empty"><p>No leave requests yet</p></div></td></tr>}
              {leaves.map(l=>(
                <tr key={l.id}>
                  <td style={{fontWeight:500}}>{l.empName}</td>
                  <td style={{fontSize:12}}>{l.type}</td>
                  <td style={{fontFamily:'JetBrains Mono',fontSize:11}}>{l.from}</td>
                  <td style={{fontFamily:'JetBrains Mono',fontSize:11}}>{l.to}</td>
                  <td style={{fontFamily:'JetBrains Mono',fontWeight:700,textAlign:'center',color:'var(--amber)'}}>{l.days}</td>
                  <td style={{fontSize:11,color:'var(--t3)',maxWidth:150,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{l.reason||'—'}</td>
                  <td style={{fontSize:11,color:'var(--t4)'}}>{l.appliedOn}</td>
                  <td><span style={{padding:'2px 9px',borderRadius:20,fontSize:10,fontWeight:700,background:l.status==='approved'?'var(--gd)':l.status==='rejected'?'var(--rd)':'var(--ad)',color:l.status==='approved'?'var(--green)':l.status==='rejected'?'var(--red)':'var(--amber)'}}>{l.status}</span></td>
                  <td>
                    {l.status==='pending'&&(
                      <div style={{display:'flex',gap:5}}>
                        <button className="btn btn-sm" style={{background:'var(--gd)',color:'var(--green)',border:'none',fontSize:10}} onClick={()=>updateLeave(l.id,'approved')}>✓ Approve</button>
                        <button className="btn btn-sm" style={{background:'var(--rd)',color:'var(--red)',border:'none',fontSize:10}} onClick={()=>updateLeave(l.id,'rejected')}>✕ Reject</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab==='balance'&&(
        <div className="card" style={{padding:0}}>
          <table className="tbl">
            <thead><tr><th>Employee</th><th>Department</th><th>Casual Left</th><th>Sick Left</th><th>Earned Left</th></tr></thead>
            <tbody>
              {employees.length===0&&<tr><td colSpan={5}><div className="empty"><p>Add employees in HR & Payroll</p></div></td></tr>}
              {employees.map(e=>{
                const b=leaveBalance[e.id]||{casual:12,sick:12,earned:15}
                return(
                  <tr key={e.id}>
                    <td style={{fontWeight:500}}>{e.name}</td>
                    <td style={{fontSize:12,color:'var(--t3)'}}>{e.department||'—'}</td>
                    {[b.casual,b.sick,b.earned].map((v,i)=>(
                      <td key={i} style={{fontFamily:'JetBrains Mono',fontWeight:700,textAlign:'center',color:v<=2?'var(--red)':v<=5?'var(--amber)':'var(--green)'}}>{v}</td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab==='holidays'&&(
        <div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:10}}>
            {holidays.sort((a,b)=>a.date.localeCompare(b.date)).map(h=>(
              <div key={h.id} style={{background:'var(--bg3)',border:'1px solid var(--b1)',borderRadius:'var(--r)',padding:'12px 14px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>
                  <div style={{fontWeight:600,fontSize:13}}>{h.name}</div>
                  <div style={{fontSize:11,color:'var(--t3)',marginTop:2}}>{h.type}</div>
                </div>
                <div style={{fontFamily:'JetBrains Mono',fontSize:11,color:'var(--amber)',textAlign:'right'}}>{h.date}</div>
              </div>
            ))}
            {holidays.length===0&&<div style={{color:'var(--t4)',fontSize:13,padding:20}}>No holidays added yet. Click "+ Holiday" button.</div>}
          </div>
        </div>
      )}

      {showForm&&(
        <div className="overlay" onClick={e=>e.target===e.currentTarget&&setShowForm(false)}>
          <div className="modal modal-sm">
            <div className="mhd"><div className="mt">Apply Leave</div><button className="xbtn" onClick={()=>setShowForm(false)}>✕</button></div>
            <div className="modal-body">
              <div className="fg"><label className="fl">Employee *</label>
                <select className="field" value={f.empId} onChange={e=>set('empId',e.target.value)}>
                  <option value="">Select Employee</option>
                  {employees.map(e=><option key={e.id} value={e.id}>{e.name} — {e.department}</option>)}
                </select>
              </div>
              <div className="fg"><label className="fl">Leave Type</label>
                <select className="field" value={f.type} onChange={e=>set('type',e.target.value)}>
                  {LEAVE_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div className="fg"><label className="fl">From *</label><input className="field" type="date" value={f.from} onChange={e=>set('from',e.target.value)}/></div>
                <div className="fg"><label className="fl">To *</label><input className="field" type="date" value={f.to} onChange={e=>set('to',e.target.value)}/></div>
              </div>
              {f.from&&f.to&&<div style={{fontSize:12,color:'var(--amber)',fontWeight:600,marginBottom:8}}>Total: {days(f.from,f.to)} days</div>}
              <div className="fg"><label className="fl">Reason</label><textarea className="field" style={{minHeight:60}} value={f.reason} onChange={e=>set('reason',e.target.value)}/></div>
            </div>
            <div className="mft"><button className="btn bg" onClick={()=>setShowForm(false)}>Cancel</button><button className="btn bp" onClick={applyLeave}>Apply Leave</button></div>
          </div>
        </div>
      )}

      {showHoliday&&(
        <div className="overlay" onClick={e=>e.target===e.currentTarget&&setShowHoliday(false)}>
          <div className="modal modal-sm">
            <div className="mhd"><div className="mt">Add Holiday</div><button className="xbtn" onClick={()=>setShowHoliday(false)}>✕</button></div>
            <div className="modal-body">
              <div className="fg"><label className="fl">Holiday Name *</label><input className="field" value={hf.name} onChange={e=>setHf(p=>({...p,name:e.target.value}))} placeholder="e.g. Diwali, Holi, Republic Day"/></div>
              <div className="fg"><label className="fl">Date *</label><input className="field" type="date" value={hf.date} onChange={e=>setHf(p=>({...p,date:e.target.value}))}/></div>
              <div className="fg"><label className="fl">Type</label>
                <select className="field" value={hf.type} onChange={e=>setHf(p=>({...p,type:e.target.value}))}>
                  {['National Holiday','Regional Holiday','Company Holiday','Optional Holiday'].map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="mft"><button className="btn bg" onClick={()=>setShowHoliday(false)}>Cancel</button><button className="btn bp" onClick={addHoliday}>Add Holiday</button></div>
          </div>
        </div>
      )}
    </div>
  )
}
