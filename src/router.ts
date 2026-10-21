import { useEffect, useState } from 'react'

const current = () => window.location.hash.slice(1) || '/'

/** Roteador mínimo por hash: evita dependência e funciona em qualquer hospedagem estática. */
export function useRoute() {
  const [path, setPath] = useState(current)
  useEffect(() => {
    const onChange = () => {
      setPath(current())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return path
}

export const navigate = (to: string) => {
  window.location.hash = to
}
