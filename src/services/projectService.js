import { supabase } from '../supabaseClient'

const TABLE = 'projects'

// Seed — used until real projects are created in Supabase
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
  },
]

export const PROJECT_STATUSES = ['Active Project', 'On Hold', 'Completed', 'Cancelled']

export const BLANK_PROJECT = {
  project_code: '',
  project_name: '',
  project_number: '',
  client: '',
  consultant: '',
  contractor: 'Axion Imagineering Construction Co. W.L.L',
  location: '',
  status: 'Active Project',
}

export const projectService = {
  async list() {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .order('project_code')
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
    const { data, error } = await supabase.from(TABLE).update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single()
    if (error) throw error
    return data
  },
}
