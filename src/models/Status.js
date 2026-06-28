// ─── APCP STATUS ENGINE ──────────────────────────────────────────
// Rule 3: One shared status lifecycle across every module.
// All modules import from here. Never define statuses inline.

export const STATUS = {
  DRAFT:     'Draft',
  SUBMITTED: 'Submitted',
  REVIEWED:  'Reviewed',
  RETURNED:  'Returned',
  APPROVED:  'Approved',
  REJECTED:  'Rejected',
  CLOSED:    'Closed',
}

// Standard lifecycle order
export const STATUS_FLOW = [
  STATUS.DRAFT,
  STATUS.SUBMITTED,
  STATUS.REVIEWED,
  STATUS.RETURNED,
  STATUS.APPROVED,
  STATUS.REJECTED,
  STATUS.CLOSED,
]

// Badge class map — matches existing CSS
export const STATUS_BADGE = {
  [STATUS.DRAFT]:     'badge-draft',
  [STATUS.SUBMITTED]: 'badge-pending',
  [STATUS.REVIEWED]:  'badge-pending',
  [STATUS.RETURNED]:  'badge-pending',
  [STATUS.APPROVED]:  'badge-approved',
  [STATUS.REJECTED]:  'badge-rejected',
  [STATUS.CLOSED]:    'badge-delivered',
}

// Which transitions are allowed from each status
export const STATUS_TRANSITIONS = {
  [STATUS.DRAFT]:     [STATUS.SUBMITTED],
  [STATUS.SUBMITTED]: [STATUS.REVIEWED, STATUS.RETURNED, STATUS.APPROVED, STATUS.REJECTED],
  [STATUS.REVIEWED]:  [STATUS.APPROVED, STATUS.RETURNED, STATUS.REJECTED],
  [STATUS.RETURNED]:  [STATUS.SUBMITTED],
  [STATUS.APPROVED]:  [STATUS.CLOSED],
  [STATUS.REJECTED]:  [STATUS.SUBMITTED, STATUS.CLOSED],
  [STATUS.CLOSED]:    [],
}

export function canTransition(from, to) {
  return STATUS_TRANSITIONS[from]?.includes(to) ?? false
}

export function nextStatuses(current) {
  return STATUS_TRANSITIONS[current] || []
}

// MRF-specific site statuses (separate from approval lifecycle)
export const SITE_STATUS = {
  NOT_ORDERED:          'Not Ordered',
  ORDERED:              'Ordered',
  PARTIALLY_DELIVERED:  'Partially Delivered',
  DELIVERED:            'Delivered',
  UNDER_INSPECTION:     'Under Inspection',
  APPROVED_FOR_USE:     'Approved for Use',
  REJECTED:             'Rejected',
  USED_AT_SITE:         'Used at Site',
}

export const SITE_STATUS_LIST = Object.values(SITE_STATUS)

// Priority levels
export const PRIORITY = {
  CRITICAL: 'Critical',
  HIGH:     'High',
  MEDIUM:   'Medium',
  LOW:      'Low',
}

export const PRIORITY_LIST = Object.values(PRIORITY)

// Delay status (computed, not stored)
export const DELAY_STATUS = {
  ON_TRACK:      'On Track',
  AT_RISK:       'At Risk',
  DELAYED:       'Delayed',
  LATE_TO_RAISE: 'Late to Raise',
}

// Response codes (consultant)
export const RESPONSE_CODES = [
  'A — Approved',
  'B — Approved with Comments',
  'C — Revise and Resubmit',
  'D — Rejected',
]
