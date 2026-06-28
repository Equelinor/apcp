import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useProject } from '../../context/ProjectContext'
import {
  projectService, PROJECT_STATUSES, CONTRACT_TYPES,
  CURRENCIES, THIRD_PARTY_ROLES, BLANK_PROJECT
} from '../../services/projectService'
import Badge from '../../components/Badge'
import Modal from '../../components/Modal'
import { useToast, ToastContainer } from '../../utils/toast'
import {
  Plus, Pencil, CheckCircle, Trash2, Upload,
  Building2, Users, FileText, Calendar, Briefcase, Image
} from 'lucide-react'

// ── Helpers ────────────────────────────────────────────────
const fmtCurrency = (v, cur) => v
  ? `${cur || 'AED'} ${Number(v).toLocaleString('en-US', { minimumFractionDigits: 0 })}`
  : '—'

const fmtDate = (d) => {
  if (!d) return '—'
  const dt = new Date(d)
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function LogoUpload({ value, onChange, label }) {
  const ref = useRef()
  function pick(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => onChange(reader.result)
    reader.readAsDataURL(file)
  }
  return (
    <div>
      <label className="form-label">{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {value
          ? <img src={value} alt={label} style={{ height: 40, maxWidth: 120, objectFit: 'contain', border: '1px solid var(--border)', borderRadius: 6, padding: 4, background: '#fff' }} />
          : <div style={{ height: 40, width: 120, border: '1px dashed var(--border)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Image size={16} color="var(--text-muted)" /></div>
        }
        <div style={{ display: 'flex', gap: 6 }}>
          <button type="button" className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => ref.current.click()}>
            <Upload size={11} /> Upload
          </button>
          {value && <button type="button" className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => onChange('')}><Trash2 size={11} /></button>}
        </div>
        <input ref={ref} type="file" accept="image/*" style={{ display: 'none' }} onChange={pick} />
      </div>
    </div>
  )
}

function SectionHead({ icon: Icon, label }) {
  return (
    <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border)', paddingBottom: 8, marginTop: 10 }}>
      <Icon size={14} color="var(--brand-accent)" />
      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>{label}</span>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────
export default function ProjectRegister() {
  const { profile } = useAuth()
  const { activeProject, selectProject, refreshProjects } = useProject()
  const { toasts, toast } = useToast()

  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(BLANK_PROJECT)
  const [activeTab, setActiveTab] = useState('details')

  const isAdmin = profile?.role === 'Admin'

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const data = await projectService.list()
    setProjects(data)
    setLoading(false)
  }

  function openNew() {
    setEditItem(null)
    setForm({ ...BLANK_PROJECT, subcontractors: [], third_parties: [] })
    setActiveTab('details')
    setShowForm(true)
  }

  function openEdit(item) {
    setEditItem(item)
    setForm({
      ...BLANK_PROJECT,
      ...item,
      subcontractors: item.subcontractors || [],
      third_parties: item.third_parties || [],
    })
    setActiveTab('details')
    setShowForm(true)
  }

  function set(f, v) { setForm(p => ({ ...p, [f]: v })) }

  // Subcontractors
  function addSC() {
    setForm(p => ({ ...p, subcontractors: [...(p.subcontractors || []), { name: '', scope: '', cr_number: '', contact: '' }] }))
  }
  function setSC(i, field, val) {
    setForm(p => {
      const scs = [...(p.subcontractors || [])]
      scs[i] = { ...scs[i], [field]: val }
      return { ...p, subcontractors: scs }
    })
  }
  function removeSC(i) {
    setForm(p => ({ ...p, subcontractors: (p.subcontractors || []).filter((_, idx) => idx !== i) }))
  }

  // Third parties
  function addTP() {
    setForm(p => ({ ...p, third_parties: [...(p.third_parties || []), { name: '', role: 'Authority', contact: '' }] }))
  }
  function setTP(i, field, val) {
    setForm(p => {
      const tps = [...(p.third_parties || [])]
      tps[i] = { ...tps[i], [field]: val }
      return { ...p, third_parties: tps }
    })
  }
  function removeTP(i) {
    setForm(p => ({ ...p, third_parties: (p.third_parties || []).filter((_, idx) => idx !== i) }))
  }

  async function save() {
    if (!form.project_code || !form.project_name) { toast('Project code and name are required', 'err'); return }
    try {
      if (editItem) {
        const updated = await projectService.update(editItem.id, form)
        setProjects(prev => prev.map(p => p.id === editItem.id ? { ...p, ...form } : p))
        // refresh activeProject if it's the one being edited
        if (activeProject?.project_code === form.project_code) {
          selectProject({ ...activeProject, ...form })
        }
        toast('Project updated ✓', 'ok')
      } else {
        const created = await projectService.create(form)
        setProjects(prev => [...prev, created])
        toast(`Project created: ${form.project_code}`, 'ok')
      }
      refreshProjects()
      setShowForm(false)
    } catch (err) {
      toast('Save failed — ' + (err.message || 'unknown error'), 'err')
      console.error(err)
    }
  }

  // ── Tabs ──────────────────────────────────────────────────
  const tabs = [
    { id: 'details',  label: 'Contract' },
    { id: 'people',   label: 'Team' },
    { id: 'parties',  label: 'Parties & Logos' },
    { id: 'subs',     label: 'Subcontractors' },
    { id: 'tp',       label: 'Third Parties' },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Project Register</div>
          <div className="page-subtitle">{projects.length} project{projects.length !== 1 ? 's' : ''} · Select active project to work on</div>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={openNew}><Plus size={14} /> New Project</button>
        )}
      </div>

      {/* Project Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16, marginBottom: 24 }}>
        {loading ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>
        ) : projects.map(p => {
          const isActive = p.project_code === activeProject?.project_code
          return (
            <div key={p.id} className="card" style={{ borderTop: `3px solid ${isActive ? 'var(--brand-accent)' : 'var(--border)'}`, position: 'relative' }}>
              {isActive && (
                <div style={{ position: 'absolute', top: 12, right: 12 }}>
                  <CheckCircle size={16} color="var(--brand-accent)" />
                </div>
              )}

              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
                <div style={{ background: 'var(--brand-primary)', color: 'var(--brand-accent)', borderRadius: 8, padding: '6px 12px', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
                  {p.project_code}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.project_name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{p.project_number} {p.contract_number ? `· ${p.contract_number}` : ''}</div>
                </div>
              </div>

              {/* Key info grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', marginBottom: 14 }}>
                {[
                  { label: 'Client', value: p.client },
                  { label: 'Consultant', value: p.consultant },
                  { label: 'Location', value: p.location },
                  { label: 'Contract Type', value: p.contract_type },
                  { label: 'Contract Value', value: fmtCurrency(p.contract_value, p.currency) },
                  { label: 'Duration', value: p.original_duration ? `${p.original_duration} days` : (p.start_date && p.end_date ? `${fmtDate(p.start_date)} – ${fmtDate(p.end_date)}` : '—') },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-primary)' }}>{value || '—'}</div>
                  </div>
                ))}
              </div>

              {/* Team row */}
              {p.project_manager && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
                  <span style={{ fontWeight: 600 }}>PM:</span> {p.project_manager}
                  {p.site_engineer ? <span>&nbsp;·&nbsp;<span style={{ fontWeight: 600 }}>SE:</span> {p.site_engineer}</span> : null}
                </div>
              )}

              {/* Subcontractor count */}
              {(p.subcontractors?.length > 0 || p.third_parties?.length > 0) && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
                  {p.subcontractors?.length > 0 && <span>{p.subcontractors.length} subcontractor{p.subcontractors.length !== 1 ? 's' : ''}</span>}
                  {p.subcontractors?.length > 0 && p.third_parties?.length > 0 && <span> · </span>}
                  {p.third_parties?.length > 0 && <span>{p.third_parties.length} third part{p.third_parties.length !== 1 ? 'ies' : 'y'}</span>}
                </div>
              )}

              {/* Logos preview */}
              {(p.client_logo || p.consultant_logo) && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                  {p.client_logo && <img src={p.client_logo} alt="Client" style={{ height: 24, maxWidth: 80, objectFit: 'contain', opacity: 0.8 }} />}
                  {p.consultant_logo && <img src={p.consultant_logo} alt="Consultant" style={{ height: 24, maxWidth: 80, objectFit: 'contain', opacity: 0.8 }} />}
                </div>
              )}

              {/* Footer */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Badge status={p.status} label={p.status} />
                <div style={{ display: 'flex', gap: 6 }}>
                  {!isActive && (
                    <button className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => selectProject(p)}>
                      Set Active
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
          )
        })}
      </div>

      {/* ── Modal ── */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editItem ? `Edit — ${editItem.project_code}` : 'New Project'}
        size="lg"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={save}>Save Project</button>
          </>
        }
      >
        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 4, padding: '0 24px', borderBottom: '1px solid var(--border)', marginBottom: 20, marginTop: -4 }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: '10px 14px',
                fontSize: 12, fontWeight: activeTab === t.id ? 700 : 400,
                color: activeTab === t.id ? 'var(--brand-accent)' : 'var(--text-muted)',
                borderBottom: activeTab === t.id ? '2px solid var(--brand-accent)' : '2px solid transparent',
                marginBottom: -1,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ padding: '0 24px 4px' }}>

          {/* ── TAB: Contract Details ── */}
          {activeTab === 'details' && (
            <div className="form-grid form-grid-2" style={{ gap: 14 }}>
              <SectionHead icon={Briefcase} label="Project Identity" />
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
                <label className="form-label">Location</label>
                <input className="form-input" value={form.location} onChange={e => set('location', e.target.value)} placeholder="Dubai, UAE" />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
                  {PROJECT_STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>

              <SectionHead icon={FileText} label="Contract" />
              <div className="form-group">
                <label className="form-label">Contract Number</label>
                <input className="form-input" value={form.contract_number} onChange={e => set('contract_number', e.target.value)} placeholder="CTR-2025-001" />
              </div>
              <div className="form-group">
                <label className="form-label">Contract Type</label>
                <select className="form-select" value={form.contract_type} onChange={e => set('contract_type', e.target.value)}>
                  {CONTRACT_TYPES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Contract Value</label>
                <input className="form-input" type="number" value={form.contract_value} onChange={e => set('contract_value', e.target.value)} placeholder="0.00" />
              </div>
              <div className="form-group">
                <label className="form-label">Currency</label>
                <select className="form-select" value={form.currency} onChange={e => set('currency', e.target.value)}>
                  {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>

              <SectionHead icon={Calendar} label="Dates" />
              <div className="form-group">
                <label className="form-label">Start Date</label>
                <input className="form-input" type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">End Date</label>
                <input className="form-input" type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Original Duration (days)</label>
                <input className="form-input" type="number" value={form.original_duration} onChange={e => set('original_duration', e.target.value)} placeholder="365" />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Notes</label>
                <textarea className="form-textarea" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any additional project notes…" />
              </div>
            </div>
          )}

          {/* ── TAB: Team ── */}
          {activeTab === 'people' && (
            <div className="form-grid form-grid-2" style={{ gap: 14 }}>
              <SectionHead icon={Users} label="Axion Team" />
              <div className="form-group">
                <label className="form-label">Project Manager</label>
                <input className="form-input" value={form.project_manager} onChange={e => set('project_manager', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Site Engineer</label>
                <input className="form-input" value={form.site_engineer} onChange={e => set('site_engineer', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">QA/QC Engineer</label>
                <input className="form-input" value={form.qaqc_engineer} onChange={e => set('qaqc_engineer', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Planning Engineer</label>
                <input className="form-input" value={form.planning_engineer} onChange={e => set('planning_engineer', e.target.value)} />
              </div>
            </div>
          )}

          {/* ── TAB: Parties & Logos ── */}
          {activeTab === 'parties' && (
            <div className="form-grid form-grid-2" style={{ gap: 14 }}>
              <SectionHead icon={Building2} label="Client" />
              <div className="form-group">
                <label className="form-label">Client Name</label>
                <input className="form-input" value={form.client} onChange={e => set('client', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Contact Name</label>
                <input className="form-input" value={form.client_contact_name} onChange={e => set('client_contact_name', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Contact Email</label>
                <input className="form-input" type="email" value={form.client_contact_email} onChange={e => set('client_contact_email', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Contact Phone</label>
                <input className="form-input" value={form.client_contact_phone} onChange={e => set('client_contact_phone', e.target.value)} />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <LogoUpload label="Client Logo (used on all printed forms)" value={form.client_logo} onChange={v => set('client_logo', v)} />
              </div>

              <SectionHead icon={Building2} label="Consultant" />
              <div className="form-group">
                <label className="form-label">Consultant Name</label>
                <input className="form-input" value={form.consultant} onChange={e => set('consultant', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Contact Name</label>
                <input className="form-input" value={form.consultant_contact_name} onChange={e => set('consultant_contact_name', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Contact Email</label>
                <input className="form-input" type="email" value={form.consultant_contact_email} onChange={e => set('consultant_contact_email', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Contact Phone</label>
                <input className="form-input" value={form.consultant_contact_phone} onChange={e => set('consultant_contact_phone', e.target.value)} />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <LogoUpload label="Consultant Logo (used on all printed forms)" value={form.consultant_logo} onChange={v => set('consultant_logo', v)} />
              </div>

              <SectionHead icon={Building2} label="Axion (Contractor)" />
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Contractor Name</label>
                <input className="form-input" value={form.contractor} onChange={e => set('contractor', e.target.value)} />
              </div>
            </div>
          )}

          {/* ── TAB: Subcontractors ── */}
          {activeTab === 'subs' && (
            <div>
              {(form.subcontractors || []).length === 0 && (
                <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '32px 0' }}>No subcontractors added yet</div>
              )}
              {(form.subcontractors || []).map((sc, i) => (
                <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px', marginBottom: 12, background: 'var(--bg-base)', position: 'relative' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Subcontractor {i + 1}</span>
                    <button className="btn btn-ghost" style={{ padding: '2px 6px' }} onClick={() => removeSC(i)}><Trash2 size={12} /></button>
                  </div>
                  <div className="form-grid form-grid-2" style={{ gap: 10 }}>
                    <div className="form-group">
                      <label className="form-label">Company Name</label>
                      <input className="form-input" value={sc.name} onChange={e => setSC(i, 'name', e.target.value)} placeholder="Company name" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">CR Number</label>
                      <input className="form-input" value={sc.cr_number} onChange={e => setSC(i, 'cr_number', e.target.value)} placeholder="CR No." />
                    </div>
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label className="form-label">Scope of Work</label>
                      <input className="form-input" value={sc.scope} onChange={e => setSC(i, 'scope', e.target.value)} placeholder="e.g. MEP works, Landscaping…" />
                    </div>
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label className="form-label">Contact</label>
                      <input className="form-input" value={sc.contact} onChange={e => setSC(i, 'contact', e.target.value)} placeholder="Name / phone / email" />
                    </div>
                  </div>
                </div>
              ))}
              <button className="btn btn-secondary" style={{ marginTop: 4 }} onClick={addSC}>
                <Plus size={13} /> Add Subcontractor
              </button>
            </div>
          )}

          {/* ── TAB: Third Parties ── */}
          {activeTab === 'tp' && (
            <div>
              {(form.third_parties || []).length === 0 && (
                <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '32px 0' }}>No third parties added yet</div>
              )}
              {(form.third_parties || []).map((tp, i) => (
                <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px', marginBottom: 12, background: 'var(--bg-base)', position: 'relative' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Third Party {i + 1}</span>
                    <button className="btn btn-ghost" style={{ padding: '2px 6px' }} onClick={() => removeTP(i)}><Trash2 size={12} /></button>
                  </div>
                  <div className="form-grid form-grid-2" style={{ gap: 10 }}>
                    <div className="form-group">
                      <label className="form-label">Name</label>
                      <input className="form-input" value={tp.name} onChange={e => setTP(i, 'name', e.target.value)} placeholder="Organisation name" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Role</label>
                      <select className="form-select" value={tp.role} onChange={e => setTP(i, 'role', e.target.value)}>
                        {THIRD_PARTY_ROLES.map(r => <option key={r}>{r}</option>)}
                      </select>
                    </div>
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label className="form-label">Contact</label>
                      <input className="form-input" value={tp.contact} onChange={e => setTP(i, 'contact', e.target.value)} placeholder="Name / phone / email" />
                    </div>
                  </div>
                </div>
              ))}
              <button className="btn btn-secondary" style={{ marginTop: 4 }} onClick={addTP}>
                <Plus size={13} /> Add Third Party
              </button>
            </div>
          )}

        </div>
      </Modal>

      <ToastContainer toasts={toasts} />
    </div>
  )
}
