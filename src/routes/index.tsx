import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { AdminRoute } from '../components/AdminRoute'
import { useAuthContext } from '../contexts/AuthContext'
import Login from '../pages/Login'
import Dashboard from '../pages/Dashboard'
import Units from '../pages/Units'
import UnitTimeline from '../pages/UnitTimeline'
import AdminUsers from '../pages/AdminUsers'

function RootRedirect() {
  const { user, loading } = useAuthContext()
  if (loading) return null
  return <Navigate to={user ? '/dashboard' : '/login'} replace />
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<Login />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/units"
        element={
          <ProtectedRoute>
            <Units />
          </ProtectedRoute>
        }
      />

      <Route
        path="/units/:id"
        element={
          <ProtectedRoute>
            <UnitTimeline />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/usuarios"
        element={
          <AdminRoute>
            <AdminUsers />
          </AdminRoute>
        }
      />
    </Routes>
  )
}
