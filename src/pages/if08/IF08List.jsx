import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { useProject } from '../../context/ProjectContext'
import { useAuth } from '../../context/AuthContext'
import { genRfiNumber } from '../../config/docTypes'
import { useActivityFill } from '../../hooks/useActivityFill'
import { employeeService } from '../../services/employeeService'
import Badge from '../../components/Badge'
import Modal from '../../components/Modal'
import { useToast, ToastContainer } from '../../utils/toast'
import { Plus, ExternalLink, Pencil , Printer, Trash2} from 'lucide-react'
import { today } from '../../utils/delay'
import { buildIF08, printForm, mergeProjectLogos, getSignatureForName } from '../../utils/printEngine'
import { AXION_LOGO } from '../../utils/axionLogo'

const RFI_STATUSES = ['Draft', 'Submitted', 'Under Review', 'Answered', 'Closed', 'Cancelled']
const RFI_PRIORITIES = ['Critical', 'High', 'Medium', 'Low']
const IMPACT_TYPES = ['No Impact', 'Time Impact', 'Cost Impact', 'Time & Cost Impact', 'Design Impact', 'TBD']
const RFI_DISCIPLINES = ['Civil', 'Structural', 'Architectural', 'MEP', 'Electrical', 'Mechanical', 'Plumbing', 'HVAC', 'Landscape', 'Interior', 'Other']
// Revision round status codes — feeds the register's own colour legend (see RFI_STATUS below)
const REV_STATUS_CODES = ['', 'OT', 'L', 'OD', 'X']

