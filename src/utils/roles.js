export const ROLES = {
  ADMIN: 'Admin',
  PM: 'PM',
  PLANNING: 'Planning',
  PROCUREMENT: 'Procurement',
  SITE_ENGINEER: 'Site Engineer',
  ACCOUNTANT: 'Accountant',
  VIEWER: 'Viewer',
}

// Permissions: which roles can perform which actions
export const PERMISSIONS = {
  mrf: {
    create: ['Admin', 'PM', 'Procurement', 'Site Engineer'],
    edit: ['Admin', 'PM', 'Procurement'],
    approve: ['Admin', 'PM'],
    view: ['Admin', 'PM', 'Planning', 'Procurement', 'Site Engineer', 'Accountant', 'Viewer'],
  },
  procurement: {
    create: ['Admin', 'PM', 'Procurement'],
    edit: ['Admin', 'Procurement'],
    view: ['Admin', 'PM', 'Planning', 'Procurement', 'Accountant', 'Viewer'],
  },
  delivery: {
    create: ['Admin', 'Procurement', 'Site Engineer'],
    edit: ['Admin', 'Procurement'],
    view: ['Admin', 'PM', 'Planning', 'Procurement', 'Site Engineer', 'Accountant', 'Viewer'],
  },
  documents: {
    create: ['Admin', 'PM', 'Planning'],
    edit: ['Admin', 'PM'],
    view: ['Admin', 'PM', 'Planning', 'Procurement', 'Site Engineer', 'Accountant', 'Viewer'],
  },
  users: {
    manage: ['Admin'],
    view: ['Admin'],
  },
}

export function can(role, module, action) {
  return PERMISSIONS[module]?.[action]?.includes(role) ?? false
}
