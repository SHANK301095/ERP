import { useState } from 'react'
import { uid, today } from '../utils/csv.js'

const ROLES = {
  admin:   { label: 'Admin',   color: 'var(--amber)', desc: 'Full access to everything', perms: ['all'] },
  manager: { label: 'Manager', color: 'var(--blue)',  desc: 'All modules except Settings & Users', perms: ['dashboard','products','inventory','sales','purchase','customers','suppliers','reports','gst'] },
  staff:   { label: 'Staff',   color: 'var(--green)', desc: 'POS, Sales, Inventory view only', perms: ['pos','sales','inventory','customers'] },
  viewer:  { label: 'Viewer',  color: 'var(--purple)','desc': 'Read-only access to reports', perms: ['dashboard','reports'] },
}

const BLANK = { name:'', email:'', phone:'', role:'staff', pin:'', active:true }

export function Users({ state, dispatch, toast }) {
  const users = state.settings.users || [{ id:'u1', name: state.settings.brandName + ' Admin', email:'admin@example.com', role:'admin', active:true, createdAt: today() }]
  const [showForm, setShowForm] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [f, setF] = useState(BLANK)
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  function openAdd()  { setF(BLANK); setEditUser(null); setShowForm(true) }
  function openEdit(u){ setF({ ...u }); setEditUser(u.id); setShowForm(true) }

  function save() {
    if (!f.name || !f.role) { toast.show('Name & Role required', 'err'); return }
    const newUsers = editUser
      ? users.map(u => u.id === editUser ? { ...u, ...f } : u)
      : [...users, { ...f, id: uid(), createdAt: today() }]
    dispatch({ type: 'SET_SETTINGS', payload: { users: newUsers } })
    toast.show(editUser ? 'User updated' : 'User added', 'ok')
    setShowForm(false)
  }

  function del(id) {
    if (!window.confirm('Remove this user?')) return
    dispatch({ type: 'SET_SETTINGS', payload: { users: users.filter(u => u.id !== id) } })
    toast.show('User removed', 'ok')
  }

  function toggle(id) {
    const newUsers = users.map(u => u.id === id ? { ...u, active: !u.active } : u)
    dispatch({ type: 'SET_SETTINGS', payload: { users: newUsers } })
  }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:18 }}>
        <div className="sh" style={{ margin:0 }}><h2>Users & Roles</h2><p>Manage staff access and permissions</p></div>
        <button className="btn bp" onClick={openAdd}>+ Add User</button>
      </div>

      {/* Role Cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:20 }}>
        {Object.entries(ROLES).map(([k,r]) => {
          const count = users.filter(u => u.role === k).length
          return (
            <div key={k} className="card" style={{ borderColor: count > 0 ? r.color + '44' : 'var(--b1)', padding:'14px 16px' }}>
              <div style={{ fontFamily:'Syne', fontWeight:700, fontSize:12, color: r.color, marginBottom:4 }}>{r.label.toUpperCase()}</div>
              <div style={{ fontFamily:'Syne', fontWeight:800, fontSize:26, color:'var(--t1)', marginBottom:4 }}>{count}</div>
              <div style={{ fontSize:11, color:'var(--t3)', lineHeight:1.4 }}>{r.desc}</div>
            </div>
          )
        })}
      </div>

      <div className="card" style={{ padding:0 }}>
        <table className="tbl">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Added</th><th>Actions</th></tr></thead>
          <tbody>
            {users.map(u => {
              const role = ROLES[u.role] || ROLES.viewer
              return (
                <tr key={u.id}>
                  <td style={{ fontWeight:600, color:'var(--t1)' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:30, height:30, borderRadius:'50%', background:`${role.color}22`, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Syne', fontWeight:800, fontSize:12, color:role.color }}>
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      {u.name}
                    </div>
                  </td>
                  <td style={{ color:'var(--t3)', fontSize:12 }}>{u.email || '—'}</td>
                  <td><span className="badge" style={{ background:`${role.color}18`, color:role.color }}>{role.label}</span></td>
                  <td>
                    <button onClick={() => toggle(u.id)} style={{ padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700, cursor:'pointer', border:'none', background: u.active ? 'var(--gd)' : 'var(--bg4)', color: u.active ? 'var(--green)' : 'var(--t3)' }}>
                      {u.active ? '● Active' : '○ Inactive'}
                    </button>
                  </td>
                  <td style={{ color:'var(--t3)', fontSize:11.5 }}>{u.createdAt}</td>
                  <td>
                    <div style={{ display:'flex', gap:6 }}>
                      <button className="btn bg btn-sm" onClick={() => openEdit(u)}>Edit</button>
                      {u.role !== 'admin' && <button className="btn bd btn-sm" onClick={() => del(u.id)}>Remove</button>}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Role Permissions Table */}
      <div className="card" style={{ marginTop:16 }}>
        <div style={{ fontFamily:'Syne', fontWeight:700, fontSize:13, marginBottom:14, color:'var(--amber)' }}>Role Permissions Matrix</div>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead>
              <tr>
                <th style={{ textAlign:'left', padding:'6px 10px', color:'var(--t3)', fontWeight:700, borderBottom:'1px solid var(--b1)' }}>Module</th>
                {Object.entries(ROLES).map(([k,r]) => <th key={k} style={{ padding:'6px 12px', color:r.color, fontWeight:700, borderBottom:'1px solid var(--b1)', textAlign:'center' }}>{r.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {[['Dashboard','dashboard'],['Products','products'],['Inventory','inventory'],['POS','pos'],['Sales','sales'],['Purchase Orders','purchase'],['Customers','customers'],['Suppliers','suppliers'],['Reports','reports'],['GST Reports','gst'],['Import/Export','import'],['Settings','settings'],['Users','users']].map(([label, key]) => (
                <tr key={key} style={{ borderBottom:'1px solid var(--b1)' }}>
                  <td style={{ padding:'7px 10px', color:'var(--t2)', fontWeight:500 }}>{label}</td>
                  {Object.entries(ROLES).map(([rk, r]) => {
                    const has = r.perms.includes('all') || r.perms.includes(key)
                    return <td key={rk} style={{ padding:'7px 12px', textAlign:'center' }}><span style={{ fontSize:14, color: has ? 'var(--green)' : 'var(--t4)' }}>{has ? '✓' : '—'}</span></td>
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal modal-sm">
            <div className="mhd"><div className="mt">{editUser ? 'Edit User' : 'Add User'}</div><button className="xbtn" onClick={() => setShowForm(false)}>✕</button></div>
            <div className="modal-body">
              <div className="fg"><label className="fl">Full Name *</label><input className="field" value={f.name} onChange={e => set('name', e.target.value)} autoFocus /></div>
              <div className="fg"><label className="fl">Email</label><input className="field" type="email" value={f.email || ''} onChange={e => set('email', e.target.value)} /></div>
              <div className="fg"><label className="fl">Phone</label><input className="field" value={f.phone || ''} onChange={e => set('phone', e.target.value)} /></div>
              <div className="fg">
                <label className="fl">Role *</label>
                <select className="field" value={f.role} onChange={e => set('role', e.target.value)}>
                  {Object.entries(ROLES).map(([k,r]) => <option key={k} value={k}>{r.label} — {r.desc}</option>)}
                </select>
              </div>
              <div className="fg"><label className="fl">4-digit PIN (optional)</label><input className="field" style={{ fontFamily:'JetBrains Mono', letterSpacing:4 }} type="password" maxLength={4} value={f.pin || ''} onChange={e => set('pin', e.target.value)} placeholder="••••" /></div>
            </div>
            <div className="mft">
              <button className="btn bg" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn bp" onClick={save}>{editUser ? 'Update' : 'Add User'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
