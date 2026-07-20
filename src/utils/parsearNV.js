/**
 * Parsea texto extraído por PDF.js de una Nota de Venta QDC.
 * Basado en estructura real observada (líneas numeradas):
 * 0:  SEÑOR (ES)
 * 1-3: DIRECCION, GIRO, COMUNA
 * 4-7: ":" x4 (columna izquierda)
 * 8: FECHA PROMETIDA
 * ... más etiquetas y ":"
 * 16: ENABOLCO LTDA.      ← cliente (8vo ":" contando desde SEÑOR)
 * 17: AV.BLANCO...        ← dirección
 * 21: RUT
 * 22: ":"
 * 23: ""                  ← rut vacío
 * 24: N° : SOE-57
 * 40: ORDEN COMPRA
 * 42: 1417COO1
 * 66: P.TOTAL
 * 77: 1.428,00            ← precio total (antes de cada código)
 * 78: 4PQ03-125           ← código
 * 80: FOSFOCLEAN® (Kg).   ← nombre
 * 82: Kilo                ← unidad
 * 84: 600                 ← cantidad
 */
export function parsearNV(texto) {
  const lineas = texto.split('\n')

  // ── Cliente ──────────────────────────────────────────────
  // Después de SEÑOR (ES), contar 8 ":" para llegar al cliente
  const idxSenor = lineas.findIndex(l => l.trim() === 'SEÑOR (ES)')
  let cliente = ''
  if (idxSenor >= 0) {
    let dp = 0
    for (let i = idxSenor + 1; i < lineas.length; i++) {
      if (lineas[i].trim() === ':') dp++
      // El cliente está después del 8vo ":"
      if (dp === 8 && lineas[i].trim() !== ':' && lineas[i].trim() !== '') {
        cliente = lineas[i].trim()
        break
      }
    }
  }

  // ── Dirección ────────────────────────────────────────────
  // Línea inmediatamente después del cliente
  let direccion = ''
  if (cliente) {
    const idxCli = lineas.findIndex(l => l.trim() === cliente)
    if (idxCli >= 0) direccion = lineas[idxCli + 1]?.trim() || ''
  }

  // ── RUT ──────────────────────────────────────────────────
  // Después de "RUT\n:\n" — si sigue vacío o siguiente campo, está vacío
  let rut = ''
  const idxRut = lineas.findIndex(l => l.trim() === 'RUT')
  if (idxRut >= 0) {
    for (let i = idxRut + 1; i < Math.min(idxRut + 5, lineas.length); i++) {
      const v = lineas[i].trim()
      if (v === ':' || v === '') continue
      if (/^[A-Z\s]+$/.test(v) || v.startsWith('N°')) break
      rut = v; break
    }
  }

  // ── Nota de Venta ─────────────────────────────────────────
  const lineaNV = lineas.find(l => l.trim().startsWith('N° :'))
  const notaVenta = lineaNV ? lineaNV.replace('N° :', '').trim() : ''

  // ── Orden de Compra ───────────────────────────────────────
  let ordenCompra = ''
  const idxOC = lineas.findIndex(l => l.trim() === 'ORDEN COMPRA')
  if (idxOC >= 0) {
    for (let i = idxOC + 1; i < Math.min(idxOC + 5, lineas.length); i++) {
      const v = lineas[i].trim()
      if (v && v !== ':' && v !== ' ') { ordenCompra = v; break }
    }
  }

  // ── Productos ─────────────────────────────────────────────
  // Estructura por producto en PDF.js:
  // [precio_total] → código → " " → nombre → " " → [resolExenta] → unidad → " " → cantidad → " " → precio_unit
  const productos = []
  const idxPTotal = lineas.findIndex(l => l.trim() === 'P.TOTAL')

  if (idxPTotal >= 0) {
    // Saltar encabezados hasta primer código
    let i = idxPTotal + 1
    while (i < lineas.length && !esCodigoProducto(lineas[i]) && !esPrecioTotal(lineas[i])) i++

    while (i < lineas.length) {
      // Saltar precio total que precede al código
      if (esPrecioTotal(lineas[i])) { i++; continue }

      if (!esCodigoProducto(lineas[i])) { i++; continue }

      // Tenemos un código
      i++ // saltar código
      i = saltarEspacios(lineas, i)

      const nombre = lineas[i]?.trim() || ''
      if (!nombre) { i++; continue }
      i = saltarEspacios(lineas, i + 1)

      // Resolución exenta
      let resolExenta = ''
      let nombreFinal = nombre

      if (/RES\.\s*$/.test(nombre)) {
        nombreFinal = nombre.replace(/\s*RES\.\s*$/, '').trim()
        const sig = lineas[i]?.trim() || ''
        if (/EXENTA\s+No/i.test(sig)) {
          const m = sig.match(/No\s*([\d]+)/)
          if (m) {
            resolExenta = m[1]; i++
            const fecha = lineas[i]?.trim() || ''
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(fecha)) {
              resolExenta += ' ' + fecha; i++
            }
          }
        }
      }

      // Unidad
      const unidadRaw = lineas[i]?.trim() || ''
      if (!esUnidad(unidadRaw)) { i++; continue }
      const unidad = mapearUnidad(unidadRaw)
      i = saltarEspacios(lineas, i + 1)

      // Cantidad
      const cantRaw = lineas[i]?.trim() || ''
      const cantidad = esEntero(cantRaw) ? cantRaw.replace(/\./g, '') : ''
      i++

      if (nombreFinal && cantidad) {
        productos.push({ nombre: nombreFinal, cantidad, unidad, resolExenta })
      }
    }
  }

  return {
    cliente,
    rut,
    direccion,
    notaVenta,
    ordenCompra,
    productos: productos.length
      ? productos
      : [{ nombre: '', cantidad: '', unidad: 'kg', resolExenta: '' }]
  }
}

function esCodigoProducto(l) {
  return /^[0-9A-Z]{3,}[A-Z0-9\-]+$/.test((l || '').trim())
}

function esPrecioTotal(l) {
  // Formato: "1.428,00" — tiene coma decimal y posiblemente punto de miles
  return /^\d[\d.]*,\d{2}$/.test((l || '').trim())
}

function esUnidad(l) {
  return /^(Kilo|Unidad|Litro|Saco|Tambor)/i.test((l || '').trim())
}

function saltarEspacios(lineas, desde) {
  let i = desde
  while (i < lineas.length && (lineas[i] === '' || lineas[i] === ' ' || lineas[i].trim() === '')) i++
  return i
}

function esEntero(s) {
  return /^\d[\d.]*$/.test((s || '').trim()) && !(s || '').includes(',')
}

function mapearUnidad(raw) {
  const r = (raw || '').toLowerCase().trim()
  if (r.startsWith('kilo') || r === 'kg') return 'kg'
  if (r.startsWith('litro')) return 'litros'
  if (r.startsWith('saco')) return 'sacos'
  if (r.startsWith('tambor')) return 'tambores'
  return 'unidades'
}
