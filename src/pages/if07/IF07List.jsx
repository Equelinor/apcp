import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { useProject } from '../../context/ProjectContext'
import { useAuth } from '../../context/AuthContext'
import { genDocNumber, SUBMITTAL_STATUSES, RESPONSE_CODES } from '../../config/docTypes'
import { useActivityFill, useMRFList } from '../../hooks/useActivityFill'
import Badge from '../../components/Badge'
import Modal from '../../components/Modal'
import { useToast, ToastContainer } from '../../utils/toast'
import { Plus, Pencil, ExternalLink , Printer} from 'lucide-react'
import { today } from '../../utils/delay'
import { buildIF07, printForm, mergeProjectLogos, getSignatureForName } from '../../utils/printEngine'

const DOC_TYPES = ['Method Statement', 'ITP', 'Risk Assessment', 'Material Submittal', 'Technical Submittal', 'Certificate', 'Report', 'Letter', 'Drawing', 'Other']

const BLANK = {
  date: today(), doc_type: 'Technical Submittal', title: '',
  ref_number: '', revision: 'Rev 00',
  activity_id: '', activity_name: '', wbs_code: '',
  mrf_number: '', prepared_by: '', addressed_to: '',
  submitted_date: today(), response_date: '', response_code: '',
  status: 'Draft', remarks: '', consultant_remarks: '', drive_link: '', copies: 1,
}

const SEED = [
  { id: 1, if07_number: 'IF07-ANT-2025-00001', date: '2025-01-12', project_code: 'ANT', doc_type: 'Method Statement', title: 'Method Statement — Foundation Concrete Works', ref_number: 'MS-ANT-2025-001', revision: 'Rev 01', activity_id: 'A1010', activity_name: 'Basement Foundation Pour', wbs_code: '1.1.2', mrf_number: 'MRF-ANT-2025-00001', prepared_by: 'Ahmed Al-Rashid', addressed_to: 'Consultant', submitted_date: '2025-01-12', response_date: '2025-01-18', response_code: 'A — Approved', status: 'Approved', remarks: '', consultant_remarks: 'Approved. Proceed as per MS.', drive_link: '', copies: 2 },
  { id: 2, if07_number: 'IF07-MRS-2025-00001', date: '2025-01-22', project_code: 'MRS', doc_type: 'ITP', title: 'ITP — Waterproofing Works Tower C', ref_number: 'ITP-MRS-2025-001', revision: 'Rev 00', activity_id: 'B2030', activity_name: 'Basement Waterproofing L3', wbs_code: '2.1.3', mrf_number: 'MRF-MRS-2025-00001', prepared_by: 'Khalid Mansoor', addressed_to: 'Consultant', submitted_date: '2025-01-22', response_date: '', response_code: '', status: 'Submitted', remarks: '', consultant_remarks: '', drive_link: '', copies: 3 },
]

