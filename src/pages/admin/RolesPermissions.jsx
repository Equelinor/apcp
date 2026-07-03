import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast, ToastContainer } from '../../utils/toast'
import Modal from '../../components/Modal'
import { employeeService } from '../../services/employeeService'
import { userService } from '../../services/userService'
import { roleService } from '../../services/roleService'
import { permissionService } from '../../services/permissionService'
import { projectAssignmentService } from '../../services/projectAssignmentService'
import { signatureService } from '../../services/signatureService'
import { projectService } from '../../services/projectService'
import {
  PERMISSION_MODULES, PERMISSION_ACTIONS, EMPLOYEE_STATUSES,
  ACCOUNT_STATUSES, ASSIGNMENT_STATUSES, DEPARTMENTS,
} from '../../config/peopleAccessConfig'
import { Plus, Pencil, Trash2, Upload, Image, Shield, UserCircle2, Users, Briefcase, PenTool, DollarSign } from 'lucide-react'

const TABS = [
  { id: 'roles',       label: 'Roles & Permissions', icon: Shield },
  { id: 'employees',   label: 'Employee Register',   icon: UserCircle2 },
  { id: 'users',       label: 'User Accounts',       icon: Users },
  { id: 'assignments', label: 'Project Assignments', icon: Briefcase },
  { id: 'signatures',  label: 'Digital Signatures',  icon: PenTool },
  { id: 'cost',        label: 'Cost Allocation',      icon: DollarSign },
]

