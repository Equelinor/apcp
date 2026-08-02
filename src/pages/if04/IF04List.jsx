import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { useProject } from '../../context/ProjectContext'
import { useAuth } from '../../context/AuthContext'
import { genSdNumber, formatRevisedSdNumber, getDisciplines, SUBMITTAL_STATUSES, RESPONSE_CODES, DRAWING_REVISIONS } from '../../config/docTypes'
import { useActivityFill } from '../../hooks/useActivityFill'
import { employeeService } from '../../services/employeeService'
import Badge from '../../components/Badge'
import Modal from '../../components/Modal'
import { useToast, ToastContainer } from '../../utils/toast'
import { Plus, ExternalLink, Pencil, Printer, Trash2 } from 'lucide-react'
import { today } from '../../utils/delay'
import { buildIF04, printForm, mergeProjectLogos, getSignatureForName } from '../../utils/printEngine'
import { AXION_LOGO } from '../../utils/axionLogo'

// SD Register revision round status codes — same A/B/C/D/UR convention as the MAC page
const REV_STATUS_CODES = ['', 'A', 'B', 'C', 'D', 'UR']

// Overdue turnaround — matches the project's own review-time convention (7 calendar days).
// Shop Drawing Register (former separate page) merged into this list 2026-08-02, same
// consolidation already done for MAC/IF05 and RFI/IF08 — the bulk register-PDF export
// and computed status now live here instead of a standalone SDRegister.jsx.
export const OVERDUE_DAYS = 7

