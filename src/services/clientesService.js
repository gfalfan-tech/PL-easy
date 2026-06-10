import { db } from './firebase'
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDocs, onSnapshot, query, orderBy
} from 'firebase/firestore'

const COL = 'clientes'

export async function crearCliente(datos) {
  return addDoc(collection(db, COL), {
    ...datos,
    creadoEn: new Date().toISOString()
  })
}

export async function actualizarCliente(id, datos) {
  return updateDoc(doc(db, COL, id), datos)
}

export async function eliminarCliente(id) {
  return deleteDoc(doc(db, COL, id))
}

export function escucharClientes(callback) {
  const q = query(collection(db, COL), orderBy('nombre'))
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  })
}

export async function obtenerClientes() {
  const q = query(collection(db, COL), orderBy('nombre'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}