export default function RolesPermissions() {
  const { profile } = useAuth()
  const { toasts, toast } = useToast()
  const [tab, setTab] = useState('roles')

  if (profile?.role === 'Viewer') {
    return (
      <div style={{ padding: 40, color: 'var(--text-muted)', fontSize: 14 }}>
        You don't have access to Roles &amp; Permissions.
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Roles &amp; Permissions</div>
          <div className="page-subtitle">People &amp; access governance — employees, accounts, roles, project teams, signatures</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', cursor: 'pointer', padding: '10px 16px',
            fontSize: 12.5, fontWeight: tab === t.id ? 700 : 500,
            color: tab === t.id ? 'var(--brand-accent)' : 'var(--text-muted)',
            borderBottom: tab === t.id ? '2px solid var(--brand-accent)' : '2px solid transparent',
            marginBottom: -1,
          }}>
            <t.icon size={13} />{t.label}
          </button>
        ))}
      </div>

      {tab === 'roles' && <RolesTab toast={toast} />}
      {tab === 'employees' && <EmployeesTab toast={toast} />}
      {tab === 'users' && <UsersTab toast={toast} />}
      {tab === 'assignments' && <AssignmentsTab toast={toast} />}
      {tab === 'signatures' && <SignaturesTab toast={toast} />}
      {tab === 'cost' && <CostAllocationTab />}

      <ToastContainer toasts={toasts} />
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// TAB 1 — Roles & Permissions
// ════════════════════════════════════════════════════════════
function RolesTab({ toast }) {
  const [roles, setRoles] = useState([])
  const [grants, setGrants] = useState([])
  const [selectedRole, setSelectedRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showNewRole, setShowNewRole] = useState(false)
  const [newRoleName, setNewRoleName] = useState('')
  const [newRoleDesc, setNewRoleDesc] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const list = await roleService.list()
    setRoles(list)
    if (list.length && !selectedRole) setSelectedRole(list[0])
    setLoading(false)
  }

  useEffect(() => {
    if (selectedRole?.id) loadGrants(selectedRole.id)
    else setGrants([])
  }, [selectedRole])

  async function loadGrants(roleId) {
    const g = await permissionService.listForRole(roleId)
    setGrants(g)
  }

  function isAllowed(module, action) {
    if (selectedRole?.name === 'Admin') return true
    return grants.some(g => g.module === module && g.action === action)
  }

  async function toggleCell(module, action) {
    if (!selectedRole?.id) { toast('Save this role to Supabase first — custom roles need an id before permissions can be set.', 'warn'); return }
    if (selectedRole.name === 'Admin') return
    const allow = !isAllowed(module, action)
    await permissionService.toggle(selectedRole.id, module, action, allow)
    loadGrants(selectedRole.id)
  }

  async function createRole() {
    if (!newRoleName.trim()) { toast('Role name required', 'err'); return }
    try {
      const created = await roleService.create({ name: newRoleName.trim(), description: newRoleDesc, is_system: false })
      toast(`Role "${created.name}" created`, 'ok')
      setShowNewRole(false); setNewRoleName(''); setNewRoleDesc('')
      load()
    } catch (err) {
      toast('Failed — ' + (err.message || 'unknown error'), 'err')
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20 }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-muted)' }}>Roles</div>
          <button className="btn btn-ghost" style={{ padding: '3px 6px' }} onClick={() => setShowNewRole(true)}><Plus size={13} /></button>
        </div>
        {loading ? <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Loading…</div> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {roles.map(r => (
              <button key={r.id || r.name} onClick={() => setSelectedRole(r)} style={{
                textAlign: 'left', padding: '8px 12px', borderRadius: 'var(--radius)', border: 'none', cursor: 'pointer',
                background: selectedRole?.name === r.name ? 'var(--brand-accent)' : 'var(--bg-base)',
                color: selectedRole?.name === r.name ? '#fff' : 'var(--text-primary)',
                fontSize: 12.5, fontWeight: 600,
              }}>
                {r.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        {selectedRole && (
          <>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{selectedRole.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{selectedRole.description || '—'}</div>
              {selectedRole.name === 'Admin' && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, fontStyle: 'italic' }}>Admin always has full access — matrix is locked.</div>
              )}
            </div>
            <div className="table-wrap" style={{ overflowX: 'auto' }}>
              <table style={{ minWidth: 720 }}>
                <thead>
                  <tr>
                    <th style={{ minWidth: 160 }}>Module</th>
                    {PERMISSION_ACTIONS.map(a => <th key={a} style={{ textAlign: 'center', fontSize: 10.5 }}>{a}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {PERMISSION_MODULES.map(m => (
                    <tr key={m}>
                      <td style={{ fontSize: 12, fontWeight: 600 }}>{m}</td>
                      {PERMISSION_ACTIONS.map(a => (
                        <td key={a} style={{ textAlign: 'center' }}>
                          <input type="checkbox" checked={isAllowed(m, a)} onChange={() => toggleCell(m, a)}
                            disabled={selectedRole.name === 'Admin'} style={{ cursor: selectedRole.name === 'Admin' ? 'default' : 'pointer' }} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <Modal open={showNewRole} onClose={() => setShowNewRole(false)} title="New Role"
        footer={<><button className="btn btn-secondary" onClick={() => setShowNewRole(false)}>Cancel</button><button className="btn btn-primary" onClick={createRole}>Create</button></>}>
        <div className="form-group" style={{ marginBottom: 14 }}>
          <label className="form-label required">Role Name</label>
          <input className="form-input" value={newRoleName} onChange={e => setNewRoleName(e.target.value)} placeholder="e.g. Surveyor" />
        </div>
        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea className="form-textarea" rows={2} value={newRoleDesc} onChange={e => setNewRoleDesc(e.target.value)} />
        </div>
      </Modal>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// TAB 2 — Employee Register
// ════════════════════════════════════════════════════════════
const BLANK_EMPLOYEE = {
  employee_no: '', full_name: '', designation: '', department: '',
  email: '', phone: '', date_of_joining: '', company: 'Axion Imagineering Construction Co. W.L.L.',
  status: 'Active', remarks: '',
}

function EmployeesTab({ toast }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(BLANK_EMPLOYEE)
  const [search, setSearch] = useState('')

  useEffect(() => { load() }, [])
  async function load() { setLoading(true); setItems(await employeeService.list()); setLoading(false) }

  function openNew() { setEditItem(null); setForm(BLANK_EMPLOYEE); setShowForm(true) }
  function openEdit(item) { setEditItem(item); setForm({ ...item }); setShowForm(true) }
  function set(f, v) { setForm(p => ({ ...p, [f]: v })) }

  async function save() {
    if (!form.employee_no || !form.full_name) { toast('Employee No. and Full Name are required', 'err'); return }
    try {
      if (editItem) {
        await employeeService.update(editItem.id, form)
        toast('Employee updated ✓', 'ok')
      } else {
        await employeeService.create(form)
        toast(`Employee ${form.employee_no} added ✓`, 'ok')
      }
      setShowForm(false)
      load()
    } catch (err) {
      toast('Save failed — ' + (err.message?.includes('duplicate') ? 'Employee No. already exists' : (err.message || 'unknown error')), 'err')
    }
  }

  async function deactivate(item) {
    if (!confirm(`Mark ${item.full_name} as Inactive? (Employees are never deleted.)`)) return
    await employeeService.deactivate(item.id)
    toast('Marked Inactive', 'warn')
    load()
  }

  const filtered = items.filter(e => {
    if (!search) return true
    const q = search.toLowerCase()
    return [e.employee_no, e.full_name, e.designation, e.department, e.email].some(v => (v || '').toLowerCase().includes(q))
  })

  return (
    <div>
      <div className="filter-bar" style={{ marginBottom: 12 }}>
        <input placeholder="Search employee no, name, designation…" value={search} onChange={e => setSearch(e.target.value)} style={{ minWidth: 280 }} />
        <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={openNew}><Plus size={14} /> New Employee</button>
      </div>

      <div className="table-wrap">
        {loading ? <div className="table-empty">Loading…</div> : !filtered.length ? <div className="table-empty">No employees yet.</div> : (
          <table>
            <thead>
              <tr>
                <th>Employee No.</th><th>Full Name</th><th>Designation</th><th>Department</th>
                <th>Email</th><th>Phone</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => (
                <tr key={e.id} style={{ opacity: e.status === 'Inactive' ? 0.55 : 1 }}>
                  <td><span className="doc-number">{e.employee_no}</span></td>
                  <td style={{ fontWeight: 600, fontSize: 12.5 }}>{e.full_name}</td>
                  <td style={{ fontSize: 12 }}>{e.designation || '—'}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{e.department || '—'}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{e.email || '—'}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{e.phone || '—'}</td>
                  <td>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: e.status === 'Active' ? '#D1FAE5' : '#F1F5F9', color: e.status === 'Active' ? '#065F46' : '#64748B' }}>{e.status}</span>
                  </td>
                  <td>
                    <button className="btn btn-ghost" style={{ padding: '3px 6px' }} onClick={() => openEdit(e)}><Pencil size={12} /></button>
                    {e.status === 'Active' && <button className="btn btn-ghost" style={{ padding: '3px 6px', color: 'var(--status-rejected-text)' }} onClick={() => deactivate(e)}><Trash2 size={12} /></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editItem ? `Edit — ${editItem.employee_no}` : 'New Employee'} size="lg"
        footer={<><button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button><button className="btn btn-primary" onClick={save}>Save</button></>}>
        <div className="form-grid form-grid-2" style={{ gap: 14, marginBottom: 14 }}>
          <div className="form-group">
            <label className="form-label required">Employee No.</label>
            <input className="form-input" value={form.employee_no} onChange={e => set('employee_no', e.target.value)} placeholder="Must be unique" style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }} />
          </div>
          <div className="form-group">
            <label className="form-label required">Full Name</label>
            <input className="form-input" value={form.full_name} onChange={e => set('full_name', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Designation</label>
            <input className="form-input" value={form.designation} onChange={e => set('designation', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Department</label>
            <select className="form-select" value={form.department} onChange={e => set('department', e.target.value)}>
              <option value="">— Select —</option>
              {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input className="form-input" value={form.phone} onChange={e => set('phone', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Date of Joining</label>
            <input className="form-input" type="date" value={form.date_of_joining} onChange={e => set('date_of_joining', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Company</label>
            <input className="form-input" value={form.company} onChange={e => set('company', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
              {EMPLOYEE_STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Remarks</label>
          <textarea className="form-textarea" rows={2} value={form.remarks} onChange={e => set('remarks', e.target.value)} />
        </div>
      </Modal>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// TAB 3 — User Accounts
// ════════════════════════════════════════════════════════════
function UsersTab({ toast }) {
  const [users, setUsers] = useState([])
  const [employees, setEmployees] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [editItem, setEditItem] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ role: 'Viewer', employee_id: '', account_status: 'Active' })

  useEffect(() => { load() }, [])
  async function load() {
    setLoading(true)
    const [u, e, r] = await Promise.all([userService.list(), employeeService.dropdown(), roleService.list()])
    setUsers(u); setEmployees(e); setRoles(r)
    setLoading(false)
  }

  function openEdit(u) {
    setEditItem(u)
    setForm({ role: u.role || 'Viewer', employee_id: u.employee_id || '', account_status: u.account_status || 'Active' })
    setShowForm(true)
  }

  async function save() {
    try {
      await userService.update(editItem.id, {
        role: form.role,
        employee_id: form.employee_id || null,
        account_status: form.account_status,
      })
      toast('Account updated ✓', 'ok')
      setShowForm(false)
      load()
    } catch (err) {
      toast('Save failed — ' + (err.message || 'unknown error'), 'err')
    }
  }

  async function sendReset(u) {
    if (!u.email) { toast('No email on this account', 'err'); return }
    try {
      await userService.resetPassword(u.email)
      toast(`Reset link sent to ${u.email}`, 'ok')
    } catch (err) {
      toast('Failed — ' + (err.message || 'unknown error'), 'err')
    }
  }

  const employeeName = (id) => employees.find(e => e.id === id)?.full_name || '—'

  return (
    <div>
      <div style={{ background: 'var(--bg-base)', borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: 14, fontSize: 12, color: 'var(--text-muted)' }}>
        Accounts are created by employees themselves at <span style={{ fontFamily: 'var(--font-mono)' }}>/signup</span> (their email must already exist in the Employee Register). Manage their role, employee link, and status here.
      </div>
      <div className="table-wrap">
        {loading ? <div className="table-empty">Loading…</div> : !users.length ? <div className="table-empty">No accounts yet.</div> : (
          <table>
            <thead>
              <tr>
                <th>Name</th><th>Email</th><th>Linked Employee</th><th>Role</th>
                <th>Status</th><th>Last Login</th><th></th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ opacity: u.account_status === 'Disabled' ? 0.55 : 1 }}>
                  <td style={{ fontWeight: 600, fontSize: 12.5 }}>{u.name || '—'}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.email || '—'}</td>
                  <td style={{ fontSize: 12 }}>{employeeName(u.employee_id)}</td>
                  <td><span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: '#DBEAFE', color: '#1E40AF' }}>{u.role}</span></td>
                  <td>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: u.account_status === 'Disabled' ? '#FEE2E2' : '#D1FAE5', color: u.account_status === 'Disabled' ? '#991B1B' : '#065F46' }}>{u.account_status || 'Active'}</span>
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.last_login ? new Date(u.last_login).toLocaleString() : 'Never'}</td>
                  <td>
                    <button className="btn btn-ghost" style={{ padding: '3px 6px' }} onClick={() => openEdit(u)}><Pencil size={12} /></button>
                    <button className="btn btn-ghost" style={{ padding: '3px 6px', fontSize: 10.5 }} onClick={() => sendReset(u)}>Send Reset</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={`Edit — ${editItem?.name || ''}`}
        footer={<><button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button><button className="btn btn-primary" onClick={save}>Save</button></>}>
        <div className="form-group" style={{ marginBottom: 14 }}>
          <label className="form-label">Linked Employee</label>
          <select className="form-select" value={form.employee_id} onChange={e => setForm(p => ({ ...p, employee_id: e.target.value }))}>
            <option value="">— None —</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.employee_no} — {e.full_name}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ marginBottom: 14 }}>
          <label className="form-label">Role</label>
          <select className="form-select" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
            {roles.map(r => <option key={r.name} value={r.name}>{r.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Account Status</label>
          <select className="form-select" value={form.account_status} onChange={e => setForm(p => ({ ...p, account_status: e.target.value }))}>
            {ACCOUNT_STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </Modal>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// TAB 4 — Project Assignments
// ════════════════════════════════════════════════════════════
const BLANK_ASSIGNMENT = {
  employee_id: '', project_role: '', start_date: '', end_date: '',
  status: 'Active', reporting_to: '', remarks: '',
}

function AssignmentsTab({ toast }) {
  const [projects, setProjects] = useState([])
  const [projectCode, setProjectCode] = useState('')
  const [assignments, setAssignments] = useState([])
  const [employees, setEmployees] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(BLANK_ASSIGNMENT)

  useEffect(() => { init() }, [])
  useEffect(() => { if (projectCode) loadAssignments() }, [projectCode])

  async function init() {
    setLoading(true)
    const [p, e, r] = await Promise.all([projectService.list(), employeeService.dropdown(), roleService.list()])
    setProjects(p); setEmployees(e); setRoles(r)
    if (p.length) setProjectCode(p[0].project_code)
    setLoading(false)
  }

  async function loadAssignments() {
    setAssignments(await projectAssignmentService.listForProject(projectCode))
  }

  function openNew() { setEditItem(null); setForm(BLANK_ASSIGNMENT); setShowForm(true) }
  function openEdit(a) { setEditItem(a); setForm({ ...a }); setShowForm(true) }

  async function save() {
    if (!form.employee_id) { toast('Employee is required', 'err'); return }
    try {
      if (editItem) {
        await projectAssignmentService.update(editItem.id, form)
        toast('Assignment updated ✓', 'ok')
      } else {
        await projectAssignmentService.create({ ...form, project_code: projectCode })
        toast('Employee assigned to project ✓', 'ok')
      }
      setShowForm(false)
      loadAssignments()
    } catch (err) {
      toast('Save failed — ' + (err.message || 'unknown error'), 'err')
    }
  }

  async function endAssignment(a) {
    if (!confirm('End this assignment?')) return
    await projectAssignmentService.end(a.id)
    toast('Assignment ended', 'warn')
    loadAssignments()
  }

  const employeeName = (id) => employees.find(e => e.id === id)?.full_name || '—'

  return (
    <div>
      <div className="filter-bar" style={{ marginBottom: 12 }}>
        <select className="form-select" style={{ minWidth: 260 }} value={projectCode} onChange={e => setProjectCode(e.target.value)}>
          {projects.map(p => <option key={p.project_code} value={p.project_code}>{p.project_code} — {p.project_name}</option>)}
        </select>
        <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={openNew}><Plus size={14} /> Assign Employee</button>
      </div>

      <div className="table-wrap">
        {loading ? <div className="table-empty">Loading…</div> : !assignments.length ? <div className="table-empty">No one assigned to this project yet.</div> : (
          <table>
            <thead>
              <tr>
                <th>Employee</th><th>Project Role</th><th>Start</th><th>End</th>
                <th>Status</th><th>Reporting To</th><th>Remarks</th><th></th>
              </tr>
            </thead>
            <tbody>
              {assignments.map(a => (
                <tr key={a.id} style={{ opacity: a.status === 'Ended' ? 0.55 : 1 }}>
                  <td style={{ fontWeight: 600, fontSize: 12.5 }}>{employeeName(a.employee_id)}</td>
                  <td style={{ fontSize: 12 }}>{a.project_role || '—'}</td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.start_date || '—'}</td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.end_date || '—'}</td>
                  <td>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: a.status === 'Active' ? '#D1FAE5' : '#F1F5F9', color: a.status === 'Active' ? '#065F46' : '#64748B' }}>{a.status}</span>
                  </td>
                  <td style={{ fontSize: 12 }}>{a.reporting_to ? employeeName(a.reporting_to) : '—'}</td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.remarks || '—'}</td>
                  <td>
                    <button className="btn btn-ghost" style={{ padding: '3px 6px' }} onClick={() => openEdit(a)}><Pencil size={12} /></button>
                    {a.status === 'Active' && <button className="btn btn-ghost" style={{ padding: '3px 6px', color: 'var(--status-rejected-text)' }} onClick={() => endAssignment(a)}><Trash2 size={12} /></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editItem ? 'Edit Assignment' : 'Assign Employee to Project'}
        footer={<><button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button><button className="btn btn-primary" onClick={save}>Save</button></>}>
        <div className="form-grid form-grid-2" style={{ gap: 14, marginBottom: 14 }}>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label required">Employee</label>
            <select className="form-select" value={form.employee_id} onChange={e => setForm(p => ({ ...p, employee_id: e.target.value }))}>
              <option value="">— Select —</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.employee_no} — {e.full_name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Project Role</label>
            <select className="form-select" value={form.project_role} onChange={e => setForm(p => ({ ...p, project_role: e.target.value }))}>
              <option value="">— Select —</option>
              {roles.map(r => <option key={r.name} value={r.name}>{r.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Reporting To</label>
            <select className="form-select" value={form.reporting_to} onChange={e => setForm(p => ({ ...p, reporting_to: e.target.value }))}>
              <option value="">— None —</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Start Date</label>
            <input className="form-input" type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">End Date</label>
            <input className="form-input" type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-select" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
              {ASSIGNMENT_STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Remarks</label>
          <textarea className="form-textarea" rows={2} value={form.remarks} onChange={e => setForm(p => ({ ...p, remarks: e.target.value }))} />
        </div>
      </Modal>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// TAB 5 — Digital Signatures
// ════════════════════════════════════════════════════════════
function SignaturesTab({ toast }) {
  const [signatures, setSignatures] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [employeeId, setEmployeeId] = useState('')
  const [preview, setPreview] = useState('')
  const fileRef = useRef()

  useEffect(() => { load() }, [])
  async function load() {
    setLoading(true)
    const [s, e] = await Promise.all([signatureService.listAll(), employeeService.dropdown()])
    setSignatures(s); setEmployees(e)
    setLoading(false)
  }

  function pickFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setPreview(reader.result)
    reader.readAsDataURL(file)
  }

  async function save() {
    if (!employeeId || !preview) { toast('Select an employee and upload a signature image', 'err'); return }
    try {
      await signatureService.upload(employeeId, preview, 'Admin')
      toast('Signature uploaded ✓', 'ok')
      setShowForm(false); setEmployeeId(''); setPreview('')
      load()
    } catch (err) {
      toast('Upload failed — ' + (err.message || 'unknown error'), 'err')
    }
  }

  const employeeName = (id) => employees.find(e => e.id === id)?.full_name || '—'

  return (
    <div>
      <div style={{ background: 'var(--bg-base)', borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: 14, fontSize: 12, color: 'var(--text-muted)' }}>
        Prepared for future PDF output (Name / Designation / Signature / Date) — not yet applied to any printed form.
      </div>
      <div className="filter-bar" style={{ marginBottom: 12 }}>
        <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={() => setShowForm(true)}><Upload size={14} /> Upload Signature</button>
      </div>

      <div className="table-wrap">
        {loading ? <div className="table-empty">Loading…</div> : !signatures.length ? <div className="table-empty">No signatures uploaded yet.</div> : (
          <table>
            <thead>
              <tr><th>Employee</th><th>Signature</th><th>Uploaded Date</th><th>Uploaded By</th><th>Status</th></tr>
            </thead>
            <tbody>
              {signatures.map(s => (
                <tr key={s.id} style={{ opacity: s.active ? 1 : 0.5 }}>
                  <td style={{ fontWeight: 600, fontSize: 12.5 }}>{employeeName(s.employee_id)}</td>
                  <td>{s.signature_image ? <img src={s.signature_image} alt="" style={{ height: 28, background: '#fff', border: '1px solid var(--border)', borderRadius: 4, padding: 2 }} /> : '—'}</td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(s.uploaded_date).toLocaleDateString()}</td>
                  <td style={{ fontSize: 12 }}>{s.uploaded_by || '—'}</td>
                  <td><span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: s.active ? '#D1FAE5' : '#F1F5F9', color: s.active ? '#065F46' : '#64748B' }}>{s.active ? 'Active' : 'Inactive'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Upload Digital Signature"
        footer={<><button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button><button className="btn btn-primary" onClick={save}>Save</button></>}>
        <div className="form-group" style={{ marginBottom: 14 }}>
          <label className="form-label required">Employee</label>
          <select className="form-select" value={employeeId} onChange={e => setEmployeeId(e.target.value)}>
            <option value="">— Select —</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.employee_no} — {e.full_name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label required">Signature Image (transparent PNG)</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {preview
              ? <img src={preview} alt="" style={{ height: 44, background: '#fff', border: '1px solid var(--border)', borderRadius: 6, padding: 4 }} />
              : <div style={{ height: 44, width: 120, border: '1px dashed var(--border)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Image size={16} color="var(--text-muted)" /></div>}
            <button type="button" className="btn btn-secondary" onClick={() => fileRef.current.click()}><Upload size={13} /> Choose File</button>
            <input ref={fileRef} type="file" accept="image/png" style={{ display: 'none' }} onChange={pickFile} />
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// TAB 6 — Cost Allocation (placeholder only)
// ════════════════════════════════════════════════════════════
function CostAllocationTab() {
  return (
    <div style={{ padding: '60px 20px', textAlign: 'center' }}>
      <DollarSign size={32} color="var(--text-muted)" style={{ marginBottom: 12 }} />
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Cost Allocation — Coming Soon</div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 420, margin: '0 auto' }}>
        Future: employee monthly cost, per-project allocation %, overhead cost, and staff cost summary. No salary data is stored yet.
      </div>
    </div>
  )
}
