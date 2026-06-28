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
import IF08List from './pages/if08/IF08List'

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
        <Route path="rfi" element={<IF08List />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
