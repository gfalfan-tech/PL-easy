/**
 * Parsea texto extraído por PDF.js de una Nota de Venta QDC.
 * Verificado con SOE-51 (9 productos, nombres multilínea) y SOE-57 (3 productos, resolución exenta).
 * 
 * Estructura PDF.js:
 * Líneas 0-15:  etiquetas columna izquierda (SEÑOR, DIRECCION, etc.) + 8 ":"
 * Línea 16:     cliente (después del 8vo ":")
 * Línea 17:     dirección
 * Línea 24:     N° : SOE-XX  
 * Línea 40:     ORDEN COMPRA → línea 42: valor
 * Línea 66:     P.TOTAL (inicio de tabla)
 * Por cada producto: [precio_total] → código → " " → nombre(1-3 líneas) → " " → unidad → " " → cantidad → " " → precio_unit
 */
export function parsearNV(texto) {
  const lineas = texto.split('\n')

  // ── Cliente (después del 8vo ":") ────────────────────────
  const idxSenor = lineas.findIndex(l => l.trim() === 'SEÑOR (ES)')
  let cliente = ''
  if (idxSenor >= 0) {
    let dp = 0
    for (let i = idxSenor + 1; i < lineas.length; i++) {
      if (lineas[i].trim() === ':') dp++
      if (dp === 8 && !esVacio(lineas[i]) && lineas[i].trim() !== ':') {
        cliente = lineas[i].trim(); break
      }
    }
  }

  // ── Dirección (línea después del cliente) ────────────────
  let direccion = ''
  if (cliente) {
    const idxCli = lineas.findIndex(l => l.trim() === cliente)
    if (idxCli >= 0) direccion = lineas[idxCli + 1]?.trim() || ''
  }

  // ── RUT ──────────────────────────────────────────────────
  let rut = ''
  const idxRut = lineas.findIndex(l => l.trim() === 'RUT')
  if (idxRut >= 0) {
    for (let i = idxRut + 1; i < Math.min(idxRut + 5, lineas.length); i++) {
      const v = lineas[i].trim()
      if (v === ':' || esVacio(lineas[i])) continue
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
  const idxPTotal = lineas.findIndex(l => l.trim() === 'P.TOTAL')
  const productos = idxPTotal >= 0
    ? parsearProductos(lineas, idxPTotal)
    : []

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

function parsearProductos(lineas, idxPTotal) {
  const STOP = new Set(['NETO', 'TOTAL', 'OBSERVACIONES'])
  const productos = []
  let i = idxPTotal + 1

  // Saltar encabezados hasta primer precio o código
  while (i < lineas.length && !esPrecioTotal(lineas[i]) && !esCodigo(lineas[i])) i++

  while (i < lineas.length) {
    const l = lineas[i].trim()

    // Fin de tabla
    if (STOP.has(l) || l.includes('I.V.A')) break

    // Precio total antes del código — saltarlo
    if (esPrecioTotal(l)) { i++; continue }

    // Código de producto
    if (!esCodigo(l)) { i++; continue }

    i++ // saltar código
    i = saltarVacios(lineas, i)

    // Recoger nombre — puede ser 1, 2 o 3 líneas hasta llegar a unidad
    const partesNombre = []
    let resolExenta = ''

    while (i < lineas.length) {
      const l2 = lineas[i].trim()

      // Llegamos a la unidad → fin del nombre
      if (esUnidad(l2)) break

      // Línea vacía/espacio → ver si la próxima no vacía es unidad
      if (esVacio(lineas[i])) {
        const j = saltarVacios(lineas, i)
        if (j < lineas.length && esUnidad(lineas[j].trim())) { i = j; break }
        i++; continue
      }

      // Resolución exenta en línea separada
      if (/EXENTA\s+No/i.test(l2)) {
        const m = l2.match(/No\s*(\d+)/)
        if (m) {
          resolExenta = m[1]; i++
          if (i < lineas.length && /^\d{2}\/\d{2}\/\d{4}$/.test(lineas[i].trim())) {
            resolExenta += ' ' + lineas[i].trim(); i++
          }
        }
        continue
      }

      // Nombre termina en "RES." → la resolución viene en la siguiente línea
      if (l2.endsWith('RES.')) {
        partesNombre.push(l2.replace(/\s*RES\.\s*$/, '').trim())
        i++; continue
      }

      partesNombre.push(l2)
      i++
    }

    const nombre = partesNombre.join(' ').trim()

    // Unidad
    const unidadRaw = i < lineas.length ? lineas[i].trim() : ''
    const unidad = mapearUnidad(unidadRaw)
    i = saltarVacios(lineas, i + 1)

    // Cantidad
    const cantRaw = i < lineas.length ? lineas[i].trim() : ''
    const cantidad = esEntero(cantRaw) ? cantRaw.replace(/\./g, '') : ''
    i++

    if (nombre && cantidad) {
      productos.push({ nombre, cantidad, unidad, resolExenta })
    }
  }

  return productos
}

function esCodigo(l) {
  const s = (l || '').trim()
  // Empieza con dígito, contiene letras Y números, mínimo 5 chars, solo alfanuméricos y guiones
  return s.length >= 5 &&
    /^[0-9][A-Z0-9\-]+$/.test(s) &&
    /[A-Z]/.test(s) &&
    /[0-9]/.test(s)
}

function esPrecioTotal(l) {
  return /^\d[\d.]*,\d{2,3}$/.test((l || '').trim())
}

function esUnidad(l) {
  return /^(Kilo|Unidad|Litro|Saco|Tambor)\s*$/i.test((l || '').trim())
}

function esEntero(s) {
  return /^\d[\d.]*$/.test((s || '').trim()) && !(s || '').includes(',')
}

function esVacio(l) {
  return (l || '').trim() === '' || l === ' '
}

function saltarVacios(lineas, i) {
  while (i < lineas.length && esVacio(lineas[i])) i++
  return i
}

function mapearUnidad(raw) {
  const r = (raw || '').toLowerCase().trim()
  if (r.startsWith('kilo') || r === 'kg') return 'kg'
  if (r.startsWith('litro')) return 'litros'
  if (r.startsWith('saco')) return 'sacos'
  if (r.startsWith('tambor')) return 'tambores'
  return 'unidades'
}
