import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  obtenerPL, actualizarPL, cambiarEstado, agregarComentario,
  subirFoto, agregarFoto, ESTADOS
} from '../services/packingListService'
import BarraProgreso from '../components/BarraProgreso'
import BadgeEstado from '../components/BadgeEstado'
import BtnDescargarPDF from '../components/BtnDescargarPDF'
import { db } from '../services/firebase'
import { onSnapshot, doc } from 'firebase/firestore'

function formatFecha(ts) {
  if (!ts) return '—'
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })
}

// ——— Sub-componente: Editor de pallets ———
function EditorPallets({ pallets, onChange }) {
  const agregarPallet = () => {
    onChange([...pallets, { numero: pallets.length + 1, items: [{ nombre: '', cantidad: 1, descripcionEnvase: '', kilosNetos: 0, kilosBrutos: 0, mts3: 0, clasificaCaImo: '', clasificaNu: '', numeroLote: '' }] }])
  }

  const agregarItem = (pi) => {
    const p = [...pallets]
    p[pi].items.push({ nombre: '', cantidad: 1, descripcionEnvase: '', kilosNetos: 0, kilosBrutos: 0, mts3: 0, clasificaCaImo: '', clasificaNu: '', numeroLote: '' })
    onChange(p)
  }

  const updateItem = (pi, ii, campo, valor) => {
    const p = JSON.parse(JSON.stringify(pallets))
    p[pi].items[ii][campo] = valor
    onChange(p)
  }

  const eliminarPallet = (pi) => {
    onChange(pallets.filter((_, i) => i !== pi))
  }

  const eliminarItem = (pi, ii) => {
    const p = JSON.parse(JSON.stringify(pallets))
    p[pi].items.splice(ii, 1)
    onChange(p)
  }

  return (
    <div className="pallets-editor">
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
            <table className="pallet-table">
              <thead>
                <tr>
                  <th>Producto</th><th>Cant.</th><th>Envase</th>
                  <th>Kg Netos</th><th>Kg Brutos</th><th>M³</th>
                  <th>Clasif. Ca/IMO</th><th>Clasif. NU</th><th>Lote</th><th></th>
                </tr>
              </thead>
              <tbody>
                {pallet.items.map((item, ii) => (
                  <tr key={ii}>
                    {['nombre','cantidad','descripcionEnvase','kilosNetos','kilosBrutos','mts3','clasificaCaImo','clasificaNu','numeroLote'].map((campo) => (
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

          <button type="button" className="btn btn--ghost btn--sm" onClick={() => agregarItem(pi)}>
            + Agregar ítem al pallet
          </button>
        </div>
      ))}

      <button type="button" className="btn btn--outline" onClick={agregarPallet}>
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
        </svg>
        Agregar pallet
      </button>
    </div>
  )
}

// ——— Sub-componente: Galería de fotos ———
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
      ) : (
        <p className="galeria-vacia">Sin fotos aún</p>
      )}
    </div>
  )
}

