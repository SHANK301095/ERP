import { useState, useMemo } from 'react'

function MiniBar({ data, color='var(--amber)' }) {
  const max = Math.max(...data.map(d=>d.v), 1)
  return (
    <div style={{display:'flex',alignItems:'flex-end',gap:3,height:100}}>
      {data.map((d,i)=>(
        <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'flex-end',height:'100%',gap:2}}>
          <div title={`${d.l}: ₹${d.v?.toLocaleString('en-IN')}`}
            style={{width:'100%',background:color,borderRadius:'3px 3px 0 0',height:`${Math.max(3,(d.v/max)*100)}%`,opacity:0.75+0.25*(d.v/max)}}/>
          <div style={{fontSize:8.5,color:'var(--t4)',textAlign:'center',whiteSpace:'nowrap',overflow:'hidden',maxWidth:'100%'}}>{d.l}</div>
        </div>
      ))}
    </div>
  )
}

function DonutChart({ segments, size=100 }) {
  const total = segments.reduce((s,x)=>s+x.v,0)||1
  const r=38, cx=50, cy=50, circ=2*Math.PI*r
  let offset=0
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {segments.map((seg,i)=>{
        const pct=seg.v/total, dash=pct*circ, gap=circ-dash
        const el=<circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={seg.color} strokeWidth={16}
          strokeDasharray={`${dash} ${gap}`} strokeDashoffset={-offset*circ}
          style={{transform:'rotate(-90deg)',transformOrigin:'center'}}/>
        offset+=pct; return el
      })}
      <circle cx={cx} cy={cy} r={26} fill="var(--bg2)"/>
    </svg>
  )
}

