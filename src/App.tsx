import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProfileProvider } from './contexts/ProfileContext'
import { AppRoutes } from './routes'
import { CustomCursor } from './components/CustomCursor'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        {/* ProfileProvider depende de AuthProvider (usa useAuthContext) */}
        <ProfileProvider>
          <CustomCursor />
          <AppRoutes />
        </ProfileProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