// ——— Página principal ———
export default function DetallePL() {
  const { id } = useParams()
  const { user, perfil } = useAuth()
  const navigate = useNavigate()

  const [pl, setPl] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [pallets, setPallets] = useState([])
  const [comentario, setComentario] = useState('')
  const [invoiceNum, setInvoiceNum] = useState('')
  const [modoEdicion, setModoEdicion] = useState(false)

  // Escuchar en tiempo real
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'packingLists', id), (snap) => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() }
        setPl(data)
        setPallets(data.pallets || [])
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

  const puedeEditar = esBodega && (pl.estado === ESTADOS.PREPARACION || pl.estado === ESTADOS.SOLICITUD)
  const puedeEnviarRevision = esBodega && pl.estado === ESTADOS.PREPARACION
  const puedeAprobar = esFacturacion && pl.estado === ESTADOS.REVISION
  const puedeRechazar = esFacturacion && pl.estado === ESTADOS.REVISION
  const puedeFotoRetiro = pl.estado === ESTADOS.DESPACHADO

  const guardarPallets = async () => {
    setGuardando(true)
    await actualizarPL(id, { pallets })
    setModoEdicion(false)
    setGuardando(false)
  }

  const enviarAPreparacion = async () => {
    await cambiarEstado(id, ESTADOS.PREPARACION)
  }

  const enviarARevision = async () => {
    await cambiarEstado(id, ESTADOS.REVISION)
  }

  const aprobar = async () => {
    if (!invoiceNum.trim()) { alert('Ingresa el número de Invoice para aprobar.'); return }
    await agregarComentario(id, comentario || 'PL aprobado', perfil.nombre, 'aprobacion')
    await cambiarEstado(id, ESTADOS.DESPACHADO, { invoiceNumero: invoiceNum })
    setComentario('')
    setInvoiceNum('')
  }

  const rechazar = async () => {
    if (!comentario.trim()) { alert('Escribe un comentario indicando qué debe corregirse.'); return }
    await agregarComentario(id, comentario, perfil.nombre, 'rechazo')
    await cambiarEstado(id, ESTADOS.PREPARACION)
    setComentario('')
  }

  const handleFoto = async (archivo, seccion) => {
    const url = await subirFoto(id, archivo, seccion)
    await agregarFoto(id, url, seccion)
  }

  // Totales
  const totalKgNetos = pallets.reduce((s, p) => s + p.items.reduce((ss, i) => ss + (Number(i.kilosNetos) || 0), 0), 0)
  const totalKgBrutos = pallets.reduce((s, p) => s + p.items.reduce((ss, i) => ss + (Number(i.kilosBrutos) || 0), 0), 0)
  const totalMts3 = pallets.reduce((s, p) => s + p.items.reduce((ss, i) => ss + (Number(i.mts3) || 0), 0), 0)

  return (
    <div className="page">
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
          {pl.invoiceNumero && <span className="invoice-badge">Invoice #{pl.invoiceNumero}</span>}
          {pl.estado === ESTADOS.DESPACHADO && <BtnDescargarPDF pl={pl} />}
        </div>
      </div>

      {/* Barra de progreso */}
      <BarraProgreso estadoActual={pl.estado} />

      {/* Info general */}
      <div className="detalle-grid">
        <div className="info-card">
          <div className="info-card-row">
            <div>
              <span className="info-label">Cliente</span>
              <span className="info-valor">{pl.cliente}</span>
            </div>
            <div>
              <span className="info-label">Nota de Venta</span>
              <span className="info-valor">NV {pl.notaVenta}</span>
            </div>
          </div>
          {pl.direccion && (
            <div>
              <span className="info-label">Dirección</span>
              <span className="info-valor">{pl.direccion}</span>
            </div>
          )}
          {pl.resolExenta && (
            <div>
              <span className="info-label">Resolución Exenta</span>
              <span className="info-valor">{pl.resolExenta}</span>
            </div>
          )}
          <div className="info-card-row">
            <div>
              <span className="info-label">Creado por</span>
              <span className="info-valor">{pl.creadoPor?.nombre}</span>
            </div>
            <div>
              <span className="info-label">Fecha</span>
              <span className="info-valor">{formatFecha(pl.creadoEn)}</span>
            </div>
          </div>
          {pl.notas && (
            <div>
              <span className="info-label">Notas</span>
              <span className="info-valor">{pl.notas}</span>
            </div>
          )}
        </div>

        {/* Productos solicitados */}
        <div className="info-card">
          <h3 className="info-card-title">Productos solicitados</h3>
          {pl.productos?.map((p, i) => (
            <div key={i} className="producto-chip">
              <span className="producto-chip-nombre">{p.nombre}</span>
              <span className="producto-chip-cant">{p.cantidad} {p.unidad}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Totales */}
      {pallets.length > 0 && (
        <div className="totales-bar">
          <div className="total-item"><span className="total-num">{pallets.length}</span><span className="total-label">pallets</span></div>
          <div className="total-item"><span className="total-num">{totalKgNetos.toLocaleString('es-CL')}</span><span className="total-label">kg netos</span></div>
          <div className="total-item"><span className="total-num">{totalKgBrutos.toLocaleString('es-CL')}</span><span className="total-label">kg brutos</span></div>
          <div className="total-item"><span className="total-num">{totalMts3.toFixed(2)}</span><span className="total-label">m³</span></div>
        </div>
      )}

      {/* Pallets */}
      <div className="section-card">
        <div className="section-card-header">
          <h2 className="section-title">Detalle de pallets</h2>
          {puedeEditar && !modoEdicion && (
            <button className="btn btn--outline btn--sm" onClick={() => setModoEdicion(true)}>
              Editar pallets
            </button>
          )}
          {modoEdicion && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn--ghost btn--sm" onClick={() => { setPallets(pl.pallets || []); setModoEdicion(false) }}>Cancelar</button>
              <button className="btn btn--primary btn--sm" onClick={guardarPallets} disabled={guardando}>
                {guardando ? 'Guardando…' : 'Guardar pallets'}
              </button>
            </div>
          )}
        </div>

        {modoEdicion ? (
          <EditorPallets pallets={pallets} onChange={setPallets} />
        ) : pallets.length === 0 ? (
          <div className="empty-state-sm">
            <p>Sin pallets registrados aún.</p>
            {puedeEditar && (
              <button className="btn btn--outline btn--sm" onClick={() => setModoEdicion(true)}>
                Agregar pallets
              </button>
            )}
          </div>
        ) : (
          <div className="pallets-readonly">
            {pallets.map((pallet, pi) => (
              <div key={pi} className="pallet-readonly-block">
                <p className="pallet-num">Pallet #{pallet.numero || pi + 1}</p>
                <table className="pallet-table pallet-table--readonly">
                  <thead>
                    <tr>
                      <th>Producto</th><th>Cant.</th><th>Envase</th>
                      <th>Kg Netos</th><th>Kg Brutos</th><th>M³</th>
                      <th>Clasif. IMO</th><th>NU</th><th>Lote</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pallet.items.map((item, ii) => (
                      <tr key={ii}>
                        <td>{item.nombre}</td><td>{item.cantidad}</td>
                        <td>{item.descripcionEnvase}</td><td>{item.kilosNetos}</td>
                        <td>{item.kilosBrutos}</td><td>{item.mts3}</td>
                        <td>{item.clasificaCaImo}</td><td>{item.clasificaNu}</td>
                        <td>{item.numeroLote}</td>
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
        <GaleriaFotos
          titulo="Fotos de preparación"
          fotos={pl.fotosPreparacion}
          soloLectura={!puedeEditar}
          onAgregar={(f) => handleFoto(f, 'fotosPreparacion')}
        />
      </div>

      {/* Fotos retiro */}
      {(pl.estado === ESTADOS.DESPACHADO || pl.fotosRetiro?.length > 0) && (
        <div className="section-card">
          <GaleriaFotos
            titulo="Fotos de retiro de carga"
            fotos={pl.fotosRetiro}
            soloLectura={!puedeFotoRetiro}
            onAgregar={(f) => handleFoto(f, 'fotosRetiro')}
          />
        </div>
      )}

      {/* Comentarios */}
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

      {/* Acciones */}
      <div className="acciones-card">
        {/* Bodega: solicitud → preparación */}
        {pl.estado === ESTADOS.SOLICITUD && esBodega && (
          <div className="accion-grupo">
            <p className="accion-desc">Confirma que iniciaste la preparación de este pedido.</p>
            <button className="btn btn--primary" onClick={enviarAPreparacion}>
              Iniciar preparación
            </button>
          </div>
        )}

        {/* Bodega: enviar a revisión */}
        {puedeEnviarRevision && (
          <div className="accion-grupo">
            <p className="accion-desc">El PL está listo. Envíalo a revisión de Facturación.</p>
            <button className="btn btn--primary" onClick={enviarARevision} disabled={pallets.length === 0}>
              Enviar a revisión
            </button>
          </div>
        )}

        {/* Facturación: aprobar o rechazar */}
        {(puedeAprobar || puedeRechazar) && (
          <div className="accion-grupo">
            <div className="form-group">
              <label className="form-label">Comentario</label>
              <textarea
                className="form-input form-textarea"
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder={puedeRechazar ? 'Indica qué debe corregirse (obligatorio para rechazar)…' : 'Comentario de aprobación (opcional)…'}
                rows={2}
              />
            </div>
            {puedeAprobar && (
              <div className="form-group">
                <label className="form-label">N° Invoice (obligatorio para aprobar)</label>
                <input
                  className="form-input"
                  value={invoiceNum}
                  onChange={(e) => setInvoiceNum(e.target.value)}
                  placeholder="Ej: 244"
                />
              </div>
            )}
            <div className="accion-btns">
              {puedeRechazar && (
                <button className="btn btn--danger" onClick={rechazar}>
                  Rechazar — volver a preparación
                </button>
              )}
              {puedeAprobar && (
                <button className="btn btn--success" onClick={aprobar}>
                  Aprobar y despachar
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
