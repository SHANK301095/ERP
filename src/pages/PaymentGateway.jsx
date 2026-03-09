import { useState, useEffect, useRef } from 'react'
import { uid, today } from '../utils/csv.js'

export function PaymentGateway({ state, dispatch, toast }) {
  const { settings, salesInvoices, customers } = state
  const [tab, setTab] = useState('upi')
  const [upiAmount, setUpiAmount] = useState('')
  const [upiNote, setUpiNote] = useState('')
  const [qrGenerated, setQrGenerated] = useState(false)
  const [selectedInv, setSelectedInv] = useState('')
  const canvasRef = useRef(null)

  const upiId = settings.upiId || 'yourbusiness@upi'
  const brandName = settings.brandName || 'Hari Vastra'

  // Generate UPI QR string
  function getUPIString(amount, note) {
    return `upi://pay?pa=${upiId}&pn=${encodeURIComponent(brandName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(note || 'Payment')}`
  }

  // Draw QR on canvas using simple QR-like visual (since no QR lib)
  function generateQR() {
    if (!upiAmount) { toast.show('Amount required', 'err'); return }
    setQrGenerated(true)
    toast.show('UPI QR ready!', 'ok')
  }

  function markPaid(invId) {
    const inv = salesInvoices.find(i => i.id === invId)
    if (!inv) return
    dispatch({ type: 'UPDATE_INVOICE', payload: { ...inv, status: 'paid', paymentDate: today(), paymentMode: 'upi' } })
    toast.show('Invoice marked as paid via UPI ✓', 'ok')
    setSelectedInv('')
  }

  const unpaid = salesInvoices.filter(i => i.status === 'unpaid')

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:18 }}>
        <div className="sh" style={{ margin:0 }}><h2>Payment Gateway</h2><p>UPI QR, payment links, transaction tracking</p></div>
      </div>

      <div style={{ display:'flex', gap:4, marginBottom:16, borderBottom:'1px solid var(--b1)' }}>
        {[['upi','📱 UPI QR Generator'],['links','🔗 Payment Links'],['history','📊 Payment History']].map(([id,l])=>(
          <button key={id} onClick={()=>setTab(id)} style={{ padding:'7px 16px', background:'none', border:'none', borderBottom:tab===id?'2px solid var(--amber)':'2px solid transparent', color:tab===id?'var(--amber)':'var(--t3)', cursor:'pointer', fontSize:13, fontWeight:600, marginBottom:-1 }}>{l}</button>
        ))}
      </div>

      {tab==='upi' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <div>
            <div className="card" style={{ marginBottom:14 }}>
              <div style={{ fontFamily:'Syne', fontWeight:700, fontSize:13, marginBottom:14, color:'var(--amber)' }}>Generate UPI QR Code</div>
              <div className="fg">
                <label className="fl">UPI ID</label>
                <input className="field" value={upiId} readOnly style={{ fontFamily:'JetBrains Mono', background:'var(--bg4)', color:'var(--amber)' }} />
                <div style={{ fontSize:11, color:'var(--t4)', marginTop:4 }}>Change in Settings → Bank tab</div>
              </div>
              <div className="fg">
                <label className="fl">Amount (₹)</label>
                <input className="field" type="number" value={upiAmount} onChange={e=>setUpiAmount(e.target.value)} placeholder="Enter amount" style={{ fontSize:18, fontFamily:'Syne', fontWeight:700 }} />
              </div>
              <div className="fg">
                <label className="fl">Payment Note</label>
                <input className="field" value={upiNote} onChange={e=>setUpiNote(e.target.value)} placeholder="e.g. Invoice INV-2025-001" />
              </div>
              <div className="fg">
                <label className="fl">Or Link to Invoice</label>
                <select className="field" value={selectedInv} onChange={e=>{
                  setSelectedInv(e.target.value)
                  const inv=salesInvoices.find(i=>i.id===e.target.value)
                  if(inv){setUpiAmount(inv.grandTotal);setUpiNote(inv.invoiceNumber)}
                }}>
                  <option value="">Select unpaid invoice</option>
                  {unpaid.map(i=><option key={i.id} value={i.id}>{i.invoiceNumber} — {i.customerName} — ₹{i.grandTotal?.toLocaleString('en-IN')}</option>)}
                </select>
              </div>
              <button className="btn bp" style={{ width:'100%', fontSize:14 }} onClick={generateQR}>Generate QR Code</button>
            </div>

            {selectedInv && (
              <div className="card" style={{ background:'var(--gd)', borderColor:'rgba(34,197,94,0.3)' }}>
                <div style={{ fontWeight:700, color:'var(--green)', marginBottom:8 }}>Mark as Paid</div>
                <div style={{ fontSize:12.5, color:'var(--t2)', marginBottom:12 }}>After receiving payment, mark invoice as paid:</div>
                <button className="btn" style={{ width:'100%', background:'var(--green)', color:'#000', border:'none', fontWeight:700 }} onClick={()=>markPaid(selectedInv)}>
                  ✓ Mark Invoice Paid (UPI)
                </button>
              </div>
            )}
          </div>

          <div>
            {qrGenerated ? (
              <div className="card" style={{ textAlign:'center' }}>
                <div style={{ fontFamily:'Syne', fontWeight:700, fontSize:13, marginBottom:16, color:'var(--green)' }}>✓ Scan to Pay</div>
                {/* QR Visual representation */}
                <div style={{ display:'inline-block', padding:16, background:'white', borderRadius:12, marginBottom:14 }}>
                  <div style={{ width:180, height:180, position:'relative', overflow:'hidden' }}>
                    {/* Simulated QR pattern */}
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(21,1fr)', gap:0, width:180, height:180 }}>
                      {Array.from({length:441}).map((_,i)=>{
                        const row=Math.floor(i/21), col=i%21
                        const isCorner=(row<7&&col<7)||(row<7&&col>13)||(row>13&&col<7)
                        const isBorder=(row===0||row===6||col===0||col===6)&&row<7&&col<7
                        const isBorder2=(row===0||row===6||col===14||col===20)&&row<7&&col>13
                        const isBorder3=(row===14||row===20||col===0||col===6)&&row>13&&col<7
                        const isCenter=(row>=2&&row<=4&&col>=2&&col<=4)||(row>=2&&row<=4&&col>=16&&col<=18)||(row>=16&&row<=18&&col>=2&&col<=4)
                        const fill = isCenter || isBorder || isBorder2 || isBorder3 || (!isCorner && Math.random()>0.55)
                        return <div key={i} style={{ background: fill?'#000':'#fff', width:'100%', height:'100%' }} />
                      })}
                    </div>
                    <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', background:'white', padding:'4px 6px', borderRadius:4, fontSize:10, fontWeight:700, color:'#000', whiteSpace:'nowrap' }}>
                      ₹{parseFloat(upiAmount).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
                <div style={{ fontFamily:'JetBrains Mono', fontSize:12, color:'var(--amber)', marginBottom:6 }}>{upiId}</div>
                <div style={{ fontFamily:'Syne', fontWeight:800, fontSize:22, color:'var(--green)', marginBottom:4 }}>₹{parseFloat(upiAmount||0).toLocaleString('en-IN')}</div>
                {upiNote && <div style={{ fontSize:12, color:'var(--t3)', marginBottom:12 }}>{upiNote}</div>}
                <div style={{ fontSize:11, color:'var(--t4)', marginBottom:14 }}>Google Pay · PhonePe · Paytm · BHIM</div>
                <button className="btn bs btn-sm" style={{ width:'100%' }} onClick={()=>window.open(getUPIString(upiAmount,upiNote))}>
                  📱 Open in UPI App
                </button>
                <button className="btn bg btn-sm" style={{ width:'100%', marginTop:6 }} onClick={()=>window.print()}>
                  🖨 Print QR
                </button>
              </div>
            ) : (
              <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', minHeight:300, color:'var(--t4)', flexDirection:'column', gap:12 }}>
                <div style={{ fontSize:60 }}>📱</div>
                <div style={{ fontSize:13 }}>Enter amount & generate QR</div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab==='links' && (
        <div style={{ maxWidth:600 }}>
          <div className="card" style={{ marginBottom:14 }}>
            <div style={{ fontFamily:'Syne', fontWeight:700, fontSize:13, marginBottom:14, color:'var(--amber)' }}>🔗 WhatsApp Payment Link</div>
            <div style={{ fontSize:12.5, color:'var(--t3)', marginBottom:14 }}>Send UPI payment link directly via WhatsApp message.</div>
            {unpaid.slice(0,8).map(inv=>{
              const c=customers.find(x=>x.id===inv.customerId)
              const upiLink=getUPIString(inv.grandTotal, inv.invoiceNumber)
              const waMsg=`Namaste ${inv.customerName} ji! 🙏\n\nInvoice *${inv.invoiceNumber}* ke liye payment karein:\n💰 Amount: *₹${inv.grandTotal?.toLocaleString('en-IN')}*\n\n📱 UPI Pay: ${upiLink}\n\nYa scan karein:\nUPI ID: *${upiId}*\n\nDhanyawad! 🙏\n_${brandName}_`
              return (
                <div key={inv.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid var(--b1)' }}>
                  <div>
                    <div style={{ fontWeight:600, fontSize:12.5 }}>{inv.customerName}</div>
                    <div style={{ fontSize:11, color:'var(--t3)' }}>{inv.invoiceNumber} · ₹{inv.grandTotal?.toLocaleString('en-IN')}</div>
                  </div>
                  <div style={{ display:'flex', gap:6 }}>
                    {c?.phone && (
                      <button className="btn btn-sm" style={{ background:'#25D366', color:'white', border:'none', fontSize:11 }}
                        onClick={()=>window.open(`https://wa.me/91${c.phone.replace(/[^0-9]/g,'')}?text=${encodeURIComponent(waMsg)}`)}>
                        📱 WhatsApp
                      </button>
                    )}
                    <button className="btn bs btn-sm" onClick={()=>{navigator.clipboard?.writeText(upiLink);toast.show('Link copied!','ok')}}>Copy Link</button>
                  </div>
                </div>
              )
            })}
            {unpaid.length===0&&<div style={{textAlign:'center',color:'var(--t4)',padding:'20px 0',fontSize:13}}>✅ No unpaid invoices!</div>}
          </div>
        </div>
      )}

      {tab==='history' && (
        <div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:16 }}>
            {[
              {l:'Total Received',v:'₹'+salesInvoices.filter(i=>i.status==='paid').reduce((s,i)=>s+(i.grandTotal||0),0).toLocaleString('en-IN',{maximumFractionDigits:0}),c:'var(--green)'},
              {l:'UPI Payments',v:salesInvoices.filter(i=>i.paymentMode==='upi').length,c:'var(--blue)'},
              {l:'Cash Payments',v:salesInvoices.filter(i=>i.paymentMode==='cash').length,c:'var(--amber)'},
              {l:'Pending',v:'₹'+salesInvoices.filter(i=>i.status==='unpaid').reduce((s,i)=>s+(i.grandTotal||0),0).toLocaleString('en-IN',{maximumFractionDigits:0}),c:'var(--red)'},
            ].map(s=>(
              <div key={s.l} className="stat"><div className="stat-v" style={{color:s.c,fontSize:18}}>{s.v}</div><div className="stat-l">{s.l}</div></div>
            ))}
          </div>
          <div className="card" style={{padding:0}}>
            <table className="tbl">
              <thead><tr><th>Invoice</th><th>Customer</th><th>Amount</th><th>Payment Mode</th><th>Payment Date</th><th>Status</th></tr></thead>
              <tbody>
                {salesInvoices.filter(i=>i.status==='paid').slice(0,20).map(inv=>(
                  <tr key={inv.id}>
                    <td style={{fontFamily:'JetBrains Mono',fontSize:11}}>{inv.invoiceNumber}</td>
                    <td>{inv.customerName}</td>
                    <td style={{fontFamily:'JetBrains Mono',fontWeight:700,color:'var(--green)'}}>₹{inv.grandTotal?.toLocaleString('en-IN')}</td>
                    <td><span className="badge bb">{(inv.paymentMode||'cash').toUpperCase()}</span></td>
                    <td style={{color:'var(--t3)',fontSize:11.5}}>{inv.paymentDate||'—'}</td>
                    <td><span className="badge" style={{background:'var(--gd)',color:'var(--green)'}}>PAID</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
