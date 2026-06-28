import { supabase } from '../supabaseClient'

const TABLE = 'projects'

export const PROJECT_SEED = [
  {
    id: 'ant',
    project_code: 'ANT',
    project_name: 'Al Noor Tower',
    project_number: 'AX-2025-001',
    client: 'Client TBC',
    consultant: 'Consultant TBC',
    contractor: 'Axion Imagineering Construction Co. W.L.L',
    location: 'Abu Dhabi, UAE',
    status: 'Active Project',
    contract_type: 'Lump Sum',
    currency: 'AED',
    subcontractors: [],
    third_parties: [],
  },
  {
    id: 'mrs',
    project_code: 'MRS',
    project_name: 'Marina Residences',
    project_number: 'AX-2025-002',
    client: 'Client TBC',
    consultant: 'Consultant TBC',
    contractor: 'Axion Imagineering Construction Co. W.L.L',
    location: 'Dubai, UAE',
    status: 'Active Project',
    contract_type: 'Lump Sum',
    currency: 'AED',
    subcontractors: [],
    third_parties: [],
  },
]

export const PROJECT_STATUSES = ['Active Project', 'On Hold', 'Completed', 'Cancelled']
export const CONTRACT_TYPES = ['Lump Sum', 'Remeasurable', 'Cost Plus', 'Design & Build', 'Management Contract', 'Framework']
export const CURRENCIES = ['AED', 'USD', 'GBP', 'EUR', 'SAR', 'QAR', 'KWD', 'BHD', 'OMR']
export const THIRD_PARTY_ROLES = ['Authority', 'Utility Provider', 'Nominated Supplier', 'Nominated Subcontractor', 'Third Party Inspector', 'Other']

export const BLANK_PROJECT = {
  project_code: '',
  project_name: '',
  project_number: '',
  contract_number: '',
  contract_type: 'Lump Sum',
  contract_value: '',
  currency: 'AED',
  client: '',
  consultant: '',
  contractor: 'Axion Imagineering Construction Co. W.L.L',
  location: '',
  start_date: '',
  end_date: '',
  original_duration: '',
  project_manager: '',
  site_engineer: '',
  qaqc_engineer: '',
  planning_engineer: '',
  client_contact_name: '',
  client_contact_email: '',
  client_contact_phone: '',
  consultant_contact_name: '',
  consultant_contact_email: '',
  consultant_contact_phone: '',
  client_logo: '',
  consultant_logo: '',
  subcontractors: [],
  third_parties: [],
  notes: '',
  status: 'Active Project',
}

export const projectService = {
  async list() {
    const { data, error } = await supabase.from(TABLE).select('*').order('project_code')
    if (error || !data?.length) return PROJECT_SEED
    return data
  },

  async get(id) {
    const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).single()
    if (error) return PROJECT_SEED.find(p => p.id === id) || null
    return data
  },

  async getByCode(code) {
    const { data, error } = await supabase.from(TABLE).select('*').eq('project_code', code).single()
    if (error) return PROJECT_SEED.find(p => p.project_code === code) || null
    return data
  },

  async create(project) {
    const { data, error } = await supabase.from(TABLE).insert(project).select().single()
    if (error) throw error
    return data
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from(TABLE)
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },
}
