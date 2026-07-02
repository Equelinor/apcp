import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { useProject } from '../../context/ProjectContext'
import { useAuth } from '../../context/AuthContext'
import { supplierService } from '../../services/supplierService'
import Modal from '../../components/Modal'
import { useToast, ToastContainer } from '../../utils/toast'
import { Plus, Pencil, Trash2, Printer } from 'lucide-react'
import { today } from '../../utils/delay'
import { AXION_LOGO } from '../../utils/axionLogo'

// ── Status system ─────────────────────────────────────────
const MAR_STATUS = {
  'Pending':                  { code: 'PND', bg: '#F1F5F9', text: '#64748B', border: '#CBD5E1' },
  'Under Review':             { code: 'UR',  bg: '#DBEAFE', text: '#1E40AF', border: '#BFDBFE' },
  'Approved':                 { code: 'A',   bg: '#D1FAE5', text: '#065F46', border: '#A7F3D0' },
  'Approved with Comments':   { code: 'B',   bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' },
  'Revised and Resubmit':     { code: 'C',   bg: '#FFEDD5', text: '#9A3412', border: '#FED7AA' },
  'Rejected':                 { code: 'D',   bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5' },
}
const MAR_STATUS_KEYS = Object.keys(MAR_STATUS)
const REV_STATUS_CODES = ['', 'A', 'B', 'C', 'D', 'UR']

function StatusBadge({ status }) {
  const s = MAR_STATUS[status] || MAR_STATUS['Pending']
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 4,
      fontSize: 10, fontWeight: 700,
      background: s.bg, color: s.text, border: `1px solid ${s.border}`,
    }}>
      {s.code}
    </span>
  )
}

