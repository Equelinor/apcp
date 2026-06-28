import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useProject } from '../../context/ProjectContext'
import { projectService, PROJECT_STATUSES, BLANK_PROJECT } from '../../services/projectService'
import Badge from '../../components/Badge'
import Modal from '../../components/Modal'
import { useToast, ToastContainer } from '../../utils/toast'
import { Plus, Pencil, CheckCircle } from 'lucide-react'

export default function ProjectRegister() {
  const { profile } = useAuth()
  const { activeProject, selectProject, refreshProjects } = useProject()
  const { toasts, toast } = useToast()

  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(BLANK_PROJECT)

  const isAdmin = profile?.role === 'Admin'

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const data = await projectService.list()
    setProjects(data)
    setLoading(false)
  }

  function openNew() { setEditItem(null); setForm({ ...BLANK_PROJECT }); setShowForm(true) }
  function openEdit(item) { setEditItem(item); setForm({ ...item }); setShowForm(true) }
  function set(f, v) { setForm(p => ({ ...p, [f]: v })) }

  async function save() {
    if (!form.project_code || !form.project_name) { toast('Project code and name required', 'err'); return }
    try {
      if (editItem) {
        await projectService.update(editItem.id, form)
        setProjects(prev => prev.map(p => p.id === editItem.id ? { ...p, ...form } : p))
        toast('Project updated ✓', 'ok')
      } else {
        const created = await projectService.create(form)
        setProjects(prev => [...prev, created])
        toast(`Project created: ${form.project_code}`, 'ok')
      }
      refreshProjects()
      setShowForm(false)
    } catch (err) {
      toast('Save failed', 'err')
      console.error(err)
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Project Register</div>
          <div className="page-subtitle">{projects.length} project{projects.length !== 1 ? 's' : ''} · Root of APCP</div>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={openNew}><Plus size={14} /> New Project</button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16, marginBottom: 24 }}>
        {loading ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>
        ) : projects.map(p => (
          <div key={p.id} className="card" style={{ borderTop: `3px solid ${p.project_code === activeProject?.project_code ? 'var(--brand-accent)' : 'var(--border)'}`, position: 'relative' }}>
            {p.project_code === activeProject?.project_code && (
              <div style={{ position: 'absolute', top: 12, right: 12 }}>
                <CheckCircle size={16} color="var(--brand-accent)" />
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
              <div style={{ background: 'var(--brand-primary)', color: 'var(--brand-accent)', borderRadius: 8, padding: '6px 12px', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
                {p.project_code}
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{p.project_name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{p.project_number}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
              {[
                { label: 'Client', value: p.client },
                { label: 'Consultant', value: p.consultant },
                { label: 'Contractor', value: p.contractor },
                { label: 'Location', value: p.location },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-primary)' }}>{value || '—'}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Badge status={p.status} label={p.status} />
              <div style={{ display: 'flex', gap: 6 }}>
                {p.project_code !== activeProject?.project_code && (
                  <button className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => selectProject(p)}>
                    Switch
                  </button>
                )}
                {isAdmin && (
                  <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => openEdit(p)}>
                    <Pencil size={12} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editItem ? `Edit — ${editItem.project_code}` : 'New Project'} size="lg"
        footer={<><button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button><button className="btn btn-primary" onClick={save}>Save</button></>}>
        <div className="form-grid form-grid-2" style={{ gap: 14 }}>
          <div className="form-group">
            <label className="form-label required">Project Code</label>
            <input className="form-input" value={form.project_code} onChange={e => set('project_code', e.target.value.toUpperCase())} placeholder="ANT" maxLength={10} style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }} />
          </div>
          <div className="form-group">
            <label className="form-label">Project Number</label>
            <input className="form-input" value={form.project_number} onChange={e => set('project_number', e.target.value)} placeholder="AX-2025-001" />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label required">Project Name</label>
            <input className="form-input" value={form.project_name} onChange={e => set('project_name', e.target.value)} placeholder="Full project name" />
          </div>
          <div className="form-group">
            <label className="form-label">Client</label>
            <input className="form-input" value={form.client} onChange={e => set('client', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Consultant</label>
            <input className="form-input" value={form.consultant} onChange={e => set('consultant', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Contractor</label>
            <input className="form-input" value={form.contractor} onChange={e => set('contractor', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Location</label>
            <input className="form-input" value={form.location} onChange={e => set('location', e.target.value)} placeholder="Dubai, UAE" />
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
              {PROJECT_STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </Modal>

      <ToastContainer toasts={toasts} />
    </div>
  )
}
