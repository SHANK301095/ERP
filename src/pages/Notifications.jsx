import { useState, useEffect, useMemo } from 'react'
import { today } from '../utils/csv.js'

export function Notifications({ state, dispatch, toast }) {
  const { salesInvoices, purchaseOrders, inventory, variants, products, settings, customers } = state
  const [filter, setFilter] = useState('all')
  const [dismissed, setDismissed] = useState(()=>{ try{return JSON.parse(localStorage.getItem('notif_dismissed')||'[]')}catch{return[]} })

  const LOW = settings.lowStockThreshold || 10
  const TODAY = today()

  // Generate all notifications dynamically
  const allNotifs = useMemo(()=>{
    const notifs = []

    // 1. Low stock alerts
    variants.forEach(v=>{
      const inv = inventory.find(i=>i.variantId===v.id)
      const qty = inv?.qty||0
      const p = products.find(x=>x.id===v.productId)
      if (qty===0) notifs.push({ id:`oos_${v.id}`, type:'danger', category:'stock', icon:'📦', title:`Out of Stock: ${v.sku}`, body:`${p?.name||''} ${v.size||''} — 0 units remaining`, link:'alerts', time:'now' })
      else if (qty<=LOW) notifs.push({ id:`low_${v.id}`, type:'warning', category:'stock', icon:'⚠️', title:`Low Stock: ${v.sku}`, body:`Only ${qty} units left (threshold: ${LOW})`, link:'alerts', time:'now' })
    })

    // 2. Unpaid invoices overdue
    salesInvoices.filter(i=>i.status==='unpaid').forEach(inv=>{
      const days = Math.floor((new Date()-new Date(inv.date))/86400000)
      if (days>30) notifs.push({ id:`overdue_${inv.id}`, type:'danger', category:'payment', icon:'🚨', title:`Overdue 30+ days: ${inv.invoiceNumber}`, body:`${inv.customerName} — ₹${inv.grandTotal?.toLocaleString('en-IN')} — ${days} days pending`, link:'sales', time:inv.date })
      else if (days>15) notifs.push({ id:`due_${inv.id}`, type:'warning', category:'payment', icon:'💰', title:`Payment Pending: ${inv.invoiceNumber}`, body:`${inv.customerName} — ₹${inv.grandTotal?.toLocaleString('en-IN')} — ${days} days`, link:'sales', time:inv.date })
    })

    // 3. Purchase orders pending
    purchaseOrders.filter(p=>p.status==='pending').forEach(po=>{
      const days = Math.floor((new Date()-new Date(po.date))/86400000)
      if (days>7) notifs.push({ id:`po_${po.id}`, type:'warning', category:'purchase', icon:'🛒', title:`PO Pending ${days} days: ${po.poNumber}`, body:`${po.supplierName} — ₹${po.grandTotal?.toLocaleString('en-IN')}`, link:'purchase', time:po.date })
    })

    // 4. Overdue tasks
    ;(settings.tasks||[]).filter(t=>!t.done&&t.dueDate&&t.dueDate<TODAY).forEach(t=>{
      notifs.push({ id:`task_${t.id}`, type:'warning', category:'task', icon:'✅', title:`Task Overdue: ${t.title}`, body:`Due: ${t.dueDate} — Priority: ${t.priority}`, link:'tasks', time:t.dueDate })
    })

    // 5. Reseller credit due
    ;(settings.resellerOrders||[]).filter(o=>o.status==='credit').forEach(o=>{
      const days = Math.floor((new Date()-new Date(o.date))/86400000)
      if (days>7) notifs.push({ id:`rso_${o.id}`, type:'info', category:'reseller', icon:'🤝', title:`Reseller Credit Due: ${o.orderNo}`, body:`${o.resellerName} — ₹${o.grandTotal?.toLocaleString('en-IN')} — ${days} days`, link:'resellers', time:o.date })
    })

    // 6. Manufacturing WOs in progress
    ;(settings.wos||[]).filter(w=>w.status==='in_progress'&&w.targetDate&&w.targetDate<TODAY).forEach(w=>{
      notifs.push({ id:`wo_${w.id}`, type:'warning', category:'mfg', icon:'🏭', title:`WO Overdue: ${w.woNumber}`, body:`${w.bomName} — Target was ${w.targetDate}`, link:'mfg', time:w.targetDate })
    })

    // 7. Good news
    const todaySales = salesInvoices.filter(i=>i.date===TODAY&&i.status!=='cancelled')
    if (todaySales.length>0) {
      const total = todaySales.reduce((s,i)=>s+(i.grandTotal||0),0)
      notifs.push({ id:`today_sales`, type:'success', category:'sales', icon:'🎉', title:`Today's Sales: ₹${total.toLocaleString('en-IN')}`, body:`${todaySales.length} invoice${todaySales.length>1?'s':''} today`, link:'sales', time:TODAY })
    }

    return notifs.filter(n=>!dismissed.includes(n.id))
  }, [variants,inventory,salesInvoices,purchaseOrders,settings,dismissed])

  function dismiss(id) {
    const newD = [...dismissed, id]
    setDismissed(newD)
    localStorage.setItem('notif_dismissed', JSON.stringify(newD))
  }

  function dismissAll() {
    const newD = [...dismissed, ...allNotifs.map(n=>n.id)]
    setDismissed(newD)
    localStorage.setItem('notif_dismissed', JSON.stringify(newD))
    toast.show('All notifications cleared','ok')
  }

  function resetDismissed() {
    setDismissed([])
    localStorage.removeItem('notif_dismissed')
    toast.show('Notifications restored','ok')
  }

  const categories = ['all','stock','payment','purchase','task','reseller','mfg','sales']
  const filtered = filter==='all' ? allNotifs : allNotifs.filter(n=>n.category===filter)

  const typeBg    = { danger:'var(--rd)', warning:'var(--ad)', info:'var(--bi)', success:'var(--gd)' }
  const typeColor = { danger:'var(--red)', warning:'var(--amber)', info:'var(--blue)', success:'var(--green)' }
  const typeBorder= { danger:'rgba(239,68,68,0.3)', warning:'rgba(245,158,11,0.3)', info:'rgba(59,130,246,0.3)', success:'rgba(34,197,94,0.3)' }

  const counts = { danger:allNotifs.filter(n=>n.type==='danger').length, warning:allNotifs.filter(n=>n.type==='warning').length, info:allNotifs.filter(n=>n.type==='info').length, success:allNotifs.filter(n=>n.type==='success').length }

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:18}}>
        <div className="sh" style={{margin:0}}>
          <h2>Notifications <span style={{fontFamily:'JetBrains Mono',fontSize:16,color:'var(--amber)'}}>{allNotifs.length>0?`(${allNotifs.length})`:''}</span></h2>
          <p>Smart alerts — stock, payments, tasks, orders</p>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button className="btn bg btn-sm" onClick={resetDismissed}>↺ Restore All</button>
          {allNotifs.length>0&&<button className="btn bs btn-sm" onClick={dismissAll}>Clear All</button>}
        </div>
      </div>

      {/* Summary cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:18}}>
        {[
          {l:'🚨 Critical',v:counts.danger,c:'var(--red)',bg:'var(--rd)'},
          {l:'⚠️ Warnings',v:counts.warning,c:'var(--amber)',bg:'var(--ad)'},
          {l:'ℹ️ Info',v:counts.info,c:'var(--blue)',bg:'var(--bi)'},
          {l:'✅ Good News',v:counts.success,c:'var(--green)',bg:'var(--gd)'},
        ].map(s=>(
          <div key={s.l} style={{background:s.bg,border:`1px solid ${s.c}33`,borderRadius:'var(--rl)',padding:'14px 16px',textAlign:'center'}}>
            <div style={{fontFamily:'Syne',fontWeight:800,fontSize:24,color:s.c}}>{s.v}</div>
            <div style={{fontSize:11.5,color:'var(--t3)',marginTop:2}}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Category filter */}
      <div style={{display:'flex',gap:6,marginBottom:14,flexWrap:'wrap'}}>
        {categories.map(c=>{
          const count = c==='all'?allNotifs.length:allNotifs.filter(n=>n.category===c).length
          return (
            <button key={c} onClick={()=>setFilter(c)} className={`pill ${filter===c?'on':''}`} style={{textTransform:'capitalize'}}>
              {c} {count>0&&<span style={{fontFamily:'JetBrains Mono',fontSize:10,marginLeft:4,color:'var(--amber)'}}>{count}</span>}
            </button>
          )
        })}
      </div>

      {/* Notification list */}
      {filtered.length===0?(
        <div className="card" style={{textAlign:'center',padding:'50px 20px'}}>
          <div style={{fontSize:50,marginBottom:12}}>🎉</div>
          <div style={{fontFamily:'Syne',fontWeight:700,fontSize:16,color:'var(--t1)',marginBottom:6}}>
            {allNotifs.length===0?'Sab kuch theek hai!':'No notifications in this category'}
          </div>
          <div style={{fontSize:13,color:'var(--t3)'}}>
            {allNotifs.length===0?'No alerts right now. Business smooth chal raha hai!':'Try "All" category'}
          </div>
        </div>
      ):(
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {filtered.map(n=>(
            <div key={n.id} style={{background:typeBg[n.type],border:`1px solid ${typeBorder[n.type]}`,borderLeft:`4px solid ${typeColor[n.type]}`,borderRadius:'var(--rl)',padding:'12px 16px',display:'flex',alignItems:'flex-start',gap:12}}>
              <span style={{fontSize:22,flexShrink:0,marginTop:1}}>{n.icon}</span>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:13,color:'var(--t1)',marginBottom:3}}>{n.title}</div>
                <div style={{fontSize:12,color:'var(--t3)'}}>{n.body}</div>
              </div>
              <div style={{display:'flex',gap:6,flexShrink:0}}>
                <button className="btn bg btn-sm" onClick={()=>dispatch&&null} style={{fontSize:11}}>→ View</button>
                <button onClick={()=>dismiss(n.id)} style={{background:'none',border:'none',color:'var(--t4)',cursor:'pointer',fontSize:16,padding:'0 4px'}}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
