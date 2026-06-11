import { useState, useEffect } from 'react'
import { escucharPLs, ESTADOS, ESTADO_LABELS } from '../services/packingListService'
import CardPL from '../components/CardPL'

const MENSAJES_VACIO = {
  [ESTADOS.PREPARACION]: 'Sin exportaciones en preparación',
  [ESTADOS.REVISION]: 'Sin exportaciones pendientes de revisión',
  [ESTADOS.DESPACHADO]: 'Sin exportaciones despachadas',
}

function PaginaEstado({ estado }) {
  const [pls, setPls] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    setCargando(true)
    const unsub = escucharPLs((lista) => {
      setPls(lista)
      setCargando(false)
    }, estado)
    return unsub
  }, [estado])

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">{ESTADO_LABELS[estado]}</h1>
        <p className="page-sub">{pls.length} packing list{pls.length !== 1 ? 's' : ''}</p>
      </div>
      {cargando ? (
        <div className="empty-state"><div className="spinner" /></div>
      ) : pls.length === 0 ? (
        <div className="empty-state">
          <svg width="48" height="48" fill="none" stroke="#BFDBFE" strokeWidth="1.5" viewBox="0 0 24 24">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
          </svg>
          <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            {MENSAJES_VACIO[estado] || 'Sin registros'}
          </p>
        </div>
      ) : (
        <div className="pl-grid">
          {pls.map((pl) => <CardPL key={pl.id} pl={pl} />)}
        </div>
      )}
    </div>
  )
}

export const Preparacion = () => <PaginaEstado estado={ESTADOS.PREPARACION} />
export const Revision = () => <PaginaEstado estado={ESTADOS.REVISION} />
export const Despachados = () => <PaginaEstado estado={ESTADOS.DESPACHADO} />
