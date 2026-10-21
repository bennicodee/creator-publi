import { Campaign, Deliverable, PostMetrics, Profile, ReminderSettings } from '../types'
import { addDays, todayISO, uid } from './format'

export const defaultSettings: ReminderSettings = {
  email: '',
  whatsapp: '',
  whatsappEnabled: false,
  notifyScript: true,
  notifyApproval: true,
  notifyPost: true,
  notifyPayment: true,
  daysBefore: 2,
  digestTime: '08:00',
}

export const emptyDeliverable = (): Deliverable => ({
  id: uid(),
  type: 'reels',
  quantity: 1,
  description: '',
  scriptDue: '',
  approvalDue: '',
  postDate: '',
  scriptSent: false,
  approved: false,
  posted: false,
  postUrl: '',
  metrics: null,
})

export const emptyCampaign = (): Campaign => ({
  id: uid(),
  brand: '',
  agency: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  value: 0,
  paymentMethod: 'pix',
  paymentDueDate: '',
  paidAt: '',
  closedAt: '',
  status: 'proposta',
  briefing: '',
  briefingLink: '',
  couponCode: '',
  couponDiscount: '',
  couponLink: '',
  notes: '',
  deliverables: [],
  checklist: [],
  script: '',
  invoice: null,
  createdAt: todayISO(),
})

/** Campanhas de exemplo com datas relativas a hoje, para o painel nunca abrir vazio. */
export function seedCampaigns(): Campaign[] {
  const t = todayISO()
  const d = (n: number) => addDays(t, n)
  const del = (p: Partial<Deliverable>): Deliverable => ({ ...emptyDeliverable(), ...p })
  const camp = (p: Partial<Campaign>): Campaign => ({ ...emptyCampaign(), createdAt: d(-30), ...p })
  const m = (views: number, likes: number, comments: number, shares: number, saves: number): PostMetrics => ({
    views,
    likes,
    comments,
    shares,
    saves,
  })

  return [
    camp({
      brand: 'Glow Cosméticos',
      agency: 'Agência Pulso',
      contactName: 'Marina Souza',
      contactEmail: 'marina@pulso.com.br',
      value: 3500,
      status: 'producao',
      closedAt: d(-5),
      paymentDueDate: d(36),
      briefing:
        'Lançamento do sérum vitamina C. Tom leve, rotina de manhã. Mostrar textura e antes/depois. Não citar concorrentes. Usar #GlowDaManhã e marcar @glowcosmeticos.',
      couponCode: 'GLOW15',
      couponDiscount: '15%',
      couponLink: 'https://glow.exemplo/glow15',
      deliverables: [
        del({ type: 'reels', quantity: 1, scriptDue: d(1), approvalDue: d(3), postDate: d(6) }),
        del({ type: 'stories', quantity: 3, scriptDue: d(0), approvalDue: d(2), postDate: d(6) }),
      ],
    }),
    camp({
      brand: 'FitBar Snacks',
      contactName: 'Rafael Lima',
      contactEmail: 'rafael@fitbar.exemplo',
      value: 1800,
      status: 'aprovacao',
      closedAt: d(-12),
      paymentDueDate: d(28),
      paymentMethod: 'transferencia',
      briefing: 'Barrinha nova sabor amendoim. Encaixar no pré-treino.',
      couponCode: 'FIT10',
      couponDiscount: '10%',
      deliverables: [
        del({ type: 'reels', quantity: 1, scriptDue: d(-4), scriptSent: true, approvalDue: d(0), postDate: d(2) }),
      ],
    }),
    camp({
      brand: 'Viagem+ Turismo',
      agency: 'Hype Talents',
      contactName: 'Carla Mendes',
      contactEmail: 'financeiro@hypetalents.exemplo',
      value: 5200,
      status: 'postada',
      closedAt: d(-50),
      paymentDueDate: d(-15),
      paymentMethod: 'boleto',
      briefing: 'Pacote de fim de ano para o Nordeste. 1 reels + carrossel com dicas.',
      deliverables: [
        del({ type: 'reels', quantity: 1, scriptDue: d(-40), approvalDue: d(-35), postDate: d(-30), scriptSent: true, approved: true, posted: true, postUrl: 'https://instagram.com/reel/exemplo1', metrics: m(184000, 12400, 380, 2100, 3900) }),
        del({ type: 'carrossel', quantity: 1, scriptDue: d(-40), approvalDue: d(-35), postDate: d(-28), scriptSent: true, approved: true, posted: true, postUrl: 'https://instagram.com/p/exemplo2', metrics: m(61000, 4800, 140, 520, 2600) }),
      ],
    }),
    camp({
      brand: 'Studio Fit App',
      contactName: 'Bruno Alves',
      value: 900,
      status: 'postada',
      closedAt: d(-18),
      paymentDueDate: d(3),
      deliverables: [
        del({ type: 'stories', quantity: 4, scriptDue: d(-12), approvalDue: d(-10), postDate: d(-7), scriptSent: true, approved: true, posted: true, metrics: m(38000, 900, 60, 120, 40) }),
      ],
    }),
    camp({
      brand: 'TechNest',
      contactName: 'Júlia Prado',
      value: 2500,
      status: 'paga',
      closedAt: d(-25),
      paymentDueDate: d(-4),
      paidAt: d(-3),
      deliverables: [
        del({ type: 'youtube', quantity: 1, description: 'Integração de 60s', scriptDue: d(-20), approvalDue: d(-17), postDate: d(-14), scriptSent: true, approved: true, posted: true, postUrl: 'https://youtube.com/watch?v=exemplo', metrics: m(92000, 5100, 430, 310, 880) }),
      ],
    }),
    camp({
      brand: 'PetVibe',
      contactName: 'Ana Ribeiro',
      contactPhone: '(11) 98888-0000',
      value: 1500,
      status: 'fechada',
      closedAt: d(-1),
      paymentDueDate: d(40),
      couponCode: 'PETVIBE',
      couponDiscount: 'Frete grátis',
      deliverables: [
        del({ type: 'tiktok', quantity: 2, scriptDue: d(5), approvalDue: d(8), postDate: d(12) }),
      ],
    }),
    camp({
      brand: 'Café Aurora',
      contactName: 'Pedro Costa',
      value: 1200,
      status: 'negociando',
      notes: 'Pediram desconto de 20%. Contraproposta: manter valor e incluir 1 story extra.',
      deliverables: [del({ type: 'reels', quantity: 1 }), del({ type: 'stories', quantity: 2 })],
    }),
    camp({
      brand: 'Moda Lume',
      agency: 'Agência Pulso',
      contactName: 'Marina Souza',
      value: 2800,
      status: 'proposta',
      notes: 'Proposta enviada por e-mail. Aguardando retorno.',
    }),
  ]
}

