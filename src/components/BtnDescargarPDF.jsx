import { PDFDownloadLink } from '@react-pdf/renderer'
import { PLDocument } from './PLDocument'
import { LOGO_QDC_BASE64 } from '../assets/logoQdcBase64'

export default function BtnDescargarPDF({ pl }) {
  const nombre = `PL_${pl.cliente?.replace(/\s+/g, '_')}_NV${pl.notaVenta}${pl.invoiceNumero ? `_INV${pl.invoiceNumero}` : ''}.pdf`

  return (
    <PDFDownloadLink
      document={<PLDocument pl={pl} logoQdcBase64={LOGO_QDC_BASE64} />}
      fileName={nombre}
      className="btn btn--outline btn--sm"
    >
      {({ loading }) =>
        loading ? 'Generando PDF…' : (
          <>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
            </svg>
            Descargar PDF
          </>
        )
      }
    </PDFDownloadLink>
  )
}
