import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Search, ChevronDown, X } from 'lucide-react'
import { useProject } from '../context/ProjectContext'
import { searchService } from '../services/searchService'

const PAGE_TITLES = {
  '/': 'Dashboard', '/mrfs': 'Material Requests', '/procurement': 'Procurement',
  '/delivery': 'Delivery Tracking', '/shop-drawings': 'Shop Drawings',
  '/submittals': 'Document Submittals', '/rfi': 'Request For Information',
  '/drawing-register': 'Drawing Register', '/document-register': 'Document Register',
  '/mac': 'Material Approval', '/mockup': 'Mock-up Inspection',
  '/ir': 'Activity Inspection', '/subcontractor': 'Sub-contractor Approval',
  '/suppliers': 'Supplier Register', '/projects': 'Project Register',
  '/dar': 'Daily Activity Report', '/analytics': 'Analytics',
}

function getItemLabel(item) {
  const nf = item._numberField
  const number = item[nf] || ''
  const desc = item.material_desc || item.subject || item.title || item.drawing_title
    || item.supplier_name || item.subcontractor_name || item.mockup_desc
    || item.description || item.project_name || ''
  return { number, desc }
}

export default function Topbar() {
  const { activeProject, selectProject, projects } = useProject()
  const [showProjects, setShowProjects] = useState(false)
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const searchRef = useRef(null)
  const title = PAGE_TITLES[location.pathname] || 'APCP'

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (search.trim().length < 2) { setResults([]); setShowResults(false); return }
      setSearching(true)
      const res = await searchService.global(activeProject.code, search)
      setResults(res)
      setShowResults(true)
      setSearching(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [search, activeProject])

  useEffect(() => {
    function handleClick(e) {
      if (!searchRef.current?.contains(e.target)) setShowResults(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function goTo(route) { navigate(route); setSearch(''); setShowResults(false) }

  return (
    <header className="topbar">
      <span className="topbar-page-title">{title}</span>

      {/* Project Selector */}
      <div style={{ position: 'relative' }}>
        <button className="topbar-project-selector" onClick={() => setShowProjects(p => !p)}>
          <span className="topbar-project-code">{activeProject?.project_code}</span>
          <span style={{ fontSize: 13 }}>{activeProject?.project_name}</span>
          <ChevronDown size={13} color="var(--text-muted)" />
        </button>
        {showProjects && (
          <>
            <div onClick={() => setShowProjects(false)} style={{ position: 'fixed', inset: 0, zIndex: 99 }} />
            <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', zIndex: 100, minWidth: 240, overflow: 'hidden' }}>
              {projects.map(p => (
                <button key={p.id} onClick={() => { selectProject(p); setShowProjects(false) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px', background: p.project_code === activeProject?.project_code ? 'var(--bg-base)' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--brand-accent)', background: 'rgba(232,160,32,0.12)', padding: '2px 6px', borderRadius: 4 }}>{p.project_code}</span>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{p.project_name}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Global Search */}
      <div ref={searchRef} style={{ position: 'relative', flex: 1, maxWidth: 440 }}>
        <div style={{ position: 'relative' }}>
          <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', width: 14, height: 14 }} />
          <input value={search} onChange={e => setSearch(e.target.value)} onFocus={() => results.length && setShowResults(true)}
            placeholder="Search everything — MRF, RFI, drawing, supplier, activity…"
            style={{ width: '100%', padding: '7px 32px 7px 32px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--bg-base)', fontSize: 13, color: 'var(--text-primary)', outline: 'none' }} />
          {search && (
            <button onClick={() => { setSearch(''); setShowResults(false) }}
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}>
              <X size={13} />
            </button>
          )}
        </div>

        {showResults && (
          <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', zIndex: 200, maxHeight: 400, overflowY: 'auto' }}>
            {searching ? (
              <div style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text-muted)' }}>Searching…</div>
            ) : !results.length ? (
              <div style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text-muted)' }}>No results for "{search}"</div>
            ) : (
              <>
                <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
                  {results.length} result{results.length > 1 ? 's' : ''} — ranked by relevance
                </div>
                {results.map((item, i) => {
                  const { number, desc } = getItemLabel(item)
                  return (
                    <button key={i} onClick={() => goTo(item._route)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid var(--border)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-base)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                      <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', minWidth: 80 }}>{item._domain}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: 'var(--brand-accent)', whiteSpace: 'nowrap' }}>{number}</span>
                      <span style={{ fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>{desc}</span>
                      {item.activity_id && <span style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{item.activity_id}</span>}
                    </button>
                  )
                })}
              </>
            )}
          </div>
        )}
      </div>

      <div className="topbar-right">
        <div style={{ fontSize: 11, background: 'rgba(232,160,32,0.1)', color: 'var(--brand-accent)', padding: '3px 8px', borderRadius: 4, fontWeight: 600, fontFamily: 'var(--font-mono)' }}>v3.0</div>
      </div>
    </header>
  )
}
