import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { useProject } from '../../context/ProjectContext'
import { useAuth } from '../../context/AuthContext'
import { delayStatus, today } from '../../utils/delay'
import { generateDocNumber } from '../../utils/docNumber'
import Badge from '../../components/Badge'
import Modal from '../../components/Modal'
import MRFForm from './MRFForm'
import MRFPanel from './MRFPanel'
import { MRF_SEED, PRIORITIES, APPROVAL_STATUSES } from './mrfData'
import { useToast, ToastContainer } from '../../utils/toast'
import { Plus, Download, RefreshCw } from 'lucide-react'

const TABS = [
  { label: 'All', value: null },
  { label: 'Draft', value: 'Draft' },
  { label: 'Submitted', value: 'Submitted' },
  { label: 'Approved', value: 'Approved' },
  { label: 'On Hold', value: 'On Hold' },
  { label: 'Rejected', value: 'Rejected' },
]

export default function MRFList() {
  const { activeProject } = useProject()
  const { profile } = useAuth()
  const { toasts, toast } = useToast()

  const [mrfs, setMrfs] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(null)
  const [search, setSearch] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [filterDelay, setFilterDelay] = useState('')
  const [sortField, setSortField] = useState('date')
  const [sortAsc, setSortAsc] = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [editMRF, setEditMRF] = useState(null)
  const [selectedMRF, setSelectedMRF] = useState(null)

  const canApprove = ['Admin', 'PM'].includes(profile?.role)
  const canEdit = ['Admin', 'PM', 'Planning', 'Site Engineer'].includes(profile?.role)
  const canCreate = ['Admin', 'PM', 'Procurement', 'Site Engineer'].includes(profile?.role)

  useEffect(() => { loadMRFs() }, [activeProject])

  async function loadMRFs() {
    setLoading(true)
    const { data, error } = await supabase
      .from('mrfs')
      .select('*')
      .eq('project_code', activeProject.project_code)
      .order('date', { ascending: false })

    if (error || !data?.length) {
      setMrfs(MRF_SEED.filter(m => m.project_code === activeProject.project_code))
    } else {
      setMrfs(data)
    }
    setLoading(false)
  }

  async function getNextSequence() {
    const year = new Date().getFullYear()
    const prefix = `MRF-${activeProject.project_code}-${year}-`
    const existing = mrfs.filter(m => m.mrf_number?.startsWith(prefix))
    return existing.length + 1
  }

  async function saveMRF(formData) {
    const isEdit = !!editMRF?.id

    if (isEdit) {
      // Update local (Supabase update if real data)
      const { error } = await supabase.from('mrfs').update(formData).eq('id', editMRF.id)
      setMrfs(prev => prev.map(m => m.id === editMRF.id ? { ...m, ...formData } : m))
      if (selectedMRF?.id === editMRF.id) setSelectedMRF({ ...selectedMRF, ...formData })
      toast('MRF updated ✓', 'ok')
    } else {
      const seq = await getNextSequence()
      const mrf_number = generateDocNumber('MRF', activeProject.project_code, seq)
      const newMRF = { ...formData, mrf_number, project_code: activeProject.project_code, delivered_qty: 0, mir_resub_count: 0 }
      const { data, error } = await supabase.from('mrfs').insert(newMRF).select().single()
      const saved = data || { ...newMRF, id: Date.now() }
      setMrfs(prev => [saved, ...prev])
      toast(`MRF created: ${mrf_number}`, 'ok')
    }
    setShowForm(false)
    setEditMRF(null)
  }

  function openNewForm() {
    setEditMRF(null)
    setShowForm(true)
  }

  function openEditForm(mrf) {
    setEditMRF(mrf)
    setShowForm(true)
  }

  async function doApprove(id) {
    const update = { approval_status: 'Approved', approval_date: today(), approval_by: profile?.name || 'Admin' }
    await supabase.from('mrfs').update(update).eq('id', id)
    setMrfs(prev => prev.map(m => m.id === id ? { ...m, ...update } : m))
    if (selectedMRF?.id === id) setSelectedMRF(p => ({ ...p, ...update }))
    toast('MRF Approved ✓', 'ok')
  }

  async function doReject(id) {
    const reason = prompt('Rejection reason:')
    if (reason === null) return
    const update = { approval_status: 'Rejected', approval_remarks: reason, approval_date: today(), approval_by: profile?.name || 'Admin' }
    await supabase.from('mrfs').update(update).eq('id', id)
    setMrfs(prev => prev.map(m => m.id === id ? { ...m, ...update } : m))
    if (selectedMRF?.id === id) setSelectedMRF(p => ({ ...p, ...update }))
    toast('MRF Rejected', 'err')
  }

  async function doHold(id) {
    const reason = prompt('Hold reason:')
    if (reason === null) return
    const update = { approval_status: 'On Hold', approval_remarks: reason }
    await supabase.from('mrfs').update(update).eq('id', id)
    setMrfs(prev => prev.map(m => m.id === id ? { ...m, ...update } : m))
    if (selectedMRF?.id === id) setSelectedMRF(p => ({ ...p, ...update }))
    toast('MRF On Hold', 'warn')
  }

  // Filter + sort
  const filtered = mrfs.filter(m => {
    if (activeTab && m.approval_status !== activeTab) return false
    if (filterPriority && m.priority !== filterPriority) return false
    if (filterDelay && delayStatus(m) !== filterDelay) return false
    if (search) {
      const q = search.toLowerCase()
      return [m.mrf_number, m.material_desc, m.activity_id, m.activity_name, m.requested_by]
        .some(v => (v || '').toLowerCase().includes(q))
    }
    return true
  }).sort((a, b) => {
    let av = a[sortField] || '', bv = b[sortField] || ''
    return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av)
  })

  function sort(field) {
    if (sortField === field) setSortAsc(p => !p)
    else { setSortField(field); setSortAsc(true) }
  }

  // Tab counts
  const counts = {}
  mrfs.forEach(m => { counts[m.approval_status] = (counts[m.approval_status] || 0) + 1 })

  const pendingCount = mrfs.filter(m => m.approval_status === 'Submitted').length

  return (
    <div style={{ marginRight: selectedMRF ? 660 : 0, transition: 'margin-right 0.23s' }}>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <div className="page-title">Material Requests</div>
          <div className="page-subtitle">{activeProject.project_name} · {mrfs.length} records</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={loadMRFs}><RefreshCw size={13} /></button>
          {canCreate && (
            <button className="btn btn-primary" onClick={openNewForm}><Plus size={14} /> New MRF</button>
          )}
        </div>
      </div>

      {/* Pending Banner */}
      {pendingCount > 0 && canApprove && (
        <div style={{ background: 'var(--status-pending-bg)', color: 'var(--status-pending-text)', border: '1px solid #fde68a', borderRadius: 'var(--radius)', padding: '9px 14px', marginBottom: 16, fontSize: 13, fontWeight: 600 }}>
          ⏳ {pendingCount} MRF{pendingCount > 1 ? 's' : ''} pending your approval
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 0, background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0', overflow: 'hidden' }}>
        {TABS.map(tab => (
          <button
            key={tab.label}
            onClick={() => setActiveTab(tab.value)}
            style={{
              padding: '10px 14px', fontSize: 12.5, fontWeight: activeTab === tab.value ? 700 : 500,
              color: activeTab === tab.value ? 'var(--brand-primary)' : 'var(--text-muted)',
              background: 'none', border: 'none', cursor: 'pointer',
              borderBottom: `2px solid ${activeTab === tab.value ? 'var(--brand-accent)' : 'transparent'}`,
              display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
              marginBottom: -1
            }}
          >
            {tab.label}
            {tab.value && counts[tab.value] ? (
              <span style={{ fontSize: 10, fontWeight: 700, background: activeTab === tab.value ? 'rgba(232,160,32,0.15)' : 'var(--bg-base)', color: activeTab === tab.value ? 'var(--brand-accent)' : 'var(--text-muted)', padding: '1px 6px', borderRadius: 20 }}>
                {counts[tab.value]}
              </span>
            ) : null}
            {!tab.value && (
              <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--bg-base)', color: 'var(--text-muted)', padding: '1px 6px', borderRadius: 20 }}>
                {mrfs.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="filter-bar" style={{ background: 'var(--bg-surface)', padding: '10px 16px', borderBottom: '1px solid var(--border)', borderRadius: 0, marginBottom: 0, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          placeholder="Search MRF, material, activity…"
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ width: 240, padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 12.5, background: 'var(--bg-base)', outline: 'none' }}
        />
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 12.5, background: 'var(--bg-surface)', outline: 'none' }}>
          <option value="">All Priorities</option>
          {PRIORITIES.map(p => <option key={p}>{p}</option>)}
        </select>
        <select value={filterDelay} onChange={e => setFilterDelay(e.target.value)} style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 12.5, background: 'var(--bg-surface)', outline: 'none' }}>
          <option value="">All Delay Status</option>
          <option>On Track</option>
          <option>At Risk</option>
          <option>Delayed</option>
          <option>Late to Raise</option>
        </select>
        {(search || filterPriority || filterDelay) && (
          <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => { setSearch(''); setFilterPriority(''); setFilterDelay('') }}>
            Clear
          </button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>
          {filtered.length} of {mrfs.length} records
        </span>
      </div>

      {/* Table */}
      <div className="table-wrap" style={{ borderRadius: '0 0 var(--radius-lg) var(--radius-lg)' }}>
        {loading ? (
          <div className="table-empty">Loading…</div>
        ) : !filtered.length ? (
          <div className="table-empty">No MRFs found for this filter.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th onClick={() => sort('mrf_number')} style={{ cursor: 'pointer' }}>MRF No {sortField === 'mrf_number' ? (sortAsc ? '↑' : '↓') : ''}</th>
                <th onClick={() => sort('date')} style={{ cursor: 'pointer' }}>Date {sortField === 'date' ? (sortAsc ? '↑' : '↓') : ''}</th>
                <th>Material</th>
                <th>Activity</th>
                <th onClick={() => sort('required_on_site')} style={{ cursor: 'pointer' }}>Need On-Site</th>
                <th>Priority</th>
                <th>Approval</th>
                <th>Delay</th>
                <th>Site Status</th>
                <th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => {
                const ds = delayStatus(m)
                return (
                  <tr
                    key={m.id}
                    style={{ background: ds === 'Delayed' || ds === 'Late to Raise' ? '#FFF5F5' : ds === 'At Risk' ? '#FFFBF0' : undefined }}
                  >
                    <td>
                      <span className="doc-number" style={{ cursor: 'pointer' }} onClick={() => setSelectedMRF(m)}>
                        {m.mrf_number}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m.date}</td>
                    <td style={{ fontSize: 12, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={m.material_desc}>{m.material_desc}</td>
                    <td style={{ fontSize: 11 }}>
                      {m.activity_id && <span className="doc-number" style={{ marginRight: 4 }}>{m.activity_id}</span>}
                      <span style={{ color: 'var(--text-muted)' }}>{m.activity_name}</span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m.required_on_site || '—'}</td>
                    <td><Badge status={m.priority} /></td>
                    <td><Badge status={m.approval_status} /></td>
                    <td><Badge status={ds} /></td>
                    <td>
                      <Badge status={m.site_status || 'Not Ordered'} label={m.site_status || 'Not Ordered'} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost" style={{ padding: '3px 7px', fontSize: 11 }} onClick={() => setSelectedMRF(m)}>View</button>
                        {canEdit && (
                          <button className="btn btn-ghost" style={{ padding: '3px 7px', fontSize: 11 }} onClick={() => openEditForm(m)}>Edit</button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* MRF Form Modal */}
      <Modal
        open={showForm}
        onClose={() => { setShowForm(false); setEditMRF(null) }}
        title={editMRF ? `Edit MRF — ${editMRF.mrf_number}` : 'New Material Request Form'}
        size="lg"
      >
        <MRFForm
          initial={editMRF}
          mrfNumber={editMRF?.mrf_number}
          onSave={saveMRF}
          onCancel={() => { setShowForm(false); setEditMRF(null) }}
        />
      </Modal>

      {/* Detail Panel */}
      {selectedMRF && (
        <>
          <div
            onClick={() => setSelectedMRF(null)}
            style={{ position: 'fixed', inset: 0, zIndex: 89 }}
          />
          <MRFPanel
            mrf={selectedMRF}
            onClose={() => setSelectedMRF(null)}
            onEdit={() => { openEditForm(selectedMRF); setSelectedMRF(null) }}
            onApprove={doApprove}
            onReject={doReject}
            onHold={doHold}
            canApprove={canApprove}
            currency={activeProject?.currency}
          />
        </>
      )}

      <ToastContainer toasts={toasts} />
    </div>
  )
}
