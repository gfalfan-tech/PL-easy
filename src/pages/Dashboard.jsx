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
  const [vistaHistorial, setVistaHistorial] = useState(false)
  const [busquedaHistorial, setBusquedaHistorial] = useState('')
  const [todosLosPls, setTodosLosPls] = useState([])

  useEffect(() => {
    setCargando(true)
    const unsub = escucharPLs((lista) => { setPls(lista); setCargando(false) }, filtro)
    return unsub
  }, [filtro])

  useEffect(() => {
    const unsub = escucharPLs((lista) => setTodosLosPls(lista))
    return unsub
  }, [])

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

  const plsHistorial = todosLosPls.filter(pl => {
    if (!busquedaHistorial.trim()) return pl.estado === ESTADOS.DESPACHADO
    const q = busquedaHistorial.toLowerCase()
    return (
      pl.cliente?.toLowerCase().includes(q) ||
      pl.notaVenta?.toLowerCase().includes(q) ||
      pl.invoiceNumero?.toLowerCase().includes(q)
    )
  })

  const conteos = Object.values(ESTADOS).reduce((acc, e) => {
    acc[e] = pls.filter((p) => p.estado === e).length
    return acc
  }, {})

  return (
    <div className="page">
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
          <div className="resumen-grid">
            {Object.values(ESTADOS).map((estado) => (
              <button
                key={estado}
                className={`resumen-card ${filtro === estado ? 'resumen-card--activo' : ''}`}
                style={filtro === estado ? { borderColor: ESTADO_COLORS[estado] } : {}}
                onClick={() => setFiltro(filtro === estado ? null : estado)}
              >
                <span className="resumen-card-num" style={{ color: ESTADO_COLORS[estado] }}>{conteos[estado] || 0}</span>
                <span className="resumen-card-label">{ESTADO_LABELS[estado]}</span>
                <div className="resumen-card-bar" style={{ backgroundColor: ESTADO_COLORS[estado] }} />
              </button>
            ))}
          </div>

          <div className="toolbar">
            <div className="filtros">
              {FILTROS.map((f) => (
                <button key={f.valor ?? 'todos'} className={`filtro-btn ${filtro === f.valor ? 'filtro-btn--activo' : ''}`} onClick={() => setFiltro(f.valor)}>
                  {f.label}
                </button>
              ))}
            </div>
            <div className="busqueda-wrap">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="busqueda-icon">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              <input type="text" placeholder="Buscar por cliente, NV, invoice…" className="busqueda-input" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
            </div>
          </div>

          {cargando ? (
            <div className="empty-state"><div className="spinner" /><p>Cargando…</p></div>
          ) : plsFiltrados.length === 0 ? (
            <div className="empty-state">
              <svg width="40" height="40" fill="none" stroke="#CBD5E1" strokeWidth="1.5" viewBox="0 0 24 24">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
              </svg>
              <p>No hay packing lists{filtro ? ` en estado "${ESTADO_LABELS[filtro]}"` : ''}.</p>
            </div>
          ) : (
            <div className="pl-grid">
              {plsFiltrados.map((pl) => <CardPL key={pl.id} pl={pl} />)}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="historial-header">
            <div className="busqueda-wrap" style={{ maxWidth: '100%' }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="busqueda-icon">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              <input
                type="text"
                placeholder="Buscar por cliente, nota de venta o número de invoice…"
                className="busqueda-input"
                style={{ borderRadius: 'var(--radius-sm)' }}
                value={busquedaHistorial}
                onChange={(e) => setBusquedaHistorial(e.target.value)}
                autoFocus
              />
            </div>
            <p className="historial-desc">
              {busquedaHistorial
                ? `${plsHistorial.length} resultado${plsHistorial.length !== 1 ? 's' : ''} para "${busquedaHistorial}"`
                : `${plsHistorial.length} PL${plsHistorial.length !== 1 ? 's' : ''} despachado${plsHistorial.length !== 1 ? 's' : ''}`}
            </p>
          </div>

          {plsHistorial.length === 0 ? (
            <div className="empty-state">
              <svg width="40" height="40" fill="none" stroke="#CBD5E1" strokeWidth="1.5" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              <p>{busquedaHistorial ? 'No se encontraron resultados.' : 'Aún no hay PLs despachados.'}</p>
            </div>
          ) : (
            <div className="historial-tabla-wrap">
              <table className="historial-tabla">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Nota de Venta</th>
                    <th>Invoice</th>
                    <th>Productos</th>
                    <th>Pallets</th>
                    <th>Kg Netos</th>
                    <th>Fecha</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {plsHistorial.map(pl => {
                    const totalKg = pl.pallets?.reduce((s, p) =>
                      s + (p.items?.reduce((ss, i) => ss + (Number(i.kilosNetos) || 0), 0) || 0), 0) || 0
                    const fecha = pl.creadoEn?.toDate
                      ? pl.creadoEn.toDate().toLocaleDateString('es-CL') : '—'
                    return (
                      <tr key={pl.id} className="historial-row" onClick={() => window.location.href = `/pl/${pl.id}`}>
                        <td className="historial-cliente">{pl.cliente}</td>
                        <td className="historial-nv">NV {pl.notaVenta}</td>
                        <td>{pl.invoiceNumero ? <span className="invoice-badge">#{pl.invoiceNumero}</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                        <td>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {pl.productos?.map((p, i) => <span key={i} className="card-pl-tag">{p.nombre}</span>)}
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>{pl.pallets?.length || 0}</td>
                        <td style={{ fontWeight: 600 }}>{totalKg.toLocaleString('es-CL')} kg</td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '.8rem' }}>{fecha}</td>
                        <td>
                          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M9 18l6-6-6-6"/>
                          </svg>
                        </td>
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
