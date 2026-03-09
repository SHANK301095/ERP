import { useReducer, useEffect, useState } from 'react'
import { appReducer, loadState, saveState } from './store/reducer.js'
import { useToast, Toasts } from './components/ui/index.jsx'
import { Dashboard }       from './pages/Dashboard.jsx'
import { Products }        from './pages/Products.jsx'
import { SKUs }            from './pages/SKUs.jsx'
import { Templates }       from './pages/Templates.jsx'
import { Generator }       from './pages/Generator.jsx'
import { PrintJobs }       from './pages/PrintJobs.jsx'
import { ImportExport }    from './pages/ImportExport.jsx'
import { Inventory }       from './pages/Inventory.jsx'
import { Suppliers }       from './pages/Suppliers.jsx'
import { PurchaseOrders }  from './pages/PurchaseOrders.jsx'
import { Customers }       from './pages/Customers.jsx'
import { Sales }           from './pages/Sales.jsx'
import { Reports }         from './pages/Reports.jsx'
import { AuditLog }        from './pages/AuditLog.jsx'
import { Settings }        from './pages/Settings.jsx'
import { POS }             from './pages/POS.jsx'
import { GSTReports }      from './pages/GSTReports.jsx'
import { LabelDesigner }   from './pages/LabelDesigner.jsx'
import { Proforma }        from './pages/Proforma.jsx'
import { Users }           from './pages/Users.jsx'
import { CRM }             from './pages/CRM.jsx'
import { StockAlerts }     from './pages/StockAlerts.jsx'
import { ProfitLoss }      from './pages/ProfitLoss.jsx'
import { Manufacturing }   from './pages/Manufacturing.jsx'
import { Communications }  from './pages/Communications.jsx'
import { TallyExport }     from './pages/TallyExport.jsx'
import { MobileApp }       from './pages/MobileApp.jsx'
import { PaymentGateway }  from './pages/PaymentGateway.jsx'
import { EwayBill }        from './pages/EwayBill.jsx'
import { MultiBranch }     from './pages/MultiBranch.jsx'
import { SalesTeam }       from './pages/SalesTeam.jsx'
import { Expenses }        from './pages/Expenses.jsx'
import { HR }              from './pages/HR.jsx'
import { Loyalty }         from './pages/Loyalty.jsx'
import { Returns }         from './pages/Returns.jsx'
import { Tasks }           from './pages/Tasks.jsx'
import { PriceManager }    from './pages/PriceManager.jsx'
import { Resellers }       from './pages/Resellers.jsx'
import { AdvancedDashboard }  from './pages/AdvancedDashboard.jsx'
import { Notifications }      from './pages/Notifications.jsx'
import { VendorRating }       from './pages/VendorRating.jsx'
import { DeliveryTracking }   from './pages/DeliveryTracking.jsx'
import { StockTransfer }      from './pages/StockTransfer.jsx'
import { CashBook }           from './pages/CashBook.jsx'
import { LeaveManagement }    from './pages/LeaveManagement.jsx'
import { GiftCards }          from './pages/GiftCards.jsx'
import { WarrantyService }    from './pages/WarrantyService.jsx'
import { Campaigns }          from './pages/Campaigns.jsx'
import { BankReconciliation } from './pages/BankReconciliation.jsx'
import { ReferralProgram }    from './pages/ReferralProgram.jsx'
import { TargetTracker }      from './pages/TargetTracker.jsx'
import { QualityControl }     from './pages/QualityControl.jsx'
import { CustomerPortal }     from './pages/CustomerPortal.jsx'
import { SystemHealth }       from './pages/SystemHealth.jsx'

