import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { useProject } from '../../context/ProjectContext'
import { useAuth } from '../../context/AuthContext'
import { genDocNumber, RESPONSE_CODES } from '../../config/docTypes'
import { useActivityFill, useMRFList } from '../../hooks/useActivityFill'
import { supplierService } from '../../services/supplierService'
import Badge from '../../components/Badge'
import Modal from '../../components/Modal'
import { useToast, ToastContainer } from '../../utils/toast'
import { Plus, Pencil, ExternalLink , Printer, Trash2} from 'lucide-react'
import { today } from '../../utils/delay'
import { buildIF05, printForm, mergeProjectLogos } from '../../utils/printEngine'

const MAC_STATUSES = ['Draft', 'Submitted', 'Under Review', 'Approved', 'Approved with Comments', 'Rejected', 'Resubmitted']
// MAR Register revision round status codes — same A/B/C/D/UR convention as SD Register
const REV_STATUS_CODES = ['', 'A', 'B', 'C', 'D', 'UR']

const BLANK = {
  date: today(), activity_id: '', activity_name: '', wbs_code: '',
  mrf_number: '', material_desc: '', mat_spec: '', brand: '', grade: '',
  code_ref: '', sample_ref: '', origin: '', color: '',
  prepared_by: '', addressed_to: '', supplier_name: '',
  submitted_date: today(), response_date: '', response_code: '',
  status: 'Draft', remarks: '', consultant_remarks: '', drive_link: '',
  revision_no: 'R0', submission_history: [],
}

const SEED = [
  { id: 1, if05_number: 'IF05-ANT-2025-00001', date: '2025-01-16', project_code: 'ANT', activity_id: 'A1010', activity_name: 'Basement Foundation Pour', wbs_code: '1.1.2', mrf_number: 'MRF-ANT-2025-00001', material_desc: 'Ready Mix Concrete M40', mat_spec: 'M40 Ready Mix', brand: 'Gulf Concrete Co.', grade: 'M40', code_ref: 'BS EN 206', sample_ref: 'SMPL-2025-001', origin: 'UAE', color: 'N/A', prepared_by: 'Ahmed Al-Rashid', addressed_to: 'Consultant', submitted_date: '2025-01-16', response_date: '2025-01-20', response_code: 'A — Approved', status: 'Approved', remarks: '', consultant_remarks: 'Material approved. Ensure fresh delivery within 90 mins.', drive_link: '' },
  { id: 2, if05_number: 'IF05-MRS-2025-00001', date: '2025-01-21', project_code: 'MRS', activity_id: 'B2030', activity_name: 'Basement Waterproofing L3', wbs_code: '2.1.3', mrf_number: 'MRF-MRS-2025-00001', material_desc: 'SBS Waterproofing Membrane Type A', mat_spec: 'SBS Modified Bitumen 4mm', brand: 'Sika', grade: 'Type A', code_ref: 'ASTM D6163', sample_ref: 'SMPL-2025-003', origin: 'Switzerland', color: 'Black', prepared_by: 'Khalid Mansoor', addressed_to: 'Consultant', submitted_date: '2025-01-21', response_date: '', response_code: '', status: 'Submitted', remarks: '', consultant_remarks: '', drive_link: '' },
]