// ── Status system — derived, not stored (see computeRfiStatus). Exported so
// Dashboard.jsx can reuse the exact same derivation. RFI used to have a separate
// read-only "RFI Register" page duplicating this same if08 data — merged into
// this list 2026-07-27 (same consolidation already done for MAC/IF05): the
// bulk register-PDF export and computed status now live here instead.
export const RFI_STATUS = {
  'Under Review':     { code: 'UR', bg: '#DBEAFE', text: '#1E40AF', border: '#BFDBFE' },
  'Replied On-Time':  { code: 'OT', bg: '#D1FAE5', text: '#065F46', border: '#A7F3D0' },
  'Replied Late':     { code: 'L',  bg: '#FFEDD5', text: '#9A3412', border: '#FED7AA' },
  'Overdue':          { code: 'OD', bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5' },
  'Cancelled':        { code: 'X',  bg: '#F1F5F9', text: '#64748B', border: '#CBD5E1' },
}

// An RFI's status isn't a field on if08 — it's derived from required_response_date vs response_date,
// same convention agreed for the RFI Register: no fixed turnaround constant, each RFI's own required date decides it.
export function computeRfiStatus(d) {
  if (d.status === 'Cancelled') return 'Cancelled'
  if (!d.response_date) {
    if (d.required_response_date && new Date(d.required_response_date) < new Date()) return 'Overdue'
    return 'Under Review'
  }
  if (d.required_response_date && new Date(d.response_date) > new Date(d.required_response_date)) return 'Replied Late'
  return 'Replied On-Time'
}

// Delay in Days ("Overdue" column) — days overdue only (blank/null until the
// required response date has actually passed). For a still-open RFI this
// counts up from today; for one replied late it's the fixed gap between the
// reply and the due date.
export function computeDelayDays(d) {
  if (d.status === 'Cancelled' || !d.required_response_date) return null
  const dueDate = new Date(d.required_response_date)
  const endDate = d.response_date ? new Date(d.response_date) : new Date()
  const days = Math.floor((endDate - dueDate) / 86400000)
  return days > 0 ? days : null
}

// Display badge/legend is intentionally coarser than the real 5-value status —
// Overdue is surfaced via its own "Overdue" days column instead of a separate
// badge, and Replied On-Time/Late collapse into one "Replied" badge (the
// Overdue column still shows the actual lateness for a late reply).
const RFI_DISPLAY = {
  'Under Review': { code: 'UR', label: 'Under Review',        bg: '#DBEAFE', text: '#1E40AF', border: '#BFDBFE' },
  'Replied':      { code: 'R',  label: 'Replied',              bg: '#D1FAE5', text: '#065F46', border: '#A7F3D0' },
  'Cancelled':    { code: 'X',  label: 'Cancelled/Withdrawn', bg: '#F1F5F9', text: '#64748B', border: '#CBD5E1' },
}
function rfiDisplayBucket(status) {
  if (status === 'Cancelled') return 'Cancelled'
  if (status === 'Replied On-Time' || status === 'Replied Late') return 'Replied'
  return 'Under Review'
}

const fmtDate = d => {
  if (!d) return '—'
  const dt = new Date(d)
  return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${String(dt.getFullYear()).slice(2)}`
}

// ── Bulk RFI Register PDF export (A3 landscape, all RFIs on one sheet) —
// same layout convention as the MAC page's register export ───────────
function exportRfiRegisterPDF(items, project) {
  const genDate = new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })

  const withStatus = items.map(d => ({ ...d, _status: computeRfiStatus(d) }))
  // Summary buckets are intentionally coarser than the real per-record status:
  // Overdue folds into Under Review here (it still shows as its own status/badge
  // in the table's Sta. column, just not as its own summary line).
  const counts = {
    submitted: withStatus.filter(i => i.date).length,
    replied:   withStatus.filter(i => i._status === 'Replied On-Time' || i._status === 'Replied Late').length,
    ur:        withStatus.filter(i => i._status === 'Under Review' || i._status === 'Overdue').length,
    x:         withStatus.filter(i => i._status === 'Cancelled').length,
  }

  const logoCell = (logoSrc, name, role) => {
    const img = logoSrc
      ? `<img src="${logoSrc}" style="max-height:46pt;max-width:140pt;object-fit:contain;display:block">`
      : ''
    return `
      <div style="display:inline-flex;align-items:center;gap:10pt;justify-content:center">
        ${img}
        <div style="text-align:left">
          <div style="font-size:6pt;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#888;margin-bottom:3pt">${role}</div>
          <div style="font-size:9.5pt;font-weight:700;color:#111;max-width:150pt">${name || ''}</div>
        </div>
      </div>`
  }

  const tableRows = withStatus.map((d, i) => {
    const hist = Array.isArray(d.submission_history) ? d.submission_history : []
    const s = RFI_DISPLAY[rfiDisplayBucket(d._status)]
    const bg = i % 2 === 0 ? '#fff' : '#f9fafb'

    const revCells = [1,2,3,4,5].map(n => {
      const r = hist.find(h => String(h.rev_no) === `R${n}`) || {}
      const rs = r.status ? Object.entries(RFI_STATUS).find(([k]) =>
        RFI_STATUS[k].code === r.status
      ) : null
      const rStyle = rs
        ? `background:${rs[1].bg};color:${rs[1].text};font-weight:700`
        : 'color:#bbb'
      return `
        <td style="border:0.4pt solid #ccc;padding:2.5pt 3pt;font-size:7pt;text-align:center;border-left:1.5pt solid #bbb">${r.submitted_date ? fmtDate(r.submitted_date) : ''}</td>
        <td style="border:0.4pt solid #ccc;padding:2.5pt 3pt;font-size:7pt;text-align:center">${r.return_date ? fmtDate(r.return_date) : ''}</td>
        <td style="border:0.4pt solid #ccc;padding:2.5pt 3pt;font-size:7pt;text-align:center;${rStyle}">${r.status || ''}</td>`
    }).join('')

    return `<tr style="background:${bg}">
      <td style="border:0.4pt solid #ccc;padding:2.5pt 3pt;font-size:7.5pt;text-align:center">${i+1}</td>
      <td style="border:0.4pt solid #ccc;padding:2.5pt 4pt;font-size:7.5pt;font-family:monospace;font-weight:700">${d.rfi_number || ''}</td>
      <td style="border:0.4pt solid #ccc;padding:2.5pt 4pt;font-size:7.5pt">${d.subject || ''}</td>
      <td style="border:0.4pt solid #ccc;padding:2.5pt 4pt;font-size:7.5pt">${d.discipline || ''}</td>
      <td style="border:0.4pt solid #ccc;padding:2.5pt 4pt;font-size:7.5pt">${d.contractor_sub || ''}</td>
      <td style="border:0.4pt solid #ccc;padding:2.5pt 3pt;font-size:7pt;text-align:center">${d.date ? fmtDate(d.date) : ''}</td>
      <td style="border:0.4pt solid #ccc;padding:2.5pt 3pt;font-size:7pt;text-align:center">${d.response_date ? fmtDate(d.response_date) : ''}</td>
      <td style="border:0.4pt solid #ccc;padding:2.5pt 3pt;font-size:8pt;font-weight:700;text-align:center;background:${s.bg};color:${s.text}">${s.code}</td>
      <td style="border:0.4pt solid #ccc;padding:2.5pt 3pt;font-size:7.5pt;text-align:center;${computeDelayDays(d) ? 'color:#991B1B;font-weight:700' : 'color:#bbb'}">${computeDelayDays(d) ?? '—'}</td>
      <td style="border:0.4pt solid #ccc;padding:2.5pt 4pt;font-size:7pt;color:#555">${d.remarks || ''}</td>
      ${revCells}
    </tr>`
  }).join('')

  const revHeaderCols = [1,2,3,4,5].map(n =>
    `<th colspan="3" style="border:0.5pt solid #aaa;padding:3pt;font-size:7pt;font-weight:700;background:#374151;color:#fff;text-align:center">CRFI REV. ${n}</th>`
  ).join('')

  const revSubCols = [1,2,3,4,5].map(() =>
    `<th style="border:0.4pt solid #ccc;padding:2pt;font-size:6.5pt;font-weight:700;background:#4b5563;color:#e5e7eb;text-align:center;border-left:1.5pt solid #888">Sub.</th>
     <th style="border:0.4pt solid #ccc;padding:2pt;font-size:6.5pt;font-weight:700;background:#4b5563;color:#e5e7eb;text-align:center">Rep.</th>
     <th style="border:0.4pt solid #ccc;padding:2pt;font-size:6.5pt;font-weight:700;background:#4b5563;color:#e5e7eb;text-align:center">Sta.</th>`
  ).join('')

  const legendItems = [
    ['UR','Under Review','#DBEAFE','#1E40AF'],
    ['R','Replied','#D1FAE5','#065F46'],
    ['X','Cancelled/Withdrawn','#F1F5F9','#64748B'],
  ].map(([code,label,bg,color]) =>
    `<span style="display:inline-flex;align-items:center;gap:5pt;margin-right:12pt">
      <span style="display:inline-block;padding:2pt 6pt;background:${bg};color:${color};font-size:8pt;font-weight:700;border-radius:2pt">${code}</span>
      <span style="font-size:8pt;color:#333">${label}</span>
    </span>`
  ).join('')

  const summaryRows = [
    ['Submitted', counts.submitted, ''],
    ['Replied', counts.replied, '#065F46'],
    ['Under Review', counts.ur, '#1E40AF'],
    ['Cancelled', counts.x, '#64748B'],
  ].map(([l,v,c]) =>
    `<tr>
      <td style="font-size:8pt;padding:2pt 0;color:#444">${l}</td>
      <td style="font-size:8.5pt;font-weight:700;padding:2pt 0;text-align:right;color:${c||'#111'}">${v}</td>
    </tr>`
  ).join('')

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>RFI Register — ${project?.project_name || ''}</title>
<style>
  @page { size: A3 landscape; margin: 8mm 10mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 7.5pt; margin: 0; color: #000; }
  table { border-collapse: collapse; width: 100%; }
  @media print { thead { display: table-header-group; } tr { page-break-inside: avoid; } }
</style>
</head>
<body>

<!-- ═══ THREE-COMPANY HEADER ═══ -->
<table style="margin-bottom:0;border:1pt solid #1a1a2e">
  <tr>
    <td style="width:33.3%;border-right:1pt solid #ccc;padding:8pt 12pt;vertical-align:middle;text-align:center">
      ${logoCell(project?.client_logo, project?.client, 'Client / Employer')}
    </td>
    <td style="width:33.4%;border-right:1pt solid #ccc;padding:8pt 12pt;vertical-align:middle;text-align:center;background:#fafafa">
      ${logoCell(AXION_LOGO, project?.contractor || 'Axion Imagineering Construction Co. W.L.L.', 'Contractor')}
    </td>
    <td style="width:33.3%;padding:8pt 12pt;vertical-align:middle;text-align:center">
      ${logoCell(project?.consultant_logo, project?.consultant, 'Consultant')}
    </td>
  </tr>
</table>

<!-- ═══ TITLE BAND ═══ -->
<table style="margin-bottom:5pt;border:1pt solid #1a1a2e;border-top:none">
  <tr>
    <td style="padding:6pt 14pt;text-align:center;background:#111827;color:#fff">
      <div style="font-size:13pt;font-weight:900;letter-spacing:.1em;text-transform:uppercase">Request For Information Log</div>
      <div style="font-size:8pt;font-weight:600;margin-top:3pt;opacity:.85">
        ${project?.project_name || ''}&nbsp;
        ${project?.project_number ? `· ${project.project_number}` : ''}
        ${project?.contract_number ? `· ${project.contract_number}` : ''}
      </div>
    </td>
  </tr>
</table>

<!-- ═══ LOG INFO + SUMMARY + LEGEND ═══ -->
<table style="margin-bottom:5pt;border:0.5pt solid #ccc">
  <tr>
    <td style="width:25%;vertical-align:top;padding:6pt 10pt;border-right:0.5pt solid #ddd">
      <div style="font-size:7.5pt;font-weight:700;text-transform:uppercase;color:#888;margin-bottom:4pt;letter-spacing:.08em">Log Info</div>
      <table style="width:100%">
        <tr><td style="font-size:8pt;font-weight:700;color:#555;padding:2pt 0">Location</td><td style="font-size:8pt;padding:2pt 0">${project?.location || '—'}</td></tr>
        <tr><td style="font-size:8pt;font-weight:700;color:#555;padding:2pt 0">Contract No.</td><td style="font-size:8pt;padding:2pt 0">${project?.contract_number || '—'}</td></tr>
        <tr><td style="font-size:8pt;font-weight:700;color:#555;padding:2pt 0">Updated</td><td style="font-size:8pt;padding:2pt 0"><b>${genDate}</b></td></tr>
      </table>
    </td>
    <td style="width:35%;vertical-align:top;padding:6pt 10pt;border-right:0.5pt solid #ddd">
      <div style="font-size:7.5pt;font-weight:700;text-transform:uppercase;color:#888;margin-bottom:4pt;letter-spacing:.08em">Register Summary</div>
      <table style="width:100%">${summaryRows}</table>
    </td>
    <td style="width:40%;vertical-align:middle;padding:6pt 10pt">
      <div style="font-size:7.5pt;font-weight:700;text-transform:uppercase;color:#888;margin-bottom:6pt;letter-spacing:.08em">Status Legend</div>
      <div style="display:flex;flex-wrap:wrap;gap:4pt">${legendItems}</div>
    </td>
  </tr>
</table>

<!-- ═══ RFI REGISTER TABLE ═══ -->
<table>
  <thead>
    <tr>
      <th rowspan="2" style="border:0.5pt solid #aaa;padding:3pt;font-size:7pt;font-weight:700;background:#111827;color:#fff;text-align:center;width:1.2%">Sr.</th>
      <th rowspan="2" style="border:0.5pt solid #aaa;padding:3pt;font-size:7pt;font-weight:700;background:#111827;color:#fff;width:6.5%">RFI Ref. No</th>
      <th rowspan="2" style="border:0.5pt solid #aaa;padding:3pt;font-size:7pt;font-weight:700;background:#111827;color:#fff;width:13%">RFI Subject</th>
      <th rowspan="2" style="border:0.5pt solid #aaa;padding:3pt;font-size:7pt;font-weight:700;background:#111827;color:#fff;width:6%">Discipline</th>
      <th rowspan="2" style="border:0.5pt solid #aaa;padding:3pt;font-size:7pt;font-weight:700;background:#111827;color:#fff;width:8%">Contractor / Sub-Contractor</th>
      <th rowspan="2" style="border:0.5pt solid #aaa;padding:3pt;font-size:7pt;font-weight:700;background:#111827;color:#fff;width:3.5%">Sub.</th>
      <th rowspan="2" style="border:0.5pt solid #aaa;padding:3pt;font-size:7pt;font-weight:700;background:#111827;color:#fff;width:3.5%">Rep.</th>
      <th rowspan="2" style="border:0.5pt solid #aaa;padding:3pt;font-size:7pt;font-weight:700;background:#111827;color:#fff;width:2.5%">Sta.</th>
      <th rowspan="2" style="border:0.5pt solid #aaa;padding:3pt;font-size:7pt;font-weight:700;background:#111827;color:#fff;width:4%">Overdue</th>
      <th rowspan="2" style="border:0.5pt solid #aaa;padding:3pt;font-size:7pt;font-weight:700;background:#111827;color:#fff;width:6%">Remarks</th>
      ${revHeaderCols}
    </tr>
    <tr>${revSubCols}</tr>
  </thead>
  <tbody>
    ${tableRows || '<tr><td colspan="25" style="text-align:center;padding:14pt;color:#aaa;font-size:8pt">No RFI records for this project</td></tr>'}
  </tbody>
</table>

<div style="margin-top:5pt;padding-top:4pt;border-top:0.5pt solid #ddd;font-size:7pt;color:#aaa;text-align:center">
  Generated by APCP &nbsp;·&nbsp; ${genDate} &nbsp;·&nbsp; This is a controlled register — do not alter
</div>
</body>
</html>`

  const win = window.open('', '_blank', 'width=1400,height=900')
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 600)
}

