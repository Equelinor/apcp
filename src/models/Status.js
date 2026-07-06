// ─── DAR STATUS LIFECYCLE ────────────────────────────────────────
// This generic Draft→Submitted→Reviewed→Returned→Approved→Rejected→Closed
// lifecycle is used by DAR only. Every other module (IF04-12, MAR/RFI/Shop
// Drawing/IR Registers) has its own domain-specific status vocabulary
// (A/B/C/D approval codes, Passed/Failed/Conditional Pass, etc.) — those are
// genuinely different concepts, not just inconsistently-named versions of
// this lifecycle, so they intentionally don't import from here.

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

// Response codes (consultant) — single source of truth is config/docTypes.js.
// Re-exported here only so any existing `from '../models/Status'` imports don't break.
export { RESPONSE_CODES } from '../config/docTypes'
