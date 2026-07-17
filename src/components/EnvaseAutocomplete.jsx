import { useState, useEffect, useRef } from 'react'
import { escucharEnvases } from '../services/configuracionService'

export default function EnvaseAutocomplete({ value, onChange }) {
  const [envases, setEnvases] = useState([])
  const [sugerencias, setSugerencias] = useState([])
  const [abierto, setAbierto] = useState(false)
  const ref = useRef()

  useEffect(() => {
    const unsub = escucharEnvases(setEnvases)
    return unsub
  }, [])

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setAbierto(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleInput = e => {
    const val = e.target.value
    onChange(val)
    if (val.trim().length > 0) {
      const filtrados = envases.filter(en => en.nombre.toLowerCase().includes(val.toLowerCase()))
      setSugerencias(filtrados.slice(0, 6))
      setAbierto(filtrados.length > 0)
    } else {
      // Mostrar todos al estar vacío
      setSugerencias(envases.slice(0, 6))
      setAbierto(envases.length > 0)
    }
  }

  const elegir = nombre => { onChange(nombre); setAbierto(false); setSugerencias([]) }

  return (
    <div className="autocomplete-wrap" ref={ref} style={{ minWidth: '120px' }}>
      <input
        type="text"
        className="table-input"
        value={value}
        onChange={handleInput}
        onFocus={() => { setSugerencias(envases.slice(0, 6)); setAbierto(envases.length > 0) }}
        placeholder="Tipo de envase"
        autoComplete="off"
      />
      {abierto && sugerencias.length > 0 && (
        <div className="autocomplete-dropdown" style={{ zIndex: 300 }}>
          {sugerencias.map(e => (
            <button key={e.id} type="button" className="autocomplete-item" onClick={() => elegir(e.nombre)}>
              <span className="autocomplete-nombre" style={{ fontSize: '.8rem' }}>{e.nombre}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

