import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { useProject } from '../../context/ProjectContext'
import { useAuth } from '../../context/AuthContext'
import { genDocNumber, getDisciplines, SUBMITTAL_STATUSES } from '../../config/docTypes'
import Badge from '../../components/Badge'
import Modal from '../../components/Modal'
import { useToast, ToastContainer } from '../../utils/toast'
import { Plus, ExternalLink, Pencil, Trash2 } from 'lucide-react'
import { today } from '../../utils/delay'

const DOC_CATEGORIES = ['Method Statement', 'ITP', 'Risk Assessment', 'Technical Submittal', 'Material Submittal', 'Shop Drawing', 'As-Built', 'Certificate', 'Letter', 'Transmittal', 'Minutes of Meeting', 'Report', 'Other']

const BLANK = {
  title: '', category: 'Technical Submittal', discipline: '',
  date: today(), prepared_by: '', activity_id: '', activity_name: '',
  mrf_number: '', status: 'Draft', remarks: '', drive_link: ''
}

const SEED = [
  { id: 1, doc_number: 'DOC-ANT-2025-00001', title: 'Method Statement — Foundation Works', category: 'Method Statement', discipline: 'Civil / Structural', date: '2025-01-12', prepared_by: 'Ahmed Al-Rashid', activity_id: 'A1010', activity_name: 'Basement Foundation Pour', mrf_number: 'MRF-ANT-2025-00001', status: 'Approved', remarks: '', drive_link: '', project_code: 'ANT' },
  { id: 2, doc_number: 'DOC-ANT-2025-00002', title: 'ITP — Concrete Works', category: 'ITP', discipline: 'Civil / Structural', date: '2025-01-15', prepared_by: 'Sara Qureshi', activity_id: 'A1210', activity_name: 'GF Column Reinforcement', mrf_number: '', status: 'Submitted', remarks: 'Awaiting consultant approval', drive_link: '', project_code: 'ANT' },
  { id: 3, doc_number: 'DOC-MRS-2025-00001', title: 'Risk Assessment — Waterproofing', category: 'Risk Assessment', discipline: 'Architectural', date: '2025-01-20', prepared_by: 'Khalid Mansoor', activity_id: 'B2030', activity_name: 'Basement Waterproofing L3', mrf_number: 'MRF-MRS-2025-00001', status: 'Draft', remarks: '', drive_link: '', project_code: 'MRS' },
]

