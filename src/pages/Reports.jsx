import { useMemo } from 'react'
import { Icon } from '../components/ui/index.jsx'
import { downloadCSV, today } from '../utils/csv.js'

export function Reports({ state }) {
  const { products, variants, inventory, salesInvoices, purchaseOrders, stockMovements, settings } = state

  const stats = useMemo(() => {
    const totalStock = inventory.reduce((s,i)=>s+(i.qty||0),0)
    const totalRevenue = salesInvoices.filter(i=>i.status==='paid').reduce((s,i)=>s+(i.grandTotal||0),0)
    const totalGst = salesInvoices.filter(i=>i.status==='paid').reduce((s,i)=>s+(i.totalGst||0),0)
    const totalPurchase = purchaseOrders.filter(p=>p.status==='received').reduce((s,p)=>s+(p.grandTotal||0),0)
    const grossProfit = totalRevenue - totalPurchase
    const lowStock = variants.filter(v=>{ const i=inventory.find(x=>x.variantId===v.id); return (i?.qty||0) <= (settings.lowStockThreshold||10) && (i?.qty||0)>0 })
    const outOfStock = variants.filter(v=>{ const i=inventory.find(x=>x.variantId===v.id); return (i?.qty||0)===0 })
    return { totalStock, totalRevenue, totalGst, totalPurchase, grossProfit, lowStockCount:lowStock.length, outCount:outOfStock.length }
  }, [inventory, salesInvoices, purchaseOrders, variants, settings])

  // Top selling products by qty
  const topProducts = useMemo(() => {
    const map = {}
    salesInvoices.forEach(inv=>{
      (inv.items||[]).forEach(item=>{
        const v = variants.find(x=>x.id===item.variantId)
        const p = products.find(x=>x.id===v?.productId)
        const key = p?.id||'unknown'
        if (!map[key]) map[key] = { name:p?.shortName||p?.name||'Unknown', qty:0, revenue:0 }
        map[key].qty += item.qty
        map[key].revenue += item.qty*item.unitPrice
      })
    })
    return Object.values(map).sort((a,b)=>b.revenue-a.revenue).slice(0,8)
  }, [salesInvoices, variants, products])

  // Monthly sales (last 6 months)
  const monthlySales = useMemo(() => {
    const months = {}
    for (let i=5; i>=0; i--) {
      const d = new Date(); d.setMonth(d.getMonth()-i)
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
      const label = d.toLocaleString('default',{month:'short',year:'2-digit'})
      months[key] = { label, revenue:0, invoices:0 }
    }
    salesInvoices.forEach(inv=>{
      const key = inv.date?.slice(0,7)
      if (months[key]) { months[key].revenue += inv.grandTotal||0; months[key].invoices++ }
    })
    return Object.values(months)
  }, [salesInvoices])

  const maxRevenue = Math.max(...monthlySales.map(m=>m.revenue), 1)

  // Low stock table
  const lowStockItems = useMemo(() => variants.map(v=>{
    const p = products.find(x=>x.id===v.productId)
    const inv = inventory.find(i=>i.variantId===v.id)
    return { variant:v, product:p, qty:inv?.qty||0 }
  }).filter(r=>r.qty<=(settings.lowStockThreshold||10)).sort((a,b)=>a.qty-b.qty), [variants, products, inventory, settings])

  function exportReport() {
    downloadCSV('inventory_report_'+today()+'.csv', [
      ['SKU','Product','Size','Color','Current Stock','Status'],
      ...variants.map(v=>{
        const p=products.find(x=>x.id===v.productId)
        const inv=inventory.find(i=>i.variantId===v.id)
        const qty=inv?.qty||0
        return [v.sku,p?.name||'',v.size||'',v.color||'',qty,qty===0?'Out of Stock':qty<=(settings.lowStockThreshold||10)?'Low Stock':'OK']
      })
    ])
  }

  return (
    <div>
      <div className="row-between mb-20">
        <div className="section-head" style={{margin:0}}><h2>Reports & Analytics</h2><p>Business overview and performance</p></div>
        <button className="btn btn-secondary" onClick={exportReport}><Icon n="download" s={13}/> Export Inventory Report</button>
      </div>

      {/* KPI Cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:22}}>
        {[
          {label:'Total Revenue',  val:'₹'+stats.totalRevenue.toLocaleString('en-IN'),  color:'var(--green)',  icon:'zap',    sub:'From paid invoices'},
          {label:'Total GST',      val:'₹'+stats.totalGst.toLocaleString('en-IN'),      color:'var(--blue)',   icon:'file',   sub:'Tax collected'},
          {label:'Purchase Cost',  val:'₹'+stats.totalPurchase.toLocaleString('en-IN'), color:'var(--amber)',  icon:'upload', sub:'Goods received'},
          {label:'Gross Profit',   val:'₹'+Math.abs(stats.grossProfit).toLocaleString('en-IN'), color:stats.grossProfit>=0?'var(--green)':'var(--red)', icon:'tag', sub:stats.grossProfit>=0?'Profit':'Loss'},
        ].map(s=>(
          <div key={s.label} className="stat">
            <div className="stat-icon" style={{background:`${s.color}18`,color:s.color}}><Icon n={s.icon} s={17}/></div>
            <div className="stat-val" style={{color:s.color,fontSize:16,marginBottom:2}}>{s.val}</div>
            <div className="stat-label">{s.label}</div>
            <div style={{fontSize:11,color:'var(--t4)',marginTop:2}}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid-2 gap-16 mb-16">
        {/* Monthly Sales Chart */}
        <div className="card">
          <div className="card-title mb-16">Monthly Revenue (Last 6 Months)</div>
          <div style={{display:'flex',alignItems:'flex-end',gap:10,height:140,padding:'0 4px'}}>
            {monthlySales.map((m,i)=>(
              <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
                <div style={{fontSize:10,color:'var(--amber)',fontFamily:'JetBrains Mono',fontWeight:700,textAlign:'center',minWidth:30}}>
                  {m.revenue>0?'₹'+Math.round(m.revenue/1000)+'K':''}
                </div>
                <div style={{width:'100%',background:'var(--amber)',borderRadius:'3px 3px 0 0',height:Math.max(4,(m.revenue/maxRevenue)*100),transition:'height .3s',opacity:0.85}}/>
                <div style={{fontSize:10.5,color:'var(--t3)',textAlign:'center'}}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Products */}
        <div className="card">
          <div className="card-title mb-14">Top Products by Revenue</div>
          {topProducts.length===0?<div className="empty" style={{padding:24}}><p>No sales data yet</p></div>:(
            topProducts.map((p,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                <div style={{width:22,height:22,borderRadius:'50%',background:'var(--amber-dim)',color:'var(--amber)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,flexShrink:0}}>{i+1}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12.5,fontWeight:600,color:'var(--t1)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</div>
                  <div style={{height:5,background:'var(--bg-4)',borderRadius:3,marginTop:4,overflow:'hidden'}}>
                    <div style={{height:'100%',background:'var(--amber)',borderRadius:3,width:`${(p.revenue/(topProducts[0]?.revenue||1))*100}%`}}/>
                  </div>
                </div>
                <div style={{textAlign:'right',flexShrink:0}}>
                  <div style={{fontFamily:'JetBrains Mono',fontSize:12,fontWeight:700,color:'var(--amber)'}}>₹{p.revenue.toLocaleString('en-IN')}</div>
                  <div style={{fontSize:10.5,color:'var(--t3)'}}>{p.qty} units</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="grid-2 gap-16">
        {/* Stock Summary */}
        <div className="card">
          <div className="card-title mb-14">Inventory Summary</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:14}}>
            {[
              {label:'Total Units',    val:stats.totalStock.toLocaleString('en-IN'), color:'var(--blue)'},
              {label:'Low Stock SKUs', val:stats.lowStockCount,                      color:'var(--amber)'},
              {label:'Out of Stock',   val:stats.outCount,                           color:'var(--red)'},
            ].map(s=>(
              <div key={s.label} style={{background:'var(--bg-3)',borderRadius:'var(--r)',padding:'10px 12px',textAlign:'center'}}>
                <div style={{fontFamily:'Syne',fontSize:22,fontWeight:700,color:s.color}}>{s.val}</div>
                <div style={{fontSize:11,color:'var(--t3)',marginTop:2}}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="card" style={{padding:0}}>
          <div style={{padding:'14px 16px',borderBottom:'1px solid var(--b1)'}}><div className="card-title">⚠️ Low Stock Alerts</div></div>
          <div style={{maxHeight:200,overflowY:'auto'}}>
            <table className="tbl">
              <thead><tr><th>SKU</th><th>Product</th><th>Stock</th></tr></thead>
              <tbody>
                {lowStockItems.slice(0,10).map(r=>(
                  <tr key={r.variant.id}>
                    <td className="td-mono" style={{fontSize:11}}>{r.variant.sku}</td>
                    <td style={{fontSize:12}}>{r.product?.shortName||r.product?.name} {r.variant.size&&`(${r.variant.size})`}</td>
                    <td><span style={{fontFamily:'JetBrains Mono',fontWeight:700,color:r.qty===0?'var(--red)':'var(--amber)'}}>{r.qty}</span></td>
                  </tr>
                ))}
                {lowStockItems.length===0&&<tr><td colSpan={3}><div style={{padding:'14px',textAlign:'center',color:'var(--t3)',fontSize:12}}>All stock levels are healthy ✓</div></td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
