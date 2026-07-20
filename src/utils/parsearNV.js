/**
 * Parsea el texto extraído de una Nota de Venta QDC.
 * 
 * Estructura del PDF:
 * - Datos del cliente van en la columna izquierda
 * - Datos del pedido (OC, fecha) van en la columna derecha intercalados
 * - Los productos (código + nombre) van en un bloque
 * - Las unidades y cantidades van DESPUÉS de OBSERVACIONES en columna separada
 */
export function parsearNV(texto) {
  const t = texto || ''

  // ── Cliente ──────────────────────────────────────────────
  const cliente = limpiar(match(t, /SEÑOR\s*\(ES\)\s*:\s*(.+?)(?:\nRUT|\nDIRECCION)/s))

  // ── RUT ── (aparece vacío en este formato pero por si acaso)
  const rut = limpiar(match(t, /RUT\s*\n\s*:\s*([^\n:]+)/))

  // ── Dirección ────────────────────────────────────────────
  const dir = limpiar(match(t, /DIRECCION\s*:\s*\n?\s*(.+?)(?:\nDESPACHO|\nCOMUNA|\nGIRO)/s))
  const direccion = dir.replace(/^:\s*/, '')

  // ── Nota de Venta ─────────────────────────────────────────
  const notaVenta = limpiar(match(t, /N°\s*:\s*([^\n]+)/))

  // ── Orden de Compra ───────────────────────────────────────
  // Aparece en la sección derecha, después de la fecha prometida
  const ordenCompra = limpiar(match(t, /\d{2}\/\d{2}\/\d{4}\s*\n\s*([A-Z0-9]+)\s*\n/))

  // ── Productos ─────────────────────────────────────────────
  // Los nombres/códigos van entre P.TOTAL y OBSERVACIONES
  const bloqueNombres = match(t, /P\.TOTAL\s*\n\s*([\s\S]+?)OBSERVACIONES/s) || ''

  // Las unidades/cantidades van después de OBSERVACIONES (columna separada del PDF)
  const bloqueUnidadesCants = match(t, /OBSERVACIONES[\s\S]*?\n\s*((?:Kilo|Unidad|Litro|Saco|Tambor)[\s\S]+?)(?:\s*NETO|\s*I\.V\.A)/si) || ''

  // Resoluciones exentas van pegadas al nombre del producto
  const productos = parsearProductos(bloqueNombres, bloqueUnidadesCants)

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

function match(texto, regex) {
  const m = texto.match(regex)
  return m ? m[1] : ''
}

function limpiar(str) {
  return (str || '').trim().replace(/\s+/g, ' ')
}

function mapearUnidad(raw) {
  const r = (raw || '').toLowerCase().trim()
  if (r.startsWith('kilo') || r === 'kg') return 'kg'
  if (r.startsWith('litro')) return 'litros'
  if (r.startsWith('saco')) return 'sacos'
  if (r.startsWith('tambor')) return 'tambores'
  return 'unidades'
}

function parsearProductos(bloqueNombres, bloqueUnidades) {
  // Extraer pares código-nombre del bloque izquierdo
  const lineasNombres = bloqueNombres.split('\n').map(l => l.trim()).filter(Boolean)

  const items = [] // { nombre, resolExenta }
  let i = 0
  while (i < lineasNombres.length) {
    const l = lineasNombres[i]
    // Código: empieza con dígito o letra mayúscula seguido de alfanuméricos
    if (/^[0-9A-Z]{3,}[A-Z0-9\-]*$/.test(l)) {
      let nombre = lineasNombres[i + 1] || ''
      let resolExenta = ''
      let j = i + 2

      // Puede haber resolución exenta pegada al nombre
      while (j < lineasNombres.length) {
        const sig = lineasNombres[j]
        if (/RES\.?\s*EXENTA|EXENTA\s+No|ZN-400 RES\./i.test(sig) || /EXENTA\s+No/i.test(nombre)) {
          // La resolución puede estar en la misma línea del nombre o en la siguiente
          break
        }
        // Si empieza con otro código, terminamos
        if (/^[0-9A-Z]{3,}[A-Z0-9\-]*$/.test(sig)) break
        j++
      }

      // Buscar resolución exenta asociada a este producto
      const textoProducto = lineasNombres.slice(i, Math.min(i + 6, lineasNombres.length)).join(' ')
      const mResol = textoProducto.match(/(?:RES\.?\s*EXENTA\s*No|EXENTA\s+No)\s*([\d]+)/)
      const mFecha = textoProducto.match(/(\d{2}\/\d{2}\/\d{4})/)
      if (mResol) {
        resolExenta = mResol[1] + (mFecha ? ' ' + mFecha[1] : '')
      }

      // Limpiar nombre
      nombre = nombre
        .replace(/[®™©]\s*\([^)]*\)\.?/g, '')
        .replace(/RES\.?\s*EXENTA.*/i, '')
        .replace(/\s+/g, ' ')
        .trim()

      if (nombre) items.push({ nombre, resolExenta })
      i = j
    } else {
      i++
    }
  }

  // Extraer unidades y cantidades del bloque derecho
  // Formato: Kilo\nKilo\n600\n2.000\nUnidad\n240
  const lineasUD = bloqueUnidades.split('\n').map(l => l.trim()).filter(Boolean)

  const unidades = []
  const cantidades = []

  for (const l of lineasUD) {
    if (/^(Kilo|Unidad|Litro|Saco|Tambor)/i.test(l)) {
      unidades.push(mapearUnidad(l))
    } else if (/^[\d.,]+$/.test(l) && !l.includes(',')) {
      // Número sin coma decimal = cantidad (ej: 600, 2.000, 240)
      cantidades.push(l.replace(/\./g, ''))
    } else if (/^[\d.]+$/.test(l.replace(/,/g, ''))) {
      // Podría ser precio unitario, lo ignoramos si ya tenemos suficientes cantidades
      if (cantidades.length < items.length) {
        cantidades.push(l.replace(/\./g, '').replace(',', '.'))
      }
    }
  }

  // Combinar todo
  return items.map((item, idx) => ({
    nombre: item.nombre,
    cantidad: cantidades[idx] || '',
    unidad: unidades[idx] || 'unidades',
    resolExenta: item.resolExenta
  }))
}
