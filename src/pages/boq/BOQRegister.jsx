import { useState, useEffect, useRef } from 'react'
import { useProject } from '../../context/ProjectContext'
import { useAuth } from '../../context/AuthContext'
import { boqService, BOQ_STATUSES, BOQ_TRADES, BLANK_ITEM } from '../../services/boqService'
import { parseFile } from '../../services/boqImportService'
import Modal from '../../components/Modal'
import { useToast, ToastContainer } from '../../utils/toast'
import {
  Upload, Plus, Pencil, Trash2, TrendingUp, BarChart2,
  ChevronDown, ChevronRight, AlertTriangle, CheckCircle,
  FileText, Download, RefreshCw
} from 'lucide-react'

// ── Helpers ────────────────────────────────────────────────
const fmt = (n, dec = 3) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec })
const fmtPct = (n) => `${Number(n || 0).toFixed(1)}%`
const progressColor = (pct) => {
  const p = Number(pct || 0)
  if (p === 0)   return '#DDE2EA'
  if (p < 30)    return '#EF4444'
  if (p < 70)    return '#F59E0B'
  if (p < 100)   return '#3B82F6'
  return '#10B981'
}

function ProgressBar({ pct, height = 6 }) {
  const p = Math.min(100, Math.max(0, Number(pct || 0)))
  return (
    <div style={{ background: '#EEF1F5', borderRadius: 4, height, overflow: 'hidden', minWidth: 60 }}>
      <div style={{ width: `${p}%`, height: '100%', background: progressColor(p), borderRadius: 4, transition: 'width 0.3s' }} />
    </div>
  )
}

