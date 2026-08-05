import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { useProject } from '../../context/ProjectContext'
import { useAuth } from '../../context/AuthContext'
import { genDsfNumber, formatRevisedDsfNumber, getDisciplines, RESPONSE_CODES, DRAWING_REVISIONS } from '../../config/docTypes'
import { employeeService } from '../../services/employeeService'
import Modal from '../../components/Modal'
import { useToast, ToastContainer } from '../../utils/toast'
import { Plus, Pencil, ExternalLink, Printer, Trash2 } from 'lucide-react'
import { today } from '../../utils/delay'
import { buildDSF, printForm, mergeProjectLogos, getSignatureForName } from '../../utils/printEngine'
import { AXION_LOGO } from '../../utils/axionLogo'

const DOC_CATEGORIES = ['Method Statement', 'ITP', 'Risk Assessment', 'Technical Submittal', 'Material Submittal', 'Shop Drawing', 'As-Built', 'Certificate', 'Letter', 'Transmittal', 'Minutes of Meeting', 'Report', 'Other']
// Resubmission-round status codes — same A/B/C/D/UR convention as MAC/SD/IR/DSF-on-Submittals
const REV_STATUS_CODES = ['', 'A', 'B', 'C', 'D', 'UR']

// ── Approval status — derived from response_code / status, not a stored field.
// Same pattern as MAC_APPROVAL_STATUS/computeMacApprovalStatus.
export const DSF_APPROVAL_STATUS = {
  'Draft':                    { code: 'DFT', bg: '#F1F5F9', text: '#64748B', border: '#CBD5E1' },
  'Under Review':             { code: 'UR',  bg: '#DBEAFE', text: '#1E40AF', border: '#BFDBFE' },
  'Approved':                 { code: 'A',   bg: '#D1FAE5', text: '#065F46', border: '#A7F3D0' },
  'Approved with Comments':   { code: 'B',   bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' },
  'Revised and Resubmit':     { code: 'C',   bg: '#FFEDD5', text: '#9A3412', border: '#FED7AA' },
  'Rejected':                 { code: 'D',   bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5' },
}

export function computeDsfApprovalStatus(d) {
  // Once a resubmission round exists, its own status (set in Revision History)
  // drives the overall status — the base record's response_code is frozen at
  // whatever it was on the original round.
  const latest = getLatestDsfRevision(d)
  if (latest) {
    const revCode = (latest.status || '').toUpperCase()
    if (revCode === 'A') return 'Approved'
    if (revCode === 'B') return 'Approved with Comments'
    if (revCode === 'C') return 'Revised and Resubmit'
    if (revCode === 'D') return 'Rejected'
    return 'Under Review'
  }
  const code = (d.response_code || '').charAt(0)
  if (code === 'A') return 'Approved'
  if (code === 'B') return 'Approved with Comments'
  if (code === 'C') return 'Revised and Resubmit'
  if (code === 'D') return 'Rejected'
  if (!d.submitted_date) return 'Draft'
  return 'Under Review'
}

export function getLatestDsfRevision(d) {
  const hist = Array.isArray(d.submission_history) ? d.submission_history : []
  return hist.length ? hist[hist.length - 1] : null
}

// The list's "DSF No." column shows the latest revision's number (e.g.
// AI-0632-DSF-003-R1) once a revision round exists, instead of the base
// number — same idea as displayMacNumber/displaySdNumber.
export function displayDsfNumber(d) {
  const latest = getLatestDsfRevision(d)
  return latest?.rev_no ? formatRevisedDsfNumber(d.doc_number, latest.rev_no) : (d.doc_number || '')
}

const REG_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const regFmtDate = d => {
  if (!d) return '—'
  const dt = new Date(d)
  return `${String(dt.getDate()).padStart(2,'0')}-${REG_MONTHS[dt.getMonth()]}-${String(dt.getFullYear()).slice(2)}`
}

// ── Bulk Document Submittal Register PDF export (A3 landscape, all DSFs on one sheet) ──
function exportDsfRegisterPDF(items, project) {
  const genDate = regFmtDate(new Date())

  const withStatus = items.map(d => ({ ...d, _status: computeDsfApprovalStatus(d) }))
  const counts = {
    total:    withStatus.length,
    ur:       withStatus.filter(i => i._status === 'Under Review').length,
    a:        withStatus.filter(i => i._status === 'Approved').length,
    b:        withStatus.filter(i => i._status === 'Approved with Comments').length,
    c:        withStatus.filter(i => i._status === 'Revised and Resubmit').length,
    d:        withStatus.filter(i => i._status === 'Rejected').length,
    draft:    withStatus.filter(i => i._status === 'Draft').length,
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

  const tableRows = withStatus.map((m, i) => {
    const hist = Array.isArray(m.submission_history) ? m.submission_history : []
    const s = DSF_APPROVAL_STATUS[m._status] || DSF_APPROVAL_STATUS['Draft']
    const bg = i % 2 === 0 ? '#fff' : '#f9fafb'
    const latest = getLatestDsfRevision(m)
    const dsfNo = displayDsfNumber(m)
    const subDate = latest?.submitted_date || m.submitted_date
    const respDate = latest?.return_date || m.response_date
    const revNo = latest?.rev_no || m.revision_no

    const revCells = [1,2,3,4,5].map(n => {
      const r = hist.find(h => String(h.rev_no) === `R${n}`) || {}
      const rs = r.status ? Object.entries(DSF_APPROVAL_STATUS).find(([k]) =>
        DSF_APPROVAL_STATUS[k].code === r.status
      ) : null
      const rStyle = rs
        ? `background:${rs[1].bg};color:${rs[1].text};font-weight:700`
        : 'color:#bbb'
      return `
        <td style="border:0.4pt solid #ccc;padding:4pt 6pt;font-size:8.5pt;text-align:center;white-space:nowrap;border-left:1.5pt solid #bbb">${r.submitted_date ? regFmtDate(r.submitted_date) : ''}</td>
        <td style="border:0.4pt solid #ccc;padding:4pt 6pt;font-size:8.5pt;text-align:center;white-space:nowrap">${r.return_date ? regFmtDate(r.return_date) : ''}</td>
        <td style="border:0.4pt solid #ccc;padding:4pt 5pt;font-size:8.5pt;text-align:center;${rStyle}">${r.status || ''}</td>`
    }).join('')

    return `<tr style="background:${bg}">
      <td style="border:0.4pt solid #ccc;padding:5pt 6pt;font-size:9.5pt;text-align:center">${i+1}</td>
      <td style="border:0.4pt solid #ccc;padding:5pt 7pt;font-size:9.5pt;font-family:monospace;font-weight:700;white-space:nowrap">${dsfNo}</td>
      <td style="border:0.4pt solid #ccc;padding:5pt 7pt;font-size:9.5pt">${m.title || ''}</td>
      <td style="border:0.4pt solid #ccc;padding:5pt 7pt;font-size:9.5pt">${m.category || ''}</td>
      <td style="border:0.4pt solid #ccc;padding:5pt 6pt;font-size:9pt;text-align:center;white-space:nowrap">${subDate ? regFmtDate(subDate) : ''}</td>
      <td style="border:0.4pt solid #ccc;padding:5pt 6pt;font-size:9pt;text-align:center;white-space:nowrap">${respDate ? regFmtDate(respDate) : ''}</td>
      <td style="border:0.4pt solid #ccc;padding:5pt 6pt;font-size:9.5pt;font-weight:700;text-align:center">${revNo || ''}</td>
      <td style="border:0.4pt solid #ccc;padding:5pt 6pt;font-size:10pt;font-weight:700;text-align:center;background:${s.bg};color:${s.text}">${s.code}</td>
      ${revCells}
    </tr>`
  }).join('')

  const revHeaderCols = [1,2,3,4,5].map(n =>
    `<th colspan="3" style="border:0.5pt solid #aaa;padding:4pt;font-size:8.5pt;font-weight:700;background:#374151;color:#fff;text-align:center">Rev.${String(n).padStart(2,'0')}</th>`
  ).join('')

  const revSubCols = [1,2,3,4,5].map(() =>
    `<th style="border:0.4pt solid #ccc;padding:3pt;font-size:8pt;font-weight:700;background:#4b5563;color:#e5e7eb;text-align:center;white-space:nowrap;width:3.8%;border-left:1.5pt solid #888">Sub.</th>
     <th style="border:0.4pt solid #ccc;padding:3pt;font-size:8pt;font-weight:700;background:#4b5563;color:#e5e7eb;text-align:center;white-space:nowrap;width:3.8%">Ret.</th>
     <th style="border:0.4pt solid #ccc;padding:3pt;font-size:8pt;font-weight:700;background:#4b5563;color:#e5e7eb;text-align:center;width:1.6%">Sta.</th>`
  ).join('')

  const legendItems = [
    ['A','Approved','#D1FAE5','#065F46'],
    ['B','Approved with Comments','#FEF3C7','#92400E'],
    ['C','Revised and Resubmit','#FFEDD5','#9A3412'],
    ['D','Rejected','#FEE2E2','#991B1B'],
    ['UR','Under Review','#DBEAFE','#1E40AF'],
    ['DFT','Draft','#F1F5F9','#64748B'],
  ].map(([code,label,bg,color]) =>
    `<span style="display:inline-flex;align-items:center;gap:5pt;margin-right:12pt">
      <span style="display:inline-block;padding:2pt 6pt;background:${bg};color:${color};font-size:8pt;font-weight:700;border-radius:2pt">${code}</span>
      <span style="font-size:8pt;color:#333">${label}</span>
    </span>`
  ).join('')

  const summaryRows = [
    ['Total DSFs', counts.total, ''],
    ['Under Review', counts.ur, '#1E40AF'],
    ['Approved (A)', counts.a, '#065F46'],
    ['Approved with Comments (B)', counts.b, '#92400E'],
    ['Revised & Resubmit (C)', counts.c, '#9A3412'],
    ['Rejected (D)', counts.d, '#991B1B'],
    ['Draft', counts.draft, '#64748B'],
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
<title>Document Submittal Register — ${project?.project_name || ''}</title>
<style>
  @page { size: A3 landscape; margin: 8mm 10mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 9pt; margin: 0; color: #000; }
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
      <div style="font-size:13pt;font-weight:900;letter-spacing:.1em;text-transform:uppercase">Document Submittal Register</div>
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

<!-- ═══ DSF REGISTER TABLE ═══ -->
<table>
  <thead>
    <tr>
      <th rowspan="2" style="border:0.5pt solid #aaa;padding:5pt;font-size:8.5pt;font-weight:700;background:#111827;color:#fff;text-align:center;width:1.5%">Sr.</th>
      <th rowspan="2" style="border:0.5pt solid #aaa;padding:5pt;font-size:8.5pt;font-weight:700;background:#111827;color:#fff;width:7%;white-space:nowrap">DSF No.</th>
      <th rowspan="2" style="border:0.5pt solid #aaa;padding:5pt;font-size:8.5pt;font-weight:700;background:#111827;color:#fff;width:19%">Title</th>
      <th rowspan="2" style="border:0.5pt solid #aaa;padding:5pt;font-size:8.5pt;font-weight:700;background:#111827;color:#fff;width:10%">Category</th>
      <th rowspan="2" style="border:0.5pt solid #aaa;padding:5pt;font-size:8.5pt;font-weight:700;background:#111827;color:#fff;width:5%;white-space:nowrap">Sub. Date</th>
      <th rowspan="2" style="border:0.5pt solid #aaa;padding:5pt;font-size:8.5pt;font-weight:700;background:#111827;color:#fff;width:5%;white-space:nowrap">Ret. Date</th>
      <th rowspan="2" style="border:0.5pt solid #aaa;padding:5pt;font-size:8.5pt;font-weight:700;background:#111827;color:#fff;width:3%">Rev.</th>
      <th rowspan="2" style="border:0.5pt solid #aaa;padding:5pt;font-size:8.5pt;font-weight:700;background:#111827;color:#fff;width:3.5%">Sta.</th>
      ${revHeaderCols}
    </tr>
    <tr>${revSubCols}</tr>
  </thead>
  <tbody>
    ${tableRows || '<tr><td colspan="23" style="text-align:center;padding:16pt;color:#aaa;font-size:9pt">No document submittals for this project</td></tr>'}
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
  doc_number: '',
  title: '', category: 'Technical Submittal', discipline: '',
  date: today(), prepared_by: '', activity_id: '', activity_name: '',
  ref_number: '', addressed_to: 'Consultant',
  // Left blank, not today() — an empty submitted_date is how the Register
  // tells Draft (not yet submitted) apart from Under Review, same as MAC.
  submitted_date: '', response_date: '', response_code: '',
  status: 'Draft', remarks: '', consultant_remarks: '', drive_link: '', copies: 1,
  revision_no: 'R0', submission_history: [],
  // Optional drawings referenced by/attached to this submittal — same
  // repeatable-list pattern as Shop Drawing's additional_drawings.
  additional_drawings: [],
}

const SEED = [
  { id: 1, doc_number: 'DOC-ANT-2025-00001', title: 'Method Statement — Foundation Works', category: 'Method Statement', discipline: 'Civil / Structural', date: '2025-01-12', prepared_by: 'Ahmed Al-Rashid', activity_id: 'A1010', activity_name: 'Basement Foundation Pour', status: 'Approved', response_code: 'A — Approved', submitted_date: '2025-01-12', response_date: '2025-01-18', remarks: '', drive_link: '', project_code: 'ANT' },
  { id: 2, doc_number: 'DOC-ANT-2025-00002', title: 'ITP — Concrete Works', category: 'ITP', discipline: 'Civil / Structural', date: '2025-01-15', prepared_by: 'Sara Qureshi', activity_id: 'A1210', activity_name: 'GF Column Reinforcement', status: 'Submitted', submitted_date: '2025-01-15', remarks: 'Awaiting consultant approval', drive_link: '', project_code: 'ANT' },
  { id: 3, doc_number: 'DOC-MRS-2025-00001', title: 'Risk Assessment — Waterproofing', category: 'Risk Assessment', discipline: 'Architectural', date: '2025-01-20', prepared_by: 'Khalid Mansoor', activity_id: 'B2030', activity_name: 'Basement Waterproofing L3', status: 'Draft', remarks: '', drive_link: '', project_code: 'MRS' },
]

export default function DocumentRegister() {
  const { activeProject } = useProject()
  const { profile } = useAuth()
  const { toasts, toast } = useToast()

  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [employees, setEmployees] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(BLANK)
  const [formTab, setFormTab] = useState('details')
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [disciplines, setDisciplines] = useState([])

  useEffect(() => {
    setDisciplines(getDisciplines(activeProject.project_code))
    loadData()
    employeeService.dropdown().then(setEmployees)
  }, [activeProject])

  async function loadData() {
    setLoading(true)
    const { data, error } = await supabase.from('documents').select('*').eq('project_code', activeProject.project_code).order('doc_number', { ascending: true })
    if (error || !data?.length) setDocs(SEED.filter(d => d.project_code === activeProject.project_code))
    else setDocs(data)
    setLoading(false)
  }

  // Suggests the next DSF No. from the highest existing numeric sequence for
  // this project — same approach as suggestNextMacNumber/suggestNextSdNumber.
  function suggestNextDsfNumber() {
    const nums = docs
      .filter(d => d.project_code === activeProject.project_code)
      .map(d => {
        const m = String(d.doc_number || '').match(/DSF-(\d+)/i)
        return m ? parseInt(m[1], 10) : 0
      })
    const nextSeq = (nums.length ? Math.max(...nums) : 0) + 1
    return genDsfNumber(activeProject.project_number, nextSeq)
  }

  function openNew() { setEditItem(null); setForm({ ...BLANK, doc_number: suggestNextDsfNumber(), discipline: disciplines[0] || '' }); setFormTab('details'); setShowForm(true) }
  function openEdit(item) {
    setEditItem(item)
    setForm({
      ...item,
      submission_history: Array.isArray(item.submission_history) ? item.submission_history : [],
      additional_drawings: Array.isArray(item.additional_drawings) ? item.additional_drawings : [],
    })
    setFormTab('details')
    setShowForm(true)
  }
  function set(f, v) { setForm(p => ({ ...p, [f]: v })) }

  // ── Revision history helpers (resubmission rounds — feeds the Export Register PDF below) ──
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

  // ── Additional drawings helpers — same pattern as Shop Drawing's addDrawing/setDrawing/removeDrawing ──
  function addDrawing() {
    setForm(p => ({ ...p, additional_drawings: [...(p.additional_drawings || []), { drawing_number: '', drawing_title: '', revision: 'Rev 00' }] }))
  }
  function setDrawing(i, field, val) {
    setForm(p => {
      const list = [...(p.additional_drawings || [])]
      list[i] = { ...list[i], [field]: val }
      return { ...p, additional_drawings: list }
    })
  }
  function removeDrawing(i) {
    setForm(p => ({ ...p, additional_drawings: (p.additional_drawings || []).filter((_, idx) => idx !== i) }))
  }

  // Once a DSF has left Draft, its content is locked for everyone except Admin — same rule as MAC.
  const isLocked = !!(editItem && editItem.status !== 'Draft' && profile?.role !== 'Admin')

  async function save() {
    if (!form.doc_number?.trim()) { toast('DSF No. required', 'err'); return }
    if (!form.title || !form.category) { toast('Title and category required', 'err'); return }
    const payload = { ...form, doc_number: form.doc_number.trim(), response_date: form.response_date || null, submitted_date: form.submitted_date || null }
    if (editItem) {
      const { error } = await supabase.from('documents').update(payload).eq('id', editItem.id)
      if (error) { toast('Save failed — ' + (error.code === '23505' ? 'that DSF No. is already used on this project' : error.message), 'err'); return }
      setDocs(prev => prev.map(d => d.id === editItem.id ? { ...d, ...payload } : d))
      toast('Document updated ✓', 'ok')
    } else {
      const item = { ...payload, project_code: activeProject.project_code }
      const { data, error } = await supabase.from('documents').insert(item).select().single()
      if (error) { toast('Save failed — ' + (error.code === '23505' ? 'that DSF No. is already used on this project' : error.message), 'err'); return }
      setDocs(prev => [data, ...prev])
      toast(`Document Submittal created: ${item.doc_number}`, 'ok')
    }
    setShowForm(false)
  }

  const filtered = docs.filter(d => {
    if (filterCat && d.category !== filterCat) return false
    if (filterStatus && computeDsfApprovalStatus(d) !== filterStatus) return false
    if (search) {
      const q = search.toLowerCase()
      const extraDwgValues = (Array.isArray(d.additional_drawings) ? d.additional_drawings : []).flatMap(x => [x.drawing_number, x.drawing_title])
      return [d.doc_number, d.title, d.ref_number, d.activity_id, d.prepared_by, ...extraDwgValues].some(v => (v || '').toLowerCase().includes(q))
    }
    return true
  })

  // ── KPI summary — same categories as the Export Register PDF's own summary ──
  const withDsfStatus = docs.map(d => computeDsfApprovalStatus(d))
  const kpi = {
    total: withDsfStatus.length,
    ur:    withDsfStatus.filter(s => s === 'Under Review').length,
    a:     withDsfStatus.filter(s => s === 'Approved').length,
    b:     withDsfStatus.filter(s => s === 'Approved with Comments').length,
    c:     withDsfStatus.filter(s => s === 'Revised and Resubmit').length,
    d:     withDsfStatus.filter(s => s === 'Rejected').length,
    draft: withDsfStatus.filter(s => s === 'Draft').length,
  }

  const handlePrint = async (d) => {
    const signatureImg = await getSignatureForName(d.prepared_by)
    const printNumber = displayDsfNumber(d)
    const latestRev = getLatestDsfRevision(d)
    const printDate = latestRev?.submitted_date || d.date
    const priorDate = latestRev ? d.date : ''
    const drawings = (Array.isArray(d.additional_drawings) ? d.additional_drawings : [])
      .map(x => ({ no: x.drawing_number, title: x.drawing_title, rev: x.revision }))
    printForm(buildDSF({ ...mergeProjectLogos(d, activeProject), signatureImg, doc_number: printNumber, date: printDate, priorDate, drawings }), `Export for Transmittal — ${printNumber}`)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Document Register</div>
          <div className="page-subtitle">{activeProject.project_name} · DSF · {docs.length} documents</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => exportDsfRegisterPDF(filtered, activeProject)}>
            <Printer size={13} /> Export Register (PDF)
          </button>
          <button className="btn btn-primary" onClick={openNew}><Plus size={14} /> New Submittal</button>
        </div>
      </div>

      {/* KPI strip — same categories as the Export Register PDF's own summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Total',                       value: kpi.total, bg: 'var(--bg-surface)', color: 'var(--text-primary)' },
          { label: 'Under Review',                value: kpi.ur,    bg: '#DBEAFE', color: '#1E40AF' },
          { label: 'Approved (A)',                value: kpi.a,     bg: '#D1FAE5', color: '#065F46' },
          { label: 'Approved w/ Comments (B)',    value: kpi.b,     bg: '#FEF3C7', color: '#92400E' },
          { label: 'Revised & Resubmit (C)',      value: kpi.c,     bg: '#FFEDD5', color: '#9A3412' },
          { label: 'Rejected (D)',                value: kpi.d,     bg: '#FEE2E2', color: '#991B1B' },
          { label: 'Draft',                       value: kpi.draft, bg: '#F1F5F9', color: '#64748B' },
        ].map(k => (
          <div key={k.label} style={{ background: k.bg, border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 14px' }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: k.color, opacity: .75, lineHeight: 1.35, minHeight: 24, marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div className="filter-bar" style={{ marginBottom: 12 }}>
        <input placeholder="Search number, title, ref, activity…" value={search} onChange={e => setSearch(e.target.value)} />
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="">All Categories</option>
          {DOC_CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          {Object.keys(DSF_APPROVAL_STATUS).map(s => <option key={s}>{s}</option>)}
        </select>
        {(search || filterCat || filterStatus) && <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => { setSearch(''); setFilterCat(''); setFilterStatus('') }}>Clear</button>}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>{filtered.length} records</span>
      </div>

      <div className="table-wrap">
        {loading ? <div className="table-empty">Loading…</div> : !filtered.length ? <div className="table-empty">No documents found.</div> : (
          <table>
            <thead>
              <tr>
                <th>DSF No.</th>
                <th>Title</th>
                <th>Category</th>
                <th>Discipline</th>
                <th>Submitted</th>
                <th>Response</th>
                <th>Status</th>
                <th>Drive</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => (
                <tr key={d.id}>
                  <td><span className="doc-number" style={{ fontSize: 11 }}>{displayDsfNumber(d)}</span></td>
                  <td style={{ fontSize: 12, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {d.title}
                    {Array.isArray(d.additional_drawings) && d.additional_drawings.length > 0 && (
                      <span style={{ marginLeft: 5, fontSize: 10, color: 'var(--text-muted)' }}>+{d.additional_drawings.length} drawing{d.additional_drawings.length > 1 ? 's' : ''}</span>
                    )}
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{d.category}</td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.discipline || '—'}</td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{regFmtDate(d.submitted_date)}</td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{regFmtDate(d.response_date)}</td>
                  <td>{(() => {
                    const st = computeDsfApprovalStatus(d)
                    const s = DSF_APPROVAL_STATUS[st] || DSF_APPROVAL_STATUS['Draft']
                    return <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: s.bg, color: s.text, border: `1px solid ${s.border}` }}>{s.code}</span>
                  })()}</td>
                  <td>
                    {d.drive_link
                      ? <a href={d.drive_link} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ fontSize: 11, padding: '3px 8px' }}><ExternalLink size={11} /></a>
                      : <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>}
                  </td>
                  <td><button className="btn btn-ghost" style={{ padding: '3px 6px' }} onClick={() => openEdit(d)}><Pencil size={12} /></button>
                    <button className="btn btn-ghost" style={{ padding: '3px 6px' }} title="Export for Transmittal" onClick={() => handlePrint(d)}><Printer size={12} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editItem ? `Edit — ${editItem.doc_number}` : 'New Document Submittal'}
        size="lg"
        footer={<><button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button><button className="btn btn-primary" onClick={save}>Save</button></>}
      >
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

        {isLocked && (
          <div style={{ background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#92400E' }}>
            This submittal has left Draft — most fields are locked. Only Status, Response Code, Response Date, and Consultant Remarks can still be updated. Contact an Admin if something else needs correcting.
          </div>
        )}

        {formTab === 'details' && (
        <div>
        <div className="form-grid form-grid-2" style={{ gap: 14 }}>
          <div className="form-group">
            <label className="form-label required">DSF No. <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 11 }}>(auto-suggested, editable)</span></label>
            <input className="form-input" value={form.doc_number} disabled={isLocked} onChange={e => set('doc_number', e.target.value)} style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }} />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label required">Title</label>
            <input className="form-input" value={form.title} disabled={isLocked} onChange={e => set('title', e.target.value)} placeholder="Document title" />
          </div>
          <div className="form-group">
            <label className="form-label required">Category</label>
            <select className="form-select" value={form.category} disabled={isLocked} onChange={e => set('category', e.target.value)}>
              {DOC_CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Discipline</label>
            <select className="form-select" value={form.discipline} disabled={isLocked} onChange={e => set('discipline', e.target.value)}>
              <option value="">— Select —</option>
              {disciplines.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Reference Number</label>
            <input className="form-input" value={form.ref_number} disabled={isLocked} onChange={e => set('ref_number', e.target.value)} placeholder="MS-ANT-2025-001" />
          </div>
          <div className="form-group">
            <label className="form-label">Date</label>
            <input className="form-input" type="date" value={form.date} disabled={isLocked} onChange={e => set('date', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Prepared By</label>
            <select className="form-select" value={form.prepared_by} disabled={isLocked} onChange={e => set('prepared_by', e.target.value)}>
              <option value="">— Select —</option>
              {employees.map(e => <option key={e.id} value={e.full_name}>{e.full_name} — {e.designation}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Addressed To</label>
            <input className="form-input" value={form.addressed_to} disabled={isLocked} onChange={e => set('addressed_to', e.target.value)} placeholder="Consultant" />
          </div>
          <div className="form-group">
            <label className="form-label">Activity ID</label>
            <input className="form-input" value={form.activity_id} disabled={isLocked} onChange={e => set('activity_id', e.target.value)} placeholder="A1010" />
          </div>
          <div className="form-group">
            <label className="form-label">Activity Name</label>
            <input className="form-input" value={form.activity_name} disabled={isLocked} onChange={e => set('activity_name', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Submitted Date</label>
            <input className="form-input" type="date" value={form.submitted_date} disabled={isLocked} onChange={e => set('submitted_date', e.target.value)} />
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
            <label className="form-label">Current Revision</label>
            <input className="form-input" value={form.revision_no} disabled={isLocked} onChange={e => set('revision_no', e.target.value)} placeholder="R0, R1, R2…" />
          </div>
          <div className="form-group">
            <label className="form-label">Copies</label>
            <input className="form-input" type="number" min="1" value={form.copies} disabled={isLocked} onChange={e => set('copies', e.target.value)} />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Google Drive Link</label>
            <input className="form-input" value={form.drive_link} disabled={isLocked} onChange={e => set('drive_link', e.target.value)} placeholder="https://drive.google.com/…" />
          </div>
          <div className="form-group">
            <label className="form-label">Remarks</label>
            <textarea className="form-textarea" value={form.remarks} disabled={isLocked} onChange={e => set('remarks', e.target.value)} rows={2} />
          </div>
          <div className="form-group">
            <label className="form-label">Consultant Remarks</label>
            <textarea className="form-textarea" value={form.consultant_remarks} onChange={e => set('consultant_remarks', e.target.value)} rows={2} />
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label className="form-label" style={{ marginBottom: 0 }}>
              Additional Drawings <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 11 }}>(optional — drawings referenced by or attached to this submittal)</span>
            </label>
            <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={addDrawing} disabled={isLocked}><Plus size={12} /> Add Drawing</button>
          </div>
          {(form.additional_drawings || []).length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  {['Drawing Number', 'Drawing Title', 'Revision', ''].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '6px 10px', background: 'var(--bg-base)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {form.additional_drawings.map((dr, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '6px 10px' }}>
                      <input className="form-input" value={dr.drawing_number} disabled={isLocked} onChange={e => setDrawing(i, 'drawing_number', e.target.value)} placeholder="SD-STR-002" />
                    </td>
                    <td style={{ padding: '6px 10px' }}>
                      <input className="form-input" value={dr.drawing_title} disabled={isLocked} onChange={e => setDrawing(i, 'drawing_title', e.target.value)} />
                    </td>
                    <td style={{ padding: '6px 10px' }}>
                      <select className="form-select" value={dr.revision} disabled={isLocked} onChange={e => setDrawing(i, 'revision', e.target.value)} style={{ width: 100 }}>
                        {DRAWING_REVISIONS.map(r => <option key={r}>{r}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '6px 10px' }}>
                      <button className="btn btn-ghost" style={{ padding: '3px 6px', color: 'var(--status-rejected-text)' }} disabled={isLocked} onClick={() => removeDrawing(i)}><Trash2 size={12} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        </div>
        )}

        {/* ── Tab: Revision History (resubmission rounds — feeds the Export Register PDF) ── */}
        {formTab === 'history' && (
          <div>
            {(!form.submission_history || form.submission_history.length === 0) ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '28px 0' }}>
                No resubmission rounds yet. Add the first one below if this submittal was sent back for revision.
              </div>
            ) : (
              <div style={{ marginBottom: 16 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr>
                      {['Rev.', 'Revised DSF No.', 'Submitted Date', 'Return Date', 'Status', ''].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '6px 10px', background: 'var(--bg-base)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {form.submission_history.map((r, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '6px 10px' }}>
                          <input className="form-input" value={r.rev_no} disabled={isLocked} onChange={e => setRev(i, 'rev_no', e.target.value)}
                            style={{ width: 64, fontFamily: 'var(--font-mono)', fontWeight: 700 }} placeholder="R1" />
                        </td>
                        <td style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                          {formatRevisedDsfNumber(form.doc_number, r.rev_no)}
                        </td>
                        <td style={{ padding: '6px 10px' }}>
                          <input className="form-input" type="date" value={r.submitted_date} disabled={isLocked}
                            onChange={e => setRev(i, 'submitted_date', e.target.value)} style={{ width: 140 }} />
                        </td>
                        <td style={{ padding: '6px 10px' }}>
                          <input className="form-input" type="date" value={r.return_date} disabled={isLocked}
                            onChange={e => setRev(i, 'return_date', e.target.value)} style={{ width: 140 }} />
                        </td>
                        <td style={{ padding: '6px 10px' }}>
                          <select className="form-select" value={r.status} disabled={isLocked}
                            onChange={e => setRev(i, 'status', e.target.value)} style={{ width: 80 }}>
                            {REV_STATUS_CODES.map(c => <option key={c} value={c}>{c || '—'}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: '6px 10px' }}>
                          <button className="btn btn-ghost" style={{ padding: '3px 6px', color: 'var(--status-rejected-text)' }} disabled={isLocked}
                            onClick={() => removeRev(i)}><Trash2 size={12} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <button className="btn btn-secondary" onClick={addRev} disabled={isLocked}>
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
