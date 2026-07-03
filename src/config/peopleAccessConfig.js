// ─── PEOPLE & ACCESS CONFIG ──────────────────────────────────────
// Central catalog for roles, modules and permission actions.
// Role NAMES here must match the seed rows inserted into the `roles` table.

export const DEFAULT_ROLES = [
  'Admin',
  'Planner',
  'Project Manager',
  'Site Engineer',
  'QA/QC Engineer',
  'Procurement',
  'Store Keeper',
  'Document Controller',
  'Commercial / QS',
  'HSE Officer',
  'Viewer',
]

// Modules this permission matrix governs — mirrors the app's own register/module set
export const PERMISSION_MODULES = [
  'Dashboard',
  'Project Setup',
  'BOQ / Progress',
  'Suppliers',
  'MAR / MAC',
  'RFI',
  'Shop Drawings',
  'Inspection Requests',
  'DAR',
  'Material Requests',
  'Procurement',
  'Delivery Tracking',
  'Document Register',
  'People & Access',
]

export const PERMISSION_ACTIONS = [
  'View',
  'Create',
  'Edit',
  'Delete',
  'Submit',
  'Approve',
  'Export PDF',
  'Manage Settings',
]

export const EMPLOYEE_STATUSES = ['Active', 'Inactive']
export const ACCOUNT_STATUSES = ['Active', 'Disabled']
export const ASSIGNMENT_STATUSES = ['Active', 'Ended']

export const DEPARTMENTS = [
  'Project Management',
  'Planning',
  'Site Operations',
  'QA/QC',
  'Procurement',
  'Store',
  'Document Control',
  'Commercial / QS',
  'HSE',
  'Administration',
  'IT',
]

// A role's default permission set, used only to pre-fill the matrix for brand-new
// roles that have no role_permissions rows yet — the matrix itself is what's authoritative.
export const ROLE_DEFAULT_ALLOW_ALL = ['Admin']
