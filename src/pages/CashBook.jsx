import { useState, useMemo } from 'react'
import { uid, today, downloadCSV } from '../utils/csv.js'

const CATS = ['Sales Receipt','Purchase Payment','Expense','Salary','Rent','Utilities','Transport','GST Payment','Bank Deposit','Bank Withdrawal','Misc Income','Misc Expense']

export function CashBook({ state, dispatch, toast }) {
  const { settings, salesInvoices, purchaseOrders } = state
  const entries = settings.cashEntries || []
  const [showForm, setShowForm] = useState(false)
  const [month, setMonth] = useState(today().slice(0,7))
  const [f, setF] = useState({ date:today(), type:'in', amount:'', category:'Sales Receipt', note:'', paymentMode:'cash' })
  const set = (k,v) => setF(p=>({...p,[k]:v}))

  function save() {
    if (!f.amount||+f.amount<=0) { toast.show('Amount required','err'); return }
    const e = { ...f, id:uid(), amount:+f.amount }
    dispatch({ type:'SET_SETTINGS', payload:{ cashEntries:[e,...entries] } })
    toast.show('Entry added ✓','ok')
    setShowForm(false); setF({ date:today(), type:'in', amount:'', category:'Sales Receipt', note:'', paymentMode:'cash' })
  }

  const monthEntries = useMemo(()=>entries.filter(e=>e.date?.startsWith(month)),[entries,month])
  const totalIn  = monthEntries.filter(e=>e.type==='in').reduce((s,e)=>s+e.amount,0)
  const totalOut = monthEntries.filter(e=>e.type==='out').reduce((s,e)=>s+e.amount,0)
  const balance  = totalIn-totalOut
  const allIn    = entries.filter(e=>e.type==='in').reduce((s,e)=>s+e.amount,0)
  const allOut   = entries.filter(e=>e.type==='out').reduce((s,e)=>s+e.amount,0)

  // Running balance
  const sorted = [...monthEntries].sort((a,b)=>a.date.localeCompare(b.date))
  let running = entries.filter(e=>e.date<month+'-01').reduce((s,e)=>s+(e.type==='in'?e.amount:-e.amount),0)
  const withBalance = sorted.map(e=>{
    running += e.type==='in'?e.amount:-e.amount
    return {...e,runningBalance:running}
  }).reverse()

  function exportCSV() {
    const rows=[['Date','Type','Category','Amount','Payment Mode','Note','Running Balance']]
    withBalance.forEach(e=>rows.push([e.date,e.type==='in'?'IN':'OUT',e.category,e.amount,e.paymentMode,e.note,e.runningBalance]))
    downloadCSV(`CashBook_${month}.csv`,rows)
    toast.show('Cash book exported ✓','ok')
  }

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:18}}>
        <div className="sh" style={{margin:0}}><h2>Cash Book</h2><p>Daily cash in/out, running balance</p></div>
        <div style={{display:'flex',gap:8}}>
          <button className="btn bs btn-sm" onClick={exportCSV}>⬇ Export</button>
          <button className="btn bp" onClick={()=>setShowForm(true)}>+ Add Entry</button>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:18}}>
        {[
          {l:'Month Cash In',v:'₹'+totalIn.toLocaleString('en-IN',{maximumFractionDigits:0}),c:'var(--green)'},
          {l:'Month Cash Out',v:'₹'+totalOut.toLocaleString('en-IN',{maximumFractionDigits:0}),c:'var(--red)'},
          {l:'Month Balance',v:'₹'+balance.toLocaleString('en-IN',{maximumFractionDigits:0}),c:balance>=0?'var(--amber)':'var(--red)'},
          {l:'All Time Balance',v:'₹'+(allIn-allOut).toLocaleString('en-IN',{maximumFractionDigits:0}),c:(allIn-allOut)>=0?'var(--blue)':'var(--red)'},
        ].map(s=><div key={s.l} className="stat"><div className="stat-v" style={{color:s.c,fontSize:18}}>{s.v}</div><div className="stat-l">{s.l}</div></div>)}
      </div>

      <div style={{display:'flex',gap:12,marginBottom:14,alignItems:'center'}}>
        <input type="month" className="field" value={month} onChange={e=>setMonth(e.target.value)} style={{maxWidth:160}}/>
        <div style={{marginLeft:'auto',fontSize:12.5,color:'var(--t3)'}}>{monthEntries.length} entries this month</div>
      </div>

      <div className="card" style={{padding:0}}>
        <table className="tbl">
          <thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Note</th><th>Mode</th><th style={{textAlign:'right'}}>Amount</th><th style={{textAlign:'right'}}>Balance</th></tr></thead>
          <tbody>
            {withBalance.length===0&&<tr><td colSpan={7}><div className="empty"><p>No entries for {month}. Add your first entry!</p></div></td></tr>}
            {withBalance.map(e=>(
              <tr key={e.id}>
                <td style={{fontFamily:'JetBrains Mono',fontSize:11}}>{e.date}</td>
                <td><span style={{padding:'2px 10px',borderRadius:20,fontSize:10,fontWeight:800,background:e.type==='in'?'var(--gd)':'var(--rd)',color:e.type==='in'?'var(--green)':'var(--red)'}}>{e.type==='in'?'IN':'OUT'}</span></td>
                <td style={{fontSize:12}}>{e.category}</td>
                <td style={{fontSize:12,color:'var(--t3)'}}>{e.note||'—'}</td>
                <td style={{fontSize:11,color:'var(--t3)',textTransform:'capitalize'}}>{e.paymentMode}</td>
                <td style={{textAlign:'right',fontFamily:'JetBrains Mono',fontWeight:700,color:e.type==='in'?'var(--green)':'var(--red)'}}>{e.type==='in'?'+':'-'}₹{e.amount.toLocaleString('en-IN')}</td>
                <td style={{textAlign:'right',fontFamily:'JetBrains Mono',fontWeight:700,color:e.runningBalance>=0?'var(--amber)':'var(--red)'}}>₹{e.runningBalance.toLocaleString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm&&(
        <div className="overlay" onClick={e=>e.target===e.currentTarget&&setShowForm(false)}>
          <div className="modal modal-sm">
            <div className="mhd"><div className="mt">Add Cash Entry</div><button className="xbtn" onClick={()=>setShowForm(false)}>✕</button></div>
            <div className="modal-body">
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div className="fg"><label className="fl">Date</label><input className="field" type="date" value={f.date} onChange={e=>set('date',e.target.value)}/></div>
                <div className="fg"><label className="fl">Type</label>
                  <select className="field" value={f.type} onChange={e=>set('type',e.target.value)}>
                    <option value="in">Cash IN (Income)</option>
                    <option value="out">Cash OUT (Expense)</option>
                  </select>
                </div>
                <div className="fg"><label className="fl">Amount ₹ *</label><input className="field" type="number" value={f.amount} onChange={e=>set('amount',e.target.value)} autoFocus/></div>
                <div className="fg"><label className="fl">Payment Mode</label>
                  <select className="field" value={f.paymentMode} onChange={e=>set('paymentMode',e.target.value)}>
                    {['cash','upi','bank','cheque','neft'].map(m=><option key={m} value={m}>{m.toUpperCase()}</option>)}
                  </select>
                </div>
              </div>
              <div className="fg"><label className="fl">Category</label>
                <select className="field" value={f.category} onChange={e=>set('category',e.target.value)}>
                  {CATS.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="fg"><label className="fl">Note</label><input className="field" value={f.note} onChange={e=>set('note',e.target.value)} placeholder="Optional description"/></div>
            </div>
            <div className="mft"><button className="btn bg" onClick={()=>setShowForm(false)}>Cancel</button><button className="btn bp" onClick={save}>Add Entry</button></div>
          </div>
        </div>
      )}
    </div>
  )
}
