import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { useProject } from '../../context/ProjectContext'
import { useToast, ToastContainer } from '../../utils/toast'
import { Printer } from 'lucide-react'
import { AXION_LOGO } from '../../utils/axionLogo'

// ── Status system — derived, not stored (see computeRfiStatus) ─────
export const RFI_STATUS = {
  'Under Review':     { code: 'UR', bg: '#DBEAFE', text: '#1E40AF', border: '#BFDBFE' },
  'Replied On-Time':  { code: 'OT', bg: '#D1FAE5', text: '#065F46', border: '#A7F3D0' },
  'Replied Late':     { code: 'L',  bg: '#FFEDD5', text: '#9A3412', border: '#FED7AA' },
  'Overdue':          { code: 'OD', bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5' },
  'Cancelled':        { code: 'X',  bg: '#F1F5F9', text: '#64748B', border: '#CBD5E1' },
}
const RFI_STATUS_KEYS = Object.keys(RFI_STATUS)

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

function StatusBadge({ status }) {
  const s = RFI_STATUS[status] || RFI_STATUS['Under Review']
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

const fmtDate = d => {
  if (!d) return '—'
  const dt = new Date(d)
  return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${String(dt.getFullYear()).slice(2)}`
}

// ── PDF export — same layout convention as the MAC page's register export ───────────
function exportPDF(items, project) {
  const genDate = new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })

  const withStatus = items.map(d => ({ ...d, _status: computeRfiStatus(d) }))
  const counts = {
    total:     withStatus.length,
    submitted: withStatus.filter(i => i.date).length,
    ur:        withStatus.filter(i => i._status === 'Under Review').length,
    ot:        withStatus.filter(i => i._status === 'Replied On-Time').length,
    l:         withStatus.filter(i => i._status === 'Replied Late').length,
    od:        withStatus.filter(i => i._status === 'Overdue').length,
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
    const s = RFI_STATUS[d._status] || RFI_STATUS['Under Review']
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
      <td style="border:0.4pt solid #ccc;padding:2.5pt 4pt;font-size:7pt;font-family:monospace;font-weight:700;color:#1E40AF">${d.mrf_number || ''}</td>
      <td style="border:0.4pt solid #ccc;padding:2.5pt 4pt;font-size:7pt;color:#555">${d.reason_for_overdue || ''}</td>
      <td style="border:0.4pt solid #ccc;padding:2.5pt 4pt;font-size:7pt;color:#555">${d.remarks || ''}</td>
      ${revCells}
    </tr>`
  }).join('')

  const revHeaderCols = [1,2,3,4,5].map(n =>
    `<th colspan="3" style="border:0.5pt solid #aaa;padding:3pt;font-size:7pt;font-weight:700;background:#374151;color:#fff;text-align:center">CRFI REV. ${n}</th>`
  ).join('')

  const revSubCols = [1,2,3,4,5].map(() =>
    `<th style="border:0.4pt solid #ccc;padding:2pt;font-size:6.5pt;font-weight:700;background:#4b5563;color:#e5e7eb;text-align:center;border-left:1.5pt solid #888">Sub.</th>
     <th style="border:0.4pt solid #ccc;padding:2pt;font-size:6.5pt;font-weight:700;background:#4b5563;color:#e5e7eb;text-align:center">Ret.</th>
     <th style="border:0.4pt solid #ccc;padding:2pt;font-size:6.5pt;font-weight:700;background:#4b5563;color:#e5e7eb;text-align:center">Sta.</th>`
  ).join('')

  const legendItems = [
    ['UR','Under Review','#DBEAFE','#1E40AF'],
    ['OT','Replied On-Time','#D1FAE5','#065F46'],
    ['L','Replied Late','#FFEDD5','#9A3412'],
    ['OD','Overdue','#FEE2E2','#991B1B'],
    ['X','Cancelled/Withdrawn','#F1F5F9','#64748B'],
  ].map(([code,label,bg,color]) =>
    `<span style="display:inline-flex;align-items:center;gap:5pt;margin-right:12pt">
      <span style="display:inline-block;padding:2pt 6pt;background:${bg};color:${color};font-size:8pt;font-weight:700;border-radius:2pt">${code}</span>
      <span style="font-size:8pt;color:#333">${label}</span>
    </span>`
  ).join('')

  const summaryRows = [
    ['Total RFIs', counts.total, ''],
    ['Submitted', counts.submitted, ''],
    ['Under Review', counts.ur, '#1E40AF'],
    ['Replied On-Time', counts.ot, '#065F46'],
    ['Replied Late', counts.l, '#9A3412'],
    ['Overdue', counts.od, '#991B1B'],
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
      <th rowspan="2" style="border:0.5pt solid #aaa;padding:3pt;font-size:7pt;font-weight:700;background:#111827;color:#fff;width:3.5%">Ret.</th>
      <th rowspan="2" style="border:0.5pt solid #aaa;padding:3pt;font-size:7pt;font-weight:700;background:#111827;color:#fff;width:2.5%">Sta.</th>
      <th rowspan="2" style="border:0.5pt solid #aaa;padding:3pt;font-size:7pt;font-weight:700;background:#111827;color:#fff;width:5.5%">MRF Ref.</th>
      <th rowspan="2" style="border:0.5pt solid #aaa;padding:3pt;font-size:7pt;font-weight:700;background:#111827;color:#fff;width:8%">Reason for Overdue</th>
      <th rowspan="2" style="border:0.5pt solid #aaa;padding:3pt;font-size:7pt;font-weight:700;background:#111827;color:#fff;width:6%">Remarks</th>
      ${revHeaderCols}
    </tr>
    <tr>${revSubCols}</tr>
  </thead>
  <tbody>
    ${tableRows || '<tr><td colspan="26" style="text-align:center;padding:14pt;color:#aaa;font-size:8pt">No RFI records for this project</td></tr>'}
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

// ── Main component ────────────────────────────────────────
// Read-only tracker: rows come from IF08 (Request For Information) automatically.
// Editing happens on the IF08 form itself — this page only displays and prints the register.
export default function RFIRegister() {
  const { activeProject } = useProject()
  const { toasts } = useToast()

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterDiscipline, setFilterDiscipline] = useState('')

  useEffect(() => {
    if (!activeProject) return
    loadData()
  }, [activeProject])

  async function loadData() {
    if (!activeProject) return
    setLoading(true)
    const { data, error } = await supabase
      .from('if08')
      .select('*')
      .eq('project_code', activeProject.project_code)
      .order('rfi_number', { ascending: true })
    if (!error && data) setItems(data)
    else setItems([])
    setLoading(false)
  }

  const withStatus = items.map(d => ({ ...d, _status: computeRfiStatus(d) }))

  const filtered = withStatus.filter(d => {
    if (filterStatus && d._status !== filterStatus) return false
    if (filterDiscipline && d.discipline !== filterDiscipline) return false
    if (search) {
      const q = search.toLowerCase()
      return [d.rfi_number, d.subject, d.discipline, d.contractor_sub].some(v => (v||'').toLowerCase().includes(q))
    }
    return true
  })

  const disciplines = [...new Set(items.map(d => d.discipline).filter(Boolean))]

  // ── KPI counts ─────────────────────────────────────────
  const kpi = {
    total: withStatus.length,
    ur:    withStatus.filter(i => i._status === 'Under Review').length,
    ot:    withStatus.filter(i => i._status === 'Replied On-Time').length,
    l:     withStatus.filter(i => i._status === 'Replied Late').length,
    od:    withStatus.filter(i => i._status === 'Overdue').length,
    x:     withStatus.filter(i => i._status === 'Cancelled').length,
  }

  if (!activeProject) return (
    <div style={{ padding: 40, color: 'var(--text-muted)', fontSize: 14 }}>
      Select an active project to view the RFI Register.
    </div>
  )

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <div>
          <div className="page-title">RFI Register</div>
          <div className="page-subtitle">{activeProject.project_name} · RFI Log · {items.length} records · auto-tracked from Request For Information</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => exportPDF(filtered, activeProject)}>
            <Printer size={13} /> Export PDF
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Total',            value: kpi.total, bg: 'var(--bg-surface)', color: 'var(--text-primary)' },
          { label: 'Under Review',     value: kpi.ur,    bg: '#DBEAFE', color: '#1E40AF' },
          { label: 'Replied On-Time',  value: kpi.ot,    bg: '#D1FAE5', color: '#065F46' },
          { label: 'Replied Late',     value: kpi.l,     bg: '#FFEDD5', color: '#9A3412' },
          { label: 'Overdue',          value: kpi.od,    bg: '#FEE2E2', color: '#991B1B' },
          { label: 'Cancelled',        value: kpi.x,     bg: '#F1F5F9', color: '#64748B' },
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
          placeholder="Search RFI no, subject, discipline, contractor…"
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ minWidth: 280 }}
        />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          {RFI_STATUS_KEYS.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={filterDiscipline} onChange={e => setFilterDiscipline(e.target.value)}>
          <option value="">All Disciplines</option>
          {disciplines.map(d => <option key={d}>{d}</option>)}
        </select>
        {(search || filterStatus || filterDiscipline) && (
          <button className="btn btn-ghost" style={{ fontSize: 12 }}
            onClick={() => { setSearch(''); setFilterStatus(''); setFilterDiscipline('') }}>
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
          <div className="table-empty">No RFIs found. Raise one from the RFIs page — it'll appear here automatically.</div>
        ) : (
          <table style={{ minWidth: 1100 }}>
            <thead>
              {/* Revision group header */}
              <tr>
                <th colSpan={11} style={{ background: 'var(--bg-base)', borderBottom: '1px solid var(--border)' }}></th>
                {[1,2,3,4,5].map(n => (
                  <th key={n} colSpan={3} style={{ background: '#1e293b', color: '#fff', fontSize: 10, fontWeight: 700, textAlign: 'center', padding: '4px 0', borderLeft: '2px solid var(--border)' }}>
                    CRFI REV. {n}
                  </th>
                ))}
              </tr>
              {/* Column header */}
              <tr>
                <th style={{ minWidth: 32 }}>Sr</th>
                <th style={{ minWidth: 110 }}>RFI Ref. No</th>
                <th style={{ minWidth: 180 }}>Subject</th>
                <th style={{ minWidth: 90 }}>Discipline</th>
                <th style={{ minWidth: 130 }}>Contractor / Sub</th>
                <th style={{ minWidth: 90 }}>Submitted</th>
                <th style={{ minWidth: 90 }}>Responded</th>
                <th style={{ minWidth: 72 }}>Status</th>
                <th style={{ minWidth: 100 }}>MRF Ref.</th>
                <th style={{ minWidth: 140 }}>Reason for Overdue</th>
                <th style={{ minWidth: 120 }}>Remarks</th>
                {[1,2,3,4,5].map(n => (
                  <>
                    <th key={`r${n}s`} style={{ minWidth: 78, fontSize: 10, borderLeft: '2px solid var(--border)', background: '#f8fafc' }}>Sub.</th>
                    <th key={`r${n}r`} style={{ minWidth: 78, fontSize: 10, background: '#f8fafc' }}>Ret.</th>
                    <th key={`r${n}c`} style={{ minWidth: 48, fontSize: 10, background: '#f8fafc' }}>Sta.</th>
                  </>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((d, idx) => {
                const hist = Array.isArray(d.submission_history) ? d.submission_history : []
                return (
                  <tr key={d.id}>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>{idx + 1}</td>
                    <td><span className="doc-number" style={{ fontSize: 11 }}>{d.rfi_number}</span></td>
                    <td style={{ fontSize: 12, maxWidth: 200 }}>{d.subject}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{d.discipline || '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{d.contractor_sub || '—'}</td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.date || '—'}</td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.response_date || '—'}</td>
                    <td><StatusBadge status={d._status} /></td>
                    <td style={{ fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: d.mrf_number ? 700 : 400, color: d.mrf_number ? '#1E40AF' : 'var(--text-muted)' }}>{d.mrf_number || '—'}</td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.reason_for_overdue || '—'}</td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.remarks || '—'}</td>
                    {[1,2,3,4,5].map(n => {
                      const r = hist.find(h => String(h.rev_no) === `R${n}`) || {}
                      const rs = r.status ? Object.entries(RFI_STATUS).find(([, v]) => v.code === r.status) : null
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
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <ToastContainer toasts={toasts} />
    </div>
  )
}
