import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  actualizarPL, cambiarEstado, agregarComentario,
  subirFoto, agregarFoto, ESTADOS
} from '../services/packingListService'
import BarraProgreso from '../components/BarraProgreso'
import BadgeEstado from '../components/BadgeEstado'
import BtnDescargarPDF from '../components/BtnDescargarPDF'
import { db } from '../services/firebase'
import { onSnapshot, doc, deleteDoc } from 'firebase/firestore'
import EnvaseAutocomplete from '../components/EnvaseAutocomplete'

function formatFecha(ts) {
  if (!ts) return '—'
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })
}

function formatFechaCorta(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
}

// ——— Indicadores de kg por producto ———
function IndicadoresKg({ pallets, productosDisponibles }) {
  const productosConKg = productosDisponibles.filter(p => p.unidad === 'kg' && Number(p.cantidad) > 0)
  if (!productosConKg.length) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
      {productosConKg.map((prod, i) => {
        const permitido = Number(prod.cantidad)
        const usado = pallets.reduce((s, pallet) =>
          s + (pallet.items?.filter(it => it.nombre === prod.nombre)
            .reduce((ss, it) => ss + (Number(it.kilosNetos) || 0), 0) || 0), 0)
        const pct = Math.min((usado / permitido) * 100, 100)
        const supera = usado > permitido
        return (
          <div key={i} className={`kg-indicator ${supera ? 'kg-indicator--error' : ''}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{prod.nombre}</span>
              <span className={supera ? 'kg-error-text' : 'kg-ok-text'}>
                {supera ? `⚠ ${usado.toLocaleString()} / ${permitido.toLocaleString()} kg` : `${usado.toLocaleString()} / ${permitido.toLocaleString()} kg`}
              </span>
            </div>
            <div className="kg-indicator-bar">
              <div className="kg-indicator-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ——— Editor de pallets ———
function EditorPallets({ pallets, onChange, productosDisponibles }) {
  const itemVacio = (nombre = '') => ({
    nombre, cantidad: '', descripcionEnvase: '', kilosNetos: '',
    kilosBrutos: '', mts3: '', clasificaCaImo: '', clasificaNu: '', numeroLote: ''
  })

  const agregarPallet = () => {
    onChange(prev => [...prev, {
      numero: prev.length + 1,
      items: [itemVacio(productosDisponibles[0]?.nombre || '')]
    }])
  }

  const repetirUltimo = () => {
    onChange(prev => {
      if (!prev.length) return prev
      const ultimo = JSON.parse(JSON.stringify(prev[prev.length - 1]))
      ultimo.numero = prev.length + 1
      return [...prev, ultimo]
    })
  }

  const agregarItem = (pi) => {
    const p = JSON.parse(JSON.stringify(pallets))
    p[pi].items.push(itemVacio(productosDisponibles[0]?.nombre || ''))
    onChange(p)
  }

  const updateItem = (pi, ii, campo, valor) => {
    const p = JSON.parse(JSON.stringify(pallets))
    p[pi].items[ii][campo] = valor
    onChange(p)
  }

  // Renumera automáticamente al eliminar
  const eliminarPallet = (pi) => {
    onChange(prev => prev.filter((_, i) => i !== pi).map((p, i) => ({ ...p, numero: i + 1 })))
  }

  const eliminarItem = (pi, ii) => {
    const p = JSON.parse(JSON.stringify(pallets))
    p[pi].items.splice(ii, 1)
    onChange(p)
  }

  // Validar campos obligatorios
  const validarItem = (item) => item.nombre && Number(item.kilosNetos) > 0

  return (
    <div className="pallets-editor">
      <IndicadoresKg pallets={pallets} productosDisponibles={productosDisponibles} />

      {pallets.map((pallet, pi) => (
        <div key={pi} className="pallet-block">
          <div className="pallet-header">
            <span className="pallet-num">Pallet #{pallet.numero}</span>
            <button type="button" className="btn-icon btn-icon--danger" onClick={() => eliminarPallet(pi)}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/>
              </svg>
            </button>
          </div>
          <div className="pallet-table-wrap">
            <table className="pallet-table pallet-table--bold">
              <thead>
                <tr>
                 <th>Producto</th><th>Cant.</th>
<th>Kg Netos *</th><th>Kg Brutos</th><th>M³</th>
<th>Clasif. Ca/IMO</th><th>NU</th><th>Lote</th><th>Envase</th><th></th>
                </tr>
              </thead>
              <tbody>
                {pallet.items.map((item, ii) => (
                  <tr key={ii} style={!validarItem(item) ? { background: '#FFF9EC' } : {}}>
                    <td>
                      <select className="table-input" value={item.nombre} onChange={e => updateItem(pi, ii, 'nombre', e.target.value)}>
                        {productosDisponibles.map((p, i) => <option key={i} value={p.nombre}>{p.nombre}</option>)}
                      </select>
                    </td>
                    {['cantidad','kilosNetos','kilosBrutos','mts3','clasificaCaImo','clasificaNu','numeroLote'].map(campo => (
                      <td key={campo}>
                        <input
                          className="table-input"
                          type={['cantidad','kilosNetos','kilosBrutos','mts3'].includes(campo) ? 'number' : 'text'}
                          value={item[campo]}
                          onChange={e => updateItem(pi, ii, campo, e.target.value)}
                          step={campo === 'mts3' ? '0.01' : '1'}
                          min="0"
                          style={campo === 'kilosNetos' && !Number(item.kilosNetos) ? { borderColor: '#F59E0B' } : {}}
                        />
                      </td>
                    ))}
                    <td key="descripcionEnvase" style={{ minWidth: '160px' }}>
                      <EnvaseAutocomplete
                        value={item.descripcionEnvase}
                        onChange={v => updateItem(pi, ii, 'descripcionEnvase', v)}
                      />
                    </td>
                    <td>
                      <button type="button" className="btn-icon btn-icon--danger" onClick={() => eliminarItem(pi, ii)}>
                        <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" className="btn btn--ghost btn--sm" style={{ margin: '10px 14px 12px' }} onClick={() => agregarItem(pi)}>
            + Agregar ítem al pallet
          </button>
        </div>
      ))}

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button type="button" className="btn btn--outline" onClick={agregarPallet}>
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
          </svg>
          Agregar pallet
        </button>
        {pallets.length > 0 && (
          <button type="button" className="btn btn--ghost" onClick={repetirUltimo}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/>
            </svg>
            Repetir pallet anterior
          </button>
        )}
      </div>
    </div>
  )
}

// ——— Galería de fotos (máx 3) ———
function GaleriaFotos({ titulo, fotos, onAgregar, soloLectura }) {
  const fileRef = useRef()
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState('')
  const MAX = 3

  const handleFile = async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setError('')
    const espacioDisponible = MAX - (fotos?.length || 0)
    if (espacioDisponible <= 0) { setError(`Máximo ${MAX} fotos por sección.`); return }
    setSubiendo(true)
    try {
      for (const f of files.slice(0, espacioDisponible)) await onAgregar(f)
    } catch (err) {
      if (err.message === 'MAX_FOTOS') setError(`Máximo ${MAX} fotos por sección.`)
      else setError('Error al subir la foto.')
    }
    setSubiendo(false)
    e.target.value = ''
  }

  const puedeAgregar = !soloLectura && (fotos?.length || 0) < MAX

  return (
    <div className="galeria">
      <div className="galeria-header">
        <h3 className="galeria-titulo">{titulo} <span style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>({fotos?.length || 0}/{MAX})</span></h3>
        {puedeAgregar && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => fileRef.current.click()} disabled={subiendo}>
            {subiendo ? 'Subiendo…' : '+ Agregar fotos'}
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleFile} />
      </div>
      {error && <p style={{ fontSize: '.8rem', color: 'var(--danger)', marginBottom: '8px' }}>{error}</p>}
      {fotos?.length > 0 ? (
        <div className="galeria-grid">
          {fotos.map((f, i) => (
            <a key={i} href={f.url} target="_blank" rel="noopener noreferrer" className="galeria-item">
              <img src={f.url} alt={`Foto ${i + 1}`} className="galeria-img" />
            </a>
          ))}
        </div>
      ) : <p className="galeria-vacia">Sin fotos aún</p>}
    </div>
  )
}

// ——— Datos de retiro ———
function DatosRetiro({ pl, puedeEditar, onGuardar }) {
  const [editando, setEditando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    guiaDespacho: pl.guiaDespacho || '',
    patenteCamion: pl.patenteCamion || '',
    patenteRampla: pl.patenteRampla || '',
    chofer: pl.chofer || '',
    documentoChofer: pl.documentoChofer || '',
  })

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const tieneDatos = pl.guiaDespacho || pl.patenteCamion

  const guardar = async () => {
    if (!form.guiaDespacho.trim()) { setError('La guía de despacho es obligatoria.'); return }
    if (!form.patenteCamion.trim()) { setError('La patente del camión es obligatoria.'); return }
    setError(''); setGuardando(true)
    try { await onGuardar(form); setEditando(false) }
    catch { setError('Error al guardar.') }
    finally { setGuardando(false) }
  }

  if (!editando && !tieneDatos && !puedeEditar) return null

  return (
    <div className="section-card">
      <div className="section-card-header">
        <h2 className="section-title">Datos de retiro de carga</h2>
        {puedeEditar && !editando && (
          <button className="btn btn--outline btn--sm" onClick={() => setEditando(true)}>
            {tieneDatos ? 'Editar' : 'Registrar retiro'}
          </button>
        )}
      </div>
      {editando ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">N° Guía de Despacho *</label>
              <input className="form-input" value={form.guiaDespacho} onChange={e => setField('guiaDespacho', e.target.value)} placeholder="Ej: 12345" />
            </div>
            <div className="form-group">
              <label className="form-label">Patente Camión *</label>
              <input className="form-input" value={form.patenteCamion} onChange={e => setField('patenteCamion', e.target.value.toUpperCase())} placeholder="Ej: ABCD12" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Patente Rampla <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--text-muted)' }}>(opcional)</span></label>
              <input className="form-input" value={form.patenteRampla} onChange={e => setField('patenteRampla', e.target.value.toUpperCase())} placeholder="Ej: WXYZ34" />
            </div>
            <div className="form-group">
              <label className="form-label">Nombre del Chofer</label>
              <input className="form-input" value={form.chofer} onChange={e => setField('chofer', e.target.value)} placeholder="Nombre completo" />
            </div>
          </div>
          <div className="form-group" style={{ maxWidth: '240px' }}>
            <label className="form-label">RUT / DNI Chofer</label>
            <input className="form-input" value={form.documentoChofer} onChange={e => setField('documentoChofer', e.target.value)} placeholder="Ej: 12.345.678-9" />
          </div>
          {error && <p className="form-error">{error}</p>}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button className="btn btn--ghost btn--sm" onClick={() => { setEditando(false); setError('') }}>Cancelar</button>
            <button className="btn btn--primary btn--sm" onClick={guardar} disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</button>
          </div>
        </div>
      ) : tieneDatos ? (
        <div className="retiro-grid">
          {pl.guiaDespacho && <div><span className="info-label">N° Guía de Despacho</span><span className="info-valor">{pl.guiaDespacho}</span></div>}
          {pl.patenteCamion && <div><span className="info-label">Patente Camión</span><span className="info-valor">{pl.patenteCamion}</span></div>}
          {pl.patenteRampla && <div><span className="info-label">Patente Rampla</span><span className="info-valor">{pl.patenteRampla}</span></div>}
          {pl.chofer && <div><span className="info-label">Chofer</span><span className="info-valor">{pl.chofer}</span></div>}
          {pl.documentoChofer && <div><span className="info-label">RUT / DNI Chofer</span><span className="info-valor">{pl.documentoChofer}</span></div>}
        </div>
      ) : (
        <div className="empty-state-sm"><p>Aún no se han registrado los datos de retiro.</p></div>
      )}
    </div>
  )
}

// ——— Modal confirmación ———
function ModalConfirmar({ mensaje, onConfirmar, onCancelar }) {
  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-icon">
          <svg width="28" height="28" fill="none" stroke="#EF4444" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <p className="modal-mensaje">{mensaje}</p>
        <div className="modal-btns">
          <button className="btn btn--ghost" onClick={onCancelar}>Cancelar</button>
          <button className="btn btn--danger" onClick={onConfirmar}>Sí, eliminar</button>
        </div>
      </div>
    </div>
  )
}

// ——— Modal enviar a revisión ———
function ModalRevision({ pallets, productos, onConfirmar, onCancelar }) {
  const totalKgNetos = pallets.reduce((s, p) => s + (p.items?.reduce((ss, i) => ss + (Number(i.kilosNetos) || 0), 0) || 0), 0)
  const totalKgBrutos = pallets.reduce((s, p) => s + (p.items?.reduce((ss, i) => ss + (Number(i.kilosBrutos) || 0), 0) || 0), 0)

  // Validar campos obligatorios
  const itemsInvalidos = pallets.flatMap(p => p.items || []).filter(i => !i.nombre || !Number(i.kilosNetos))
  const hayErrores = itemsInvalidos.length > 0

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: '460px', alignItems: 'stretch', textAlign: 'left' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '4px' }}>Confirmar envío a revisión</h2>
        <p style={{ fontSize: '.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>Revisa el resumen antes de enviar:</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
          <div className="info-card" style={{ padding: '12px' }}>
            <span className="info-label">Total pallets</span>
            <span className="info-valor" style={{ fontSize: '1.4rem', fontWeight: 800 }}>{pallets.length}</span>
          </div>
          <div className="info-card" style={{ padding: '12px' }}>
            <span className="info-label">Kg netos totales</span>
            <span className="info-valor" style={{ fontSize: '1.4rem', fontWeight: 800 }}>{totalKgNetos.toLocaleString('es-CL')}</span>
          </div>
          <div className="info-card" style={{ padding: '12px' }}>
            <span className="info-label">Kg brutos totales</span>
            <span className="info-valor" style={{ fontSize: '1.2rem', fontWeight: 700 }}>{totalKgBrutos.toLocaleString('es-CL')}</span>
          </div>
          <div className="info-card" style={{ padding: '12px' }}>
            <span className="info-label">Productos</span>
            <span className="info-valor" style={{ fontSize: '.85rem' }}>{productos?.map(p => p.nombre).join(', ')}</span>
          </div>
        </div>

        {hayErrores && (
          <div style={{ background: '#FFF9EC', border: '1px solid #FDE68A', borderRadius: 'var(--radius-sm)', padding: '10px 12px', marginBottom: '14px', fontSize: '.8rem', color: '#92400E' }}>
            ⚠ Hay {itemsInvalidos.length} ítem(s) sin producto o sin kg netos. Puedes enviar de todas formas, pero se recomienda completarlos.
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
          <button className="btn btn--ghost" onClick={onCancelar}>Cancelar</button>
          <button className="btn btn--primary" onClick={onConfirmar}>Enviar a revisión</button>
        </div>
      </div>
    </div>
  )
}

// ——— Página principal ———
export default function DetallePL() {
  const { id } = useParams()
  const { perfil } = useAuth()
  const navigate = useNavigate()

  const [pl, setPl] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [errorGuardar, setErrorGuardar] = useState('')
  const [pallets, setPallets] = useState([])
  const [comentario, setComentario] = useState('')
  const [invoiceNum, setInvoiceNum] = useState('')
  const [editandoInvoice, setEditandoInvoice] = useState(false)
  const [modoEdicion, setModoEdicion] = useState(false)
  const [confirmarEliminar, setConfirmarEliminar] = useState(false)
  const [confirmarRevision, setConfirmarRevision] = useState(false)

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'packingLists', id), snap => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() }
        setPl(data)
        if (!modoEdicion) setPallets(data.pallets || [])
        setCargando(false)
      }
    })
    return unsub
  }, [id])

  if (cargando) return <div className="page"><div className="empty-state"><div className="spinner"/></div></div>
  if (!pl) return <div className="page"><div className="empty-state">PL no encontrado.</div></div>

  const esAdmin = perfil?.rol === 'admin'
  const esBodega = perfil?.rol === 'bodega' || esAdmin
  const esFacturacion = perfil?.rol === 'facturacion' || esAdmin
  const puedeEditarSolicitud = esAdmin || esFacturacion
  const puedeEditar = esBodega && (pl.estado === ESTADOS.PREPARACION || pl.estado === ESTADOS.SOLICITUD)
  const puedeEnviarRevision = esBodega && pl.estado === ESTADOS.PREPARACION
  const puedeAprobar = esFacturacion && pl.estado === ESTADOS.REVISION
  const puedeRechazar = esFacturacion && pl.estado === ESTADOS.REVISION
  const puedeFotoRetiro = pl.estado === ESTADOS.DESPACHADO
  const enRevision = pl.estado === ESTADOS.REVISION

  // Validar kg por producto
  const kgPermitidosPorProducto = {}
  pl.productos?.forEach(p => {
    if (p.unidad === 'kg') kgPermitidosPorProducto[p.nombre] = Number(p.cantidad) || 0
  })

  const superaAlgunKg = Object.keys(kgPermitidosPorProducto).some(nombre => {
    const permitido = kgPermitidosPorProducto[nombre]
    const usado = pallets.reduce((s, pallet) =>
      s + (pallet.items?.filter(i => i.nombre === nombre)
        .reduce((ss, i) => ss + (Number(i.kilosNetos) || 0), 0) || 0), 0)
    return usado > permitido
  })

  const guardarPallets = async () => {
    if (superaAlgunKg) { setErrorGuardar('Hay productos que superan el kg permitido. Corrígelos antes de guardar.'); return }
    setErrorGuardar(''); setGuardando(true)
    try {
      await actualizarPL(id, { pallets })
      setModoEdicion(false)
    } catch { setErrorGuardar('Error al guardar. Intenta de nuevo.') }
    finally { setGuardando(false) }
  }

  const enviarAPreparacion = async () => {
    await cambiarEstado(id, ESTADOS.PREPARACION, perfil.nombre)
  }

  const enviarARevision = async () => {
    await cambiarEstado(id, ESTADOS.REVISION, perfil.nombre)
    setConfirmarRevision(false)
  }

  const aprobar = async () => {
    const numInvoice = invoiceNum.trim() || pl.invoiceNumero
    if (!numInvoice) { alert('Ingresa el número de Invoice para aprobar.'); return }
    await agregarComentario(id, comentario || 'PL aprobado', perfil.nombre, 'aprobacion')
    await cambiarEstado(id, ESTADOS.DESPACHADO, perfil.nombre, { invoiceNumero: numInvoice })
    setComentario(''); setInvoiceNum('')
  }

  const rechazar = async () => {
    if (!comentario.trim()) { alert('Escribe un comentario indicando qué debe corregirse.'); return }
    await agregarComentario(id, comentario, perfil.nombre, 'rechazo')
    await cambiarEstado(id, ESTADOS.PREPARACION, perfil.nombre)
    setComentario('')
  }

  const eliminar = async () => {
    await deleteDoc(doc(db, 'packingLists', id))
    navigate('/dashboard')
  }

  const guardarInvoice = async () => {
    if (!invoiceNum.trim()) return
    await actualizarPL(id, { invoiceNumero: invoiceNum })
    setEditandoInvoice(false)
  }

  const handleFoto = async (archivo, seccion) => {
    const url = await subirFoto(id, archivo, seccion)
    await agregarFoto(id, url, seccion)
  }

  const totalKgNetos = pallets.reduce((s, p) => s + (p.items?.reduce((ss, i) => ss + (Number(i.kilosNetos) || 0), 0) || 0), 0)
  const totalKgBrutos = pallets.reduce((s, p) => s + (p.items?.reduce((ss, i) => ss + (Number(i.kilosBrutos) || 0), 0) || 0), 0)
  const totalMts3 = pallets.reduce((s, p) => s + (p.items?.reduce((ss, i) => ss + (Number(i.mts3) || 0), 0) || 0), 0)
  const totalBultos = pallets.reduce((s, p) => s + (p.items?.reduce((ss, i) => ss + (Number(i.cantidad) || 0), 0) || 0), 0)

  return (
    <div className="page">
      {confirmarEliminar && (
        <ModalConfirmar
          mensaje="¿Eliminar este Packing List? Esta acción no se puede deshacer."
          onConfirmar={eliminar}
          onCancelar={() => setConfirmarEliminar(false)}
        />
      )}
      {confirmarRevision && (
        <ModalRevision
          pallets={pallets}
          productos={pl.productos}
          onConfirmar={enviarARevision}
          onCancelar={() => setConfirmarRevision(false)}
        />
      )}

      {/* Header */}
      <div className="page-header">
        <button className="btn-back" onClick={() => navigate(-1)}>
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Volver
        </button>
        <div className="page-header-right">
          <BadgeEstado estado={pl.estado} />

          {/* Invoice editable en cualquier momento */}
          {editandoInvoice ? (
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <input
                className="form-input"
                style={{ width: '120px', padding: '5px 8px', fontSize: '.8rem' }}
                value={invoiceNum}
                onChange={e => setInvoiceNum(e.target.value)}
                placeholder="N° Invoice"
                autoFocus
              />
              <button className="btn btn--primary btn--sm" onClick={guardarInvoice}>✓</button>
              <button className="btn btn--ghost btn--sm" onClick={() => { setEditandoInvoice(false); setInvoiceNum('') }}>✕</button>
            </div>
          ) : (
            <button
              className={pl.invoiceNumero ? 'invoice-badge' : 'btn btn--ghost btn--sm'}
              style={{ cursor: puedeEditarSolicitud ? 'pointer' : 'default' }}
              onClick={() => { if (puedeEditarSolicitud) { setInvoiceNum(pl.invoiceNumero || ''); setEditandoInvoice(true) } }}
              title={puedeEditarSolicitud ? 'Clic para editar Invoice' : ''}
            >
              {pl.invoiceNumero ? `Invoice #${pl.invoiceNumero} ✎` : puedeEditarSolicitud ? '+ Invoice' : ''}
            </button>
          )}

          {/* PDF disponible desde que hay pallets */}
          {pallets.length > 0 && <BtnDescargarPDF pl={pl} />}

          {puedeEditarSolicitud && (
            <>
              <button className="btn btn--outline btn--sm" onClick={() => navigate(`/editar-solicitud/${id}`)}>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                Editar
              </button>
              <button className="btn btn--danger btn--sm" onClick={() => setConfirmarEliminar(true)}>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/>
                </svg>
                Eliminar
              </button>
            </>
          )}
        </div>
      </div>

      <BarraProgreso estadoActual={pl.estado} />

      {/* Aviso bloqueado en revisión */}
      {enRevision && esBodega && !esFacturacion && (
        <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 'var(--radius-md)', padding: '12px 16px', fontSize: '.875rem', color: '#1E40AF' }}>
          🔒 Este PL está en revisión por Facturación. No puedes editarlo hasta que sea aprobado o devuelto.
        </div>
      )}

      {/* Info general */}
      <div className="detalle-grid">
        <div className="info-card">
          <div className="info-card-row">
            <div><span className="info-label">Cliente</span><span className="info-valor">{pl.cliente}</span></div>
            <div><span className="info-label">Nota de Venta</span><span className="info-valor">NV {pl.notaVenta}</span></div>
          </div>
          {pl.ordenCompra && <div><span className="info-label">Orden de Compra</span><span className="info-valor">{pl.ordenCompra}</span></div>}
          {pl.rut && <div><span className="info-label">RUT / ID Fiscal</span><span className="info-valor">{pl.rut}</span></div>}
          {pl.direccion && <div><span className="info-label">Dirección</span><span className="info-valor">{pl.direccion}</span></div>}
          <div className="info-card-row">
            <div><span className="info-label">Creado por</span><span className="info-valor">{pl.creadoPor?.nombre}</span></div>
            <div><span className="info-label">Fecha</span><span className="info-valor">{formatFecha(pl.creadoEn)}</span></div>
          </div>
          {pl.notas && <div><span className="info-label">Notas</span><span className="info-valor">{pl.notas}</span></div>}
        </div>

        <div className="info-card">
          <h3 className="info-card-title">Productos solicitados</h3>
          {pl.productos?.map((p, i) => (
            <div key={i} className="producto-chip">
              <div>
                <span className="producto-chip-nombre">{p.nombre}</span>
                {p.resolExenta && <span className="producto-chip-resol">Res. Exenta: {p.resolExenta}</span>}
              </div>
              <span className="producto-chip-cant">{p.cantidad} {p.unidad}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Totales */}
      {pallets.length > 0 && (
        <div className="totales-bar">
          <div className="total-item"><span className="total-num">{pallets.length}</span><span className="total-label">pallets</span></div>
          <div className="total-item"><span className="total-num">{totalBultos.toLocaleString('es-CL')}</span><span className="total-label">bultos</span></div>
          <div className="total-item"><span className="total-num">{totalKgNetos.toLocaleString('es-CL')}</span><span className="total-label">kg netos</span></div>
          <div className="total-item"><span className="total-num">{totalKgBrutos.toLocaleString('es-CL')}</span><span className="total-label">kg brutos</span></div>
          <div className="total-item"><span className="total-num">{totalMts3.toFixed(2)}</span><span className="total-label">m³</span></div>
        </div>
      )}

      {/* Pallets */}
      <div className="section-card">
        <div className="section-card-header">
          <h2 className="section-title">Detalle de pallets</h2>
          {puedeEditar && !modoEdicion && !enRevision && (
            <button className="btn btn--outline btn--sm" onClick={() => setModoEdicion(true)}>Editar pallets</button>
          )}
          {modoEdicion && (
            <div style={{ display: 'flex', gap: '8px', flexDirection: 'column', alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn--ghost btn--sm" onClick={() => { setPallets(pl.pallets || []); setModoEdicion(false); setErrorGuardar('') }}>Cancelar</button>
                <button className="btn btn--primary btn--sm" onClick={guardarPallets} disabled={guardando}>
                  {guardando ? 'Guardando…' : 'Guardar pallets'}
                </button>
              </div>
              {errorGuardar && <p style={{ fontSize: '.8rem', color: '#EF4444', textAlign: 'right' }}>{errorGuardar}</p>}
            </div>
          )}
        </div>

        {modoEdicion ? (
          <EditorPallets pallets={pallets} onChange={setPallets} productosDisponibles={pl.productos || []} />
        ) : pallets.length === 0 ? (
          <div className="empty-state-sm">
            <p>Sin pallets registrados aún.</p>
            {puedeEditar && !enRevision && <button className="btn btn--outline btn--sm" onClick={() => setModoEdicion(true)}>Agregar pallets</button>}
          </div>
        ) : (
          <div className="pallets-readonly">
            {pallets.map((pallet, pi) => (
              <div key={pi} className="pallet-readonly-block">
                <p className="pallet-num">Pallet #{pallet.numero || pi + 1}</p>
                <table className="pallet-table pallet-table--readonly pallet-table--bold">
                  <thead>
                    <tr><th>Producto</th><th>Cant.</th><th>Envase</th><th>Kg Netos</th><th>Kg Brutos</th><th>M³</th><th>Clasif. IMO</th><th>NU</th><th>Lote</th></tr>
                  </thead>
                  <tbody>
                    {pallet.items?.map((item, ii) => (
                      <tr key={ii}>
                        <td>{item.nombre}</td><td>{item.cantidad}</td><td>{item.descripcionEnvase}</td>
                        <td>{item.kilosNetos}</td><td>{item.kilosBrutos}</td><td>{item.mts3}</td>
                        <td>{item.clasificaCaImo}</td><td>{item.clasificaNu}</td><td>{item.numeroLote}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fotos preparación */}
      <div className="section-card">
        <GaleriaFotos titulo="Fotos de preparación" fotos={pl.fotosPreparacion} soloLectura={!puedeEditar || enRevision} onAgregar={f => handleFoto(f, 'fotosPreparacion')} />
      </div>

      {/* Fotos retiro */}
      {(pl.estado === ESTADOS.DESPACHADO || pl.fotosRetiro?.length > 0) && (
        <div className="section-card">
          <GaleriaFotos titulo="Fotos de retiro de carga" fotos={pl.fotosRetiro} soloLectura={!puedeFotoRetiro} onAgregar={f => handleFoto(f, 'fotosRetiro')} />
        </div>
      )}

      {/* Datos retiro */}
      {pl.estado === ESTADOS.DESPACHADO && (
        <DatosRetiro pl={pl} puedeEditar={puedeEditarSolicitud} onGuardar={datos => actualizarPL(id, datos)} />
      )}

      {/* Historial de estados */}
      {pl.historialEstados?.length > 0 && (
        <div className="section-card">
          <h2 className="section-title" style={{ marginBottom: '12px' }}>Historial de estados</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {pl.historialEstados.map((h, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '.8rem', padding: '6px 0', borderBottom: i < pl.historialEstados.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <BadgeEstado estado={h.estado} size="sm" />
                <span style={{ color: 'var(--text-secondary)' }}>por <strong>{h.autor}</strong></span>
                <span style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>{formatFechaCorta(h.fecha)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comentarios */}
      {pl.comentarios?.length > 0 && (
        <div className="section-card">
          <h2 className="section-title">Comentarios</h2>
          <div className="comentarios-lista">
            {pl.comentarios.map((c, i) => (
              <div key={i} className={`comentario comentario--${c.tipo}`}>
                <div className="comentario-header">
                  <span className="comentario-autor">{c.autor}</span>
                  <span className="comentario-fecha">{new Date(c.fecha).toLocaleDateString('es-CL')}</span>
                  <span className={`comentario-tipo comentario-tipo--${c.tipo}`}>
                    {c.tipo === 'rechazo' ? 'Rechazo' : c.tipo === 'aprobacion' ? 'Aprobación' : 'Nota'}
                  </span>
                </div>
                <p className="comentario-texto">{c.texto}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Acciones */}
      <div className="acciones-card">
        {pl.estado === ESTADOS.SOLICITUD && esBodega && (
          <div className="accion-grupo">
            <p className="accion-desc">Confirma que iniciaste la preparación de este pedido.</p>
            <button className="btn btn--primary" onClick={enviarAPreparacion}>Iniciar preparación</button>
          </div>
        )}
        {puedeEnviarRevision && (
          <div className="accion-grupo">
            <p className="accion-desc">El PL está listo. Envíalo a revisión de Facturación.</p>
            <button className="btn btn--primary" onClick={() => setConfirmarRevision(true)} disabled={pallets.length === 0}>
              Enviar a revisión
            </button>
          </div>
        )}
        {(puedeAprobar || puedeRechazar) && (
          <div className="accion-grupo">
            <div className="form-group">
              <label className="form-label">Comentario</label>
              <textarea className="form-input form-textarea" value={comentario} onChange={e => setComentario(e.target.value)} placeholder={puedeRechazar ? 'Indica qué debe corregirse (obligatorio para rechazar)…' : 'Opcional…'} rows={2} />
            </div>
            {puedeAprobar && (
              <div className="form-group">
                <label className="form-label">N° Invoice (obligatorio para aprobar)</label>
                <input className="form-input" value={invoiceNum} onChange={e => setInvoiceNum(e.target.value)} placeholder={pl.invoiceNumero || 'Ej: 244'} />
              </div>
            )}
            <div className="accion-btns">
              {puedeRechazar && <button className="btn btn--danger" onClick={rechazar}>Rechazar — volver a preparación</button>}
              {puedeAprobar && <button className="btn btn--success" onClick={aprobar}>Aprobar y despachar</button>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