const BLANK = {
  date: today(), subject: '', description: '', priority: 'Medium',
  activity_id: '', activity_name: '', wbs_code: '',
  mrf_number: '', drawing_ref: '', spec_ref: '',
  requested_by: '', addressed_to: '',
  required_response_date: '', response_date: '', response: '',
  impact: 'TBD', impact_description: '',
  cost_impact_yn: '', time_impact_yn: '',
  status: 'Draft', drive_link: '', remarks: '',
  discipline: '', contractor_sub: '', reason_for_overdue: '',
  submission_history: [],
}

const SEED = [
  { id: 1, rfi_number: 'IF08-ANT-2025-00001', date: '2025-01-20', project_code: 'ANT', subject: 'Clarification on Rebar Lap Length at Foundation', description: 'Please clarify lap length requirements for 16mm TMT rebar at pile cap junction as per structural drawings IFC-STR-001.', priority: 'High', activity_id: 'A1010', activity_name: 'Basement Foundation Pour', wbs_code: '1.1.2', mrf_number: 'MRF-ANT-2025-00001', drawing_ref: 'IFC-STR-001', spec_ref: 'Section 03 20 00', requested_by: 'Ahmed Al-Rashid', addressed_to: 'Structural Engineer', required_response_date: '2025-01-25', response_date: '2025-01-24', response: 'Lap length shall be 45d as per BS 8110. See attached sketch.', impact: 'No Impact', impact_description: '', status: 'Answered', drive_link: '', remarks: '' },
  { id: 2, rfi_number: 'IF08-MRS-2025-00001', date: '2025-01-28', project_code: 'MRS', subject: 'Waterproofing Membrane Overlap at Column Base', description: 'Clarification required on waterproofing membrane overlap detail at column base junction. No detail on IFC drawings.', priority: 'Critical', activity_id: 'B2030', activity_name: 'Basement Waterproofing L3', wbs_code: '2.1.3', mrf_number: 'MRF-MRS-2025-00001', drawing_ref: 'IFC-WP-001', spec_ref: '', requested_by: 'Khalid Mansoor', addressed_to: 'Architect', required_response_date: '2025-02-01', response_date: '', response: '', impact: 'TBD', impact_description: 'Work on hold pending clarification', status: 'Submitted', drive_link: '', remarks: '' },
]

