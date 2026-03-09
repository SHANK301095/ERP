import { Icon } from '../components/ui/index.jsx'

const ACTION_COLORS = {
  'Product Added':    'var(--green)',  'Product Updated':  'var(--blue)',  'Product Deleted':  'var(--red)',
  'Invoice Created':  'var(--amber)',  'Invoice Updated':  'var(--blue)',  'Invoice Deleted':  'var(--red)',
  'PO Created':       'var(--purple)', 'PO Received':      'var(--green)', 'PO Updated':       'var(--blue)',
  'Supplier Added':   'var(--green)',  'Supplier Updated': 'var(--blue)',  'Supplier Deleted': 'var(--red)',
  'Customer Added':   'var(--green)',  'Customer Updated': 'var(--blue)',  'Customer Deleted': 'var(--red)',
  'Settings Updated': 'var(--t2)',
}

export function AuditLog({ state }) {
  const { auditLogs } = state
  return (
    <div>
      <div className="section-head mb-20"><h2>Audit Log</h2><p>All activity history — {auditLogs.length} events</p></div>
      {auditLogs.length===0 ? (
        <div className="card"><div className="empty"><Icon n="clock" s={28}/><h3>No activity yet</h3><p>All changes will be logged here automatically.</p></div></div>
      ) : (
        <div className="card" style={{padding:0}}>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Time</th><th>Action</th><th>Detail</th></tr></thead>
              <tbody>
                {auditLogs.map(log=>(
                  <tr key={log.id}>
                    <td style={{fontFamily:'JetBrains Mono',fontSize:11,color:'var(--t3)',whiteSpace:'nowrap'}}>{new Date(log.timestamp).toLocaleString('en-IN')}</td>
                    <td><span className="badge" style={{background:`${ACTION_COLORS[log.action]||'var(--blue)'}18`,color:ACTION_COLORS[log.action]||'var(--blue)'}}>{log.action}</span></td>
                    <td style={{fontSize:12.5,color:'var(--t2)'}}>{log.detail}</td>
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
