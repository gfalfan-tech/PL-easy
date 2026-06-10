import {
  Document, Page, Text, View, Image, StyleSheet, Font
} from '@react-pdf/renderer'

const VERDE = '#00A878'
const NEGRO = '#0F1923'
const GRIS = '#64748B'
const BORDE = '#E2E8F0'
const BG_HEADER = '#F8FAFC'

const s = StyleSheet.create({
  page: {
    fontSize: 9,
    fontFamily: 'Helvetica',
    paddingTop: 28,
    paddingBottom: 36,
    paddingHorizontal: 32,
    color: NEGRO,
  },

  /* ── Encabezado ── */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottom: `2px solid ${VERDE}`,
    paddingBottom: 12,
    marginBottom: 14,
  },
  headerLogo: {
    width: 80,
    height: 40,
    objectFit: 'contain',
  },
  headerCenter: {
    flex: 1,
    paddingHorizontal: 14,
  },
  headerEmpresa: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: NEGRO,
  },
  headerDirEmpresa: {
    fontSize: 7.5,
    color: GRIS,
    marginTop: 2,
    lineHeight: 1.4,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  headerTitulo: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: NEGRO,
    letterSpacing: 0.5,
  },
  headerTituloSub: {
    fontSize: 9,
    color: GRIS,
    marginTop: 2,
  },
  headerInvoice: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: VERDE,
    marginTop: 3,
  },

  /* ── Info cliente ── */
  infoBloque: {
    marginBottom: 12,
    padding: 10,
    backgroundColor: BG_HEADER,
    borderRadius: 4,
    border: `1px solid ${BORDE}`,
  },
  infoFila: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 4,
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 7,
    color: GRIS,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  infoValor: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: NEGRO,
  },

  /* ── Totales ── */
  totalesRow: {
    flexDirection: 'row',
    backgroundColor: NEGRO,
    borderRadius: 4,
    marginBottom: 12,
    overflow: 'hidden',
  },
  totalItem: {
    flex: 1,
    alignItems: 'center',
    padding: '8 10',
    borderRight: '1px solid rgba(255,255,255,0.1)',
  },
  totalNum: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: VERDE,
  },
  totalLabel: {
    fontSize: 6.5,
    color: '#94A3B8',
    marginTop: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  /* ── Tabla pallets ── */
  tablaTitulo: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: NEGRO,
    marginBottom: 5,
    paddingBottom: 4,
    borderBottom: `1px solid ${BORDE}`,
  },
  tabla: {
    borderRadius: 4,
    overflow: 'hidden',
    border: `1px solid ${BORDE}`,
    marginBottom: 10,
  },
  tablaHeaderRow: {
    flexDirection: 'row',
    backgroundColor: BG_HEADER,
    borderBottom: `1px solid ${BORDE}`,
    padding: '5 6',
  },
  tablaRow: {
    flexDirection: 'row',
    borderBottom: `1px solid ${BORDE}`,
    padding: '4 6',
  },
  tablaRowAlt: {
    backgroundColor: '#FAFBFC',
  },
  tablaTH: {
    fontSize: 6.5,
    fontFamily: 'Helvetica-Bold',
    color: GRIS,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  tablaTD: {
    fontSize: 8,
    color: NEGRO,
  },
  // Anchos de columnas
  colPallet:   { width: 40 },
  colProducto: { flex: 1 },
  colCant:     { width: 35 },
  colEnvase:   { width: 70 },
  colKgN:      { width: 45 },
  colKgB:      { width: 45 },
  colM3:       { width: 35 },
  colImo:      { width: 45 },
  colNu:       { width: 30 },
  colLote:     { width: 60 },

  /* ── Pallets ── */
  palletBloque: {
    marginBottom: 8,
  },
  palletLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: VERDE,
    backgroundColor: `${VERDE}12`,
    padding: '3 8',
    borderRadius: 3,
    marginBottom: 4,
    width: 80,
  },

  /* ── Fotos ── */
  seccionTitulo: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: NEGRO,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottom: `2px solid ${VERDE}`,
    marginTop: 16,
  },
  fotosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  fotoItem: {
    width: 120,
    height: 90,
    borderRadius: 4,
    overflow: 'hidden',
    border: `1px solid ${BORDE}`,
  },

  /* ── Pie ── */
  footer: {
    position: 'absolute',
    bottom: 16,
    left: 32,
    right: 32,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTop: `1px solid ${BORDE}`,
    paddingTop: 6,
  },
  footerText: {
    fontSize: 7,
    color: GRIS,
  },
  footerFirma: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: NEGRO,
  },
})