const NAV = [
  { id:'dashboard',   label:'Dashboard',         section:'OVERVIEW' },
  { id:'pos',         label:'POS Counter',        section:'OVERVIEW' },
  { id:'mobile',      label:'Scanner & App',      section:'OVERVIEW' },
  { id:'tasks',       label:'Tasks',              section:'OVERVIEW' },
  { id:'products',    label:'Products',           section:'CATALOG' },
  { id:'skus',        label:'All SKUs',           section:'CATALOG' },
  { id:'prices',      label:'Price Manager',      section:'CATALOG' },
  { id:'inventory',   label:'Inventory',          section:'CATALOG' },
  { id:'alerts',      label:'Stock Alerts',       section:'CATALOG' },
  { id:'labeldesign', label:'Label Designer',     section:'LABELS' },
  { id:'labels',      label:'Templates',          section:'LABELS' },
  { id:'generator',   label:'Print Labels',       section:'LABELS' },
  { id:'jobs',        label:'Print History',      section:'LABELS' },
  { id:'resellers',   label:'Reseller Network',   section:'SELLING' },
  { id:'advdash',    label:'Advanced Analytics', section:'REPORTS' },
  { id:'notifications',label:'Notifications',       section:'OVERVIEW' },
  { id:'vendor_rating',label:'Vendor Ratings',      section:'BUYING' },
  { id:'delivery',   label:'Delivery Tracking',    section:'SELLING' },
  { id:'stocktransfer',label:'Stock Transfer',      section:'BUYING' },
  { id:'cashbook',   label:'Cash Book',            section:'FINANCE' },
  { id:'bankrecon',  label:'Bank Reconciliation',  section:'FINANCE' },
  { id:'leave',      label:'Leave Management',     section:'HR' },
  { id:'giftcards',  label:'Gift Cards',           section:'SELLING' },
  { id:'warranty',   label:'Warranty & Service',   section:'SELLING' },
  { id:'campaigns',  label:'Campaigns',            section:'SELLING' },
  { id:'referral',   label:'Referral Program',     section:'SELLING' },
  { id:'targets',    label:'Target Tracker',       section:'SELLING' },
  { id:'qc',         label:'Quality Control',      section:'BUYING' },
  { id:'portal',     label:'Customer Portal',      section:'SELLING' },
  { id:'syshealth',  label:'System Health',        section:'SYSTEM' },
  { id:'purchase',    label:'Purchase Orders',    section:'BUYING' },
  { id:'suppliers',   label:'Suppliers',          section:'BUYING' },
  { id:'mfg',         label:'Manufacturing',      section:'BUYING' },
  { id:'branches',    label:'Multi-Branch',       section:'BUYING' },
  { id:'expenses',    label:'Expenses',           section:'BUYING' },
  { id:'sales',       label:'Sales & Invoices',   section:'SELLING' },
  { id:'proforma',    label:'Proforma/Challan',   section:'SELLING' },
  { id:'returns',     label:'Returns & Refunds',  section:'SELLING' },
  { id:'customers',   label:'Customers',          section:'SELLING' },
  { id:'crm',         label:'CRM Insights',       section:'SELLING' },
  { id:'loyalty',     label:'Loyalty Program',    section:'SELLING' },
  { id:'salesteam',   label:'Sales Team',         section:'SELLING' },
  { id:'payment',     label:'UPI & Payments',     section:'SELLING' },
  { id:'comms',       label:'WhatsApp & Email',   section:'SELLING' },
  { id:'reports',     label:'Analytics',          section:'REPORTS' },
  { id:'pl',          label:'Profit & Loss',      section:'REPORTS' },
  { id:'gst',         label:'GST Reports',        section:'REPORTS' },
  { id:'eway',        label:'E-Way / E-Invoice',  section:'REPORTS' },
  { id:'tally',       label:'Tally Export',       section:'REPORTS' },
  { id:'import',      label:'Import / Export',    section:'DATA' },
  { id:'audit',       label:'Audit Log',          section:'DATA' },
  { id:'hr',          label:'HR & Payroll',       section:'HR' },
  { id:'users',       label:'Users & Roles',      section:'SYSTEM' },
  { id:'settings',    label:'Settings',           section:'SYSTEM' },
]

