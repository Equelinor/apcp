// ─── SUPPLIER MODEL ──────────────────────────────────────────────
// Rule 6: Never duplicate. Supplier is stored once, referenced everywhere.

export const SUPPLIER_STATUS = {
  ACTIVE:    'Active',
  INACTIVE:  'Inactive',
  BLACKLIST: 'Blacklisted',
}

export const SUPPLIER_STATUS_LIST = Object.values(SUPPLIER_STATUS)

export const SUPPLIER_CATEGORIES = [
  'Concrete & Aggregates',
  'Steel & Rebar',
  'Waterproofing',
  'MEP Materials',
  'Electrical',
  'Plumbing',
  'HVAC',
  'Façade & Glazing',
  'Fit-out & Finishing',
  'Landscaping',
  'Civil Materials',
  'Specialist',
  'Labour Supply',
  'Plant & Equipment',
  'PPE & Safety',
  'General',
]

// Blank supplier record template
export const BLANK_SUPPLIER = {
  supplier_code: '',
  supplier_name: '',
  contact_person: '',
  phone: '',
  email: '',
  category: 'General',
  address: '',
  status: SUPPLIER_STATUS.ACTIVE,
  remarks: '',
}
