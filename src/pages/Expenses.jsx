import { useState, useMemo } from 'react'
import { uid, today, downloadCSV } from '../utils/csv.js'

const CATS = ['Rent','Electricity','Staff Salary','Transport','Packaging','Marketing','Maintenance','Office Supplies','Bank Charges','GST Payment','Misc']

export function Expenses({ state, dispatch, toast }) {
  const expenses = state.settings.expenses || []
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState('')
  const [month, setMonth] = useState(new Date().toISOString().slice(0,7))
  const [f, setF] = useState({ date:today(), category:'Rent', amount:'', description:'', paymentMode:'cash', vendor:'', receiptNo:'', isRecurring:false })
  const set = (k,v) => setF(p=>({...p,[k]:v}))

  function save() {
    if (!f.amount || !f.category) { toast.show('Category & Amount required','err'); return }
    const newExp = [...expenses, { ...f, id:uid(), amount:+f.amount }]
    dispatch({ type:'SET_SETTINGS', payload:{ expenses: newExp } })
    toast.show('Expense added ✓','ok'); setShowForm(false)
    setF({ date:today(), category:'Rent', amount:'', description:'', paymentMode:'cash', vendor:'', receiptNo:'', isRecurring:false })
  }

  function del(id) {
    dispatch({ type:'SET_SETTINGS', payload:{ expenses: expenses.filter(e=>e.id!==id) } })
    toast.show('Deleted','ok')
  }

  const filtered = expenses.filter(e => (e.date||'').startsWith(month) && (!filter || e.category===filter))
  const total = filtered.reduce((s,e)=>s+e.amount,0)

  const byCat = CATS.map(c=>({ cat:c, total:filtered.filter(e=>e.category===c).reduce((s,e)=>s+e.amount,0) })).filter(x=>x.total>0).sort((a,b)=>b.total-a.total)

  // Compare with revenue
  const revenue = state.salesInvoices.filter(i=>(i.date||'').startsWith(month)&&i.status!=='cancelled').reduce((s,i)=>s+(i.grandTotal||0),0)
  const purchases = state.purchaseOrders.filter(p=>(p.date||'').startsWith(month)).reduce((s,p)=>s+(p.grandTotal||0),0)
  const netProfit = revenue - purchases - total

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:18}}>
        <div className="sh" style={{margin:0}}><h2>Expense Tracker</h2><p>Track all business expenses</p></div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <input className="field" type="month" value={month} onChange={e=>setMonth(e.target.value)} style={{width:150}}/>
          <button className="btn bs btn-sm" onClick={()=>downloadCSV(`Expenses_${month}.csv`,[['Date','Category','Description','Vendor','Amount','Payment Mode','Receipt No'],...filtered.map(e=>[e.date,e.category,e.description,e.vendor,e.amount,e.paymentMode,e.receiptNo])])}>⬇ CSV</button>
          <button className="btn bp" onClick={()=>setShowForm(true)}>+ Add Expense</button>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:18}}>
        {[
          {l:'Total Expenses',v:'₹'+total.toLocaleString('en-IN',{maximumFractionDigits:0}),c:'var(--red)'},
          {l:'Revenue',v:'₹'+revenue.toLocaleString('en-IN',{maximumFractionDigits:0}),c:'var(--green)'},
          {l:'Purchase Cost',v:'₹'+purchases.toLocaleString('en-IN',{maximumFractionDigits:0}),c:'var(--amber)'},
          {l:'Net Profit',v:'₹'+netProfit.toLocaleString('en-IN',{maximumFractionDigits:0}),c:netProfit>=0?'var(--green)':'var(--red)'},
        ].map(s=><div key={s.l} className="stat"><div className="stat-v" style={{color:s.c,fontSize:18}}>{s.v}</div><div className="stat-l">{s.l}</div></div>)}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:16}}>
        <div>
          <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap'}}>
            <button onClick={()=>setFilter('')} className={`pill ${!filter?'on':''}`}>All</button>
            {CATS.map(c=><button key={c} onClick={()=>setFilter(f=>f===c?'':c)} className={`pill ${filter===c?'on':''}`}>{c}</button>)}
          </div>
          <div className="card" style={{padding:0}}>
            <table className="tbl">
              <thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Vendor</th><th>Amount</th><th>Mode</th><th></th></tr></thead>
              <tbody>
                {filtered.length===0&&<tr><td colSpan={7}><div className="empty"><p>No expenses in {month}</p></div></td></tr>}
                {filtered.sort((a,b)=>b.date>a.date?1:-1).map(e=>(
                  <tr key={e.id}>
                    <td style={{color:'var(--t3)',fontSize:11.5}}>{e.date}</td>
                    <td><span className="badge bb" style={{fontSize:10}}>{e.category}</span></td>
                    <td style={{color:'var(--t2)',fontSize:12.5}}>{e.description||'—'}</td>
                    <td style={{color:'var(--t3)',fontSize:11.5}}>{e.vendor||'—'}</td>
                    <td style={{fontFamily:'JetBrains Mono',fontWeight:700,color:'var(--red)'}}>₹{e.amount.toLocaleString('en-IN')}</td>
                    <td style={{fontSize:11,color:'var(--t3)',textTransform:'capitalize'}}>{e.paymentMode}</td>
                    <td><button className="btn bd btn-sm" onClick={()=>del(e.id)}>✕</button></td>
                  </tr>
                ))}
                {filtered.length>0&&<tr style={{background:'var(--bg3)'}}><td colSpan={4} style={{fontWeight:700,textAlign:'right'}}>Total</td><td style={{fontFamily:'JetBrains Mono',fontWeight:800,color:'var(--red)'}}>₹{total.toLocaleString('en-IN',{maximumFractionDigits:0})}</td><td/><td/></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div style={{fontFamily:'Syne',fontWeight:700,fontSize:13,marginBottom:14,color:'var(--amber)'}}>By Category</div>
          {byCat.length===0?<div style={{color:'var(--t4)',fontSize:12,textAlign:'center',padding:'20px 0'}}>No data</div>:byCat.map(x=>(
            <div key={x.cat} style={{marginBottom:12}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:3}}>
                <span style={{color:'var(--t2)'}}>{x.cat}</span>
                <span style={{fontFamily:'JetBrains Mono',color:'var(--red)',fontWeight:700}}>₹{x.total.toLocaleString('en-IN',{maximumFractionDigits:0})}</span>
              </div>
              <div style={{background:'var(--bg4)',borderRadius:4,height:6}}>
                <div style={{background:'var(--red)',height:'100%',width:`${(x.total/total*100)}%`,borderRadius:4,transition:'width .3s'}}/>
              </div>
              <div style={{fontSize:10,color:'var(--t4)',marginTop:1,textAlign:'right'}}>{(x.total/total*100).toFixed(1)}%</div>
            </div>
          ))}
        </div>
      </div>

      {showForm&&(
        <div className="overlay" onClick={e=>e.target===e.currentTarget&&setShowForm(false)}>
          <div className="modal modal-md">
            <div className="mhd"><div className="mt">Add Expense</div><button className="xbtn" onClick={()=>setShowForm(false)}>✕</button></div>
            <div className="modal-body">
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div className="fg"><label className="fl">Date *</label><input className="field" type="date" value={f.date} onChange={e=>set('date',e.target.value)}/></div>
                <div className="fg"><label className="fl">Category *</label>
                  <select className="field" value={f.category} onChange={e=>set('category',e.target.value)}>
                    {CATS.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="fg"><label className="fl">Amount (₹) *</label><input className="field" type="number" value={f.amount} onChange={e=>set('amount',e.target.value)} placeholder="0.00" autoFocus/></div>
                <div className="fg"><label className="fl">Payment Mode</label>
                  <select className="field" value={f.paymentMode} onChange={e=>set('paymentMode',e.target.value)}>
                    {['cash','upi','neft','cheque','card'].map(m=><option key={m} value={m}>{m.toUpperCase()}</option>)}
                  </select>
                </div>
                <div className="fg"><label className="fl">Vendor / Payee</label><input className="field" value={f.vendor} onChange={e=>set('vendor',e.target.value)}/></div>
                <div className="fg"><label className="fl">Receipt / Bill No.</label><input className="field" style={{fontFamily:'JetBrains Mono'}} value={f.receiptNo} onChange={e=>set('receiptNo',e.target.value)}/></div>
              </div>
              <div className="fg"><label className="fl">Description</label><input className="field" value={f.description} onChange={e=>set('description',e.target.value)} placeholder="What was this expense for?"/></div>
              <label style={{display:'flex',alignItems:'center',gap:8,fontSize:12.5,color:'var(--t2)',cursor:'pointer'}}>
                <input type="checkbox" checked={f.isRecurring} onChange={e=>set('isRecurring',e.target.checked)}/> Recurring monthly expense
              </label>
            </div>
            <div className="mft">
              <button className="btn bg" onClick={()=>setShowForm(false)}>Cancel</button>
              <button className="btn bp" onClick={save}>Save Expense</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
