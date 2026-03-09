import { useState } from 'react'
import { uid, today } from '../utils/csv.js'

const PRIORITIES = { high:'var(--red)', medium:'var(--amber)', low:'var(--green)' }

export function Tasks({ state, dispatch, toast }) {
  const tasks = state.settings.tasks || []
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState('all')
  const [f, setF] = useState({ title:'', description:'', priority:'medium', dueDate:'', assignee:'', category:'General', done:false })
  const set = (k,v) => setF(p=>({...p,[k]:v}))

  function save() {
    if (!f.title) { toast.show('Title required','err'); return }
    const newTasks = [{ ...f, id:uid(), createdAt:today() }, ...tasks]
    dispatch({ type:'SET_SETTINGS', payload:{ tasks: newTasks } })
    toast.show('Task added ✓','ok'); setShowForm(false)
    setF({ title:'', description:'', priority:'medium', dueDate:'', assignee:'', category:'General', done:false })
  }

  function toggle(id) {
    dispatch({ type:'SET_SETTINGS', payload:{ tasks: tasks.map(t=>t.id===id?{...t,done:!t.done,completedAt:!t.done?today():null}:t) } })
  }

  function del(id) {
    dispatch({ type:'SET_SETTINGS', payload:{ tasks: tasks.filter(t=>t.id!==id) } })
  }

  const filtered = tasks.filter(t => filter==='all' ? true : filter==='done' ? t.done : filter==='pending' ? !t.done : t.priority===filter)
  const overdue = tasks.filter(t=>!t.done&&t.dueDate&&t.dueDate<today()).length

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:18}}>
        <div className="sh" style={{margin:0}}><h2>Tasks & To-Do</h2><p>Business task management</p></div>
        <button className="btn bp" onClick={()=>setShowForm(true)}>+ Add Task</button>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:18}}>
        {[
          {l:'Total',v:tasks.length,c:'var(--t2)'},
          {l:'Pending',v:tasks.filter(t=>!t.done).length,c:'var(--amber)'},
          {l:'Completed',v:tasks.filter(t=>t.done).length,c:'var(--green)'},
          {l:'Overdue',v:overdue,c:'var(--red)'},
        ].map(s=><div key={s.l} className="stat"><div className="stat-v" style={{color:s.c,fontSize:20}}>{s.v}</div><div className="stat-l">{s.l}</div></div>)}
      </div>

      <div style={{display:'flex',gap:6,marginBottom:14,flexWrap:'wrap'}}>
        {[['all','All'],['pending','Pending'],['done','Completed'],['high','🔴 High'],['medium','🟡 Medium'],['low','🟢 Low']].map(([v,l])=>(
          <button key={v} onClick={()=>setFilter(v)} className={`pill ${filter===v?'on':''}`}>{l}</button>
        ))}
      </div>

      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {filtered.length===0&&<div className="card" style={{textAlign:'center',color:'var(--t4)',padding:'30px',fontSize:13}}>No tasks. Add your first task!</div>}
        {filtered.map(t=>{
          const isOverdue = !t.done&&t.dueDate&&t.dueDate<today()
          return(
            <div key={t.id} className="card" style={{padding:'12px 16px',opacity:t.done?0.6:1,borderLeft:`3px solid ${PRIORITIES[t.priority]||'var(--b1)'}`}}>
              <div style={{display:'flex',alignItems:'flex-start',gap:10}}>
                <input type="checkbox" checked={t.done} onChange={()=>toggle(t.id)} style={{marginTop:3,width:16,height:16,cursor:'pointer',accentColor:'var(--amber)'}}/>
                <div style={{flex:1}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
                    <span style={{fontWeight:600,fontSize:13.5,textDecoration:t.done?'line-through':'none',color:t.done?'var(--t4)':'var(--t1)'}}>{t.title}</span>
                    <span style={{fontSize:10,fontWeight:700,color:PRIORITIES[t.priority],background:'var(--bg4)',padding:'1px 7px',borderRadius:20}}>{t.priority?.toUpperCase()}</span>
                    {t.category&&<span style={{fontSize:10,color:'var(--t4)',background:'var(--bg3)',padding:'1px 7px',borderRadius:20}}>{t.category}</span>}
                  </div>
                  {t.description&&<div style={{fontSize:12,color:'var(--t3)',marginBottom:4}}>{t.description}</div>}
                  <div style={{display:'flex',gap:12,fontSize:11,color:'var(--t4)'}}>
                    {t.dueDate&&<span style={{color:isOverdue?'var(--red)':'var(--t4)',fontWeight:isOverdue?700:400}}>{isOverdue?'⚠ Overdue: ':''}{t.dueDate}</span>}
                    {t.assignee&&<span>👤 {t.assignee}</span>}
                    {t.done&&t.completedAt&&<span>✓ Done {t.completedAt}</span>}
                  </div>
                </div>
                <button onClick={()=>del(t.id)} style={{background:'none',border:'none',color:'var(--t4)',cursor:'pointer',fontSize:14,padding:'0 4px'}}>✕</button>
              </div>
            </div>
          )
        })}
      </div>

      {showForm&&(
        <div className="overlay" onClick={e=>e.target===e.currentTarget&&setShowForm(false)}>
          <div className="modal modal-sm">
            <div className="mhd"><div className="mt">Add Task</div><button className="xbtn" onClick={()=>setShowForm(false)}>✕</button></div>
            <div className="modal-body">
              <div className="fg"><label className="fl">Task Title *</label><input className="field" value={f.title} onChange={e=>set('title',e.target.value)} autoFocus placeholder="e.g. Follow up with Ramesh ji"/></div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div className="fg"><label className="fl">Priority</label>
                  <select className="field" value={f.priority} onChange={e=>set('priority',e.target.value)}>
                    <option value="high">🔴 High</option><option value="medium">🟡 Medium</option><option value="low">🟢 Low</option>
                  </select>
                </div>
                <div className="fg"><label className="fl">Due Date</label><input className="field" type="date" value={f.dueDate} onChange={e=>set('dueDate',e.target.value)}/></div>
                <div className="fg"><label className="fl">Category</label>
                  <select className="field" value={f.category} onChange={e=>set('category',e.target.value)}>
                    {['General','Follow-up','Purchase','Delivery','Payment','Stock','Admin'].map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="fg"><label className="fl">Assignee</label><input className="field" value={f.assignee} onChange={e=>set('assignee',e.target.value)} placeholder="Staff name"/></div>
              </div>
              <div className="fg"><label className="fl">Description</label><textarea className="field" style={{minHeight:60}} value={f.description} onChange={e=>set('description',e.target.value)}/></div>
            </div>
            <div className="mft">
              <button className="btn bg" onClick={()=>setShowForm(false)}>Cancel</button>
              <button className="btn bp" onClick={save}>Add Task</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
