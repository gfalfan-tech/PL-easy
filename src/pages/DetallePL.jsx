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

function formatFecha(ts) {
  if (!ts) return '—'
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })
}

function EditorPallets({ pallets, onChange, productosDisponibles, kgPermitidos }) {
  const itemVacio = (nombre = '') => ({
    nombre, cantidad: '', descripcionEnvase: '', kilosNetos: '',
    kilosBrutos: '', mts3: '', clasificaCaImo: '', clasificaNu: '', numeroLote: ''
  })

  const totalKgActual = pallets.reduce((s, p) =>
    s + (p.items?.reduce((ss, i) => ss + (Number(i.kilosNetos) || 0), 0) || 0), 0)
  const superaKg = kgPermitidos > 0 && totalKgActual > kgPermitidos

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

  const eliminarPallet = (pi) => onChange(pallets.filter((_, i) => i !== pi))

  const eliminarItem = (pi, ii) => {
    const p = JSON.parse(JSON.stringify(pallets))
    p[pi].items.splice(ii, 1)
    onChange(p)
  }

  return (
    <div className="pallets-editor">
      {kgPermitidos > 0 && (
        <div className={`kg-indicator ${superaKg ? 'kg-indicator--error' : ''}`}>
          <div className="kg-indicator-bar">
            <div className="kg-indicator-fill" style={{ width: `${Math.min((totalKgActual / kgPermitidos) * 100, 100)}%` }} />
          </div>
          <span className={superaKg ? 'kg-error-text' : 'kg-ok-text'}>
            {superaKg
              ? `⚠ Superaste el límite: ${totalKgActual.toLocaleString()} kg de ${kgPermitidos.toLocaleString()} kg permitidos`
              : `${totalKgActual.toLocaleString()} / ${kgPermitidos.toLocaleString()} kg netos`}
          </span>
        </div>
      )}

      {pallets.map((pallet, pi) => (
        <div key={pi} className="pallet-block">
          <div className="pallet-header">
            <span className="pallet-num">Pallet #{pallet.numero || pi + 1}</span>
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
                  <th>Producto</th><th>Cant.</th><th>Envase</th>
                  <th>Kg Netos</th><th>Kg Brutos</th><th>M³</th>
                  <th>Clasif. Ca/IMO</th><th>NU</th><th>Lote</th><th></th>
                </tr>
              </thead>
              <tbody>
                {pallet.items.map((item, ii) => (
                  <tr key={ii}>
                    <td>
                      <select className="table-input" value={item.nombre} onChange={(e) => updateItem(pi, ii, 'nombre', e.target.value)}>
                        {productosDisponibles.map((p, i) => (
                          <option key={i} value={p.nombre}>{p.nombre}</option>
                        ))}
                      </select>
                    </td>
                    {['cantidad','descripcionEnvase','kilosNetos','kilosBrutos','mts3','clasificaCaImo','clasificaNu','numeroLote'].map((campo) => (
                      <td key={campo}>
                        <input
                          className="table-input"
                          type={['cantidad','kilosNetos','kilosBrutos','mts3'].includes(campo) ? 'number' : 'text'}
                          value={item[campo]}
                          onChange={(e) => updateItem(pi, ii, campo, e.target.value)}
                          step={campo === 'mts3' ? '0.01' : '1'}
                          min="0"
                        />
                      </td>
                    ))}
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
          <button type="button" className="btn btn--ghost btn--sm" style={{margin:'10px 14px 12px'}} onClick={() => agregarItem(pi)}>
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

function GaleriaFotos({ titulo, fotos, onAgregar, soloLectura }) {
  const fileRef = useRef()
  const [subiendo, setSubiendo] = useState(false)
  const handleFile = async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setSubiendo(true)
    for (const f of files) await onAgregar(f)
    setSubiendo(false)
    e.target.value = ''
  }
  return (
    <div className="galeria">
      <div className="galeria-header">
        <h3 className="galeria-titulo">{titulo}</h3>
        {!soloLectura && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => fileRef.current.click()} disabled={subiendo}>
            {subiendo ? 'Subiendo…' : '+ Agregar fotos'}
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleFile} />
      </div>
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

export default function DetallePL() {
  const { id } = useParams()
  const { perfil } = useAuth()
  const navigate = useNavigate()
  const [pl, setPl] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [pallets, setPallets] = useState([])
  const [comentario, setComentario] = useState('')
  const [invoiceNum, setInvoiceNum] = useState('')
  const [modoEdicion, setModoEdicion] = useState(false)
  const [confirmarEliminar, setConfirmarEliminar] = useState(false)
  const [errorKg, setErrorKg] = useState('')

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'packingLists', id), (snap) => {
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

  const kgPermitidos = pl.productos?.reduce((s, p) => p.unidad === 'kg' ? s + (Number(p.cantidad) || 0) : s, 0) || 0
  const totalKgActual = pallets.reduce((s, p) => s + (p.items?.reduce((ss, i) => ss + (Number(i.kilosNetos) || 0), 0) || 0), 0)

  const guardarPallets = async () => {
    if (kgPermitidos > 0 && totalKgActual > kgPermitidos) {
      setErrorKg(`No puedes guardar: ${totalKgActual.toLocaleString()} kg supera el límite de ${kgPermitidos.toLocaleString()} kg netos.`)
      return
    }
    setErrorKg('')
    setGuardando(true)
    await actualizarPL(id, { pallets })
    setModoEdicion(false)
    setGuardando(false)
  }

  const enviarAPreparacion = async () => await cambiarEstado(id, ESTADOS.PREPARACION)
  const enviarARevision = async () => await cambiarEstado(id, ESTADOS.REVISION)

  const aprobar = async () => {
    if (!invoiceNum.trim()) { alert('Ingresa el número de Invoice.'); return }
    await agregarComentario(id, comentario || 'PL aprobado', perfil.nombre, 'aprobacion')
    await cambiarEstado(id, ESTADOS.DESPACHADO, { invoiceNumero: invoiceNum })
    setComentario(''); setInvoiceNum('')
  }

  const rechazar = async () => {
    if (!comentario.trim()) { alert('Escribe un comentario.'); return }
    await agregarComentario(id, comentario, perfil.nombre, 'rechazo')
    await cambiarEstado(id, ESTADOS.PREPARACION)
    setComentario('')
  }

  const eliminar = async () => {
    await deleteDoc(doc(db, 'packingLists', id))
    navigate('/dashboard')
  }

  const handleFoto = async (archivo, seccion) => {
    const url = await subirFoto(id, archivo, seccion)
    await agregarFoto(id, url, seccion)
  }

  const totalKgNetos = pallets.reduce((s, p) => s + (p.items?.reduce((ss, i) => ss + (Number(i.kilosNetos) || 0), 0) || 0), 0)
  const totalKgBrutos = pallets.reduce((s, p) => s + (p.items?.reduce((ss, i) => ss + (Number(i.kilosBrutos) || 0), 0) || 0), 0)
  const totalMts3 = pallets.reduce((s, p) => s + (p.items?.reduce((ss, i) => ss + (Number(i.mts3) || 0), 0) || 0), 0)

  return (
    <div className="page">
      {confirmarEliminar && (
        <ModalConfirmar
          mensaje="¿Eliminar este Packing List? Esta acción no se puede deshacer."
          onConfirmar={eliminar}
          onCancelar={() => setConfirmarEliminar(false)}
        />
      )}

      <div className="page-header">
        <button className="btn-back" onClick={() => navigate(-1)}>
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Volver
        </button>
        <div className="page-header-right">
          <BadgeEstado estado={pl.estado} />
          {pl.invoiceNumero && <span className="invoice-badge">Invoice #{pl.invoiceNumero}</span>}
          {pl.estado === ESTADOS.DESPACHADO && <BtnDescargarPDF pl={pl} />}
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

      <div className="detalle-grid">
        <div className="info-card">
          <div className="info-card-row">
            <div><span className="info-label">Cliente</span><span className="info-valor">{pl.cliente}</span></div>
            <div><span className="info-label">Nota de Venta</span><span className="info-valor">NV {pl.notaVenta}</span></div>
          </div>
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

      {pallets.length > 0 && (
        <div className="totales-bar">
          <div className="total-item"><span className="total-num">{pallets.length}</span><span className="total-label">pallets</span></div>
          <div className="total-item"><span className="total-num">{totalKgNetos.toLocaleString('es-CL')}</span><span className="total-label">kg netos</span></div>
          <div className="total-item"><span className="total-num">{totalKgBrutos.toLocaleString('es-CL')}</span><span className="total-label">kg brutos</span></div>
          <div className="total-item"><span className="total-num">{totalMts3.toFixed(2)}</span><span className="total-label">m³</span></div>
        </div>
      )}

      <div className="section-card">
        <div className="section-card-header">
          <h2 className="section-title">Detalle de pallets</h2>
          {puedeEditar && !modoEdicion && (
            <button className="btn btn--outline btn--sm" onClick={() => setModoEdicion(true)}>Editar pallets</button>
          )}
          {modoEdicion && (
            <div style={{ display: 'flex', gap: '8px', flexDirection: 'column', alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn--ghost btn--sm" onClick={() => { setPallets(pl.pallets || []); setModoEdicion(false); setErrorKg('') }}>Cancelar</button>
                <button className="btn btn--primary btn--sm" onClick={guardarPallets} disabled={guardando}>
                  {guardando ? 'Guardando…' : 'Guardar pallets'}
                </button>
              </div>
              {errorKg && <p style={{ fontSize: '.8rem', color: '#EF4444' }}>{errorKg}</p>}
            </div>
          )}
        </div>
        {modoEdicion ? (
          <EditorPallets pallets={pallets} onChange={setPallets} productosDisponibles={pl.productos || []} kgPermitidos={kgPermitidos} />
        ) : pallets.length === 0 ? (
          <div className="empty-state-sm">
            <p>Sin pallets registrados aún.</p>
            {puedeEditar && <button className="btn btn--outline btn--sm" onClick={() => setModoEdicion(true)}>Agregar pallets</button>}
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

      <div className="section-card">
        <GaleriaFotos titulo="Fotos de preparación" fotos={pl.fotosPreparacion} soloLectura={!puedeEditar} onAgregar={(f) => handleFoto(f, 'fotosPreparacion')} />
      </div>

      {(pl.estado === ESTADOS.DESPACHADO || pl.fotosRetiro?.length > 0) && (
        <div className="section-card">
          <GaleriaFotos titulo="Fotos de retiro de carga" fotos={pl.fotosRetiro} soloLectura={!puedeFotoRetiro} onAgregar={(f) => handleFoto(f, 'fotosRetiro')} />
        </div>
      )}

      {pl.comentarios?.length > 0 && (
        <div className="section-card">
          <h2 className="section-title">Historial de comentarios</h2>
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

      <div className="acciones-card">
        {pl.estado === ESTADOS.SOLICITUD && esBodega && (
          <div className="accion-grupo">
            <p className="accion-desc">Confirma que iniciaste la preparación.</p>
            <button className="btn btn--primary" onClick={enviarAPreparacion}>Iniciar preparación</button>
          </div>
        )}
        {puedeEnviarRevision && (
          <div className="accion-grupo">
            <p className="accion-desc">El PL está listo. Envíalo a revisión.</p>
            <button className="btn btn--primary" onClick={enviarARevision} disabled={pallets.length === 0}>Enviar a revisión</button>
          </div>
        )}
        {(puedeAprobar || puedeRechazar) && (
          <div className="accion-grupo">
            <div className="form-group">
              <label className="form-label">Comentario</label>
              <textarea className="form-input form-textarea" value={comentario} onChange={(e) => setComentario(e.target.value)} rows={2} placeholder={puedeRechazar ? 'Indica qué debe corregirse (obligatorio para rechazar)…' : 'Opcional…'} />
            </div>
            {puedeAprobar && (
              <div className="form-group">
                <label className="form-label">N° Invoice (obligatorio)</label>
                <input className="form-input" value={invoiceNum} onChange={(e) => setInvoiceNum(e.target.value)} placeholder="Ej: 244" />
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
