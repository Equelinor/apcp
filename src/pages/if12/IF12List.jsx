import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { useProject } from '../../context/ProjectContext'
import { genDocNumber, getDisciplines, RESPONSE_CODES } from '../../config/docTypes'
import { useActivityFill } from '../../hooks/useActivityFill'
import Badge from '../../components/Badge'
import Modal from '../../components/Modal'
import { useToast, ToastContainer } from '../../utils/toast'
import { Plus, Pencil, ExternalLink } from 'lucide-react'
import { today } from '../../utils/delay'

const SC_STATUSES = ['Draft', 'Submitted', 'Under Review', 'Approved', 'Conditionally Approved', 'Rejected', 'Resubmitted']
const WORK_SCOPES = ['Concrete Works', 'Steel / Rebar', 'Formwork', 'Waterproofing', 'MEP', 'Electrical', 'Plumbing', 'HVAC', 'Façade / Curtain Wall', 'Fit-out / Finishing', 'Landscaping', 'Civil Works', 'Piling', 'Specialist Works', 'Other']

const BLANK = {
  date: today(), activity_id: '', activity_name: '', wbs_code: '',
  subcontractor_name: '', trade: '', work_scope: '',
  discipline: '', location: '', zone: '',
  cr_number: '', vat_number: '', contact_person: '', contact_phone: '',
  prepared_by: '', addressed_to: '',
  submitted_date: today(), response_date: '', response_code: '',
  status: 'Draft', remarks: '', consultant_remarks: '', drive_link: '',
}

const SEED = [
  { id: 1, if12_number: 'IF12-ANT-2025-00001', date: '2025-01-08', project_code: 'ANT', activity_id: 'A1010', activity_name: 'Basement Foundation Pour', wbs_code: '1.1.2', subcontractor_name: 'Gulf Concrete Services LLC', trade: 'Concrete Works', work_scope: 'Supply and placement of ready mix concrete for foundations and podium slabs', discipline: 'Civil / Structural', location: 'Block A', zone: 'Basement', cr_number: 'CR-2024-04512', vat_number: 'AE100234567890003', contact_person: 'Mohammed Al-Farid', contact_phone: '+971-50-1234567', prepared_by: 'Ahmed Al-Rashid', addressed_to: 'Consultant', submitted_date: '2025-01-08', response_date: '2025-01-14', response_code: 'A — Approved', status: 'Approved', remarks: '', consultant_remarks: 'Sub-contractor approved. Valid for this project scope only.', drive_link: '' },
]

