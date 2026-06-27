import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { useProject } from '../../context/ProjectContext'
import { useAuth } from '../../context/AuthContext'
import { delayStatus, today } from '../../utils/delay'
import Badge from '../../components/Badge'
import Modal from '../../components/Modal'
import { MRF_SEED } from '../mrfs/mrfData'
import { useToast, ToastContainer } from '../../utils/toast'

export default function ProcurementList() {
  const { activeProject } = useProject()
  const { profile } = useAuth()
  const { toasts, toast } = useToast()

  const [mrfs, setMrfs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterSupplier, setFilterSupplier] = useState('')
  const [showProcModal, setShowProcModal] = useState(false)
  const [editingMRF, setEditingMRF] = useState(null)
  const [procForm, setProcForm] = useState({})

  const canProcure = ['Admin', 'Procurement'].includes(profile?.role)

  useEffect(() => { loadData() }, [activeProject])

  async function loadData() {
    setLoading(true)
    const { data, error } = await supabase
      .from('mrfs')
      .select('*')
      .eq('project_code', activeProject.code)
      .eq('approval_status', 'Approved')

    if (error || !data?.length) {
      setMrfs(MRF_SEED.filter(m => m.project_code === activeProject.code && m.approval_status === 'Approved'))
    } else {
      setMrfs(data)
    }
    setLoading(false)
  }

  function openProcModal(mrf) {
    setEditingMRF(mrf)
    setProcForm({
      supplier: mrf.supplier || '',
      quotation_ref: mrf.quotation_ref || '',
      po_number: mrf.po_number || '',
      po_date: mrf.po_date || '',
      po_amount: mrf.po_amount || '',
      expected_delivery: mrf.expected_delivery || '',
      subm_status: mrf.subm_status || 'Pending',
    })
    setShowProcModal(true)
  }

  async function saveProc() {
    if (!editingMRF) return
    const update = { ...procForm, po_amount: procForm.po_amount ? parseFloat(procForm.po_amount) : null }
    await supabase.from('mrfs').update(update).eq('id', editingMRF.id)
    setMrfs(prev => prev.map(m => m.id === editingMRF.id ? { ...m, ...update } : m))
    setShowProcModal(false)
    toast('Procurement details saved ✓', 'ok')
  }

  const suppliers = [...new Set(mrfs.map(m => m.supplier).filter(Boolean))]

  const filtered = mrfs.filter(m => {
    if (filterSupplier && m.supplier !== filterSupplier) return false
    if (search) {
      const q = search.toLowerCase()
      return [m.mrf_number, m.po_number, m.supplier, m.material_desc].some(v => (v || '').toLowerCase().includes(q))
    }
    return true
  })

  const totalPOValue = filtered.reduce((sum, m) => sum + (m.po_amount || 0), 0)
  const issuedPOs = filtered.filter(m => m.po_number).length
  const pendingPOs = filtered.filter(m => !m.po_number).length

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Procurement</div>
          <div className="page-subtitle">{activeProject.name} · Approved MRFs only</div>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'PO Issued', value: issuedPOs, color: 'var(--status-approved-text)', bg: 'var(--status-approved-bg)' },
          { label: 'Pending PO', value: pendingPOs, color: 'var(--status-pending-text)', bg: 'var(--status-pending-bg)' },
          { label: 'Total PO Value', value: `AED ${totalPOValue.toLocaleString()}`, color: 'var(--brand-primary)', bg: 'var(--bg-surface)' },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ borderTop: `3px solid ${s.color}` }}>
            <div className="stat-card-label">{s.label}</div>
            <div className="stat-card-value" style={{ fontSize: 22, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="filter-bar" style={{ marginBottom: 12 }}>
        <input placeholder="Search MRF, PO, supplier…" value={search} onChange={e => setSearch(e.target.value)} />
        <select value={filterSupplier} onChange={e => setFilterSupplier(e.target.value)}>
          <option value="">All Suppliers</option>
          {suppliers.map(s => <option key={s}>{s}</option>)}
        </select>
        {(search || filterSupplier) && (
          <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => { setSearch(''); setFilterSupplier('') }}>Clear</button>
        )}
      </div>

      {/* Table */}
      <div className="table-wrap">
        {loading ? (
          <div className="table-empty">Loading…</div>
        ) : !filtered.length ? (
          <div className="table-empty">No approved MRFs found.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>MRF No</th>
                <th>Material</th>
                <th>Submittal</th>
                <th>Supplier</th>
                <th>Quotation Ref</th>
                <th>PO Number</th>
                <th>PO Date</th>
                <th>PO Amount (AED)</th>
                <th>Expected Delivery</th>
                <th>Delay</th>
                {canProcure && <th></th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => {
                const ds = delayStatus(m)
                return (
                  <tr key={m.id} style={{ background: ds === 'Delayed' ? '#FFF5F5' : ds === 'At Risk' ? '#FFFBF0' : undefined }}>
                    <td><span className="doc-number">{m.mrf_number}</span></td>
                    <td style={{ fontSize: 12, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.material_desc}</td>
                    <td>{m.subm_status ? <Badge status={m.subm_status} label={m.subm_status} /> : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}</td>
                    <td style={{ fontSize: 12 }}>{m.supplier || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                    <td style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{m.quotation_ref || '—'}</td>
                    <td>{m.po_number ? <span className="doc-number">{m.po_number}</span> : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Not issued</span>}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m.po_date || '—'}</td>
                    <td style={{ fontSize: 13, fontWeight: 700 }}>{m.po_amount ? `${Number(m.po_amount).toLocaleString()}` : <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>—</span>}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m.expected_delivery || '—'}</td>
                    <td><Badge status={ds} /></td>
                    {canProcure && (
                      <td>
                        <button className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 9px' }} onClick={() => openProcModal(m)}>
                          ✏ PO
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* PO Modal */}
      <Modal
        open={showProcModal}
        onClose={() => setShowProcModal(false)}
        title={`Procurement — ${editingMRF?.mrf_number}`}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowProcModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={saveProc}>Save</button>
          </>
        }
      >
        {editingMRF && (
          <div>
            <div style={{ background: 'var(--bg-base)', borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: 18, fontSize: 12 }}>
              <strong>{editingMRF.mrf_number}</strong> — {editingMRF.material_desc}<br />
              <span style={{ color: 'var(--text-muted)' }}>Qty: {editingMRF.qty} {editingMRF.unit} · Need on-site: {editingMRF.required_on_site}</span>
            </div>
            <div className="form-grid form-grid-2" style={{ gap: 14 }}>
              {[
                { label: 'Supplier', field: 'supplier', placeholder: 'Supplier name' },
                { label: 'Quotation Ref', field: 'quotation_ref', placeholder: 'QT-2025-0001' },
                { label: 'PO Number', field: 'po_number', placeholder: 'PO-ANT-2025-00001' },
                { label: 'PO Date', field: 'po_date', type: 'date' },
                { label: 'PO Amount (AED)', field: 'po_amount', type: 'number', placeholder: '0.00' },
                { label: 'Expected Delivery', field: 'expected_delivery', type: 'date' },
              ].map(({ label, field, type = 'text', placeholder }) => (
                <div key={field} className="form-group">
                  <label className="form-label">{label}</label>
                  <input
                    className="form-input"
                    type={type}
                    placeholder={placeholder}
                    value={procForm[field] || ''}
                    onChange={e => setProcForm(f => ({ ...f, [field]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            <div className="form-group" style={{ marginTop: 14 }}>
              <label className="form-label">Submittal Status</label>
              <select className="form-select" value={procForm.subm_status || 'Pending'} onChange={e => setProcForm(f => ({ ...f, subm_status: e.target.value }))}>
                {['Pending', 'Submitted', 'Approved', 'Rejected'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
        )}
      </Modal>

      <ToastContainer toasts={toasts} />
    </div>
  )
}
