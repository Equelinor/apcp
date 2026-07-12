import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { useProject } from '../../context/ProjectContext'
import { useAuth } from '../../context/AuthContext'
import { genDocNumber, getDisciplines, SUBMITTAL_STATUSES, RESPONSE_CODES, DRAWING_REVISIONS } from '../../config/docTypes'
import { useActivityFill, useMRFList } from '../../hooks/useActivityFill'
import { employeeService } from '../../services/employeeService'
import Badge from '../../components/Badge'
import Modal from '../../components/Modal'
import { useToast, ToastContainer } from '../../utils/toast'
import { Plus, ExternalLink, Pencil, Printer, Trash2 } from 'lucide-react'
import { today } from '../../utils/delay'
import { buildIF04, printForm, mergeProjectLogos, getSignatureForName } from '../../utils/printEngine'

// SD Register revision round status codes — same A/B/C/D/UR convention as the MAC page
const REV_STATUS_CODES = ['', 'A', 'B', 'C', 'D', 'UR']

const BLANK = {
  date: today(), activity_id: '', activity_name: '', wbs_code: '',
  mrf_number: '', discipline: '', drawing_number: '', drawing_title: '',
  revision: 'Rev 00', ifc_drawing: '', consultant: '', client: '',
  submitted_date: today(), response_date: '', response_code: '',
  remarks: '', consultant_remarks: '', drive_link: '', status: 'Draft',
  prepared_by: '', copies: 1,
  contractor_sub: '', reason_for_overdue: '', submission_history: [],
}

const SEED = [
  { id: 1, if04_number: 'IF04-ANT-2025-00001', date: '2025-01-15', project_code: 'ANT', activity_id: 'A1010', activity_name: 'Basement Foundation Pour', wbs_code: '1.1.2', mrf_number: 'MRF-ANT-2025-00001', discipline: 'Civil / Structural', drawing_number: 'SD-STR-001', drawing_title: 'Foundation Layout — SD', revision: 'Rev 03', ifc_drawing: 'IFC-STR-001', consultant: 'Consultant TBC', client: 'Client TBC', submitted_date: '2025-01-15', response_date: '2025-01-22', response_code: 'A — Approved', remarks: '', consultant_remarks: 'Approved as noted', drive_link: '', status: 'Approved', prepared_by: 'Ahmed Al-Rashid', copies: 3 },
]

