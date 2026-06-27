import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import AppLayout from './layouts/AppLayout'
import AuthLayout from './layouts/AuthLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import MRFList from './pages/mrfs/MRFList'
import ProcurementList from './pages/procurement/ProcurementList'
import DeliveryList from './pages/delivery/DeliveryList'

function ProtectedRoute({ children }) {
  const { session, loading } = useAuth()
  if (loading) return <div className="app-loading">Loading...</div>
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
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
