import { useState, type FormEvent, type ReactNode } from 'react'
import { useAuth } from '../auth'
import { api } from '../lib/api'
import { Card, Icon, PageHead } from '../components/ui'

type Msg = { tone: 'good' | 'bad'; text: string } | null

function FormMsg({ msg }: { msg: Msg }) {
  if (!msg) return null
  return (
    <p className={`form-msg ${msg.tone}`} role={msg.tone === 'bad' ? 'alert' : 'status'}>
      {msg.text}
    </p>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  )
}

/** Executa a ação do formulário cuidando de "salvando…" e da mensagem de resultado. */
function useSubmit() {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<Msg>(null)
  const run = async (action: () => Promise<string | void>) => {
    setBusy(true)
    setMsg(null)
    try {
      const ok = await action()
      if (ok) setMsg({ tone: 'good', text: ok })
    } catch (e) {
      setMsg({ tone: 'bad', text: (e as Error).message })
    } finally {
      setBusy(false)
    }
  }
  return { busy, msg, setMsg, run }
}

export function Account() {
  return (
    <>
      <PageHead title="Minha conta" subtitle="Seus dados de acesso ao CreatorPubli." />
      <div className="grid-2">
        <div className="stack">
          <PersonalData />
          <Password />
        </div>
        <DeleteAccount />
      </div>
    </>
  )
}

function PersonalData() {
  const { user, setUser } = useAuth()
  const [name, setName] = useState(user!.name)
  const [nickname, setNickname] = useState(user!.nickname ?? '')
  const [email, setEmail] = useState(user!.email)
  const { busy, msg, run } = useSubmit()
  const changed =
    name.trim() !== user!.name || nickname.trim() !== (user!.nickname ?? '') || email.trim().toLowerCase() !== user!.email

  const submit = (e: FormEvent) => {
    e.preventDefault()
    run(async () => {
      const updated = await api.updateAccount(name, nickname, email)
      setUser(updated)
      setName(updated.name)
      setNickname(updated.nickname)
      setEmail(updated.email)
      return 'Dados atualizados.'
    })
  }

  return (
    <Card title="Dados pessoais">
      <form className="account-form" onSubmit={submit}>
        <Field label="Nome">
          <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required maxLength={120} />
        </Field>
        <Field label="Como podemos te chamar?">
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            autoComplete="nickname"
            maxLength={40}
            placeholder={name.trim().split(/\s+/)[0] || 'Seu apelido'}
          />
        </Field>
        <Field label="E-mail">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </Field>
        <p className="muted small">
          {user!.googleLinked
            ? 'Sua conta Google está vinculada: você pode entrar com ela mesmo se mudar o e-mail aqui.'
            : 'É com esse e-mail que você entra no CreatorPubli.'}{' '}
          O nome que aparece no mídia kit é editado em <a href="#/midia-kit" className="link">Mídia kit</a>.
        </p>
        <FormMsg msg={msg} />
        <button type="submit" className="btn primary self-start" disabled={busy || !changed}>
          {busy ? 'Salvando…' : 'Salvar alterações'}
        </button>
      </form>
    </Card>
  )
}

function Password() {
  const { user, setUser } = useAuth()
  const hasPassword = user!.hasPassword
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const { busy, msg, setMsg, run } = useSubmit()

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (next.length < 6) return setMsg({ tone: 'bad', text: 'A nova senha precisa ter pelo menos 6 caracteres.' })
    if (next !== confirm) return setMsg({ tone: 'bad', text: 'As senhas não conferem.' })
    run(async () => {
      setUser(await api.changePassword(current, next))
      setCurrent('')
      setNext('')
      setConfirm('')
      return hasPassword ? 'Senha alterada.' : 'Senha criada. Agora você também pode entrar com e-mail e senha.'
    })
  }

  const type = show ? 'text' : 'password'
  return (
    <Card title={hasPassword ? 'Alterar senha' : 'Criar senha'}>
      <form className="account-form" onSubmit={submit}>
        {!hasPassword && (
          <p className="muted small">Você entra com o Google. Se quiser, crie uma senha para entrar também com e-mail e senha.</p>
        )}
        {hasPassword && (
          <Field label="Senha atual">
            <input type={type} value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" required />
          </Field>
        )}
        <Field label="Nova senha">
          <input type={type} value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" required />
        </Field>
        <Field label="Confirmar nova senha">
          <input type={type} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required />
        </Field>
        <label className="check">
          <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> Mostrar senhas
        </label>
        <FormMsg msg={msg} />
        <button type="submit" className="btn primary self-start" disabled={busy}>
          {busy ? 'Salvando…' : hasPassword ? 'Alterar senha' : 'Criar senha'}
        </button>
      </form>
    </Card>
  )
}

function DeleteAccount() {
  const { user, signOut } = useAuth()
  const hasPassword = user!.hasPassword
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const { busy, msg, run } = useSubmit()

  const submit = (e: FormEvent) => {
    e.preventDefault()
    run(async () => {
      await api.deleteAccount(hasPassword ? { password: value } : { email: value })
      signOut()
    })
  }

  return (
    <Card title="Excluir conta" className="danger-card">
      <p className="muted small">Isso apaga de vez, sem como recuperar:</p>
      <ul className="danger-list">
        <li>suas campanhas, entregáveis, métricas e notas fiscais</li>
        <li>seu perfil, mídia kit e configurações de lembretes</li>
        <li>sua assinatura do Plano Creator</li>
      </ul>
      {!open ? (
        <button className="btn ghost danger self-start" onClick={() => setOpen(true)}>
          <Icon name="trash" size={16} /> Quero excluir minha conta
        </button>
      ) : (
        <form className="account-form" onSubmit={submit}>
          <Field label={hasPassword ? 'Digite sua senha para confirmar' : `Digite seu e-mail (${user!.email}) para confirmar`}>
            <input
              type={hasPassword ? 'password' : 'email'}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoComplete={hasPassword ? 'current-password' : 'off'}
              autoFocus
              required
            />
          </Field>
          <FormMsg msg={msg} />
          <div className="row gap">
            <button type="submit" className="btn danger-solid" disabled={busy || !value}>
              {busy ? 'Excluindo…' : 'Excluir conta para sempre'}
            </button>
            <button type="button" className="btn ghost" onClick={() => setOpen(false)} disabled={busy}>
              Cancelar
            </button>
          </div>
        </form>
      )}
    </Card>
  )
}
