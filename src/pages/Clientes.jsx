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
          <svg width="16" height="16" fill="none" stroke=
