import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

const ProjectContext = createContext(null)

export const PROJECTS = [
  { id: 'ant', code: 'ANT', name: 'Al Noor Tower', client: 'Client TBC', consultant: 'Consultant TBC' },
  { id: 'mrs', code: 'MRS', name: 'Marina Residences', client: 'Client TBC', consultant: 'Consultant TBC' },
]

export function ProjectProvider({ children }) {
  const [activeProject, setActiveProject] = useState(() => {
    const saved = localStorage.getItem('apcp_active_project')
    return saved ? JSON.parse(saved) : PROJECTS[0]
  })

  function selectProject(project) {
    setActiveProject(project)
    localStorage.setItem('apcp_active_project', JSON.stringify(project))
  }

  return (
    <ProjectContext.Provider value={{ activeProject, selectProject, projects: PROJECTS }}>
      {children}
    </ProjectContext.Provider>
  )
}

export function useProject() {
  return useContext(ProjectContext)
}
