import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { useProject } from '../../context/ProjectContext'
import { genDocNumber, getDisciplines, RESPONSE_CODES } from '../../config/docTypes'
import { useActivityFill, useMRFList } from '../../hooks/useActivityFill'
import Badge from '../../components/Badge'
import Modal from '../../components/Modal'
import { useToast, ToastContainer } from '../../utils/toast'
import { Plus, Pencil , Printer} from 'lucide-react'
import { today } from '../../utils/delay'
import { buildIF06, printForm, mergeProjectLogos } from '../../utils/printEngine'

const MOCKUP_STATUSES = ['Draft', 'Submitted', 'Inspection Scheduled', 'Inspected', 'Approved', 'Rejected', 'Resubmitted']

const BLANK = {
  date: today(), activity_id: '', activity_name: '', wbs_code: '',
  mrf_number: '', discipline: '', location: '', zone: '',
  mockup_desc: '', mockup_ref: '', ifc_drawing: '',
  prepared_by: '', addressed_to: '',
  inspection_date: '', inspector: '',
  submitted_date: today(), response_date: '', response_code: '',
  status: 'Draft', remarks: '', inspector_remarks: '', drive_link: '',
}

const SEED = [
  { id: 1, if06_number: 'IF06-ANT-2025-00001', date: '2025-01-25', project_code: 'ANT', activity_id: 'A3010', activity_name: 'Curtain Wall Installation L1', wbs_code: '1.3.1', mrf_number: 'MRF-ANT-2025-00003', discipline: 'Architectural', location: 'Tower D', zone: 'Level 1', mockup_desc: 'Curtain Wall System CW-01 Mock-up Panel 2m x 3m', mockup_ref: 'MU-ANT-2025-001', ifc_drawing: 'IFC-FAC-001', prepared_by: 'Nadia Hassan', addressed_to: 'Architect', inspection_date: '2025-02-05', inspector: '', submitted_date: '2025-01-25', response_date: '', response_code: '', status: 'Submitted', remarks: 'Mock-up erected at Tower D ground level', inspector_remarks: '', drive_link: '' },
]

