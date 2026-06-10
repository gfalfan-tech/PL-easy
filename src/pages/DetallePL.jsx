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

  const agregarPallet = () => onChange([...pallets, { numero: pallets.length + 1, items: [itemVacio(productosDisponibles[0]?.nombre || '')] }])

  const repetirUltimo = () => {
    if (!pallets.length) return
    const ultimo = JSON.parse(JSON.stringify(pallets[pallets.length - 1]))
    ultimo.numero = pallets.length + 1
    onChange([...pallets, ultimo])
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
            <table className="pallet-table">
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
        setPallets(data.pallets || [])
        setCargando(false)
      }
    })
    return unsub
  }, [id])

  if (cargando) return <div className="page"><div className="empty-state"><div className="spinner"/></div></div>
  if (!pl) return <div className="page">
