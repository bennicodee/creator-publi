import { useId } from 'react'

/** Símbolo: "P" cujo bojo é um balão de fala, com faísca, sobre gradiente. */
export function LogoMark({ size = 34 }: { size?: number }) {
  const id = useId()
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="logo-mark">
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7c3aed" />
          <stop offset="0.55" stopColor="#c026d3" />
          <stop offset="1" stopColor="#fb7185" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${id}-bg)`} />
      <path
        d="M10.5 25.5V8.5h6.25a5.75 5.75 0 0 1 0 11.5H10.5"
        fill="none"
        stroke="#fff"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M15.2 18.6h4.6l-4.3 5.4z" fill="#fff" />
      <path d="M24.5 4.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z" fill="#fff" />
    </svg>
  )
}

export function Logo() {
  return (
    <span className="logo-lockup">
      <LogoMark />
      <span className="logo-word">
        creator<b>publi</b>
      </span>
    </span>
  )
}
