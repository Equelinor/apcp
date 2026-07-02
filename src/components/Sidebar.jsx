// ════════════════════════════════════════════════════════════
// APCP v3 — Sidebar (Information Architecture v1.0)
// Lifecycle-based navigation: Setup → Execution → Control → Closeout → Admin
// Backend, services, routes, and schema: UNCHANGED
// ════════════════════════════════════════════════════════════
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useProject } from '../context/ProjectContext'
import {
  // Home
  Home, Bell, CheckSquare,
  // Setup
  FolderKanban, BarChart2, BookOpen, Library, Workflow,
  // Execution
  ShoppingCart, FileText, ClipboardCheck, FolderOpen,
  MessageSquare, Flag, HardHat, Truck,
  // Control
  TrendingUp, Shield, BarChart, FileSearch, DollarSign,
  AlertTriangle, Clock, LayoutDashboard,
  // Closeout
  CheckCircle, Archive, FileBox, Key,
  // Admin
  Users, Settings, Building2, ClipboardList, Layers,
  // UI
  ChevronDown, ChevronRight, LogOut,
} from 'lucide-react'
import { useState } from 'react'

// ── Navigation structure ───────────────────────────────────
const NAV = [
  {
    group: 'HOME',
    emoji: '🏠',
    defaultOpen: true,
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    ],
  },
  {
    group: 'PROJECT SETUP',
    emoji: '🏗',
    defaultOpen: true,
    items: [
      { to: '/projects',          label: 'Project Information', icon: FolderKanban },
      { to: '/boq',               label: 'BOQ',                 icon: BarChart2 },
      { to: '/drawing-register',  label: 'Drawings Register',   icon: BookOpen },
      { to: '/document-register', label: 'Document Register',   icon: Library },
      { to: '/suppliers',         label: 'Supplier Register',   icon: Building2 },
    ],
  },
  {
    group: 'EXECUTION',
    emoji: '🚧',
    defaultOpen: true,
    items: [
      { to: '/mrfs',         label: 'Material Requests',    icon: FileText },
      { to: '/procurement',  label: 'Procurement',          icon: ShoppingCart },
      { to: '/delivery',     label: 'Delivery Tracking',    icon: Truck },
      { to: '/mac',          label: 'Material Approvals',   icon: ClipboardCheck },
      { to: '/shop-drawings',label: 'Shop Drawings',        icon: FolderOpen },
      { to: '/submittals',   label: 'Doc Submittals',       icon: FileSearch },
      { to: '/rfi',          label: 'RFIs',                 icon: MessageSquare },
      { to: '/ir',           label: 'Inspection Requests',  icon: Flag },
      { to: '/mockup',       label: 'Mock-up / Sample',     icon: Layers },
      { to: '/subcontractor',label: 'Sub-contractor',       icon: ClipboardList },
      { to: '/dar',          label: 'Daily Activity Report',icon: HardHat },
    ],
  },
  {
    group: 'PROJECT CONTROL',
    emoji: '📊',
    defaultOpen: false,
    items: [
      { to: '/boq',          label: 'Progress Monitoring',  icon: TrendingUp },
      { to: '/ncr',          label: 'Quality / NCR',        icon: Shield,        soon: true },
      { to: '/delays',       label: 'Delay Register',       icon: Clock,         soon: true },
      { to: '/risks',        label: 'Risk Register',        icon: AlertTriangle, soon: true },
      { to: '/commercial',   label: 'Commercial Overview',  icon: DollarSign,    soon: true },
      { to: '/reports',      label: 'Executive Dashboard',  icon: BarChart,      soon: true },
    ],
  },
  {
    group: 'CLOSEOUT',
    emoji: '📦',
    defaultOpen: false,
    items: [
      { to: '/snagging',     label: 'Snagging',             icon: CheckCircle,   soon: true },
      { to: '/handover',     label: 'Handover Documents',   icon: FileBox,       soon: true },
      { to: '/asbuilt',      label: 'As-Built Drawings',    icon: Archive,       soon: true },
      { to: '/om-manuals',   label: 'O&M Manuals',          icon: Key,           soon: true },
    ],
  },
  {
    group: 'ADMINISTRATION',
    emoji: '⚙',
    defaultOpen: false,
    items: [
      { to: '/users',        label: 'Users',                icon: Users,         soon: true },
      { to: '/settings',     label: 'Settings',             icon: Settings,      soon: true },
    ],
  },
]

// ── Component ──────────────────────────────────────────────
export default function Sidebar() {
  const { profile, signOut } = useAuth()
  const { activeProject } = useProject()
  const navigate   = useNavigate()
  const location   = useLocation()

  const [collapsed, setCollapsed] = useState(() => {
    const state = {}
    NAV.forEach(g => { state[g.group] = !g.defaultOpen })
    return state
  })

  function toggle(group) {
    setCollapsed(prev => ({ ...prev, [group]: !prev[group] }))
  }

  function handleSignOut() { signOut(); navigate('/login') }

  const initials = profile?.name
    ? profile.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'AX'

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-text">APCP</div>
        <div className="sidebar-logo-sub">Axion Project Control</div>
      </div>

      {/* Active project chip */}
      {activeProject && (
        <div style={{
          margin: '0 12px 8px',
          background: 'rgba(139,26,26,0.15)',
          border: '1px solid rgba(139,26,26,0.3)',
          borderRadius: 8,
          padding: '6px 10px',
        }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>Active Project</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {activeProject.project_code} — {activeProject.project_name}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav style={{ flex: 1, overflowY: 'auto', paddingBottom: 16 }}>
        {NAV.map(({ group, emoji, items }) => {
          const isOpen = !collapsed[group]
          const hasActive = items.some(i => !i.soon && (i.exact ? location.pathname === i.to : location.pathname.startsWith(i.to) && i.to !== '/'))

          return (
            <div key={group} className="sidebar-section">
              <button
                onClick={() => toggle(group)}
                style={{
                  display: 'flex', alignItems: 'center', width: '100%',
                  padding: '7px 16px 5px', background: 'none', border: 'none', cursor: 'pointer',
                  gap: 6,
                }}
              >
                <span style={{ fontSize: 11 }}>{emoji}</span>
                <span className="sidebar-section-label" style={{ flex: 1, padding: 0, fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: hasActive ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.35)' }}>
                  {group}
                </span>
                {isOpen
                  ? <ChevronDown size={9} color="rgba(255,255,255,0.3)" />
                  : <ChevronRight size={9} color="rgba(255,255,255,0.3)" />
                }
              </button>

              {isOpen && items.map(({ to, label, icon: Icon, soon, exact }) =>
                soon ? (
                  <div key={to} className="sidebar-link" style={{ opacity: 0.28, cursor: 'not-allowed', pointerEvents: 'none' }}>
                    <Icon size={14} />
                    <span style={{ fontSize: 12 }}>{label}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 8, fontWeight: 700, background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.35)', padding: '1px 5px', borderRadius: 3 }}>SOON</span>
                  </div>
                ) : (
                  <NavLink
                    key={to} to={to} end={exact}
                    className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                    style={{ fontSize: 12 }}
                  >
                    <Icon size={14} /><span>{label}</span>
                  </NavLink>
                )
              )}
            </div>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{profile?.name || 'User'}</div>
            <div className="sidebar-user-role">{profile?.role || 'Admin'}</div>
          </div>
          <button
            onClick={handleSignOut}
            title="Sign out"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: 4 }}
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </aside>
  )
}