const TITLES = {
  dashboard:'Dashboard', pos:'POS Counter', mobile:'Scanner & Mobile App', tasks:'Tasks & To-Do',
  notifications:'Notifications',
  products:'Products', skus:'All SKUs', prices:'Price Manager', inventory:'Inventory', alerts:'Stock Alerts',
  labeldesign:'Label Designer', labels:'Label Templates', generator:'Print Labels', jobs:'Print History',
  purchase:'Purchase Orders', suppliers:'Suppliers', mfg:'Manufacturing', branches:'Multi-Branch',
  vendor_rating:'Vendor Ratings', stocktransfer:'Stock Transfer', qc:'Quality Control', expenses:'Expense Tracker',
  sales:'Sales & Invoices', proforma:'Proforma / Challan', returns:'Returns & Refunds',
  customers:'Customers', crm:'CRM Insights', loyalty:'Loyalty Program', resellers:'Reseller Network',
  salesteam:'Sales Team', payment:'UPI & Payments', comms:'WhatsApp & Email',
  delivery:'Delivery Tracking', giftcards:'Gift Cards', warranty:'Warranty & Service',
  campaigns:'Campaigns', referral:'Referral Program', targets:'Target Tracker', portal:'Customer Portal',
  reports:'Analytics', advdash:'Advanced Analytics', pl:'Profit & Loss', gst:'GST Reports',
  eway:'E-Way Bill & E-Invoice', tally:'Tally Export',
  cashbook:'Cash Book', bankrecon:'Bank Reconciliation',
  import:'Import / Export', audit:'Audit Log',
  hr:'HR & Payroll', leave:'Leave Management',
  users:'Users & Roles', settings:'Settings', syshealth:'System Health',
}