// ── Helpers ───────────────────────────────────────────────
const fmtDate = d => {
  if (!d) return '—'
  const dt = new Date(d)
  return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${String(dt.getFullYear()).slice(2)}`
}

const BLANK = {
  mar_ref_no: '', mar_subject: '', manufacturer_product: '',
  supplier_name: '', submitted_date: '', responded_date: '',
  current_status: 'Pending', revision_no: 'R0',
  remarks: '', comments: '', submission_history: [],
}

// ── PDF export ────────────────────────────────────────────
function exportPDF(items, project) {
  const genDate = new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })

  const counts = {
    total:    items.length,
    submitted: items.filter(i => i.submitted_date).length,
    ur:       items.filter(i => i.current_status === 'Under Review').length,
    a:        items.filter(i => i.current_status === 'Approved').length,
    b:        items.filter(i => i.current_status === 'Approved with Comments').length,
    c:        items.filter(i => i.current_status === 'Revised and Resubmit').length,
    d:        items.filter(i => i.current_status === 'Rejected').length,
    pending:  items.filter(i => i.current_status === 'Pending').length,
  }

  const consultantLogo = project?.consultant_logo
    ? `<img src="${project.consultant_logo}" style="max-height:38pt;max-width:110pt;object-fit:contain;display:block;margin:auto">`
    : `<div style="font-size:7.5pt;font-weight:700;text-align:center">${project?.consultant || ''}</div>`

  const clientLogo = project?.client_logo
    ? `<img src="${project.client_logo}" style="max-height:38pt;max-width:110pt;object-fit:contain;display:block;margin:auto">`
    : `<div style="font-size:7.5pt;font-weight:700;text-align:center">${project?.client || ''}</div>`

  const tableRows = items.map((m, i) => {
    const hist = Array.isArray(m.submission_history) ? m.submission_history : []
    const s = MAR_STATUS[m.current_status] || MAR_STATUS['Pending']
    const bg = i % 2 === 0 ? '#fff' : '#f9fafb'

    const revCells = [1,2,3,4,5].map(n => {
      const r = hist.find(h => String(h.rev_no) === `R${n}`) || {}
      const rs = r.status ? Object.entries(MAR_STATUS).find(([k]) =>
        MAR_STATUS[k].code === r.status
      ) : null
      const rStyle = rs
        ? `background:${rs[1].bg};color:${rs[1].text};font-weight:700`
        : 'color:#999'
      return `
        <td style="border:0.4pt solid #ccc;padding:2pt 3pt;font-size:6pt;text-align:center">${r.submitted_date ? fmtDate(r.submitted_date) : ''}</td>
        <td style="border:0.4pt solid #ccc;padding:2pt 3pt;font-size:6pt;text-align:center">${r.return_date ? fmtDate(r.return_date) : ''}</td>
        <td style="border:0.4pt solid #ccc;padding:2pt 3pt;font-size:6pt;text-align:center;${rStyle}">${r.status || ''}</td>`
    }).join('')

    return `<tr style="background:${bg}">
      <td style="border:0.4pt solid #ccc;padding:2pt 3pt;font-size:6.5pt;text-align:center">${i+1}</td>
      <td style="border:0.4pt solid #ccc;padding:2pt 4pt;font-size:6.5pt;font-family:monospace;font-weight:700">${m.mar_ref_no || ''}</td>
      <td style="border:0.4pt solid #ccc;padding:2pt 4pt;font-size:6.5pt">${m.mar_subject || ''}</td>
      <td style="border:0.4pt solid #ccc;padding:2pt 4pt;font-size:6.5pt">${m.manufacturer_product || ''}</td>
      <td style="border:0.4pt solid #ccc;padding:2pt 4pt;font-size:6.5pt">${m.supplier_name || ''}</td>
      <td style="border:0.4pt solid #ccc;padding:2pt 3pt;font-size:6pt;text-align:center">${m.submitted_date ? fmtDate(m.submitted_date) : ''}</td>
      <td style="border:0.4pt solid #ccc;padding:2pt 3pt;font-size:6pt;text-align:center">${m.responded_date ? fmtDate(m.responded_date) : ''}</td>
      <td style="border:0.4pt solid #ccc;padding:2pt 3pt;font-size:6.5pt;font-weight:700;text-align:center">${m.revision_no || ''}</td>
      <td style="border:0.4pt solid #ccc;padding:2pt 3pt;font-size:7pt;font-weight:700;text-align:center;background:${s.bg};color:${s.text}">${s.code}</td>
      <td style="border:0.4pt solid #ccc;padding:2pt 4pt;font-size:6pt;color:#555">${m.remarks || ''}</td>
      ${revCells}
    </tr>`
  }).join('')

  const revHeaderCols = [1,2,3,4,5].map(n =>
    `<th colspan="3" style="border:0.5pt solid #aaa;padding:3pt;font-size:6pt;font-weight:700;background:#374151;color:#fff;text-align:center">REV. ${n}</th>`
  ).join('')

  const revSubCols = [1,2,3,4,5].map(() =>
    `<th style="border:0.4pt solid #ccc;padding:2pt;font-size:5.5pt;font-weight:700;background:#4b5563;color:#e5e7eb;text-align:center">Sub.</th>
     <th style="border:0.4pt solid #ccc;padding:2pt;font-size:5.5pt;font-weight:700;background:#4b5563;color:#e5e7eb;text-align:center">Ret.</th>
     <th style="border:0.4pt solid #ccc;padding:2pt;font-size:5.5pt;font-weight:700;background:#4b5563;color:#e5e7eb;text-align:center">Sta.</th>`
  ).join('')

  const legendItems = [
    ['A','Approved','#D1FAE5','#065F46'],
    ['B','Approved with Comments','#FEF3C7','#92400E'],
    ['C','Revised and Resubmit','#FFEDD5','#9A3412'],
    ['D','Rejected','#FEE2E2','#991B1B'],
    ['UR','Under Review','#DBEAFE','#1E40AF'],
  ].map(([code,label,bg,color]) =>
    `<span style="display:inline-flex;align-items:center;gap:4pt;margin-right:10pt">
      <span style="display:inline-block;padding:1.5pt 5pt;background:${bg};color:${color};font-size:6.5pt;font-weight:700;border-radius:2pt">${code}</span>
      <span style="font-size:6.5pt;color:#333">${label}</span>
    </span>`
  ).join('')

  const summaryRows = [
    ['Total MARs', counts.total, ''],
    ['Submitted to Consultant', counts.submitted, ''],
    ['Under Review', counts.ur, '#1E40AF'],
    ['Approved (A)', counts.a, '#065F46'],
    ['Approved with Comments (B)', counts.b, '#92400E'],
    ['Revised & Resubmit (C)', counts.c, '#9A3412'],
    ['Rejected (D)', counts.d, '#991B1B'],
    ['Pending', counts.pending, '#64748B'],
  ].map(([l,v,c]) =>
    `<tr>
      <td style="font-size:6.5pt;padding:1.5pt 0;color:#444">${l}</td>
      <td style="font-size:7pt;font-weight:700;padding:1.5pt 0;text-align:right;color:${c||'#111'}">${v}</td>
    </tr>`
  ).join('')

  const infoRows = [
    ['Client / Employer', project?.client || '—'],
    ['Consultant', project?.consultant || '—'],
    ['Contractor', project?.contractor || 'Axion Imagineering Construction Co. W.L.L.'],
    ['Contract No.', project?.contract_number || '—'],
    ['Location', project?.location || '—'],
  ].map(([l,v]) =>
    `<tr>
      <td style="font-size:6.5pt;font-weight:700;color:#555;padding:1.5pt 0;width:36%">${l}</td>
      <td style="font-size:6.5pt;padding:1.5pt 0">${v}</td>
    </tr>`
  ).join('')

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>MAR Register — ${project?.project_name || ''}</title>
<style>
  @page { size: A4 landscape; margin: 8mm 10mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 7pt; margin: 0; color: #000; }
  table { border-collapse: collapse; width: 100%; }
  @media print { thead { display: table-header-group; } tr { page-break-inside: avoid; } }
</style>
</head>
<body>

<!-- TOP HEADER -->
<table style="margin-bottom:5pt;border:1pt solid #333">
  <tr>
    <td style="width:26%;border-right:1pt solid #ccc;padding:5pt 8pt;vertical-align:middle">
      <img src="${AXION_LOGO}" style="max-height:38pt;max-width:110pt;object-fit:contain;display:block">
    </td>
    <td style="width:48%;border-right:1pt solid #ccc;padding:5pt 10pt;vertical-align:middle;text-align:center">
      <div style="font-size:12pt;font-weight:900;letter-spacing:.06em;text-transform:uppercase;margin-bottom:3pt">Material Approval Request Log</div>
      <div style="font-size:8pt;font-weight:700">${project?.project_name || ''}</div>
      <div style="font-size:6.5pt;color:#666;margin-top:1pt">${project?.project_number || ''}</div>
    </td>
    <td style="width:26%;padding:5pt 8pt;vertical-align:middle;text-align:center">${clientLogo || consultantLogo}</td>
  </tr>
</table>

<!-- INFO + SUMMARY + LEGEND -->
<table style="margin-bottom:5pt;border:0.5pt solid #ccc">
  <tr>
    <td style="width:36%;vertical-align:top;padding:5pt 8pt;border-right:0.5pt solid #ddd">
      <div style="font-size:5.5pt;font-weight:700;text-transform:uppercase;color:#888;margin-bottom:3pt;letter-spacing:.08em">Project Information</div>
      <table style="width:100%">${infoRows}</table>
      <div style="margin-top:4pt;font-size:6pt;color:#888">Log Updated: <b style="color:#333">${genDate}</b></div>
    </td>
    <td style="width:30%;vertical-align:top;padding:5pt 8pt;border-right:0.5pt solid #ddd">
      <div style="font-size:5.5pt;font-weight:700;text-transform:uppercase;color:#888;margin-bottom:3pt;letter-spacing:.08em">Register Summary</div>
      <table style="width:100%">${summaryRows}</table>
    </td>
    <td style="width:34%;vertical-align:top;padding:5pt 8pt">
      <div style="font-size:5.5pt;font-weight:700;text-transform:uppercase;color:#888;margin-bottom:5pt;letter-spacing:.08em">Status Legend</div>
      <div style="display:flex;flex-direction:column;gap:3pt">${legendItems}</div>
    </td>
  </tr>
</table>

<!-- MAR TABLE -->
<table>
  <thead>
    <tr>
      <th rowspan="2" style="border:0.5pt solid #aaa;padding:3pt;font-size:5.5pt;font-weight:700;background:#111827;color:#fff;text-align:center;width:1.5%">Sr.</th>
      <th rowspan="2" style="border:0.5pt solid #aaa;padding:3pt;font-size:5.5pt;font-weight:700;background:#111827;color:#fff;width:7%">MAR Ref. No</th>
      <th rowspan="2" style="border:0.5pt solid #aaa;padding:3pt;font-size:5.5pt;font-weight:700;background:#111827;color:#fff;width:14%">MAR Subject</th>
      <th rowspan="2" style="border:0.5pt solid #aaa;padding:3pt;font-size:5.5pt;font-weight:700;background:#111827;color:#fff;width:9.5%">Manufacturer / Product</th>
      <th rowspan="2" style="border:0.5pt solid #aaa;padding:3pt;font-size:5.5pt;font-weight:700;background:#111827;color:#fff;width:7%">Supplier</th>
      <th rowspan="2" style="border:0.5pt solid #aaa;padding:3pt;font-size:5.5pt;font-weight:700;background:#111827;color:#fff;width:3.5%">Sub. Date</th>
      <th rowspan="2" style="border:0.5pt solid #aaa;padding:3pt;font-size:5.5pt;font-weight:700;background:#111827;color:#fff;width:3.5%">Resp. Date</th>
      <th rowspan="2" style="border:0.5pt solid #aaa;padding:3pt;font-size:5.5pt;font-weight:700;background:#111827;color:#fff;width:2%">Rev.</th>
      <th rowspan="2" style="border:0.5pt solid #aaa;padding:3pt;font-size:5.5pt;font-weight:700;background:#111827;color:#fff;width:2.5%">Status</th>
      <th rowspan="2" style="border:0.5pt solid #aaa;padding:3pt;font-size:5.5pt;font-weight:700;background:#111827;color:#fff;width:7%">Remarks</th>
      ${revHeaderCols}
    </tr>
    <tr>${revSubCols}</tr>
  </thead>
  <tbody>
    ${tableRows || '<tr><td colspan="25" style="text-align:center;padding:14pt;color:#aaa;font-size:7pt">No MAR records for this project</td></tr>'}
  </tbody>
</table>

<div style="margin-top:5pt;padding-top:4pt;border-top:0.5pt solid #ddd;font-size:5.5pt;color:#aaa;text-align:center">
  Generated by APCP &nbsp;·&nbsp; ${genDate} &nbsp;·&nbsp; This is a controlled register — do not alter
</div>
</body>
</html>`

  const win = window.open('', '_blank', 'width=1200,height=800')
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 600)
}

