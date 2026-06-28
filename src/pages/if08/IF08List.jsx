import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { useProject } from '../../context/ProjectContext'
import { useAuth } from '../../context/AuthContext'
import { genDocNumber } from '../../config/docTypes'
import { useActivityFill, useMRFList } from '../../hooks/useActivityFill'
import Badge from '../../components/Badge'
import Modal from '../../components/Modal'
import { useToast, ToastContainer } from '../../utils/toast'
import { Plus, ExternalLink, Pencil } from 'lucide-react'
import { today } from '../../utils/delay'

const RFI_STATUSES = ['Draft', 'Submitted', 'Under Review', 'Answered', 'Closed', 'Cancelled']
const RFI_PRIORITIES = ['Critical', 'High', 'Medium', 'Low']
const IMPACT_TYPES = ['No Impact', 'Time Impact', 'Cost Impact', 'Time & Cost Impact', 'Design Impact', 'TBD']

const BLANK = {
  date: today(), subject: '', description: '', priority: 'Medium',
  activity_id: '', activity_name: '', wbs_code: '',
  mrf_number: '', drawing_ref: '', spec_ref: '',
  requested_by: '', addressed_to: '',
  required_response_date: '', response_date: '', response: '',
  impact: 'TBD', impact_description: '',
  status: 'Draft', drive_link: '', remarks: ''
}

const SEED = [
  { id: 1, rfi_number: 'IF08-ANT-2025-00001', date: '2025-01-20', project_code: 'ANT', subject: 'Clarification on Rebar Lap Length at Foundation', description: 'Please clarify lap length requirements for 16mm TMT rebar at pile cap junction as per structural drawings IFC-STR-001.', priority: 'High', activity_id: 'A1010', activity_name: 'Basement Foundation Pour', wbs_code: '1.1.2', mrf_number: 'MRF-ANT-2025-00001', drawing_ref: 'IFC-STR-001', spec_ref: 'Section 03 20 00', requested_by: 'Ahmed Al-Rashid', addressed_to: 'Structural Engineer', required_response_date: '2025-01-25', response_date: '2025-01-24', response: 'Lap length shall be 45d as per BS 8110. See attached sketch.', impact: 'No Impact', impact_description: '', status: 'Answered', drive_link: '', remarks: '' },
  { id: 2, rfi_number: 'IF08-MRS-2025-00001', date: '2025-01-28', project_code: 'MRS', subject: 'Waterproofing Membrane Overlap at Column Base', description: 'Clarification required on waterproofing membrane overlap detail at column base junction. No detail on IFC drawings.', priority: 'Critical', activity_id: 'B2030', activity_name: 'Basement Waterproofing L3', wbs_code: '2.1.3', mrf_number: 'MRF-MRS-2025-00001', drawing_ref: 'IFC-WP-001', spec_ref: '', requested_by: 'Khalid Mansoor', addressed_to: 'Architect', required_response_date: '2025-02-01', response_date: '', response: '', impact: 'TBD', impact_description: 'Work on hold pending clarification', status: 'Submitted', drive_link: '', remarks: '' },
]