function KpiCard({ label, value, sub, color }) {
  return (
    <div className="card" style={{ padding: '16px 20px', borderTop: `3px solid ${color || 'var(--brand-accent)'}` }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 2 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sub}</div>}
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────
export default function BOQRegister() {
  const { activeProject } = useProject()
  const { profile } = useAuth()
  const { toasts, toast } = useToast()

  const [tab, setTab]             = useState('dashboard')
  const [sections, setSections]   = useState([])
  const [items, setItems]         = useState([])
  const [dash, setDash]           = useState(null)
  const [loading, setLoading]     = useState(true)
  const [expanded, setExpanded]   = useState({})

  // Modals
  const [showImport, setShowImport]       = useState(false)
  const [showItemForm, setShowItemForm]   = useState(false)
  const [showProgress, setShowProgress]  = useState(false)
  const [editItem, setEditItem]           = useState(null)
  const [progressItem, setProgressItem]  = useState(null)

  // Import state
  const [importFile, setImportFile]     = useState(null)
  const [importData, setImportData]     = useState(null)
  const [importing, setImporting]       = useState(false)
  const [filterSection, setFilterSection] = useState('ALL')

  const [form, setForm]         = useState({ ...BLANK_ITEM })
  const [progressForm, setProgressForm] = useState({ completed_qty: '', progress_pct: '' })

  const fileRef = useRef()
  const pc = activeProject?.project_code

  useEffect(() => { if (pc) load() }, [pc])

  async function load() {
    setLoading(true)
    const d = await boqService.getDashboard(pc)
    setDash(d)
    setSections(d.sections)
    setItems(d.items)
    setLoading(false)
  }

  // ── Import flow ─────────────────────────────────────────
  async function handleFilePick(e) {
    const file = e.target.files[0]
    if (!file) return
    setImportFile(file)
    try {
      const parsed = await parseFile(file)
      setImportData(parsed)
      if (parsed.errors.length) toast(parsed.errors.join(', '), 'err')
      else toast(`Preview ready: ${parsed.summary}`, 'ok')
    } catch (err) {
      toast(err.message, 'err')
    }
  }

  async function confirmImport() {
    if (!importData || importing) return
    setImporting(true)
    try {
      await boqService.bulkInsert(pc, importData.sections, importData.items)
      toast(`Imported ${importData.items.length} items`, 'ok')
      setShowImport(false)
      setImportData(null)
      setImportFile(null)
      load()
    } catch (err) {
      toast('Import failed: ' + err.message, 'err')
    }
    setImporting(false)
  }

  // ── Item form ───────────────────────────────────────────
  function openNew() {
    setEditItem(null)
    setForm({ ...BLANK_ITEM })
    setShowItemForm(true)
  }

  function openEdit(item) {
    setEditItem(item)
    setForm({ ...item })
    setShowItemForm(true)
  }

  async function saveItem() {
    if (!form.item_no || !form.description) { toast('Item number and description required', 'err'); return }
    const qty  = Number(form.quantity) || 0
    const rate = Number(form.rate)     || 0
    const amt  = Number(form.amount)   || (qty * rate)
    const payload = {
      ...form,
      project_code: pc,
      quantity: qty, rate, amount: amt,
      balance_value: amt - (Number(form.completed_value) || 0),
    }

    // Ensure section exists
    if (form.section_code) {
      await boqService.upsertSection({
        project_code: pc,
        section_code: form.section_code,
        section_name: form.section_name || form.section_code,
        trade: form.trade || '',
        sort_order: 999,
      })
    }

    try {
      await boqService.upsertItem(payload)
      if (form.section_code) await boqService.recalcSection(pc, form.section_code)
      toast(editItem ? 'Item updated' : 'Item added', 'ok')
      setShowItemForm(false)
      load()
    } catch (err) { toast('Save failed: ' + err.message, 'err') }
  }

  async function deleteItem(item) {
    if (!confirm(`Delete BOQ item ${item.item_no}?`)) return
    try {
      await boqService.deleteItem(item.id)
      if (item.section_code) await boqService.recalcSection(pc, item.section_code)
      toast('Item deleted', 'ok')
      load()
    } catch (err) { toast('Delete failed', 'err') }
  }

  // ── Progress update ─────────────────────────────────────
  function openProgress(item) {
    setProgressItem(item)
    setProgressForm({ completed_qty: item.completed_qty || '', progress_pct: item.progress_pct || '' })
    setShowProgress(true)
  }

  async function saveProgress() {
    const { completed_qty, progress_pct } = progressForm
    const hasQty = completed_qty !== '' && completed_qty !== null
    const hasPct = progress_pct  !== '' && progress_pct  !== null
    if (!hasQty && !hasPct) { toast('Enter quantity or percentage', 'err'); return }
    try {
      await boqService.updateProgress(
        progressItem,
        { completedQty: hasQty ? Number(completed_qty) : undefined, progressPct: hasPct ? Number(progress_pct) : undefined },
        profile?.name || 'user'
      )
      toast('Progress updated', 'ok')
      setShowProgress(false)
      load()
    } catch (err) { toast('Update failed: ' + err.message, 'err') }
  }

  const set = (f, v) => setForm(p => ({ ...p, [f]: v }))

  const displayedItems = filterSection === 'ALL' ? items : items.filter(i => i.section_code === filterSection)
  const groupedBySec   = sections.map(s => ({
    ...s,
    items: items.filter(i => i.section_code === s.section_code),
  }))

  // ── Render ───────────────────────────────────────────────
  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">BOQ Register</div>
          <div className="page-subtitle">{activeProject?.project_name} · {items.length} items · {sections.length} sections</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => setShowImport(true)}><Upload size={13} /> Import</button>
          <button className="btn btn-secondary" onClick={load}><RefreshCw size={13} /></button>
          <button className="btn btn-primary" onClick={openNew}><Plus size={13} /> Add Item</button>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
        {[['dashboard', 'Dashboard'], ['register', 'BOQ Register'], ['progress', 'Progress by Section']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '10px 16px',
            fontSize: 12, fontWeight: tab === id ? 700 : 400,
            color: tab === id ? 'var(--brand-accent)' : 'var(--text-muted)',
            borderBottom: tab === id ? '2px solid var(--brand-accent)' : '2px solid transparent',
            marginBottom: -1,
          }}>{label}</button>
        ))}
      </div>

      {loading && <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>}

      {/* ── DASHBOARD ── */}
      {!loading && tab === 'dashboard' && dash && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
            <KpiCard label="Total BOQ Value" value={fmt(dash.totalValue)} sub={activeProject?.currency || 'BHD'} color="var(--brand-primary)" />
            <KpiCard label="Completed Value" value={fmt(dash.completedValue)} sub={fmtPct(dash.overallPct) + ' complete'} color="#10B981" />
            <KpiCard label="Balance Value" value={fmt(dash.balanceValue)} sub="remaining" color="#F59E0B" />
            <KpiCard label="Overall Progress" value={fmtPct(dash.overallPct)} sub={`${dash.completed} of ${dash.itemCount} items done`} color={progressColor(dash.overallPct)} />
            <KpiCard label="In Progress" value={dash.inProgress} sub="items active" color="#3B82F6" />
            <KpiCard label="Not Started" value={dash.notStarted} sub="items pending" color="#EF4444" />
          </div>

          {/* Overall progress bar */}
          <div className="card" style={{ padding: '20px 24px', marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontWeight: 700, fontSize: 13 }}>Overall Project Progress</span>
              <span style={{ fontWeight: 800, fontSize: 15, color: progressColor(dash.overallPct) }}>{fmtPct(dash.overallPct)}</span>
            </div>
            <ProgressBar pct={dash.overallPct} height={12} />
          </div>

          {/* Section progress */}
          <div className="card" style={{ padding: '20px 24px', marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 16 }}>Progress by Section</div>
            {dash.sections.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No sections yet — import BOQ to begin</div>}
            {dash.sections.map(s => (
              <div key={s.section_code} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{s.section_code} — {s.section_name}</span>
                  <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--text-muted)' }}>
                    <span>{fmt(s.completed_value)} / {fmt(s.total_amount)}</span>
                    <span style={{ fontWeight: 700, color: progressColor(s.progress_pct), minWidth: 40, textAlign: 'right' }}>{fmtPct(s.progress_pct)}</span>
                  </div>
                </div>
                <ProgressBar pct={s.progress_pct} height={8} />
              </div>
            ))}
          </div>

          {/* Zero-progress high-value items */}
          {dash.zeroHighValue.length > 0 && (
            <div className="card" style={{ padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <AlertTriangle size={14} color="#F59E0B" />
                <span style={{ fontWeight: 700, fontSize: 13 }}>High-Value Items — Zero Progress</span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead><tr style={{ background: 'var(--bg-base)' }}>
                  {['Item No', 'Description', 'Section', 'Amount', 'Status'].map(h => (
                    <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {dash.zeroHighValue.map(i => (
                    <tr key={i.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{i.item_no}</td>
                      <td style={{ padding: '8px 10px' }}>{i.description}</td>
                      <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>{i.section_code}</td>
                      <td style={{ padding: '8px 10px', fontWeight: 700 }}>{fmt(i.amount)}</td>
                      <td style={{ padding: '8px 10px' }}><span style={{ background: '#FEF3DC', color: '#92600A', borderRadius: 4, padding: '2px 7px', fontSize: 10, fontWeight: 700 }}>{i.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── BOQ REGISTER ── */}
      {!loading && tab === 'register' && (
        <div>
          {/* Section filter */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            {[{ section_code: 'ALL', section_name: 'All Sections' }, ...sections].map(s => (
              <button key={s.section_code} onClick={() => setFilterSection(s.section_code)}
                style={{
                  padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  background: filterSection === s.section_code ? 'var(--brand-accent)' : 'var(--bg-base)',
                  color: filterSection === s.section_code ? '#fff' : 'var(--text-secondary)',
                  border: `1px solid ${filterSection === s.section_code ? 'var(--brand-accent)' : 'var(--border)'}`,
                }}>
                {s.section_code === 'ALL' ? 'All' : `${s.section_code}`}
              </button>
            ))}
          </div>

          {displayedItems.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
              <FileText size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
              <div style={{ fontSize: 13 }}>No BOQ items yet. Import a CSV/Excel file or add items manually.</div>
            </div>
          )}

          {displayedItems.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'var(--bg-base)', position: 'sticky', top: 0 }}>
                    {['Item No', 'Description', 'Section', 'Unit', 'Qty', 'Rate', 'Amount', 'Progress', 'Done Qty', 'Done Value', 'Balance', 'Status', ''].map(h => (
                      <th key={h} style={{ padding: '8px 10px', textAlign: h === 'Amount' || h === 'Done Value' || h === 'Balance' || h === 'Rate' ? 'right' : 'left', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '2px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayedItems.map(item => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-base)'} onMouseLeave={e => e.currentTarget.style.background = ''}>
                      <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: 11, whiteSpace: 'nowrap' }}>{item.item_no}</td>
                      <td style={{ padding: '8px 10px', maxWidth: 260 }}>{item.description}</td>
                      <td style={{ padding: '8px 10px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{item.section_code}</td>
                      <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>{item.unit}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>{fmt(item.quantity, 2)}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>{fmt(item.rate)}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600 }}>{fmt(item.amount)}</td>
                      <td style={{ padding: '8px 10px', minWidth: 100 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <ProgressBar pct={item.progress_pct} />
                          <span style={{ fontSize: 10, fontWeight: 700, color: progressColor(item.progress_pct), minWidth: 32 }}>{fmtPct(item.progress_pct)}</span>
                        </div>
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>{fmt(item.completed_qty, 2)}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', color: '#10B981', fontWeight: 600 }}>{fmt(item.completed_value)}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', color: '#EF4444' }}>{fmt(item.balance_value)}</td>
                      <td style={{ padding: '8px 10px' }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, borderRadius: 4, padding: '2px 7px',
                          background: item.status === 'Completed' ? '#D1FAE5' : item.status === 'In Progress' ? '#DBEAFE' : '#EEF1F5',
                          color: item.status === 'Completed' ? '#065F46' : item.status === 'In Progress' ? '#1E40AF' : '#4A5770',
                        }}>{item.status}</span>
                      </td>
                      <td style={{ padding: '8px 6px', whiteSpace: 'nowrap' }}>
                        <button className="btn btn-ghost" style={{ padding: '2px 6px' }} title="Update Progress" onClick={() => openProgress(item)}><TrendingUp size={12} /></button>
                        <button className="btn btn-ghost" style={{ padding: '2px 6px' }} onClick={() => openEdit(item)}><Pencil size={12} /></button>
                        <button className="btn btn-ghost" style={{ padding: '2px 6px' }} onClick={() => deleteItem(item)}><Trash2 size={12} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* Totals row */}
                {displayedItems.length > 0 && (
                  <tfoot>
                    <tr style={{ background: 'var(--bg-base)', borderTop: '2px solid var(--border)', fontWeight: 700 }}>
                      <td colSpan={6} style={{ padding: '8px 10px', fontSize: 11 }}>TOTAL</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>{fmt(displayedItems.reduce((s, i) => s + Number(i.amount || 0), 0))}</td>
                      <td style={{ padding: '8px 10px' }}></td>
                      <td style={{ padding: '8px 10px' }}></td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', color: '#10B981' }}>{fmt(displayedItems.reduce((s, i) => s + Number(i.completed_value || 0), 0))}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', color: '#EF4444' }}>{fmt(displayedItems.reduce((s, i) => s + Number(i.balance_value || 0), 0))}</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── PROGRESS BY SECTION ── */}
      {!loading && tab === 'progress' && (
        <div>
          {groupedBySec.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '32px 0' }}>No sections loaded yet.</div>}
          {groupedBySec.map(sec => (
            <div key={sec.section_code} className="card" style={{ marginBottom: 14, padding: 0, overflow: 'hidden' }}>
              {/* Section header */}
              <div
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', background: 'var(--bg-base)', cursor: 'pointer', borderBottom: expanded[sec.section_code] ? '1px solid var(--border)' : 'none' }}
                onClick={() => setExpanded(p => ({ ...p, [sec.section_code]: !p[sec.section_code] }))}
              >
                {expanded[sec.section_code] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{sec.section_code} — {sec.section_name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{sec.items.length} items · {fmt(sec.total_amount)} total</div>
                </div>
                <div style={{ minWidth: 200 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmt(sec.completed_value)} done</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: progressColor(sec.progress_pct) }}>{fmtPct(sec.progress_pct)}</span>
                  </div>
                  <ProgressBar pct={sec.progress_pct} height={8} />
                </div>
              </div>
              {/* Section items */}
              {expanded[sec.section_code] && (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead><tr style={{ background: '#FAFBFC' }}>
                    {['Item No', 'Description', 'Unit', 'Qty', 'Amount', 'Progress', 'Done', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '6px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {sec.items.map(item => (
                      <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{item.item_no}</td>
                        <td style={{ padding: '8px 12px', maxWidth: 300 }}>{item.description}</td>
                        <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{item.unit}</td>
                        <td style={{ padding: '8px 12px' }}>{fmt(item.quantity, 2)}</td>
                        <td style={{ padding: '8px 12px', fontWeight: 600 }}>{fmt(item.amount)}</td>
                        <td style={{ padding: '8px 12px', minWidth: 130 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <ProgressBar pct={item.progress_pct} />
                            <span style={{ fontSize: 11, fontWeight: 700, color: progressColor(item.progress_pct) }}>{fmtPct(item.progress_pct)}</span>
                          </div>
                        </td>
                        <td style={{ padding: '8px 12px', fontSize: 11, color: 'var(--text-muted)' }}>{fmt(item.completed_qty, 2)} {item.unit}</td>
                        <td style={{ padding: '8px 12px' }}>
                          <button className="btn btn-secondary" style={{ fontSize: 10, padding: '3px 10px' }} onClick={() => openProgress(item)}>
                            <TrendingUp size={10} /> Update
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── IMPORT MODAL ── */}
      <Modal open={showImport} onClose={() => { setShowImport(false); setImportData(null); setImportFile(null) }}
        title="Import BOQ — CSV / Excel" size="lg"
        footer={<>
          <button className="btn btn-secondary" onClick={() => { setShowImport(false); setImportData(null); setImportFile(null) }}>Cancel</button>
          <button className="btn btn-primary" disabled={!importData || importing} onClick={confirmImport}>
            {importing ? 'Importing…' : `Import ${importData?.items?.length || 0} Items`}
          </button>
        </>}>
        <div style={{ padding: '0 24px 16px' }}>
          <div style={{ background: 'var(--bg-base)', borderRadius: 8, padding: '14px 16px', marginBottom: 18, fontSize: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Required columns (case-insensitive):</div>
            <div style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
              Section Code · Section Name · BOQ Item No · Description · Unit · Quantity · Rate · Amount · Trade · Remarks
            </div>
          </div>
          <div
            style={{ border: '2px dashed var(--border)', borderRadius: 10, padding: '32px 24px', textAlign: 'center', cursor: 'pointer', marginBottom: 16 }}
            onClick={() => fileRef.current.click()}
          >
            <Upload size={24} color="var(--text-muted)" style={{ marginBottom: 8 }} />
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
              {importFile ? importFile.name : 'Click to select CSV or Excel file'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Supports .csv, .xlsx, .xls</div>
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }} onChange={handleFilePick} />
          </div>
          {importData && (
            <div style={{ background: '#E6F4EE', border: '1px solid #A8D9BC', borderRadius: 8, padding: '12px 16px', marginBottom: 12 }}>
              <div style={{ fontWeight: 700, color: '#065F46', marginBottom: 8 }}>{importData.summary}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {importData.sections.map(s => (
                  <div key={s.section_code} style={{ fontSize: 11, color: '#146C43' }}>
                    <span style={{ fontWeight: 700 }}>{s.section_code}</span> — {s.section_name} ({importData.items.filter(i => i.section_code === s.section_code).length} items)
                  </div>
                ))}
              </div>
              {importData.errors.length > 0 && (
                <div style={{ marginTop: 8, color: '#B91C1C', fontSize: 11 }}>{importData.errors.join(' · ')}</div>
              )}
            </div>
          )}
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            ⚠ Importing will add or update items. Existing items with the same Item No will be overwritten.
          </div>
        </div>
      </Modal>

      {/* ── ITEM FORM MODAL ── */}
      <Modal open={showItemForm} onClose={() => setShowItemForm(false)}
        title={editItem ? `Edit — ${editItem.item_no}` : 'Add BOQ Item'} size="lg"
        footer={<>
          <button className="btn btn-secondary" onClick={() => setShowItemForm(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={saveItem}>Save Item</button>
        </>}>
        <div style={{ padding: '0 24px 8px' }}>
          <div className="form-grid form-grid-2" style={{ gap: 12 }}>
            <div className="form-group">
              <label className="form-label required">BOQ Item No</label>
              <input className="form-input" value={form.item_no} onChange={e => set('item_no', e.target.value)} placeholder="2.01" />
            </div>
            <div className="form-group">
              <label className="form-label">Section Code</label>
              <input className="form-input" value={form.section_code} onChange={e => set('section_code', e.target.value)} placeholder="2.00" />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label required">Description</label>
              <textarea className="form-textarea" rows={2} value={form.description} onChange={e => set('description', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Unit</label>
              <input className="form-input" value={form.unit} onChange={e => set('unit', e.target.value)} placeholder="m2, m3, Item…" />
            </div>
            <div className="form-group">
              <label className="form-label">Trade / Discipline</label>
              <select className="form-select" value={form.trade} onChange={e => set('trade', e.target.value)}>
                <option value="">— Select —</option>
                {BOQ_TRADES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Quantity</label>
              <input className="form-input" type="number" value={form.quantity} onChange={e => set('quantity', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Rate</label>
              <input className="form-input" type="number" value={form.rate} onChange={e => set('rate', e.target.value)} />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Amount (auto-calculated if blank)</label>
              <input className="form-input" type="number" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="Leave blank to calculate from Qty × Rate" />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Remarks</label>
              <input className="form-input" value={form.remarks} onChange={e => set('remarks', e.target.value)} />
            </div>
          </div>
        </div>
      </Modal>

      {/* ── PROGRESS MODAL ── */}
      <Modal open={showProgress} onClose={() => setShowProgress(false)}
        title={`Update Progress — ${progressItem?.item_no}`}
        footer={<>
          <button className="btn btn-secondary" onClick={() => setShowProgress(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={saveProgress}>Save Progress</button>
        </>}>
        <div style={{ padding: '0 24px 16px' }}>
          {progressItem && (
            <div style={{ background: 'var(--bg-base)', borderRadius: 8, padding: '12px 14px', marginBottom: 18, fontSize: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>{progressItem.description}</div>
              <div style={{ color: 'var(--text-muted)' }}>
                Total: {fmt(progressItem.quantity, 2)} {progressItem.unit} · Amount: {fmt(progressItem.amount)}
              </div>
              <div style={{ marginTop: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11 }}>Current progress</span>
                  <span style={{ fontWeight: 700, color: progressColor(progressItem.progress_pct) }}>{fmtPct(progressItem.progress_pct)}</span>
                </div>
                <ProgressBar pct={progressItem.progress_pct} height={8} />
              </div>
            </div>
          )}
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 14 }}>Enter either completed quantity or progress %. The other will be calculated automatically.</div>
          <div className="form-grid form-grid-2" style={{ gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Completed Quantity ({progressItem?.unit})</label>
              <input className="form-input" type="number" min={0} max={progressItem?.quantity}
                value={progressForm.completed_qty}
                onChange={e => setProgressForm(p => ({ ...p, completed_qty: e.target.value, progress_pct: '' }))}
                placeholder={`Max: ${fmt(progressItem?.quantity, 2)}`} />
            </div>
            <div className="form-group">
              <label className="form-label">Or Progress %</label>
              <input className="form-input" type="number" min={0} max={100}
                value={progressForm.progress_pct}
                onChange={e => setProgressForm(p => ({ ...p, progress_pct: e.target.value, completed_qty: '' }))}
                placeholder="0 – 100" />
            </div>
          </div>
        </div>
      </Modal>

      <ToastContainer toasts={toasts} />
    </div>
  )
}
