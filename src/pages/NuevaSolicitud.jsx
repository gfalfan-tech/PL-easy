import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { crearSolicitud } from '../services/packingListService'

function ProductoRow({ prod, idx, onChange, onRemove, puedeEliminar }) {
  return (
    <div className="producto-row">
      <div className="form-group" style={{ flex: 2 }}>
        <label className="form-label">Nombre del producto</label>
        <input
          className="form-input"
          value={prod.nombre}
          onChange={(e) => onChange(idx, 'nombre', e.target.value)}
          placeholder="Ej: Cianuro de Sodio"
          required
        />
      </div>
      <div className="form-group" style={{ flex: 1 }}>
        <label className="form-label">Cantidad estimada</label>
        <input
          className="form-input"
          type="number"
          min="0"
          value={prod.cantidad}
          onChange={(e) => onChange(idx, 'cantidad', e.target.value)}
          placeholder="0"
          required
        />
      </div>
      <div className="form-group" style={{ flex: 1 }}>
        <label className="form-label">Unidad</label>
        <select
          className="form-input"
          value={prod.unidad}
          onChange={(e) => onChange(idx, 'unidad', e.target.value)}
        >
          <option value="kg">kg</option>
          <option value="tambores">tambores</option>
          <option value="sacos">sacos</option>
          <option value="pallets">pallets</option>
          <option value="unidades">unidades</option>
        </select>
      </div>
      {puedeEliminar && (
        <button
          type="button"
          className="btn-icon btn-icon--danger"
          onClick={() => onRemove(idx)}
          title="Eliminar producto"
          style={{ alignSelf: 'flex-end', marginBottom: '2px' }}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/>
          </svg>
        </button>
      )}
    </div>
  )
}

export default function NuevaSolicitud() {
  const { user, perfil } = useAuth()
  const navigate = useNavigate()
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    cliente: '',
    direccion: '',
    notaVenta: '',
    resolExenta: '',
    productos: [{ nombre: '', cantidad: '', unidad: 'kg' }],
    notas: '',
  })

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const setProducto = (idx, campo, valor) => {
    const prods = [...form.productos]
    prods[idx] = { ...prods[idx], [campo]: valor }
    setForm((f) => ({ ...f, productos: prods }))
  }

  const agregarProducto = () =>
    setForm((f) => ({
      ...f,
      productos: [...f.productos, { nombre: '', cantidad: '', unidad: 'kg' }],
    }))

  const quitarProducto = (idx) =>
    setForm((f) => ({
      ...f,
      productos: f.productos.filter((_, i) => i !== idx),
    }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setCargando(true)
    try {
      await crearSolicitud(form, user.uid, perfil.nombre)
      navigate('/dashboard')
    } catch (err) {
      setError('Error al crear la solicitud. Intenta de nuevo.')
      console.error(err)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Nueva Solicitud</h1>
          <p className="page-sub">Completa los datos para iniciar un Packing List</p>
        </div>
      </div>

      <div className="form-card">
        <form onSubmit={handleSubmit}>
          {/* Datos del cliente */}
          <section className="form-section">
            <h2 className="form-section-title">
              <span className="form-section-num">01</span>
              Datos del cliente
            </h2>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Cliente *</label>
                <input
                  className="form-input"
                  value={form.cliente}
                  onChange={(e) => setField('cliente', e.target.value)}
                  placeholder="Ej: FRAXIPAR SRL"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Dirección</label>
                <input
                  className="form-input"
                  value={form.direccion}
                  onChange={(e) => setField('direccion', e.target.value)}
                  placeholder="Dirección de destino"
                />
              </div>
            </div>
          </section>

          {/* Datos del pedido */}
          <section className="form-section">
            <h2 className="form-section-title">
              <span className="form-section-num">02</span>
              Datos del pedido
            </h2>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Nota de Venta *</label>
                <input
                  className="form-input"
                  value={form.notaVenta}
                  onChange={(e) => setField('notaVenta', e.target.value)}
                  placeholder="Ej: NV159091"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Resolución Exenta</label>
                <input
                  className="form-input"
                  value={form.resolExenta}
                  onChange={(e) => setField('resolExenta', e.target.value)}
                  placeholder="Opcional"
                />
              </div>
            </div>
          </section>

          {/* Productos */}
          <section className="form-section">
            <h2 className="form-section-title">
              <span className="form-section-num">03</span>
              Productos
            </h2>

            <div className="productos-lista">
              {form.productos.map((prod, idx) => (
                <ProductoRow
                  key={idx}
                  prod={prod}
                  idx={idx}
                  onChange={setProducto}
                  onRemove={quitarProducto}
                  puedeEliminar={form.productos.length > 1}
                />
              ))}
            </div>

            <button
              type="button"
              className="btn btn--ghost"
              onClick={agregarProducto}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
              </svg>
              Agregar producto
            </button>
          </section>

          {/* Notas */}
          <section className="form-section">
            <h2 className="form-section-title">
              <span className="form-section-num">04</span>
              Notas internas
            </h2>
            <div className="form-group">
              <textarea
                className="form-input form-textarea"
                value={form.notas}
                onChange={(e) => setField('notas', e.target.value)}
                placeholder="Instrucciones especiales, referencias, observaciones…"
                rows={3}
              />
            </div>
          </section>

          {error && <p className="form-error">{error}</p>}

          <div className="form-actions">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => navigate('/dashboard')}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={cargando}
            >
              {cargando ? 'Creando solicitud…' : 'Crear solicitud'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
