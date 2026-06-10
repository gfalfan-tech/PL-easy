import { ESTADOS, ESTADO_LABELS, ESTADO_COLORS } from '../services/packingListService'

const PASOS = [
  ESTADOS.SOLICITUD,
  ESTADOS.PREPARACION,
  ESTADOS.REVISION,
  ESTADOS.DESPACHADO,
]

export default function BarraProgreso({ estadoActual }) {
  const idxActual = PASOS.indexOf(estadoActual)

  return (
    <div className="barra-progreso">
      {PASOS.map((paso, idx) => {
        const completado = idx < idxActual
        const activo = idx === idxActual
        const color = ESTADO_COLORS[paso]

        return (
          <div key={paso} className="barra-paso-wrapper">
            <div className={`barra-paso ${completado ? 'completado' : ''} ${activo ? 'activo' : ''}`}>
              <div
                className="barra-paso-circulo"
                style={
                  completado || activo
                    ? { backgroundColor: color, borderColor: color }
                    : {}
                }
              >
                {completado ? (
                  <svg width="12" height="12" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M5 13l4 4L19 7"/>
                  </svg>
                ) : (
                  <span
                    className="barra-paso-num"
                    style={activo ? { color: 'white' } : {}}
                  >
                    {idx + 1}
                  </span>
                )}
              </div>
              <span
                className="barra-paso-label"
                style={activo ? { color, fontWeight: 600 } : completado ? { color: '#64748B' } : {}}
              >
                {ESTADO_LABELS[paso]}
              </span>
            </div>
            {idx < PASOS.length - 1 && (
              <div
                className="barra-conector"
                style={completado ? { backgroundColor: ESTADO_COLORS[PASOS[idx]] } : {}}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
