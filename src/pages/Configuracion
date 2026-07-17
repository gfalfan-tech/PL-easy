import { useState, useEffect } from 'react'
import { escucharEnvases, crearEnvase, actualizarEnvase, eliminarEnvase } from '../services/configuracionService'

function ModalConfirmar({ nombre, onConfirmar, onCancelar }) {
  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-icon">
          <svg width="28" height="28" fill="none" stroke="#EF4444" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <p className="modal-mensaje">¿Eliminar el envase <strong>"{nombre}"</strong>?</p>
        <div className="modal-btns">
          <button className="btn btn--ghost" onClick={onCancelar}>Cancelar</button>
          <button className="btn btn--danger" onClick={onConfirmar}>Sí, eliminar</button>
        </div>
      </div>
    </div>
  )
}

export default function Configuracion() {
  const [envases, setEnvases] = useState([])
  const [cargando, setCargando] = useState(true)
  const [nuevoEnvase, setNuevoEnvase] = useState('')
  const [editandoId, setEditandoId] = useState(null)
  const [editandoNombre, setEditandoNombre] = useState('')
  const [eliminando, setEliminando] = useState(null)
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    const unsub = escucharEnvases(lista => { setEnvases(lista); setCargando(false) })
    return unsub
  }, [])

  const agregar = async () => {
    if (!nuevoEnvase.trim()) { setError('Escribe un nombre de envase.'); return }
    if (envases.some(e => e.nombre.toLowerCase() === nuevoEnvase.toLowerCase())) { setError('Ya existe ese envase.'); return }
    setError(''); setGuardando(true)
    await crearEnvase(nuevoEnvase.trim())
    setNuevoEnvase(''); setGuardando(false)
  }

  const guardarEdicion = async (id) => {
    if (!editandoNombre.trim()) return
    await actualizarEnvase(id, editandoNombre.trim())
    setEditandoId(null); setEditandoNombre('')
  }

  return (
    <div className="page">
      {eliminando && (
        <ModalConfirmar
          nombre={eliminando.nombre}
          onConfirmar={async () => { await eliminarEnvase(eliminando.id); setEliminando(null) }}
          onCancelar={() => setEliminando(null)}
        />
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">Configuración</h1>
          <p className="page-sub">Gestiona los tipos de envase disponibles en el sistema</p>
        </div>
      </div>

      {/* Módulo de envases */}
      <div className="form-card">
        <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
          Tipos de Envase
        </h2>

        {/* Agregar nuevo */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <input
            className="form-input"
            value={nuevoEnvase}
            onChange={e => { setNuevoEnvase(e.target.value); setError('') }}
            placeholder="Ej: Tambor metálico 50 kg c/u"
            onKeyDown={e => e.key === 'Enter' && agregar()}
            style={{ flex: 1 }}
          />
          <button className="btn btn--primary" onClick={agregar} disabled={guardando}>
            {guardando ? 'Agregando…' : '+ Agregar'}
          </button>
        </div>
        {error && <p className="form-error" style={{ marginBottom: '12px' }}>{error}</p>}

        {/* Lista */}
        {cargando ? (
          <div className="empty-state"><div className="spinner" /></div>
        ) : envases.length === 0 ? (
          <div className="empty-state-sm">
            <p>No hay tipos de envase. Agrega el primero.</p>
          </div>
        ) : (
          <div className="clientes-tabla-wrap">
            <table className="clientes-tabla">
              <thead>
                <tr><th>Nombre del envase</th><th></th></tr>
              </thead>
              <tbody>
                {envases.map(e => (
                  <tr key={e.id}>
                    <td>
                      {editandoId === e.id ? (
                        <input
                          className="form-input"
                          value={editandoNombre}
                          onChange={ev => setEditandoNombre(ev.target.value)}
                          onKeyDown={ev => { if (ev.key === 'Enter') guardarEdicion(e.id); if (ev.key === 'Escape') { setEditandoId(null) } }}
                          autoFocus
                          style={{ padding: '6px 10px', fontSize: '.875rem' }}
                        />
                      ) : (
                        <span style={{ fontWeight: 500 }}>{e.nombre}</span>
                      )}
                    </td>
                    <td className="cliente-acciones">
                      {editandoId === e.id ? (
                        <>
                          <button className="btn btn--primary btn--sm" onClick={() => guardarEdicion(e.id)}>✓</button>
                          <button className="btn btn--ghost btn--sm" onClick={() => setEditandoId(null)}>✕</button>
                        </>
                      ) : (
                        <>
                          <button className="btn-icon" onClick={() => { setEditandoId(e.id); setEditandoNombre(e.nombre) }} title="Editar">
                            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                          <button className="btn-icon btn-icon--danger" onClick={() => setEliminando(e)} title="Eliminar">
                            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/>
                            </svg>
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
