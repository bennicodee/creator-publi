import { useState, type ReactNode } from 'react'
import { useAuth } from '../auth'
import { ConfirmDialog } from './ConfirmDialog'

/** Botão de sair que pede confirmação antes de encerrar a sessão. */
export function SignOutButton({ className, title, children }: { className: string; title?: string; children: ReactNode }) {
  const { signOut } = useAuth()
  const [asking, setAsking] = useState(false)

  return (
    <>
      <button className={className} onClick={() => setAsking(true)} title={title} aria-label={title}>
        {children}
      </button>
      <ConfirmDialog
        open={asking}
        title="Sair da sua conta?"
        confirmLabel="Sair"
        cancelLabel="Continuar no app"
        onConfirm={signOut}
        onCancel={() => setAsking(false)}
      >
        Para voltar, é só entrar de novo com seu e-mail e senha ou com o Google.
      </ConfirmDialog>
    </>
  )
}
