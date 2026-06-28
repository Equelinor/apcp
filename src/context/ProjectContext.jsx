import { createContext, useContext, useState, useEffect } from 'react'
import { projectService, PROJECT_SEED } from '../services/projectService'

const ProjectContext = createContext(null)

export function ProjectProvider({ children }) {
  const [projects, setProjects] = useState(PROJECT_SEED)
  const [activeProject, setActiveProject] = useState(() => {
    const saved = localStorage.getItem('apcp_active_project')
    return saved ? JSON.parse(saved) : PROJECT_SEED[0]
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const data = await projectService.list()
      setProjects(data)
      const saved = localStorage.getItem('apcp_active_project')
      if (saved) {
        const savedCode = JSON.parse(saved).project_code
        const fresh = data.find(p => p.project_code === savedCode)
        if (fresh) setActiveProject(fresh)
        else { setActiveProject(data[0]); localStorage.setItem('apcp_active_project', JSON.stringify(data[0])) }
      } else {
        setActiveProject(data[0])
        localStorage.setItem('apcp_active_project', JSON.stringify(data[0]))
      }
      setLoading(false)
    }
    load()
  }, [])

  function selectProject(project) {
    setActiveProject(project)
    localStorage.setItem('apcp_active_project', JSON.stringify(project))
  }

  function refreshProjects() {
    projectService.list().then(setProjects)
  }

  return (
    <ProjectContext.Provider value={{ activeProject, selectProject, projects, loading, refreshProjects }}>
      {children}
    </ProjectContext.Provider>
  )
}

export function useProject() {
  return useContext(ProjectContext)
}