export default function IF04List() {
  const { activeProject } = useProject()
  const { profile } = useAuth()
  const { toasts, toast } = useToast()
  const mrfList = useMRFList(activeProject.project_code)
  const disciplines = getDisciplines(activeProject.project_code)

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [employees, setEmployees] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(BLANK)
  const [formTab, setFormTab] = useState('details')
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  // Auto-fill hook
  const { activityData, mrfData } = useActivityFill(activeProject.project_code, form.activity_id, form.mrf_number)

  // Apply auto-fills when activity or MRF data loads
  useEffect(() => {
    if (activityData && !editItem) {
      setForm(f => ({
        ...f,
        activity_name: activityData.activity_name || f.activity_name,
        wbs_code: activityData.wbs_code || f.wbs_code,
      }))
    }
  }, [activityData])

  useEffect(() => {
    if (mrfData && !editItem) {
      setForm(f => ({
        ...f,
        discipline: mrfData.mat_spec ? f.discipline : (mrfData.discipline || f.discipline),
        drawing_number: mrfData.shop_drawing || f.drawing_number,
        ifc_drawing: mrfData.ifc_drawing || f.ifc_drawing,
        revision: mrfData.drawing_rev || f.revision,
        activity_id: f.activity_id || mrfData.activity_id || '',
        activity_name: f.activity_name || mrfData.activity_name || '',
        wbs_code: f.wbs_code || mrfData.wbs_code || '',
      }))
    }
  }, [mrfData])

  useEffect(() => { loadData(); employeeService.dropdown().then(setEmployees) }, [activeProject])

  async function loadData() {
    setLoading(true)
    const { data, error } = await supabase.from('if04').select('*').eq('project_code', activeProject.project_code).order('if04_number', { ascending: false })
    if (error || !data?.length) setItems(SEED.filter(d => d.project_code === activeProject.project_code))
    else setItems(data)
    setLoading(false)
  }

  function openNew() {
    setEditItem(null)
    setForm({ ...BLANK, consultant: activeProject.consultant || '', client: activeProject.client || '' })
    setFormTab('details')
    setShowForm(true)
  }
  function openEdit(item) {
    setEditItem(item)
    setForm({ ...item, submission_history: Array.isArray(item.submission_history) ? item.submission_history : [] })
    setFormTab('details')
    setShowForm(true)
  }
  function set(f, v) { setForm(p => ({ ...p, [f]: v })) }

  // ── Revision history helpers (SD resubmission rounds — feeds Shop Drawing Register) ──
  function addRev() {
    const nextRevNo = `R${(form.submission_history?.length || 0) + 1}`
    setForm(p => ({
      ...p,
      submission_history: [...(p.submission_history || []), { rev_no: nextRevNo, submitted_date: '', return_date: '', status: '' }],
    }))
  }
  function setRev(i, field, val) {
    setForm(p => {
      const hist = [...(p.submission_history || [])]
      hist[i] = { ...hist[i], [field]: val }
      return { ...p, submission_history: hist }
    })
  }
  function removeRev(i) {
    setForm(p => ({ ...p, submission_history: (p.submission_history || []).filter((_, idx) => idx !== i) }))
  }

  async function save() {
    if (!form.drawing_title && !form.drawing_number) { toast('Drawing number or title required', 'err'); return }
    if (editItem) {
      await supabase.from('if04').update(form).eq('id', editItem.id)
      setItems(prev => prev.map(d => d.id === editItem.id ? { ...d, ...form } : d))
      toast('Updated ✓', 'ok')
    } else {
      const seq = items.filter(d => d.project_code === activeProject.project_code).length + 1
      const if04_number = genDocNumber('IF04', activeProject.project_code, seq)
      const item = { ...form, if04_number, project_code: activeProject.project_code }
      const { data } = await supabase.from('if04').insert(item).select().single()
      setItems(prev => [data || { ...item, id: Date.now() }, ...prev])
      toast(`Shop Drawing Submittal created: ${if04_number}`, 'ok')
    }
    setShowForm(false)
  }

  const filtered = items.filter(d => {
    if (filterStatus && d.status !== filterStatus) return false
    if (search) {
      const q = search.toLowerCase()
      return [d.if04_number, d.drawing_number, d.drawing_title, d.activity_id, d.mrf_number].some(v => (v || '').toLowerCase().includes(q))
    }
    return true
  })

  const handlePrint = async (d) => {
    const signatureImg = await getSignatureForName(d.prepared_by)
    printForm(buildIF04({ ...mergeProjectLogos(d, activeProject), signatureImg }), 'IF04 — Shop Drawing Submittal')
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Shop Drawing Submittals</div>
          <div className="page-subtitle">{activeProject.project_name} · IF04 · {items.length} records</div>
        </div>
        <button className="btn btn-primary" onClick={openNew}><Plus size={14} /> New Submittal</button>
      </div>

      <div className="filter-bar" style={{ marginBottom: 12 }}>
        <input placeholder="Search number, drawing, activity…" value={search} onChange={e => setSearch(e.target.value)} />
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
                <th>IF04 No.</th>
                <th>Drawing No.</th>
                <th>Title</th>
                <th>Discipline</th>
                <th>Rev</th>
                <th>Submitted</th>
                <th>Response</th>
                <th>Code</th>
                <th>Activity</th>
                <th>MRF</th>
                <th>Status</th>
                <th>Drive</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => (
                <tr key={d.id}>
                  <td><span className="doc-number">{d.if04_number}</span></td>
                  <td><span className="doc-number">{d.drawing_number || '—'}</span></td>
                  <td style={{ fontSize: 12, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.drawing_title}</td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.discipline}</td>
                  <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: 'var(--brand-accent)' }}>{d.revision}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.submitted_date || '—'}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.response_date || '—'}</td>
                  <td style={{ fontSize: 11 }}>{d.response_code ? d.response_code.split(' — ')[0] : '—'}</td>
                  <td style={{ fontSize: 11 }}>{d.activity_id ? <span className="doc-number">{d.activity_id}</span> : '—'}</td>
                  <td>{d.mrf_number ? <span className="doc-number">{d.mrf_number}</span> : <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>}</td>
                  <td><Badge status={d.status} /></td>
                  <td>{d.drive_link ? <a href={d.drive_link} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ fontSize: 11, padding: '3px 8px' }}><ExternalLink size={11} /></a> : <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>}</td>
                  <td>
                    <button className="btn btn-ghost" style={{ padding: '3px 6px' }} onClick={() => openEdit(d)}><Pencil size={12} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editItem ? `Edit — ${editItem.if04_number}` : 'New Shop Drawing Submittal'} size="lg"
        footer={<><button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button><button className="btn btn-secondary" onClick={() => { save(); setTimeout(() => window.print(), 400) }}><Printer size={13} /> Save & Print</button><button className="btn btn-primary" onClick={save}>Save</button></>}>

        {/* Modal tab bar */}
        <div style={{ display: 'flex', gap: 4, padding: '0 24px', borderBottom: '1px solid var(--border)', marginBottom: 20, marginTop: -4 }}>
          {[{ id: 'details', label: 'Submittal Details' }, { id: 'history', label: `Revision History (${form.submission_history?.length || 0})` }].map(t => (
            <button key={t.id} onClick={() => setFormTab(t.id)} style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: '10px 14px',
              fontSize: 12, fontWeight: formTab === t.id ? 700 : 400,
              color: formTab === t.id ? 'var(--brand-accent)' : 'var(--text-muted)',
              borderBottom: formTab === t.id ? '2px solid var(--brand-accent)' : '2px solid transparent',
              marginBottom: -1,
            }}>{t.label}</button>
          ))}
        </div>

        <div style={{ padding: '0 24px 4px' }}>

        {formTab === 'details' && (
        <div>
          {/* Links */}
          <div style={{ background: 'var(--bg-base)', borderRadius: 'var(--radius)', padding: '12px 14px', marginBottom: 16, fontSize: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Links — auto-fills fields below</div>
            <div className="form-grid form-grid-2" style={{ gap: 10 }}>
              <div className="form-group">
                <label className="form-label">Activity ID</label>
                <input className="form-input" value={form.activity_id} onChange={e => set('activity_id', e.target.value)} placeholder="A1010 — auto-fills activity name, WBS" />
              </div>
              <div className="form-group">
                <label className="form-label">Linked MRF (optional)</label>
                <select className="form-select" value={form.mrf_number} onChange={e => set('mrf_number', e.target.value)}>
                  <option value="">— None —</option>
                  {mrfList.map(m => <option key={m.mrf_number} value={m.mrf_number}>{m.mrf_number} — {m.material_desc?.slice(0, 40)}</option>)}
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
              <label className="form-label">Prepared By</label>
              <select className="form-select" value={form.prepared_by} onChange={e => set('prepared_by', e.target.value)}>
                <option value="">— Select —</option>
                {employees.map(e => <option key={e.id} value={e.full_name}>{e.full_name} — {e.designation}</option>)}
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
              <label className="form-label">Contractor / Sub-Contractor</label>
              <input className="form-input" value={form.contractor_sub} onChange={e => set('contractor_sub', e.target.value)} placeholder="e.g. Axion, or the sub-contractor raising this" />
            </div>
          </div>

          <div className="form-grid form-grid-2" style={{ gap: 14, marginBottom: 14 }}>
            <div className="form-group">
              <label className="form-label">Drawing Number</label>
              <input className="form-input" value={form.drawing_number} onChange={e => set('drawing_number', e.target.value)} placeholder="SD-STR-001" />
            </div>
            <div className="form-group">
              <label className="form-label required">Drawing Title</label>
              <input className="form-input" value={form.drawing_title} onChange={e => set('drawing_title', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Revision</label>
              <select className="form-select" value={form.revision} onChange={e => set('revision', e.target.value)}>
                {DRAWING_REVISIONS.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">IFC Drawing Ref</label>
              <input className="form-input" value={form.ifc_drawing} onChange={e => set('ifc_drawing', e.target.value)} />
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
              <label className="form-label">No. of Copies</label>
              <input className="form-input" type="number" min="1" value={form.copies} onChange={e => set('copies', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Google Drive Link</label>
              <input className="form-input" value={form.drive_link} onChange={e => set('drive_link', e.target.value)} placeholder="https://drive.google.com/…" />
            </div>
          </div>

          <div className="form-grid form-grid-2" style={{ gap: 14, marginBottom: 14 }}>
            <div className="form-group">
              <label className="form-label">Remarks</label>
              <textarea className="form-textarea" value={form.remarks} onChange={e => set('remarks', e.target.value)} rows={2} />
            </div>
            <div className="form-group">
              <label className="form-label">Consultant Remarks</label>
              <textarea className="form-textarea" value={form.consultant_remarks} onChange={e => set('consultant_remarks', e.target.value)} rows={2} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Reason for Overdue</label>
            <input className="form-input" value={form.reason_for_overdue} onChange={e => set('reason_for_overdue', e.target.value)} placeholder="Filled in only if this submittal ran past its review window" />
          </div>
        </div>
        )}

        {/* ── Tab: Revision History (SD resubmission rounds — feeds Shop Drawing Register) ── */}
        {formTab === 'history' && (
          <div>
            {(!form.submission_history || form.submission_history.length === 0) ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '28px 0' }}>
                No resubmission rounds yet. Add the first one below if this drawing was sent back for revision.
              </div>
            ) : (
              <div style={{ marginBottom: 16 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr>
                      {['Rev.', 'Submitted Date', 'Return Date', 'Status', ''].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '6px 10px', background: 'var(--bg-base)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {form.submission_history.map((r, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '6px 10px' }}>
                          <input className="form-input" value={r.rev_no} onChange={e => setRev(i, 'rev_no', e.target.value)}
                            style={{ width: 64, fontFamily: 'var(--font-mono)', fontWeight: 700 }} placeholder="R1" />
                        </td>
                        <td style={{ padding: '6px 10px' }}>
                          <input className="form-input" type="date" value={r.submitted_date}
                            onChange={e => setRev(i, 'submitted_date', e.target.value)} style={{ width: 140 }} />
                        </td>
                        <td style={{ padding: '6px 10px' }}>
                          <input className="form-input" type="date" value={r.return_date}
                            onChange={e => setRev(i, 'return_date', e.target.value)} style={{ width: 140 }} />
                        </td>
                        <td style={{ padding: '6px 10px' }}>
                          <select className="form-select" value={r.status}
                            onChange={e => setRev(i, 'status', e.target.value)} style={{ width: 80 }}>
                            {REV_STATUS_CODES.map(c => <option key={c} value={c}>{c || '—'}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: '6px 10px' }}>
                          <button className="btn btn-ghost" style={{ padding: '3px 6px', color: 'var(--status-rejected-text)' }}
                            onClick={() => removeRev(i)}><Trash2 size={12} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <button className="btn btn-secondary" onClick={addRev}>
              <Plus size={13} /> Add Resubmission Round
            </button>
            <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-muted)' }}>
              Rev. status codes: <b>A</b> = Approved · <b>B</b> = Approved w/ Comments · <b>C</b> = Revise &amp; Resubmit · <b>D</b> = Rejected · <b>UR</b> = Under Review
            </div>
          </div>
        )}

        </div>
      </Modal>

      <ToastContainer toasts={toasts} />
    </div>
  )
}
