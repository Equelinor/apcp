import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { useProject } from '../../context/ProjectContext'
import { useToast, ToastContainer } from '../../utils/toast'
import { Printer } from 'lucide-react'
import { AXION_LOGO } from '../../utils/axionLogo'

// ── Status system — derived from IF05's existing response_code / status fields
// (not a new stored field), same convention as Shop Drawing Register ──
export const MAR_STATUS = {
  'Pending':                  { code: 'PND', bg: '#F1F5F9', text: '#64748B', border: '#CBD5E1' },
  'Under Review':             { code: 'UR',  bg: '#DBEAFE', text: '#1E40AF', border: '#BFDBFE' },
  'Approved':                 { code: 'A',   bg: '#D1FAE5', text: '#065F46', border: '#A7F3D0' },
  'Approved with Comments':   { code: 'B',   bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' },
  'Revised and Resubmit':     { code: 'C',   bg: '#FFEDD5', text: '#9A3412', border: '#FED7AA' },
  'Rejected':                 { code: 'D',   bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5' },
}
const MAR_STATUS_KEYS = Object.keys(MAR_STATUS)

export function computeMarStatus(d) {
  const code = (d.response_code || '').charAt(0)
  if (code === 'A') return 'Approved'
  if (code === 'B') return 'Approved with Comments'
  if (code === 'C') return 'Revised and Resubmit'
  if (code === 'D') return 'Rejected'
  if (d.status === 'Draft') return 'Pending'
  return 'Under Review'
}

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

const fmtDate = d => {
  if (!d) return '—'
  const dt = new Date(d)
  return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${String(dt.getFullYear()).slice(2)}`
}

// ── PDF export ────────────────────────────────────────────
function exportPDF(items, project) {
  const genDate = new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })

  const withStatus = items.map(d => ({ ...d, _status: computeMarStatus(d) }))
  const counts = {
    total:    withStatus.length,
    submitted: withStatus.filter(i => i.submitted_date).length,
    ur:       withStatus.filter(i => i._status === 'Under Review').length,
    a:        withStatus.filter(i => i._status === 'Approved').length,
    b:        withStatus.filter(i => i._status === 'Approved with Comments').length,
    c:        withStatus.filter(i => i._status === 'Revised and Resubmit').length,
    d:        withStatus.filter(i => i._status === 'Rejected').length,
    pending:  withStatus.filter(i => i._status === 'Pending').length,
  }

  // ── Company logo/name cells ──────────────────────────────
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
    const s = MAR_STATUS[m._status] || MAR_STATUS['Pending']
    const bg = i % 2 === 0 ? '#fff' : '#f9fafb'

    const revCells = [1,2,3,4,5].map(n => {
      const r = hist.find(h => String(h.rev_no) === `R${n}`) || {}
      const rs = r.status ? Object.entries(MAR_STATUS).find(([k]) =>
        MAR_STATUS[k].code === r.status
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
      <td style="border:0.4pt solid #ccc;padding:2.5pt 4pt;font-size:7.5pt;font-family:monospace;font-weight:700">${m.if05_number || ''}</td>
      <td style="border:0.4pt solid #ccc;padding:2.5pt 4pt;font-size:7.5pt">${m.material_desc || ''}</td>
      <td style="border:0.4pt solid #ccc;padding:2.5pt 4pt;font-size:7.5pt">${m.brand || ''}${m.mat_spec ? ` — ${m.mat_spec}` : ''}</td>
      <td style="border:0.4pt solid #ccc;padding:2.5pt 4pt;font-size:7.5pt">${m.supplier_name || ''}</td>
      <td style="border:0.4pt solid #ccc;padding:2.5pt 3pt;font-size:7pt;text-align:center">${m.submitted_date ? fmtDate(m.submitted_date) : ''}</td>
      <td style="border:0.4pt solid #ccc;padding:2.5pt 3pt;font-size:7pt;text-align:center">${m.response_date ? fmtDate(m.response_date) : ''}</td>
      <td style="border:0.4pt solid #ccc;padding:2.5pt 3pt;font-size:7.5pt;font-weight:700;text-align:center">${m.revision_no || ''}</td>
      <td style="border:0.4pt solid #ccc;padding:2.5pt 3pt;font-size:8pt;font-weight:700;text-align:center;background:${s.bg};color:${s.text}">${s.code}</td>
      <td style="border:0.4pt solid #ccc;padding:2.5pt 4pt;font-size:7pt;color:#555">${m.remarks || ''}</td>
      <td style="border:0.4pt solid #ccc;padding:2.5pt 4pt;font-size:7pt;color:#555">${m.consultant_remarks || ''}</td>
      ${revCells}
    </tr>`
  }).join('')

  const revHeaderCols = [1,2,3,4,5].map(n =>
    `<th colspan="3" style="border:0.5pt solid #aaa;padding:3pt;font-size:7pt;font-weight:700;background:#374151;color:#fff;text-align:center">REV. ${n}</th>`
  ).join('')

  const revSubCols = [1,2,3,4,5].map(() =>
    `<th style="border:0.4pt solid #ccc;padding:2pt;font-size:6.5pt;font-weight:700;background:#4b5563;color:#e5e7eb;text-align:center;border-left:1.5pt solid #888">Sub.</th>
     <th style="border:0.4pt solid #ccc;padding:2pt;font-size:6.5pt;font-weight:700;background:#4b5563;color:#e5e7eb;text-align:center">Ret.</th>
     <th style="border:0.4pt solid #ccc;padding:2pt;font-size:6.5pt;font-weight:700;background:#4b5563;color:#e5e7eb;text-align:center">Sta.</th>`
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
      <td style="font-size:8pt;padding:2pt 0;color:#444">${l}</td>
      <td style="font-size:8.5pt;font-weight:700;padding:2pt 0;text-align:right;color:${c||'#111'}">${v}</td>
    </tr>`
  ).join('')

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>MAR Register — ${project?.project_name || ''}</title>
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
    <!-- Client / Employer -->
    <td style="width:33.3%;border-right:1pt solid #ccc;padding:8pt 12pt;vertical-align:middle;text-align:center">
      ${logoCell(project?.client_logo, project?.client, 'Client / Employer')}
    </td>
    <!-- Contractor (Axion) -->
    <td style="width:33.4%;border-right:1pt solid #ccc;padding:8pt 12pt;vertical-align:middle;text-align:center;background:#fafafa">
      ${logoCell(AXION_LOGO, project?.contractor || 'Axion Imagineering Construction Co. W.L.L.', 'Contractor')}
    </td>
    <!-- Consultant -->
    <td style="width:33.3%;padding:8pt 12pt;vertical-align:middle;text-align:center">
      ${logoCell(project?.consultant_logo, project?.consultant, 'Consultant')}
    </td>
  </tr>
</table>

<!-- ═══ TITLE BAND ═══ -->
<table style="margin-bottom:5pt;border:1pt solid #1a1a2e;border-top:none">
  <tr>
    <td style="padding:6pt 14pt;text-align:center;background:#111827;color:#fff">
      <div style="font-size:13pt;font-weight:900;letter-spacing:.1em;text-transform:uppercase">Material Approval Request Log</div>
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

<!-- ═══ MAR REGISTER TABLE ═══ -->
<table>
  <thead>
    <tr>
      <th rowspan="2" style="border:0.5pt solid #aaa;padding:3pt;font-size:7pt;font-weight:700;background:#111827;color:#fff;text-align:center;width:1.2%">Sr.</th>
      <th rowspan="2" style="border:0.5pt solid #aaa;padding:3pt;font-size:7pt;font-weight:700;background:#111827;color:#fff;width:6.5%">MAR Ref. No</th>
      <th rowspan="2" style="border:0.5pt solid #aaa;padding:3pt;font-size:7pt;font-weight:700;background:#111827;color:#fff;width:13%">MAR Subject</th>
      <th rowspan="2" style="border:0.5pt solid #aaa;padding:3pt;font-size:7pt;font-weight:700;background:#111827;color:#fff;width:10%">Manufacturer / Product</th>
      <th rowspan="2" style="border:0.5pt solid #aaa;padding:3pt;font-size:7pt;font-weight:700;background:#111827;color:#fff;width:7%">Supplier</th>
      <th rowspan="2" style="border:0.5pt solid #aaa;padding:3pt;font-size:7pt;font-weight:700;background:#111827;color:#fff;width:3.5%">Sub.</th>
      <th rowspan="2" style="border:0.5pt solid #aaa;padding:3pt;font-size:7pt;font-weight:700;background:#111827;color:#fff;width:3.5%">Ret.</th>
      <th rowspan="2" style="border:0.5pt solid #aaa;padding:3pt;font-size:7pt;font-weight:700;background:#111827;color:#fff;width:2%">Rev.</th>
      <th rowspan="2" style="border:0.5pt solid #aaa;padding:3pt;font-size:7pt;font-weight:700;background:#111827;color:#fff;width:2.5%">Sta.</th>
      <th rowspan="2" style="border:0.5pt solid #aaa;padding:3pt;font-size:7pt;font-weight:700;background:#111827;color:#fff;width:6%">Remarks</th>
      <th rowspan="2" style="border:0.5pt solid #aaa;padding:3pt;font-size:7pt;font-weight:700;background:#111827;color:#fff;width:6%">Consultant Remarks</th>
      ${revHeaderCols}
    </tr>
    <tr>${revSubCols}</tr>
  </thead>
  <tbody>
    ${tableRows || '<tr><td colspan="26" style="text-align:center;padding:14pt;color:#aaa;font-size:8pt">No MAR records for this project</td></tr>'}
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
// Read-only tracker: rows come from IF05 (Material Approval Certificate / MAC) automatically.
// Editing happens on the IF05 form itself — this page only displays and prints the register.
export default function MARRegister() {
  const { activeProject } = useProject()
  const { toasts } = useToast()

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterSupplier, setFilterSupplier] = useState('')

  useEffect(() => {
    if (!activeProject) return
    loadData()
  }, [activeProject])

  async function loadData() {
    if (!activeProject) return
    setLoading(true)
    const { data, error } = await supabase
      .from('if05')
      .select('*')
      .eq('project_code', activeProject.project_code)
      .order('if05_number', { ascending: true })
    if (!error && data) setItems(data)
    else setItems([])
    setLoading(false)
  }

  const withStatus = items.map(m => ({ ...m, _status: computeMarStatus(m) }))

  // ── Filters ────────────────────────────────────────────
  const filtered = withStatus.filter(m => {
    if (filterStatus && m._status !== filterStatus) return false
    if (filterSupplier && m.supplier_name !== filterSupplier) return false
    if (search) {
      const q = search.toLowerCase()
      return [m.if05_number, m.material_desc, m.brand, m.supplier_name].some(v => (v||'').toLowerCase().includes(q))
    }
    return true
  })

  const supplierNames = [...new Set(items.map(m => m.supplier_name).filter(Boolean))]

  // ── KPI counts ─────────────────────────────────────────
  const kpi = {
    total:   withStatus.length,
    a:       withStatus.filter(i => i._status === 'Approved').length,
    b:       withStatus.filter(i => i._status === 'Approved with Comments').length,
    c:       withStatus.filter(i => i._status === 'Revised and Resubmit').length,
    d:       withStatus.filter(i => i._status === 'Rejected').length,
    ur:      withStatus.filter(i => i._status === 'Under Review').length,
    pending: withStatus.filter(i => i._status === 'Pending').length,
  }

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
          <div className="page-subtitle">{activeProject.project_name} · MAR Log · {items.length} records · auto-tracked from Material Approval Certificates</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => exportPDF(filtered, activeProject)}>
            <Printer size={13} /> Export PDF
          </button>
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
          <div className="table-empty">No MARs found. Raise a Material Approval Certificate from the MAC page — it'll appear here automatically.</div>
        ) : (
          <table style={{ minWidth: 1100 }}>
            <thead>
              {/* Revision group header */}
              <tr>
                <th colSpan={11} style={{ background: 'var(--bg-base)', borderBottom: '1px solid var(--border)' }}></th>
                {[1,2,3,4,5].map(n => (
                  <th key={n} colSpan={3} style={{ background: '#1e293b', color: '#fff', fontSize: 10, fontWeight: 700, textAlign: 'center', padding: '4px 0', borderLeft: '2px solid var(--border)' }}>
                    REV. {n}
                  </th>
                ))}
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
                <th style={{ minWidth: 120 }}>Consultant Remarks</th>
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
              {filtered.map((m, idx) => {
                const hist = Array.isArray(m.submission_history) ? m.submission_history : []
                return (
                  <tr key={m.id}>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>{idx + 1}</td>
                    <td><span className="doc-number" style={{ fontSize: 11 }}>{m.if05_number}</span></td>
                    <td style={{ fontSize: 12, maxWidth: 200 }}>{m.material_desc}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{m.brand || '—'}{m.mat_spec ? ` — ${m.mat_spec}` : ''}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{m.supplier_name || '—'}</td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.submitted_date || '—'}</td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.response_date || '—'}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--brand-accent)', textAlign: 'center' }}>{m.revision_no || '—'}</td>
                    <td><StatusBadge status={m._status} /></td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.remarks || '—'}</td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.consultant_remarks || '—'}</td>
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
