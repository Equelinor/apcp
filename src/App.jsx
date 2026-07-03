import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import AppLayout from './layouts/AppLayout'
import AuthLayout from './layouts/AuthLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import MRFList from './pages/mrfs/MRFList'
import ProcurementList from './pages/procurement/ProcurementList'
import DeliveryList from './pages/delivery/DeliveryList'
import DrawingRegister from './pages/drawings/DrawingRegister'
import DocumentRegister from './pages/documents/DocumentRegister'
import IF04List from './pages/if04/IF04List'
import IF05List from './pages/if05/IF05List'
import IF06List from './pages/if06/IF06List'
import IF07List from './pages/if07/IF07List'
import IF08List from './pages/if08/IF08List'
import IF09List from './pages/if09/IF09List'
import IF12List from './pages/if12/IF12List'
import SupplierRegister from './pages/suppliers/SupplierRegister'
import ProjectRegister from './pages/projects/ProjectRegister'
import DARList from './pages/dar/DARList'
import BOQRegister from './pages/boq/BOQRegister'
import MARRegister from './pages/mar/MARRegister'
import RFIRegister from './pages/rfi/RFIRegister'
import SDRegister from './pages/sd/SDRegister'
import IRRegister from './pages/ir/IRRegister'

function ProtectedRoute({ children }) {
  const { session, loading } = useAuth()
  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-muted)', fontSize: 14 }}>Loading…</div>
  if (!session) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const { session } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/" replace /> : <AuthLayout><Login /></AuthLayout>} />
      <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="mrfs" element={<MRFList />} />
        <Route path="procurement" element={<ProcurementList />} />
        <Route path="delivery" element={<DeliveryList />} />
        <Route path="drawing-register" element={<DrawingRegister />} />
        <Route path="document-register" element={<DocumentRegister />} />
        <Route path="shop-drawings" element={<IF04List />} />
        <Route path="sd-register" element={<SDRegister />} />
        <Route path="mac" element={<IF05List />} />
        <Route path="mockup" element={<IF06List />} />
        <Route path="submittals" element={<IF07List />} />
        <Route path="rfi" element={<IF08List />} />
        <Route path="rfi-register" element={<RFIRegister />} />
        <Route path="ir" element={<IF09List />} />
        <Route path="ir-register" element={<IRRegister />} />
        <Route path="subcontractor" element={<IF12List />} />
        <Route path="suppliers" element={<SupplierRegister />} />
        <Route path="projects" element={<ProjectRegister />} />
        <Route path="dar" element={<DARList />} />
        <Route path="boq" element={<BOQRegister />} />
        <Route path="mar" element={<MARRegister />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