// ── Status system — same A/B/C/D/UR convention as the MAC page, derived from
// IF04's existing response_code / status fields (not a new stored field) ──
export const SD_STATUS = {
  'Pending':                { code: 'PND', bg: '#F1F5F9', text: '#64748B', border: '#CBD5E1' },
  'Under Review':           { code: 'UR',  bg: '#DBEAFE', text: '#1E40AF', border: '#BFDBFE' },
  'Approved':               { code: 'A',   bg: '#D1FAE5', text: '#065F46', border: '#A7F3D0' },
  'Approved with Comments': { code: 'B',   bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' },
  'Revised and Resubmit':   { code: 'C',   bg: '#FFEDD5', text: '#9A3412', border: '#FED7AA' },
  'Rejected':               { code: 'D',   bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5' },
}
const SD_STATUS_KEYS = Object.keys(SD_STATUS)

export function computeSdStatus(d) {
  const code = (d.response_code || '').charAt(0)
  if (code === 'A') return 'Approved'
  if (code === 'B') return 'Approved with Comments'
  if (code === 'C') return 'Revised and Resubmit'
  if (code === 'D') return 'Rejected'
  if (d.status === 'Draft') return 'Pending'
  return 'Under Review'
}

// Overdue is a flag layered on top of "Under Review" — not one of the lettered codes,
// since A/B/C/D only apply once a response has actually been given.
export function isSdOverdue(d) {
  if (d.response_code) return false
  if (!d.submitted_date) return false
  const days = (Date.now() - new Date(d.submitted_date).getTime()) / 86400000
  return days > OVERDUE_DAYS
}

export function getLatestSdRevision(d) {
  const hist = Array.isArray(d.submission_history) ? d.submission_history : []
  return hist.length ? hist[hist.length - 1] : null
}

// The Shop Drawing list's "IF04 No." column shows the latest revision's number
// (e.g. AI-0632-SD-001a-R1) once a revision round exists, instead of the base
// number — same idea as MAC's displayMacNumber.
export function displaySdNumber(d) {
  const latest = getLatestSdRevision(d)
  return latest?.rev_no ? formatRevisedSdNumber(d.if04_number, latest.rev_no) : (d.if04_number || '')
}

const fmtRegDate = d => {
  if (!d) return '—'
  const dt = new Date(d)
  return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${String(dt.getFullYear()).slice(2)}`
}

// ── Bulk Shop Drawing Register PDF export (A3 landscape, all submittals on
// one sheet) — same layout convention as the MAC/RFI register exports.
// The "Under Review — Overdue" KPI box and "Reason for Overdue" column from
// the original standalone SDRegister.jsx are deliberately dropped here
// (2026-08-02, user request) — the space that freed up goes to widening the
// per-revision-round Submitted/Return date columns instead.
function exportSdRegisterPDF(items, project) {
  const genDate = new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })

  const withStatus = items.map(d => ({ ...d, _status: computeSdStatus(d), _overdue: isSdOverdue(d) }))
  const counts = {
    total:     withStatus.length,
    submitted: withStatus.filter(i => i.submitted_date).length,
    ur:        withStatus.filter(i => i._status === 'Under Review').length,
    a:         withStatus.filter(i => i._status === 'Approved').length,
    b:         withStatus.filter(i => i._status === 'Approved with Comments').length,
    c:         withStatus.filter(i => i._status === 'Revised and Resubmit').length,
    d:         withStatus.filter(i => i._status === 'Rejected').length,
    pending:   withStatus.filter(i => i._status === 'Pending').length,
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
    const s = SD_STATUS[d._status] || SD_STATUS['Pending']
    const bg = i % 2 === 0 ? '#fff' : '#f9fafb'

    const revCells = [1,2,3,4,5].map(n => {
      const r = hist.find(h => String(h.rev_no) === `R${n}`) || {}
      const rs = r.status ? Object.entries(SD_STATUS).find(([k]) =>
        SD_STATUS[k].code === r.status
      ) : null
      const rStyle = rs
        ? `background:${rs[1].bg};color:${rs[1].text};font-weight:700`
        : 'color:#bbb'
      return `
        <td style="border:0.4pt solid #ccc;padding:2.5pt 4pt;font-size:7.5pt;text-align:center;border-left:1.5pt solid #bbb;white-space:nowrap">${r.submitted_date ? fmtRegDate(r.submitted_date) : ''}</td>
        <td style="border:0.4pt solid #ccc;padding:2.5pt 4pt;font-size:7.5pt;text-align:center;white-space:nowrap">${r.return_date ? fmtRegDate(r.return_date) : ''}</td>
        <td style="border:0.4pt solid #ccc;padding:2.5pt 3pt;font-size:7pt;text-align:center;${rStyle}">${r.status || ''}</td>`
    }).join('')

    return `<tr style="background:${d._overdue ? '#FFF5F5' : bg}">
      <td style="border:0.4pt solid #ccc;padding:2.5pt 3pt;font-size:7.5pt;text-align:center">${i+1}</td>
      <td style="border:0.4pt solid #ccc;padding:2.5pt 4pt;font-size:7.5pt;font-family:monospace;font-weight:700">${d.if04_number || ''}</td>
      <td style="border:0.4pt solid #ccc;padding:2.5pt 4pt;font-size:7.5pt">${d.drawing_title || ''}</td>
      <td style="border:0.4pt solid #ccc;padding:2.5pt 4pt;font-size:7.5pt">${d.discipline || ''}</td>
      <td style="border:0.4pt solid #ccc;padding:2.5pt 4pt;font-size:7.5pt">${d.contractor_sub || ''}</td>
      <td style="border:0.4pt solid #ccc;padding:2.5pt 3pt;font-size:7pt;text-align:center">${d.submitted_date ? fmtRegDate(d.submitted_date) : ''}</td>
      <td style="border:0.4pt solid #ccc;padding:2.5pt 3pt;font-size:7pt;text-align:center">${d.response_date ? fmtRegDate(d.response_date) : ''}</td>
      <td style="border:0.4pt solid #ccc;padding:2.5pt 3pt;font-size:7.5pt;font-weight:700;text-align:center">${d.revision || ''}</td>
      <td style="border:0.4pt solid #ccc;padding:2.5pt 3pt;font-size:8pt;font-weight:700;text-align:center;background:${s.bg};color:${s.text}">${s.code}</td>
      <td style="border:0.4pt solid #ccc;padding:2.5pt 4pt;font-size:7pt;color:#555">${d.remarks || ''}</td>
      ${revCells}
    </tr>`
  }).join('')

  const revHeaderCols = [1,2,3,4,5].map(n =>
    `<th colspan="3" style="border:0.5pt solid #aaa;padding:3pt;font-size:7pt;font-weight:700;background:#374151;color:#fff;text-align:center">SD REV. ${n}</th>`
  ).join('')

  // Sub./Ret. sub-columns widened using the space freed up by dropping the
  // Reason for Overdue column — Sta. stays narrow since it's just a 1-2 char code.
  const revSubCols = [1,2,3,4,5].map(() =>
    `<th style="border:0.4pt solid #ccc;padding:2pt;font-size:6.5pt;font-weight:700;background:#4b5563;color:#e5e7eb;text-align:center;white-space:nowrap;width:4.2%;border-left:1.5pt solid #888">Sub.</th>
     <th style="border:0.4pt solid #ccc;padding:2pt;font-size:6.5pt;font-weight:700;background:#4b5563;color:#e5e7eb;text-align:center;white-space:nowrap;width:4.2%">Ret.</th>
     <th style="border:0.4pt solid #ccc;padding:2pt;font-size:6.5pt;font-weight:700;background:#4b5563;color:#e5e7eb;text-align:center;width:1.6%">Sta.</th>`
  ).join('')

  const legendItems = [
    ['A','Approved','#D1FAE5','#065F46'],
    ['B','Approved with Comments','#FEF3C7','#92400E'],
    ['C','Revised and Resubmit','#FFEDD5','#9A3412'],
    ['D','Rejected','#FEE2E2','#991B1B'],
    ['UR','Under Review','#DBEAFE','#1E40AF'],
  ].map(([code,label,bg,color]) =>
    `<span style="display:inline-flex;align-items:center;gap:5pt;margin-right:12pt">
      <span style="display:inline-block;padding:2pt 6pt;background:${bg};color:${color};font-size:8pt;font-weight:700;border-radius:2pt">${code}</span>
      <span style="font-size:8pt;color:#333">${label}</span>
    </span>`
  ).join('')

  const summaryRows = [
    ['Total Submittals', counts.total, ''],
    ['Submitted', counts.submitted, ''],
    ['Under Review', counts.ur, '#1E40AF'],
    ['Approved (A)', counts.a, '#065F46'],
    ['Approved with Comments (B)', counts.b, '#92400E'],
    ['Revised & Resubmit (C)', counts.c, '#9A3412'],
    ['Rejected (D)', counts.d, '#991B1B'],
    ['Pending', counts.pending, '#64748B'],
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
<title>Shop Drawing Register — ${project?.project_name || ''}</title>
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
      <div style="font-size:13pt;font-weight:900;letter-spacing:.1em;text-transform:uppercase">Shop Drawing Log</div>
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

<!-- ═══ SHOP DRAWING REGISTER TABLE ═══ -->
<table>
  <thead>
    <tr>
      <th rowspan="2" style="border:0.5pt solid #aaa;padding:3pt;font-size:7pt;font-weight:700;background:#111827;color:#fff;text-align:center;width:1.2%">Sr.</th>
      <th rowspan="2" style="border:0.5pt solid #aaa;padding:3pt;font-size:7pt;font-weight:700;background:#111827;color:#fff;width:7%">SD Ref. No</th>
      <th rowspan="2" style="border:0.5pt solid #aaa;padding:3pt;font-size:7pt;font-weight:700;background:#111827;color:#fff;width:14%">SD Subject</th>
      <th rowspan="2" style="border:0.5pt solid #aaa;padding:3pt;font-size:7pt;font-weight:700;background:#111827;color:#fff;width:6%">Discipline</th>
      <th rowspan="2" style="border:0.5pt solid #aaa;padding:3pt;font-size:7pt;font-weight:700;background:#111827;color:#fff;width:8%">Contractor / Sub-Contractor</th>
      <th rowspan="2" style="border:0.5pt solid #aaa;padding:3pt;font-size:7pt;font-weight:700;background:#111827;color:#fff;width:4%">Sub.</th>
      <th rowspan="2" style="border:0.5pt solid #aaa;padding:3pt;font-size:7pt;font-weight:700;background:#111827;color:#fff;width:4%">Ret.</th>
      <th rowspan="2" style="border:0.5pt solid #aaa;padding:3pt;font-size:7pt;font-weight:700;background:#111827;color:#fff;width:3%">Rev.</th>
      <th rowspan="2" style="border:0.5pt solid #aaa;padding:3pt;font-size:7pt;font-weight:700;background:#111827;color:#fff;width:2.5%">Sta.</th>
      <th rowspan="2" style="border:0.5pt solid #aaa;padding:3pt;font-size:7pt;font-weight:700;background:#111827;color:#fff;width:6%">Remarks</th>
      ${revHeaderCols}
    </tr>
    <tr>${revSubCols}</tr>
  </thead>
  <tbody>
    ${tableRows || '<tr><td colspan="25" style="text-align:center;padding:14pt;color:#aaa;font-size:8pt">No shop drawing submittals for this project</td></tr>'}
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
  if04_number: '',
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

  // Suggests the next SD No. from the highest existing numeric sequence for this
  // project — parses just the leading digits so lettered variants (001a/001b)
  // don't confuse it into skipping numbers the way counting rows would. Same
  // approach as MAC's suggestNextMacNumber.
  function suggestNextSdNumber() {
    const nums = items
      .filter(d => d.project_code === activeProject.project_code)
      .map(d => {
        const m = String(d.if04_number || '').match(/SD-(\d+)/i)
        return m ? parseInt(m[1], 10) : 0
      })
    const nextSeq = (nums.length ? Math.max(...nums) : 0) + 1
    return genSdNumber(activeProject.project_number, nextSeq)
  }

  function openNew() {
    setEditItem(null)
    setForm({ ...BLANK, if04_number: suggestNextSdNumber(), consultant: activeProject.consultant || '', client: activeProject.client || '' })
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
    if (!form.if04_number?.trim()) { toast('SD No. required', 'err'); return }
    if (!form.drawing_title && !form.drawing_number) { toast('Drawing number or title required', 'err'); return }
    const payload = { ...form, if04_number: form.if04_number.trim() }
    if (editItem) {
      const { error } = await supabase.from('if04').update(payload).eq('id', editItem.id)
      if (error) { toast('Save failed — ' + (error.code === '23505' ? 'that SD No. is already used on this project' : error.message), 'err'); return }
      setItems(prev => prev.map(d => d.id === editItem.id ? { ...d, ...payload } : d))
      toast('Updated ✓', 'ok')
    } else {
      const item = { ...payload, project_code: activeProject.project_code }
      const { data, error } = await supabase.from('if04').insert(item).select().single()
      if (error) { toast('Save failed — ' + (error.code === '23505' ? 'that SD No. is already used on this project' : error.message), 'err'); return }
      setItems(prev => [data || { ...item, id: Date.now() }, ...prev])
      toast(`Shop Drawing Submittal created: ${item.if04_number}`, 'ok')
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

  // ── KPI summary — same categories as the Export Register PDF's own summary ──
  const withSdStatus = items.map(d => computeSdStatus(d))
  const kpi = {
    total:   withSdStatus.length,
    ur:      withSdStatus.filter(s => s === 'Under Review').length,
    a:       withSdStatus.filter(s => s === 'Approved').length,
    b:       withSdStatus.filter(s => s === 'Approved with Comments').length,
    c:       withSdStatus.filter(s => s === 'Revised and Resubmit').length,
    d:       withSdStatus.filter(s => s === 'Rejected').length,
    pending: withSdStatus.filter(s => s === 'Pending').length,
    overdue: items.filter(d => isSdOverdue(d)).length,
  }

  const handlePrint = async (d) => {
    const signatureImg = await getSignatureForName(d.prepared_by)
    const printNumber = displaySdNumber(d)
    const latestRev = getLatestSdRevision(d)
    const printDate = latestRev?.submitted_date || d.date
    const priorDate = latestRev ? d.date : ''
    printForm(buildIF04({ ...mergeProjectLogos(d, activeProject), signatureImg, if04_number: printNumber, date: printDate, priorDate }), `Export for Transmittal — ${printNumber}`)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Shop Drawing Submittals</div>
          <div className="page-subtitle">{activeProject.project_name} · IF04 · {items.length} records</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => exportSdRegisterPDF(filtered, activeProject)}>
            <Printer size={13} /> Export Register (PDF)
          </button>
          <button className="btn btn-primary" onClick={openNew}><Plus size={14} /> New Submittal</button>
        </div>
      </div>

      {/* KPI strip — same categories as the Export Register PDF's own summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Total',           value: kpi.total,   bg: 'var(--bg-surface)', color: 'var(--text-primary)' },
          { label: 'Under Review',    value: kpi.ur,      bg: '#DBEAFE', color: '#1E40AF' },
          { label: 'Approved (A)',    value: kpi.a,       bg: '#D1FAE5', color: '#065F46' },
          { label: 'w/ Comments (B)', value: kpi.b,       bg: '#FEF3C7', color: '#92400E' },
          { label: 'Resubmit (C)',    value: kpi.c,       bg: '#FFEDD5', color: '#9A3412' },
          { label: 'Rejected (D)',    value: kpi.d,       bg: '#FEE2E2', color: '#991B1B' },
          { label: 'Pending',         value: kpi.pending, bg: '#F1F5F9', color: '#64748B' },
          { label: `Overdue (>${OVERDUE_DAYS}d)`, value: kpi.overdue, bg: '#FEE2E2', color: '#991B1B' },
        ].map(k => (
          <div key={k.label} style={{ background: k.bg, border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 14px' }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: k.color, opacity: .75, marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: k.color }}>{k.value}</div>
          </div>
        ))}
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
                  <td><span className="doc-number">{displaySdNumber(d)}</span></td>
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
                    <button className="btn btn-ghost" style={{ padding: '3px 6px' }} title="Export for Transmittal" onClick={() => handlePrint(d)}><Printer size={12} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editItem ? `Edit — ${displaySdNumber(editItem)}` : 'New Shop Drawing Submittal'} size="lg"
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
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label required">SD No. <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 11 }}>(auto-suggested, editable — e.g. append a/b/c for split submissions)</span></label>
            <input className="form-input" value={form.if04_number} onChange={e => set('if04_number', e.target.value)} style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }} />
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
                      {['Rev.', 'Revised SD No.', 'Submitted Date', 'Return Date', 'Status', ''].map(h => (
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
                        <td style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                          {formatRevisedSdNumber(form.if04_number, r.rev_no)}
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
