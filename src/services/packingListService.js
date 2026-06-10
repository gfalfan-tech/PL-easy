import { db, storage } from './firebase'
import {
  collection, doc, addDoc, updateDoc, getDoc, getDocs,
  query, orderBy, where, serverTimestamp, onSnapshot
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'

const COL = 'packingLists'

// Estados posibles
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
  despachado: '#00A878',
}

// Crear solicitud (Admin o Facturación)
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

// Actualizar PL (bodega llena pallets y fotos)
export async function actualizarPL(id, datos) {
  return updateDoc(doc(db, COL, id), {
    ...datos,
    actualizadoEn: serverTimestamp(),
  })
}

// Cambiar estado
export async function cambiarEstado(id, nuevoEstado, extra = {}) {
  return updateDoc(doc(db, COL, id), {
    estado: nuevoEstado,
    actualizadoEn: serverTimestamp(),
    ...extra,
  })
}

// Agregar comentario (aprobación / rechazo)
export async function agregarComentario(id, comentario, usuarioNombre, tipo) {
  const snap = await getDoc(doc(db, COL, id))
  const actual = snap.data().comentarios || []
  return updateDoc(doc(db, COL, id), {
    comentarios: [...actual, {
      texto: comentario,
      autor: usuarioNombre,
      tipo, // 'aprobacion' | 'rechazo' | 'nota'
      fecha: new Date().toISOString(),
    }],
    actualizadoEn: serverTimestamp(),
  })
}

// Subir foto a Firebase Storage
export async function subirFoto(plId, archivo, seccion) {
  const ruta = `packingLists/${plId}/${seccion}/${Date.now()}_${archivo.name}`
  const storageRef = ref(storage, ruta)
  await uploadBytes(storageRef, archivo)
  const url = await getDownloadURL(storageRef)
  return url
}

// Agregar foto URL al PL
export async function agregarFoto(plId, url, seccion) {
  const snap = await getDoc(doc(db, COL, plId))
  const actual = snap.data()[seccion] || []
  return updateDoc(doc(db, COL, plId), {
    [seccion]: [...actual, { url, subidaEn: new Date().toISOString() }],
    actualizadoEn: serverTimestamp(),
  })
}

// Obtener un PL
export async function obtenerPL(id) {
  const snap = await getDoc(doc(db, COL, id))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

// Escuchar todos los PLs en tiempo real
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
