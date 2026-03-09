import { useMemo } from 'react'
import { Icon } from '../components/ui/index.jsx'

export function Dashboard({ state, navigate }) {
  const { products, variants, templates, printJobs, inventory, salesInvoices, purchaseOrders, customers, suppliers, settings } = state

  const LOW = settings.lowStockThreshold || 10
  const stats = useMemo(()=>({
    products:   products.length,
    skus:       variants.filter(v=>v.status==='active').length,
    totalStock: inventory.reduce((s,i)=>s+(i.qty||0),0),
    lowStock:   variants.filter(v=>{const i=inventory.find(x=>x.variantId===v.id);return (i?.qty||0)<=LOW&&(i?.qty||0)>0}).length,
    revenue:    salesInvoices.filter(i=>i.status==='paid').reduce((s,i)=>s+(i.grandTotal||0),0),
    unpaidInv:  salesInvoices.filter(i=>i.status==='unpaid').length,
    pendingPO:  purchaseOrders.filter(p=>p.status==='pending').length,
    customers:  customers.length,
  }),[products,variants,inventory,salesInvoices,purchaseOrders,customers])

  const kpis = [
    {label:'Products',       val:stats.products,                                                  color:'var(--amber)',  icon:'box',    page:'products'},
    {label:'Active SKUs',    val:stats.skus,                                                      color:'var(--blue)',   icon:'barcode',page:'skus'},
    {label:'Stock Units',    val:stats.totalStock.toLocaleString('en-IN'),                        color:'var(--purple)', icon:'layers', page:'inventory'},
    {label:'Revenue',        val:'₹'+stats.revenue.toLocaleString('en-IN'),                       color:'var(--green)',  icon:'zap',    page:'sales'},
    {label:'Unpaid Invoices',val:stats.unpaidInv,                                                 color:stats.unpaidInv>0?'var(--red)':'var(--t3)', icon:'file', page:'sales'},
    {label:'Pending POs',    val:stats.pendingPO,                                                 color:stats.pendingPO>0?'var(--amber)':'var(--t3)',icon:'clock',page:'purchase'},
    {label:'Low Stock SKUs', val:stats.lowStock,                                                  color:stats.lowStock>0?'var(--amber)':'var(--t3)', icon:'zap', page:'inventory'},
    {label:'Customers',      val:stats.customers,                                                  color:'var(--blue)',   icon:'tag',    page:'customers'},
  ]

  const quickActions = [
    {icon:'plus',    label:'Add Product',      sub:'New product + variants',      page:'products', color:'var(--amber)'},
    {icon:'print',   label:'Generate Labels',  sub:'Print barcodes',             page:'labels',   color:'var(--blue)'},
    {icon:'file',    label:'New Invoice',      sub:'Bill a customer',            page:'sales',    color:'var(--green)'},
    {icon:'upload',  label:'New Purchase PO',  sub:'Order from supplier',        page:'purchase', color:'var(--purple)'},
  ]

  return (
    <div>
      <div className="section-head mb-20">
        <h2>Business Dashboard</h2>
        <p>{settings.brandName} — ERP Overview</p>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:22}}>
        {kpis.map(k=>(
          <div key={k.label} className="stat" style={{cursor:'pointer',transition:'border-color .12s',border:'1px solid var(--b1)'}}
            onClick={()=>navigate(k.page)}
            onMouseOver={e=>e.currentTarget.style.borderColor=k.color}
            onMouseOut={e=>e.currentTarget.style.borderColor='var(--b1)'}>
            <div className="stat-icon" style={{background:`${k.color}18`,color:k.color}}><Icon n={k.icon} s={17}/></div>
            <div className="stat-val" style={{color:k.color,fontSize:typeof k.val==='string'&&k.val.length>8?16:28}}>{k.val}</div>
            <div className="stat-label">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="grid-2 gap-16 mb-16">
        <div className="card">
          <div className="card-title mb-14">Quick Actions</div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {quickActions.map(a=>(
              <div key={a.page} onClick={()=>navigate(a.page)} className="row gap-12"
                style={{padding:'11px 13px',background:'var(--bg-3)',borderRadius:'var(--r)',cursor:'pointer',border:'1px solid var(--b1)',transition:'all .12s'}}
                onMouseOver={e=>{e.currentTarget.style.borderColor=a.color;e.currentTarget.style.background='var(--bg-4)'}}
                onMouseOut={e=>{e.currentTarget.style.borderColor='var(--b1)';e.currentTarget.style.background='var(--bg-3)'}}>
                <div style={{width:34,height:34,borderRadius:'var(--r)',background:`${a.color}20`,display:'flex',alignItems:'center',justifyContent:'center',color:a.color,flexShrink:0}}><Icon n={a.icon} s={16}/></div>
                <div><div style={{fontWeight:600,fontSize:13,color:'var(--t1)'}}>{a.label}</div><div style={{fontSize:11.5,color:'var(--t3)',marginTop:2}}>{a.sub}</div></div>
                <span style={{marginLeft:'auto',color:'var(--t4)',fontSize:18}}>›</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-title mb-14">Recent Invoices</div>
          {salesInvoices.length===0 ? <div className="empty" style={{padding:20}}><p>No invoices yet</p></div> : (
            <div className="table-wrap">
              <table className="tbl">
                <thead><tr><th>Invoice</th><th>Customer</th><th>Amount</th><th>Status</th></tr></thead>
                <tbody>
                  {salesInvoices.slice(0,5).map(inv=>(
                    <tr key={inv.id}>
                      <td className="td-mono" style={{fontSize:11}}>{inv.invoiceNumber}</td>
                      <td style={{fontSize:12.5,color:'var(--t1)'}}>{inv.customerName}</td>
                      <td style={{fontFamily:'JetBrains Mono',fontWeight:700,color:'var(--amber)',fontSize:12}}>₹{(inv.grandTotal||0).toLocaleString('en-IN')}</td>
                      <td><span className={`badge ${inv.status==='paid'?'badge-active':inv.status==='unpaid'?'badge-red':'badge-inactive'}`}>{inv.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="grid-2 gap-16">
        <div className="card">
          <div className="card-title mb-14">Recent Purchase Orders</div>
          {purchaseOrders.length===0 ? <div className="empty" style={{padding:20}}><p>No POs yet</p></div> : (
            <div className="table-wrap">
              <table className="tbl">
                <thead><tr><th>PO No.</th><th>Supplier</th><th>Total</th><th>Status</th></tr></thead>
                <tbody>
                  {purchaseOrders.slice(0,5).map(po=>(
                    <tr key={po.id}>
                      <td className="td-mono" style={{fontSize:11}}>{po.poNumber}</td>
                      <td style={{fontSize:12.5,color:'var(--t1)'}}>{po.supplierName}</td>
                      <td style={{fontFamily:'JetBrains Mono',fontWeight:700,color:'var(--blue)',fontSize:12}}>₹{(po.grandTotal||0).toLocaleString('en-IN')}</td>
                      <td><span className={`badge ${po.status==='received'?'badge-active':po.status==='pending'?'badge-amber':'badge-red'}`}>{po.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-title mb-14">⚠️ Low Stock Alerts</div>
          {stats.lowStock === 0 ? <div style={{padding:16,textAlign:'center',color:'var(--green)',fontSize:13}}>✓ All stock levels healthy</div> : (
            <div className="table-wrap">
              <table className="tbl">
                <thead><tr><th>SKU</th><th>Stock</th></tr></thead>
                <tbody>
                  {variants.filter(v=>{const i=inventory.find(x=>x.variantId===v.id);return (i?.qty||0)<=LOW}).slice(0,6).map(v=>{
                    const inv=inventory.find(i=>i.variantId===v.id)
                    return <tr key={v.id}><td className="td-mono" style={{fontSize:11}}>{v.sku}</td><td><span style={{fontFamily:'JetBrains Mono',fontWeight:700,color:(inv?.qty||0)===0?'var(--red)':'var(--amber)'}}>{inv?.qty||0}</span></td></tr>
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
