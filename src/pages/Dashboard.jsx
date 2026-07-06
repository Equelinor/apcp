import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useProject } from '../context/ProjectContext'
import { delayStatus } from '../utils/delay'
import Badge from '../components/Badge'
import {
  FileText, Clock, AlertTriangle, Truck, Package,
  CheckCircle, XCircle, Zap, ClipboardCheck, MessageSquare, FolderOpen, HardHat
} from 'lucide-react'
import { computeMarStatus, MAR_STATUS } from './mar/MARRegister'
import { computeRfiStatus, RFI_STATUS } from './rfi/RFIRegister'
import { computeSdStatus, SD_STATUS, isSdOverdue } from './sd/SDRegister'
import { computeIrStatus, IR_STATUS, isIrOverdue } from './ir/IRRegister'

// ─── Seed data used when Supabase has no rows yet ───────────────
const SEED = [
  { id: 1, mrf_number: 'MRF-ANT-2025-00001', date: '2025-01-15', project_code: 'ANT',
    location: 'Block A', zone: 'Basement', requested_by: 'Ahmed Al-Rashid',
    material_desc: 'Ready Mix Concrete M40 — Foundations', qty: 500, unit: 'CUM',
    required_on_site: '2025-01-22', priority: 'Critical', activity_id: 'A1010',
    activity_name: 'Basement Foundation Pour', wbs_code: '1.1.2',
    lead_time_days: 7, latest_raise_date: '2025-01-15',
    approval_status: 'Approved', approval_date: '2025-01-16', approval_by: 'Omar Shaikh',
    supplier: 'Gulf Concrete Co.', po_number: 'PO-ANT-2025-00012',
    expected_delivery: '2025-01-22', delivered_qty: 500,
    mir_number: 'MIR-ANT-2025-00001', mir_result: 'Approved',
    site_status: 'Approved for Use' },
  { id: 2, mrf_number: 'MRF-ANT-2025-00002', date: '2025-01-18', project_code: 'ANT',
    location: 'Block B', zone: 'Ground Floor', requested_by: 'Sara Qureshi',
    material_desc: 'TMT Rebar 16mm Grade 60', qty: 45, unit: 'MT',
    required_on_site: '2025-01-28', priority: 'High', activity_id: 'A1210',
    activity_name: 'GF Column Reinforcement', wbs_code: '1.2.1',
    lead_time_days: 10, latest_raise_date: '2025-01-18',
    approval_status: 'Approved', approval_date: '2025-01-19', approval_by: 'Omar Shaikh',
    supplier: 'Emirates Steel', po_number: 'PO-ANT-2025-00018',
    expected_delivery: '2025-01-28', delivered_qty: 30,
    mir_result: 'Approved', site_status: 'Partially Delivered' },
  { id: 3, mrf_number: 'MRF-MRS-2025-00001', date: '2025-01-20', project_code: 'MRS',
    location: 'Tower C', zone: 'Level 3', requested_by: 'Khalid Mansoor',
    material_desc: 'SBS Waterproofing Membrane Type A', qty: 200, unit: 'SQM',
    required_on_site: '2025-02-05', priority: 'High', activity_id: 'B2030',
    activity_name: 'Basement Waterproofing L3', wbs_code: '2.1.3',
    lead_time_days: 16, latest_raise_date: '2025-01-20',
    approval_status: 'Submitted', approval_date: null, approval_by: null,
    supplier: null, po_number: null,
    expected_delivery: null, delivered_qty: 0,
    mir_result: null, site_status: 'Not Ordered' },
  { id: 4, mrf_number: 'MRF-ANT-2025-00003', date: '2025-01-22', project_code: 'ANT',
    location: 'Tower D', zone: 'Level 1', requested_by: 'Nadia Hassan',
    material_desc: 'Aluminium Curtain Wall System — Type CW-01', qty: 320, unit: 'SQM',
    required_on_site: '2025-02-10', priority: 'Critical', activity_id: 'A3010',
    activity_name: 'Curtain Wall Installation L1', wbs_code: '1.3.1',
    lead_time_days: 19, latest_raise_date: '2025-01-22',
    approval_status: 'Draft', approval_date: null, approval_by: null,
    supplier: null, po_number: null,
    expected_delivery: null, delivered_qty: 0,
    mir_result: null, site_status: 'Not Ordered' },
  { id: 5, mrf_number: 'MRF-MRS-2025-00002', date: '2025-01-25', project_code: 'MRS',
    location: 'Tower C', zone: 'Rooftop', requested_by: 'James Wu',
    material_desc: 'Chilled Water Pipe Insulation 50mm', qty: 850, unit: 'LM',
    required_on_site: '2025-02-15', priority: 'Medium', activity_id: 'B4010',
    activity_name: 'MEP Insulation Works', wbs_code: '2.4.1',
    lead_time_days: 21, latest_raise_date: '2025-01-25',
    approval_status: 'Approved', approval_date: '2025-01-26', approval_by: 'Omar Shaikh',
    supplier: 'Armacell Gulf', po_number: 'PO-MRS-2025-00005',
    expected_delivery: '2025-02-14', delivered_qty: 0,
    mir_result: null, site_status: 'Ordered' },
]

