import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supplierService, SUPPLIER_SEED } from '../../services/supplierService'
import { getNextNumber } from '../../services/numberingService'
import { SUPPLIER_STATUS_LIST, SUPPLIER_CATEGORIES, BLANK_SUPPLIER } from '../../models/Supplier'
import Modal from '../../components/Modal'
import Badge from '../../components/Badge'
import { useToast, ToastContainer } from '../../utils/toast'
import { Plus, Pencil, Phone, Mail } from 'lucide-react'

export default function SupplierRegister() {
  const { profile } = useAuth()
  const { toasts, toast } = useToast()

  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(BLANK_SUPPLIER)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const canEdit = ['Admin', 'Procurement'].includes(profile?.role)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const data = await supplierService.list()
    setSuppliers(data)
    setLoading(false)
  }

  function openNew() { setEditItem(null); setForm({ ...BLANK_SUPPLIER }); setShowForm(true) }
  function openEdit(item) { setEditItem(item); setForm({ ...item }); setShowForm(true) }
  function set(f, v) { setForm(p => ({ ...p, [f]: v })) }

  async function save() {
    if (!form.supplier_name) { toast('Supplier name required', 'err'); return }
    try {
      if (editItem) {
        const updated = await supplierService.update(editItem.id, form)
        setSuppliers(prev => prev.map(s => s.id === editItem.id ? updated : s))
        toast('Supplier updated ✓', 'ok')
      } else {
        const seq = suppliers.length + 1
        const supplier_code = `SUP-${String(seq).padStart(5, '0')}`
        const newSupplier = { ...form, supplier_code }
        const created = await supplierService.create(newSupplier)
        setSuppliers(prev => [created, ...prev])
        toast(`Supplier registered: ${supplier_code}`, 'ok')
      }
      setShowForm(false)
    } catch (err) {
      toast('Save failed — check console', 'err')
      console.error(err)
    }
  }

  const filtered = suppliers.filter(s => {
    if (filterCat && s.category !== filterCat) return false
    if (filterStatus && s.status !== filterStatus) return false
    if (search) {
      const q = search.toLowerCase()
      return [s.supplier_name, s.supplier_code, s.category, s.contact_person].some(v => (v || '').toLowerCase().includes(q))
    }
    return true
  })

  const active = suppliers.filter(s => s.status === 'Active').length
  const categories = [...new Set(suppliers.map(s => s.category).filter(Boolean))]

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Supplier Register</div>
          <div className="page-subtitle">{suppliers.length} suppliers · {active} active</div>
        </div>
        {canEdit && (
          <button className="btn btn-primary" onClick={openNew}><Plus size={14} /> Add Supplier</button>
        )}
      </div>

      <div className="filter-bar" style={{ marginBottom: 12 }}>
        <input placeholder="Search name, code, category…" value={search} onChange={e => setSearch(e.target.value)} />
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c}>{c}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          {SUPPLIER_STATUS_LIST.map(s => <option key={s}>{s}</option>)}
        </select>
        {(search || filterCat || filterStatus) && (
          <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => { setSearch(''); setFilterCat(''); setFilterStatus('') }}>Clear</button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>{filtered.length} records</span>
      </div>

      <div className="table-wrap">
        {loading ? <div className="table-empty">Loading…</div> : !filtered.length ? <div className="table-empty">No suppliers found.</div> : (
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Supplier Name</th>
                <th>Category</th>
                <th>Contact</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Status</th>
                <th>Remarks</th>
                {canEdit && <th></th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id}>
                  <td><span className="doc-number">{s.supplier_code}</span></td>
                  <td style={{ fontSize: 13, fontWeight: 600 }}>{s.supplier_name}</td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.category}</td>
                  <td style={{ fontSize: 12 }}>{s.contact_person || '—'}</td>
                  <td>
                    {s.phone
                      ? <a href={`tel:${s.phone}`} style={{ fontSize: 12, color: 'var(--brand-accent)', display: 'flex', alignItems: 'center', gap: 4 }}><Phone size={11} />{s.phone}</a>
                      : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}
                  </td>
                  <td>
                    {s.email
                      ? <a href={`mailto:${s.email}`} style={{ fontSize: 12, color: 'var(--brand-accent)', display: 'flex', alignItems: 'center', gap: 4 }}><Mail size={11} />{s.email}</a>
                      : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}
                  </td>
                  <td><Badge status={s.status === 'Active' ? 'Approved' : s.status === 'Blacklisted' ? 'Rejected' : 'Draft'} label={s.status} /></td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.remarks || '—'}</td>
                  {canEdit && (
                    <td>
                      <button className="btn btn-ghost" style={{ padding: '3px 6px' }} onClick={() => openEdit(s)}><Pencil size={12} /></button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editItem ? `Edit — ${editItem.supplier_name}` : 'Add Supplier'} size="lg"
        footer={<><button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button><button className="btn btn-primary" onClick={save}>Save</button></>}>
        <div className="form-grid form-grid-2" style={{ gap: 14 }}>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label required">Supplier Name</label>
            <input className="form-input" value={form.supplier_name} onChange={e => set('supplier_name', e.target.value)} placeholder="Full legal name" />
          </div>
          <div className="form-group">
            <label className="form-label">Category</label>
            <select className="form-select" value={form.category} onChange={e => set('category', e.target.value)}>
              {SUPPLIER_CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
              {SUPPLIER_STATUS_LIST.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Contact Person</label>
            <input className="form-input" value={form.contact_person} onChange={e => set('contact_person', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input className="form-input" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+971-50-0000000" />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Address</label>
            <input className="form-input" value={form.address} onChange={e => set('address', e.target.value)} />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Remarks</label>
            <textarea className="form-textarea" value={form.remarks} onChange={e => set('remarks', e.target.value)} rows={2} />
          </div>
        </div>
      </Modal>

      <ToastContainer toasts={toasts} />
    </div>
  )
}
