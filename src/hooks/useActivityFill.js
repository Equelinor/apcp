import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { MRF_SEED } from '../pages/mrfs/mrfData'

// Auto-fills form fields from activity ID + optional MRF link
export function useActivityFill(projectCode, activityId, mrfNumber) {
  const [activityData, setActivityData] = useState(null)
  const [mrfData, setMrfData] = useState(null)

  useEffect(() => {
    if (!activityId) { setActivityData(null); return }
    // Pull from MRFs that share this activity ID
    async function fetchActivity() {
      const { data } = await supabase
        .from('mrfs')
        .select('activity_id,activity_name,wbs_code,planned_start,planned_finish,location,zone,programme_ref')
        .eq('project_code', projectCode)
        .eq('activity_id', activityId)
        .limit(1)
      if (data?.length) setActivityData(data[0])
      else {
        const seed = MRF_SEED.find(m => m.project_code === projectCode && m.activity_id === activityId)
        if (seed) setActivityData(seed)
      }
    }
    fetchActivity()
  }, [activityId, projectCode])

  useEffect(() => {
    if (!mrfNumber) { setMrfData(null); return }
    async function fetchMRF() {
      const { data } = await supabase
        .from('mrfs')
        .select('*')
        .eq('project_code', projectCode)
        .eq('mrf_number', mrfNumber)
        .single()
      if (data) setMrfData(data)
      else {
        const seed = MRF_SEED.find(m => m.mrf_number === mrfNumber)
        if (seed) setMrfData(seed)
      }
    }
    fetchMRF()
  }, [mrfNumber, projectCode])

  return { activityData, mrfData }
}

// Get all MRF numbers for a project (for dropdown)
export function useMRFList(projectCode) {
  const [mrfs, setMrfs] = useState([])
  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('mrfs').select('mrf_number,material_desc,activity_id').eq('project_code', projectCode).order('mrf_number')
      setMrfs(data?.length ? data : MRF_SEED.filter(m => m.project_code === projectCode).map(m => ({ mrf_number: m.mrf_number, material_desc: m.material_desc, activity_id: m.activity_id })))
    }
    load()
  }, [projectCode])
  return mrfs
}