const SITE_STATUSES = [
  'Not Ordered','Ordered','Partially Delivered','Delivered',
  'Under Inspection','Approved for Use','Rejected','Used at Site'
]

export default function Dashboard() {
  const { activeProject } = useProject()
  const [mrfs, setMrfs] = useState([])
  const [registers, setRegisters] = useState({ mar: [], rfi: [], sd: [], ir: [], dar: [] })
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    loadData()
  }, [activeProject])

  async function loadData() {
    setLoading(true)
    const projectCode = activeProject.project_code

    const { data, error } = await supabase
      .from('mrfs')
      .select('*')
      .eq('project_code', projectCode)

    if (error || !data?.length) {
      // Fall back to seed data filtered by project
      setMrfs(SEED.filter(m => m.project_code === projectCode))
    } else {
      setMrfs(data)
    }

    // Registers read straight from their source IF-tables — same tables the
    // Register pages themselves read from. No duplicate data stored here.
    const [mar, rfi, sd, ir, dar] = await Promise.all([
      supabase.from('if05').select('response_code,status').eq('project_code', projectCode),
      supabase.from('if08').select('status,response_date,required_response_date').eq('project_code', projectCode),
      supabase.from('if04').select('response_code,status,submitted_date').eq('project_code', projectCode),
      supabase.from('if09').select('result,status,requested_inspection_date').eq('project_code', projectCode),
      supabase.from('dars').select('id,date,status').eq('project_code', projectCode),
    ])
    setRegisters({
      mar: mar.data || [],
      rfi: rfi.data || [],
      sd: sd.data || [],
      ir: ir.data || [],
      dar: dar.data || [],
    })

    setLoading(false)
  }

  // ── Register summary counts — derived with each Register's own status logic, not re-implemented ──
  const marWithStatus = registers.mar.map(d => computeMarStatus(d))
  const rfiWithStatus = registers.rfi.map(d => computeRfiStatus(d))
  const sdWithStatus = registers.sd.map(d => ({ status: computeSdStatus(d), overdue: isSdOverdue(d) }))
  const irWithStatus = registers.ir.map(d => ({ status: computeIrStatus(d), overdue: isIrOverdue(d) }))

  const registerSummary = [
    {
      label: 'MAR', route: '/mar', icon: FileText,
      total: marWithStatus.length,
      pending: marWithStatus.filter(s => s === 'Under Review' || s === 'Pending').length,
      flagged: marWithStatus.filter(s => s === 'Rejected' || s === 'Revised and Resubmit').length,
      flaggedLabel: 'Rejected / Resubmit',
    },
    {
      label: 'RFI', route: '/rfi-register', icon: MessageSquare,
      total: rfiWithStatus.length,
      pending: rfiWithStatus.filter(s => s === 'Under Review').length,
      flagged: rfiWithStatus.filter(s => s === 'Overdue').length,
      flaggedLabel: 'Overdue',
    },
    {
      label: 'Shop Drawings', route: '/sd-register', icon: FolderOpen,
      total: sdWithStatus.length,
      pending: sdWithStatus.filter(s => s.status === 'Under Review' || s.status === 'Pending').length,
      flagged: sdWithStatus.filter(s => s.overdue).length,
      flaggedLabel: 'Overdue',
    },
    {
      label: 'Inspections', route: '/ir-register', icon: ClipboardCheck,
      total: irWithStatus.length,
      pending: irWithStatus.filter(s => s.status === 'Under Review' || s.status === 'Pending').length,
      flagged: irWithStatus.filter(s => s.overdue || s.status === 'Rejected').length,
      flaggedLabel: 'Failed / Overdue',
    },
    {
      label: 'DAR', route: '/dar', icon: HardHat,
      total: registers.dar.length,
      pending: registers.dar.filter(d => d.status === 'Draft').length,
      flagged: 0,
      flaggedLabel: null,
    },
  ]

  const total = mrfs.length
  const pending = mrfs.filter(m => m.approval_status === 'Submitted').length
  const delayItems = mrfs.filter(m => delayStatus(m) !== 'On Track')
  const lateToRaise = mrfs.filter(m => delayStatus(m) === 'Late to Raise').length
  const inTransit = mrfs.filter(m => m.po_number && (m.delivered_qty || 0) < m.qty && m.site_status !== 'Rejected').length
  const awaitingMIR = mrfs.filter(m => (m.delivered_qty || 0) > 0 && !m.mir_number).length
  const rejected = mrfs.filter(m => m.mir_result === 'Rejected' || m.site_status === 'Rejected').length
  const criticalPending = mrfs.filter(m => m.priority === 'Critical' && !['Approved for Use', 'Used at Site'].includes(m.site_status)).length

  const stats = [
    { label: 'Total MRFs', value: total, sub: 'All records', icon: FileText, color: '' },
    { label: 'Pending Approval', value: pending, sub: 'Awaiting action', icon: Clock, color: '#92600A', bg: '#FEF3C7' },
    { label: 'Delay Risk', value: delayItems.length, sub: 'At risk or delayed', icon: AlertTriangle, color: '#B91C1C', bg: '#FEE2E2' },
    { label: 'Late to Raise', value: lateToRaise, sub: 'Past raise date', icon: XCircle, color: '#B91C1C', bg: '#FEE2E2' },
    { label: 'In Transit', value: inTransit, sub: 'PO issued, not delivered', icon: Truck, color: '#1E40AF', bg: '#DBEAFE' },
    { label: 'Awaiting MIR', value: awaitingMIR, sub: 'Delivered, not inspected', icon: Package, color: '#92600A', bg: '#FEF3C7' },
    { label: 'Rejected', value: rejected, sub: 'Failed inspection', icon: XCircle, color: '#B91C1C', bg: '#FEE2E2' },
    { label: 'Critical Pending', value: criticalPending, sub: 'Expedite immediately', icon: Zap, color: '#5B21B6', bg: '#EDE9FE' },
  ]

  // Site status breakdown
  const statusCounts = {}
  SITE_STATUSES.forEach(s => statusCounts[s] = 0)
  mrfs.forEach(m => { if (statusCounts[m.site_status] !== undefined) statusCounts[m.site_status]++ })

  if (loading) return <div style={{ padding: 32, color: 'var(--text-muted)' }}>Loading dashboard…</div>

  return (
    <div>
      {/* Register Summary — reads live from MAR/RFI/Shop Drawing/IR Registers + DAR, no duplicate data */}
      <div style={{ marginBottom: 8, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-muted)' }}>
        Register Summary
      </div>
      <div className="grid-4" style={{ marginBottom: 24 }}>
        {registerSummary.map(r => {
          const Icon = r.icon
          return (
            <div key={r.label} className="stat-card" onClick={() => navigate(r.route)} style={{ cursor: 'pointer', borderTop: '3px solid var(--brand-accent)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="stat-card-label">{r.label}</span>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(232,160,32,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={14} color="var(--brand-accent)" />
                </div>
              </div>
              <div className="stat-card-value">{r.total}</div>
              <div style={{ display: 'flex', gap: 10, marginTop: 2 }}>
                <span style={{ fontSize: 11, color: '#1E40AF' }}>{r.pending} Under Review</span>
                {r.flaggedLabel && (
                  <span style={{ fontSize: 11, color: r.flagged ? '#991B1B' : 'var(--text-muted)', fontWeight: r.flagged ? 700 : 400 }}>
                    {r.flagged} {r.flaggedLabel}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* KPI Grid */}
      <div style={{ marginBottom: 8, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-muted)' }}>
        Material Requests
      </div>
      <div className="grid-4" style={{ marginBottom: 24 }}>
        {stats.map(s => {
          const Icon = s.icon
          return (
            <div
              key={s.label}
              className="stat-card"
              onClick={() => navigate('/mrfs')}
              style={{
                cursor: 'pointer',
                borderTop: s.color ? `3px solid ${s.color}` : '3px solid var(--brand-accent)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="stat-card-label">{s.label}</span>
                <div style={{
                  width: 28, height: 28, borderRadius: 6,
                  background: s.bg || 'rgba(232,160,32,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Icon size={14} color={s.color || 'var(--brand-accent)'} />
                </div>
              </div>
              <div className="stat-card-value" style={{ color: s.color || 'var(--text-primary)' }}>
                {s.value}
              </div>
              <div className="stat-card-label" style={{ fontWeight: 400 }}>{s.sub}</div>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Delay Risk */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>
              Delay Risk Register
              <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, background: delayItems.length ? 'var(--status-rejected-bg)' : 'var(--status-approved-bg)', color: delayItems.length ? 'var(--status-rejected-text)' : 'var(--status-approved-text)', padding: '2px 7px', borderRadius: 20 }}>
                {delayItems.length}
              </span>
            </span>
            <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => navigate('/mrfs')}>View all →</button>
          </div>
          {!delayItems.length ? (
            <div style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--text-muted)' }}>
              <CheckCircle size={28} color="var(--status-approved-text)" style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 13 }}>No delay risks</div>
            </div>
          ) : (
            <table style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>MRF No</th><th>Material</th><th>Activity</th><th>Need Date</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {delayItems.slice(0, 6).map(m => (
                  <tr key={m.id} onClick={() => navigate('/mrfs')} style={{ cursor: 'pointer' }}>
                    <td><span className="doc-number">{m.mrf_number}</span></td>
                    <td style={{ fontSize: 12, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.material_desc}</td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.activity_id || '—'}</td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.required_on_site || '—'}</td>
                    <td><Badge status={delayStatus(m)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Site Status Overview */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>Site Availability Overview</span>
          </div>
          <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {SITE_STATUSES.map(s => {
              const count = statusCounts[s]
              const pct = total ? Math.round(count / total * 100) : 0
              return (
                <div key={s}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{s}</span>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>{count}</span>
                  </div>
                  <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: 'var(--brand-accent)', borderRadius: 2 }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
