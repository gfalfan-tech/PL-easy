import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import logoQdc from '/logo_qdc_.png'
import logoFalfan from '/logo_falfan.jpeg'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setCargando(true)
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch {
      setError('Email o contraseña incorrectos.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="login-bg">
      <div className="login-card">
        {/* Logo */}
        <div className="login-logo-wrap">
          <img src={logoQdc} alt="Química del Campo" className="login-logo" />
        </div>

        <h1 className="login-title">PL Fácil</h1>
        <p className="login-sub">Gestión de Packing Lists · Exportación</p>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@qdc.cl"
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          {error && <p className="login-error">{error}</p>}

          <button
            type="submit"
            className="btn btn--primary btn--full"
            disabled={cargando}
          >
            {cargando ? 'Iniciando sesión…' : 'Iniciar sesión'}
          </button>
        </form>

        <div className="login-credit">
          <span>Desarrollado por</span>
          <img src={logoFalfan} alt="Falfán" className="login-credit-logo" />
        </div>
      </div>
    </div>
  )
}
