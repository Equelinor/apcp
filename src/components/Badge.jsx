import { STATUS_BADGE } from '../models/Status'

// Maps any status string to a badge class
// Supports both standard lifecycle statuses and legacy/custom ones
const LEGACY_MAP = {
  // Site statuses
  'Not Ordered':         'badge-draft',
  'Ordered':             'badge-delivered',
  'Partially Delivered': 'badge-pending',
  'Delivered':           'badge-approved',
  'Under Inspection':    'badge-pending',
  'Approved for Use':    'badge-approved',
  'Used at Site':        'badge-delivered',
  // Priority
  'Critical': 'badge-rejected',
  'High':     'badge-pending',
  'Medium':   'badge-delivered',
  'Low':      'badge-draft',
  // Delay
  'On Track':      'badge-approved',
  'At Risk':       'badge-pending',
  'Delayed':       'badge-rejected',
  'Late to Raise': 'badge-rejected',
  // Supplier
  'Active':      'badge-approved',
  'Inactive':    'badge-draft',
  'Blacklisted': 'badge-rejected',
  // Inspection results
  'Passed':           'badge-approved',
  'Failed':           'badge-rejected',
  'Conditional Pass': 'badge-pending',
  // Submittal legacy
  'Approved with Comments': 'badge-pending',
  'Resubmitted':            'badge-pending',
  'Superseded':             'badge-draft',
  'Inspection Scheduled':   'badge-pending',
  'Inspected':              'badge-delivered',
  'Conditionally Approved': 'badge-pending',
  'Under Review':           'badge-pending',
  'Answered':               'badge-approved',
  'Closed':                 'badge-delivered',
  'Cancelled':              'badge-draft',
}

export default function Badge({ status, label }) {
  const cls = STATUS_BADGE[status] || LEGACY_MAP[status] || 'badge-draft'
  return <span className={`badge ${cls}`}>{label || status}</span>
}