// ── Main component ────────────────────────────────────────
export default function MARRegister() {
  const { activeProject } = useProject()
  const { profile } = useAuth()
  const { toasts, toast } = useToast()

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [suppliers, setSuppliers] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(BLANK)
  const [formTab, setFormTab] = useState('details')
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterSupplier, setFilterSupplier] = useState('')

  const canEdit = ['Admin', 'PM', 'Document Control', 'Manager'].includes(profile?.role)

  useEffect(() => {
    if (!activeProject) return
    loadData()
    supplierService.dropdown().then(setSuppliers)
  }, [activeProject])

  async function loadData() {
    if (!activeProject) return
    setLoading(true)
    const { data, error } = await supabase
      .from('mars')
      .select('*')
      .eq('project_code', activeProject.project_code)
      .order('created_at', { ascending: true })
    if (!error && data) setItems(data)
    else setItems([])
    setLoading(false)
  }

  function openNew() {
    setEditItem(null)
    setForm({ ...BLANK, submission_history: [] })
    setFormTab('details')
    setShowForm(true)
  }

  function openEdit(item) {
    setEditItem(item)
    setForm({
      ...item,
      submission_history: Array.isArray(item.submission_history) ? item.submission_history : [],
    })
    setFormTab('details')
    setShowForm(true)
  }

  function set(f, v) { setForm(p => ({ ...p, [f]: v })) }

  // ── Revision history helpers ───────────────────────────
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

  // ── Save ───────────────────────────────────────────────
  async function save() {
    if (!form.mar_ref_no || !form.mar_subject) {
      toast('MAR Ref No and Subject are required', 'err')
      return
    }
    const payload = { ...form, project_code: activeProject?.project_code, updated_at: new Date().toISOString() }
    if (editItem) {
      const { error } = await supabase.from('mars').update(payload).eq('id', editItem.id)
      if (error) { toast('Save failed — ' + error.message, 'err'); return }
      setItems(prev => prev.map(m => m.id === editItem.id ? { ...m, ...payload } : m))
      toast('MAR updated ✓', 'ok')
    } else {
      const { data, error } = await supabase.from('mars').insert(payload).select().single()
      if (error) { toast('Save failed — ' + error.message, 'err'); return }
      setItems(prev => [...prev, data || { ...payload, id: Date.now() }])
      toast(`MAR registered: ${form.mar_ref_no}`, 'ok')
    }
    setShowForm(false)
  }

  async function remove(id, ref) {
    if (!confirm(`Delete ${ref}?`)) return
    await supabase.from('mars').delete().eq('id', id)
    setItems(prev => prev.filter(m => m.id !== id))
    toast('Deleted', 'warn')
  }

  // ── Filters ────────────────────────────────────────────
  const filtered = items.filter(m => {
    if (filterStatus && m.current_status !== filterStatus) return false
    if (filterSupplier && m.supplier_name !== filterSupplier) return false
    if (search) {
      const q = search.toLowerCase()
      return [m.mar_ref_no, m.mar_subject, m.manufacturer_product, m.supplier_name].some(v => (v||'').toLowerCase().includes(q))
    }
    return true
  })

  // ── KPI counts ─────────────────────────────────────────
  const kpi = {
    total:   items.length,
    a:       items.filter(i => i.current_status === 'Approved').length,
    b:       items.filter(i => i.current_status === 'Approved with Comments').length,
    c:       items.filter(i => i.current_status === 'Revised and Resubmit').length,
    d:       items.filter(i => i.current_status === 'Rejected').length,
    ur:      items.filter(i => i.current_status === 'Under Review').length,
    pending: items.filter(i => i.current_status === 'Pending').length,
  }

  const supplierNames = [...new Set(items.map(m => m.supplier_name).filter(Boolean))]

  if (!activeProject) return (
    <div style={{ padding: 40, color: 'var(--text-muted)', fontSize: 14 }}>
      Select an active project to view the MAR Register.
    </div>
  )

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <div>
          <div className="page-title">Material Approval Register</div>
          <div className="page-subtitle">{activeProject.project_name} · MAR Log · {items.length} records</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => exportPDF(filtered, activeProject)}>
            <Printer size={13} /> Export PDF
          </button>
          {canEdit && (
            <button className="btn btn-primary" onClick={openNew}><Plus size={14} /> New MAR</button>
          )}
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Total',         value: kpi.total,   bg: 'var(--bg-surface)', color: 'var(--text-primary)' },
          { label: 'Under Review',  value: kpi.ur,      bg: '#DBEAFE', color: '#1E40AF' },
          { label: 'Approved (A)',  value: kpi.a,       bg: '#D1FAE5', color: '#065F46' },
          { label: 'w/ Comments (B)', value: kpi.b,     bg: '#FEF3C7', color: '#92400E' },
          { label: 'Resubmit (C)', value: kpi.c,        bg: '#FFEDD5', color: '#9A3412' },
          { label: 'Rejected (D)', value: kpi.d,        bg: '#FEE2E2', color: '#991B1B' },
          { label: 'Pending',      value: kpi.pending,  bg: '#F1F5F9', color: '#64748B' },
        ].map(k => (
          <div key={k.label} style={{ background: k.bg, border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 14px' }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: k.color, opacity: .75, marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="filter-bar" style={{ marginBottom: 12 }}>
        <input
          placeholder="Search ref no, subject, manufacturer, supplier…"
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ minWidth: 280 }}
        />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          {MAR_STATUS_KEYS.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={filterSupplier} onChange={e => setFilterSupplier(e.target.value)}>
          <option value="">All Suppliers</option>
          {supplierNames.map(s => <option key={s}>{s}</option>)}
        </select>
        {(search || filterStatus || filterSupplier) && (
          <button className="btn btn-ghost" style={{ fontSize: 12 }}
            onClick={() => { setSearch(''); setFilterStatus(''); setFilterSupplier('') }}>
            Clear
          </button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>{filtered.length} records</span>
      </div>

      {/* Register table */}
      <div className="table-wrap" style={{ overflowX: 'auto' }}>
        {loading ? (
          <div className="table-empty">Loading…</div>
        ) : !filtered.length ? (
          <div className="table-empty">No MARs found. Add the first one.</div>
        ) : (
          <table style={{ minWidth: 1100 }}>
            <thead>
              {/* Revision group header */}
              <tr>
                <th colSpan={10} style={{ background: 'var(--bg-base)', borderBottom: '1px solid var(--border)' }}></th>
                {[1,2,3,4,5].map(n => (
                  <th key={n} colSpan={3} style={{ background: '#1e293b', color: '#fff', fontSize: 10, fontWeight: 700, textAlign: 'center', padding: '4px 0', borderLeft: '2px solid var(--border)' }}>
                    REV. {n}
                  </th>
                ))}
                <th style={{ background: 'var(--bg-base)' }}></th>
              </tr>
              {/* Column header */}
              <tr>
                <th style={{ minWidth: 32 }}>Sr</th>
                <th style={{ minWidth: 110 }}>MAR Ref. No</th>
                <th style={{ minWidth: 180 }}>Subject</th>
                <th style={{ minWidth: 140 }}>Manufacturer / Product</th>
                <th style={{ minWidth: 120 }}>Supplier</th>
                <th style={{ minWidth: 90 }}>Submitted</th>
                <th style={{ minWidth: 90 }}>Responded</th>
                <th style={{ minWidth: 48 }}>Rev.</th>
                <th style={{ minWidth: 72 }}>Status</th>
                <th style={{ minWidth: 120 }}>Remarks</th>
                {[1,2,3,4,5].map(n => (
                  <>
                    <th key={`r${n}s`} style={{ minWidth: 78, fontSize: 10, borderLeft: '2px solid var(--border)', background: '#f8fafc' }}>Sub.</th>
                    <th key={`r${n}r`} style={{ minWidth: 78, fontSize: 10, background: '#f8fafc' }}>Ret.</th>
                    <th key={`r${n}c`} style={{ minWidth: 48, fontSize: 10, background: '#f8fafc' }}>Sta.</th>
                  </>
                ))}
                <th style={{ minWidth: 56 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m, idx) => {
                const hist = Array.isArray(m.submission_history) ? m.submission_history : []
                const s = MAR_STATUS[m.current_status] || MAR_STATUS['Pending']
                return (
                  <tr key={m.id}>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>{idx + 1}</td>
                    <td><span className="doc-number" style={{ fontSize: 11 }}>{m.mar_ref_no}</span></td>
                    <td style={{ fontSize: 12, maxWidth: 200 }}>{m.mar_subject}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{m.manufacturer_product || '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{m.supplier_name || '—'}</td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.submitted_date || '—'}</td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.responded_date || '—'}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--brand-accent)', textAlign: 'center' }}>{m.revision_no || '—'}</td>
                    <td><StatusBadge status={m.current_status} /></td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.remarks || '—'}</td>
                    {[1,2,3,4,5].map(n => {
                      const r = hist.find(h => String(h.rev_no) === `R${n}`) || {}
                      const rs = r.status ? Object.entries(MAR_STATUS).find(([, v]) => v.code === r.status) : null
                      return (
                        <>
                          <td key={`r${n}s`} style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', borderLeft: '2px solid var(--border)', background: '#f8fafc' }}>{r.submitted_date || '—'}</td>
                          <td key={`r${n}r`} style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', background: '#f8fafc' }}>{r.return_date || '—'}</td>
                          <td key={`r${n}c`} style={{ fontSize: 10, fontWeight: 700, textAlign: 'center', background: rs ? rs[1].bg : '#f8fafc', color: rs ? rs[1].text : 'var(--text-muted)' }}>
                            {r.status || '—'}
                          </td>
                        </>
                      )
                    })}
                    <td>
                      <div style={{ display: 'flex', gap: 3 }}>
                        {canEdit && (
                          <button className="btn btn-ghost" style={{ padding: '3px 6px' }} onClick={() => openEdit(m)}><Pencil size={12} /></button>
                        )}
                        {canEdit && (
                          <button className="btn btn-ghost" style={{ padding: '3px 6px', color: 'var(--status-rejected-text)' }} onClick={() => remove(m.id, m.mar_ref_no)}><Trash2 size={12} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Form Modal */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editItem ? `Edit — ${editItem.mar_ref_no}` : 'New Material Approval Request'}
        size="lg"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={save}>Save MAR</button>
          </>
        }
      >
        {/* Modal tab bar */}
        <div style={{ display: 'flex', gap: 4, padding: '0 24px', borderBottom: '1px solid var(--border)', marginBottom: 20, marginTop: -4 }}>
          {[{ id: 'details', label: 'MAR Details' }, { id: 'history', label: `Submission History (${form.submission_history?.length || 0})` }].map(t => (
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

          {/* ── Tab: Details ── */}
          {formTab === 'details' && (
            <div className="form-grid form-grid-2" style={{ gap: 14 }}>
              <div className="form-group">
                <label className="form-label required">MAR Ref. No</label>
                <input className="form-input" value={form.mar_ref_no}
                  onChange={e => set('mar_ref_no', e.target.value)}
                  placeholder="MAR-AI-001"
                  style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Current Revision</label>
                <input className="form-input" value={form.revision_no}
                  onChange={e => set('revision_no', e.target.value)}
                  placeholder="R0, R1, R2…"
                />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label required">MAR Subject</label>
                <input className="form-input" value={form.mar_subject}
                  onChange={e => set('mar_subject', e.target.value)}
                  placeholder="e.g. 8-32mm Reinforcement Steel"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Manufacturer / Product</label>
                <input className="form-input" value={form.manufacturer_product}
                  onChange={e => set('manufacturer_product', e.target.value)}
                  placeholder="Brand and product name"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Supplier</label>
                <input
                  className="form-input"
                  list="mar-supplier-list"
                  value={form.supplier_name}
                  onChange={e => set('supplier_name', e.target.value)}
                  placeholder="Select or type supplier name"
                />
                <datalist id="mar-supplier-list">
                  {suppliers.map(s => <option key={s.id} value={s.supplier_name} />)}
                </datalist>
              </div>
              <div className="form-group">
                <label className="form-label">Submitted Date</label>
                <input className="form-input" type="date" value={form.submitted_date}
                  onChange={e => set('submitted_date', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Responded Date</label>
                <input className="form-input" type="date" value={form.responded_date}
                  onChange={e => set('responded_date', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Current Status</label>
                <select className="form-select" value={form.current_status}
                  onChange={e => set('current_status', e.target.value)}>
                  {MAR_STATUS_KEYS.map(s => (
                    <option key={s} value={s}>{MAR_STATUS[s].code} — {s}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Remarks</label>
                <textarea className="form-textarea" rows={2} value={form.remarks}
                  onChange={e => set('remarks', e.target.value)} />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Comments / If Any</label>
                <textarea className="form-textarea" rows={2} value={form.comments}
                  onChange={e => set('comments', e.target.value)} />
              </div>
            </div>
          )}

          {/* ── Tab: Submission History ── */}
          {formTab === 'history' && (
            <div>
              {(!form.submission_history || form.submission_history.length === 0) ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '28px 0' }}>
                  No revision history yet. Add the first submission below.
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
                <Plus size={13} /> Add Revision Entry
              </button>
              <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-muted)' }}>
                Rev. status codes: <b>A</b> = Approved · <b>B</b> = Approved w/ Comments · <b>C</b> = Revised &amp; Resubmit · <b>D</b> = Rejected · <b>UR</b> = Under Review
              </div>
            </div>
          )}
        </div>
      </Modal>

      <ToastContainer toasts={toasts} />
    </div>
  )
}
