// Single source for all status → color mappings
// Used by Badge, charts, and any visual status indicator

export const STATUS_COLORS = {
  // Lifecycle
  Draft:      { bg: '#F1F5F9', text: '#64748B', border: '#CBD5E1' },
  Submitted:  { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' },
  Reviewed:   { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' },
  Returned:   { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' },
  Approved:   { bg: '#D1FAE5', text: '#065F46', border: '#A7F3D0' },
  Rejected:   { bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5' },
  Closed:     { bg: '#DBEAFE', text: '#1E40AF', border: '#BFDBFE' },

  // Site statuses
  'Not Ordered':         { bg: '#F1F5F9', text: '#64748B', border: '#CBD5E1' },
  'Ordered':             { bg: '#DBEAFE', text: '#1E40AF', border: '#BFDBFE' },
  'Partially Delivered': { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' },
  'Delivered':           { bg: '#D1FAE5', text: '#065F46', border: '#A7F3D0' },
  'Under Inspection':    { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' },
  'Approved for Use':    { bg: '#D1FAE5', text: '#065F46', border: '#A7F3D0' },
  'Used at Site':        { bg: '#DBEAFE', text: '#1E40AF', border: '#BFDBFE' },

  // Priority
  Critical: { bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5' },
  High:     { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' },
  Medium:   { bg: '#DBEAFE', text: '#1E40AF', border: '#BFDBFE' },
  Low:      { bg: '#F1F5F9', text: '#64748B', border: '#CBD5E1' },

  // Delay
  'On Track':      { bg: '#D1FAE5', text: '#065F46', border: '#A7F3D0' },
  'At Risk':       { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' },
  'Delayed':       { bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5' },
  'Late to Raise': { bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5' },

  // Supplier
  Active:      { bg: '#D1FAE5', text: '#065F46', border: '#A7F3D0' },
  Inactive:    { bg: '#F1F5F9', text: '#64748B', border: '#CBD5E1' },
  Blacklisted: { bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5' },

  // Project
  'Active Project':    { bg: '#D1FAE5', text: '#065F46', border: '#A7F3D0' },
  'On Hold':           { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' },
  'Completed':         { bg: '#DBEAFE', text: '#1E40AF', border: '#BFDBFE' },
}

export function getStatusColor(status) {
  return STATUS_COLORS[status] || STATUS_COLORS['Draft']
}
