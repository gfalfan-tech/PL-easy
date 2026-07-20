import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { crearSolicitud } from '../services/packingListService'
import ClienteAutocomplete from '../components/ClienteAutocomplete'
import { parsearNV } from '../utils/parsearNV'

function ProductoRow({ prod, idx, onChange, onRemove, puedeEliminar }) {
  return (
    <div className="producto-row-wrap">
      <div className="producto-row">
        <div className="form-group" style={{ flex: 2 }}>
          <label className="form-label">Nombre del producto</label>
          <input className="form-input" value={prod.nombre} onChange={e => onChange(idx, 'nombre', e.target.value)} placeholder="Ej: Cianuro de Sodio" required />
        </div>
        <div className="form-group" style={{ flex: 1 }}>
          <label className="form-label">Cantidad</label>
          <input className="form-input" type="number" min="0" value={prod.cantidad} onChange={e => onChange(idx, 'cantidad', e.target.value)} required />
        </div>
        <div className="form-group" style={{ flex: 1 }}>
          <label className="form-label">Unidad</label>
          <select className="form-input" value={prod.unidad} onChange={e => onChange(idx, 'unidad', e.target.value)}>
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
      <div className="form-group" style={{ marginTop: '6px' }}>
        <label className="form-label">Resolución Exenta <span style={{ color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(solo productos peligrosos)</span></label>
        <input className="form-input" value={prod.resolExenta || ''} onChange={e => onChange(idx, 'resolExenta', e.target.value)} placeholder="Opcional" />
      </div>
    </div>
  )
}

// Extrae texto de un PDF usando PDF.js desde CDN
async function extraerTextoPDF(file) {
  // Cargar PDF.js dinámicamente
  if (!window.pdfjsLib) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
      script.onload = resolve
      script.onerror = reject
      document.head.appendChild(script)
    })
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
  }

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise
  let textoCompleto = ''

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const texto = content.items.map(item => item.str).join('\n')
    textoCompleto += texto + '\n'
  }

  return textoCompleto
}

