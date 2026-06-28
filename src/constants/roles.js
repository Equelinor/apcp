export const ROLES = ['Admin', 'PM', 'Planning', 'Procurement', 'Site Engineer', 'Accountant', 'Viewer']

export const ROLE = {
  ADMIN:         'Admin',
  PM:            'PM',
  PLANNING:      'Planning',
  PROCUREMENT:   'Procurement',
  SITE_ENGINEER: 'Site Engineer',
  ACCOUNTANT:    'Accountant',
  VIEWER:        'Viewer',
}

// Which roles can perform which actions
export const CAN = {
  createMRF:      ['Admin', 'PM', 'Procurement', 'Site Engineer'],
  approveMRF:     ['Admin', 'PM'],
  editMRF:        ['Admin', 'PM', 'Planning', 'Procurement', 'Site Engineer'],
  procure:        ['Admin', 'Procurement'],
  manageSupplier: ['Admin', 'Procurement'],
  manageProject:  ['Admin'],
  manageUsers:    ['Admin'],
}

export function can(role, action) {
  return CAN[action]?.includes(role) ?? false
}
