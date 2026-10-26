import { useEffect, useRef, type ReactNode } from 'react'

/** Janela de confirmação no visual do app (usa <dialog>: Esc fecha e o foco fica preso nela). */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  children?: ReactNode
  confirmLabel: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className="confirm-dialog"
      aria-labelledby="confirm-dialog-title"
      onCancel={(e) => {
        e.preventDefault()
        onCancel()
      }}
      // Clique fora da caixa (no fundo escurecido) também cancela.
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="confirm-box">
        <h2 id="confirm-dialog-title">{title}</h2>
        {children && <div className="muted">{children}</div>}
        <div className="confirm-actions">
          <button className="btn ghost" onClick={onCancel} autoFocus>
            {cancelLabel}
          </button>
          <button className="btn primary" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  )
}
