import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { escucharPLs, ESTADOS, ESTADO_LABELS, ESTADO_COLORS } from '../services/packingListService'
import CardPL from '../components/CardPL'

const FILTROS = [
  { valor: null, label: 'Todos' },
  { valor: ESTADOS.SOLICITUD, label: ESTADO_LABELS.solicitud },
  { valor: ESTADOS.PREPARACION, label: ESTADO_LABELS.preparacion },
  { valor: ESTADOS.REVISION, label: ESTADO_LABELS.revision },
  { valor: ESTADOS.DESPACHADO, label: ESTADO_LABELS.despachado },
]

export default function Dashboard() {
  const { perfil } = useAuth()
  const [pls, setPls] = useState([])
  const [filtro, setFiltro] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    setCargando(true)
    const unsub = escucharPLs((lista) => {
      setPls(lista)
      setCargando(false)
    }, filtro)
    return unsub
  }, [filtro])

  const plsFiltrados = pls.filter((pl) => {
    if (!busqueda.trim()) return true
    const q = busqueda.toLowerCase()
    return (
      pl.cliente?.toLowerCase().includes(q) ||
      pl.notaVenta?.toLowerCase().includes(q) ||
      pl.invoiceNumero?.toLowerCase().includes(q) ||
      pl.productos?.some((p) => p.nombre?.toLowerCase().includes(q))
    )
  })

  // Conteos por estado
  const conteos = Object.values(ESTADOS).reduce((acc, e) => {
    acc[e] = pls.filter((p) => p.estado === e).length
    return acc
  }, {})

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">Bienvenido, {perfil?.nombre?.split(' ')[0]}</p>
        </div>
      </div>

      {/* Tarjetas de resumen */}
      <div className="resumen-grid">
        {Object.values(ESTADOS).map((estado) => (
          <button
            key={estado}
            className={`resumen-card ${filtro === estado ? 'resumen-card--activo' : ''}`}
            style={filtro === estado ? { borderColor: ESTADO_COLORS[estado] } : {}}
            onClick={() => setFiltro(filtro === estado ? null : estado)}
          >
            <span
              className="resumen-card-num"
              style={{ color: ESTADO_COLORS[estado] }}
            >
              {conteos[estado] || 0}
            </span>
            <span className="resumen-card-label">{ESTADO_LABELS[estado]}</span>
            <div
              className="resumen-card-bar"
              style={{ backgroundColor: ESTADO_COLORS[estado] }}
            />
          </button>
        ))}
      </div>

      {/* Filtros + Búsqueda */}
      <div className="toolbar">
        <div className="filtros">
          {FILTROS.map((f) => (
            <button
              key={f.valor ?? 'todos'}
              className={`filtro-btn ${filtro === f.valor ? 'filtro-btn--activo' : ''}`}
              onClick={() => setFiltro(f.valor)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="busqueda-wrap">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="busqueda-icon">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Buscar por cliente, NV, invoice…"
            className="busqueda-input"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
      </div>

      {/* Lista de PLs */}
      {cargando ? (
        <div className="empty-state">
          <div className="spinner" />
          <p>Cargando…</p>
        </div>
      ) : plsFiltrados.length === 0 ? (
        <div className="empty-state">
          <svg width="40" height="40" fill="none" stroke="#CBD5E1" strokeWidth="1.5" viewBox="0 0 24 24">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
          </svg>
          <p>No hay packing lists{filtro ? ` en estado "${ESTADO_LABELS[filtro]}"` : ''}.</p>
        </div>
      ) : (
        <div className="pl-grid">
          {plsFiltrados.map((pl) => (
            <CardPL key={pl.id} pl={pl} />
          ))}
        </div>
      )}
    </div>
  )
}
