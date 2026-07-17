import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { escucharPLs, ESTADOS, ESTADO_LABELS, ESTADO_COLORS } from '../services/packingListService'
import CardPL from '../components/CardPL'

export default function Dashboard() {
  const { perfil } = useAuth()
  const navigate = useNavigate()
  const [pls, setPls] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [cargando, setCargando] = useState(true)
  const [vistaHistorial, setVistaHistorial] = useState(false)
  const [busquedaHistorial, setBusquedaHistorial] = useState('')
  const [filtroEstado, setFiltroEstado] = useState(null)

  useEffect(() => {
    setCargando(true)
    const unsub = escucharPLs((lista) => { setPls(lista); setCargando(false) })
    return unsub
  }, [])

  // PLs activos (no despachados)
  const plsActivos = pls.filter(pl => pl.estado !== ESTADOS.DESPACHADO)

  // Filtrado por estado y búsqueda
  const plsFiltrados = plsActivos.filter(pl => {
    const matchEstado = !filtroEstado || pl.estado === filtroEstado
    if (!matchEstado) return false
    if (!busqueda.trim()) return true
    const q = busqueda.toLowerCase()
    return (
      pl.cliente?.toLowerCase().includes(q) ||
      pl.notaVenta?.toLowerCase().includes(q) ||
      pl.invoiceNumero?.toLowerCase().includes(q) ||
      pl.productos?.some(p => p.nombre?.toLowerCase().includes(q))
    )
  })

  // Historial (despachados + búsqueda en todos)
  const plsHistorial = pls.filter(pl => {
    if (!busquedaHistorial.trim()) return pl.estado === ESTADOS.DESPACHADO
    const q = busquedaHistorial.toLowerCase()
    return (
      pl.cliente?.toLowerCase().includes(q) ||
      pl.notaVenta?.toLowerCase().includes(q) ||
      pl.invoiceNumero?.toLowerCase().includes(q)
    )
  })

  // Conteos
  const conteos = {
    [ESTADOS.SOLICITUD]: plsActivos.filter(p => p.estado === ESTADOS.SOLICITUD).length,
    [ESTADOS.PREPARACION]: plsActivos.filter(p => p.estado === ESTADOS.PREPARACION).length,
    [ESTADOS.REVISION]: plsActivos.filter(p => p.estado === ESTADOS.REVISION).length,
    [ESTADOS.DESPACHADO]: pls.filter(p => p.estado === ESTADOS.DESPACHADO).length,
  }

  const ESTADOS_ACTIVOS = [ESTADOS.SOLICITUD, ESTADOS.PREPARACION, ESTADOS.REVISION]

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">Bienvenido, {perfil?.nombre?.split(' ')[0]}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className={`btn ${!vistaHistorial ? 'btn--outline' : 'btn--ghost'}`} onClick={() => setVistaHistorial(false)}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
            </svg>
            Activos
          </button>
          <button className={`btn ${vistaHistorial ? 'btn--outline' : 'btn--ghost'}`} onClick={() => setVistaHistorial(true)}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>
            </svg>
            Historial
          </button>
        </div>
      </div>

      {!vistaHistorial ? (
        <>
          {/* Tarjetas de resumen — solo estados activos + total despachados */}
          <div className="resumen-grid">
            {ESTADOS_ACTIVOS.map(estado => (
              <button
                key={estado}
                className={`resumen-card ${filtroEstado === estado ? 'resumen-card--activo' : ''}`}
                style={filtroEstado === estado ? { borderColor: ESTADO_COLORS[estado] } : {}}
                onClick={() => setFiltroEstado(filtroEstado === estado ? null : estado)}
              >
                <span className="resumen-card-num" style={{ color: ESTADO_COLORS[estado] }}>{conteos[estado]}</span>
                <span className="resumen-card-label">{ESTADO_LABELS[estado]}</span>
                <div className="resumen-card-bar" style={{ backgroundColor: ESTADO_COLORS[estado] }} />
                {estado === ESTADOS.REVISION && conteos[estado] > 0 && (
                  <span className="resumen-card-badge">{conteos[estado]}</span>
                )}
              </button>
            ))}
            <button
              className="resumen-card"
              onClick={() => setVistaHistorial(true)}
              style={{ cursor: 'pointer' }}
            >
              <span className="resumen-card-num" style={{ color: ESTADO_COLORS[ESTADOS.DESPACHADO] }}>{conteos[ESTADOS.DESPACHADO]}</span>
              <span className="resumen-card-label">Despachados</span>
              <div className="resumen-card-bar" style={{ backgroundColor: ESTADO_COLORS[ESTADOS.DESPACHADO] }} />
            </button>
          </div>

          {/* Búsqueda */}
          <div className="toolbar">
            <div className="filtros">
              <button className={`filtro-btn ${!filtroEstado ? 'filtro-btn--activo' : ''}`} onClick={() => setFiltroEstado(null)}>Todos</button>
              {ESTADOS_ACTIVOS.map(estado => (
                <button key={estado} className={`filtro-btn ${filtroEstado === estado ? 'filtro-btn--activo' : ''}`} onClick={() => setFiltroEstado(filtroEstado === estado ? null : estado)}>
                  {ESTADO_LABELS[estado]}
                </button>
              ))}
            </div>
            <div className="busqueda-wrap">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="busqueda-icon">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              <input type="text" placeholder="Buscar cliente, NV, producto…" className="busqueda-input" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
            </div>
          </div>

          {/* Lista */}
          {cargando ? (
            <div className="empty-state"><div className="spinner"/><p>Cargando…</p></div>
          ) : plsFiltrados.length === 0 ? (
            <div className="empty-state">
              <svg width="40" height="40" fill="none" stroke="#BFDBFE" strokeWidth="1.5" viewBox="0 0 24 24">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
              </svg>
              <p style={{ color: 'var(--text-secondary)' }}>No hay packing lists activos{filtroEstado ? ` en "${ESTADO_LABELS[filtroEstado]}"` : ''}.</p>
            </div>
          ) : (
            <div className="pl-grid">{plsFiltrados.map(pl => <CardPL key={pl.id} pl={pl} />)}</div>
          )}
        </>
      ) : (
        <>
          {/* Historial */}
          <div className="historial-header">
            <div className="busqueda-wrap" style={{ maxWidth: '100%' }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="busqueda-icon">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              <input type="text" placeholder="Buscar por cliente, nota de venta o invoice…" className="busqueda-input" style={{ borderRadius: 'var(--radius-sm)' }} value={busquedaHistorial} onChange={e => setBusquedaHistorial(e.target.value)} autoFocus />
            </div>
            <p className="historial-desc">
              {busquedaHistorial
                ? `${plsHistorial.length} resultado${plsHistorial.length !== 1 ? 's' : ''} para "${busquedaHistorial}"`
                : `${plsHistorial.length} PL${plsHistorial.length !== 1 ? 's' : ''} despachado${plsHistorial.length !== 1 ? 's' : ''}`}
            </p>
          </div>

          {plsHistorial.length === 0 ? (
            <div className="empty-state">
              <svg width="40" height="40" fill="none" stroke="#BFDBFE" strokeWidth="1.5" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              <p style={{ color: 'var(--text-secondary)' }}>{busquedaHistorial ? 'No se encontraron resultados.' : 'Aún no hay PLs despachados.'}</p>
            </div>
          ) : (
            <div className="historial-tabla-wrap">
              <table className="historial-tabla">
                <thead>
                  <tr>
                    <th>Cliente</th><th>Nota de Venta</th><th>Invoice</th>
                    <th>Productos</th><th>Pallets</th><th>Kg Netos</th><th>Fecha</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {plsHistorial.map(pl => {
                    const totalKg = pl.pallets?.reduce((s, p) => s + (p.items?.reduce((ss, i) => ss + (Number(i.kilosNetos) || 0), 0) || 0), 0) || 0
                    const fecha = pl.creadoEn?.toDate ? pl.creadoEn.toDate().toLocaleDateString('es-CL') : '—'
                    return (
                      <tr key={pl.id} className="historial-row" onClick={() => navigate(`/pl/${pl.id}`)}>
                        <td className="historial-cliente">{pl.cliente}</td>
                        <td className="historial-nv">NV {pl.notaVenta}</td>
                        <td>{pl.invoiceNumero ? <span className="invoice-badge">#{pl.invoiceNumero}</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                        <td><div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>{pl.productos?.map((p, i) => <span key={i} className="card-pl-tag">{p.nombre}</span>)}</div></td>
                        <td style={{ textAlign: 'center' }}>{pl.pallets?.length || 0}</td>
                        <td style={{ fontWeight: 600 }}>{totalKg.toLocaleString('es-CL')} kg</td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '.8rem' }}>{fecha}</td>
                        <td><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
