import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import logoQdc from '/logo_qdc_.png'
import logoFalfan from '/logo_falfan.jpeg'

const NAV_ITEMS = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    roles: ['admin', 'facturacion', 'bodega'],
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
  },
  {
    to: '/nueva-solicitud',
    label: 'Nueva Solicitud',
    roles: ['admin', 'facturacion', 'bodega'],
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
      </svg>
    ),
  },
  {
    to: '/preparacion',
    label: 'En Preparación',
    roles: ['admin', 'facturacion', 'bodega'],
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/>
        <path d="M16 3H8a1 1 0 00-1 1v3h10V4a1 1 0 00-1-1z"/>
      </svg>
    ),
  },
  {
    to: '/revision',
    label: 'En Revisión',
    roles: ['admin', 'facturacion', 'bodega'],
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M9 12l2 2 4-4"/><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
    ),
  },
  {
    to: '/despachados',
    label: 'Despachados',
    roles: ['admin', 'facturacion', 'bodega'],
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M5 12h14M12 5l7 7-7 7"/>
      </svg>
    ),
  },
]

export default function Sidebar() {
  const { perfil, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const itemsFiltrados = NAV_ITEMS.filter(
    (item) => item.roles.includes(perfil?.rol)
  )

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <img src={logoQdc} alt="QDC" className="sidebar-logo-img" />
        <span className="sidebar-logo-text">PL Fácil</span>
      </div>

      <nav className="sidebar-nav">
        {itemsFiltrados.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`
            }
          >
            <span className="sidebar-link-icon">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">
            {perfil?.nombre?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{perfil?.nombre || 'Usuario'}</span>
            <span className="sidebar-user-rol">{perfil?.rol || ''}</span>
          </div>
        </div>

        <button onClick={handleLogout} className="sidebar-logout">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
          </svg>
          Salir
        </button>

        <div className="sidebar-credit">
          <span>Desarrollado por</span>
          <img src={logoFalfan} alt="Falfán" className="sidebar-credit-logo" />
        </div>
      </div>
    </aside>
  )
}