export default function IF12List() {
  const { activeProject } = useProject()
  const { toasts, toast } = useToast()
  const disciplines = getDisciplines(activeProject.code)

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(BLANK)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const { activityData } = useActivityFill(activeProject.code, form.activity_id, null)

  useEffect(() => {
    if (activityData && !editItem) setForm(f => ({ ...f, activity_name: activityData.activity_name || f.activity_name, wbs_code: activityData.wbs_code || f.wbs_code }))
  }, [activityData])

  useEffect(() => { loadData() }, [activeProject])

  async function loadData() {
    setLoading(true)
    const { data, error } = await supabase.from('if12').select('*').eq('project_code', activeProject.code).order('if12_number', { ascending: false })
    if (error || !data?.length) setItems(SEED.filter(d => d.project_code === activeProject.code))
    else setItems(data)
    setLoading(false)
  }

  function openNew() { setEditItem(null); setForm(BLANK); setShowForm(true) }
  function openEdit(item) { setEditItem(item); setForm({ ...item }); setShowForm(true) }
  function set(f, v) { setForm(p => ({ ...p, [f]: v })) }

  async function save() {
    if (!form.subcontractor_name) { toast('Sub-contractor name required', 'err'); return }
    if (editItem) {
      await supabase.from('if12').update(form).eq('id', editItem.id)
      setItems(prev => prev.map(d => d.id === editItem.id ? { ...d, ...form } : d))
      toast('Updated ✓', 'ok')
    } else {
      const seq = items.filter(d => d.project_code === activeProject.code).length + 1
      const if12_number = genDocNumber('IF12', activeProject.code, seq)
      const item = { ...form, if12_number, project_code: activeProject.code }
      const { data } = await supabase.from('if12').insert(item).select().single()
      setItems(prev => [data || { ...item, id: Date.now() }, ...prev])
      toast(`Sub-contractor Approval created: ${if12_number}`, 'ok')
    }
    setShowForm(false)
  }

  const filtered = items.filter(d => {
    if (filterStatus && d.status !== filterStatus) return false
    if (search) {
      const q = search.toLowerCase()
      return [d.if12_number, d.subcontractor_name, d.trade, d.activity_id].some(v => (v || '').toLowerCase().includes(q))
    }
    return true
  })

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Sub-contractor Approval</div>
          <div className="page-subtitle">{activeProject.name} · IF12 · {items.length} records</div>
        </div>
        <button className="btn btn-primary" onClick={openNew}><Plus size={14} /> New Approval</button>
      </div>

      <div className="filter-bar" style={{ marginBottom: 12 }}>
        <input placeholder="Search number, sub-contractor, trade…" value={search} onChange={e => setSearch(e.target.value)} />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          {SC_STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
        {(search || filterStatus) && <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => { setSearch(''); setFilterStatus('') }}>Clear</button>}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>{filtered.length} records</span>
      </div>

      <div className="table-wrap">
        {loading ? <div className="table-empty">Loading…</div> : !filtered.length ? <div className="table-empty">No sub-contractor approvals found.</div> : (
          <table>
            <thead>
              <tr>
                <th>IF12 No.</th><th>Sub-contractor</th><th>Trade</th><th>Activity</th>
                <th>Location</th><th>Submitted</th><th>Response</th><th>Code</th>
                <th>Status</th><th>Drive</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => (
                <tr key={d.id}>
                  <td><span className="doc-number">{d.if12_number}</span></td>
                  <td style={{ fontSize: 12, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.subcontractor_name}</td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.trade}</td>
                  <td>{d.activity_id ? <span className="doc-number">{d.activity_id}</span> : <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>}</td>
                  <td style={{ fontSize: 12 }}>{d.location || '—'}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.submitted_date || '—'}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.response_date || '—'}</td>
                  <td style={{ fontSize: 11 }}>{d.response_code ? d.response_code.split(' — ')[0] : '—'}</td>
                  <td><Badge status={d.status} /></td>
                  <td>{d.drive_link ? <a href={d.drive_link} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ fontSize: 11, padding: '3px 8px' }}><ExternalLink size={11} /></a> : <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>}</td>
                  <td><button className="btn btn-ghost" style={{ padding: '3px 6px' }} onClick={() => openEdit(d)}><Pencil size={12} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editItem ? `Edit — ${editItem.if12_number}` : 'New Sub-contractor Approval'} size="lg"
        footer={<><button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button><button className="btn btn-primary" onClick={save}>Save</button></>}>
        <div>
          <div style={{ background: 'var(--bg-base)', borderRadius: 'var(--radius)', padding: '12px 14px', marginBottom: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Activity Link (optional)</div>
            <div className="form-grid form-grid-2" style={{ gap: 10 }}>
              <div className="form-group">
                <label className="form-label">Activity ID</label>
                <input className="form-input" value={form.activity_id} onChange={e => set('activity_id', e.target.value)} placeholder="A1010" />
              </div>
              <div className="form-group">
                <label className="form-label">Activity Name</label>
                <input className="form-input" value={form.activity_name} onChange={e => set('activity_name', e.target.value)} />
              </div>
            </div>
          </div>

          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 10 }}>Sub-contractor Details</div>
          <div className="form-grid form-grid-2" style={{ gap: 14, marginBottom: 14 }}>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label required">Sub-contractor Name</label>
              <input className="form-input" value={form.subcontractor_name} onChange={e => set('subcontractor_name', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Trade / Specialization</label>
              <input className="form-input" value={form.trade} onChange={e => set('trade', e.target.value)} placeholder="e.g. Concrete Works" />
            </div>
            <div className="form-group">
              <label className="form-label">Work Scope</label>
              <select className="form-select" value={form.work_scope} onChange={e => set('work_scope', e.target.value)}>
                <option value="">— Select —</option>
                {WORK_SCOPES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">CR Number</label>
              <input className="form-input" value={form.cr_number} onChange={e => set('cr_number', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">VAT Number</label>
              <input className="form-input" value={form.vat_number} onChange={e => set('vat_number', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Contact Person</label>
              <input className="form-input" value={form.contact_person} onChange={e => set('contact_person', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Contact Phone</label>
              <input className="form-input" value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Discipline</label>
              <select className="form-select" value={form.discipline} onChange={e => set('discipline', e.target.value)}>
                <option value="">— Select —</option>
                {disciplines.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Location</label>
              <input className="form-input" value={form.location} onChange={e => set('location', e.target.value)} />
            </div>
          </div>

          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>Submittal</div>
          <div className="form-grid form-grid-3" style={{ gap: 14, marginBottom: 14 }}>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input className="form-input" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Prepared By</label>
              <input className="form-input" value={form.prepared_by} onChange={e => set('prepared_by', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Addressed To</label>
              <input className="form-input" value={form.addressed_to} onChange={e => set('addressed_to', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Submitted Date</label>
              <input className="form-input" type="date" value={form.submitted_date} onChange={e => set('submitted_date', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Response Date</label>
              <input className="form-input" type="date" value={form.response_date} onChange={e => set('response_date', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Response Code</label>
              <select className="form-select" value={form.response_code} onChange={e => set('response_code', e.target.value)}>
                <option value="">— Pending —</option>
                {RESPONSE_CODES.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
                {SC_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: '2 / -1' }}>
              <label className="form-label">Google Drive Link</label>
              <input className="form-input" value={form.drive_link} onChange={e => set('drive_link', e.target.value)} placeholder="https://drive.google.com/…" />
            </div>
          </div>
          <div className="form-grid form-grid-2" style={{ gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Remarks</label>
              <textarea className="form-textarea" value={form.remarks} onChange={e => set('remarks', e.target.value)} rows={2} />
            </div>
            <div className="form-group">
              <label className="form-label">Consultant Remarks</label>
              <textarea className="form-textarea" value={form.consultant_remarks} onChange={e => set('consultant_remarks', e.target.value)} rows={2} />
            </div>
          </div>
        </div>
      </Modal>
      <ToastContainer toasts={toasts} />
    </div>
  )
}
