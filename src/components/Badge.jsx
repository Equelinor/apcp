const STATUS_MAP = {
  // Approval
  Draft:       'badge-draft',
  Submitted:   'badge-pending',
  Approved:    'badge-approved',
  Rejected:    'badge-rejected',
  'On Hold':   'badge-pending',
  Revised:     'badge-pending',
  // Delivery / Site
  'Not Ordered':         'badge-draft',
  'Ordered':             'badge-delivered',
  'Partially Delivered': 'badge-pending',
  'Delivered':           'badge-approved',
  'Under Inspection':    'badge-pending',
  'Approved for Use':    'badge-approved',
  'Used at Site':        'badge-delivered',
  // Delay
  'On Track':     'badge-approved',
  'At Risk':      'badge-pending',
  'Delayed':      'badge-rejected',
  'Late to Raise':'badge-rejected',
  // Priority
  Critical: 'badge-rejected',
  High:     'badge-pending',
  Medium:   'badge-delivered',
  Low:      'badge-draft',
}

export default function Badge({ status, label }) {
  const cls = STATUS_MAP[status] || 'badge-draft'
  return <span className={`badge ${cls}`}>{label || status}</span>
}
