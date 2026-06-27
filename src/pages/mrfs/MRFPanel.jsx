import { X, Printer } from 'lucide-react'
import Badge from '../../components/Badge'
import { delayStatus } from '../../utils/delay'

function Info({ label, value, mono, warn }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 700 }}>{label}</span>
      <span style={{ fontSize: 12.5, fontWeight: 500, fontFamily: mono ? 'var(--font-mono)' : undefined, color: warn ? 'var(--status-rejected-text)' : 'var(--text-primary)' }}>
        {value || '—'}
      </span>
    </div>
  )
}

function Section({ title }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', margin: '16px 0 10px', paddingBottom: 4, borderBottom: '1px solid var(--border)' }}>
      {title}
    </div>
  )
}

export default function MRFPanel({ mrf, onClose, onEdit, onApprove, onReject, onHold, canApprove }) {
  if (!mrf) return null

  const ds = delayStatus(mrf)
  const balance = (mrf.qty || 0) - (mrf.delivered_qty || 0)
  const pct = mrf.qty ? Math.round((mrf.delivered_qty || 0) / mrf.qty * 100) : 0
  const delWarn = mrf.expected_delivery && mrf.required_on_site && new Date(mrf.expected_delivery) > new Date(mrf.required_on_site)

  // Workflow steps
  const steps = [
    { label: 'Draft', done: true },
    { label: 'Submitted', done: ['Submitted','Approved','Rejected','On Hold'].includes(mrf.approval_status) },
    { label: 'Approved', done: mrf.approval_status === 'Approved' },
    { label: 'PO Issued', done: !!mrf.po_number },
    { label: 'Delivered', done: (mrf.delivered_qty || 0) >= (mrf.qty || 1) },
    { label: 'Inspected', done: !!mrf.mir_number },
    { label: 'Released', done: !!mrf.site_release_date },
  ]
  const currentStep = steps.findIndex(s => !s.done)

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: 660,
      background: 'var(--bg-surface)', borderLeft: '1px solid var(--border)',
      boxShadow: '-4px 0 24px rgba(0,0,0,0.13)', zIndex: 90,
      display: 'flex', flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{ padding: '13px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <button className="btn btn-ghost" onClick={onClose} style={{ padding: 4 }}><X size={16} /></button>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--brand-accent)' }}>{mrf.mrf_number}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{mrf.material_desc}</div>
        </div>
        <Badge status={mrf.approval_status} />
        <button className="btn btn-ghost no-print" title="Print" onClick={() => window.print()} style={{ padding: 6 }}>
          <Printer size={15} />
        </button>
      </div>

      {/* Workflow bar */}
      <div style={{ padding: '10px 18px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 4, flexWrap: 'wrap', flexShrink: 0 }}>
        {steps.map((s, i) => (
          <span key={s.label} style={{
            padding: '3px 9px', borderRadius: 20, fontSize: 10, fontWeight: 700,
            border: `1.5px solid ${s.done ? 'var(--status-approved-text)' : i === currentStep ? 'var(--brand-primary)' : 'var(--border)'}`,
            background: s.done ? 'var(--status-approved-bg)' : i === currentStep ? 'var(--brand-primary)' : 'transparent',
            color: s.done ? 'var(--status-approved-text)' : i === currentStep ? '#fff' : 'var(--text-muted)'
          }}>{s.label}</span>
        ))}
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 18 }}>

        {/* Delay alert */}
        {ds !== 'On Track' && (
          <div style={{ background: 'var(--status-rejected-bg)', color: 'var(--status-rejected-text)', border: '1px solid #fca5a5', borderRadius: 'var(--radius)', padding: '8px 12px', fontSize: 12, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            ⚠️ <Badge status={ds} /> — {ds === 'Late to Raise' ? 'MRF not raised before latest raise date. Expedite.' : ds === 'Delayed' ? 'Delivery date past required on-site date. Activity at risk.' : 'Delivery at risk. Monitor and expedite.'}
          </div>
        )}

        {/* Request Details */}
        <Section title="📋 Request Details" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 4 }}>
          <Info label="Date" value={mrf.date} />
          <Info label="Priority" value={<Badge status={mrf.priority} />} />
          <Info label="Project" value={mrf.project_code} />
          <Info label="Requested By" value={mrf.requested_by} />
          <Info label="Location" value={mrf.location} />
          <Info label="Zone" value={mrf.zone} />
          <Info label="Quantity" value={`${mrf.qty} ${mrf.unit}`} />
          <Info label="Required On-Site" value={mrf.required_on_site} />
          <Info label="Lead Time" value={mrf.lead_time_days ? `${mrf.lead_time_days} days` : null} />
          <Info label="Latest Raise Date" value={mrf.latest_raise_date} />
        </div>
        {mrf.remarks && (
          <div style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 12px', fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>
            {mrf.remarks}
          </div>
        )}

        {/* Material Spec */}
        <Section title="🔬 Material Specification" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Info label="Spec" value={mrf.mat_spec} />
          <Info label="Brand" value={mrf.brand} />
          <Info label="Grade" value={mrf.grade} />
          <Info label="Code Ref" value={mrf.code_ref} />
          <Info label="Sample Ref" value={mrf.sample_ref} mono />
          <Info label="Submittal Ref" value={mrf.subm_ref} mono />
          <Info label="Submittal Status" value={mrf.subm_status ? <Badge status={mrf.subm_status} /> : null} />
          <Info label="Consultant Approval" value={mrf.consult_approval_date} />
        </div>

        {/* Drawing Refs */}
        <Section title="📐 Drawing References" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <Info label="IFC Drawing" value={mrf.ifc_drawing} mono />
          <Info label="Shop Drawing" value={mrf.shop_drawing} mono />
          <Info label="Revision" value={mrf.drawing_rev} />
        </div>

        {/* Programme */}
        <Section title="📅 Programme Link" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Info label="WBS Code" value={mrf.wbs_code} mono />
          <Info label="Activity ID" value={mrf.activity_id} mono />
          <Info label="Activity Name" value={mrf.activity_name} />
          <Info label="Programme Ref" value={mrf.programme_ref} />
          <Info label="Planned Start" value={mrf.planned_start} />
          <Info label="Planned Finish" value={mrf.planned_finish} />
        </div>

        {/* Approval */}
        <Section title="✅ Approval" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Info label="Status" value={<Badge status={mrf.approval_status} />} />
          <Info label="Approved By" value={mrf.approval_by} />
          <Info label="Approval Date" value={mrf.approval_date} />
          <Info label="Remarks" value={mrf.approval_remarks} />
        </div>

        {/* Procurement */}
        <Section title="🛒 Procurement" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Info label="Supplier" value={mrf.supplier} />
          <Info label="Quotation Ref" value={mrf.quotation_ref} mono />
          <Info label="PO Number" value={mrf.po_number} mono />
          <Info label="PO Date" value={mrf.po_date} />
          <Info label="PO Amount" value={mrf.po_amount ? `AED ${Number(mrf.po_amount).toLocaleString()}` : null} />
          <Info label="Expected Delivery" value={mrf.expected_delivery} warn={delWarn} />
        </div>
        {delWarn && (
          <div style={{ background: 'var(--status-rejected-bg)', color: 'var(--status-rejected-text)', border: '1px solid #fca5a5', borderRadius: 'var(--radius)', padding: '7px 12px', fontSize: 12, fontWeight: 600, marginTop: 8 }}>
            ⚠️ Expected delivery ({mrf.expected_delivery}) is later than required on-site date ({mrf.required_on_site}) — activity {mrf.activity_id} may be impacted.
          </div>
        )}

        {/* Delivery */}
        <Section title="🚛 Delivery" />
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 3 }}>
            <span style={{ color: 'var(--text-muted)' }}>Delivered: {mrf.delivered_qty || 0} / {mrf.qty} {mrf.unit}</span>
            <span style={{ fontWeight: 700 }}>{pct}%</span>
          </div>
          <div style={{ height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? 'var(--status-approved-text)' : pct > 0 ? 'var(--brand-accent)' : 'var(--border)', borderRadius: 3 }} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Info label="Balance Qty" value={`${balance} ${mrf.unit}`} warn={balance > 0} />
          <Info label="DN Number" value={mrf.dn_number} mono />
          <Info label="Delivery Date" value={mrf.delivery_date} />
          <Info label="Store Received" value={mrf.store_received ? `✓ ${mrf.store_received_date}` : 'Pending'} />
        </div>

        {/* MIR */}
        <Section title="🔍 Inspection / MIR" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <Info label="MIR Number" value={mrf.mir_number} mono />
          <Info label="MIR Raised" value={mrf.mir_raised_date} />
          <Info label="Submitted" value={mrf.mir_submitted_date} />
          <Info label="Approved" value={mrf.mir_approved_date} />
          <Info label="Rejected" value={mrf.mir_rejected_date} />
          <Info label="Resubmissions" value={mrf.mir_resub_count || 0} />
          <Info label="Site Release" value={mrf.site_release_date} />
          <Info label="Result" value={mrf.mir_result ? <Badge status={mrf.mir_result} /> : 'Pending'} />
        </div>

        {/* Site Status */}
        <Section title="🏗️ Site Availability" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Badge status={mrf.site_status || 'Not Ordered'} label={mrf.site_status || 'Not Ordered'} />
        </div>
      </div>

      {/* Footer Actions */}
      <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, flexWrap: 'wrap', flexShrink: 0 }}>
        <button className="btn btn-secondary" onClick={onEdit} style={{ fontSize: 12 }}>✏ Edit</button>
        {canApprove && mrf.approval_status === 'Submitted' && (
          <>
            <button className="btn" style={{ background: 'var(--status-approved-bg)', color: 'var(--status-approved-text)', fontSize: 12, fontWeight: 700 }} onClick={() => onApprove(mrf.id)}>✓ Approve</button>
            <button className="btn" style={{ background: 'var(--status-rejected-bg)', color: 'var(--status-rejected-text)', fontSize: 12, fontWeight: 700 }} onClick={() => onReject(mrf.id)}>✗ Reject</button>
            <button className="btn" style={{ background: 'var(--status-pending-bg)', color: 'var(--status-pending-text)', fontSize: 12, fontWeight: 700 }} onClick={() => onHold(mrf.id)}>⏸ Hold</button>
          </>
        )}
      </div>
    </div>
  )
}
