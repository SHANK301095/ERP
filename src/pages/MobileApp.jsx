import { useState, useEffect, useRef } from 'react'

export function MobileApp({ state, dispatch, toast, navigate }) {
  const [barcodeInput, setBarcodeInput] = useState('')
  const [scanResult, setScanResult]     = useState(null)
  const [scanMode, setScanMode]         = useState('product') // product | invoice | sku
  const [installable, setInstallable]   = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const inputRef = useRef(null)

  const { variants, products, inventory, salesInvoices } = state

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault(); setDeferredPrompt(e); setInstallable(true)
    })
    window.addEventListener('appinstalled', () => {
      setInstallable(false); toast.show('App installed successfully! 🎉','ok')
    })
  }, [])

  useEffect(() => { inputRef.current?.focus() }, [scanMode])

  function handleScan(e) {
    if (e.key !== 'Enter') return
    const q = barcodeInput.trim()
    if (!q) return
    if (scanMode === 'product' || scanMode === 'sku') {
      const v = variants.find(x => x.sku.toLowerCase() === q.toLowerCase())
      if (v) {
        const p = products.find(x => x.id === v.productId)
        const inv = inventory.find(i => i.variantId === v.id)
        setScanResult({ type:'sku', sku:v.sku, product:p?.name||'Unknown', size:v.size, color:v.color, mrp:v.priceOverride||p?.mrp||0, stock:inv?.qty||0, gst:p?.gst||5, hsn:p?.hsnCode||'—' })
        toast.show('SKU found: '+v.sku,'ok')
      } else {
        setScanResult({ type:'notfound', query:q })
        toast.show('SKU not found: '+q,'err')
      }
    } else if (scanMode === 'invoice') {
      const inv = salesInvoices.find(i => i.invoiceNumber === q)
      if (inv) {
        setScanResult({ type:'invoice', ...inv })
        toast.show('Invoice: '+inv.invoiceNumber,'ok')
      } else {
        setScanResult({ type:'notfound', query:q })
        toast.show('Invoice not found: '+q,'err')
      }
    }
    setBarcodeInput('')
    inputRef.current?.focus()
  }

  async function installApp() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') toast.show('Installing app…','ok')
    setDeferredPrompt(null)
  }

  const isStandalone = window.matchMedia('(display-mode: standalone)').matches

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:18}}>
        <div className="sh" style={{margin:0}}><h2>Mobile App & Scanner</h2><p>Barcode scanner + install as mobile app</p></div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        {/* Barcode Scanner */}
        <div>
          <div className="card" style={{marginBottom:14}}>
            <div style={{fontFamily:'Syne',fontWeight:700,fontSize:13,marginBottom:12,color:'var(--amber)'}}>📷 Barcode Scanner</div>
            <div style={{display:'flex',gap:6,marginBottom:12}}>
              {[['product','Product/SKU'],['invoice','Invoice']].map(([m,l])=>(
                <button key={m} onClick={()=>{setScanMode(m);setScanResult(null)}} className={`pill ${scanMode===m?'on':''}`} style={{flex:1,justifyContent:'center'}}>{l}</button>
              ))}
            </div>
            <div style={{position:'relative',marginBottom:12}}>
              <div style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',fontSize:18,opacity:0.6}}>⊟</div>
              <input
                ref={inputRef} autoFocus
                className="field"
                style={{paddingLeft:38,fontFamily:'JetBrains Mono',fontSize:15,fontWeight:600,letterSpacing:1}}
                placeholder={`Scan barcode or type ${scanMode==='invoice'?'invoice no':'SKU'}…`}
                value={barcodeInput}
                onChange={e=>setBarcodeInput(e.target.value)}
                onKeyDown={handleScan}
              />
            </div>
            <div style={{fontSize:11.5,color:'var(--t4)',textAlign:'center'}}>
              Connect a USB/Bluetooth barcode scanner → it auto-types + presses Enter<br />Or type SKU manually and press Enter
            </div>
          </div>

          {/* Result */}
          {scanResult&&(
            <div className="card" style={{border:scanResult.type==='notfound'?'1px solid var(--rd)':'1px solid var(--ab)',background:scanResult.type==='notfound'?'var(--rd)':'var(--ad)'}}>
              {scanResult.type==='notfound'?(
                <div style={{textAlign:'center',color:'var(--red)',padding:'12px 0'}}>
                  <div style={{fontSize:32,marginBottom:8}}>❌</div>
                  <div style={{fontWeight:700}}>Not Found: "{scanResult.query}"</div>
                  <div style={{fontSize:12,color:'var(--t3)',marginTop:4}}>Check SKU or scan again</div>
                </div>
              ):scanResult.type==='sku'?(
                <div>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
                    <div style={{fontFamily:'Syne',fontWeight:800,fontSize:15,color:'var(--amber)'}}>{scanResult.sku}</div>
                    <span style={{background:scanResult.stock>10?'var(--gd)':scanResult.stock>0?'var(--ad)':'var(--rd)',color:scanResult.stock>10?'var(--green)':scanResult.stock>0?'var(--amber)':'var(--red)',padding:'2px 10px',borderRadius:20,fontSize:11,fontWeight:700}}>
                      {scanResult.stock} in stock
                    </span>
                  </div>
                  <div style={{fontWeight:600,color:'var(--t1)',marginBottom:4}}>{scanResult.product}</div>
                  {scanResult.size&&<div style={{fontSize:12,color:'var(--t3)'}}>Size: {scanResult.size}</div>}
                  {scanResult.color&&<div style={{fontSize:12,color:'var(--t3)'}}>Color: {scanResult.color}</div>}
                  <div style={{display:'flex',gap:10,marginTop:10}}>
                    <div style={{flex:1,background:'var(--bg2)',borderRadius:'var(--r)',padding:'8px 10px',textAlign:'center'}}>
                      <div style={{fontSize:10,color:'var(--t3)',marginBottom:2}}>MRP</div>
                      <div style={{fontFamily:'Syne',fontWeight:800,fontSize:18,color:'var(--amber)'}}>₹{scanResult.mrp}</div>
                    </div>
                    <div style={{flex:1,background:'var(--bg2)',borderRadius:'var(--r)',padding:'8px 10px',textAlign:'center'}}>
                      <div style={{fontSize:10,color:'var(--t3)',marginBottom:2}}>GST</div>
                      <div style={{fontFamily:'Syne',fontWeight:800,fontSize:18,color:'var(--blue)'}}>{scanResult.gst}%</div>
                    </div>
                    <div style={{flex:1,background:'var(--bg2)',borderRadius:'var(--r)',padding:'8px 10px',textAlign:'center'}}>
                      <div style={{fontSize:10,color:'var(--t3)',marginBottom:2}}>HSN</div>
                      <div style={{fontFamily:'JetBrains Mono',fontWeight:700,fontSize:13,color:'var(--t2)'}}>{scanResult.hsn}</div>
                    </div>
                  </div>
                  <div style={{display:'flex',gap:8,marginTop:10}}>
                    <button className="btn bp btn-sm" style={{flex:1}} onClick={()=>navigate('pos')}>Add to POS</button>
                    <button className="btn bs btn-sm" style={{flex:1}} onClick={()=>navigate('inventory')}>View Inventory</button>
                  </div>
                </div>
              ):scanResult.type==='invoice'?(
                <div>
                  <div style={{fontFamily:'Syne',fontWeight:800,fontSize:14,color:'var(--amber)',marginBottom:8}}>{scanResult.invoiceNumber}</div>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                    <span style={{color:'var(--t3)',fontSize:12}}>Customer</span>
                    <span style={{fontWeight:600}}>{scanResult.customerName}</span>
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                    <span style={{color:'var(--t3)',fontSize:12}}>Amount</span>
                    <span style={{fontFamily:'JetBrains Mono',fontWeight:700,color:'var(--amber)'}}>₹{scanResult.grandTotal?.toLocaleString('en-IN')}</span>
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between'}}>
                    <span style={{color:'var(--t3)',fontSize:12}}>Status</span>
                    <span style={{fontWeight:600,color:scanResult.status==='paid'?'var(--green)':'var(--amber)'}}>{scanResult.status?.toUpperCase()}</span>
                  </div>
                </div>
              ):null}
            </div>
          )}
        </div>

        {/* PWA Install */}
        <div>
          <div className="card" style={{marginBottom:14}}>
            <div style={{fontFamily:'Syne',fontWeight:700,fontSize:13,marginBottom:12,color:'var(--blue)'}}>📱 Install as Mobile App (PWA)</div>

            {isStandalone?(
              <div style={{textAlign:'center',padding:'16px 0'}}>
                <div style={{fontSize:40,marginBottom:8}}>✅</div>
                <div style={{fontWeight:700,color:'var(--green)',fontSize:14}}>App is installed!</div>
                <div style={{fontSize:12,color:'var(--t3)',marginTop:4}}>You're running Hari ERP as a standalone app</div>
              </div>
            ):(
              <>
                <div style={{textAlign:'center',padding:'12px 0 16px'}}>
                  <div style={{fontSize:48,marginBottom:8}}>📱</div>
                  <div style={{fontWeight:600,color:'var(--t1)',marginBottom:6}}>Hari ERP on Mobile</div>
                  <div style={{fontSize:12,color:'var(--t3)',marginBottom:16,lineHeight:1.6}}>
                    Install karo aur mobile pe use karo bina browser ke.<br />Works offline bhi!
                  </div>
                  {installable?(
                    <button className="btn bp" style={{fontSize:14,padding:'10px 24px'}} onClick={installApp}>
                      📥 Install App
                    </button>
                  ):(
                    <div style={{background:'var(--bg3)',borderRadius:'var(--r)',padding:'12px',fontSize:12,color:'var(--t3)',lineHeight:1.7}}>
                      <strong style={{color:'var(--t2)'}}>Manual Install:</strong><br/>
                      🌐 <strong>Chrome (Desktop):</strong> Address bar mein install icon click karo<br/>
                      📱 <strong>iPhone Safari:</strong> Share button → "Add to Home Screen"<br/>
                      📱 <strong>Android Chrome:</strong> Menu (⋮) → "Add to Home Screen"
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="card" style={{marginBottom:14}}>
            <div style={{fontFamily:'Syne',fontWeight:700,fontSize:13,marginBottom:12,color:'var(--amber)'}}>⌨️ Keyboard Shortcuts</div>
            {[
              ['⌘K / Ctrl+K', 'Global Search'],
              ['F2', 'New Invoice (in Sales page)'],
              ['ESC', 'Close any modal'],
              ['Enter', 'Confirm / Submit forms'],
              ['Tab', 'Next field in forms'],
            ].map(([k,d])=>(
              <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid var(--b1)'}}>
                <kbd style={{fontFamily:'JetBrains Mono',fontSize:11,background:'var(--bg4)',padding:'2px 7px',borderRadius:4,color:'var(--amber)'}}>{k}</kbd>
                <span style={{fontSize:12,color:'var(--t3)'}}>{d}</span>
              </div>
            ))}
          </div>

          <div className="card">
            <div style={{fontFamily:'Syne',fontWeight:700,fontSize:13,marginBottom:12,color:'var(--green)'}}>🔌 Hardware Scanner Setup</div>
            <div style={{fontSize:12,color:'var(--t3)',lineHeight:1.8}}>
              <strong style={{color:'var(--t1)'}}>Compatible Scanners:</strong><br/>
              • Zebra / Symbol USB scanners<br/>
              • Honeywell Voyager series<br/>
              • Any HID USB barcode scanner<br/>
              • Bluetooth scanners (Android/iOS)<br/><br/>
              <strong style={{color:'var(--t1)'}}>Setup:</strong><br/>
              1. Scanner plug karo (USB/Bluetooth)<br/>
              2. POS ya Scanner page open karo<br/>
              3. Barcode scan karo → auto populate!<br/>
              4. Enter key auto-press se search hoga
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
