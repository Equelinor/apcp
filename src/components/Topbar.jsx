import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Search, ChevronDown } from 'lucide-react'
import { useProject } from '../context/ProjectContext'

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/mrfs': 'Material Requests',
  '/procurement': 'Procurement',
  '/delivery': 'Delivery Tracking',
  '/shop-drawings': 'Shop Drawings',
  '/submittals': 'Document Submittals',
  '/rfi': 'Request For Information',
  '/drawing-register': 'Drawing Register',
  '/document-register': 'Document Register',
  '/mac': 'Material Approval',
  '/dar': 'Daily Activity Report',
  '/analytics': 'Analytics',
}

export default function Topbar() {
  const { activeProject, selectProject, projects } = useProject()
  const [showProjects, setShowProjects] = useState(false)
  const location = useLocation()
  const title = PAGE_TITLES[location.pathname] || 'APCP'

  return (
    <header className="topbar">
      <span className="topbar-page-title">{title}</span>

      <div style={{ position: 'relative' }}>
        <button
          className="topbar-project-selector"
          onClick={() => setShowProjects(p => !p)}
        >
          <span className="topbar-project-code">{activeProject.code}</span>
          <span style={{ fontSize: 13 }}>{activeProject.name}</span>
          <ChevronDown size={13} color="var(--text-muted)" />
        </button>

        {showProjects && (
          <>
            <div
              onClick={() => setShowProjects(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 99 }}
            />
            <div style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: 0,
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)',
              zIndex: 100, minWidth: 220, overflow: 'hidden'
            }}>
              {projects.map(p => (
                <button
                  key={p.id}
                  onClick={() => { selectProject(p); setShowProjects(false) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', padding: '10px 14px',
                    background: p.id === activeProject.id ? 'var(--bg-base)' : 'transparent',
                    border: 'none', cursor: 'pointer', textAlign: 'left',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
                    color: 'var(--brand-accent)', background: 'rgba(232,160,32,0.12)',
                    padding: '2px 6px', borderRadius: 4
                  }}>{p.code}</span>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="topbar-search">
        <div className="topbar-search-wrap">
          <Search className="topbar-search-icon" />
          <input placeholder="Search MRF, activity, material…" />
        </div>
      </div>

      <div className="topbar-right">
        <div style={{
          fontSize: 11,
          background: 'rgba(232,160,32,0.1)', color: 'var(--brand-accent)',
          padding: '3px 8px', borderRadius: 4, fontWeight: 600,
          fontFamily: 'var(--font-mono)'
        }}>
          v3.0
        </div>
      </div>
    </header>
  )
}
