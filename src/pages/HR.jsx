import { useState } from 'react'
import { uid, today, downloadCSV } from '../utils/csv.js'

export function HR({ state, dispatch, toast }) {
  const employees = state.settings.employees || []
  const attendance = state.settings.attendance || []
  const [tab, setTab] = useState('employees')
  const [showForm, setShowForm] = useState(false)
  const [showSalary, setShowSalary] = useState(null)
  const [attMonth, setAttMonth] = useState(new Date().toISOString().slice(0,7))
  const [f, setF] = useState({ name:'', phone:'', role:'Staff', salary:0, joinDate:today(), department:'Sales', bankAccount:'', ifsc:'' })
  const set = (k,v) => setF(p=>({...p,[k]:v}))

  function saveEmp() {
    if (!f.name) { toast.show('Name required','err'); return }
    const newEmps = [...employees, { ...f, id:uid(), salary:+f.salary }]
    dispatch({ type:'SET_SETTINGS', payload:{ employees: newEmps } })
    toast.show('Employee added ✓','ok'); setShowForm(false)
    setF({ name:'', phone:'', role:'Staff', salary:0, joinDate:today(), department:'Sales', bankAccount:'', ifsc:'' })
  }

  function markAttendance(empId, date, status) {
    const existing = attendance.find(a=>a.empId===empId&&a.date===date)
    let newAtt
    if (existing) newAtt = attendance.map(a=>a.empId===empId&&a.date===date?{...a,status}:a)
    else newAtt = [...attendance, { id:uid(), empId, date, status }]
    dispatch({ type:'SET_SETTINGS', payload:{ attendance: newAtt } })
  }

  function getAttStatus(empId, date) {
    return attendance.find(a=>a.empId===empId&&a.date===date)?.status||'absent'
  }

  // Days in month
  const [year, mon] = attMonth.split('-').map(Number)
  const daysInMonth = new Date(year, mon, 0).getDate()
  const days = Array.from({length:daysInMonth},(_,i)=>String(i+1).padStart(2,'0'))

  function empMonthStats(empId) {
    const present = attendance.filter(a=>a.empId===empId&&(a.date||'').startsWith(attMonth)&&a.status==='present').length
    const halfDay = attendance.filter(a=>a.empId===empId&&(a.date||'').startsWith(attMonth)&&a.status==='half').length
    const leave   = attendance.filter(a=>a.empId===empId&&(a.date||'').startsWith(attMonth)&&a.status==='leave').length
    const total = present + halfDay*0.5
    const emp = employees.find(e=>e.id===empId)
    const salary = emp ? ((emp.salary/daysInMonth)*total) : 0
    return { present, halfDay, leave, payable: salary }
  }

  const statusColors = { present:'var(--green)', absent:'var(--bg4)', half:'var(--amber)', leave:'var(--blue)' }
  const statusBg     = { present:'var(--gd)', absent:'var(--bg4)', half:'var(--ad)', leave:'var(--bi)' }

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:18}}>
        <div className="sh" style={{margin:0}}><h2>HR & Payroll</h2><p>Employees, attendance, salary</p></div>
        <button className="btn bp" onClick={()=>setShowForm(true)}>+ Add Employee</button>
      </div>

      <div style={{display:'flex',gap:4,marginBottom:16,borderBottom:'1px solid var(--b1)'}}>
        {[['employees','👥 Employees'],['attendance','📅 Attendance'],['payroll','💰 Payroll']].map(([id,l])=>(
          <button key={id} onClick={()=>setTab(id)} style={{padding:'7px 16px',background:'none',border:'none',borderBottom:tab===id?'2px solid var(--amber)':'2px solid transparent',color:tab===id?'var(--amber)':'var(--t3)',cursor:'pointer',fontSize:13,fontWeight:600,marginBottom:-1}}>{l}</button>
        ))}
      </div>

      {tab==='employees'&&(
        <div className="card" style={{padding:0}}>
          <table className="tbl">
            <thead><tr><th>Name</th><th>Role</th><th>Department</th><th>Phone</th><th>Salary/Month</th><th>Join Date</th><th>Actions</th></tr></thead>
            <tbody>
              {employees.length===0&&<tr><td colSpan={7}><div className="empty"><p>No employees yet. Add your first employee.</p></div></td></tr>}
              {employees.map(e=>(
                <tr key={e.id}>
                  <td style={{fontWeight:600}}>{e.name}</td>
                  <td><span className="badge bb" style={{fontSize:10}}>{e.role}</span></td>
                  <td style={{color:'var(--t3)',fontSize:12}}>{e.department}</td>
                  <td style={{fontFamily:'JetBrains Mono',fontSize:12}}>{e.phone||'—'}</td>
                  <td style={{fontFamily:'JetBrains Mono',fontWeight:700,color:'var(--amber)'}}>₹{e.salary?.toLocaleString('en-IN')}</td>
                  <td style={{color:'var(--t3)',fontSize:11.5}}>{e.joinDate}</td>
                  <td>
                    <button className="btn bg btn-sm" onClick={()=>setShowSalary(e)}>Payslip</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab==='attendance'&&(
        <div>
          <div style={{display:'flex',gap:10,alignItems:'center',marginBottom:14}}>
            <input className="field" type="month" value={attMonth} onChange={e=>setAttMonth(e.target.value)} style={{width:160}}/>
            <div style={{display:'flex',gap:8}}>
              {[['present','P','var(--gd)','var(--green)'],['half','H','var(--ad)','var(--amber)'],['leave','L','var(--bi)','var(--blue)'],['absent','A','var(--bg4)','var(--t4)']].map(([s,l,bg,c])=>(
                <span key={s} style={{fontSize:11,display:'flex',alignItems:'center',gap:4,color:'var(--t3)'}}>
                  <span style={{width:18,height:18,borderRadius:4,background:bg,color:c,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700}}>{l}</span>{s}
                </span>
              ))}
            </div>
          </div>
          <div style={{overflowX:'auto'}}>
            <table className="tbl" style={{minWidth:900}}>
              <thead>
                <tr>
                  <th style={{position:'sticky',left:0,background:'var(--bg2)',zIndex:1,minWidth:140}}>Employee</th>
                  {days.map(d=><th key={d} style={{padding:'6px 4px',fontSize:10,textAlign:'center',minWidth:28}}>{d}</th>)}
                  <th style={{minWidth:60}}>Present</th>
                  <th style={{minWidth:70}}>Payable</th>
                </tr>
              </thead>
              <tbody>
                {employees.length===0&&<tr><td colSpan={daysInMonth+3}><div className="empty"><p>No employees</p></div></td></tr>}
                {employees.map(e=>{
                  const s=empMonthStats(e.id)
                  return(
                    <tr key={e.id}>
                      <td style={{position:'sticky',left:0,background:'var(--bg2)',fontWeight:600,fontSize:12.5}}>{e.name}</td>
                      {days.map(d=>{
                        const date=`${attMonth}-${d}`
                        const st=getAttStatus(e.id,date)
                        return(
                          <td key={d} style={{padding:'3px 2px',textAlign:'center'}}>
                            <div onClick={()=>{const order=['absent','present','half','leave'];const idx=order.indexOf(st);markAttendance(e.id,date,order[(idx+1)%4])}}
                              style={{width:24,height:24,borderRadius:4,background:statusBg[st],color:statusColors[st],display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700,cursor:'pointer',margin:'0 auto',transition:'all .1s',border:`1px solid ${st!=='absent'?statusColors[st]:'transparent'}`}}>
                              {st==='present'?'P':st==='half'?'H':st==='leave'?'L':''}
                            </div>
                          </td>
                        )
                      })}
                      <td style={{fontFamily:'JetBrains Mono',fontWeight:700,textAlign:'center',color:'var(--green)'}}>{s.present}+{s.halfDay/2}</td>
                      <td style={{fontFamily:'JetBrains Mono',fontWeight:700,color:'var(--amber)'}}>₹{s.payable.toLocaleString('en-IN',{maximumFractionDigits:0})}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div style={{fontSize:11.5,color:'var(--t4)',marginTop:8}}>💡 Click any cell to toggle: Absent → Present → Half Day → Leave</div>
        </div>
      )}

      {tab==='payroll'&&(
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <input className="field" type="month" value={attMonth} onChange={e=>setAttMonth(e.target.value)} style={{width:160}}/>
            <button className="btn bs btn-sm" onClick={()=>{
              const rows=[['Employee','Role','Salary/Month','Days Present','Half Days','Net Payable'],...employees.map(e=>{const s=empMonthStats(e.id);return[e.name,e.role,e.salary,s.present,s.halfDay,s.payable.toFixed(0)]})]
              downloadCSV(`Payroll_${attMonth}.csv`,rows)
              toast.show('Payroll CSV exported ✓','ok')
            }}>⬇ Export Payroll</button>
          </div>
          <div className="card" style={{padding:0}}>
            <table className="tbl">
              <thead><tr><th>Employee</th><th>Role</th><th>Monthly Salary</th><th>Days Present</th><th>Half Days</th><th>Net Payable</th><th>Status</th></tr></thead>
              <tbody>
                {employees.length===0&&<tr><td colSpan={7}><div className="empty"><p>No employees</p></div></td></tr>}
                {employees.map(e=>{
                  const s=empMonthStats(e.id)
                  return(
                    <tr key={e.id}>
                      <td style={{fontWeight:600}}>{e.name}</td>
                      <td style={{color:'var(--t3)',fontSize:12}}>{e.role}</td>
                      <td style={{fontFamily:'JetBrains Mono'}}>₹{e.salary?.toLocaleString('en-IN')}</td>
                      <td style={{fontFamily:'JetBrains Mono',textAlign:'center',color:'var(--green)',fontWeight:700}}>{s.present}</td>
                      <td style={{fontFamily:'JetBrains Mono',textAlign:'center',color:'var(--amber)'}}>{s.halfDay}</td>
                      <td style={{fontFamily:'JetBrains Mono',fontWeight:800,color:'var(--amber)',fontSize:14}}>₹{s.payable.toLocaleString('en-IN',{maximumFractionDigits:0})}</td>
                      <td><span className="badge bi">Pending</span></td>
                    </tr>
                  )
                })}
                {employees.length>0&&(
                  <tr style={{background:'var(--bg3)'}}>
                    <td colSpan={5} style={{fontWeight:700,textAlign:'right'}}>Total Payroll</td>
                    <td style={{fontFamily:'JetBrains Mono',fontWeight:800,color:'var(--amber)',fontSize:15}}>₹{employees.reduce((s,e)=>s+empMonthStats(e.id).payable,0).toLocaleString('en-IN',{maximumFractionDigits:0})}</td>
                    <td/>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payslip Modal */}
      {showSalary&&(()=>{
        const s=empMonthStats(showSalary.id)
        return(
          <div className="overlay" onClick={e=>e.target===e.currentTarget&&setShowSalary(null)}>
            <div className="modal modal-sm">
              <div className="mhd"><div className="mt">Payslip — {showSalary.name}</div><button className="xbtn" onClick={()=>setShowSalary(null)}>✕</button></div>
              <div className="modal-body" style={{fontFamily:'JetBrains Mono',fontSize:13}}>
                <div style={{textAlign:'center',marginBottom:16,paddingBottom:12,borderBottom:'1px solid var(--b1)'}}>
                  <div style={{fontFamily:'Syne',fontWeight:800,fontSize:16,color:'var(--amber)'}}>{state.settings.brandName}</div>
                  <div style={{fontSize:11,color:'var(--t3)',marginTop:2}}>SALARY SLIP — {attMonth}</div>
                </div>
                <div style={{fontSize:12,color:'var(--t3)',marginBottom:12}}>Employee: <strong style={{color:'var(--t1)'}}>{showSalary.name}</strong> · {showSalary.role}</div>
                {[['Monthly CTC',`₹${showSalary.salary?.toLocaleString('en-IN')}`],['Days in Month',daysInMonth],['Days Present',s.present],['Half Days',s.halfDay],['Leave',s.leave],['Working Days',`${s.present+s.halfDay*0.5}`]].map(([k,v])=>(
                  <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:'1px solid var(--b1)',fontSize:12}}>
                    <span style={{color:'var(--t3)'}}>{k}</span><span style={{color:'var(--t2)'}}>{v}</span>
                  </div>
                ))}
                <div style={{display:'flex',justifyContent:'space-between',padding:'12px 0',fontSize:15,fontWeight:700,color:'var(--amber)'}}>
                  <span>Net Payable</span><span>₹{s.payable.toLocaleString('en-IN',{maximumFractionDigits:0})}</span>
                </div>
              </div>
              <div className="mft">
                <button className="btn bg" onClick={()=>setShowSalary(null)}>Close</button>
                <button className="btn bp" onClick={()=>window.print()}>🖨 Print</button>
              </div>
            </div>
          </div>
        )
      })()}

      {showForm&&(
        <div className="overlay" onClick={e=>e.target===e.currentTarget&&setShowForm(false)}>
          <div className="modal modal-md">
            <div className="mhd"><div className="mt">Add Employee</div><button className="xbtn" onClick={()=>setShowForm(false)}>✕</button></div>
            <div className="modal-body">
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div className="fg"><label className="fl">Full Name *</label><input className="field" value={f.name} onChange={e=>set('name',e.target.value)} autoFocus/></div>
                <div className="fg"><label className="fl">Phone</label><input className="field" value={f.phone} onChange={e=>set('phone',e.target.value)}/></div>
                <div className="fg"><label className="fl">Role</label>
                  <select className="field" value={f.role} onChange={e=>set('role',e.target.value)}>
                    {['Owner','Manager','Sales Staff','Tailor','Helper','Driver','Accountant','Security'].map(r=><option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="fg"><label className="fl">Department</label>
                  <select className="field" value={f.department} onChange={e=>set('department',e.target.value)}>
                    {['Sales','Purchase','Manufacturing','Accounts','Operations','Delivery'].map(d=><option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="fg"><label className="fl">Monthly Salary (₹)</label><input className="field" type="number" value={f.salary} onChange={e=>set('salary',e.target.value)}/></div>
                <div className="fg"><label className="fl">Join Date</label><input className="field" type="date" value={f.joinDate} onChange={e=>set('joinDate',e.target.value)}/></div>
                <div className="fg"><label className="fl">Bank Account</label><input className="field" style={{fontFamily:'JetBrains Mono'}} value={f.bankAccount} onChange={e=>set('bankAccount',e.target.value)}/></div>
                <div className="fg"><label className="fl">IFSC Code</label><input className="field" style={{fontFamily:'JetBrains Mono',textTransform:'uppercase'}} value={f.ifsc} onChange={e=>set('ifsc',e.target.value.toUpperCase())}/></div>
              </div>
            </div>
            <div className="mft">
              <button className="btn bg" onClick={()=>setShowForm(false)}>Cancel</button>
              <button className="btn bp" onClick={saveEmp}>Add Employee</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