export default function IF08List() {
  const { activeProject } = useProject()
  const { profile } = useAuth()
  const { toasts, toast } = useToast()

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(BLANK)
  const [formTab, setFormTab] = useState('details')
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [employees, setEmployees] = useState([])

  useEffect(() => { employeeService.dropdown().then(setEmployees) }, [])

  const { activityData } = useActivityFill(activeProject.project_code, form.activity_id, form.mrf_number)

  useEffect(() => {
    if (activityData && !editItem) {
      setForm(f => ({ ...f, activity_name: activityData.activity_name || f.activity_name, wbs_code: activityData.wbs_code || f.wbs_code }))
    }
  }, [activityData])

  useEffect(() => { loadData() }, [activeProject])

  async function loadData() {
    setLoading(true)
    const { data, error } = await supabase.from('if08').select('*').eq('project_code', activeProject.project_code).order('rfi_number', { ascending: false })
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

  // ── Revision history helpers (CRFI resubmission rounds — feeds RFI Register) ──
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

  // Next sequence from the highest existing trailing number, not a row count —
  // counting rows breaks the moment a number is ever edited/removed/skipped.
  function nextRfiSeq() {
    const nums = items.map(d => {
      const match = String(d.rfi_number || '').match(/-(\d+)$/)
      return match ? parseInt(match[1], 10) : 0
    })
    return (nums.length ? Math.max(...nums) : 0) + 1
  }

  // Empty string isn't valid for a date column — Postgres rejects it outright
  const DATE_FIELDS = ['date', 'required_response_date', 'response_date']
  function nullifyEmptyDates(data) {
    const out = { ...data }
    for (const f of DATE_FIELDS) if (out[f] === '') out[f] = null
    return out
  }

  async function save() {
    if (!form.subject) { toast('Subject required', 'err'); return }
    const payload = nullifyEmptyDates(form)
    if (editItem) {
      const { error } = await supabase.from('if08').update(payload).eq('id', editItem.id)
      if (error) { toast('Save failed — ' + error.message, 'err'); return }
      setItems(prev => prev.map(d => d.id === editItem.id ? { ...d, ...payload } : d))
      toast('RFI updated ✓', 'ok')
    } else {
      const rfi_number = genRfiNumber(activeProject.project_number, nextRfiSeq())
      const item = { ...payload, rfi_number, project_code: activeProject.project_code }
      const { data, error } = await supabase.from('if08').insert(item).select().single()
      if (error) { toast('Save failed — ' + error.message, 'err'); return }
      setItems(prev => [data, ...prev])
      toast(`RFI raised: ${rfi_number}`, 'ok')
    }
    setShowForm(false)
  }

  const filtered = items.filter(d => {
    if (filterStatus && computeRfiStatus(d) !== filterStatus) return false
    if (filterPriority && d.priority !== filterPriority) return false
    if (search) {
      const q = search.toLowerCase()
      return [d.rfi_number, d.subject, d.activity_id, d.mrf_number, d.requested_by].some(v => (v || '').toLowerCase().includes(q))
    }
    return true
  })

  const openRFIs = items.filter(d => ['Submitted', 'Under Review'].includes(d.status)).length

  // ── KPI summary — same coarser buckets as the register (Overdue folds into
  // Under Review here; it's still its own status/badge in the table itself) ──
  const withStatus = items.map(d => ({ ...d, _status: computeRfiStatus(d) }))
  const kpi = {
    submitted: withStatus.filter(i => i.date).length,
    replied:   withStatus.filter(i => i._status === 'Replied On-Time' || i._status === 'Replied Late').length,
    ur:        withStatus.filter(i => i._status === 'Under Review' || i._status === 'Overdue').length,
    x:         withStatus.filter(i => i._status === 'Cancelled').length,
  }

  // Prime Contractor signature (Axion's own requester) is digitally looked up like
  // MAC/IF04's preparer line — the Consultant/Client reply sections deliberately
  // stay signature-free, those belong to them, not Axion staff.
  const handlePrint = async (d) => {
    const signatureImg = await getSignatureForName(d.requested_by)
    printForm(buildIF08({ ...mergeProjectLogos(d, activeProject), signatureImg }), `Export for Transmittal — ${d.rfi_number}`)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Request For Information</div>
          <div className="page-subtitle">{activeProject.project_name} · IF08 · {items.length} records</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => exportRfiRegisterPDF(filtered, activeProject)}>
            <Printer size={13} /> Export Register (PDF)
          </button>
          <button className="btn btn-primary" onClick={openNew}><Plus size={14} /> New RFI</button>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Submitted',    value: kpi.submitted, bg: 'var(--bg-surface)', color: 'var(--text-primary)' },
          { label: 'Replied',      value: kpi.replied,   bg: '#D1FAE5', color: '#065F46' },
          { label: 'Under Review', value: kpi.ur,        bg: '#DBEAFE', color: '#1E40AF' },
          { label: 'Cancelled',    value: kpi.x,          bg: '#F1F5F9', color: '#64748B' },
        ].map(k => (
          <div key={k.label} style={{ background: k.bg, border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 14px' }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: k.color, opacity: .75, marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {openRFIs > 0 && (
        <div style={{ background: 'var(--status-pending-bg)', color: 'var(--status-pending-text)', border: '1px solid #fde68a', borderRadius: 'var(--radius)', padding: '9px 14px', marginBottom: 16, fontSize: 13, fontWeight: 600 }}>
          ⏳ {openRFIs} RFI{openRFIs > 1 ? 's' : ''} awaiting response
        </div>
      )}

      <div className="filter-bar" style={{ marginBottom: 12 }}>
        <input placeholder="Search RFI number, subject, activity…" value={search} onChange={e => setSearch(e.target.value)} />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          {Object.keys(RFI_STATUS).map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
          <option value="">All Priorities</option>
          {RFI_PRIORITIES.map(p => <option key={p}>{p}</option>)}
        </select>
        {(search || filterStatus || filterPriority) && <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => { setSearch(''); setFilterStatus(''); setFilterPriority('') }}>Clear</button>}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>{filtered.length} records</span>
      </div>

      <div className="table-wrap">
        {loading ? <div className="table-empty">Loading…</div> : !filtered.length ? <div className="table-empty">No RFIs found.</div> : (
          <table>
            <thead>
              <tr>
                <th>RFI No.</th>
                <th>Subject</th>
                <th>Priority</th>
                <th>Activity</th>
                <th>MRF</th>
                <th>Raised By</th>
                <th>Required By</th>
                <th>Response Date</th>
                <th>Impact</th>
                <th>Status</th>
                <th>Overdue</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => {
                const overdue = d.required_response_date && !d.response_date && new Date(d.required_response_date) < new Date()
                return (
                  <tr key={d.id} style={{ background: overdue ? '#FFF5F5' : undefined }}>
                    <td><span className="doc-number">{d.rfi_number}</span></td>
                    <td style={{ fontSize: 12, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={d.subject}>{d.subject}</td>
                    <td><Badge status={d.priority} /></td>
                    <td>{d.activity_id ? <span className="doc-number">{d.activity_id}</span> : <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>}</td>
                    <td>{d.mrf_number ? <span className="doc-number">{d.mrf_number}</span> : <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.requested_by}</td>
                    <td style={{ fontSize: 12, color: overdue ? 'var(--status-rejected-text)' : 'var(--text-muted)', fontWeight: overdue ? 700 : 400 }}>{d.required_response_date || '—'}{overdue ? ' ⚠️' : ''}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.response_date || '—'}</td>
                    <td style={{ fontSize: 11 }}>{d.impact || '—'}</td>
                    <td>{(() => {
                      const st = computeRfiStatus(d)
                      const s = RFI_DISPLAY[rfiDisplayBucket(st)]
                      return <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: s.bg, color: s.text, border: `1px solid ${s.border}` }}>{s.code}</span>
                    })()}</td>
                    <td style={{ fontSize: 12, fontWeight: computeDelayDays(d) ? 700 : 400, color: computeDelayDays(d) ? 'var(--status-rejected-text)' : 'var(--text-muted)', textAlign: 'center' }}>{computeDelayDays(d) ?? '—'}</td>
                    <td><button className="btn btn-ghost" style={{ padding: '3px 6px' }} onClick={() => openEdit(d)}><Pencil size={12} /></button>
                    <button className="btn btn-ghost" style={{ padding: '3px 6px' }} title="Print PDF" onClick={() => handlePrint(d)}><Printer size={12} /></button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editItem ? `Edit — ${editItem.rfi_number}` : 'New RFI'} size="lg"
        footer={<><button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button><button className="btn btn-primary" onClick={save}>Save</button></>}>

        {/* Modal tab bar */}
        <div style={{ display: 'flex', gap: 4, padding: '0 24px', borderBottom: '1px solid var(--border)', marginBottom: 20, marginTop: -4 }}>
          {[{ id: 'details', label: 'RFI Details' }, { id: 'history', label: `Revision History (${form.submission_history?.length || 0})` }].map(t => (
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

        {/* ── Tab: RFI Details ── */}
        {formTab === 'details' && (
        <div>
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label required">Subject</label>
            <input className="form-input" value={form.subject} onChange={e => set('subject', e.target.value)} placeholder="Brief subject of the RFI" />
          </div>

          <div className="form-grid form-grid-3" style={{ gap: 14, marginBottom: 14 }}>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input className="form-input" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="form-select" value={form.priority} onChange={e => set('priority', e.target.value)}>
                {RFI_PRIORITIES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Discipline</label>
              <select className="form-select" value={form.discipline} onChange={e => set('discipline', e.target.value)}>
                <option value="">— Select —</option>
                {RFI_DISCIPLINES.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Activity ID</label>
              <input className="form-input" value={form.activity_id} onChange={e => set('activity_id', e.target.value)} placeholder="A1010 — auto-fills below" />
            </div>
            <div className="form-group">
              <label className="form-label">Contractor / Sub-Contractor</label>
              <input className="form-input" value={form.contractor_sub} onChange={e => set('contractor_sub', e.target.value)} placeholder="e.g. Axion, or the sub-contractor raising this" />
            </div>
            <div className="form-group">
              <label className="form-label">Requested By</label>
              <select className="form-select" value={form.requested_by} onChange={e => set('requested_by', e.target.value)}>
                <option value="">— Select —</option>
                {employees.map(e => <option key={e.id} value={e.full_name}>{e.full_name} — {e.designation}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Addressed To</label>
              <input className="form-input" value={form.addressed_to} onChange={e => set('addressed_to', e.target.value)} placeholder="Consultant / Engineer" />
            </div>
            <div className="form-group">
              <label className="form-label">Required Response Date</label>
              <input className="form-input" type="date" value={form.required_response_date} onChange={e => set('required_response_date', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Drawing Ref</label>
              <input className="form-input" value={form.drawing_ref} onChange={e => set('drawing_ref', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Spec Ref</label>
              <input className="form-input" value={form.spec_ref} onChange={e => set('spec_ref', e.target.value)} />
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

          <div className="form-grid form-grid-2" style={{ gap: 14, marginBottom: 14 }}>
            <div className="form-group">
              <label className="form-label">Additional Cost Involved</label>
              <select className="form-select" value={form.cost_impact_yn} onChange={e => set('cost_impact_yn', e.target.value)}>
                <option value="">— Pending —</option>
                <option value="Y">Yes</option>
                <option value="N">No</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Additional Time Involved</label>
              <select className="form-select" value={form.time_impact_yn} onChange={e => set('time_impact_yn', e.target.value)}>
                <option value="">— Pending —</option>
                <option value="Y">Yes</option>
                <option value="N">No</option>
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label">Description / Query</label>
            <textarea className="form-textarea" value={form.description} onChange={e => set('description', e.target.value)} rows={3} placeholder="Detailed description of the query…" />
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 12 }}>Response</div>
            <div className="form-grid form-grid-3" style={{ gap: 14, marginBottom: 14 }}>
              <div className="form-group">
                <label className="form-label">Response Date</label>
                <input className="form-input" type="date" value={form.response_date} onChange={e => set('response_date', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Impact</label>
                <select className="form-select" value={form.impact} onChange={e => set('impact', e.target.value)}>
                  {IMPACT_TYPES.map(i => <option key={i}>{i}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
                  {RFI_STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label className="form-label">Google Drive Link</label>
              <input className="form-input" value={form.drive_link} onChange={e => set('drive_link', e.target.value)} placeholder="https://drive.google.com/…" />
            </div>
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label className="form-label">Response</label>
              <textarea className="form-textarea" value={form.response} onChange={e => set('response', e.target.value)} rows={3} placeholder="Consultant / Engineer response…" />
            </div>
          </div>
        </div>
        )}

        {/* ── Tab: Revision History (CRFI resubmission rounds — feeds RFI Register) ── */}
        {formTab === 'history' && (
          <div>
            {(!form.submission_history || form.submission_history.length === 0) ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '28px 0' }}>
                No resubmission rounds yet. Add the first one below if this RFI was sent back for more information.
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
              Rev. status codes: <b>OT</b> = Replied On-Time · <b>L</b> = Replied Late · <b>OD</b> = Overdue · <b>X</b> = Cancelled/Withdrawn
            </div>
          </div>
        )}

        </div>
      </Modal>

      <ToastContainer toasts={toasts} />
    </div>
  )
}
