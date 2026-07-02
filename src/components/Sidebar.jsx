// ════════════════════════════════════════════════════════════
// APCP v1.0 — Sidebar (Master Information Architecture)
// 9-section lifecycle: Setup → Doc Control → Procurement →
//   Site Execution → QAQC → Project Controls → HSE → Closeout → Admin
// Routes are unchanged — only the grouping is reorganised.
// ════════════════════════════════════════════════════════════
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useProject } from '../context/ProjectContext'
import {
  // Home / workspace
  LayoutDashboard, BarChart,
  // Project Setup
  FolderKanban, BarChart2, Building2, BookOpen, Library, Workflow, Settings,
  // Document Control
  FolderOpen, FileSearch, ClipboardCheck, Layers, FileText, Mail, MessageSquare,
  // Procurement
  ShoppingCart, ClipboardList, Truck, Package, TrendingUp,
  // Site Execution
  HardHat, Flag, Eye, Camera, Users, Wrench,
  // QAQC
  Shield, CheckSquare,
  // Project Controls
  Clock, AlertTriangle, DollarSign,
  // Closeout
  CheckCircle, Archive, FileBox, Key,
  // Admin
  // UI
  Bell, ChevronDown, ChevronRight, LogOut,
} from 'lucide-react'
import { useState } from 'react'

