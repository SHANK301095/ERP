import { useState, useMemo } from 'react'
import { downloadCSV } from '../utils/csv.js'

export function TallyExport({ state, toast }) {
  const { salesInvoices, purchaseOrders, inventory, variants, products, customers, suppliers, settings } = state
  const [tab, setTab] = useState('vouchers')
  const [month, setMonth] = useState(new Date().toISOString().slice(0,7))

  function inMonth(d) { return (d||'').startsWith(month) }

  const salesInMonth = salesInvoices.filter(i => inMonth(i.date) && i.status!=='cancelled')
  const posInMonth   = purchaseOrders.filter(po => inMonth(po.date))

  // Tally XML for sales vouchers
  function generateTallyXML() {
    const lines = salesInMonth.map(inv => {
      const items = (inv.items||[]).map(item =>
        `    <ALLLEDGERENTRIES.LIST><LEDGERNAME>${item.productName||item.name||'Sales'}</LEDGERNAME><AMOUNT>-${(item.qty*item.unitPrice).toFixed(2)}</AMOUNT></ALLLEDGERENTRIES.LIST>`
      ).join('\n')
      return `  <VOUCHER VCHTYPE="Sales" ACTION="Create">
    <DATE>${inv.date?.replace(/-/g,'')}</DATE>
    <VOUCHERNUMBER>${inv.invoiceNumber}</VOUCHERNUMBER>
    <PARTYLEDGERNAME>${inv.customerName}</PARTYLEDGERNAME>
    <AMOUNT>${inv.grandTotal?.toFixed(2)}</AMOUNT>
    <NARRATION>Invoice ${inv.invoiceNumber} - ${inv.customerName}</NARRATION>
    <ALLLEDGERENTRIES.LIST>
      <LEDGERNAME>${inv.customerName}</LEDGERNAME>
      <AMOUNT>${inv.grandTotal?.toFixed(2)}</AMOUNT>
    </ALLLEDGERENTRIES.LIST>
${items}
  </VOUCHER>`
    }).join('\n')
    return `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC><REPORTNAME>Vouchers</REPORTNAME></REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE>
${lines}
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`
  }

  function downloadTallyXML() {
    const xml = generateTallyXML()
    const blob = new Blob([xml], { type:'text/xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href=url; a.download=`Tally_Sales_${month}.xml`; a.click()
    URL.revokeObjectURL(url)
    toast.show('Tally XML downloaded ✓','ok')
  }

  function exportLedger() {
    const rows = [
      ['Type','Date','Voucher No','Party Name','GSTIN','Debit','Credit','Narration'],
      ...salesInMonth.map(i => ['Sales',i.date,i.invoiceNumber,i.customerName,i.customerGstin||'','',i.grandTotal?.toFixed(2),'Sales Invoice']),
      ...posInMonth.map(po  => ['Purchase',po.date,po.poNumber,po.supplierName,po.supplierGstin||'',po.grandTotal?.toFixed(2),'','Purchase']),
    ]
    downloadCSV(`Ledger_${month}.csv`, rows)
    toast.show('Ledger CSV exported ✓','ok')
  }

  function exportStockSummary() {
    const rows = [
      ['Stock Code','Stock Name','Unit','Opening Qty','Inward','Outward','Closing Qty','Rate','Value'],
      ...variants.map(v => {
        const p = products.find(x=>x.id===v.productId)
        const inv = inventory.find(i=>i.variantId===v.id)
        const qty = inv?.qty||0
        return [v.sku, `${p?.name||''} ${v.size||''} ${v.color||''}`.trim(), 'Pcs', 0, 0, 0, qty, v.priceOverride||p?.mrp||0, qty*(v.priceOverride||p?.mrp||0)]
      })
    ]
    downloadCSV(`Stock_Summary_${month}.csv`, rows)
    toast.show('Stock summary exported ✓','ok')
  }

  function exportMasterXML() {
    // Tally Masters — customers + suppliers as ledgers
    const custLedgers = customers.map(c =>
      `  <LEDGER NAME="${c.name}" RESERVEDNAME="">
    <PARENT>Sundry Debtors</PARENT>
    <GSTREGISTRATIONTYPE>Regular</GSTREGISTRATIONTYPE>
    <PARTYGSTIN>${c.gstin||''}</PARTYGSTIN>
    <ADDRESS.LIST><ADDRESS>${c.address||''}</ADDRESS></ADDRESS.LIST>
  </LEDGER>`).join('\n')

    const suppLedgers = suppliers.map(s =>
      `  <LEDGER NAME="${s.name}" RESERVEDNAME="">
    <PARENT>Sundry Creditors</PARENT>
    <PARTYGSTIN>${s.gstin||''}</PARTYGSTIN>
    <ADDRESS.LIST><ADDRESS>${s.address||''}</ADDRESS></ADDRESS.LIST>
  </LEDGER>`).join('\n')

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC><REPORTNAME>All Masters</REPORTNAME></REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE>
${custLedgers}
${suppLedgers}
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`
    const blob = new Blob([xml], {type:'text/xml'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href=url; a.download=`Tally_Masters.xml`; a.click(); URL.revokeObjectURL(url)
    toast.show('Tally Masters XML downloaded ✓','ok')
  }

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:18}}>
        <div className="sh" style={{margin:0}}><h2>Tally Export</h2><p>Export data for Tally ERP / Busy Accounting</p></div>
        <input className="field" type="month" value={month} onChange={e=>setMonth(e.target.value)} style={{width:160}} />
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
        {[
          {l:'Sales Invoices',v:salesInMonth.length,c:'var(--amber)'},
          {l:'Purchase Orders',v:posInMonth.length,c:'var(--blue)'},
          {l:'Customers (Masters)',v:customers.length,c:'var(--green)'},
          {l:'SKUs (Stock Items)',v:variants.length,c:'var(--purple)'},
        ].map(s=>(
          <div key={s.l} className="stat"><div className="stat-v" style={{color:s.c,fontSize:22}}>{s.v}</div><div className="stat-l">{s.l}</div></div>
        ))}
      </div>

      {/* Export Buttons */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:20}}>
        <div className="card">
          <div style={{fontFamily:'Syne',fontWeight:700,fontSize:13,marginBottom:6,color:'var(--amber)'}}>📦 Tally Sales Vouchers</div>
          <div style={{fontSize:12,color:'var(--t3)',marginBottom:12}}>XML format — Import directly into Tally ERP. Includes {salesInMonth.length} invoices for {month}.</div>
          <button className="btn bp" style={{width:'100%'}} onClick={downloadTallyXML}>⬇ Download Sales XML</button>
        </div>
        <div className="card">
          <div style={{fontFamily:'Syne',fontWeight:700,fontSize:13,marginBottom:6,color:'var(--blue)'}}>📒 Tally Masters (Ledgers)</div>
          <div style={{fontSize:12,color:'var(--t3)',marginBottom:12}}>Export all customers & suppliers as Tally ledgers. Import once to set up masters.</div>
          <button className="btn" style={{width:'100%',background:'var(--blue-dim)',color:'var(--blue)',border:'1px solid rgba(59,130,246,0.3)'}} onClick={exportMasterXML}>⬇ Download Masters XML</button>
        </div>
        <div className="card">
          <div style={{fontFamily:'Syne',fontWeight:700,fontSize:13,marginBottom:6,color:'var(--green)'}}>📊 Day Book (CSV)</div>
          <div style={{fontSize:12,color:'var(--t3)',marginBottom:12}}>Combined sales + purchase ledger for {month}. Works with Excel, Busy, any accounting tool.</div>
          <button className="btn" style={{width:'100%',background:'var(--gd)',color:'var(--green)',border:'1px solid rgba(34,197,94,0.3)'}} onClick={exportLedger}>⬇ Export Day Book CSV</button>
        </div>
        <div className="card">
          <div style={{fontFamily:'Syne',fontWeight:700,fontSize:13,marginBottom:6,color:'var(--purple)'}}>📦 Stock Summary (CSV)</div>
          <div style={{fontSize:12,color:'var(--t3)',marginBottom:12}}>All SKUs with current stock, rate, and valuation. For Tally stock import.</div>
          <button className="btn" style={{width:'100%',background:'var(--purple-dim)',color:'var(--purple)',border:'1px solid rgba(167,139,250,0.3)'}} onClick={exportStockSummary}>⬇ Export Stock CSV</button>
        </div>
      </div>

      {/* Preview: Sales ledger */}
      <div className="card" style={{padding:0}}>
        <div style={{padding:'12px 16px',borderBottom:'1px solid var(--b1)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{fontFamily:'Syne',fontWeight:700,fontSize:13}}>Sales Vouchers Preview — {month}</div>
          <span style={{fontSize:11,color:'var(--t3)'}}>{salesInMonth.length} records</span>
        </div>
        <table className="tbl">
          <thead><tr><th>Date</th><th>Voucher No</th><th>Party Name</th><th>GSTIN</th><th>Taxable</th><th>GST</th><th>Total</th></tr></thead>
          <tbody>
            {salesInMonth.length===0&&<tr><td colSpan={7}><div className="empty"><p>No sales in {month}</p></div></td></tr>}
            {salesInMonth.map(inv=>(
              <tr key={inv.id}>
                <td style={{color:'var(--t3)',fontSize:11.5}}>{inv.date}</td>
                <td style={{fontFamily:'JetBrains Mono',fontSize:11,color:'var(--amber)'}}>{inv.invoiceNumber}</td>
                <td style={{fontWeight:500}}>{inv.customerName}</td>
                <td style={{fontFamily:'JetBrains Mono',fontSize:10.5,color:'var(--t3)'}}>{inv.customerGstin||'B2C'}</td>
                <td style={{fontFamily:'JetBrains Mono',fontSize:12}}>₹{(inv.taxable||0).toFixed(2)}</td>
                <td style={{fontFamily:'JetBrains Mono',fontSize:12,color:'var(--t3)'}}>₹{(inv.totalGst||0).toFixed(2)}</td>
                <td style={{fontFamily:'JetBrains Mono',fontWeight:700,color:'var(--amber)'}}>₹{(inv.grandTotal||0).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="info-box" style={{marginTop:14}}>
        ℹ️ <span><strong>Tally Import Steps:</strong> Tally mein jao → Gateway → Import Data → Vouchers → Downloaded XML select karo. Masters XML pehle import karo, phir Vouchers.</span>
      </div>
    </div>
  )
}