function formatFecha(ts) {
  if (!ts) return '—'
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function PLDocument({ pl, logoQdcBase64 }) {
  const pallets = pl.pallets || []

  const totalKgNetos = pallets.reduce((s, p) =>
    s + (p.items?.reduce((ss, i) => ss + (Number(i.kilosNetos) || 0), 0) || 0), 0)
  const totalKgBrutos = pallets.reduce((s, p) =>
    s + (p.items?.reduce((ss, i) => ss + (Number(i.kilosBrutos) || 0), 0) || 0), 0)
  const totalMts3 = pallets.reduce((s, p) =>
    s + (p.items?.reduce((ss, i) => ss + (Number(i.mts3) || 0), 0) || 0), 0)

  return (
    <Document>
      <Page size="A4" style={s.page} orientation="landscape">
        {/* ── Encabezado ── */}
        <View style={s.header}>
          <View>
            {logoQdcBase64 && (
              <Image src={logoQdcBase64} style={s.headerLogo} />
            )}
          </View>
          <View style={s.headerCenter}>
            <Text style={s.headerEmpresa}>QUIMICA DEL CAMPO SPA</Text>
            <Text style={s.headerDirEmpresa}>
              Salar de Llamara 812 – Pudahuel{'\n'}Santiago – Chile{'\n'}Teléfono: 56-2-222392050 · www.qdc.cl
            </Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.headerTitulo}>PACKING LIST</Text>
            {pl.invoiceNumero && (
              <Text style={s.headerInvoice}>Invoice N° {pl.invoiceNumero}</Text>
            )}
            <Text style={s.headerTituloSub}>Date: {formatFecha(pl.creadoEn)}</Text>
          </View>
        </View>

        {/* ── Info cliente ── */}
        <View style={s.infoBloque}>
          <View style={s.infoFila}>
            <View style={s.infoItem}>
              <Text style={s.infoLabel}>Cliente</Text>
              <Text style={s.infoValor}>{pl.cliente}</Text>
            </View>
            <View style={s.infoItem}>
              <Text style={s.infoLabel}>Dirección</Text>
              <Text style={s.infoValor}>{pl.direccion || '—'}</Text>
            </View>
            <View style={s.infoItem}>
              <Text style={s.infoLabel}>Número de Contrato</Text>
              <Text style={s.infoValor}>Nota Venta N°{pl.notaVenta}</Text>
            </View>
            {pl.resolExenta && (
              <View style={s.infoItem}>
                <Text style={s.infoLabel}>Resolución Exenta</Text>
                <Text style={s.infoValor}>{pl.resolExenta}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Totales ── */}
        <View style={s.totalesRow}>
          <View style={s.totalItem}>
            <Text style={s.totalNum}>{pallets.length}</Text>
            <Text style={s.totalLabel}>Embalaje (pallets)</Text>
          </View>
          <View style={s.totalItem}>
            <Text style={s.totalNum}>{totalKgNetos.toLocaleString('es-CL')} Kg</Text>
            <Text style={s.totalLabel}>Peso Neto</Text>
          </View>
          <View style={s.totalItem}>
            <Text style={s.totalNum}>{totalKgBrutos.toLocaleString('es-CL')} Kg</Text>
            <Text style={s.totalLabel}>Peso Bruto</Text>
          </View>
          <View style={[s.totalItem, { borderRight: 'none' }]}>
            <Text style={s.totalNum}>{totalMts3.toFixed(2)} m³</Text>
            <Text style={s.totalLabel}>MTS 3</Text>
          </View>
        </View>

        {/* ── Tabla de pallets ── */}
        <Text style={s.tablaTitulo}>Detalle por pallet</Text>
        <View style={s.tabla}>
          {/* Header */}
          <View style={s.tablaHeaderRow}>
            <Text style={[s.tablaTH, s.colPallet]}>N° Pallet</Text>
            <Text style={[s.tablaTH, s.colProducto]}>Nombre Producto</Text>
            <Text style={[s.tablaTH, s.colCant]}>Cant.</Text>
            <Text style={[s.tablaTH, s.colEnvase]}>Desc. Envase</Text>
            <Text style={[s.tablaTH, s.colKgN]}>Kg Netos</Text>
            <Text style={[s.tablaTH, s.colKgB]}>Kg Brutos</Text>
            <Text style={[s.tablaTH, s.colM3]}>M³</Text>
            <Text style={[s.tablaTH, s.colImo]}>Clasif. Ca/IMO</Text>
            <Text style={[s.tablaTH, s.colNu]}>NU</Text>
            <Text style={[s.tablaTH, s.colLote]}>N° Lote</Text>
          </View>

          {/* Filas */}
          {pallets.map((pallet, pi) =>
            (pallet.items || []).map((item, ii) => (
              <View
                key={`${pi}-${ii}`}
                style={[s.tablaRow, (pi + ii) % 2 === 1 ? s.tablaRowAlt : {}]}
              >
                <Text style={[s.tablaTD, s.colPallet]}>
                  {ii === 0 ? pallet.numero || pi + 1 : ''}
                </Text>
                <Text style={[s.tablaTD, s.colProducto]}>{item.nombre}</Text>
                <Text style={[s.tablaTD, s.colCant]}>{item.cantidad}</Text>
                <Text style={[s.tablaTD, s.colEnvase]}>{item.descripcionEnvase}</Text>
                <Text style={[s.tablaTD, s.colKgN]}>{item.kilosNetos}</Text>
                <Text style={[s.tablaTD, s.colKgB]}>{item.kilosBrutos}</Text>
                <Text style={[s.tablaTD, s.colM3]}>{item.mts3}</Text>
                <Text style={[s.tablaTD, s.colImo]}>{item.clasificaCaImo}</Text>
                <Text style={[s.tablaTD, s.colNu]}>{item.clasificaNu}</Text>
                <Text style={[s.tablaTD, s.colLote]}>{item.numeroLote}</Text>
              </View>
            ))
          )}
        </View>

        {/* ── Pie de página ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>QUIMICA DEL CAMPO SPA · www.qdc.cl</Text>
          <Text style={s.footerFirma}>Matías del Campo F.</Text>
          <Text style={s.footerText}>
            Invoice N°{pl.invoiceNumero || '—'} · {formatFecha(pl.creadoEn)}
          </Text>
        </View>
      </Page>

      {/* ── Página de fotos de preparación ── */}
      {pl.fotosPreparacion?.length > 0 && (
        <Page size="A4" style={s.page}>
          <View style={s.header}>
            {logoQdcBase64 && <Image src={logoQdcBase64} style={s.headerLogo} />}
            <View style={s.headerCenter}>
              <Text style={s.headerEmpresa}>QUIMICA DEL CAMPO SPA</Text>
            </View>
            <View style={s.headerRight}>
              <Text style={s.headerTitulo}>PACKING LIST</Text>
              {pl.invoiceNumero && (
                <Text style={s.headerInvoice}>Invoice N° {pl.invoiceNumero}</Text>
              )}
            </View>
          </View>
          <Text style={s.seccionTitulo}>Fotos de Preparación</Text>
          <View style={s.fotosGrid}>
            {pl.fotosPreparacion.map((f, i) => (
              <Image key={i} src={f.url} style={s.fotoItem} />
            ))}
          </View>
          <View style={s.footer} fixed>
            <Text style={s.footerText}>QUIMICA DEL CAMPO SPA · www.qdc.cl</Text>
            <Text style={s.footerText}>Fotos de preparación · {formatFecha(pl.creadoEn)}</Text>
          </View>
        </Page>
      )}

      {/* ── Página de fotos de retiro ── */}
      {pl.fotosRetiro?.length > 0 && (
        <Page size="A4" style={s.page}>
          <View style={s.header}>
            {logoQdcBase64 && <Image src={logoQdcBase64} style={s.headerLogo} />}
            <View style={s.headerCenter}>
              <Text style={s.headerEmpresa}>QUIMICA DEL CAMPO SPA</Text>
            </View>
            <View style={s.headerRight}>
              <Text style={s.headerTitulo}>PACKING LIST</Text>
              {pl.invoiceNumero && (
                <Text style={s.headerInvoice}>Invoice N° {pl.invoiceNumero}</Text>
              )}
            </View>
          </View>
          <Text style={s.seccionTitulo}>Fotos de Retiro de Carga</Text>
          <View style={s.fotosGrid}>
            {pl.fotosRetiro.map((f, i) => (
              <Image key={i} src={f.url} style={s.fotoItem} />
            ))}
          </View>
          <View style={s.footer} fixed>
            <Text style={s.footerText}>QUIMICA DEL CAMPO SPA · www.qdc.cl</Text>
            <Text style={s.footerText}>Fotos de retiro · {formatFecha(pl.creadoEn)}</Text>
          </View>
        </Page>
      )}
    </Document>
  )
}