export function AdvancedDashboard({ state, navigate }) {
  const { salesInvoices, purchaseOrders, inventory, variants, products, customers, settings } = state
  const [period, setPeriod] = useState('30')
  const TODAY = new Date()
  const fmt = d => d.toISOString().slice(0,10)
  const cutoff = new Date(TODAY - +period*86400000)

  const monthlyData = useMemo(()=>{
    return Array.from({length:12},(_,i)=>{
      const d = new Date(TODAY.getFullYear(), TODAY.getMonth()-11+i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
      const rev = salesInvoices.filter(inv=>(inv.date||'').startsWith(key)&&inv.status!=='cancelled').reduce((s,inv)=>s+(inv.grandTotal||0),0)
      const pur = purchaseOrders.filter(po=>(po.date||'').startsWith(key)).reduce((s,po)=>s+(po.grandTotal||0),0)
      const exp = (settings.expenses||[]).filter(e=>(e.date||'').startsWith(key)).reduce((s,e)=>s+e.amount,0)
      return { l:d.toLocaleString('default',{month:'short'}), v:rev, pur, exp, profit:rev-pur-exp }
    })
  },[salesInvoices,purchaseOrders,settings])

  const periodInvs = salesInvoices.filter(i=>i.date>=fmt(cutoff)&&i.status!=='cancelled')
  const periodRevenue = periodInvs.reduce((s,i)=>s+(i.grandTotal||0),0)
  const prevCutoff = new Date(cutoff - +period*86400000)
  const prevRevenue = salesInvoices.filter(i=>i.date>=fmt(prevCutoff)&&i.date<fmt(cutoff)&&i.status!=='cancelled').reduce((s,i)=>s+(i.grandTotal||0),0)
  const revGrowth = prevRevenue>0?((periodRevenue-prevRevenue)/prevRevenue*100).toFixed(1):null

  const productSales = {}
  periodInvs.forEach(inv=>(inv.items||[]).forEach(item=>{
    const k=item.variantId||item.name||'?'
    if(!productSales[k]) productSales[k]={name:item.productName||item.name||k,qty:0,rev:0}
    productSales[k].qty+=item.qty||0; productSales[k].rev+=(item.qty||0)*(item.unitPrice||0)
  }))
  const topProducts = Object.values(productSales).sort((a,b)=>b.rev-a.rev).slice(0,5)

  const LOW = settings.lowStockThreshold||10
  const stockH = {ok:0,low:0,out:0}
  variants.forEach(v=>{ const q=inventory.find(i=>i.variantId===v.id)?.qty||0; if(q===0)stockH.out++;else if(q<=LOW)stockH.low++;else stockH.ok++ })

  const dailyData = useMemo(()=>Array.from({length:14},(_,i)=>{
    const d=new Date(TODAY-(13-i)*86400000)
    const key=fmt(d)
    const rev=salesInvoices.filter(i=>i.date===key&&i.status!=='cancelled').reduce((s,i)=>s+(i.grandTotal||0),0)
    return {l:d.toLocaleString('default',{weekday:'short'}),v:rev,hint:key.slice(5)}
  }),[salesInvoices])

  const payModes={}
  salesInvoices.filter(i=>i.status!=='cancelled').forEach(i=>{ const m=i.paymentMode||'cash'; payModes[m]=(payModes[m]||0)+(i.grandTotal||0) })
  const modeColors={'cash':'var(--amber)','upi':'var(--green)','credit':'var(--red)','card':'var(--blue)','neft':'#c084fc'}

  const custRevenue = customers.map(c=>({...c,rev:salesInvoices.filter(i=>i.customerId===c.id&&i.status!=='cancelled').reduce((s,i)=>s+(i.grandTotal||0),0)})).sort((a,b)=>b.rev-a.rev)
  const totalRev = salesInvoices.filter(i=>i.status!=='cancelled').reduce((s,i)=>s+(i.grandTotal||0),0)
  const totalPur = purchaseOrders.reduce((s,p)=>s+(p.grandTotal||0),0)
  const totalExp = (settings.expenses||[]).reduce((s,e)=>s+e.amount,0)
  const maxMonthRev = Math.max(...monthlyData.map(m=>m.v),1)
  const totalPayModes = Object.values(payModes).reduce((s,v)=>s+v,0)||1

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:18}}>
        <div className="sh" style={{margin:0}}><h2>Advanced Analytics</h2><p>Charts, trends & business intelligence</p></div>
        <div style={{display:'flex',gap:6}}>
          {[['7','7 Days'],['30','30 Days'],['90','3 Months'],['365','1 Year']].map(([v,l])=>(
            <button key={v} onClick={()=>setPeriod(v)} className={`pill ${period===v?'on':''}`}>{l}</button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
        {[
          {l:`Revenue (${period}d)`,v:'₹'+periodRevenue.toLocaleString('en-IN',{maximumFractionDigits:0}),c:'var(--amber)',extra:revGrowth?`${+revGrowth>=0?'↑':'↓'}${Math.abs(revGrowth)}% vs prev`:null},
          {l:'Invoices (period)',v:periodInvs.length,c:'var(--blue)',extra:periodInvs.length?'Avg ₹'+(periodRevenue/periodInvs.length).toLocaleString('en-IN',{maximumFractionDigits:0}):null},
          {l:'Stock Health',v:`${stockH.ok}✓`,c:'var(--green)',extra:`${stockH.low} low · ${stockH.out} out`},
          {l:'Active Customers',v:custRevenue.filter(c=>c.rev>0).length,c:'var(--purple)',extra:`of ${customers.length} total`},
        ].map(s=>(
          <div key={s.l} className="stat">
            <div className="stat-v" style={{color:s.c,fontSize:20}}>{s.v}</div>
            <div className="stat-l">{s.l}</div>
            {s.extra&&<div style={{fontSize:10,color:s.extra?.startsWith('↑')?'var(--green)':s.extra?.startsWith('↓')?'var(--red)':'var(--t4)',marginTop:2}}>{s.extra}</div>}
          </div>
        ))}
      </div>

      {/* Monthly chart + Stock donut */}
      <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:16,marginBottom:16}}>
        <div className="card">
          <div style={{fontFamily:'Syne',fontWeight:700,fontSize:13,marginBottom:14,color:'var(--amber)'}}>📊 Monthly Revenue vs Cost (12 months)</div>
          <div style={{display:'flex',alignItems:'flex-end',gap:2,height:100,marginBottom:8}}>
            {monthlyData.map((m,i)=>{
              const revH=(m.v/maxMonthRev)*100
              const costH=((m.pur+m.exp)/maxMonthRev)*100
              return(
                <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',height:'100%',justifyContent:'flex-end'}}>
                  <div style={{width:'100%',display:'flex',gap:1,height:'100%',alignItems:'flex-end'}}>
                    <div title={`Rev: ₹${m.v.toLocaleString('en-IN')}`} style={{flex:1,background:'var(--amber)',borderRadius:'3px 3px 0 0',height:`${Math.max(2,revH)}%`,opacity:0.85}}/>
                    <div title={`Cost: ₹${(m.pur+m.exp).toLocaleString('en-IN')}`} style={{flex:1,background:'var(--red)',borderRadius:'3px 3px 0 0',height:`${Math.max(2,costH)}%`,opacity:0.55}}/>
                  </div>
                  <div style={{fontSize:8,color:'var(--t4)',marginTop:2}}>{m.l}</div>
                </div>
              )
            })}
          </div>
          <div style={{display:'flex',gap:12,fontSize:11,color:'var(--t3)'}}>
            <span style={{display:'flex',alignItems:'center',gap:4}}><span style={{width:10,height:10,borderRadius:2,background:'var(--amber)',display:'inline-block'}}/>Revenue</span>
            <span style={{display:'flex',alignItems:'center',gap:4}}><span style={{width:10,height:10,borderRadius:2,background:'var(--red)',opacity:0.55,display:'inline-block'}}/>Purchase+Expenses</span>
          </div>
        </div>

        <div className="card" style={{textAlign:'center'}}>
          <div style={{fontFamily:'Syne',fontWeight:700,fontSize:13,marginBottom:12,color:'var(--amber)'}}>📦 Stock Health</div>
          <div style={{display:'flex',justifyContent:'center',marginBottom:10}}>
            <DonutChart segments={[{v:stockH.ok,color:'var(--green)'},{v:stockH.low,color:'var(--amber)'},{v:stockH.out,color:'var(--red)'}]}/>
          </div>
          {[['✅ Healthy',stockH.ok,'var(--green)'],['⚠️ Low',stockH.low,'var(--amber)'],['❌ Out of Stock',stockH.out,'var(--red)']].map(([l,v,c])=>(
            <div key={l} style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:5}}>
              <span style={{color:'var(--t3)'}}>{l}</span>
              <span style={{fontFamily:'JetBrains Mono',fontWeight:700,color:c}}>{v} SKUs</span>
            </div>
          ))}
          <button className="btn bg btn-sm" style={{width:'100%',marginTop:8}} onClick={()=>navigate('alerts')}>View Alerts →</button>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16,marginBottom:16}}>
        <div className="card">
          <div style={{fontFamily:'Syne',fontWeight:700,fontSize:13,marginBottom:12,color:'var(--amber)'}}>📅 Daily Sales (14 days)</div>
          <MiniBar data={dailyData} color="var(--amber)"/>
        </div>

        <div className="card">
          <div style={{fontFamily:'Syne',fontWeight:700,fontSize:13,marginBottom:12,color:'var(--amber)'}}>🏆 Top Products (period)</div>
          {topProducts.length===0?<div style={{color:'var(--t4)',fontSize:12,textAlign:'center',padding:'20px 0'}}>No sales data yet</div>:topProducts.map((p,i)=>(
            <div key={i} style={{marginBottom:10}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:11.5,marginBottom:2}}>
                <span style={{color:'var(--t2)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>{p.name}</span>
                <span style={{fontFamily:'JetBrains Mono',color:'var(--amber)',fontWeight:700,marginLeft:6,flexShrink:0}}>₹{(p.rev/1000).toFixed(1)}K</span>
              </div>
              <div style={{background:'var(--bg4)',borderRadius:4,height:5}}>
                <div style={{background:'var(--amber)',height:'100%',width:`${p.rev/(topProducts[0].rev||1)*100}%`,borderRadius:4}}/>
              </div>
              <div style={{fontSize:10,color:'var(--t4)',marginTop:1}}>{p.qty} units sold</div>
            </div>
          ))}
        </div>

        <div className="card">
          <div style={{fontFamily:'Syne',fontWeight:700,fontSize:13,marginBottom:12,color:'var(--amber)'}}>💳 Payment Modes</div>
          {Object.entries(payModes).length===0?<div style={{color:'var(--t4)',fontSize:12,textAlign:'center',padding:'20px 0'}}>No payments yet</div>:
          Object.entries(payModes).sort((a,b)=>b[1]-a[1]).map(([mode,amount])=>(
            <div key={mode} style={{marginBottom:10}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:2}}>
                <span style={{color:'var(--t2)',textTransform:'capitalize',fontWeight:500}}>{mode}</span>
                <span style={{fontFamily:'JetBrains Mono',color:modeColors[mode]||'var(--amber)',fontWeight:700}}>₹{(amount/1000).toFixed(1)}K</span>
              </div>
              <div style={{background:'var(--bg4)',borderRadius:4,height:5}}>
                <div style={{background:modeColors[mode]||'var(--amber)',height:'100%',width:`${amount/totalPayModes*100}%`,borderRadius:4}}/>
              </div>
              <div style={{fontSize:10,color:'var(--t4)',marginTop:1}}>{(amount/totalPayModes*100).toFixed(0)}%</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        <div className="card">
          <div style={{fontFamily:'Syne',fontWeight:700,fontSize:13,marginBottom:12,color:'var(--amber)'}}>👥 Top 10 Customers</div>
          {custRevenue.slice(0,10).map((c,i)=>(
            <div key={c.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',borderBottom:'1px solid var(--b1)'}}>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <span style={{fontFamily:'JetBrains Mono',fontSize:10,color:'var(--t4)',width:16}}>{i+1}</span>
                <div>
                  <div style={{fontWeight:500,fontSize:12.5}}>{c.name}</div>
                  <div style={{fontSize:10.5,color:'var(--t3)'}}>{c.city||c.phone||'—'}</div>
                </div>
              </div>
              <span style={{fontFamily:'JetBrains Mono',fontWeight:700,color:'var(--amber)'}}>₹{(c.rev/1000).toFixed(1)}K</span>
            </div>
          ))}
          {customers.length===0&&<div style={{color:'var(--t4)',fontSize:12,textAlign:'center',padding:'20px 0'}}>No customers yet</div>}
        </div>

        <div className="card">
          <div style={{fontFamily:'Syne',fontWeight:700,fontSize:13,marginBottom:14,color:'var(--amber)'}}>📈 P&L Summary (All Time)</div>
          {[
            ['Total Revenue','₹'+totalRev.toLocaleString('en-IN',{maximumFractionDigits:0}),'var(--amber)'],
            ['Purchase Cost','-₹'+totalPur.toLocaleString('en-IN',{maximumFractionDigits:0}),'var(--red)'],
            ['Expenses','-₹'+totalExp.toLocaleString('en-IN',{maximumFractionDigits:0}),'var(--red)'],
            ['Gross Profit','₹'+(totalRev-totalPur).toLocaleString('en-IN',{maximumFractionDigits:0}),totalRev>totalPur?'var(--green)':'var(--red)'],
            ['Net Profit','₹'+(totalRev-totalPur-totalExp).toLocaleString('en-IN',{maximumFractionDigits:0}),(totalRev-totalPur-totalExp)>=0?'var(--green)':'var(--red)'],
            ['Profit Margin',totalRev>0?((totalRev-totalPur-totalExp)/totalRev*100).toFixed(1)+'%':'—',(totalRev-totalPur-totalExp)>=0?'var(--green)':'var(--red)'],
            ['Unpaid Invoices','₹'+salesInvoices.filter(i=>i.status==='unpaid').reduce((s,i)=>s+(i.grandTotal||0),0).toLocaleString('en-IN',{maximumFractionDigits:0}),'var(--red)'],
            ['Reseller Credit','₹'+(settings.resellerOrders||[]).filter(o=>o.status==='credit').reduce((s,o)=>s+(o.grandTotal||0),0).toLocaleString('en-IN',{maximumFractionDigits:0}),'var(--orange)'],
          ].map(([k,v,c])=>(
            <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid var(--b1)',fontSize:12.5}}>
              <span style={{color:'var(--t3)'}}>{k}</span>
              <span style={{fontFamily:'JetBrains Mono',fontWeight:700,color:c}}>{v}</span>
            </div>
          ))}
          <button className="btn bg btn-sm" style={{width:'100%',marginTop:12}} onClick={()=>navigate('pl')}>Full P&L Report →</button>
        </div>
      </div>
    </div>
  )
}