export default function IF06List() {
  const { activeProject } = useProject()
  const { toasts, toast } = useToast()
  const mrfList = useMRFList(activeProject.code)
  const disciplines = getDisciplines(activeProject.code)

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(BLANK)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const { activityData, mrfData } = useActivityFill(activeProject.code, form.activity_id, form.mrf_number)

  useEffect(() => {
    if (activityData && !editItem) setForm(f => ({ ...f, activity_name: activityData.activity_name || f.activity_name, wbs_code: activityData.wbs_code || f.wbs_code }))
  }, [activityData])

  useEffect(() => {
    if (mrfData && !editItem) setForm(f => ({ ...f, activity_id: f.activity_id || mrfData.activity_id || '', activity_name: f.activity_name || mrfData.activity_name || '', wbs_code: f.wbs_code || mrfData.wbs_code || '', ifc_drawing: f.ifc_drawing || mrfData.ifc_drawing || '', location: f.location || mrfData.location || '', zone: f.zone || mrfData.zone || '' }))
  }, [mrfData])

  useEffect(() => { loadData() }, [activeProject])

  async function loadData() {
    setLoading(true)
    const { data, error } = await supabase.from('if06').select('*').eq('project_code', activeProject.code).order('if06_number', { ascending: false })
    if (error || !data?.length) setItems(SEED.filter(d => d.project_code === activeProject.code))
    else setItems(data)
    setLoading(false)
  }

  function openNew() { setEditItem(null); setForm(BLANK); setShowForm(true) }
  function openEdit(item) { setEditItem(item); setForm({ ...item }); setShowForm(true) }
  function set(f, v) { setForm(p => ({ ...p, [f]: v })) }

  async function save() {
    if (!form.mockup_desc) { toast('Mock-up description required', 'err'); return }
    if (editItem) {
      await supabase.from('if06').update(form).eq('id', editItem.id)
      setItems(prev => prev.map(d => d.id === editItem.id ? { ...d, ...form } : d))
      toast('Updated ✓', 'ok')
    } else {
      const seq = items.filter(d => d.project_code === activeProject.code).length + 1
      const if06_number = genDocNumber('IF06', activeProject.code, seq)
      const item = { ...form, if06_number, project_code: activeProject.code }
      const { data } = await supabase.from('if06').insert(item).select().single()
      setItems(prev => [data || { ...item, id: Date.now() }, ...prev])
      toast(`Mock-up Inspection created: ${if06_number}`, 'ok')
    }
    setShowForm(false)
  }

  const filtered = items.filter(d => {
    if (filterStatus && d.status !== filterStatus) return false
    if (search) {
      const q = search.toLowerCase()
      return [d.if06_number, d.mockup_desc, d.activity_id, d.mrf_number, d.location].some(v => (v || '').toLowerCase().includes(q))
    }
    return true
  })

  const handlePrint = (d) => {
    printForm(buildIF06(mergeProjectLogos(d, activeProject)), 'IF06 — Sample Mockup Inspection')
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Mock-up Inspection</div>
          <div className="page-subtitle">{activeProject.name} · IF06 · {items.length} records</div>
        </div>
        <button className="btn btn-primary" onClick={openNew}><Plus size={14} /> New Mock-up</button>
      </div>

      <div className="filter-bar" style={{ marginBottom: 12 }}>
        <input placeholder="Search number, description, location…" value={search} onChange={e => setSearch(e.target.value)} />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          {MOCKUP_STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
        {(search || filterStatus) && <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => { setSearch(''); setFilterStatus('') }}>Clear</button>}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>{filtered.length} records</span>
      </div>

      <div className="table-wrap">
        {loading ? <div className="table-empty">Loading…</div> : !filtered.length ? <div className="table-empty">No mock-up records found.</div> : (
          <table>
            <thead>
              <tr>
                <th>IF06 No.</th><th>Mock-up Description</th><th>Discipline</th>
                <th>Location</th><th>Activity</th><th>MRF</th>
                <th>Inspection Date</th><th>Response</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => (
                <tr key={d.id}>
                  <td><span className="doc-number">{d.if06_number}</span></td>
                  <td style={{ fontSize: 12, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.mockup_desc}</td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.discipline || '—'}</td>
                  <td style={{ fontSize: 12 }}>{d.location}{d.zone ? ` / ${d.zone}` : ''}</td>
                  <td>{d.activity_id ? <span className="doc-number">{d.activity_id}</span> : <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>}</td>
                  <td>{d.mrf_number ? <span className="doc-number">{d.mrf_number}</span> : <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.inspection_date || '—'}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.response_date || '—'}</td>
                  <td><Badge status={d.status} /></td>
                  <td><button className="btn btn-ghost" style={{ padding: '3px 6px' }} onClick={() => openEdit(d)}><Pencil size={12} /></button>
                    <button className="btn btn-ghost" style={{ padding: '3px 6px' }} title="Print PDF" onClick={() => handlePrint(d)}><Printer size={12} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editItem ? `Edit — ${editItem.if06_number}` : 'New Mock-up Inspection Request'} size="lg"
        footer={<><button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button><button className="btn btn-primary" onClick={save}>Save</button></>}>
        <div>
          <div style={{ background: 'var(--bg-base)', borderRadius: 'var(--radius)', padding: '12px 14px', marginBottom: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Links</div>
            <div className="form-grid form-grid-2" style={{ gap: 10 }}>
              <div className="form-group">
                <label className="form-label">Activity ID</label>
                <input className="form-input" value={form.activity_id} onChange={e => set('activity_id', e.target.value)} placeholder="A1010" />
              </div>
              <div className="form-group">
                <label className="form-label">Linked MRF (optional)</label>
                <select className="form-select" value={form.mrf_number} onChange={e => set('mrf_number', e.target.value)}>
                  <option value="">— None —</option>
                  {mrfList.map(m => <option key={m.mrf_number} value={m.mrf_number}>{m.mrf_number} — {m.material_desc?.slice(0, 35)}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="form-grid form-grid-2" style={{ gap: 14, marginBottom: 14 }}>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label required">Mock-up Description</label>
              <input className="form-input" value={form.mockup_desc} onChange={e => set('mockup_desc', e.target.value)} placeholder="Describe the mock-up element and size" />
            </div>
            <div className="form-group">
              <label className="form-label">Mock-up Ref</label>
              <input className="form-input" value={form.mockup_ref} onChange={e => set('mockup_ref', e.target.value)} placeholder="MU-ANT-2025-001" />
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
            <div className="form-group">
              <label className="form-label">Zone / Level</label>
              <input className="form-input" value={form.zone} onChange={e => set('zone', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">IFC Drawing</label>
              <input className="form-input" value={form.ifc_drawing} onChange={e => set('ifc_drawing', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Activity Name</label>
              <input className="form-input" value={form.activity_name} onChange={e => set('activity_name', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Prepared By</label>
              <input className="form-input" value={form.prepared_by} onChange={e => set('prepared_by', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Addressed To</label>
              <input className="form-input" value={form.addressed_to} onChange={e => set('addressed_to', e.target.value)} placeholder="Architect / Consultant" />
            </div>
          </div>
          <div className="form-grid form-grid-3" style={{ gap: 14, marginBottom: 14 }}>
            <div className="form-group">
              <label className="form-label">Submitted Date</label>
              <input className="form-input" type="date" value={form.submitted_date} onChange={e => set('submitted_date', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Inspection Date</label>
              <input className="form-input" type="date" value={form.inspection_date} onChange={e => set('inspection_date', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Inspector</label>
              <input className="form-input" value={form.inspector} onChange={e => set('inspector', e.target.value)} />
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
                {MOCKUP_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="form-grid form-grid-2" style={{ gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Remarks</label>
              <textarea className="form-textarea" value={form.remarks} onChange={e => set('remarks', e.target.value)} rows={2} />
            </div>
            <div className="form-group">
              <label className="form-label">Inspector Remarks</label>
              <textarea className="form-textarea" value={form.inspector_remarks} onChange={e => set('inspector_remarks', e.target.value)} rows={2} />
            </div>
          </div>
        </div>
      </Modal>
      <ToastContainer toasts={toasts} />
    </div>
  )
}
