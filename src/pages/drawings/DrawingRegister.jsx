import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { useProject } from '../../context/ProjectContext'
import { useAuth } from '../../context/AuthContext'
import { genDocNumber, getDisciplines, saveDisciplines, DEFAULT_DISCIPLINES, DRAWING_REVISIONS } from '../../config/docTypes'
import Modal from '../../components/Modal'
import { useToast, ToastContainer } from '../../utils/toast'
import { Plus, ExternalLink, Pencil, Trash2, Settings } from 'lucide-react'
import { today } from '../../utils/delay'

const BLANK = {
  title: '', discipline: '', revision: 'Rev 00', date: today(),
  prepared_by: '', activity_id: '', activity_name: '', remarks: '', drive_link: ''
}

const SEED = [
  { id: 1, drw_number: 'DRW-ANT-2025-00001', title: 'Foundation Layout Plan', discipline: 'Civil / Structural', revision: 'Rev 03', date: '2025-01-10', prepared_by: 'Ahmed Al-Rashid', activity_id: 'A1010', activity_name: 'Basement Foundation Pour', remarks: 'IFC issued', drive_link: '', project_code: 'ANT' },
  { id: 2, drw_number: 'DRW-ANT-2025-00002', title: 'Ground Floor Column Details', discipline: 'Civil / Structural', revision: 'Rev 02', date: '2025-01-18', prepared_by: 'Sara Qureshi', activity_id: 'A1210', activity_name: 'GF Column Reinforcement', remarks: '', drive_link: '', project_code: 'ANT' },
  { id: 3, drw_number: 'DRW-MRS-2025-00001', title: 'Tower C Waterproofing Details', discipline: 'Architectural', revision: 'Rev 01', date: '2025-01-20', prepared_by: 'Khalid Mansoor', activity_id: 'B2030', activity_name: 'Basement Waterproofing L3', remarks: '', drive_link: '', project_code: 'MRS' },
]

