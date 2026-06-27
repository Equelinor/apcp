import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { useProject } from '../../context/ProjectContext'
import { useAuth } from '../../context/AuthContext'
import { today } from '../../utils/delay'
import Badge from '../../components/Badge'
import Modal from '../../components/Modal'
import { MRF_SEED } from '../mrfs/mrfData'
import { useToast, ToastContainer } from '../../utils/toast'

export default function DeliveryList() {
  const { activeProject } = useProject()
  const { profile } = useAuth()
  const { toasts, toast } = useToast()

  const [mrfs, setMrfs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showDelModal, setShowDelModal] = useState(false)
  const [showInspModal, setShowInspModal] = useState(false)
  const [editingMRF, setEditingMRF] = useState(null)
  const [delForm, setDelForm] = useState({})
  const [inspForm, setInspForm] = useState({})
  const [search, setSearch] = useState('')

  const canReceive = ['Admin', 'Procurement', 'Site Engineer'].includes(profile?.role)
  const canInspect = ['Admin', 'PM'].includes(profile?.role)

  useEffect(() => { loadData() }, [activeProject])

  async function loadData() {
    setLoading(true)
    const { data, error } = await supabase
      .from('mrfs')
      .select('*')
      .eq('project_code', activeProject.code)
      .not('po_number', 'is', null)

    if (error || !data?.length) {
      setMrfs(MRF_SEED.filter(m => m.project_code === activeProject.code && m.po_number))
    } else {
      setMrfs(data)
    }
    setLoading(false)
  }

  function openDelModal(mrf) {
    setEditingMRF(mrf)
    setDelForm({
      delivered_qty: mrf.delivered_qty || 0,
      dn_number: mrf.dn_number || '',
      delivery_date: mrf.delivery_date || today(),
      store_received: mrf.store_received || false,
      store_received_date: mrf.store_received_date || '',
      site_received: mrf.site_received || false,
      site_status: mrf.site_status || 'Ordered',
    })
    setShowDelModal(true)
  }

  function openInspModal(mrf) {
    setEditingMRF(mrf)
    setInspForm({
      mir_number: mrf.mir_number || '',
      mir_raised_date: mrf.mir_raised_date || today(),
      mir_submitted_date: mrf.mir_submitted_date || '',
      mir_approved_date: mrf.mir_approved_date || '',
      mir_rejected_date: mrf.mir_rejected_date || '',
      mir_resub_count: mrf.mir_resub_count || 0,
      mir_result: mrf.mir_result || '',
      mir_remarks: mrf.mir_remarks || '',
      site_release_date: mrf.site_release_date || '',
    })
    setShowInspModal(true)
  }

  async function saveDel() {
    if (!editingMRF) return
    const qty = parseFloat(delForm.delivered_qty) || 0
    const siteStatus = qty >= editingMRF.qty ? 'Delivered' : qty > 0 ? 'Partially Delivered' : 'Ordered'
    const update = { ...delForm, delivered_qty: qty, site_status: delForm.site_status || siteStatus }
    await supabase.from('mrfs').update(update).eq('id', editingMRF.id)
    setMrfs(prev => prev.map(m => m.id === editingMRF.id ? { ...m, ...update } : m))
    setShowDelModal(false)
    toast('Delivery updated ✓', 'ok')
  }

  async function saveInsp() {
    if (!editingMRF) return
    const siteStatus = inspForm.mir_result === 'Approved' ? 'Approved for Use' : inspForm.mir_result === 'Rejected' ? 'Rejected' : editingMRF.site_status
    const update = { ...inspForm, mir_resub_count: parseInt(inspForm.mir_resub_count) || 0, site_status: siteStatus }
    await supabase.from('mrfs').update(update).eq('id', editingMRF.id)
    setMrfs(prev => prev.map(m => m.id === editingMRF.id ? { ...m, ...update } : m))
    setShowInspModal(false)
    toast('MIR record saved ✓', 'ok')
  }

  const filtered = mrfs.filter(m => {
    if (!search) return true
    const q = search.toLowerCase()
    return [m.mrf_number, m.material_desc, m.supplier, m.po_number].some(v => (v || '').toLowerCase().includes(q))
  })

  const delivered = mrfs.filter(m => (m.delivered_qty || 0) >= (m.qty || 1)).length
  const partial = mrfs.filter(m => (m.delivered_qty || 0) > 0 && (m.delivered_qty || 0) < (m.qty || 1)).length
  const pending = mrfs.filter(m => !(m.delivered_qty || 0)).length
  const awaitingMIR = mrfs.filter(m => (m.delivered_qty || 0) > 0 && !m.mir_number).length

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Delivery Tracking</div>
          <div className="page-subtitle">{activeProject.name} · PO-issued MRFs</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Fully Delivered', value: delivered, color: 'var(--status-approved-text)' },
          { label: 'Partially Delivered', value: partial, color: 'var(--brand-accent)' },
          { label: 'Not Delivered', value: pending, color: 'var(--text-muted)' },
          { label: 'Awaiting MIR', value: awaitingMIR, color: 'var(--status-pending-text)' },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ borderTop: `3px solid ${s.color}` }}>
            <div className="stat-card-label">{s.label}</div>
            <div className="stat-card-value" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="filter-bar" style={{ marginBottom: 12 }}>
        <input placeholder="Search MRF, material, PO…" value={search} onChange={e => setSearch(e.target.value)} />
        {search && <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => setSearch('')}>Clear</button>}
      </div>

      <div className="table-wrap">
        {loading ? (
          <div className="table-empty">Loading…</div>
        ) : !filtered.length ? (
          <div className="table-empty">No PO-issued MRFs found.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>MRF No</th>
                <th>Material</th>
                <th>Supplier</th>
                <th>PO No</th>
                <th>Exp. Delivery</th>
                <th>Progress</th>
                <th>DN No</th>
                <th>MIR</th>
                <th>Site Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => {
                const pct = m.qty ? Math.round((m.delivered_qty || 0) / m.qty * 100) : 0
                return (
                  <tr key={m.id}>
                    <td><span className="doc-number">{m.mrf_number}</span></td>
                    <td style={{ fontSize: 12, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.material_desc}</td>
                    <td style={{ fontSize: 12 }}>{m.supplier || '—'}</td>
                    <td><span className="doc-number">{m.po_number}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m.expected_delivery || '—'}</td>
                    <td style={{ minWidth: 120 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ flex: 1, height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? 'var(--status-approved-text)' : 'var(--brand-accent)', borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, minWidth: 28 }}>{pct}%</span>
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{m.delivered_qty || 0} / {m.qty} {m.unit}</div>
                    </td>
                    <td style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{m.dn_number || '—'}</td>
                    <td>
                      {m.mir_number
                        ? <span className="doc-number">{m.mir_number}</span>
                        : <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Not raised</span>}
                    </td>
                    <td><Badge status={m.site_status || 'Ordered'} label={m.site_status || 'Ordered'} /></td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {canReceive && (
                          <button className="btn btn-secondary" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => openDelModal(m)}>
                            🚛 Delivery
                          </button>
                        )}
                        {canInspect && (m.delivered_qty || 0) > 0 && (
                          <button className="btn btn-secondary" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => openInspModal(m)}>
                            🔍 MIR
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Delivery Modal */}
      <Modal
        open={showDelModal}
        onClose={() => setShowDelModal(false)}
        title={`Update Delivery — ${editingMRF?.mrf_number}`}
        footer={<><button className="btn btn-secondary" onClick={() => setShowDelModal(false)}>Cancel</button><button className="btn btn-primary" onClick={saveDel}>Save</button></>}
      >
        {editingMRF && (
          <div>
            <div style={{ background: 'var(--bg-base)', borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: 18, fontSize: 12 }}>
              <strong>{editingMRF.mrf_number}</strong> — {editingMRF.material_desc}<br />
              <span style={{ color: 'var(--text-muted)' }}>Ordered qty: {editingMRF.qty} {editingMRF.unit} · Supplier: {editingMRF.supplier || '—'}</span>
            </div>
            <div className="form-grid form-grid-2" style={{ gap: 14 }}>
              <div className="form-group">
                <label className="form-label required">Delivered Qty ({editingMRF.unit})</label>
                <input className="form-input" type="number" min="0" max={editingMRF.qty} value={delForm.delivered_qty} onChange={e => setDelForm(f => ({ ...f, delivered_qty: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">DN Number</label>
                <input className="form-input" value={delForm.dn_number} onChange={e => setDelForm(f => ({ ...f, dn_number: e.target.value }))} placeholder="DN-2025-001" />
              </div>
              <div className="form-group">
                <label className="form-label">Delivery Date</label>
                <input className="form-input" type="date" value={delForm.delivery_date} onChange={e => setDelForm(f => ({ ...f, delivery_date: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Site Status</label>
                <select className="form-select" value={delForm.site_status} onChange={e => setDelForm(f => ({ ...f, site_status: e.target.value }))}>
                  {['Ordered','Partially Delivered','Delivered','Under Inspection','Approved for Use','Rejected','Used at Site'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={delForm.store_received} onChange={e => setDelForm(f => ({ ...f, store_received: e.target.checked }))} />
                Store / Warehouse Received
              </label>
              {delForm.store_received && (
                <div className="form-group">
                  <label className="form-label">Store Received Date</label>
                  <input className="form-input" type="date" value={delForm.store_received_date} onChange={e => setDelForm(f => ({ ...f, store_received_date: e.target.value }))} />
                </div>
              )}
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={delForm.site_received} onChange={e => setDelForm(f => ({ ...f, site_received: e.target.checked }))} />
                Site Received
              </label>
            </div>
          </div>
        )}
      </Modal>

      {/* MIR Modal */}
      <Modal
        open={showInspModal}
        onClose={() => setShowInspModal(false)}
        title={`Inspection / MIR — ${editingMRF?.mrf_number}`}
        footer={<><button className="btn btn-secondary" onClick={() => setShowInspModal(false)}>Cancel</button><button className="btn btn-primary" onClick={saveInsp}>Save MIR</button></>}
      >
        {editingMRF && (
          <div>
            <div style={{ background: 'var(--bg-base)', borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: 18, fontSize: 12 }}>
              <strong>{editingMRF.mrf_number}</strong> — {editingMRF.material_desc}
            </div>
            <div className="form-grid form-grid-3" style={{ gap: 14 }}>
              <div className="form-group">
                <label className="form-label">MIR Number</label>
                <input className="form-input" value={inspForm.mir_number} onChange={e => setInspForm(f => ({ ...f, mir_number: e.target.value }))} placeholder="MIR-ANT-2025-00001" />
              </div>
              <div className="form-group">
                <label className="form-label">MIR Raised Date</label>
                <input className="form-input" type="date" value={inspForm.mir_raised_date} onChange={e => setInspForm(f => ({ ...f, mir_raised_date: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Submitted to Consultant</label>
                <input className="form-input" type="date" value={inspForm.mir_submitted_date} onChange={e => setInspForm(f => ({ ...f, mir_submitted_date: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Approved Date</label>
                <input className="form-input" type="date" value={inspForm.mir_approved_date} onChange={e => setInspForm(f => ({ ...f, mir_approved_date: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Rejected Date</label>
                <input className="form-input" type="date" value={inspForm.mir_rejected_date} onChange={e => setInspForm(f => ({ ...f, mir_rejected_date: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Resubmissions</label>
                <input className="form-input" type="number" min="0" value={inspForm.mir_resub_count} onChange={e => setInspForm(f => ({ ...f, mir_resub_count: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Result</label>
                <select className="form-select" value={inspForm.mir_result} onChange={e => setInspForm(f => ({ ...f, mir_result: e.target.value }))}>
                  <option value="">Pending</option>
                  <option>Approved</option>
                  <option>Rejected</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Site Release Date</label>
                <input className="form-input" type="date" value={inspForm.site_release_date} onChange={e => setInspForm(f => ({ ...f, site_release_date: e.target.value }))} />
              </div>
            </div>
            <div className="form-group" style={{ marginTop: 14 }}>
              <label className="form-label">MIR Remarks</label>
              <textarea className="form-textarea" value={inspForm.mir_remarks} onChange={e => setInspForm(f => ({ ...f, mir_remarks: e.target.value }))} rows={2} />
            </div>
          </div>
        )}
      </Modal>

      <ToastContainer toasts={toasts} />
    </div>
  )
}
