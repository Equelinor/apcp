import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard, FileText, ShoppingCart, Truck,
  FolderOpen, FileSearch, MessageSquare, BookOpen,
  ClipboardCheck, Layers, Flag, AlertTriangle,
  HardHat, BarChart2, Activity, Image, Settings, Users,
  LogOut, ChevronDown, ChevronRight
} from 'lucide-react'
import { useState } from 'react'

const NAV = [
  {
    group: 'Core',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
      { to: '/mrfs', label: 'Material Requests', icon: FileText },
      { to: '/procurement', label: 'Procurement', icon: ShoppingCart },
      { to: '/delivery', label: 'Delivery Tracking', icon: Truck },
    ]
  },
  {
    group: 'Document Control',
    items: [
      { to: '/shop-drawings', label: 'Shop Drawings', icon: FolderOpen, soon: true },
      { to: '/submittals', label: 'Doc Submittals', icon: FileSearch, soon: true },
      { to: '/rfi', label: 'RFI', icon: MessageSquare, soon: true },
      { to: '/drawing-register', label: 'Drawing Register', icon: BookOpen, soon: true },
      { to: '/document-register', label: 'Doc Register', icon: FileText, soon: true },
    ]
  },
  {
    group: 'QA / QC',
    items: [
      { to: '/mac', label: 'Material Approval', icon: ClipboardCheck, soon: true },
      { to: '/mockup', label: 'Mock-up Inspection', icon: Layers, soon: true },
      { to: '/mir', label: 'MIR / IR', icon: Flag, soon: true },
      { to: '/ncr', label: 'NCR', icon: AlertTriangle, soon: true },
    ]
  },
  {
    group: 'Site',
    items: [
      { to: '/dar', label: 'Daily Activity Report', icon: HardHat, soon: true },
      { to: '/progress', label: 'Daily Progress', icon: Activity, soon: true },
      { to: '/photos', label: 'Site Photos', icon: Image, soon: true },
    ]
  },
  {
    group: 'Management',
    items: [
      { to: '/analytics', label: 'Analytics', icon: BarChart2, soon: true },
    ]
  },
]

export default function Sidebar() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState({})

  function toggleGroup(group) {
    setCollapsed(prev => ({ ...prev, [group]: !prev[group] }))
  }

  function handleSignOut() {
    signOut()
    navigate('/login')
  }

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

      {/* Nav */}
      <nav style={{ flex: 1, paddingBottom: 16 }}>
        {NAV.map(({ group, items }) => {
          const isCollapsed = collapsed[group]
          return (
            <div key={group} className="sidebar-section">
              <button
                onClick={() => toggleGroup(group)}
                style={{
                  display: 'flex', alignItems: 'center', width: '100%',
                  padding: '6px 20px', background: 'none', border: 'none',
                  cursor: 'pointer'
                }}
              >
                <span className="sidebar-section-label" style={{ flex: 1, padding: 0 }}>
                  {group}
                </span>
                {isCollapsed
                  ? <ChevronRight size={10} color="var(--text-muted)" />
                  : <ChevronDown size={10} color="var(--text-muted)" />
                }
              </button>

              {!isCollapsed && items.map(({ to, label, icon: Icon, soon, exact }) => (
                soon ? (
                  <div key={to} className="sidebar-link" style={{ opacity: 0.35, cursor: 'not-allowed' }}>
                    <Icon size={15} />
                    <span>{label}</span>
                    <span style={{
                      marginLeft: 'auto', fontSize: 9, fontWeight: 700,
                      background: 'rgba(255,255,255,0.1)', color: 'var(--text-muted)',
                      padding: '1px 5px', borderRadius: 4, letterSpacing: '0.04em'
                    }}>SOON</span>
                  </div>
                ) : (
                  <NavLink
                    key={to}
                    to={to}
                    end={exact}
                    className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                  >
                    <Icon size={15} />
                    <span>{label}</span>
                  </NavLink>
                )
              ))}
            </div>
          )
        })}

        <div className="sidebar-divider" style={{ margin: '8px 0' }} />

        <div className="sidebar-section">
          <div className="sidebar-section-label">Admin</div>
          <div className="sidebar-link" style={{ opacity: 0.35, cursor: 'not-allowed' }}>
            <Users size={15} />
            <span>Users</span>
            <span style={{
              marginLeft: 'auto', fontSize: 9, fontWeight: 700,
              background: 'rgba(255,255,255,0.1)', color: 'var(--text-muted)',
              padding: '1px 5px', borderRadius: 4
            }}>SOON</span>
          </div>
          <div className="sidebar-link" style={{ opacity: 0.35, cursor: 'not-allowed' }}>
            <Settings size={15} />
            <span>Settings</span>
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{profile?.name || 'User'}</div>
            <div className="sidebar-user-role">{profile?.role || 'Admin'}</div>
          </div>
          <button onClick={handleSignOut} title="Sign out" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  )
}
