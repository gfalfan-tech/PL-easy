import { db } from './firebase'
import {
  collection, doc, addDoc, updateDoc, getDoc,
  query, orderBy, serverTimestamp, onSnapshot
} from 'firebase/firestore'

const COL = 'packingLists'

export const ESTADOS = {
  SOLICITUD: 'solicitud',
  PREPARACION: 'preparacion',
  REVISION: 'revision',
  DESPACHADO: 'despachado',
}

export const ESTADO_LABELS = {
  solicitud: 'Solicitud',
  preparacion: 'En Preparación',
  revision: 'En Revisión',
  despachado: 'Despachado',
}

export const ESTADO_COLORS = {
  solicitud: '#6366F1',
  preparacion: '#F59E0B',
  revision: '#3B82F6',
  despachado: '#10B981',
}

export async function crearSolicitud(datos, usuarioId, usuarioNombre) {
  return addDoc(collection(db, COL), {
    ...datos,
    estado: ESTADOS.SOLICITUD,
    invoiceNumero: null,
    pallets: [],
    fotosPreparacion: [],
    fotosRetiro: [],
    comentarios: [],
    historialEstados: [{
      estado: ESTADOS.SOLICITUD,
      autor: usuarioNombre,
      fecha: new Date().toISOString(),
    }],
    creadoPor: { id: usuarioId, nombre: usuarioNombre },
    creadoEn: serverTimestamp(),
    actualizadoEn: serverTimestamp(),
  })
}

export async function actualizarPL(id, datos) {
  return updateDoc(doc(db, COL, id), {
    ...datos,
    actualizadoEn: serverTimestamp(),
  })
}

export async function cambiarEstado(id, nuevoEstado, usuarioNombre, extra = {}) {
  const snap = await getDoc(doc(db, COL, id))
  const historial = snap.data().historialEstados || []
  return updateDoc(doc(db, COL, id), {
    estado: nuevoEstado,
    historialEstados: [...historial, {
      estado: nuevoEstado,
      autor: usuarioNombre,
      fecha: new Date().toISOString(),
    }],
    actualizadoEn: serverTimestamp(),
    ...extra,
  })
}

export async function agregarComentario(id, comentario, usuarioNombre, tipo) {
  const snap = await getDoc(doc(db, COL, id))
  const actual = snap.data().comentarios || []
  return updateDoc(doc(db, COL, id), {
    comentarios: [...actual, {
      texto: comentario,
      autor: usuarioNombre,
      tipo,
      fecha: new Date().toISOString(),
    }],
    actualizadoEn: serverTimestamp(),
  })
}

// Comprime imagen y convierte a base64
function archivoABase64(archivo) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX = 600
        let w = img.width, h = img.height
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round(h * MAX / w); w = MAX }
          else { w = Math.round(w * MAX / h); h = MAX }
        }
        canvas.width = w; canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', 0.6))
      }
      img.onerror = reject
      img.src = e.target.result
    }
    reader.onerror = reject
    reader.readAsDataURL(archivo)
  })
}

export async function subirFoto(plId, archivo, seccion) {
  return archivoABase64(archivo)
}

export async function agregarFoto(plId, url, seccion) {
  const snap = await getDoc(doc(db, COL, plId))
  const actual = snap.data()[seccion] || []
  // Máximo 3 fotos por sección
  if (actual.length >= 3) {
    throw new Error('MAX_FOTOS')
  }
  return updateDoc(doc(db, COL, plId), {
    [seccion]: [...actual, { url, subidaEn: new Date().toISOString() }],
    actualizadoEn: serverTimestamp(),
  })
}

export async function obtenerPL(id) {
  const snap = await getDoc(doc(db, COL, id))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

// Filtrado en cliente para evitar índice compuesto en Firestore
export function escucharPLs(callback, filtroEstado = null) {
  const q = query(collection(db, COL), orderBy('creadoEn', 'desc'))
  return onSnapshot(q, (snap) => {
    let lista = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    if (filtroEstado) lista = lista.filter(pl => pl.estado === filtroEstado)
    callback(lista)
  })
}