export default function DrawingRegister() {
  const { activeProject } = useProject()
  const { profile } = useAuth()
  const { toasts, toast } = useToast()

  const [drawings, setDrawings] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(BLANK)
  const [search, setSearch] = useState('')
  const [filterDisc, setFilterDisc] = useState('')
  const [showDisciplines, setShowDisciplines] = useState(false)
  const [disciplines, setDisciplines] = useState([])
  const [newDisc, setNewDisc] = useState('')

  const isAdmin = ['Admin', 'PM'].includes(profile?.role)

  useEffect(() => {
    setDisciplines(getDisciplines(activeProject.project_code))
    loadData()
  }, [activeProject])

  async function loadData() {
    setLoading(true)
    const { data, error } = await supabase.from('drawings').select('*').eq('project_code', activeProject.project_code).order('drw_number', { ascending: false })
    if (error || !data?.length) setDrawings(SEED.filter(d => d.project_code === activeProject.project_code))
    else setDrawings(data)
    setLoading(false)
  }

  function openNew() { setEditItem(null); setForm({ ...BLANK, discipline: disciplines[0] || '' }); setShowForm(true) }
  function openEdit(item) { setEditItem(item); setForm({ ...item }); setShowForm(true) }

  function set(f, v) { setForm(p => ({ ...p, [f]: v })) }

  async function save() {
    if (!form.title || !form.discipline) { toast('Title and discipline required', 'err'); return }
    if (editItem) {
      await supabase.from('drawings').update(form).eq('id', editItem.id)
      setDrawings(prev => prev.map(d => d.id === editItem.id ? { ...d, ...form } : d))
      toast('Drawing updated ✓', 'ok')
    } else {
      const seq = drawings.filter(d => d.project_code === activeProject.project_code).length + 1
      const drw_number = genDocNumber('DRW', activeProject.project_code, seq)
      const item = { ...form, drw_number, project_code: activeProject.project_code }
      const { data, error } = await supabase.from('drawings').insert(item).select().single()
      setDrawings(prev => [data || { ...item, id: Date.now() }, ...prev])
      toast(`Drawing registered: ${drw_number}`, 'ok')
    }
    setShowForm(false)
  }

  async function remove(id) {
    if (!confirm('Delete this drawing record?')) return
    await supabase.from('drawings').delete().eq('id', id)
    setDrawings(prev => prev.filter(d => d.id !== id))
    toast('Deleted', 'warn')
  }

  function saveDisciplineList(list) {
    saveDisciplines(activeProject.project_code, list)
    setDisciplines(list)
    toast('Disciplines updated ✓', 'ok')
  }

  function addDisc() {
    if (!newDisc.trim()) return
    saveDisciplineList([...disciplines, newDisc.trim()])
    setNewDisc('')
  }

  function removeDisc(d) { saveDisciplineList(disciplines.filter(x => x !== d)) }

  const filtered = drawings.filter(d => {
    if (filterDisc && d.discipline !== filterDisc) return false
    if (search) {
      const q = search.toLowerCase()
      return [d.drw_number, d.title, d.activity_id, d.activity_name, d.prepared_by].some(v => (v || '').toLowerCase().includes(q))
    }
    return true
  })

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Drawing Register</div>
          <div className="page-subtitle">{activeProject.project_name} · {drawings.length} drawings</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {isAdmin && (
            <button className="btn btn-secondary" onClick={() => setShowDisciplines(true)}>
              <Settings size={13} /> Disciplines
            </button>
          )}
          <button className="btn btn-primary" onClick={openNew}><Plus size={14} /> Register Drawing</button>
        </div>
      </div>

      <div className="filter-bar" style={{ marginBottom: 12 }}>
        <input placeholder="Search number, title, activity…" value={search} onChange={e => setSearch(e.target.value)} />
        <select value={filterDisc} onChange={e => setFilterDisc(e.target.value)}>
          <option value="">All Disciplines</option>
          {disciplines.map(d => <option key={d}>{d}</option>)}
        </select>
        {(search || filterDisc) && <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => { setSearch(''); setFilterDisc('') }}>Clear</button>}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>{filtered.length} records</span>
      </div>

      <div className="table-wrap">
        {loading ? <div className="table-empty">Loading…</div> : !filtered.length ? <div className="table-empty">No drawings found.</div> : (
          <table>
            <thead>
              <tr>
                <th>Drawing No.</th>
                <th>Title</th>
                <th>Discipline</th>
                <th>Rev</th>
                <th>Date</th>
                <th>Prepared By</th>
                <th>Activity</th>
                <th>Remarks</th>
                <th>Drive</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => (
                <tr key={d.id}>
                  <td><span className="doc-number">{d.drw_number}</span></td>
                  <td style={{ fontSize: 12, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title}</td>
                  <td style={{ fontSize: 12 }}>{d.discipline}</td>
                  <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: 'var(--brand-accent)' }}>{d.revision}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.date}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.prepared_by || '—'}</td>
                  <td style={{ fontSize: 11 }}>
                    {d.activity_id && <span className="doc-number" style={{ marginRight: 4 }}>{d.activity_id}</span>}
                    <span style={{ color: 'var(--text-muted)' }}>{d.activity_name}</span>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.remarks || '—'}</td>
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

      {/* Form Modal */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editItem ? `Edit — ${editItem.drw_number}` : 'Register Drawing'}
        size="lg"
        footer={<><button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button><button className="btn btn-primary" onClick={save}>Save</button></>}
      >
        <div className="form-grid form-grid-2" style={{ gap: 14 }}>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label required">Title</label>
            <input className="form-input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Drawing title" />
          </div>
          <div className="form-group">
            <label className="form-label required">Discipline</label>
            <select className="form-select" value={form.discipline} onChange={e => set('discipline', e.target.value)}>
              <option value="">— Select —</option>
              {disciplines.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Revision</label>
            <select className="form-select" value={form.revision} onChange={e => set('revision', e.target.value)}>
              {DRAWING_REVISIONS.map(r => <option key={r}>{r}</option>)}
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

      {/* Disciplines Manager */}
      <Modal
        open={showDisciplines}
        onClose={() => setShowDisciplines(false)}
        title="Manage Disciplines"
        footer={<button className="btn btn-primary" onClick={() => setShowDisciplines(false)}>Done</button>}
      >
        <div>
          <div style={{ marginBottom: 16 }}>
            {disciplines.map(d => (
              <div key={d} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-base)', borderRadius: 'var(--radius)', marginBottom: 6 }}>
                <span style={{ fontSize: 13 }}>{d}</span>
                <button className="btn btn-ghost" style={{ padding: '2px 6px', color: 'var(--status-rejected-text)' }} onClick={() => removeDisc(d)}><Trash2 size={12} /></button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="form-input" value={newDisc} onChange={e => setNewDisc(e.target.value)} placeholder="Add new discipline…" onKeyDown={e => e.key === 'Enter' && addDisc()} />
            <button className="btn btn-primary" onClick={addDisc}><Plus size={13} /></button>
          </div>
        </div>
      </Modal>

      <ToastContainer toasts={toasts} />
    </div>
  )
}
