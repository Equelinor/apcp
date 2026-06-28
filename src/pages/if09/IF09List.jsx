import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { useProject } from '../../context/ProjectContext'
import { genDocNumber, getDisciplines } from '../../config/docTypes'
import { useActivityFill, useMRFList } from '../../hooks/useActivityFill'
import Badge from '../../components/Badge'
import Modal from '../../components/Modal'
import { useToast, ToastContainer } from '../../utils/toast'
import { Plus, Pencil , Printer} from 'lucide-react'
import { today } from '../../utils/delay'
import { buildIF09, printForm, mergeProjectLogos } from '../../utils/printEngine'

const IR_STATUSES = ['Draft', 'Submitted', 'Inspection Scheduled', 'Passed', 'Failed', 'Conditional Pass', 'Cancelled']
const INSPECTION_TYPES = ['Pre-pour', 'In-process', 'Post-pour', 'Rebar Inspection', 'Formwork Check', 'Backfill', 'Waterproofing', 'Structural', 'Finishing', 'MEP Rough-in', 'Commissioning', 'Final Inspection', 'Other']

const BLANK = {
  date: today(), inspection_type: 'Pre-pour',
  activity_id: '', activity_name: '', wbs_code: '',
  mrf_number: '', discipline: '', location: '', zone: '',
  description: '', ifc_drawing: '', shop_drawing: '',
  prepared_by: '', addressed_to: '',
  requested_inspection_date: '', inspection_date: '', inspector: '',
  result: '', result_remarks: '',
  status: 'Draft', remarks: '', drive_link: '',
}

const SEED = [
  { id: 1, if09_number: 'IF09-ANT-2025-00001', date: '2025-01-21', project_code: 'ANT', inspection_type: 'Pre-pour', activity_id: 'A1010', activity_name: 'Basement Foundation Pour', wbs_code: '1.1.2', mrf_number: 'MRF-ANT-2025-00001', discipline: 'Civil / Structural', location: 'Block A', zone: 'Basement', description: 'Pre-pour inspection of pile cap and foundation slab reinforcement', ifc_drawing: 'IFC-STR-001', shop_drawing: 'SD-STR-001', prepared_by: 'Ahmed Al-Rashid', addressed_to: 'Consultant', requested_inspection_date: '2025-01-22', inspection_date: '2025-01-22', inspector: 'Consultant Engineer', result: 'Passed', result_remarks: 'All rebar as per drawing. Approved to pour.', status: 'Passed', remarks: '', drive_link: '' },
]

