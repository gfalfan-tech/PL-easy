import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import NuevaSolicitud from './pages/NuevaSolicitud'
import DetallePL from './pages/DetallePL'
import EditarSolicitud from './pages/EditarSolicitud'
import Clientes from './pages/Clientes'
import Configuracion from './pages/Configuracion'
import { Preparacion, Revision, Despachados } from './pages/PaginasEstado'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/nueva-solicitud" element={<NuevaSolicitud />} />
            <Route path="/preparacion" element={<Preparacion />} />
            <Route path="/revision" element={<Revision />} />
            <Route path="/despachados" element={<Despachados />} />
            <Route path="/pl/:id" element={<DetallePL />} />
            <Route path="/editar-solicitud/:id" element={<EditarSolicitud />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/configuracion" element={<Configuracion />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
