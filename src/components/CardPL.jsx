import { useNavigate } from 'react-router-dom'
import BadgeEstado from './BadgeEstado'
import { ESTADO_COLORS } from '../services/packingListService'

function formatFecha(ts) {
  if (!ts) return '—'
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function CardPL({ pl }) {
  const navigate = useNavigate()
  const color = ESTADO_COLORS[pl.estado]

  const totalKgNeto = pl.pallets?.reduce((sum, p) => {
    return sum + (p.items?.reduce((s, i) => s + (Number(i.kilosNetos) || 0), 0) || 0)
  }, 0) || 0

  const totalPallets = pl.pallets?.length || 0

  return (
    <div
      className="card-pl"
      style={{ borderLeftColor: color }}
      onClick={() => navigate(`/pl/${pl.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/pl/${pl.id}`)}
    >
      {/* Header */}
      <div className="card-pl-header">
        <div>
          <p className="card-pl-cliente">{pl.cliente}</p>
          <p className="card-pl-nv">NV {pl.notaVenta}</p>
        </div>
        <BadgeEstado estado={pl.estado} size="sm" />
      </div>

      {/* Productos */}
      <div className="card-pl-productos">
        {pl.productos?.map((prod, i) => (
          <span key={i} className="card-pl-tag">{prod.nombre}</span>
        ))}
      </div>

      {/* Stats */}
      <div className="card-pl-stats">
        <div className="card-pl-stat">
          <span className="card-pl-stat-valor">{totalPallets}</span>
          <span className="card-pl-stat-label">pallets</span>
        </div>
        <div className="card-pl-stat">
          <span className="card-pl-stat-valor">{totalKgNeto.toLocaleString('es-CL')}</span>
          <span className="card-pl-stat-label">kg netos</span>
        </div>
        <div className="card-pl-stat">
          <span className="card-pl-stat-valor">{formatFecha(pl.creadoEn)}</span>
          <span className="card-pl-stat-label">creado</span>
        </div>
        {pl.invoiceNumero && (
          <div className="card-pl-stat">
            <span className="card-pl-stat-valor">#{pl.invoiceNumero}</span>
            <span className="card-pl-stat-label">invoice</span>
          </div>
        )}
      </div>

      {/* Comentario reciente si existe */}
      {pl.comentarios?.length > 0 && (
        <div className={`card-pl-comentario card-pl-comentario--${pl.comentarios[pl.comentarios.length - 1].tipo}`}>
          <span>
            {pl.comentarios[pl.comentarios.length - 1].tipo === 'rechazo' ? '⚠ ' : '✓ '}
            {pl.comentarios[pl.comentarios.length - 1].texto}
          </span>
        </div>
      )}
    </div>
  )
}
