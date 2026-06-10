import { db } from './firebase'
import {
  collection, doc, addDoc, updateDoc, getDoc,
  query, orderBy, where, serverTimestamp, onSnapshot
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

export async function cambiarEstado(id, nuevoEstado, extra = {}) {
  return updateDoc(doc(db, COL, id), {
    estado: nuevoEstado,
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

function archivoABase64(archivo) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX = 800
        let w = img.width
        let h = img.height
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round(h * MAX / w); w = MAX }
          else { w = Math.round(w * MAX / h); h = MAX }
        }
        canvas.width = w
        canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', 0.7))
      }
      img.onerror = reject
      img.src = e.target.result
    }
    reader.onerror = reject
    reader.readAsDataURL(archivo)
  })
}

export async function subirFoto(plId, archivo, seccion) {
  const base64 = await archivoABase64(archivo)
  return base64
}

export async function agregarFoto(plId, url, seccion) {
  const snap = await getDoc(doc(db, COL, plId))
  const actual = snap.data()[seccion] || []
  return updateDoc(doc(db, COL, plId), {
    [seccion]: [...actual, { url, subidaEn: new Date().toISOString() }],
    actualizadoEn: serverTimestamp(),
  })
}

export async function obtenerPL(id) {
  const snap = await getDoc(doc(db, COL, id))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export function escucharPLs(callback, filtroEstado = null) {
  let q = query(collection(db, COL), orderBy('creadoEn', 'desc'))
  if (filtroEstado) {
    q = query(collection(db, COL), where('estado', '==', filtroEstado), orderBy('creadoEn', 'desc'))
  }
  return onSnapshot(q, (snap) => {
    const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    callback(lista)
  })
}