export default function IF07List() {
  const { activeProject } = useProject()
  const { profile } = useAuth()
  const { toasts, toast } = useToast()
  const mrfList = useMRFList(activeProject.project_code)

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(BLANK)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const { activityData, mrfData } = useActivityFill(activeProject.project_code, form.activity_id, form.mrf_number)

  useEffect(() => {
    if (activityData && !editItem) setForm(f => ({ ...f, activity_name: activityData.activity_name || f.activity_name, wbs_code: activityData.wbs_code || f.wbs_code }))
  }, [activityData])

  useEffect(() => {
    if (mrfData && !editItem) setForm(f => ({ ...f, activity_id: f.activity_id || mrfData.activity_id || '', activity_name: f.activity_name || mrfData.activity_name || '', wbs_code: f.wbs_code || mrfData.wbs_code || '' }))
  }, [mrfData])

  useEffect(() => { loadData() }, [activeProject])

  async function loadData() {
    setLoading(true)
    const { data, error } = await supabase.from('if07').select('*').eq('project_code', activeProject.project_code).order('if07_number', { ascending: false })
    if (error || !data?.length) setItems(SEED.filter(d => d.project_code === activeProject.project_code))
    else setItems(data)
    setLoading(false)
  }

  function openNew() { setEditItem(null); setForm(BLANK); setShowForm(true) }
  function openEdit(item) { setEditItem(item); setForm({ ...item }); setShowForm(true) }
  function set(f, v) { setForm(p => ({ ...p, [f]: v })) }

  async function save() {
    if (!form.title) { toast('Title required', 'err'); return }
    if (editItem) {
      await supabase.from('if07').update(form).eq('id', editItem.id)
      setItems(prev => prev.map(d => d.id === editItem.id ? { ...d, ...form } : d))
      toast('Updated ✓', 'ok')
    } else {
      const seq = items.filter(d => d.project_code === activeProject.project_code).length + 1
      const if07_number = genDocNumber('IF07', activeProject.project_code, seq)
      const item = { ...form, if07_number, project_code: activeProject.project_code }
      const { data } = await supabase.from('if07').insert(item).select().single()
      setItems(prev => [data || { ...item, id: Date.now() }, ...prev])
      toast(`Doc Submittal created: ${if07_number}`, 'ok')
    }
    setShowForm(false)
  }

  const filtered = items.filter(d => {
    if (filterStatus && d.status !== filterStatus) return false
    if (search) {
      const q = search.toLowerCase()
      return [d.if07_number, d.title, d.ref_number, d.activity_id, d.mrf_number].some(v => (v || '').toLowerCase().includes(q))
    }
    return true
  })

  const handlePrint = async (d) => {
    const signatureImg = await getSignatureForName(d.prepared_by)
    printForm(buildIF07({ ...mergeProjectLogos(d, activeProject), signatureImg }), 'IF07 — Document Submittal')
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Document Submittals</div>
          <div className="page-subtitle">{activeProject.project_name} · IF07 · {items.length} records</div>
        </div>
        <button className="btn btn-primary" onClick={openNew}><Plus size={14} /> New Submittal</button>
      </div>

      <div className="filter-bar" style={{ marginBottom: 12 }}>
        <input placeholder="Search number, title, ref…" value={search} onChange={e => setSearch(e.target.value)} />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          {SUBMITTAL_STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
        {(search || filterStatus) && <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => { setSearch(''); setFilterStatus('') }}>Clear</button>}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>{filtered.length} records</span>
      </div>

      <div className="table-wrap">
        {loading ? <div className="table-empty">Loading…</div> : !filtered.length ? <div className="table-empty">No submittals found.</div> : (
          <table>
            <thead>
              <tr>
                <th>IF07 No.</th><th>Type</th><th>Title</th><th>Ref No.</th><th>Rev</th>
                <th>Submitted</th><th>Response</th><th>Code</th><th>Activity</th><th>MRF</th>
                <th>Status</th><th>Drive</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => (
                <tr key={d.id}>
                  <td><span className="doc-number">{d.if07_number}</span></td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.doc_type}</td>
                  <td style={{ fontSize: 12, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title}</td>
                  <td><span className="doc-number">{d.ref_number || '—'}</span></td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: 'var(--brand-accent)' }}>{d.revision}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.submitted_date || '—'}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.response_date || '—'}</td>
                  <td style={{ fontSize: 11 }}>{d.response_code ? d.response_code.split(' — ')[0] : '—'}</td>
                  <td>{d.activity_id ? <span className="doc-number">{d.activity_id}</span> : <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>}</td>
                  <td>{d.mrf_number ? <span className="doc-number">{d.mrf_number}</span> : <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>}</td>
                  <td><Badge status={d.status} /></td>
                  <td>{d.drive_link ? <a href={d.drive_link} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ fontSize: 11, padding: '3px 8px' }}><ExternalLink size={11} /></a> : <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>}</td>
                  <td><button className="btn btn-ghost" style={{ padding: '3px 6px' }} onClick={() => openEdit(d)}><Pencil size={12} /></button>
                    <button className="btn btn-ghost" style={{ padding: '3px 6px' }} title="Print PDF" onClick={() => handlePrint(d)}><Printer size={12} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editItem ? `Edit — ${editItem.if07_number}` : 'New Document Submittal'} size="lg"
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
          <div className="form-grid form-grid-3" style={{ gap: 14, marginBottom: 14 }}>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input className="form-input" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label required">Doc Type</label>
              <select className="form-select" value={form.doc_type} onChange={e => set('doc_type', e.target.value)}>
                {DOC_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Revision</label>
              <input className="form-input" value={form.revision} onChange={e => set('revision', e.target.value)} placeholder="Rev 00" />
            </div>
          </div>
          <div className="form-grid form-grid-2" style={{ gap: 14, marginBottom: 14 }}>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label required">Title</label>
              <input className="form-input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Document title" />
            </div>
            <div className="form-group">
              <label className="form-label">Reference Number</label>
              <input className="form-input" value={form.ref_number} onChange={e => set('ref_number', e.target.value)} placeholder="MS-ANT-2025-001" />
            </div>
            <div className="form-group">
              <label className="form-label">Prepared By</label>
              <input className="form-input" value={form.prepared_by} onChange={e => set('prepared_by', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Addressed To</label>
              <input className="form-input" value={form.addressed_to} onChange={e => set('addressed_to', e.target.value)} placeholder="Consultant" />
            </div>
            <div className="form-group">
              <label className="form-label">Activity Name</label>
              <input className="form-input" value={form.activity_name} onChange={e => set('activity_name', e.target.value)} />
            </div>
          </div>
          <div className="form-grid form-grid-3" style={{ gap: 14, marginBottom: 14 }}>
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
                {SUBMITTAL_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Copies</label>
              <input className="form-input" type="number" min="1" value={form.copies} onChange={e => set('copies', e.target.value)} />
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
