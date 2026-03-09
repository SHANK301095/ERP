import { useState, useMemo } from 'react'
import { uid, today } from '../utils/csv.js'

export function BankReconciliation({ state, dispatch, toast }) {
  const { settings, salesInvoices, purchaseOrders } = state
  const bankTxns = settings.bankTransactions || []
  const [showForm, setShowForm] = useState(false)
  const [month, setMonth] = useState(today().slice(0,7))
  const [f, setF] = useState({ date:today(), type:'credit', amount:'', description:'', ref:'', matched:false })
  const set=(k,v)=>setF(p=>({...p,[k]:v}))

  function addTxn() {
    if (!f.amount||!f.description) { toast.show('Amount & description required','err'); return }
    const t = { ...f, id:uid(), amount:+f.amount }
    dispatch({ type:'SET_SETTINGS', payload:{ bankTransactions:[t,...bankTxns] } })
    toast.show('Bank entry added ✓','ok')
    setShowForm(false); setF({ date:today(),type:'credit',amount:'',description:'',ref:'',matched:false })
  }

  function toggleMatch(id) {
    const updated = bankTxns.map(t=>t.id===id?{...t,matched:!t.matched}:t)
    dispatch({ type:'SET_SETTINGS', payload:{ bankTransactions:updated } })
  }

  const monthTxns = useMemo(()=>bankTxns.filter(t=>t.date?.startsWith(month)),[bankTxns,month])
  const totalCredit = monthTxns.filter(t=>t.type==='credit').reduce((s,t)=>s+t.amount,0)
  const totalDebit  = monthTxns.filter(t=>t.type==='debit').reduce((s,t)=>s+t.amount,0)
  const unmatched   = monthTxns.filter(t=>!t.matched).length
  const bankBalance = bankTxns.reduce((s,t)=>s+(t.type==='credit'?t.amount:-t.amount),0)

  // Expected from ERP
  const erpCredit = salesInvoices.filter(i=>i.date?.startsWith(month)&&i.status!=='cancelled').reduce((s,i)=>s+(i.grandTotal||0),0)
  const erpDebit  = purchaseOrders.filter(p=>p.date?.startsWith(month)).reduce((s,p)=>s+(p.grandTotal||0),0)
    + (settings.cashEntries||[]).filter(e=>e.date?.startsWith(month)&&e.type==='out').reduce((s,e)=>s+e.amount,0)

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:18}}>
        <div className="sh" style={{margin:0}}><h2>Bank Reconciliation</h2><p>Match bank statement with ERP entries</p></div>
        <button className="btn bp" onClick={()=>setShowForm(true)}>+ Add Bank Entry</button>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:18}}>
        {[{l:'Bank Balance',v:'₹'+bankBalance.toLocaleString('en-IN',{maximumFractionDigits:0}),c:'var(--amber)'},{l:'Month Credit',v:'₹'+totalCredit.toLocaleString('en-IN',{maximumFractionDigits:0}),c:'var(--green)'},{l:'Month Debit',v:'₹'+totalDebit.toLocaleString('en-IN',{maximumFractionDigits:0}),c:'var(--red)'},{l:'Unmatched',v:unmatched,c:unmatched>0?'var(--red)':'var(--green)'}].map(s=>(
          <div key={s.l} className="stat"><div className="stat-v" style={{color:s.c,fontSize:18}}>{s.v}</div><div className="stat-l">{s.l}</div></div>
        ))}
      </div>

      {/* Reconciliation Summary */}
      <div className="card" style={{marginBottom:16}}>
        <div style={{fontFamily:'Syne',fontWeight:700,fontSize:13,marginBottom:14,color:'var(--amber)'}}>📊 Reconciliation — {month}</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <div>
            <div style={{fontSize:12.5,fontWeight:700,color:'var(--t2)',marginBottom:8}}>Bank Statement (entered)</div>
            {[['Credits (received)',totalCredit,'var(--green)'],['Debits (paid out)',totalDebit,'var(--red)'],['Net',totalCredit-totalDebit,(totalCredit-totalDebit)>=0?'var(--amber)':'var(--red)']].map(([l,v,c])=>(
              <div key={l} style={{display:'flex',justifyContent:'space-between',fontSize:12.5,padding:'5px 0',borderBottom:'1px solid var(--b1)'}}>
                <span style={{color:'var(--t3)'}}>{l}</span><span style={{fontFamily:'JetBrains Mono',fontWeight:700,color:c}}>₹{v.toLocaleString('en-IN',{maximumFractionDigits:0})}</span>
              </div>
            ))}
          </div>
          <div>
            <div style={{fontSize:12.5,fontWeight:700,color:'var(--t2)',marginBottom:8}}>ERP Expectation</div>
            {[['Sales (invoiced)',erpCredit,'var(--green)'],['Purchase+Expenses',erpDebit,'var(--red)'],['Difference',Math.abs(totalCredit-erpCredit),Math.abs(totalCredit-erpCredit)<1000?'var(--green)':'var(--red)']].map(([l,v,c])=>(
              <div key={l} style={{display:'flex',justifyContent:'space-between',fontSize:12.5,padding:'5px 0',borderBottom:'1px solid var(--b1)'}}>
                <span style={{color:'var(--t3)'}}>{l}</span><span style={{fontFamily:'JetBrains Mono',fontWeight:700,color:c}}>₹{v.toLocaleString('en-IN',{maximumFractionDigits:0})}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{display:'flex',gap:10,marginBottom:12,alignItems:'center'}}>
        <input type="month" className="field" value={month} onChange={e=>setMonth(e.target.value)} style={{maxWidth:160}}/>
        <span style={{fontSize:12,color:'var(--t4)'}}>{monthTxns.length} transactions · {unmatched} unmatched</span>
      </div>

      <div className="card" style={{padding:0}}>
        <table className="tbl">
          <thead><tr><th>Date</th><th>Description</th><th>Ref</th><th>Credit</th><th>Debit</th><th>Matched</th></tr></thead>
          <tbody>
            {monthTxns.length===0&&<tr><td colSpan={6}><div className="empty"><p>No bank entries for {month}</p></div></td></tr>}
            {[...monthTxns].sort((a,b)=>b.date.localeCompare(a.date)).map(t=>(
              <tr key={t.id} style={{opacity:t.matched?0.65:1}}>
                <td style={{fontFamily:'JetBrains Mono',fontSize:11}}>{t.date}</td>
                <td style={{fontSize:12.5,fontWeight:500}}>{t.description}</td>
                <td style={{fontFamily:'JetBrains Mono',fontSize:11,color:'var(--t4)'}}>{t.ref||'—'}</td>
                <td style={{fontFamily:'JetBrains Mono',fontWeight:700,color:'var(--green)'}}>{t.type==='credit'?'₹'+t.amount.toLocaleString('en-IN'):'—'}</td>
                <td style={{fontFamily:'JetBrains Mono',fontWeight:700,color:'var(--red)'}}>{t.type==='debit'?'₹'+t.amount.toLocaleString('en-IN'):'—'}</td>
                <td>
                  <label style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer'}}>
                    <input type="checkbox" checked={t.matched||false} onChange={()=>toggleMatch(t.id)}/>
                    <span style={{fontSize:11,color:t.matched?'var(--green)':'var(--t4)'}}>{t.matched?'Matched':'Pending'}</span>
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm&&(
        <div className="overlay" onClick={e=>e.target===e.currentTarget&&setShowForm(false)}>
          <div className="modal modal-sm">
            <div className="mhd"><div className="mt">Add Bank Transaction</div><button className="xbtn" onClick={()=>setShowForm(false)}>✕</button></div>
            <div className="modal-body">
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div className="fg"><label className="fl">Date</label><input className="field" type="date" value={f.date} onChange={e=>set('date',e.target.value)}/></div>
                <div className="fg"><label className="fl">Type</label>
                  <select className="field" value={f.type} onChange={e=>set('type',e.target.value)}>
                    <option value="credit">Credit (money received)</option>
                    <option value="debit">Debit (money paid)</option>
                  </select>
                </div>
                <div className="fg"><label className="fl">Amount ₹ *</label><input className="field" type="number" value={f.amount} onChange={e=>set('amount',e.target.value)}/></div>
                <div className="fg"><label className="fl">Reference</label><input className="field" style={{fontFamily:'JetBrains Mono'}} value={f.ref} onChange={e=>set('ref',e.target.value)} placeholder="Cheque/UTR no."/></div>
              </div>
              <div className="fg"><label className="fl">Description *</label><input className="field" value={f.description} onChange={e=>set('description',e.target.value)}/></div>
            </div>
            <div className="mft"><button className="btn bg" onClick={()=>setShowForm(false)}>Cancel</button><button className="btn bp" onClick={addTxn}>Add Entry</button></div>
          </div>
        </div>
      )}
    </div>
  )
}
