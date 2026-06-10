import { useState, useEffect, useRef } from 'react'
import { obtenerClientes } from '../services/clientesService'

export default function ClienteAutocomplete({ value, onChange, onSelect }) {
  const [clientes, setClientes] = useState([])
  const [sugerencias, setSugerencias] = useState([])
  const [abierto, setAbierto] = useState(false)
  const ref = useRef()

  useEffect(() => {
    obtenerClientes().then(setClientes)
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setAbierto(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleInput = (e) => {
    const val = e.target.value
    onChange(val)
    if (val.trim().length > 0) {
      const filtrados = clientes.filter(c =>
        c.nombre?.toLowerCase().includes(val.toLowerCase()) ||
        c.rut?.toLowerCase().includes(val.toLowerCase())
      )
      setSugerencias(filtrados.slice(0, 6))
      setAbierto(filtrados.length > 0)
    } else {
      setSugerencias([])
      setAbierto(false)
    }
  }

  const elegir = (c) => {
    onSelect(c)
    setAbierto(false)
    setSugerencias([])
  }

  return (
    <div className="autocomplete-wrap" ref={ref}>
      <input
        type="text"
        className="form-input"
        value={value}
        onChange={handleInput}
        onFocus={() => { if (sugerencias.length > 0) setAbierto(true) }}
        placeholder="Escribe para buscar o ingresa nuevo cliente"
        autoComplete="off"
      />
      {abierto && sugerencias.length > 0 && (
        <div className="autocomplete-dropdown">
          {sugerencias.map(c => (
            <button
              key={c.id}
              type="button"
              className="autocomplete-item"
              onClick={() => elegir(c)}
            >
              <span className="autocomplete-nombre">{c.nombre}</span>
              <span className="autocomplete-meta">
                {c.rut && <span>{c.rut}</span>}
                {c.pais && <span>{c.pais}</span>}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