export default function NuevaSolicitud() {
  const { user, perfil } = useAuth()
  const navigate = useNavigate()
  const fileRef = useRef()
  const [cargando, setCargando] = useState(false)
  const [extrayendo, setExtrayendo] = useState(false)
  const [errorExtraccion, setErrorExtraccion] = useState('')
  const [error, setError] = useState('')
  const [pdfNombre, setPdfNombre] = useState('')

  const [form, setForm] = useState({
    cliente: '', rut: '', direccion: '', notaVenta: '', ordenCompra: '',
    productos: [{ nombre: '', cantidad: '', unidad: 'kg', resolExenta: '' }],
    notas: '',
  })

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSelectCliente = (c) => {
    setForm(f => ({ ...f, cliente: c.nombre, rut: c.rut || '', direccion: c.direccion || '' }))
  }

  const setProducto = (idx, campo, valor) => {
    const prods = [...form.productos]
    prods[idx] = { ...prods[idx], [campo]: valor }
    setForm(f => ({ ...f, productos: prods }))
  }

  const agregarProducto = () => setForm(f => ({ ...f, productos: [...f.productos, { nombre: '', cantidad: '', unidad: 'kg', resolExenta: '' }] }))
  const quitarProducto = (idx) => setForm(f => ({ ...f, productos: f.productos.filter((_, i) => i !== idx) }))

  const handlePDF = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setPdfNombre(file.name)
    setErrorExtraccion('')
    setExtrayendo(true)
    try {
      const texto = await extraerTextoPDF(file)
      const datos = parsearNV(texto)

      if (!datos.cliente && !datos.notaVenta) {
        setErrorExtraccion('No se reconoció el formato. Completa los datos manualmente.')
        setExtrayendo(false)
        return
      }

      setForm(f => ({
        ...f,
        cliente: datos.cliente || f.cliente,
        rut: datos.rut || f.rut,
        direccion: datos.direccion || f.direccion,
        notaVenta: datos.notaVenta || f.notaVenta,
        ordenCompra: datos.ordenCompra || f.ordenCompra,
        productos: datos.productos?.length ? datos.productos : f.productos,
      }))
    } catch (err) {
      console.error(err)
      setErrorExtraccion('Error al leer el PDF. Completa los datos manualmente.')
    } finally {
      setExtrayendo(false)
      e.target.value = ''
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setCargando(true)
    try {
      await crearSolicitud(form, user.uid, perfil.nombre)
      navigate('/dashboard')
    } catch {
      setError('Error al crear la solicitud. Intenta de nuevo.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Nueva Solicitud</h1>
          <p className="page-sub">Sube la Nota de Venta o completa los datos manualmente</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
          <input ref={fileRef} type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handlePDF} />
          <button type="button" className="btn btn--primary" onClick={() => fileRef.current.click()} disabled={extrayendo}>
            {extrayendo ? (
              <>
                <div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }} />
                Leyendo Nota de Venta…
              </>
            ) : (
              <>
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                  <polyline points="14,2 14,8 20,8"/>
                  <path d="M12 18v-6M9 15l3-3 3 3"/>
                </svg>
                Subir Nota de Venta (PDF)
              </>
            )}
          </button>
          {pdfNombre && !extrayendo && !errorExtraccion && (
            <p style={{ fontSize: '.75rem', color: 'var(--accent)' }}>✓ {pdfNombre} — datos cargados</p>
          )}
          {errorExtraccion && (
            <p style={{ fontSize: '.75rem', color: 'var(--danger)' }}>{errorExtraccion}</p>
          )}
        </div>
      </div>

      <div className="form-card">
        <form onSubmit={handleSubmit}>
          <section className="form-section">
            <h2 className="form-section-title"><span className="form-section-num">01</span>Datos del cliente</h2>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Cliente *</label>
                <ClienteAutocomplete value={form.cliente} onChange={v => setField('cliente', v)} onSelect={handleSelectCliente} />
              </div>
              <div className="form-group">
                <label className="form-label">RUT / ID Fiscal</label>
                <input className="form-input" value={form.rut} onChange={e => setField('rut', e.target.value)} placeholder="Se completa automático" />
              </div>
            </div>
            <div className="form-group" style={{ marginTop: '14px' }}>
              <label className="form-label">Dirección</label>
              <textarea className="form-input form-textarea" rows={2} value={form.direccion} onChange={e => setField('direccion', e.target.value)} placeholder="Se completa automático al elegir cliente o subir PDF" style={{ minHeight: '60px' }} />
            </div>
          </section>

          <section className="form-section">
            <h2 className="form-section-title"><span className="form-section-num">02</span>Datos del pedido</h2>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Nota de Venta *</label>
                <input className="form-input" value={form.notaVenta} onChange={e => setField('notaVenta', e.target.value)} placeholder="Ej: SOE-57" required />
              </div>
              <div className="form-group">
                <label className="form-label">Orden de Compra</label>
                <input className="form-input" value={form.ordenCompra || ''} onChange={e => setField('ordenCompra', e.target.value)} placeholder="Se completa automático desde PDF" />
              </div>
            </div>
          </section>

          <section className="form-section">
            <h2 className="form-section-title"><span className="form-section-num">03</span>Productos</h2>
            <div className="productos-lista">
              {form.productos.map((prod, idx) => (
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
              <textarea className="form-input form-textarea" value={form.notas} onChange={e => setField('notas', e.target.value)} placeholder="Instrucciones especiales…" rows={3} />
            </div>
          </section>

          {error && <p className="form-error">{error}</p>}
          <div className="form-actions">
            <button type="button" className="btn btn--ghost" onClick={() => navigate('/dashboard')}>Cancelar</button>
            <button type="submit" className="btn btn--primary" disabled={cargando || extrayendo}>
              {cargando ? 'Creando solicitud…' : 'Crear solicitud'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
