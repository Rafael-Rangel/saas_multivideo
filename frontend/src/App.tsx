import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Templates } from './pages/Templates'
import { CreateWorkflow } from './pages/CreateWorkflow'
import { Workflows } from './pages/Workflows'
import { Settings } from './pages/Settings'
import { GuiaConfiguracao } from './pages/GuiaConfiguracao'
import { SetupWizard } from './pages/SetupWizard'
import { ProtectedRoute } from './components/ProtectedRoute'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/templates"
          element={
            <ProtectedRoute>
              <Templates />
            </ProtectedRoute>
          }
        />
        <Route
          path="/create/:templateSlug"
          element={
            <ProtectedRoute>
              <CreateWorkflow />
            </ProtectedRoute>
          }
        />
        <Route
          path="/workflows"
          element={
            <ProtectedRoute>
              <Workflows />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/guia-configuracao"
          element={
            <ProtectedRoute>
              <GuiaConfiguracao />
            </ProtectedRoute>
          }
        />
        <Route
          path="/setup"
          element={
            <ProtectedRoute>
              <SetupWizard />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
