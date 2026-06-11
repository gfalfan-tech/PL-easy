import { useState } from 'react'
import { PDFDownloadLink } from '@react-pdf/renderer'
import { PLDocument } from './PLDocument'
import logoQdcUrl from '/logo_qdc_.png'

function logoABase64ConFondoBlanco() {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = reject
    img.src = logoQdcUrl
  })
}

export default function BtnDescargarPDF({ pl }) {
  const [logoB64, setLogoB64] = useState(null)
  const [preparando, setPreparando] = useState(false)
  const [listo, setListo] = useState(false)

  const preparar = async () => {
    if (listo) return
    setPreparando(true)
    try {
      const b64 = await logoABase64ConFondoBlanco()
      setLogoB64(b64)
    } catch (e) {
      console.error('No se pudo cargar el logo', e)
    } finally {
      setListo(true)
      setPreparando(false)
    }
  }

  const nombre = `PL_${pl.cliente?.replace(/\s+/g, '_')}_NV${pl.notaVenta}${pl.invoiceNumero ? `_INV${pl.invoiceNumero}` : ''}.pdf`

  if (!listo) {
    return (
      <button className="btn btn--outline btn--sm" onClick={preparar} disabled={preparando}>
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/>
          <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
        {preparando ? 'Preparando PDF…' : 'Generar PDF'}
      </button>
    )
  }

  return (
    <PDFDownloadLink
      document={<PLDocument pl={pl} logoQdcBase64={logoB64} />}
      fileName={nombre}
      className="btn btn--outline btn--sm"
    >
      {({ loading }) =>
        loading ? 'Generando…' : (
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
