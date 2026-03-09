import { useState, useMemo, useRef } from 'react'
import { Icon } from '../components/ui/index.jsx'
import { SKUEngine } from '../engine/SKUEngine.js'

export function Settings({ state, dispatch, toast }) {
  const [f, setF] = useState({ ...state.settings })
  const [tab, setTab] = useState('brand')
  const logoRef = useRef(null)
  const restoreRef = useRef(null)
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  const previewSku = useMemo(() =>
    SKUEngine.generate({ familyCode: f.exFamily || 'HVK034' }, { size: f.exSize || '5NO', color: '' }, f),
    [f.brandCode, f.skuFormat, f.exFamily, f.exSize]
  )

  function save() { dispatch({ type: 'SET_SETTINGS', payload: f }); toast.show('Settings saved ✓', 'ok') }

  function handleLogoUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 500000) { toast.show('Logo too large (max 500KB)', 'err'); return }
    const reader = new FileReader()
    reader.onload = ev => { set('logoBase64', ev.target.result); toast.show('Logo uploaded!', 'ok') }
    reader.readAsDataURL(file)
  }

  function handleBackup() {
    const data = JSON.stringify(state, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `hari-erp-backup-${new Date().toISOString().slice(0,10)}.json`
    a.click(); URL.revokeObjectURL(url)
    toast.show('Backup downloaded!', 'ok')
  }

  function handleRestore(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result)
        if (!data.products || !data.variants) { toast.show('Invalid backup file', 'err'); return }
        if (!window.confirm('Restore backup? Current data will be replaced.')) return
        Object.keys(data).forEach(k => { if (k !== 'settings') dispatch({ type: 'RESET_ALL' }) })
        dispatch({ type: 'SET_SETTINGS', payload: data.settings })
        toast.show('Backup restored! Reload the page.', 'ok')
        setTimeout(() => window.location.reload(), 1500)
      } catch { toast.show('Invalid backup file', 'err') }
    }
    reader.readAsText(file)
  }

  function resetAll() {
    if (!window.confirm('⚠️ Reset ALL data to sample? Cannot be undone.')) return
    dispatch({ type: 'RESET_ALL' }); toast.show('App reset', 'info')
  }

  const tabs = [
    { id: 'brand',   label: '🏷 Brand' },
    { id: 'gst',     label: '📋 GST' },
    { id: 'bank',    label: '🏦 Bank' },
    { id: 'sku',     label: '🔑 SKU Format' },
    { id: 'system',  label: '⚙️ System' },
    { id: 'backup',  label: '💾 Backup' },
  ]

  return (
    <div style={{ maxWidth: 720 }}>
      <div className="sh mb-20"><h2>Settings</h2><p>Business configuration</p></div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid var(--b1)', paddingBottom: 0 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: '7px 14px', background: 'none', border: 'none', borderBottom: tab === t.id ? '2px solid var(--amber)' : '2px solid transparent', color: tab === t.id ? 'var(--amber)' : 'var(--t3)', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, marginBottom: -1, whiteSpace: 'nowrap' }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'brand' && (
        <div className="card">
          <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 13.5, marginBottom: 16, color: 'var(--amber)' }}>Brand Identity</div>

          {/* Logo Upload */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--t2)', display: 'block', marginBottom: 8 }}>Brand Logo</label>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <div style={{ width: 100, height: 60, background: f.logoBase64 ? 'transparent' : 'var(--bg3)', border: '1px dashed var(--b2)', borderRadius: 'var(--r)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                {f.logoBase64 ? <img src={f.logoBase64} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /> : <span style={{ fontSize: 11, color: 'var(--t4)' }}>No Logo</span>}
              </div>
              <div>
                <input type="file" accept="image/*" ref={logoRef} onChange={handleLogoUpload} style={{ display: 'none' }} />
                <button className="btn bs btn-sm" style={{ marginBottom: 6, display: 'block' }} onClick={() => logoRef.current?.click()}>📁 Upload Logo</button>
                {f.logoBase64 && <button className="btn bd btn-sm" onClick={() => set('logoBase64', null)}>✕ Remove</button>}
                <div style={{ fontSize: 10.5, color: 'var(--t4)', marginTop: 4 }}>PNG, JPG, SVG · Max 500KB<br />Appears on invoices, receipts, labels</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="fg"><label className="fl">Brand Name</label><input className="field" value={f.brandName || ''} onChange={e => set('brandName', e.target.value)} /></div>
            <div className="fg"><label className="fl">Brand Code (for SKU)</label><input className="field" style={{ fontFamily: 'JetBrains Mono' }} value={f.brandCode || ''} onChange={e => set('brandCode', e.target.value.toUpperCase())} /></div>
            <div className="fg"><label className="fl">Tagline</label><input className="field" value={f.tagline || ''} onChange={e => set('tagline', e.target.value)} placeholder="e.g. Premium Ethnic Wear" /></div>
            <div className="fg"><label className="fl">Phone</label><input className="field" value={f.phone || ''} onChange={e => set('phone', e.target.value)} /></div>
            <div className="fg"><label className="fl">Email</label><input className="field" type="email" value={f.email || ''} onChange={e => set('email', e.target.value)} /></div>
            <div className="fg"><label className="fl">Website</label><input className="field" value={f.website || ''} onChange={e => set('website', e.target.value)} placeholder="www.example.com" /></div>
            <div className="fg" style={{ gridColumn: '1/-1' }}><label className="fl">Business Address</label><textarea className="field" style={{ minHeight: 60 }} value={f.address || ''} onChange={e => set('address', e.target.value)} /></div>
          </div>

          {/* Brand Colors */}
          <div style={{ marginTop: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--t2)', display: 'block', marginBottom: 8 }}>Brand Colors (for invoices & receipts)</label>
            <div style={{ display: 'flex', gap: 12 }}>
              <div className="fg" style={{ flex: 1 }}><label className="fl">Primary Color</label><input type="color" value={f.brandPrimaryColor || '#f59e0b'} onChange={e => set('brandPrimaryColor', e.target.value)} style={{ width: '100%', height: 38, borderRadius: 'var(--r)', border: '1px solid var(--b2)', cursor: 'pointer', background: 'none' }} /></div>
              <div className="fg" style={{ flex: 1 }}><label className="fl">Secondary Color</label><input type="color" value={f.brandSecondaryColor || '#000000'} onChange={e => set('brandSecondaryColor', e.target.value)} style={{ width: '100%', height: 38, borderRadius: 'var(--r)', border: '1px solid var(--b2)', cursor: 'pointer', background: 'none' }} /></div>
            </div>
          </div>
        </div>
      )}

      {tab === 'gst' && (
        <div className="card">
          <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 13.5, marginBottom: 16, color: 'var(--amber)' }}>GST & Compliance</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="fg"><label className="fl">GSTIN</label><input className="field" style={{ fontFamily: 'JetBrains Mono' }} value={f.gstin || ''} onChange={e => set('gstin', e.target.value.toUpperCase())} maxLength={15} placeholder="08AAACH1234A1Z5" /></div>
            <div className="fg"><label className="fl">PAN</label><input className="field" style={{ fontFamily: 'JetBrains Mono' }} value={f.pan || ''} onChange={e => set('pan', e.target.value.toUpperCase())} maxLength={10} /></div>
            <div className="fg"><label className="fl">State</label><input className="field" value={f.state || ''} onChange={e => set('state', e.target.value)} placeholder="Rajasthan" /></div>
            <div className="fg"><label className="fl">State Code</label><input className="field" style={{ fontFamily: 'JetBrains Mono' }} value={f.stateCode || ''} onChange={e => set('stateCode', e.target.value)} placeholder="08" /></div>
            <div className="fg"><label className="fl">Default GST %</label><select className="field" value={f.defaultGst || 5} onChange={e => set('defaultGst', +e.target.value)}>{[0, 5, 12, 18, 28].map(g => <option key={g} value={g}>{g}%</option>)}</select></div>
            <div className="fg"><label className="fl">MSME Registration</label><input className="field" value={f.msme || ''} onChange={e => set('msme', e.target.value)} placeholder="UDYAM-RJ-XX-XXXXXXX" /></div>
          </div>
        </div>
      )}

      {tab === 'bank' && (
        <div className="card">
          <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 13.5, marginBottom: 16, color: 'var(--amber)' }}>Bank Details (shown on invoices)</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="fg"><label className="fl">Bank Name</label><input className="field" value={f.bankName || ''} onChange={e => set('bankName', e.target.value)} /></div>
            <div className="fg"><label className="fl">Branch</label><input className="field" value={f.bankBranch || ''} onChange={e => set('bankBranch', e.target.value)} /></div>
            <div className="fg"><label className="fl">Account Number</label><input className="field" style={{ fontFamily: 'JetBrains Mono' }} value={f.bankAccount || ''} onChange={e => set('bankAccount', e.target.value)} /></div>
            <div className="fg"><label className="fl">IFSC Code</label><input className="field" style={{ fontFamily: 'JetBrains Mono' }} value={f.bankIFSC || ''} onChange={e => set('bankIFSC', e.target.value)} /></div>
            <div className="fg"><label className="fl">Account Type</label><select className="field" value={f.bankType || 'current'} onChange={e => set('bankType', e.target.value)}><option value="current">Current Account</option><option value="savings">Savings Account</option></select></div>
            <div className="fg"><label className="fl">UPI ID</label><input className="field" value={f.upiId || ''} onChange={e => set('upiId', e.target.value)} placeholder="yourbusiness@upi" /></div>
          </div>
          <div className="fg" style={{ marginTop: 8 }}><label className="fl">Invoice Footer Message</label><textarea className="field" style={{ minHeight: 56 }} value={f.invoiceFooter || ''} onChange={e => set('invoiceFooter', e.target.value)} placeholder="Thank you for your business! E&OE. Subject to Jaipur jurisdiction." /></div>
        </div>
      )}

      {tab === 'sku' && (
        <div className="card">
          <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 13.5, marginBottom: 16, color: 'var(--amber)' }}>SKU Format Builder</div>
          <div className="fg"><label className="fl">Format Template</label><input className="field" style={{ fontFamily: 'JetBrains Mono' }} value={f.skuFormat || ''} onChange={e => set('skuFormat', e.target.value)} /></div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 8, fontWeight: 600 }}>Presets:</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {SKUEngine.PRESETS.map(({ fmt, example }) => (
                <div key={fmt} onClick={() => set('skuFormat', fmt)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 11px', background: f.skuFormat === fmt ? 'var(--ad)' : 'var(--bg3)', borderRadius: 'var(--r)', cursor: 'pointer', border: `1px solid ${f.skuFormat === fmt ? 'var(--ab)' : 'var(--b1)'}` }}>
                  <code style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: f.skuFormat === fmt ? 'var(--amber)' : 'var(--t2)' }}>{fmt}</code>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: 'var(--t3)' }}>{example}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="fg"><label className="fl">Test Family Code</label><input className="field" style={{ fontFamily: 'JetBrains Mono' }} value={f.exFamily || 'HVK034'} onChange={e => set('exFamily', e.target.value)} /></div>
            <div className="fg"><label className="fl">Test Size</label><input className="field" style={{ fontFamily: 'JetBrains Mono' }} value={f.exSize || '5NO'} onChange={e => set('exSize', e.target.value)} /></div>
          </div>
          <div style={{ background: 'var(--bg1)', border: '1px solid var(--b2)', borderRadius: 'var(--r)', padding: '12px 16px' }}>
            <div style={{ fontSize: 10, color: 'var(--t3)', marginBottom: 4 }}>PREVIEW</div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 22, fontWeight: 700, color: 'var(--amber)' }}>{previewSku}</div>
          </div>
        </div>
      )}

      {tab === 'system' && (
        <div className="card">
          <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 13.5, marginBottom: 16, color: 'var(--amber)' }}>System Settings</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="fg"><label className="fl">Invoice Prefix</label><input className="field" style={{ fontFamily: 'JetBrains Mono' }} value={f.invoicePrefix || 'INV'} onChange={e => set('invoicePrefix', e.target.value)} /></div>
            <div className="fg"><label className="fl">PO Prefix</label><input className="field" style={{ fontFamily: 'JetBrains Mono' }} value={f.poPrefix || 'PO'} onChange={e => set('poPrefix', e.target.value)} /></div>
            <div className="fg"><label className="fl">Low Stock Alert (units)</label><input className="field" type="number" value={f.lowStockThreshold || 10} onChange={e => set('lowStockThreshold', +e.target.value)} /></div>
            <div className="fg"><label className="fl">Currency</label><select className="field" value={f.currency || '₹'} onChange={e => set('currency', e.target.value)}><option value="₹">₹ INR</option><option value="$">$ USD</option><option value="€">€ EUR</option></select></div>
            <div className="fg"><label className="fl">Financial Year Start</label><select className="field" value={f.fyStart || 'april'} onChange={e => set('fyStart', e.target.value)}><option value="april">April (India)</option><option value="january">January</option></select></div>
            <div className="fg"><label className="fl">Date Format</label><select className="field" value={f.dateFormat || 'dd/mm/yyyy'} onChange={e => set('dateFormat', e.target.value)}><option value="dd/mm/yyyy">DD/MM/YYYY</option><option value="yyyy-mm-dd">YYYY-MM-DD</option></select></div>
          </div>
        </div>
      )}

      {tab === 'backup' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card">
            <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 13.5, marginBottom: 6, color: 'var(--green)' }}>⬇ Download Backup</div>
            <div style={{ fontSize: 12.5, color: 'var(--t3)', marginBottom: 14 }}>Download all your data as a JSON file. Store it safely.</div>
            <button className="btn bp" onClick={handleBackup} style={{ width: '100%', fontSize: 14, padding: '10px' }}>💾 Download Backup (.json)</button>
          </div>
          <div className="card">
            <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 13.5, marginBottom: 6, color: 'var(--blue)' }}>⬆ Restore from Backup</div>
            <div style={{ fontSize: 12.5, color: 'var(--t3)', marginBottom: 14 }}>Upload a previously downloaded backup file to restore data.</div>
            <input type="file" accept=".json" ref={restoreRef} onChange={handleRestore} style={{ display: 'none' }} />
            <button className="btn bs" onClick={() => restoreRef.current?.click()} style={{ width: '100%', fontSize: 14, padding: '10px' }}>📁 Select Backup File</button>
          </div>
          <div className="card" style={{ border: '1px solid var(--rd)' }}>
            <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 13.5, marginBottom: 6, color: 'var(--red)' }}>⚠ Reset All Data</div>
            <div style={{ fontSize: 12.5, color: 'var(--t3)', marginBottom: 14 }}>Delete all data and reload sample data. This cannot be undone.</div>
            <button className="btn bd" onClick={resetAll} style={{ width: '100%' }}>Reset App to Sample Data</button>
          </div>
        </div>
      )}

      {tab !== 'backup' && (
        <div style={{ marginTop: 14 }}>
          <button className="btn bp" style={{ fontSize: 14, padding: '9px 24px' }} onClick={save}>✓ Save Settings</button>
        </div>
      )}
    </div>
  )
}
