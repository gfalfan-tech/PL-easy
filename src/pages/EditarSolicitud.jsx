import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { db } from '../services/firebase'
import { doc, onSnapshot } from 'firebase/firestore'
import { actualizarPL } from '../services/packingListService'

function ProductoRow({ prod, idx, onChange, onRemove, puedeEliminar }) {
  return (
    <div className="producto-row">
      <div className="form-group" style={{ flex: 2 }}>
        <label className="form-label">Nombre del producto</label>
        <input className="form-input" value={prod.nombre} onChange={(e) => onChange(idx, 'nombre', e.target.value)} required />
      </div>
      <div className="form-group" style={{ flex: 1 }}>
        <label className="form-label">Cantidad</label>
        <input className="form-input" type="number" min="0" value={prod.cantidad} onChange={(e) => onChange(idx, 'cantidad', e.target.value)} required />
      </div>
      <div className="form-group" style={{ flex: 1 }}>
        <label className="form-label">Unidad</label>
        <select className="form-input" value={prod.unidad} onChange={(e) => onChange(idx, 'unidad', e.target.value)}>
          <option value="kg">kg</option>
          <option value="tambores">tambores</option>
          <option value="sacos">sacos</option>
          <option value="pallets">pallets</option>
          <option value="unidades">unidades</option>
        </select>
      </div>
      {puedeEliminar && (
        <button type="button" className="btn-icon btn-icon--danger" onClick={() => onRemove(idx)} style={{ alignSelf: 'flex-end', marginBottom: '2px' }}>
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/>
          </svg>
        </button>
      )}
    </div>
  )
}

export default function EditarSolicitud() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState(null)

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'packingLists', id), (snap) => {
      if (snap.exists()) { setForm(snap.data()); setCargando(false) }
    })
    return unsub
  }, [id])

  if (cargando || !form) return <div className="page"><div className="empty-state"><div className="spinner"/></div></div>

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const setProducto = (idx, campo, valor) => {
    const prods = [...form.productos]
    prods[idx] = { ...prods[idx], [campo]: valor }
    setForm((f) => ({ ...f, productos: prods }))
  }
  const agregarProducto = () => setForm((f) => ({ ...f, productos: [...f.productos, { nombre: '', cantidad: '', unidad: 'kg' }] }))
  const quitarProducto = (idx) => setForm((f) => ({ ...f, productos: f.productos.filter((_, i) => i !== idx) }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setGuardando(true)
    try {
      await actualizarPL(id, { cliente: form.cliente, direccion: form.direccion, notaVenta: form.notaVenta, resolExenta: form.resolExenta, productos: form.productos, notas: form.notas })
      navigate(`/pl/${id}`)
    } catch (err) {
      setError('Error al guardar. Intenta de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Editar Solicitud</h1>
          <p className="page-sub">NV {form.notaVenta} · {form.cliente}</p>
        </div>
      </div>
      <div className="form-card">
        <form onSubmit={handleSubmit}>
          <section className="form-section">
            <h2 className="form-section-title"><span className="form-section-num">01</span>Datos del cliente</h2>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Cliente *</label>
                <input className="form-input" value={form.cliente} onChange={(e) => setField('cliente', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Dirección</label>
                <input className="form-input" value={form.direccion || ''} onChange={(e) => setField('direccion', e.target.value)} />
              </div>
            </div>
          </section>
          <section className="form-section">
            <h2 className="form-section-title"><span className="form-section-num">02</span>Datos del pedido</h2>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Nota de Venta *</label>
                <input className="form-input" value={form.notaVenta} onChange={(e) => setField('notaVenta', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Resolución Exenta</label>
                <input className="form-input" value={form.resolExenta || ''} onChange={(e) => setField('resolExenta', e.target.value)} />
              </div>
            </div>
          </section>
          <section className="form-section">
            <h2 className="form-section-title"><span className="form-section-num">03</span>Productos</h2>
            <div className="productos-lista">
              {form.productos?.map((prod, idx) => (
                <ProductoRow key={idx} prod={prod} idx={idx} onChange={setProducto} onRemove={quitarProducto} puedeEliminar={form.productos.length > 1} />
              ))}
            </div>
            <button type="button" className="btn btn--ghost" onClick={agregarProducto}>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
              </svg>
              Agregar producto
            </button>
          </section>
          <section className="form-section">
            <h2 className="form-section-title"><span className="form-section-num">04</span>Notas internas</h2>
            <div className="form-group">
              <textarea className="form-input form-textarea" value={form.notas || ''} onChange={(e) => setField('notas', e.target.value)} rows={3} />
            </div>
          </section>
          {error && <p className="form-error">{error}</p>}
          <div className="form-actions">
            <button type="button" className="btn btn--ghost" onClick={() => navigate(`/pl/${id}`)}>Cancelar</button>
            <button type="submit" className="btn btn--primary" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar cambios'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