export default function IF08List() {
  const { activeProject } = useProject()
  const { profile } = useAuth()
  const { toasts, toast } = useToast()
  const mrfList = useMRFList(activeProject.code)

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(BLANK)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPriority, setFilterPriority] = useState('')

  const { activityData, mrfData } = useActivityFill(activeProject.code, form.activity_id, form.mrf_number)

  useEffect(() => {
    if (activityData && !editItem) {
      setForm(f => ({ ...f, activity_name: activityData.activity_name || f.activity_name, wbs_code: activityData.wbs_code || f.wbs_code }))
    }
  }, [activityData])

  useEffect(() => {
    if (mrfData && !editItem) {
      setForm(f => ({
        ...f,
        activity_id: f.activity_id || mrfData.activity_id || '',
        activity_name: f.activity_name || mrfData.activity_name || '',
        wbs_code: f.wbs_code || mrfData.wbs_code || '',
        drawing_ref: f.drawing_ref || mrfData.ifc_drawing || '',
        spec_ref: f.spec_ref || mrfData.code_ref || '',
      }))
    }
  }, [mrfData])

  useEffect(() => { loadData() }, [activeProject])

  async function loadData() {
    setLoading(true)
    const { data, error } = await supabase.from('if08').select('*').eq('project_code', activeProject.code).order('rfi_number', { ascending: false })
    if (error || !data?.length) setItems(SEED.filter(d => d.project_code === activeProject.code))
    else setItems(data)
    setLoading(false)
  }

  function openNew() { setEditItem(null); setForm(BLANK); setShowForm(true) }
  function openEdit(item) { setEditItem(item); setForm({ ...item }); setShowForm(true) }
  function set(f, v) { setForm(p => ({ ...p, [f]: v })) }

  async function save() {
    if (!form.subject) { toast('Subject required', 'err'); return }
    if (editItem) {
      await supabase.from('if08').update(form).eq('id', editItem.id)
      setItems(prev => prev.map(d => d.id === editItem.id ? { ...d, ...form } : d))
      toast('RFI updated ✓', 'ok')
    } else {
      const seq = items.filter(d => d.project_code === activeProject.code).length + 1
      const rfi_number = genDocNumber('IF08', activeProject.code, seq)
      const item = { ...form, rfi_number, project_code: activeProject.code }
      const { data } = await supabase.from('if08').insert(item).select().single()
      setItems(prev => [data || { ...item, id: Date.now() }, ...prev])
      toast(`RFI raised: ${rfi_number}`, 'ok')
    }
    setShowForm(false)
  }

  const filtered = items.filter(d => {
    if (filterStatus && d.status !== filterStatus) return false
    if (filterPriority && d.priority !== filterPriority) return false
    if (search) {
      const q = search.toLowerCase()
      return [d.rfi_number, d.subject, d.activity_id, d.mrf_number, d.requested_by].some(v => (v || '').toLowerCase().includes(q))
    }
    return true
  })

  const openRFIs = items.filter(d => ['Submitted', 'Under Review'].includes(d.status)).length

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Request For Information</div>
          <div className="page-subtitle">{activeProject.name} · IF08 · {items.length} records</div>
        </div>
        <button className="btn btn-primary" onClick={openNew}><Plus size={14} /> New RFI</button>
      </div>

      {openRFIs > 0 && (
        <div style={{ background: 'var(--status-pending-bg)', color: 'var(--status-pending-text)', border: '1px solid #fde68a', borderRadius: 'var(--radius)', padding: '9px 14px', marginBottom: 16, fontSize: 13, fontWeight: 600 }}>
          ⏳ {openRFIs} RFI{openRFIs > 1 ? 's' : ''} awaiting response
        </div>
      )}

      <div className="filter-bar" style={{ marginBottom: 12 }}>
        <input placeholder="Search RFI number, subject, activity…" value={search} onChange={e => setSearch(e.target.value)} />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          {RFI_STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
          <option value="">All Priorities</option>
          {RFI_PRIORITIES.map(p => <option key={p}>{p}</option>)}
        </select>
        {(search || filterStatus || filterPriority) && <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => { setSearch(''); setFilterStatus(''); setFilterPriority('') }}>Clear</button>}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>{filtered.length} records</span>
      </div>

      <div className="table-wrap">
        {loading ? <div className="table-empty">Loading…</div> : !filtered.length ? <div className="table-empty">No RFIs found.</div> : (
          <table>
            <thead>
              <tr>
                <th>RFI No.</th>
                <th>Subject</th>
                <th>Priority</th>
                <th>Activity</th>
                <th>MRF</th>
                <th>Raised By</th>
                <th>Required By</th>
                <th>Response Date</th>
                <th>Impact</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => {
                const overdue = d.required_response_date && !d.response_date && new Date(d.required_response_date) < new Date()
                return (
                  <tr key={d.id} style={{ background: overdue ? '#FFF5F5' : undefined }}>
                    <td><span className="doc-number">{d.rfi_number}</span></td>
                    <td style={{ fontSize: 12, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={d.subject}>{d.subject}</td>
                    <td><Badge status={d.priority} /></td>
                    <td>{d.activity_id ? <span className="doc-number">{d.activity_id}</span> : <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>}</td>
                    <td>{d.mrf_number ? <span className="doc-number">{d.mrf_number}</span> : <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.requested_by}</td>
                    <td style={{ fontSize: 12, color: overdue ? 'var(--status-rejected-text)' : 'var(--text-muted)', fontWeight: overdue ? 700 : 400 }}>{d.required_response_date || '—'}{overdue ? ' ⚠️' : ''}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.response_date || '—'}</td>
                    <td style={{ fontSize: 11 }}>{d.impact || '—'}</td>
                    <td><Badge status={d.status} /></td>
                    <td><button className="btn btn-ghost" style={{ padding: '3px 6px' }} onClick={() => openEdit(d)}><Pencil size={12} /></button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editItem ? `Edit — ${editItem.rfi_number}` : 'New RFI'} size="lg"
        footer={<><button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button><button className="btn btn-primary" onClick={save}>Save</button></>}>
        <div>
          <div style={{ background: 'var(--bg-base)', borderRadius: 'var(--radius)', padding: '12px 14px', marginBottom: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Links (optional)</div>
            <div className="form-grid form-grid-2" style={{ gap: 10 }}>
              <div className="form-group">
                <label className="form-label">Activity ID</label>
                <input className="form-input" value={form.activity_id} onChange={e => set('activity_id', e.target.value)} placeholder="A1010 — auto-fills below" />
              </div>
              <div className="form-group">
                <label className="form-label">Linked MRF</label>
                <select className="form-select" value={form.mrf_number} onChange={e => set('mrf_number', e.target.value)}>
                  <option value="">— None —</option>
                  {mrfList.map(m => <option key={m.mrf_number} value={m.mrf_number}>{m.mrf_number} — {m.material_desc?.slice(0, 35)}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label required">Subject</label>
            <input className="form-input" value={form.subject} onChange={e => set('subject', e.target.value)} placeholder="Brief subject of the RFI" />
          </div>

          <div className="form-grid form-grid-3" style={{ gap: 14, marginBottom: 14 }}>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input className="form-input" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="form-select" value={form.priority} onChange={e => set('priority', e.target.value)}>
                {RFI_PRIORITIES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Requested By</label>
              <input className="form-input" value={form.requested_by} onChange={e => set('requested_by', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Addressed To</label>
              <input className="form-input" value={form.addressed_to} onChange={e => set('addressed_to', e.target.value)} placeholder="Consultant / Engineer" />
            </div>
            <div className="form-group">
              <label className="form-label">Required Response Date</label>
              <input className="form-input" type="date" value={form.required_response_date} onChange={e => set('required_response_date', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Drawing Ref</label>
              <input className="form-input" value={form.drawing_ref} onChange={e => set('drawing_ref', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Spec Ref</label>
              <input className="form-input" value={form.spec_ref} onChange={e => set('spec_ref', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Activity Name</label>
              <input className="form-input" value={form.activity_name} onChange={e => set('activity_name', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">WBS Code</label>
              <input className="form-input" value={form.wbs_code} onChange={e => set('wbs_code', e.target.value)} />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label">Description / Query</label>
            <textarea className="form-textarea" value={form.description} onChange={e => set('description', e.target.value)} rows={3} placeholder="Detailed description of the query…" />
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 12 }}>Response</div>
            <div className="form-grid form-grid-3" style={{ gap: 14, marginBottom: 14 }}>
              <div className="form-group">
                <label className="form-label">Response Date</label>
                <input className="form-input" type="date" value={form.response_date} onChange={e => set('response_date', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Impact</label>
                <select className="form-select" value={form.impact} onChange={e => set('impact', e.target.value)}>
                  {IMPACT_TYPES.map(i => <option key={i}>{i}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
                  {RFI_STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label className="form-label">Response</label>
              <textarea className="form-textarea" value={form.response} onChange={e => set('response', e.target.value)} rows={3} placeholder="Consultant / Engineer response…" />
            </div>
            <div className="form-group">
              <label className="form-label">Google Drive Link</label>
              <input className="form-input" value={form.drive_link} onChange={e => set('drive_link', e.target.value)} placeholder="https://drive.google.com/…" />
            </div>
          </div>
        </div>
      </Modal>

      <ToastContainer toasts={toasts} />
    </div>
  )
}
