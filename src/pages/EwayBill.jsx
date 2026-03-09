import { useState } from 'react'
import { downloadCSV } from '../utils/csv.js'

export function EwayBill({ state, toast }) {
  const { salesInvoices, purchaseOrders, settings, customers, suppliers } = state
  const [tab, setTab] = useState('eway')
  const [form, setForm] = useState({ invoiceId:'', transporterName:'', vehicleNo:'', distance:'', docType:'INV', transMode:'1' })
  const [bills, setBills] = useState(() => { try { return JSON.parse(localStorage.getItem('eway_bills')||'[]') } catch { return [] } })

  const set = (k,v) => setForm(p=>({...p,[k]:v}))

  function generateEway() {
    if (!form.invoiceId) { toast.show('Select invoice first','err'); return }
    const inv = salesInvoices.find(i=>i.id===form.invoiceId)
    if (!inv) return
    const ewb = {
      id: Date.now().toString(),
      ewbNo: 'EWB'+Math.floor(Math.random()*9000000+1000000),
      invoiceNumber: inv.invoiceNumber,
      customerName: inv.customerName,
      date: inv.date,
      value: inv.grandTotal,
      transporterName: form.transporterName,
      vehicleNo: form.vehicleNo?.toUpperCase(),
      distance: form.distance,
      validUpto: new Date(Date.now()+24*60*60*1000*(form.distance>100?form.distance/100:1)).toLocaleDateString('en-IN'),
      status: 'generated',
      generatedAt: new Date().toISOString()
    }
    const newBills = [ewb, ...bills]
    setBills(newBills)
    localStorage.setItem('eway_bills', JSON.stringify(newBills))
    toast.show('E-Way Bill generated: '+ewb.ewbNo,'ok')
    setForm({ invoiceId:'', transporterName:'', vehicleNo:'', distance:'', docType:'INV', transMode:'1' })
  }

  function exportGSTR1JSON() {
    const month = new Date().toISOString().slice(0,7)
    const invs = salesInvoices.filter(i=>(i.date||'').startsWith(month) && i.status!=='cancelled')
    const b2b = invs.filter(i=>i.customerGstin).map(i=>({
      ctin: i.customerGstin,
      inv: [{ inum:i.invoiceNumber, idt:i.date, val:(i.grandTotal||0).toFixed(2), pos:settings.stateCode||'08', rchrg:'N', inv_typ:'R',
        itms: (i.items||[]).map((item,idx)=>({ num:idx+1, itm_det:{ hsn_sc:item.hsnCode||'6211', txval:(item.qty*item.unitPrice).toFixed(2), irt:0, iamt:'0', crt:(item.gstRate||5)/2, camt:((item.qty*item.unitPrice)*(item.gstRate||5)/200).toFixed(2), srt:(item.gstRate||5)/2, samt:((item.qty*item.unitPrice)*(item.gstRate||5)/200).toFixed(2) }}))
      }]
    }))
    const b2cs = invs.filter(i=>!i.customerGstin).map(i=>({
      sply_ty:'INTRA', pos:settings.stateCode||'08', typ:'OE',
      txval:(i.taxable||0).toFixed(2), rt:(i.items?.[0]?.gstRate||5), iamt:'0',
      camt:((i.totalGst||0)/2).toFixed(2), samt:((i.totalGst||0)/2).toFixed(2)
    }))
    const gstr1 = { gstin:settings.gstin||'', fp:month.replace('-',''), b2b, b2cs, version:'GST3.0.4' }
    const blob = new Blob([JSON.stringify(gstr1, null, 2)], {type:'application/json'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href=url; a.download=`GSTR1_${month}.json`; a.click(); URL.revokeObjectURL(url)
    toast.show('GSTR-1 JSON downloaded! Upload to GST portal.','ok')
  }

  function exportEInvoiceJSON() {
    const inv = salesInvoices.find(i=>i.id===form.invoiceId)
    if (!inv) { toast.show('Select invoice','err'); return }
    const c = customers.find(x=>x.id===inv.customerId)
    const einv = {
      Version:'1.1', TranDtls:{ TaxSch:'GST', SupTyp:'B2B', RegRev:'N', IgstOnIntra:'N' },
      DocDtls:{ Typ:'INV', No:inv.invoiceNumber, Dt:inv.date },
      SellerDtls:{ Gstin:settings.gstin||'', LglNm:settings.brandName||'', Addr1:settings.address||'', Loc:'Jaipur', Pin:302001, Stcd:settings.stateCode||'08' },
      BuyerDtls:{ Gstin:inv.customerGstin||'URP', LglNm:inv.customerName, Pos:settings.stateCode||'08', Addr1:c?.address||'', Loc:'', Pin:302001, Stcd:settings.stateCode||'08' },
      ItemList:(inv.items||[]).map((item,i)=>({ SlNo:String(i+1), PrdDesc:item.productName||item.name, IsServc:'N', HsnCd:item.hsnCode||'6211', Qty:item.qty, Unit:'NOS', UnitPrice:item.unitPrice, TotAmt:(item.qty*item.unitPrice).toFixed(2), AssAmt:(item.qty*item.unitPrice).toFixed(2), GstRt:item.gstRate||5, CgstAmt:((item.qty*item.unitPrice)*(item.gstRate||5)/200).toFixed(2), SgstAmt:((item.qty*item.unitPrice)*(item.gstRate||5)/200).toFixed(2), IgstAmt:'0.00', TotItemVal:(item.qty*item.unitPrice*(1+(item.gstRate||5)/100)).toFixed(2) })),
      ValDtls:{ AssVal:(inv.taxable||0).toFixed(2), CgstVal:((inv.totalGst||0)/2).toFixed(2), SgstVal:((inv.totalGst||0)/2).toFixed(2), IgstVal:'0.00', TotInvVal:(inv.grandTotal||0).toFixed(2) }
    }
    const blob = new Blob([JSON.stringify(einv, null, 2)], {type:'application/json'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href=url; a.download=`EInvoice_${inv.invoiceNumber}.json`; a.click(); URL.revokeObjectURL(url)
    toast.show('E-Invoice JSON downloaded!','ok')
  }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:18 }}>
        <div className="sh" style={{ margin:0 }}><h2>E-Way Bill & E-Invoice</h2><p>GST compliance documents</p></div>
      </div>

      <div style={{ display:'flex', gap:4, marginBottom:16, borderBottom:'1px solid var(--b1)' }}>
        {[['eway','🚛 E-Way Bill'],['einv','📄 E-Invoice'],['gstr1','📊 GSTR-1 JSON']].map(([id,l])=>(
          <button key={id} onClick={()=>setTab(id)} style={{ padding:'7px 16px', background:'none', border:'none', borderBottom:tab===id?'2px solid var(--amber)':'2px solid transparent', color:tab===id?'var(--amber)':'var(--t3)', cursor:'pointer', fontSize:13, fontWeight:600, marginBottom:-1 }}>{l}</button>
        ))}
      </div>

      {tab==='eway' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <div className="card">
            <div style={{ fontFamily:'Syne', fontWeight:700, fontSize:13, marginBottom:14, color:'var(--amber)' }}>Generate E-Way Bill</div>
            <div className="fg"><label className="fl">Invoice *</label>
              <select className="field" value={form.invoiceId} onChange={e=>set('invoiceId',e.target.value)}>
                <option value="">Select Invoice</option>
                {salesInvoices.filter(i=>i.status!=='cancelled').map(i=><option key={i.id} value={i.id}>{i.invoiceNumber} — {i.customerName} — ₹{i.grandTotal?.toLocaleString('en-IN')}</option>)}
              </select>
            </div>
            <div className="fg"><label className="fl">Transport Mode</label>
              <select className="field" value={form.transMode} onChange={e=>set('transMode',e.target.value)}>
                <option value="1">Road</option><option value="2">Rail</option><option value="3">Air</option><option value="4">Ship</option>
              </select>
            </div>
            <div className="fg"><label className="fl">Transporter Name</label><input className="field" value={form.transporterName} onChange={e=>set('transporterName',e.target.value)} placeholder="e.g. DTDC, Blue Dart" /></div>
            <div className="fg"><label className="fl">Vehicle No.</label><input className="field" style={{ fontFamily:'JetBrains Mono', textTransform:'uppercase' }} value={form.vehicleNo} onChange={e=>set('vehicleNo',e.target.value.toUpperCase())} placeholder="RJ14CA1234" /></div>
            <div className="fg"><label className="fl">Distance (km)</label><input className="field" type="number" value={form.distance} onChange={e=>set('distance',e.target.value)} placeholder="e.g. 250" /></div>
            <button className="btn bp" style={{ width:'100%' }} onClick={generateEway}>Generate E-Way Bill</button>
            <div className="info-box" style={{ marginTop:12 }}>ℹ️ For actual filing, upload to <a href="https://ewaybillgst.gov.in" target="_blank" style={{ color:'var(--amber)' }}>ewaybillgst.gov.in</a> with your GSTIN login.</div>
          </div>

          <div className="card" style={{ padding:0 }}>
            <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--b1)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ fontFamily:'Syne', fontWeight:700, fontSize:13 }}>Generated E-Way Bills</div>
              <span className="badge bb">{bills.length}</span>
            </div>
            {bills.length===0 ? (
              <div className="empty"><p>No E-Way Bills generated yet</p></div>
            ) : bills.map(b=>(
              <div key={b.id} style={{ padding:'12px 16px', borderBottom:'1px solid var(--b1)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontFamily:'JetBrains Mono', fontWeight:700, color:'var(--amber)', fontSize:12 }}>{b.ewbNo}</span>
                  <span className="badge" style={{ background:'var(--gd)', color:'var(--green)', fontSize:10 }}>GENERATED</span>
                </div>
                <div style={{ fontSize:12, color:'var(--t2)' }}>{b.customerName} · {b.invoiceNumber}</div>
                <div style={{ display:'flex', gap:12, marginTop:4, fontSize:11, color:'var(--t3)' }}>
                  <span>₹{b.value?.toLocaleString('en-IN')}</span>
                  {b.vehicleNo&&<span>🚛 {b.vehicleNo}</span>}
                  <span>Valid: {b.validUpto}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab==='einv' && (
        <div style={{ maxWidth:600 }}>
          <div className="card" style={{ marginBottom:14 }}>
            <div style={{ fontFamily:'Syne', fontWeight:700, fontSize:13, marginBottom:14, color:'var(--blue)' }}>📄 E-Invoice JSON (IRP Format)</div>
            <div style={{ fontSize:12.5, color:'var(--t3)', marginBottom:14, lineHeight:1.6 }}>
              Generate JSON in IRP (Invoice Registration Portal) format. Upload to <strong style={{ color:'var(--t1)' }}>einvoice1.gst.gov.in</strong> to get IRN number.
            </div>
            <div className="fg"><label className="fl">Select Invoice</label>
              <select className="field" value={form.invoiceId} onChange={e=>set('invoiceId',e.target.value)}>
                <option value="">Select Invoice</option>
                {salesInvoices.filter(i=>i.customerGstin).map(i=><option key={i.id} value={i.id}>{i.invoiceNumber} — {i.customerName} (B2B)</option>)}
              </select>
            </div>
            <button className="btn" style={{ width:'100%', background:'var(--blue-dim)', color:'var(--blue)', border:'1px solid rgba(59,130,246,0.3)' }} onClick={exportEInvoiceJSON}>
              ⬇ Download E-Invoice JSON
            </button>
          </div>
          <div className="card">
            <div style={{ fontFamily:'Syne', fontWeight:700, fontSize:13, marginBottom:10, color:'var(--amber)' }}>Steps to Get IRN</div>
            {['Login to einvoice1.gst.gov.in','Go to: E-Invoice → Bulk Upload','Upload the JSON file downloaded here','Get IRN (Invoice Reference Number)','Print invoice with QR code from portal'].map((s,i)=>(
              <div key={i} style={{ display:'flex', gap:10, padding:'7px 0', borderBottom:'1px solid var(--b1)', fontSize:12.5, color:'var(--t2)' }}>
                <span style={{ width:22, height:22, borderRadius:'50%', background:'var(--ad)', color:'var(--amber)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, flexShrink:0 }}>{i+1}</span>
                {s}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab==='gstr1' && (
        <div style={{ maxWidth:600 }}>
          <div className="card" style={{ marginBottom:14 }}>
            <div style={{ fontFamily:'Syne', fontWeight:700, fontSize:13, marginBottom:14, color:'var(--green)' }}>📊 GSTR-1 JSON Export</div>
            <div style={{ fontSize:12.5, color:'var(--t3)', marginBottom:14, lineHeight:1.6 }}>
              Export current month's GSTR-1 in GST portal JSON format. Upload directly to <strong style={{ color:'var(--t1)' }}>gst.gov.in</strong> → Returns → GSTR-1.
            </div>
            <div style={{ background:'var(--bg3)', borderRadius:'var(--r)', padding:'12px 14px', marginBottom:14 }}>
              <div style={{ fontSize:12, color:'var(--t3)', marginBottom:8 }}>Current month summary:</div>
              {[
                ['GSTIN',settings.gstin||'Not set in Settings'],
                ['B2B Invoices',salesInvoices.filter(i=>i.customerGstin&&(i.date||'').startsWith(new Date().toISOString().slice(0,7))).length],
                ['B2C Invoices',salesInvoices.filter(i=>!i.customerGstin&&(i.date||'').startsWith(new Date().toISOString().slice(0,7))).length],
              ].map(([k,v])=>(
                <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:12.5, marginBottom:4 }}>
                  <span style={{ color:'var(--t3)' }}>{k}</span>
                  <span style={{ fontFamily:'JetBrains Mono', color:'var(--amber)' }}>{v}</span>
                </div>
              ))}
            </div>
            <button className="btn" style={{ width:'100%', background:'var(--gd)', color:'var(--green)', border:'1px solid rgba(34,197,94,0.3)', fontSize:14, padding:'10px' }} onClick={exportGSTR1JSON}>
              ⬇ Download GSTR-1 JSON
            </button>
          </div>
          <div className="info-box">ℹ️ GSTIN setting ke liye: Settings → GST tab → GSTIN field bharo. Accurate filing ke liye accountant se verify karwao.</div>
        </div>
      )}
    </div>
  )
}
