import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { auth } from '../services/firebase'
import { sendPasswordResetEmail } from 'firebase/auth'
import logoQdc from '/logo_qdc_.png'
import logoFalfan from '/logo_falfan.jpeg'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const [modoReset, setModoReset] = useState(false)
  const [resetEnviado, setResetEnviado] = useState(false)
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

  const handleReset = async (e) => {
    e.preventDefault()
    if (!email.trim()) { setError('Ingresa tu email primero.'); return }
    setError('')
    setCargando(true)
    try {
      await sendPasswordResetEmail(auth, email)
      setResetEnviado(true)
    } catch {
      setError('No se encontró una cuenta con ese email.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="login-bg">
      <div className="login-card">
        <div className="login-logo-wrap">
          <img src={logoQdc} alt="Química del Campo" className="login-logo" />
        </div>

        <h1 className="login-title">PL Fácil</h1>
        <p className="login-sub">Gestión de Packing Lists · Exportación</p>

        {!modoReset ? (
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

            <button type="submit" className="btn btn--primary btn--full" disabled={cargando}>
              {cargando ? 'Iniciando sesión…' : 'Iniciar sesión'}
            </button>

            <button
              type="button"
              className="login-forgot"
              onClick={() => { setModoReset(true); setError('') }}
            >
              Olvidé mi contraseña
            </button>
          </form>
        ) : (
          <div className="login-form">
            {resetEnviado ? (
              <div className="login-reset-ok">
                <svg width="32" height="32" fill="none" stroke="#00A878" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="9"/>
                </svg>
                <p>Email enviado a <strong>{email}</strong>. Revisa tu bandeja de entrada.</p>
                <button className="btn btn--ghost btn--full" onClick={() => { setModoReset(false); setResetEnviado(false) }}>
                  Volver al login
                </button>
              </div>
            ) : (
              <form onSubmit={handleReset}>
                <p className="login-reset-desc">Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.</p>
                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="usuario@qdc.cl"
                    required
                  />
                </div>

                {error && <p className="login-error" style={{ marginBottom: '12px' }}>{error}</p>}

                <button type="submit" className="btn btn--primary btn--full" disabled={cargando}>
                  {cargando ? 'Enviando…' : 'Enviar email de recuperación'}
                </button>
                <button type="button" className="login-forgot" onClick={() => { setModoReset(false); setError('') }}>
                  Volver al login
                </button>
              </form>
            )}
          </div>
        )}

        <div className="login-credit">
          <span>Desarrollado por</span>
          <img src={logoFalfan} alt="Falfán" className="login-credit-logo" />
        </div>
      </div>
    </div>
  )
}