export default function IF05List() {
  const { activeProject } = useProject()
  const { profile } = useAuth()
  const { toasts, toast } = useToast()
  const mrfList = useMRFList(activeProject.project_code)

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [suppliers, setSuppliers] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(BLANK)
  const [formTab, setFormTab] = useState('details')
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const { activityData, mrfData } = useActivityFill(activeProject.project_code, form.activity_id, form.mrf_number)

  useEffect(() => {
    if (activityData && !editItem) setForm(f => ({ ...f, activity_name: activityData.activity_name || f.activity_name, wbs_code: activityData.wbs_code || f.wbs_code }))
  }, [activityData])

  useEffect(() => {
    if (mrfData && !editItem) {
      setForm(f => ({
        ...f,
        material_desc: mrfData.material_desc || f.material_desc,
        mat_spec: mrfData.mat_spec || f.mat_spec,
        brand: mrfData.brand || f.brand,
        grade: mrfData.grade || f.grade,
        code_ref: mrfData.code_ref || f.code_ref,
        sample_ref: mrfData.sample_ref || f.sample_ref,
        activity_id: f.activity_id || mrfData.activity_id || '',
        activity_name: f.activity_name || mrfData.activity_name || '',
        wbs_code: f.wbs_code || mrfData.wbs_code || '',
      }))
    }
  }, [mrfData])

  useEffect(() => {
    loadData()
    supplierService.dropdown().then(setSuppliers)
  }, [activeProject])

  async function loadData() {
    setLoading(true)
    const { data, error } = await supabase.from('if05').select('*').eq('project_code', activeProject.project_code).order('if05_number', { ascending: false })
    if (error || !data?.length) setItems(SEED.filter(d => d.project_code === activeProject.project_code))
    else setItems(data)
    setLoading(false)
  }

  function openNew() { setEditItem(null); setForm(BLANK); setFormTab('details'); setShowForm(true) }
  function openEdit(item) {
    setEditItem(item)
    setForm({ ...item, submission_history: Array.isArray(item.submission_history) ? item.submission_history : [] })
    setFormTab('details')
    setShowForm(true)
  }
  function set(f, v) { setForm(p => ({ ...p, [f]: v })) }

  // ── Revision history helpers (MAC resubmission rounds — feeds MAR Register) ──
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
    if (!form.material_desc && !form.mrf_number) { toast('Material description or MRF link required', 'err'); return }
    if (editItem) {
      await supabase.from('if05').update(form).eq('id', editItem.id)
      setItems(prev => prev.map(d => d.id === editItem.id ? { ...d, ...form } : d))
      toast('MAC updated ✓', 'ok')
    } else {
      const seq = items.filter(d => d.project_code === activeProject.project_code).length + 1
      const if05_number = genDocNumber('IF05', activeProject.project_code, seq)
      const item = { ...form, if05_number, project_code: activeProject.project_code }
      const { data } = await supabase.from('if05').insert(item).select().single()
      setItems(prev => [data || { ...item, id: Date.now() }, ...prev])
      toast(`MAC created: ${if05_number}`, 'ok')
    }
    setShowForm(false)
  }

  const filtered = items.filter(d => {
    if (filterStatus && d.status !== filterStatus) return false
    if (search) {
      const q = search.toLowerCase()
      return [d.if05_number, d.material_desc, d.brand, d.supplier_name, d.activity_id, d.mrf_number].some(v => (v || '').toLowerCase().includes(q))
    }
    return true
  })

  const handlePrint = (d) => {
    printForm(buildIF05(mergeProjectLogos(d, activeProject)), 'IF05 — Material Approval Certificate')
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Material Approval Certificate</div>
          <div className="page-subtitle">{activeProject.project_name} · IF05 (MAC) · {items.length} records</div>
        </div>
        <button className="btn btn-primary" onClick={openNew}><Plus size={14} /> New MAC</button>
      </div>

      <div className="filter-bar" style={{ marginBottom: 12 }}>
        <input placeholder="Search MAC number, material, brand…" value={search} onChange={e => setSearch(e.target.value)} />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          {MAC_STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
        {(search || filterStatus) && <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => { setSearch(''); setFilterStatus('') }}>Clear</button>}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>{filtered.length} records</span>
      </div>

      <div className="table-wrap">
        {loading ? <div className="table-empty">Loading…</div> : !filtered.length ? <div className="table-empty">No MACs found.</div> : (
          <table>
            <thead>
              <tr>
                <th>IF05 No.</th><th>Material</th><th>Brand</th><th>Grade</th>
                <th>Sample Ref</th><th>MRF</th><th>Activity</th>
                <th>Submitted</th><th>Response</th><th>Code</th>
                <th>Status</th><th>Drive</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => (
                <tr key={d.id}>
                  <td><span className="doc-number">{d.if05_number}</span></td>
                  <td style={{ fontSize: 12, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.material_desc}</td>
                  <td style={{ fontSize: 12 }}>{d.brand || '—'}</td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.grade || '—'}</td>
                  <td><span className="doc-number">{d.sample_ref || '—'}</span></td>
                  <td>{d.mrf_number ? <span className="doc-number">{d.mrf_number}</span> : <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>}</td>
                  <td>{d.activity_id ? <span className="doc-number">{d.activity_id}</span> : <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.submitted_date || '—'}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.response_date || '—'}</td>
                  <td style={{ fontSize: 11 }}>{d.response_code ? d.response_code.split(' — ')[0] : '—'}</td>
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

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editItem ? `Edit — ${editItem.if05_number}` : 'New Material Approval Certificate'} size="lg"
        footer={<><button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button><button className="btn btn-primary" onClick={save}>Save</button></>}>

        {/* Modal tab bar */}
        <div style={{ display: 'flex', gap: 4, padding: '0 24px', borderBottom: '1px solid var(--border)', marginBottom: 20, marginTop: -4 }}>
          {[{ id: 'details', label: 'MAC Details' }, { id: 'history', label: `Revision History (${form.submission_history?.length || 0})` }].map(t => (
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
          <div style={{ background: 'var(--bg-base)', borderRadius: 'var(--radius)', padding: '12px 14px', marginBottom: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Links — auto-fills material fields</div>
            <div className="form-grid form-grid-2" style={{ gap: 10 }}>
              <div className="form-group">
                <label className="form-label">Linked MRF</label>
                <select className="form-select" value={form.mrf_number} onChange={e => set('mrf_number', e.target.value)}>
                  <option value="">— None —</option>
                  {mrfList.map(m => <option key={m.mrf_number} value={m.mrf_number}>{m.mrf_number} — {m.material_desc?.slice(0, 35)}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Activity ID</label>
                <input className="form-input" value={form.activity_id} onChange={e => set('activity_id', e.target.value)} placeholder="A1010" />
              </div>
            </div>
          </div>

          <div className="form-grid form-grid-2" style={{ gap: 14, marginBottom: 14 }}>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label required">Material Description</label>
              <input className="form-input" value={form.material_desc} onChange={e => set('material_desc', e.target.value)} placeholder="Auto-fills from MRF" />
            </div>
            <div className="form-group">
              <label className="form-label">Specification</label>
              <input className="form-input" value={form.mat_spec} onChange={e => set('mat_spec', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Brand / Manufacturer</label>
              <input className="form-input" value={form.brand} onChange={e => set('brand', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Supplier</label>
              <input
                className="form-input"
                list="if05-supplier-list"
                value={form.supplier_name}
                onChange={e => set('supplier_name', e.target.value)}
                placeholder="Select or type supplier name"
              />
              <datalist id="if05-supplier-list">
                {suppliers.map(s => <option key={s.id} value={s.supplier_name} />)}
              </datalist>
            </div>
            <div className="form-group">
              <label className="form-label">Grade</label>
              <input className="form-input" value={form.grade} onChange={e => set('grade', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Code / Standard</label>
              <input className="form-input" value={form.code_ref} onChange={e => set('code_ref', e.target.value)} placeholder="BS / ASTM / ISO" />
            </div>
            <div className="form-group">
              <label className="form-label">Sample Ref</label>
              <input className="form-input" value={form.sample_ref} onChange={e => set('sample_ref', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Country of Origin</label>
              <input className="form-input" value={form.origin} onChange={e => set('origin', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Color / Finish</label>
              <input className="form-input" value={form.color} onChange={e => set('color', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Activity Name</label>
              <input className="form-input" value={form.activity_name} onChange={e => set('activity_name', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Prepared By</label>
              <input className="form-input" value={form.prepared_by} onChange={e => set('prepared_by', e.target.value)} />
            </div>
          </div>

          <div className="form-grid form-grid-3" style={{ gap: 14, marginBottom: 14 }}>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input className="form-input" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
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
                {MAC_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Current Revision</label>
              <input className="form-input" value={form.revision_no} onChange={e => set('revision_no', e.target.value)} placeholder="R0, R1, R2…" />
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
        )}

        {/* ── Tab: Revision History (MAC resubmission rounds — feeds MAR Register) ── */}
        {formTab === 'history' && (
          <div>
            {(!form.submission_history || form.submission_history.length === 0) ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '28px 0' }}>
                No resubmission rounds yet. Add the first one below if this MAC was sent back for revision.
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
