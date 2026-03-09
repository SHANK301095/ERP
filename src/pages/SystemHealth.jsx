import { useState, useMemo } from 'react'
import { today } from '../utils/csv.js'

export function SystemHealth({ state, dispatch, toast }) {
  const { products, variants, inventory, salesInvoices, purchaseOrders, customers, settings } = state
  const [showClear, setShowClear] = useState('')

  // Storage calc
  const stateSize = useMemo(()=>{
    try { return (JSON.stringify(state).length/1024).toFixed(1) } catch { return '?' }
  },[state])

  const lsUsed = useMemo(()=>{
    let total=0
    for(let k in localStorage){ try{total+=localStorage[k].length}catch{} }
    return (total/1024).toFixed(1)
  },[])

  const health = [
    { check:'Products with no SKUs', count:products.filter(p=>!variants.find(v=>v.productId===p.id)).length, ok:products.filter(p=>!variants.find(v=>v.productId===p.id)).length===0, fix:'Go to Products → add SKUs' },
    { check:'SKUs with no inventory entry', count:variants.filter(v=>!inventory.find(i=>i.variantId===v.id)).length, ok:variants.filter(v=>!inventory.find(i=>i.variantId===v.id)).length===0, fix:'Go to Inventory → sync stock' },
    { check:'Unpaid invoices (30+ days)', count:salesInvoices.filter(i=>i.status==='unpaid'&&Math.floor((new Date()-new Date(i.date))/86400000)>30).length, ok:salesInvoices.filter(i=>i.status==='unpaid'&&Math.floor((new Date()-new Date(i.date))/86400000)>30).length===0, fix:'Follow up on payments' },
    { check:'Customers with no phone', count:customers.filter(c=>!c.phone).length, ok:customers.filter(c=>!c.phone).length===0, fix:'Update customer profiles' },
    { check:'Products with no cost price', count:products.filter(p=>!p.costPrice||p.costPrice===0).length, ok:products.filter(p=>!p.costPrice||p.costPrice===0).length===0, fix:'Add cost prices for P&L accuracy' },
    { check:'Low stock items', count:variants.filter(v=>{ const q=inventory.find(i=>i.variantId===v.id)?.qty||0; return q>0&&q<=(settings.lowStockThreshold||10) }).length, ok:false, fix:'Reorder items from suppliers' },
    { check:'Settings complete', count:0, ok:!!(settings.brandName&&settings.gstin&&settings.phone), fix:'Complete Settings page' },
  ]

  const overallHealth = health.filter(h=>h.ok).length / health.length * 100

  function clearCache(key) {
    localStorage.removeItem(key)
    toast.show('Cleared: '+key,'ok')
    setShowClear('')
  }

  const lsKeys = []
  for(let k in localStorage) { try{ lsKeys.push({k,size:(localStorage[k].length/1024).toFixed(1)}) }catch{} }

  return (
    <div>
      <div className="sh" style={{marginBottom:18}}><h2>System Health</h2><p>Data integrity, storage usage & diagnostics</p></div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
        {[
          {l:'Health Score',v:Math.round(overallHealth)+'%',c:overallHealth>=80?'var(--green)':overallHealth>=60?'var(--amber)':'var(--red)'},
          {l:'State Size',v:stateSize+' KB',c:'var(--blue)'},
          {l:'localStorage',v:lsUsed+' KB',c:'var(--purple)'},
          {l:'Total Records',v:(products.length+variants.length+salesInvoices.length+customers.length).toLocaleString('en-IN'),c:'var(--amber)'},
        ].map(s=><div key={s.l} className="stat"><div className="stat-v" style={{color:s.c,fontSize:18}}>{s.v}</div><div className="stat-l">{s.l}</div></div>)}
      </div>

      {/* Health checks */}
      <div className="card" style={{marginBottom:16}}>
        <div style={{fontFamily:'Syne',fontWeight:700,fontSize:13,marginBottom:14,color:'var(--amber)'}}>🏥 Health Checks</div>
        {health.map((h,i)=>(
          <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:'1px solid var(--b1)'}}>
            <div style={{display:'flex',gap:10,alignItems:'center',flex:1}}>
              <span style={{fontSize:18}}>{h.ok?'✅':'⚠️'}</span>
              <div>
                <div style={{fontSize:13,fontWeight:500,color:h.ok?'var(--t2)':'var(--t1)'}}>{h.check}</div>
                {!h.ok&&<div style={{fontSize:11.5,color:'var(--t4)',marginTop:1}}>→ {h.fix}</div>}
              </div>
            </div>
            {!h.ok&&h.count>0&&<span style={{fontFamily:'JetBrains Mono',fontWeight:700,color:'var(--amber)',fontSize:14,marginLeft:10}}>{h.count}</span>}
            {h.ok&&<span style={{fontSize:12,color:'var(--green)',fontWeight:600}}>OK</span>}
          </div>
        ))}
      </div>

      {/* Data counts */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:10,marginBottom:16}}>
        {[
          ['Products',products.length],['SKU Variants',variants.length],['Inventory Lines',inventory.length],
          ['Sales Invoices',salesInvoices.length],['Purchase Orders',purchaseOrders.length],['Customers',customers.length],
          ['Resellers',(settings.resellers||[]).length],['Expenses',(settings.expenses||[]).length],
          ['Employees',(settings.employees||[]).length],['Tasks',(settings.tasks||[]).length],
        ].map(([l,v])=>(
          <div key={l} style={{background:'var(--bg3)',border:'1px solid var(--b1)',borderRadius:'var(--r)',padding:'10px 14px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontSize:12,color:'var(--t3)'}}>{l}</span>
            <span style={{fontFamily:'JetBrains Mono',fontWeight:700,color:'var(--amber)',fontSize:14}}>{v}</span>
          </div>
        ))}
      </div>

      {/* localStorage keys */}
      <div className="card" style={{padding:0}}>
        <div style={{padding:'12px 16px',borderBottom:'1px solid var(--b1)',fontFamily:'Syne',fontWeight:700,fontSize:13,color:'var(--amber)'}}>💾 localStorage Contents</div>
        <table className="tbl">
          <thead><tr><th>Key</th><th>Size</th><th>Action</th></tr></thead>
          <tbody>
            {lsKeys.map(({k,size})=>(
              <tr key={k}>
                <td style={{fontFamily:'JetBrains Mono',fontSize:11,color:k==='lfp_v4'?'var(--green)':'var(--t2)'}}>{k} {k==='lfp_v4'?'⭐ (main data)':''}</td>
                <td style={{fontFamily:'JetBrains Mono',fontSize:11,color:'var(--t3)'}}>{size} KB</td>
                <td>
                  {k!=='lfp_v4'&&(
                    showClear===k?(
                      <div style={{display:'flex',gap:6}}>
                        <button className="btn btn-sm" style={{background:'var(--rd)',color:'var(--red)',border:'none',fontSize:10}} onClick={()=>clearCache(k)}>Yes, Clear</button>
                        <button className="btn bg btn-sm" onClick={()=>setShowClear('')}>Cancel</button>
                      </div>
                    ):<button className="btn bg btn-sm" onClick={()=>setShowClear(k)}>Clear</button>
                  )}
                  {k==='lfp_v4'&&<span style={{fontSize:11,color:'var(--green)'}}>Main ERP data — use Backup to export</span>}
                </td>
              </tr>
            ))}
            {lsKeys.length===0&&<tr><td colSpan={3}><div className="empty"><p>No localStorage data</p></div></td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
