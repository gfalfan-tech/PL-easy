import { useState, useEffect } from 'react'
import { escucharClientes, crearCliente, actualizarCliente, eliminarCliente } from '../services/clientesService'

function ModalCliente({ cliente, onGuardar, onCerrar }) {
  const [form, setForm] = useState(
    cliente || { nombre: '', rut: '', direccion: '', pais: '' }
  )
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.nombre.trim()) { setError('El nombre es obligatorio.'); return }
    setGuardando(true)
    try {
      await onGuardar(form)
      onCerrar()
    } catch {
      setError('Error al guardar. Intenta de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: '480px', alignItems: 'stretch', textAlign: 'left' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '4px' }}>
          {cliente ? 'Editar cliente' : 'Nuevo cliente'}
        </h2>
        <p style={{ fontSize: '.8rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
          Los datos se usarán en los packing lists automáticamente.
        </p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="form-group">
            <label className="form-label">Nombre *</label>
            <input className="form-input" value={form.nombre} onChange={e => setField('nombre', e.target.value)} placeholder="Ej: FRAXIPAR SRL" required />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">RUT / ID Fiscal</label>
              <input className="form-input" value={form.rut} onChange={e => setField('rut', e.target.value)} placeholder="Ej: 12.345.678-9" />
            </div>
            <div className="form-group">
              <label className="form-label">País</label>
              <input className="form-input" value={form.pais} onChange={e => setField('pais', e.target.value)} placeholder="Ej: Paraguay" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Dirección</label>
            <textarea className="form-input form-textarea" rows={2} value={form.direccion} onChange={e => setField('direccion', e.target.value)} placeholder="Dirección completa de entrega" style={{ minHeight: '60px' }} />
          </div>
          {error && <p className="form-error">{error}</p>}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
            <button type="button" className="btn btn--ghost" onClick={onCerrar}>Cancelar</button>
            <button type="submit" className="btn btn--primary" disabled={guardando}>
              {guardando ? 'Guardando…' : cliente ? 'Guardar cambios' : 'Crear cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

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
        <p className="modal-mensaje">¿Eliminar a <strong>{nombre}</strong>? Esta acción no se puede deshacer.</p>
        <div className="modal-btns">
          <button className="btn btn--ghost" onClick={onCancelar}>Cancelar</button>
          <button className="btn btn--danger" onClick={onConfirmar}>Sí, eliminar</button>
        </div>
      </div>
    </div>
  )
}

export default function Clientes() {
  const [clientes, setClientes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [modalNuevo, setModalNuevo] = useState(false)
  const [editando, setEditando] = useState(null)
  const [eliminando, setEliminando] = useState(null)

  useEffect(() => {
    const unsub = escucharClientes(lista => { setClientes(lista); setCargando(false) })
    return unsub
  }, [])

  const filtrados = clientes.filter(c =>
    c.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.rut?.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.pais?.toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <div className="page">
      {modalNuevo && (
        <ModalCliente onGuardar={datos => crearCliente(datos)} onCerrar={() => setModalNuevo(false)} />
      )}
      {editando && (
        <ModalCliente cliente={editando} onGuardar={datos => actualizarCliente(editando.id, datos)} onCerrar={() => setEditando(null)} />
      )}
      {eliminando && (
        <ModalConfirmar
          nombre={eliminando.nombre}
          onConfirmar={async () => { await eliminarCliente(eliminando.id); setEliminando(null) }}
          onCancelar={() => setEliminando(null)}
        />
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">Clientes</h1>
          <p className="page-sub">{clientes.length} cliente{clientes.length !== 1 ? 's' : ''} registrados</p>
        </div>
        <button className="btn btn--primary" onClick={() => setModalNuevo(true)}>
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
          </svg>
          Nuevo cliente
        </button>
      </div>

      <div className="busqueda-wrap" style={{ maxWidth: '100%' }}>
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="busqueda-icon">
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
        </svg>
        <input
          type="text"
          placeholder="Buscar por nombre, RUT o país…"
          className="busqueda-input"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          style={{ maxWidth: '100%', borderRadius: 'var(--radius-sm)' }}
        />
      </div>

      {cargando ? (
        <div className="empty-state"><div className="spinner" /></div>
      ) : filtrados.length === 0 ? (
        <div className="empty-state">
          <svg width="40" height="40" fill="none" stroke="#CBD5E1" strokeWidth="1.5" viewBox="0 0 24 24">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
          </svg>
          <p>{busqueda ? 'No se encontraron clientes.' : 'Aún no hay clientes. Agrega el primero.'}</p>
        </div>
      ) : (
        <div className="clientes-tabla-wrap">
          <table className="clientes-tabla">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>RUT / ID Fiscal</th>
                <th>País</th>
                <th>Dirección</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map(c => (
                <tr key={c.id}>
                  <td className="cliente-nombre">{c.nombre}</td>
                  <td className="cliente-rut">{c.rut || '—'}</td>
                  <td>{c.pais || '—'}</td>
                  <td className="cliente-dir">{c.direccion || '—'}</td>
                  <td className="cliente-acciones">
                    <button className="btn-icon" onClick={() => setEditando(c)} title="Editar">
                      <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <button className="btn-icon btn-icon--danger" onClick={() => setEliminando(c)} title="Eliminar">
                      <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/>
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
