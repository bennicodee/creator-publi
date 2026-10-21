/**
 * Link wa.me com a mensagem preenchida. Sem número, o WhatsApp abre
 * a lista de contatos para escolher o destinatário.
 */
export function waLink(phone: string, text: string) {
  let digits = phone.replace(/\D/g, '')
  // Número brasileiro sem DDI (DDD + número)
  if (digits && digits.length <= 11) digits = `55${digits}`
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
}
