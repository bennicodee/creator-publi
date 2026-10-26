namespace CreatorPubli.Api.Domain;

// Os nomes em minúsculas são exatamente os ids usados no frontend (src/types.ts),
// tanto no JSON quanto nas colunas de texto do banco.

public enum CampaignStatus { Proposta, Negociando, Fechada, Producao, Aprovacao, Postada, Paga }

public enum PaymentMethod { Pix, Transferencia, Boleto, Cartao, Permuta, Outro }

public enum DeliverableType { Reels, Stories, Feed, Carrossel, Tiktok, Youtube, Outro }

public enum InvoiceStatus { Rascunho, Emitida }

public enum Network { Instagram, Tiktok, Youtube }