export default function DocumentRegister() {
  const { activeProject } = useProject()
  const { profile } = useAuth()
  const { toasts, toast } = useToast()

  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(BLANK)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [disciplines, setDisciplines] = useState([])

  const isAdmin = ['Admin', 'PM'].includes(profile?.role)

  useEffect(() => {
    setDisciplines(getDisciplines(activeProject.code))
    loadData()
  }, [activeProject])

  async function loadData() {
    setLoading(true)
    const { data, error } = await supabase.from('documents').select('*').eq('project_code', activeProject.code).order('doc_number', { ascending: false })
    if (error || !data?.length) setDocs(SEED.filter(d => d.project_code === activeProject.code))
    else setDocs(data)
    setLoading(false)
  }

  function openNew() { setEditItem(null); setForm({ ...BLANK, discipline: disciplines[0] || '' }); setShowForm(true) }
  function openEdit(item) { setEditItem(item); setForm({ ...item }); setShowForm(true) }
  function set(f, v) { setForm(p => ({ ...p, [f]: v })) }

  async function save() {
    if (!form.title || !form.category) { toast('Title and category required', 'err'); return }
    if (editItem) {
      await supabase.from('documents').update(form).eq('id', editItem.id)
      setDocs(prev => prev.map(d => d.id === editItem.id ? { ...d, ...form } : d))
      toast('Document updated ✓', 'ok')
    } else {
      const seq = docs.filter(d => d.project_code === activeProject.code).length + 1
      const doc_number = genDocNumber('DOC', activeProject.code, seq)
      const item = { ...form, doc_number, project_code: activeProject.code }
      const { data } = await supabase.from('documents').insert(item).select().single()
      setDocs(prev => [data || { ...item, id: Date.now() }, ...prev])
      toast(`Document registered: ${doc_number}`, 'ok')
    }
    setShowForm(false)
  }

  async function remove(id) {
    if (!confirm('Delete this document record?')) return
    await supabase.from('documents').delete().eq('id', id)
    setDocs(prev => prev.filter(d => d.id !== id))
    toast('Deleted', 'warn')
  }

  const filtered = docs.filter(d => {
    if (filterCat && d.category !== filterCat) return false
    if (filterStatus && d.status !== filterStatus) return false
    if (search) {
      const q = search.toLowerCase()
      return [d.doc_number, d.title, d.activity_id, d.mrf_number, d.prepared_by].some(v => (v || '').toLowerCase().includes(q))
    }
    return true
  })

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Document Register</div>
          <div className="page-subtitle">{activeProject.name} · {docs.length} documents</div>
        </div>
        <button className="btn btn-primary" onClick={openNew}><Plus size={14} /> Register Document</button>
      </div>

      <div className="filter-bar" style={{ marginBottom: 12 }}>
        <input placeholder="Search number, title, activity, MRF…" value={search} onChange={e => setSearch(e.target.value)} />
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="">All Categories</option>
          {DOC_CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          {SUBMITTAL_STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
        {(search || filterCat || filterStatus) && <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => { setSearch(''); setFilterCat(''); setFilterStatus('') }}>Clear</button>}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>{filtered.length} records</span>
      </div>

      <div className="table-wrap">
        {loading ? <div className="table-empty">Loading…</div> : !filtered.length ? <div className="table-empty">No documents found.</div> : (
          <table>
            <thead>
              <tr>
                <th>Doc No.</th>
                <th>Title</th>
                <th>Category</th>
                <th>Discipline</th>
                <th>Date</th>
                <th>Activity</th>
                <th>MRF Link</th>
                <th>Status</th>
                <th>Drive</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => (
                <tr key={d.id}>
                  <td><span className="doc-number">{d.doc_number}</span></td>
                  <td style={{ fontSize: 12, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title}</td>
                  <td style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{d.category}</td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.discipline || '—'}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.date}</td>
                  <td style={{ fontSize: 11 }}>
                    {d.activity_id && <span className="doc-number" style={{ marginRight: 4 }}>{d.activity_id}</span>}
                    <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{d.activity_name}</span>
                  </td>
                  <td>{d.mrf_number ? <span className="doc-number">{d.mrf_number}</span> : <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>}</td>
                  <td><Badge status={d.status} /></td>
                  <td>
                    {d.drive_link
                      ? <a href={d.drive_link} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ fontSize: 11, padding: '3px 8px' }}><ExternalLink size={11} /> Open</a>
                      : <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost" style={{ padding: '3px 6px' }} onClick={() => openEdit(d)}><Pencil size={12} /></button>
                      {isAdmin && <button className="btn btn-ghost" style={{ padding: '3px 6px', color: 'var(--status-rejected-text)' }} onClick={() => remove(d.id)}><Trash2 size={12} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editItem ? `Edit — ${editItem.doc_number}` : 'Register Document'}
        size="lg"
        footer={<><button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button><button className="btn btn-primary" onClick={save}>Save</button></>}
      >
        <div className="form-grid form-grid-2" style={{ gap: 14 }}>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label required">Title</label>
            <input className="form-input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Document title" />
          </div>
          <div className="form-group">
            <label className="form-label required">Category</label>
            <select className="form-select" value={form.category} onChange={e => set('category', e.target.value)}>
              {DOC_CATEGORIES.map(c => <option key={c}>{c}</option>)}
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
            <label className="form-label">Date</label>
            <input className="form-input" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Prepared By</label>
            <input className="form-input" value={form.prepared_by} onChange={e => set('prepared_by', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Activity ID</label>
            <input className="form-input" value={form.activity_id} onChange={e => set('activity_id', e.target.value)} placeholder="A1010" />
          </div>
          <div className="form-group">
            <label className="form-label">Activity Name</label>
            <input className="form-input" value={form.activity_name} onChange={e => set('activity_name', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Linked MRF (optional)</label>
            <input className="form-input" value={form.mrf_number} onChange={e => set('mrf_number', e.target.value)} placeholder="MRF-ANT-2025-00001" />
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
              {SUBMITTAL_STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Google Drive Link</label>
            <input className="form-input" value={form.drive_link} onChange={e => set('drive_link', e.target.value)} placeholder="https://drive.google.com/…" />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Remarks</label>
            <textarea className="form-textarea" value={form.remarks} onChange={e => set('remarks', e.target.value)} rows={2} />
          </div>
        </div>
      </Modal>

      <ToastContainer toasts={toasts} />
    </div>
  )
}