const emptyAccount = () => ({ handle: '', followers: 0, engagement: 0 })

export const emptyProfile = (): Profile => ({
  name: '',
  bio: '',
  niche: '',
  city: '',
  contactEmail: '',
  contactPhone: '',
  photoUrl: '',
  networks: { instagram: emptyAccount(), tiktok: emptyAccount(), youtube: emptyAccount() },
  audienceFemale: 0,
  audienceAge: '',
  audienceCities: '',
  priceReels: 0,
  priceStories: 0,
  priceTiktok: 0,
  showCases: true,
  cnpj: '',
  legalName: '',
  municipality: '',
  defaultIssRate: 5,
})

/** Perfil de exemplo para o mídia kit não abrir vazio. */
export const seedProfile = (): Profile => ({
  ...emptyProfile(),
  name: 'Bia Andrade',
  bio: 'Skincare sem complicação, rotina real e viagens com pouco dinheiro. Conteúdo leve, honesto e que vende.',
  niche: 'Beleza · Lifestyle · Viagem',
  city: 'São Paulo, SP',
  contactEmail: 'contato@biaandrade.exemplo',
  networks: {
    instagram: { handle: '@bia.andrade', followers: 128000, engagement: 4.8 },
    tiktok: { handle: '@biaandrade', followers: 241000, engagement: 7.2 },
    youtube: { handle: '', followers: 0, engagement: 0 },
  },
  audienceFemale: 78,
  audienceAge: '18–34 anos (71%)',
  audienceCities: 'São Paulo, Rio de Janeiro, Belo Horizonte',
  priceReels: 2500,
  priceStories: 600,
  priceTiktok: 1800,
})
