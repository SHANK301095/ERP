import { useState, useMemo } from 'react'
import { Icon, Confirm } from '../components/ui/index.jsx'
import { Barcode } from '../components/Barcode.jsx'

export function SKUs({ state, dispatch, toast }) {
  const { variants, products } = state
  const [q, setQ] = useState('')
  const [filterProd, setFilterProd] = useState('all')
  const [confirmDel, setConfirmDel] = useState(null)

  const filtered = useMemo(() => variants.filter(v => {
    if (filterProd !== 'all' && v.productId !== filterProd) return false
    if (q) {
      const lq = q.toLowerCase()
      return v.sku.toLowerCase().includes(lq) || (v.size||'').toLowerCase().includes(lq) || (v.color||'').toLowerCase().includes(lq)
    }
    return true
  }), [variants, q, filterProd])

  return (
    <div>
      <div className="row-between mb-20">
        <div className="section-head" style={{margin:0}}>
          <h2>All SKUs</h2>
          <p>Every product variant and its barcode</p>
        </div>
        <span className="badge badge-blue" style={{fontSize:13,padding:'5px 12px'}}>{variants.length} total SKUs</span>
      </div>

      <div className="card mb-14">
        <div className="row gap-12" style={{flexWrap:'wrap'}}>
          <div className="search-wrap" style={{flex:'1 1 180px'}}>
            <span className="s-ic"><Icon n="search" s={13}/></span>
            <input className="field" placeholder="Search SKU, size, color…" value={q} onChange={e=>setQ(e.target.value)}/>
          </div>
          <select className="field" style={{width:220}} value={filterProd} onChange={e=>setFilterProd(e.target.value)}>
            <option value="all">All Products</option>
            {products.map(p=><option key={p.id} value={p.id}>{p.shortName||p.name}</option>)}
          </select>
        </div>
      </div>

      <div className="card" style={{padding:0}}>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>SKU</th><th>Product</th><th>Size</th><th>Color</th><th>Price</th><th>Barcode</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {filtered.length===0 && <tr><td colSpan={8}><div className="empty" style={{padding:30}}><p>No SKUs found.</p></div></td></tr>}
              {filtered.map(v => {
                const p = products.find(x=>x.id===v.productId)
                return (
                  <tr key={v.id}>
                    <td><span className="td-mono">{v.sku}</span></td>
                    <td><div className="td-p" style={{fontSize:12.5}}>{p?.shortName||p?.name}</div></td>
                    <td>{v.size?<span className="badge badge-amber">{v.size}</span>:'—'}</td>
                    <td style={{color:'var(--t2)'}}>{v.color||'—'}</td>
                    <td><span style={{fontFamily:'JetBrains Mono',fontWeight:700,color:'var(--green)'}}>₹{v.priceOverride||p?.mrp}</span></td>
                    <td>
                      <div style={{width:96,height:30,background:'white',borderRadius:3,padding:2,overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <Barcode value={v.sku} height={22} fontSize={5} width={0.85}/>
                      </div>
                    </td>
                    <td><span className={`badge badge-${v.status==='active'?'active':'inactive'}`}>{v.status}</span></td>
                    <td><button className="btn btn-danger btn-xs" onClick={()=>setConfirmDel(v.id)}><Icon n="trash" s={11}/></button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      <Confirm open={!!confirmDel} onClose={()=>setConfirmDel(null)}
        onConfirm={()=>{dispatch({type:'DELETE_VARIANT',payload:confirmDel});toast.show('SKU deleted','info')}}
        msg="Delete this SKU permanently?"/>
    </div>
  )
}
