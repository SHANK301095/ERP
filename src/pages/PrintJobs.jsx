import { Icon, Confirm } from '../components/ui/index.jsx'
import { useState } from 'react'

export function PrintJobs({ state, dispatch, navigate, toast }) {
  const { printJobs } = state
  const [confirmDel, setConfirmDel] = useState(null)

  return (
    <div>
      <div className="section-head mb-20">
        <h2>Print History</h2>
        <p>All label generation jobs — {printJobs.length} total</p>
      </div>
      {printJobs.length === 0 ? (
        <div className="card"><div className="empty"><Icon n="clock" s={28}/><h3>No print jobs yet</h3><p>Generate your first labels from the Generator page.</p></div></div>
      ) : (
        <div className="card" style={{padding:0}}>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Job Name</th><th>Date</th><th>Template</th><th>SKUs</th><th>Labels</th><th>Pages</th><th>Actions</th></tr></thead>
              <tbody>
                {printJobs.map(j => (
                  <tr key={j.id}>
                    <td className="td-p">{j.name}</td>
                    <td className="td-dim">{j.date}</td>
                    <td style={{color:'var(--t2)'}}>{j.templateName}</td>
                    <td><span className="badge badge-blue">{j.totalSkus}</span></td>
                    <td><span className="badge badge-amber">{j.totalLabels}</span></td>
                    <td><span className="badge badge-inactive">{j.totalPages}</span></td>
                    <td>
                      <div className="row gap-6">
                        <button className="btn btn-blue btn-xs" onClick={() => navigate('generator', j)}><Icon n="print" s={11}/> Reprint</button>
                        <button className="btn btn-danger btn-xs" onClick={() => setConfirmDel(j.id)}><Icon n="trash" s={11}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <Confirm open={!!confirmDel} onClose={()=>setConfirmDel(null)}
        onConfirm={()=>{dispatch({type:'DELETE_PRINT_JOB',payload:confirmDel});toast.show('Job deleted','info')}}
        msg="Delete this print job record?"/>
    </div>
  )
}
