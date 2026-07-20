/**
 * Parsea texto extraído de una Nota de Venta QDC con PDF.js
 * 
 * Estructura del PDF (columnas mezcladas por el extractor):
 * - Columna izquierda: etiquetas y valores del cliente
 * - Columna derecha: fecha, OC, teléfono, etc.
 * - Productos: código + nombre en bloque izquierdo
 * - Unidades y cantidades: después de OBSERVACIONES
 */
export function parsearNV(texto) {
  const t = texto || ''

  // ── Cliente ──────────────────────────────────────────────
  // "SEÑOR (ES)\n\n:\n\nENABOLCO LTDA.\n\nRUT"
  const cliente = limpiar(match(t, /SEÑOR\s*\(ES\)\s*\n+:\s*\n+(.+?)\n+RUT/s))

  // ── RUT ── puede estar vacío
  // "RUT\n\nDIRECCION\n\n:\n\n:\n\nAV..." → dos puntos seguidos = vacío
  const rutMatch = t.match(/RUT\s*\n+(DIRECCION|\n+:\s*\n+:\s*\n+)/)
  const rut = rutMatch ? '' : limpiar(match(t, /RUT\s*\n+:\s*\n+(.+?)\n+DIRECCION/s))

  // ── Dirección ────────────────────────────────────────────
  // "DIRECCION\n\n:\n\n:\n\nAV.BLANCO..." o "DIRECCION\n\n:\n\nAV.BLANCO..."
  const direccion = limpiar(
    match(t, /DIRECCION\s*\n+:\s*\n+:\s*\n+(.+?)\n+DESPACHO/s) ||
    match(t, /DIRECCION\s*\n+:\s*\n+(.+?)\n+DESPACHO/s)
  )

  // ── Nota de Venta ─────────────────────────────────────────
  // "N° : SOE-57"
  const notaVenta = limpiar(match(t, /N°\s*:\s*([^\n]+)/))

  // ── Orden de Compra ───────────────────────────────────────
  // Viene después de la fecha prometida "17/07/2026\n\n1417COO1"
  const ordenCompra = limpiar(match(t, /\d{2}\/\d{2}\/\d{4}\s*\n+([A-Z0-9]+)\s*\n/))

  // ── Bloque de productos (código + nombre) ─────────────────
  // Entre "P.TOTAL\n\n" y "OBSERVACIONES"
  const bloqueNombres = match(t, /P\.TOTAL\s*\n+([\s\S]+?)OBSERVACIONES/s) || ''

  // ── Bloque de unidades y cantidades ──────────────────────
  // Después de OBSERVACIONES: "Kilo\n\nKilo\n\n600\n\n2.000\n\nUnidad\n\n240..."
  const bloqueUD = match(t, /OBSERVACIONES[\s\S]*?\n+((?:Kilo|Unidad|Litro|Saco|Tambor)[\s\S]+?)(?:\s*NETO|\s*I\.V\.A)/si) || ''

  const productos = parsearProductos(bloqueNombres, bloqueUD)

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

function parsearProductos(bloqueNombres, bloqueUD) {
  const lineas = bloqueNombres.split('\n').map(l => l.trim()).filter(Boolean)

  const items = []
  let i = 0

  while (i < lineas.length) {
    const l = lineas[i]

    // Código de producto: alfanumérico sin espacios, ej: 4PQ03-125, 1PE101203
    if (/^[0-9A-Z]{3,}[A-Z0-9\-]*$/.test(l)) {
      const nombreRaw = lineas[i + 1] || ''
      let resolExenta = ''
      let j = i + 2

      // Revisar si las siguientes líneas tienen resolución exenta
      // Ej: "ZINC SPRAY ZN-400 RES.\nEXENTA No 2613323810\n25/06/2026"
      // El nombre puede terminar en "RES." y las siguientes líneas tienen la resolución
      let nombreFinal = nombreRaw

      if (/RES\.\s*$/.test(nombreRaw)) {
        // El nombre termina en RES. → separar y buscar número resolución
        nombreFinal = nombreRaw.replace(/\s*RES\.\s*$/, '').trim()
        // La siguiente línea tiene "EXENTA No XXXXXXXX"
        if (j < lineas.length && /EXENTA\s+No/i.test(lineas[j])) {
          const numMatch = lineas[j].match(/No\s*([\d]+)/)
          if (numMatch) {
            resolExenta = numMatch[1]
            j++
            // Siguiente línea puede tener fecha
            if (j < lineas.length && /^\d{2}\/\d{2}\/\d{4}$/.test(lineas[j])) {
              resolExenta += ' ' + lineas[j]
              j++
            }
          }
        }
      } else if (j < lineas.length && /EXENTA\s+No/i.test(lineas[j])) {
        // Resolución en línea separada sin que el nombre termine en RES.
        const numMatch = lineas[j].match(/No\s*([\d]+)/)
        if (numMatch) {
          resolExenta = numMatch[1]
          j++
          if (j < lineas.length && /^\d{2}\/\d{2}\/\d{4}$/.test(lineas[j])) {
            resolExenta += ' ' + lineas[j]
            j++
          }
        }
      }

      items.push({ nombre: limpiar(nombreFinal), resolExenta })
      i = j
    } else {
      i++
    }
  }

  // Parsear unidades y cantidades del bloque derecho
  // Formato: "Kilo\n\nKilo\n\n600\n\n2.000\n\nUnidad\n\n240\n\n2,38..."
  const lineasUD = bloqueUD.split('\n').map(l => l.trim()).filter(Boolean)

  const unidades = []
  const cantidades = []

  for (const l of lineasUD) {
    if (/^(Kilo|Unidad|Litro|Saco|Tambor)/i.test(l)) {
      unidades.push(mapearUnidad(l))
    } else if (/^\d[\d.]*$/.test(l)) {
      // Número entero o con punto de miles (sin coma) = cantidad
      // ej: 600, 2.000, 240
      cantidades.push(l.replace(/\./g, ''))
    }
    // Ignorar precios (tienen coma decimal: 2,38 / 1.428,00)
  }

  return items.map((item, idx) => ({
    nombre: item.nombre,
    cantidad: cantidades[idx] || '',
    unidad: unidades[idx] || 'unidades',
    resolExenta: item.resolExenta
  }))
}