export default function IF09List() {
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
    if (mrfData && !editItem) setForm(f => ({ ...f, activity_id: f.activity_id || mrfData.activity_id || '', activity_name: f.activity_name || mrfData.activity_name || '', wbs_code: f.wbs_code || mrfData.wbs_code || '', ifc_drawing: f.ifc_drawing || mrfData.ifc_drawing || '', shop_drawing: f.shop_drawing || mrfData.shop_drawing || '', location: f.location || mrfData.location || '', zone: f.zone || mrfData.zone || '' }))
  }, [mrfData])

  useEffect(() => { loadData() }, [activeProject])

  async function loadData() {
    setLoading(true)
    const { data, error } = await supabase.from('if09').select('*').eq('project_code', activeProject.code).order('if09_number', { ascending: false })
    if (error || !data?.length) setItems(SEED.filter(d => d.project_code === activeProject.code))
    else setItems(data)
    setLoading(false)
  }

  function openNew() { setEditItem(null); setForm(BLANK); setShowForm(true) }
  function openEdit(item) { setEditItem(item); setForm({ ...item }); setShowForm(true) }
  function set(f, v) { setForm(p => ({ ...p, [f]: v })) }

  async function save() {
    if (!form.activity_id && !form.description) { toast('Activity ID or description required', 'err'); return }
    if (editItem) {
      await supabase.from('if09').update(form).eq('id', editItem.id)
      setItems(prev => prev.map(d => d.id === editItem.id ? { ...d, ...form } : d))
      toast('IR updated ✓', 'ok')
    } else {
      const seq = items.filter(d => d.project_code === activeProject.code).length + 1
      const if09_number = genDocNumber('IF09', activeProject.code, seq)
      const item = { ...form, if09_number, project_code: activeProject.code }
      const { data } = await supabase.from('if09').insert(item).select().single()
      setItems(prev => [data || { ...item, id: Date.now() }, ...prev])
      toast(`Inspection Request created: ${if09_number}`, 'ok')
    }
    setShowForm(false)
  }

  const filtered = items.filter(d => {
    if (filterStatus && d.status !== filterStatus) return false
    if (search) {
      const q = search.toLowerCase()
      return [d.if09_number, d.activity_id, d.activity_name, d.location, d.inspection_type].some(v => (v || '').toLowerCase().includes(q))
    }
    return true
  })

  const handlePrint = (d) => {
    printForm(buildIF09(mergeProjectLogos(d, activeProject)), 'IF09 — Activity Inspection Request')
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Activity Inspection Requests</div>
          <div className="page-subtitle">{activeProject.name} · IF09 · {items.length} records</div>
        </div>
        <button className="btn btn-primary" onClick={openNew}><Plus size={14} /> New IR</button>
      </div>

      <div className="filter-bar" style={{ marginBottom: 12 }}>
        <input placeholder="Search number, activity, location…" value={search} onChange={e => setSearch(e.target.value)} />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          {IR_STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
        {(search || filterStatus) && <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => { setSearch(''); setFilterStatus('') }}>Clear</button>}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>{filtered.length} records</span>
      </div>

      <div className="table-wrap">
        {loading ? <div className="table-empty">Loading…</div> : !filtered.length ? <div className="table-empty">No inspection requests found.</div> : (
          <table>
            <thead>
              <tr>
                <th>IF09 No.</th><th>Type</th><th>Activity</th><th>Location</th>
                <th>MRF</th><th>Req. Date</th><th>Insp. Date</th>
                <th>Inspector</th><th>Result</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => (
                <tr key={d.id}>
                  <td><span className="doc-number">{d.if09_number}</span></td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.inspection_type}</td>
                  <td style={{ fontSize: 11 }}>{d.activity_id ? <span className="doc-number" style={{ marginRight: 4 }}>{d.activity_id}</span> : ''}<span style={{ color: 'var(--text-muted)' }}>{d.activity_name}</span></td>
                  <td style={{ fontSize: 12 }}>{d.location}{d.zone ? ` / ${d.zone}` : ''}</td>
                  <td>{d.mrf_number ? <span className="doc-number">{d.mrf_number}</span> : <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.requested_inspection_date || '—'}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.inspection_date || '—'}</td>
                  <td style={{ fontSize: 12 }}>{d.inspector || '—'}</td>
                  <td>{d.result ? <Badge status={d.result === 'Passed' ? 'Approved' : d.result === 'Failed' ? 'Rejected' : 'Submitted'} label={d.result} /> : <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Pending</span>}</td>
                  <td><Badge status={d.status} /></td>
                  <td><button className="btn btn-ghost" style={{ padding: '3px 6px' }} onClick={() => openEdit(d)}><Pencil size={12} /></button>
                    <button className="btn btn-ghost" style={{ padding: '3px 6px' }} title="Print PDF" onClick={() => handlePrint(d)}><Printer size={12} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editItem ? `Edit — ${editItem.if09_number}` : 'New Activity Inspection Request'} size="lg"
        footer={<><button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button><button className="btn btn-primary" onClick={save}>Save</button></>}>
        <div>
          <div style={{ background: 'var(--bg-base)', borderRadius: 'var(--radius)', padding: '12px 14px', marginBottom: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Links</div>
            <div className="form-grid form-grid-2" style={{ gap: 10 }}>
              <div className="form-group">
                <label className="form-label">Activity ID</label>
                <input className="form-input" value={form.activity_id} onChange={e => set('activity_id', e.target.value)} placeholder="A1010 — auto-fills below" />
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
          <div className="form-grid form-grid-3" style={{ gap: 14, marginBottom: 14 }}>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input className="form-input" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Inspection Type</label>
              <select className="form-select" value={form.inspection_type} onChange={e => set('inspection_type', e.target.value)}>
                {INSPECTION_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Discipline</label>
              <select className="form-select" value={form.discipline} onChange={e => set('discipline', e.target.value)}>
                <option value="">— Select —</option>
                {disciplines.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Activity Name</label>
              <input className="form-input" value={form.activity_name} onChange={e => set('activity_name', e.target.value)} />
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
              <label className="form-label">Shop Drawing</label>
              <input className="form-input" value={form.shop_drawing} onChange={e => set('shop_drawing', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Prepared By</label>
              <input className="form-input" value={form.prepared_by} onChange={e => set('prepared_by', e.target.value)} />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label">Description / Scope</label>
            <textarea className="form-textarea" value={form.description} onChange={e => set('description', e.target.value)} rows={2} placeholder="What is being inspected…" />
          </div>
          <div className="form-grid form-grid-3" style={{ gap: 14, marginBottom: 14 }}>
            <div className="form-group">
              <label className="form-label">Requested Inspection Date</label>
              <input className="form-input" type="date" value={form.requested_inspection_date} onChange={e => set('requested_inspection_date', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Actual Inspection Date</label>
              <input className="form-input" type="date" value={form.inspection_date} onChange={e => set('inspection_date', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Inspector</label>
              <input className="form-input" value={form.inspector} onChange={e => set('inspector', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Result</label>
              <select className="form-select" value={form.result} onChange={e => set('result', e.target.value)}>
                <option value="">— Pending —</option>
                <option>Passed</option><option>Failed</option><option>Conditional Pass</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
                {IR_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
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
              <label className="form-label">Inspector Remarks / Result Notes</label>
              <textarea className="form-textarea" value={form.result_remarks} onChange={e => set('result_remarks', e.target.value)} rows={2} />
            </div>
          </div>
        </div>
      </Modal>
      <ToastContainer toasts={toasts} />
    </div>
  )
}
