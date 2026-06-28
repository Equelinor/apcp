export const DEFAULT_DISCIPLINES = [
  'Civil / Structural',
  'Architectural',
  'Mechanical',
  'Electrical',
  'Plumbing',
  'Finishing',
  'Geotechnical',
  'Infrastructure',
]

export function getDisciplines(projectCode) {
  const key = `apcp_disciplines_${projectCode}`
  const stored = localStorage.getItem(key)
  return stored ? JSON.parse(stored) : DEFAULT_DISCIPLINES
}

export function saveDisciplines(projectCode, list) {
  localStorage.setItem(`apcp_disciplines_${projectCode}`, JSON.stringify(list))
}