export default function App() {
  const [state, dispatch] = useReducer(appReducer, null, loadState)
  const [page, setPage]   = useState('dashboard')
  const [collapsed, setCollapsed] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [theme, setTheme] = useState(localStorage.getItem('erp_theme') || 'dark')
  const toast = useToast()

  useEffect(() => { saveState(state) }, [state])
  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); localStorage.setItem('erp_theme', theme) }, [theme])
  useEffect(() => {
    const h = e => {
      if ((e.metaKey||e.ctrlKey) && e.key==='k') { e.preventDefault(); setSearchOpen(p=>!p) }
      if (e.key==='Escape') setSearchOpen(false)
    }
    window.addEventListener('keydown', h); return ()=>window.removeEventListener('keydown', h)
  }, [])

  const navigate = p => setPage(p)
  const props = { state, dispatch, toast, navigate }

  function getBadge(id) {
    const LOW = state.settings.lowStockThreshold||10
    const u = state.salesInvoices.filter(i=>i.status==='unpaid').length
    const p2 = state.purchaseOrders.filter(p=>p.status==='pending').length
    const l = state.variants.filter(v=>{const i=state.inventory.find(x=>x.variantId===v.id);return(i?.qty||0)<=LOW}).length
    const tasks = (state.settings.tasks||[]).filter(t=>!t.done).length
    const overdue = (state.settings.tasks||[]).filter(t=>!t.done&&t.dueDate&&t.dueDate<new Date().toISOString().slice(0,10)).length
    if (id==='products')  return state.products.length
    if (id==='skus')      return state.variants.length
    if (id==='customers') return state.customers.length
    if (id==='suppliers') return state.suppliers.length
    if (id==='sales'||id==='payment'||id==='comms') return u||null
    if (id==='purchase') return p2||null
    if (id==='inventory'||id==='alerts') return l||null
    if (id==='tasks') return overdue||tasks||null
    return null
  }

  const sections = [...new Set(NAV.map(n=>n.section))]
  const searchResults = searchQ.length>1 ? [
    ...state.products.filter(p=>p.name.toLowerCase().includes(searchQ.toLowerCase())).slice(0,3).map(p=>({type:'Product',label:p.name,sub:p.familyCode,page:'products'})),
    ...state.variants.filter(v=>v.sku.toLowerCase().includes(searchQ.toLowerCase())).slice(0,4).map(v=>({type:'SKU',label:v.sku,sub:(v.size||'')+(v.color?' '+v.color:''),page:'skus'})),
    ...state.salesInvoices.filter(i=>i.invoiceNumber?.toLowerCase().includes(searchQ.toLowerCase())||i.customerName?.toLowerCase().includes(searchQ.toLowerCase())).slice(0,3).map(i=>({type:'Invoice',label:i.invoiceNumber,sub:i.customerName,page:'sales'})),
    ...state.customers.filter(c=>c.name.toLowerCase().includes(searchQ.toLowerCase())).slice(0,2).map(c=>({type:'Customer',label:c.name,sub:c.phone,page:'customers'})),
    ...NAV.filter(n=>n.label.toLowerCase().includes(searchQ.toLowerCase())).slice(0,3).map(n=>({type:'Page',label:n.label,sub:n.section,page:n.id})),
  ] : []

  return (
    <>
      <div className="app-shell" data-theme={theme}>
        <aside className={`sidebar no-print ${collapsed?'collapsed':''}`} style={{width:collapsed?44:206,transition:'width .2s',overflowX:'hidden'}}>
          <div style={{padding:collapsed?'12px 6px':'12px 12px 8px',overflow:'hidden',borderBottom:'1px solid var(--b1)',marginBottom:4}}>
            {!collapsed?(<><div style={{fontFamily:'Syne',fontWeight:800,fontSize:15,color:'var(--amber)',letterSpacing:'-0.3px'}}>Hari <span style={{color:'var(--t3)'}}>ERP</span></div><div style={{fontSize:10,color:'var(--t4)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',marginTop:1}}>{state.settings.brandName}</div></>)
             :(<div style={{fontFamily:'Syne',fontWeight:800,fontSize:13,color:'var(--amber)',textAlign:'center'}}>H</div>)}
          </div>
          {sections.map(sec=>(
            <div key={sec} className="nav-group">
              {!collapsed&&<div className="nav-group-label">{sec}</div>}
              {NAV.filter(n=>n.section===sec).map(n=>{
                const badge=getBadge(n.id)
                return(
                  <div key={n.id} className={`nav-item ${page===n.id?'active':''}`} onClick={()=>navigate(n.id)}
                    title={collapsed?n.label:''} style={{justifyContent:collapsed?'center':'flex-start',padding:collapsed?'7px':'5px 10px',position:'relative',gap:8}}>
                    {!collapsed&&<span style={{width:5,height:5,borderRadius:'50%',background:page===n.id?'var(--amber)':'transparent',flexShrink:0}}/>}
                    {!collapsed&&<span style={{fontSize:11.5,whiteSpace:'nowrap'}}>{n.label}</span>}
                    {collapsed&&<span style={{fontSize:11,color:page===n.id?'var(--amber)':'var(--t3)'}}>{n.label.charAt(0)}</span>}
                    {!collapsed&&badge!=null&&<span className="nav-badge">{badge>99?'99+':badge}</span>}
                    {collapsed&&badge!=null&&<span style={{position:'absolute',top:3,right:3,background:'var(--amber)',color:'#000',borderRadius:'50%',width:10,height:10,fontSize:7,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700}}>{badge>9?'9+':badge}</span>}
                  </div>
                )
              })}
            </div>
          ))}
          <div style={{padding:collapsed?'6px':'6px 12px',textAlign:collapsed?'center':'left',marginTop:'auto'}}>
            {!collapsed&&<span style={{fontSize:9,color:'var(--t4)'}}>v4.4 · 37 modules</span>}
          </div>
        </aside>

        <main className="main">
          <div className="topbar no-print" style={{gap:8}}>
            <button onClick={()=>setCollapsed(p=>!p)} style={{background:'none',border:'none',color:'var(--t3)',cursor:'pointer',padding:'4px 6px',fontSize:15,flexShrink:0}}>☰</button>
            <div style={{flex:1,fontSize:12.5,fontWeight:600,color:'var(--t1)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{TITLES[page]||page}</div>
            <button onClick={()=>setSearchOpen(true)} style={{display:'flex',alignItems:'center',gap:6,background:'var(--bg3)',border:'1px solid var(--b1)',borderRadius:'var(--r)',padding:'5px 10px',cursor:'pointer',color:'var(--t3)',fontSize:11.5,flexShrink:0}}>
              🔍 <kbd style={{fontSize:9,background:'var(--bg4)',padding:'1px 4px',borderRadius:3,fontFamily:'JetBrains Mono'}}>⌘K</kbd>
            </button>
            <button onClick={()=>setTheme(t=>t==='dark'?'light':'dark')} style={{background:'var(--bg3)',border:'1px solid var(--b1)',borderRadius:'var(--r)',padding:'5px 7px',cursor:'pointer',fontSize:12,flexShrink:0}}>
              {theme==='dark'?'☀️':'🌙'}
            </button>
            <div style={{display:'flex',gap:6,flexShrink:0}}>
              <button className="btn btn-primary btn-sm" onClick={()=>navigate('sales')}>+ Invoice</button>
              <button className="btn btn-secondary btn-sm" onClick={()=>navigate('pos')}>POS</button>
            </div>
          </div>

          <div className="page-scroll">
            {page==='dashboard'   &&<Dashboard      {...props}/>}
            {page==='pos'         &&<POS             {...props}/>}
            {page==='mobile'      &&<MobileApp       {...props}/>}
            {page==='tasks'       &&<Tasks           {...props}/>}
            {page==='products'    &&<Products        {...props}/>}
            {page==='skus'        &&<SKUs            {...props}/>}
            {page==='prices'      &&<PriceManager    {...props}/>}
            {page==='inventory'   &&<Inventory       {...props}/>}
            {page==='alerts'      &&<StockAlerts     {...props}/>}
            {page==='labeldesign' &&<LabelDesigner   {...props}/>}
            {page==='labels'      &&<Templates       {...props}/>}
            {page==='generator'   &&<Generator       {...props}/>}
            {page==='jobs'        &&<PrintJobs       {...props}/>}
            {page==='purchase'    &&<PurchaseOrders  {...props}/>}
            {page==='suppliers'   &&<Suppliers       {...props}/>}
            {page==='mfg'         &&<Manufacturing   {...props}/>}
            {page==='branches'    &&<MultiBranch     {...props}/>}
            {page==='expenses'    &&<Expenses        {...props}/>}
            {page==='sales'       &&<Sales           {...props}/>}
            {page==='proforma'    &&<Proforma        {...props}/>}
            {page==='returns'     &&<Returns         {...props}/>}
            {page==='customers'   &&<Customers       {...props}/>}
            {page==='crm'         &&<CRM             {...props}/>}
            {page==='loyalty'     &&<Loyalty         {...props}/>}
            {page==='resellers'   &&<Resellers      {...props}/>}
            {page==='advdash'      &&<AdvancedDashboard {...props} navigate={setPage}/>}
            {page==='notifications' &&<Notifications     {...props}/>}
            {page==='vendor_rating' &&<VendorRating      {...props}/>}
            {page==='delivery'      &&<DeliveryTracking  {...props}/>}
            {page==='stocktransfer' &&<StockTransfer     {...props}/>}
            {page==='cashbook'      &&<CashBook          {...props}/>}
            {page==='bankrecon'     &&<BankReconciliation {...props}/>}
            {page==='leave'         &&<LeaveManagement   {...props}/>}
            {page==='giftcards'     &&<GiftCards         {...props}/>}
            {page==='warranty'      &&<WarrantyService   {...props}/>}
            {page==='campaigns'     &&<Campaigns         {...props}/>}
            {page==='referral'      &&<ReferralProgram   {...props}/>}
            {page==='targets'       &&<TargetTracker     {...props}/>}
            {page==='qc'            &&<QualityControl    {...props}/>}
            {page==='portal'        &&<CustomerPortal    {...props}/>}
            {page==='syshealth'     &&<SystemHealth      {...props}/>}
            {page==='salesteam'   &&<SalesTeam       {...props}/>}
            {page==='payment'     &&<PaymentGateway  {...props}/>}
            {page==='comms'       &&<Communications  {...props}/>}
            {page==='reports'     &&<Reports         {...props}/>}
            {page==='pl'          &&<ProfitLoss      {...props}/>}
            {page==='gst'         &&<GSTReports      {...props}/>}
            {page==='eway'        &&<EwayBill        {...props}/>}
            {page==='tally'       &&<TallyExport     {...props}/>}
            {page==='import'      &&<ImportExport    {...props}/>}
            {page==='audit'       &&<AuditLog        {...props}/>}
            {page==='hr'          &&<HR              {...props}/>}
            {page==='users'       &&<Users           {...props}/>}
            {page==='settings'    &&<Settings        {...props}/>}
          </div>
        </main>
      </div>

      {searchOpen&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',zIndex:9000,display:'flex',alignItems:'flex-start',justifyContent:'center',paddingTop:80}}
          onClick={e=>e.target===e.currentTarget&&setSearchOpen(false)}>
          <div style={{width:520,background:'var(--bg2)',borderRadius:'var(--rlg)',border:'1px solid var(--b2)',boxShadow:'0 25px 60px rgba(0,0,0,0.7)',overflow:'hidden'}}>
            <div style={{display:'flex',alignItems:'center',gap:10,padding:'12px 16px',borderBottom:'1px solid var(--b1)'}}>
              <span>🔍</span>
              <input autoFocus style={{flex:1,background:'none',border:'none',outline:'none',fontSize:15,color:'var(--t1)',fontFamily:'DM Sans'}} placeholder="Search products, SKUs, invoices, pages…" value={searchQ} onChange={e=>setSearchQ(e.target.value)} />
              <kbd style={{fontSize:11,color:'var(--t4)',background:'var(--bg3)',padding:'2px 6px',borderRadius:4}}>ESC</kbd>
            </div>
            {searchResults.length>0?(
              <div style={{maxHeight:360,overflowY:'auto'}}>
                {searchResults.map((r,i)=>(
                  <div key={i} onClick={()=>{navigate(r.page);setSearchOpen(false);setSearchQ('')}}
                    style={{display:'flex',gap:12,padding:'9px 16px',cursor:'pointer',borderBottom:'1px solid var(--b1)'}}
                    onMouseOver={e=>e.currentTarget.style.background='var(--bg3)'}
                    onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                    <span style={{fontSize:10,background:'var(--bg4)',color:'var(--t3)',padding:'2px 7px',borderRadius:10,alignSelf:'center',whiteSpace:'nowrap',fontWeight:600}}>{r.type}</span>
                    <div style={{flex:1}}><div style={{fontWeight:600,fontSize:13,color:'var(--t1)'}}>{r.label}</div><div style={{fontSize:11.5,color:'var(--t3)',marginTop:1}}>{r.sub}</div></div>
                    <span style={{color:'var(--t4)',fontSize:18,alignSelf:'center'}}>›</span>
                  </div>
                ))}
              </div>
            ):searchQ.length>1?(
              <div style={{padding:'28px',textAlign:'center',color:'var(--t4)',fontSize:13}}>No results for "{searchQ}"</div>
            ):(
              <div style={{padding:14}}>
                <div style={{fontSize:10,color:'var(--t4)',marginBottom:8,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.8px'}}>Quick Nav</div>
                <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
                  {['pos','sales','mfg','inventory','purchase','gst','pl','eway','payment','comms','salesteam','branches','tally','expenses','hr','loyalty','returns','tasks','prices','mobile','settings'].map(p=>(
                    <button key={p} onClick={()=>{navigate(p);setSearchOpen(false)}}
                      style={{padding:'4px 9px',background:'var(--bg3)',border:'1px solid var(--b1)',borderRadius:'var(--r)',color:'var(--t2)',fontSize:11,cursor:'pointer'}}>
                      {TITLES[p]}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      <Toasts list={toast.toasts}/>
    </>
  )
}