// ── Navigation structure (master IA v1.0) ─────────────────
const NAV = [
  {
    group: 'HOME',
    emoji: '🏠',
    defaultOpen: true,
    items: [
      { to: '/',          label: 'My Workspace',       icon: LayoutDashboard, exact: true },
      { to: '/executive', label: 'Executive Snapshot', icon: BarChart,        soon: true  },
    ],
  },
  {
    group: '1 · PROJECT SETUP',
    emoji: '🏗',
    defaultOpen: true,
    items: [
      { to: '/projects',  label: 'Project Information', icon: FolderKanban  },
      { to: '/boq',       label: 'BOQ Register',        icon: BarChart2     },
      { to: '/suppliers', label: 'Supplier Register',   icon: Building2     },
      { to: '/stakeholders',      label: 'Stakeholders',         icon: Users,     soon: true },
      { to: '/directory',         label: 'Project Directory',    icon: BookOpen,  soon: true },
      { to: '/workflow-config',   label: 'Workflow Config',      icon: Workflow,  soon: true },
      { to: '/project-settings',  label: 'Project Settings',     icon: Settings,  soon: true },
    ],
  },
  {
    group: '2 · DOCUMENT CONTROL',
    emoji: '📄',
    defaultOpen: false,
    items: [
      { to: '/drawing-register',  label: 'Drawing Register',      icon: BookOpen       },
      { to: '/shop-drawings',     label: 'Shop Drawings',         icon: FolderOpen     },
      { to: '/submittals',        label: 'Technical Submittals',  icon: FileSearch     },
      { to: '/mac',               label: 'Material Approval (MAC)', icon: ClipboardCheck },
      { to: '/mar',               label: 'MAR Register',            icon: FileSearch     },
      { to: '/mockup',            label: 'Sample Submittals',       icon: Layers         },
      { to: '/document-register', label: 'Document Register',     icon: Library        },
      { to: '/transmittals',      label: 'Transmittals',          icon: FileText,      soon: true },
      { to: '/corr-in',           label: 'Correspondence IN',     icon: Mail,          soon: true },
      { to: '/corr-out',          label: 'Correspondence OUT',    icon: Mail,          soon: true },
      { to: '/minutes',           label: 'Meeting Minutes',       icon: MessageSquare, soon: true },
    ],
  },
  {
    group: '3 · PROCUREMENT',
    emoji: '🛒',
    defaultOpen: false,
    items: [
      { to: '/mrfs',        label: 'Material Requests',    icon: FileText      },
      { to: '/procurement', label: 'Purchase Orders',      icon: ClipboardList },
      { to: '/delivery',    label: 'Delivery Tracking',    icon: Truck         },
      { to: '/purchase-requests', label: 'Purchase Requests',   icon: ShoppingCart, soon: true },
      { to: '/receiving',         label: 'Material Receiving',  icon: Package,      soon: true },
      { to: '/supplier-perf',     label: 'Supplier Performance',icon: TrendingUp,   soon: true },
    ],
  },
  {
    group: '4 · SITE EXECUTION',
    emoji: '🚧',
    defaultOpen: false,
    items: [
      { to: '/dar',              label: 'Daily Activity Report', icon: HardHat    },
      { to: '/site-instructions',label: 'Site Instructions',     icon: Flag,      soon: true },
      { to: '/site-observations',label: 'Site Observations',     icon: Eye,       soon: true },
      { to: '/site-photos',      label: 'Site Photos',           icon: Camera,    soon: true },
      { to: '/labour',           label: 'Labour Summary',        icon: Users,     soon: true },
      { to: '/equipment',        label: 'Equipment Log',         icon: Wrench,    soon: true },
    ],
  },
  {
    group: '5 · QA / QC',
    emoji: '✅',
    defaultOpen: false,
    items: [
      { to: '/ir',           label: 'Inspection Requests',   icon: ClipboardCheck },
      { to: '/rfi',          label: 'RFIs',                  icon: MessageSquare  },
      { to: '/mir',          label: 'Material Inspection',   icon: Package,        soon: true },
      { to: '/alt-material', label: 'Alt. Material Request', icon: Layers,         soon: true },
      { to: '/ncr',          label: 'NCR',                   icon: Shield,         soon: true },
      { to: '/punchlist',    label: 'Punch List',            icon: CheckSquare,    soon: true },
      { to: '/quality',      label: 'Quality Dashboard',     icon: BarChart,       soon: true },
    ],
  },
  {
    group: '6 · PROJECT CONTROLS',
    emoji: '📊',
    defaultOpen: false,
    items: [
      { to: '/boq',              label: 'Progress Monitoring',   icon: TrendingUp     },
      { to: '/procurement-status',label: 'Procurement Status',   icon: ShoppingCart,  soon: true },
      { to: '/doc-status',       label: 'Document Status',       icon: FileSearch,    soon: true },
      { to: '/delays',           label: 'Delay Register',        icon: Clock,         soon: true },
      { to: '/risks',            label: 'Risk Register',         icon: AlertTriangle, soon: true },
      { to: '/commercial',       label: 'Commercial Dashboard',  icon: DollarSign,    soon: true },
      { to: '/reports',          label: 'Executive Dashboard',   icon: BarChart,      soon: true },
    ],
  },
  {
    group: '7 · HSE',
    emoji: '🦺',
    defaultOpen: false,
    items: [
      { to: '/incidents',     label: 'Incident Reports', icon: AlertTriangle, soon: true },
      { to: '/safety-notices',label: 'Safety Notices',   icon: Bell,          soon: true },
      { to: '/toolbox',       label: 'Toolbox Talks',    icon: HardHat,       soon: true },
      { to: '/hse-dashboard', label: 'HSE Dashboard',    icon: Shield,        soon: true },
    ],
  },
  {
    group: '8 · CLOSEOUT',
    emoji: '📦',
    defaultOpen: false,
    items: [
      { to: '/snagging',       label: 'Snagging',            icon: CheckCircle, soon: true },
      { to: '/desnagging',     label: 'De-snagging',         icon: CheckSquare, soon: true },
      { to: '/asbuilt',        label: 'As-Built Drawings',   icon: Archive,     soon: true },
      { to: '/om-manuals',     label: 'O&M Manuals',         icon: Key,         soon: true },
      { to: '/handover',       label: 'Handover Documents',  icon: FileBox,     soon: true },
      { to: '/closeout-report',label: 'Closeout Report',     icon: FileText,    soon: true },
    ],
  },
  {
    group: '9 · ADMINISTRATION',
    emoji: '⚙',
    defaultOpen: false,
    adminOnly: true,
    items: [
      { to: '/users',               label: 'Users',              icon: Users,         soon: true },
      { to: '/roles',               label: 'Roles & Permissions',icon: Shield,        soon: true },
      { to: '/workflow-templates',  label: 'Workflow Templates', icon: Workflow,      soon: true },
      { to: '/numbering',           label: 'Numbering Rules',    icon: ClipboardList, soon: true },
      { to: '/company-settings',    label: 'Company Settings',   icon: Building2,     soon: true },
      { to: '/audit',               label: 'Audit Logs',         icon: FileSearch,    soon: true },
    ],
  },
]

// ── Component ──────────────────────────────────────────────
export default function Sidebar() {
  const { profile, signOut } = useAuth()
  const { activeProject } = useProject()
  const navigate  = useNavigate()
  const location  = useLocation()

  const isAdmin = ['Admin', 'Manager'].includes(profile?.role)

  const visibleNav = NAV.filter(g => !g.adminOnly || isAdmin)

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
        {visibleNav.map(({ group, emoji, items }) => {
          const isOpen   = !collapsed[group]
          const hasActive = items.some(i =>
            !i.soon && (i.exact
              ? location.pathname === i.to
              : location.pathname.startsWith(i.to) && i.to !== '/')
          )

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
                <span className="sidebar-section-label" style={{
                  flex: 1, padding: 0, fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
                  color: hasActive ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.35)',
                }}>
                  {group}
                </span>
                {isOpen
                  ? <ChevronDown  size={9} color="rgba(255,255,255,0.3)" />
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
