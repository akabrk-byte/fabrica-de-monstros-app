import { Routes, Route } from 'react-router-dom'
import { ProtectedRoute } from '../components/ProtectedRoute'
import Home from '../pages/Home'
import Login from '../pages/Login'
import Dashboard from '../pages/Dashboard'
import Units from '../pages/Units'
import UnitTimeline from '../pages/UnitTimeline'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
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
    </Routes>
  )
}
