import { useState, useRef, useEffect } from 'react'
import { Icon } from '../components/ui/index.jsx'

const FONTS = ['DM Sans', 'Syne', 'JetBrains Mono', 'Georgia', 'Arial']
const PRESET_BG = ['#ffffff', '#fff8e7', '#f0f4ff', '#f5f5f5', '#1a1a2e', '#0d1b2a', '#2d1b00', '#1a0a0a']
const PRESET_ACCENT = ['#f59e0b', '#3b82f6', '#22c55e', '#e11d48', '#7c3aed', '#0891b2', '#000000', '#ffffff']

export function LabelDesigner({ state, dispatch, toast }) {
  const { settings } = state
  const canvasRef = useRef(null)

  const [design, setDesign] = useState({
    widthMm: 62, heightMm: 38,
    bgColor: '#ffffff', bgImage: null,
    borderColor: '#000000', borderWidth: 1, borderRadius: 4, showBorder: true,
    // Fields
    showLogo: true, logoX: 5, logoY: 4, logoH: 12,
    showBrand: true, brandX: 22, brandY: 7, brandSize: 8, brandColor: '#000000', brandFont: 'Syne', brandBold: true,
    showName: true, nameX: 5, nameY: 18, nameSize: 7.5, nameColor: '#333333', nameFont: 'DM Sans', nameBold: false,
    showBarcode: true, barcodeX: 5, barcodeY: 24, barcodeH: 9,
    showSku: true, skuX: 5, skuY: 34, skuSize: 5.5, skuColor: '#666666',
    showSize: true, sizeX: 44, sizeY: 7, sizeSize: 9, sizeColor: '#000000', sizeBold: true,
    showMrp: true, mrpX: 42, mrpY: 22, mrpSize: 11, mrpColor: '#000000', mrpBold: true,
    showGst: false, accentColor: '#f59e0b',
  })

  // Sample values for preview
  const sample = {
    brand: settings.brandName || 'HARI VASTRA',
    name: 'Shringar Patka',
    sku: 'HV-HVK034-5NO',
    size: '5NO',
    mrp: '₹349',
  }

  const PX_PER_MM = 3.2

  const w = design.widthMm * PX_PER_MM
  const h = design.heightMm * PX_PER_MM
  const px = mm => mm * PX_PER_MM

  function s(k, v) { setDesign(p => ({ ...p, [k]: v })) }

  function handleBgUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => s('bgImage', ev.target.result)
    reader.readAsDataURL(file)
  }

  function saveTemplate() {
    const templates = state.templates
    const newT = {
      id: 'custom_' + Date.now(),
      name: 'Custom Design ' + new Date().toLocaleDateString('en-IN'),
      description: `${design.widthMm}×${design.heightMm}mm · Custom designed`,
      pageWidthMm: 210, pageHeightMm: 297,
      marginTopMm: 10, marginRightMm: 8, marginBottomMm: 10, marginLeftMm: 10,
      labelWidthMm: design.widthMm, labelHeightMm: design.heightMm,
      gapXMm: 3, gapYMm: 3,
      showBrand: design.showBrand, showProductName: design.showName, showBarcode: design.showBarcode,
      showSkuText: design.showSku, showSize: design.showSize, showMrp: design.showMrp,
      showBorder: design.showBorder, isDefault: false,
      customDesign: design, createdAt: new Date().toISOString().slice(0, 10)
    }
    dispatch({ type: 'ADD_TEMPLATE', payload: newT })
    toast.show('Template saved!', 'ok')
  }

  const previewStyle = {
    position: 'relative', width: w, height: h, flexShrink: 0,
    background: design.bgImage ? `url(${design.bgImage}) center/cover` : design.bgColor,
    border: design.showBorder ? `${design.borderWidth}px solid ${design.borderColor}` : 'none',
    borderRadius: design.borderRadius,
    overflow: 'hidden', fontFamily: 'DM Sans, sans-serif',
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
        <div className="sh" style={{ margin: 0 }}><h2>Label Designer</h2><p>Design custom stickers, labels, hang tags</p></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn bs btn-sm" onClick={() => s('bgImage', null) || s('bgColor', '#ffffff')}>Reset</button>
          <button className="btn bp" onClick={saveTemplate}>💾 Save as Template</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16 }}>
        {/* Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 'calc(100vh - 160px)', overflowY: 'auto' }}>

          {/* Size */}
          <div className="card">
            <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 12.5, marginBottom: 12, color: 'var(--amber)' }}>📐 Label Size</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div className="fg"><label className="fl">Width (mm)</label><input className="field" type="number" value={design.widthMm} onChange={e => s('widthMm', +e.target.value)} /></div>
              <div className="fg"><label className="fl">Height (mm)</label><input className="field" type="number" value={design.heightMm} onChange={e => s('heightMm', +e.target.value)} /></div>
            </div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {[['62×38', 62, 38], ['90×55', 90, 55], ['62×25', 62, 25], ['38×25', 38, 25], ['100×70', 100, 70]].map(([l, w, h]) => (
                <button key={l} onClick={() => setDesign(p => ({ ...p, widthMm: w, heightMm: h }))}
                  className="pill" style={{ fontSize: 10 }}>{l}mm</button>
              ))}
            </div>
          </div>

          {/* Background */}
          <div className="card">
            <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 12.5, marginBottom: 12, color: 'var(--amber)' }}>🎨 Background</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
              {PRESET_BG.map(c => (
                <div key={c} onClick={() => { s('bgColor', c); s('bgImage', null) }}
                  style={{ width: 26, height: 26, borderRadius: 6, background: c, border: design.bgColor === c && !design.bgImage ? '2px solid var(--amber)' : '1px solid var(--b2)', cursor: 'pointer' }} />
              ))}
            </div>
            <div className="fg" style={{ marginBottom: 8 }}>
              <label className="fl">Custom Color</label>
              <input type="color" value={design.bgColor} onChange={e => { s('bgColor', e.target.value); s('bgImage', null) }}
                style={{ width: '100%', height: 34, borderRadius: 'var(--r)', border: '1px solid var(--b2)', background: 'none', cursor: 'pointer' }} />
            </div>
            <div className="fg">
              <label className="fl">Background Image / Pattern</label>
              <input type="file" accept="image/*" onChange={handleBgUpload} style={{ fontSize: 11, color: 'var(--t2)' }} />
              {design.bgImage && <button className="btn bd btn-sm" style={{ marginTop: 4, width: '100%' }} onClick={() => s('bgImage', null)}>✕ Remove Image</button>}
            </div>
          </div>

          {/* Border */}
          <div className="card">
            <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 12.5, marginBottom: 10, color: 'var(--amber)' }}>🔲 Border & Shape</div>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, cursor: 'pointer', fontSize: 12.5, color: 'var(--t2)' }}>
              <input type="checkbox" checked={design.showBorder} onChange={e => s('showBorder', e.target.checked)} style={{ accentColor: 'var(--amber)' }} /> Show Border
            </label>
            {design.showBorder && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <div className="fg"><label className="fl">Color</label><input type="color" value={design.borderColor} onChange={e => s('borderColor', e.target.value)} style={{ width: '100%', height: 32, border: '1px solid var(--b2)', borderRadius: 'var(--r)', cursor: 'pointer', background: 'none' }} /></div>
                <div className="fg"><label className="fl">Width</label><input className="field" type="number" min="0.5" max="5" step="0.5" value={design.borderWidth} onChange={e => s('borderWidth', +e.target.value)} /></div>
                <div className="fg"><label className="fl">Radius</label><input className="field" type="number" min="0" max="20" value={design.borderRadius} onChange={e => s('borderRadius', +e.target.value)} /></div>
              </div>
            )}
          </div>

          {/* Logo */}
          <div className="card">
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10, cursor: 'pointer', fontFamily: 'Syne', fontWeight: 700, fontSize: 12.5, color: 'var(--blue)' }}>
              <input type="checkbox" checked={design.showLogo} onChange={e => s('showLogo', e.target.checked)} style={{ accentColor: 'var(--amber)' }} /> 🖼 Logo
            </label>
            {design.showLogo && (
              <>
                {!settings.logoBase64 && <div style={{ fontSize: 11, color: 'var(--amber)', marginBottom: 8, padding: '6px 10px', background: 'var(--ad)', borderRadius: 'var(--r)' }}>⚠ Upload logo in Settings first</div>}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  <div className="fg"><label className="fl">X (mm)</label><input className="field" type="number" value={design.logoX} onChange={e => s('logoX', +e.target.value)} /></div>
                  <div className="fg"><label className="fl">Y (mm)</label><input className="field" type="number" value={design.logoY} onChange={e => s('logoY', +e.target.value)} /></div>
                  <div className="fg"><label className="fl">Height</label><input className="field" type="number" value={design.logoH} onChange={e => s('logoH', +e.target.value)} /></div>
                </div>
              </>
            )}
          </div>

          {/* Fields toggles */}
          <div className="card">
            <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 12.5, marginBottom: 10, color: 'var(--amber)' }}>📝 Fields</div>
            {[
              ['showBrand', 'Brand Name', 'brandColor', 'brandSize', 'brandBold'],
              ['showName', 'Product Name', 'nameColor', 'nameSize', 'nameBold'],
              ['showSize', 'Size', 'sizeColor', 'sizeSize', 'sizeBold'],
              ['showMrp', 'MRP Price', 'mrpColor', 'mrpSize', 'mrpBold'],
              ['showBarcode', 'Barcode', null, null, null],
              ['showSku', 'SKU Text', 'skuColor', 'skuSize', null],
            ].map(([key, label, colorKey, sizeKey, boldKey]) => (
              <div key={key} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid var(--b1)' }}>
                <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer', fontSize: 12.5, color: design[key] ? 'var(--t1)' : 'var(--t3)' }}>
                  <input type="checkbox" checked={design[key]} onChange={e => s(key, e.target.checked)} style={{ accentColor: 'var(--amber)' }} />
                  <span style={{ fontWeight: 600 }}>{label}</span>
                </label>
                {design[key] && colorKey && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center' }}>
                    <input type="color" value={design[colorKey]} onChange={e => s(colorKey, e.target.value)}
                      style={{ width: 28, height: 28, border: 'none', borderRadius: 4, cursor: 'pointer', background: 'none' }} />
                    {sizeKey && <input className="field" type="number" min="4" max="18" step="0.5" value={design[sizeKey]} onChange={e => s(sizeKey, +e.target.value)} style={{ width: 60 }} placeholder="pt" />}
                    {boldKey && <label style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 11, color: 'var(--t3)', cursor: 'pointer' }}><input type="checkbox" checked={design[boldKey]} onChange={e => s(boldKey, e.target.checked)} style={{ accentColor: 'var(--amber)' }} /> Bold</label>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 30, background: 'repeating-linear-gradient(45deg, var(--bg3) 0, var(--bg3) 10px, var(--bg2) 10px, var(--bg2) 20px)' }}>
            <div style={{ marginBottom: 14, fontSize: 11, color: 'var(--t3)', fontFamily: 'JetBrains Mono' }}>PREVIEW — {design.widthMm}×{design.heightMm}mm</div>
            <div style={previewStyle}>
              {/* Background */}
              {design.bgImage && <div style={{ position: 'absolute', inset: 0, background: `url(${design.bgImage}) center/cover` }} />}

              {/* Logo */}
              {design.showLogo && settings.logoBase64 && (
                <img src={settings.logoBase64} style={{ position: 'absolute', left: px(design.logoX), top: px(design.logoY), height: px(design.logoH), objectFit: 'contain', maxWidth: px(design.widthMm * 0.35) }} />
              )}

              {/* Brand */}
              {design.showBrand && (
                <div style={{ position: 'absolute', left: px(design.brandX), top: px(design.brandY), fontSize: px(design.brandSize / 2.8), fontWeight: design.brandBold ? 700 : 400, color: design.brandColor, fontFamily: design.brandFont, lineHeight: 1.2, whiteSpace: 'nowrap' }}>
                  {sample.brand}
                </div>
              )}

              {/* Name */}
              {design.showName && (
                <div style={{ position: 'absolute', left: px(design.nameX), top: px(design.nameY), right: 4, fontSize: px(design.nameSize / 2.8), fontWeight: design.nameBold ? 700 : 400, color: design.nameColor, fontFamily: design.nameFont, lineHeight: 1.2 }}>
                  {sample.name}
                </div>
              )}

              {/* Barcode */}
              {design.showBarcode && (
                <div style={{ position: 'absolute', left: px(design.barcodeX), top: px(design.barcodeY), width: px(design.widthMm - design.barcodeX * 2), height: px(design.barcodeH), background: 'repeating-linear-gradient(90deg,#222 0,#222 1px,white 1px,white 2.5px)', borderRadius: 1 }} />
              )}

              {/* SKU */}
              {design.showSku && (
                <div style={{ position: 'absolute', left: px(design.skuX), top: px(design.skuY), fontSize: px(design.skuSize / 2.8), color: design.skuColor, fontFamily: 'JetBrains Mono' }}>
                  {sample.sku}
                </div>
              )}

              {/* Size */}
              {design.showSize && (
                <div style={{ position: 'absolute', left: px(design.sizeX), top: px(design.sizeY), fontSize: px(design.sizeSize / 2.8), fontWeight: design.sizeBold ? 800 : 400, color: design.sizeColor, fontFamily: 'Syne' }}>
                  {sample.size}
                </div>
              )}

              {/* MRP */}
              {design.showMrp && (
                <div style={{ position: 'absolute', left: px(design.mrpX), top: px(design.mrpY), fontSize: px(design.mrpSize / 2.8), fontWeight: design.mrpBold ? 800 : 400, color: design.mrpColor, fontFamily: 'Syne' }}>
                  {sample.mrp}
                </div>
              )}
            </div>
          </div>

          {/* Accent colors */}
          <div className="card">
            <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 12.5, marginBottom: 10, color: 'var(--amber)' }}>🎨 Quick Color Presets</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { name: 'Classic White', bg: '#ffffff', border: '#000000', brand: '#000000', mrp: '#000000' },
                { name: 'Premium Black', bg: '#111111', border: '#f59e0b', brand: '#f59e0b', mrp: '#ffffff' },
                { name: 'Royal Blue',    bg: '#0d1b4b', border: '#3b82f6', brand: '#ffffff', mrp: '#fbbf24' },
                { name: 'Warm Cream',    bg: '#fff8e7', border: '#92400e', brand: '#92400e', mrp: '#92400e' },
                { name: 'Fresh Green',   bg: '#f0fdf4', border: '#16a34a', brand: '#16a34a', mrp: '#15803d' },
                { name: 'Rose Gold',     bg: '#fff1f2', border: '#e11d48', brand: '#be123c', mrp: '#be123c' },
              ].map(preset => (
                <button key={preset.name} onClick={() => setDesign(p => ({ ...p, bgColor: preset.bg, bgImage: null, borderColor: preset.border, brandColor: preset.brand, mrpColor: preset.mrp }))}
                  className="pill" style={{ fontSize: 11 }}>
                  <span style={{ width: 12, height: 12, borderRadius: '50%', background: preset.bg, border: `2px solid ${preset.border}`, display: 'inline-block', marginRight: 5, flexShrink: 0 }} />
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          <div className="info-box">ℹ️ Save this design as a template, then use it in <strong>Print Labels</strong> → Generator to print on your products.</div>
        </div>
      </div>
    </div>
  )
}
