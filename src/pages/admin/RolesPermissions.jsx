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
  ACCOUNT_STATUSES, DEPARTMENTS,
} from '../../config/peopleAccessConfig'
import { Plus, Pencil, Trash2, Upload, Image, Shield, UserCircle2, Users, Briefcase, PenTool, DollarSign } from 'lucide-react'

const TABS = [
  { id: 'roles',       label: 'Roles & Permissions', icon: Shield },
  { id: 'employees',   label: 'Employee Register',   icon: UserCircle2 },
  { id: 'users',       label: 'User Accounts',       icon: Users },
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

  // Signature (folded in from the old separate Digital Signatures tab)
  const [existingSignature, setExistingSignature] = useState(null)
  const [signaturePreview, setSignaturePreview] = useState('')
  const fileRef = useRef()

  // Assigned Projects (folded in from the old separate Project Assignments tab)
  const [allProjects, setAllProjects] = useState([])
  const [assignedCodes, setAssignedCodes] = useState([])

  useEffect(() => { load(); projectService.list().then(setAllProjects) }, [])
  async function load() { setLoading(true); setItems(await employeeService.list()); setLoading(false) }

  function openNew() {
    setEditItem(null); setForm(BLANK_EMPLOYEE)
    setExistingSignature(null); setSignaturePreview(''); setAssignedCodes([])
    setShowForm(true)
  }
  async function openEdit(item) {
    setEditItem(item); setForm({ ...item })
    setSignaturePreview('')
    const [sig, assignments] = await Promise.all([
      signatureService.getForEmployee(item.id),
      projectAssignmentService.listForEmployee(item.id),
    ])
    setExistingSignature(sig)
    setAssignedCodes(assignments.filter(a => a.status !== 'Ended').map(a => a.project_code))
    setShowForm(true)
  }
  function set(f, v) { setForm(p => ({ ...p, [f]: v })) }

  function pickSignatureFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setSignaturePreview(reader.result)
    reader.readAsDataURL(file)
  }

  function toggleProject(code) {
    setAssignedCodes(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code])
  }

  async function save() {
    if (!form.employee_no || !form.full_name) { toast('Employee No. and Full Name are required', 'err'); return }
    try {
      let employeeId = editItem?.id
      if (editItem) {
        await employeeService.update(editItem.id, form)
      } else {
        const created = await employeeService.create(form)
        employeeId = created.id
      }
      if (signaturePreview) await signatureService.upload(employeeId, signaturePreview, 'Admin')
      await projectAssignmentService.setForEmployee(employeeId, assignedCodes)
      toast(editItem ? 'Employee updated ✓' : `Employee ${form.employee_no} added ✓`, 'ok')
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
        <div className="form-group" style={{ marginBottom: 14 }}>
          <label className="form-label">Remarks</label>
          <textarea className="form-textarea" rows={2} value={form.remarks} onChange={e => set('remarks', e.target.value)} />
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <PenTool size={12} /> Digital Signature
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {signaturePreview
              ? <img src={signaturePreview} alt="" style={{ height: 40, background: '#fff', border: '1px solid var(--border)', borderRadius: 6, padding: 4 }} />
              : existingSignature?.signature_image
                ? <img src={existingSignature.signature_image} alt="" style={{ height: 40, background: '#fff', border: '1px solid var(--border)', borderRadius: 6, padding: 4 }} />
                : <div style={{ height: 40, width: 110, border: '1px dashed var(--border)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Image size={16} color="var(--text-muted)" /></div>}
            <button type="button" className="btn btn-secondary" onClick={() => fileRef.current.click()}><Upload size={13} /> {existingSignature || signaturePreview ? 'Replace' : 'Upload'} Signature</button>
            <input ref={fileRef} type="file" accept="image/png" style={{ display: 'none' }} onChange={pickSignatureFile} />
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Briefcase size={12} /> Assigned Projects
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {allProjects.map(p => (
              <label key={p.project_code} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, border: '1px solid var(--border)', borderRadius: 6, padding: '5px 10px' }}>
                <input type="checkbox" checked={assignedCodes.includes(p.project_code)} onChange={() => toggleProject(p.project_code)} />
                {p.project_code} — {p.project_name}
              </label>
            ))}
            {!allProjects.length && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>No projects in Project Register yet.</span>}
          </div>
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
