import type { ReactNode } from 'react'
import { Logo } from '../components/Logo'

/** Quem responde pelo CreatorPubli e pelos dados (controladora, na LGPD). */
const CONTROLLER = 'Brena Freire de Paiva'
const CONTACT = 'contato@creatorpubli.com'
const UPDATED = '30 de outubro de 2026'

function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="legal-page">
      <article className="legal card">
        <a href="#/" className="legal-logo" aria-label="CreatorPubli — início">
          <Logo />
        </a>
        <h1>{title}</h1>
        <p className="muted small">Última atualização: {UPDATED}</p>
        {children}
        <p className="legal-footer muted small">
          Dúvidas? Escreva para <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. ·{' '}
          <a href="#/termos">Termos de Uso</a> · <a href="#/privacidade">Política de Privacidade</a> · <a href="#/">Voltar ao app</a>
        </p>
      </article>
    </div>
  )
}

export function Terms() {
  return (
    <LegalPage title="Termos de Uso">
      <p>
        Estes termos valem para quem usa o CreatorPubli (<strong>creatorpubli.com</strong>), mantido por {CONTROLLER}. Ao criar uma
        conta, você concorda com eles e com a <a href="#/privacidade">Política de Privacidade</a>.
      </p>

      <h2>1. O que é o CreatorPubli</h2>
      <p>
        Um painel para creators organizarem suas publis: campanhas, entregáveis, prazos, lembretes, financeiro, métricas, mídia kit e
        dados para nota fiscal. O CreatorPubli é uma ferramenta de organização: não intermedeia negociações nem pagamentos entre você
        e as marcas.
      </p>

      <h2>2. Sua conta</h2>
      <ul>
        <li>É preciso ter 18 anos ou mais.</li>
        <li>Use dados verdadeiros e um e-mail que seja seu. Você é responsável por guardar sua senha e pelo que é feito com a sua conta.</li>
        <li>Se suspeitar de uso indevido, troque a senha e use “Sair de todos os outros aparelhos” em Minha conta.</li>
      </ul>

      <h2>3. Planos e pagamento</h2>
      <ul>
        <li>O plano gratuito pode ser usado sem prazo.</li>
        <li>
          O <strong>Plano Creator</strong> custa R$ 11,99 por mês, cobrado pelo Mercado Pago com renovação automática mensal. O
          CreatorPubli não recebe nem guarda dados do seu cartão.
        </li>
        <li>
          Você pode cancelar quando quiser na página Plano. O cancelamento interrompe as próximas cobranças e os recursos do Plano
          Creator deixam de estar disponíveis. Não há multa nem fidelidade.
        </li>
        <li>
          Pelo Código de Defesa do Consumidor, você pode desistir em até 7 dias depois da primeira cobrança e receber o valor de volta:
          basta pedir pelo e-mail {CONTACT}.
        </li>
        <li>Mudanças de preço serão avisadas por e-mail com pelo menos 30 dias de antecedência.</li>
      </ul>

      <h2>4. Seu conteúdo</h2>
      <p>
        Tudo o que você cadastra (campanhas, briefings, valores, contatos, perfil) continua sendo seu. Usamos esses dados apenas para
        fazer o app funcionar para você. O mídia kit só fica público se você decidir publicá-lo, e pode ser despublicado a qualquer
        momento.
      </p>
      <p>
        Ao cadastrar dados de outras pessoas (por exemplo, o contato de alguém de uma marca ou agência), você confirma que pode
        usá-los para tratar da sua parceria com elas.
      </p>

      <h2>5. Uso permitido</h2>
      <p>
        Não é permitido usar o CreatorPubli para atividades ilegais, enviar spam, tentar acessar contas de outras pessoas, sobrecarregar
        ou atacar o serviço. Contas que fizerem isso podem ser suspensas.
      </p>

      <h2>6. Limites do serviço</h2>
      <ul>
        <li>
          Os <strong>dados de nota fiscal</strong> são um pré-preenchimento para facilitar a sua emissão. A emissão oficial é feita por
          você, no sistema da sua prefeitura, e conferir impostos e alíquotas é responsabilidade sua (na dúvida, fale com um contador).
        </li>
        <li>O <strong>assistente de briefing</strong> gera sugestões de checklist e roteiro: revise antes de usar.</li>
        <li>
          Os <strong>lembretes</strong> ajudam, mas não substituem o seu controle dos prazos combinados com as marcas.
        </li>
        <li>
          Fazemos backup diário e cuidamos da segurança, mas nenhum serviço on-line está livre de falhas. O CreatorPubli é oferecido
          “como está” e não se responsabiliza por perdas indiretas, como uma parceria perdida por um aviso que não chegou.
        </li>
      </ul>

      <h2>7. Encerramento</h2>
      <p>
        Você pode excluir sua conta a qualquer momento em Minha conta; os dados são apagados conforme a Política de Privacidade.
        Podemos encerrar contas que violem estes termos, avisando por e-mail sempre que possível.
      </p>

      <h2>8. Mudanças e lei aplicável</h2>
      <p>
        Estes termos podem ser atualizados; mudanças importantes serão avisadas por e-mail ou no app. Eles seguem as leis do Brasil, e
        fica eleito o foro do domicílio do consumidor.
      </p>
    </LegalPage>
  )
}

export function Privacy() {
  return (
    <LegalPage title="Política de Privacidade">
      <p>
        Esta política explica quais dados o CreatorPubli coleta, para quê e quais são os seus direitos pela Lei Geral de Proteção de
        Dados (LGPD, Lei nº 13.709/2018). A controladora dos dados é {CONTROLLER}, contato: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
      </p>

      <h2>1. Dados que coletamos</h2>
      <ul>
        <li>
          <strong>Conta:</strong> nome, apelido, e-mail e senha (guardada só como hash, nunca em texto). Se você entrar com o Google,
          recebemos também seu nome, e-mail e foto de perfil.
        </li>
        <li>
          <strong>O que você cadastra:</strong> campanhas, entregáveis, valores, contatos de marcas e agências, briefings, métricas dos
          posts, perfil do mídia kit (bio, redes, público, preços), CNPJ, razão social e dados para nota fiscal.
        </li>
        <li>
          <strong>Assinatura:</strong> situação e datas do Plano Creator. O pagamento é feito no Mercado Pago, e os dados do cartão
          ficam só com ele.
        </li>
        <li>
          <strong>Técnicos:</strong> endereço IP e registros de acesso, usados para segurança (por exemplo, limitar tentativas de
          login) e para corrigir erros.
        </li>
      </ul>

      <h2>2. Para que usamos</h2>
      <ul>
        <li>Fazer o app funcionar para você: mostrar suas campanhas, calcular o financeiro, montar o mídia kit — base legal: execução de contrato.</li>
        <li>Enviar e-mails do serviço: confirmação de e-mail, redefinição de senha e o resumo diário de prazos (que você pode desligar em Lembretes).</li>
        <li>Cobrar o Plano Creator e cumprir obrigações legais e fiscais — base legal: execução de contrato e obrigação legal.</li>
        <li>Proteger o serviço contra fraudes e acessos indevidos — base legal: legítimo interesse.</li>
      </ul>
      <p>Não vendemos seus dados, não usamos para publicidade e não mostramos anúncios.</p>

      <h2>3. Com quem compartilhamos</h2>
      <p>Só com os fornecedores necessários para o app funcionar, que tratam os dados em nosso nome:</p>
      <ul>
        <li><strong>HostGator</strong> — servidor onde ficam o banco de dados e a API (Brasil).</li>
        <li><strong>Cloudflare</strong> — hospedagem do site, proteção de rede e cópia dos backups.</li>
        <li><strong>Resend</strong> — envio dos e-mails.</li>
        <li><strong>Google</strong> — login com Google, se você escolher usá-lo.</li>
        <li><strong>Mercado Pago</strong> — cobrança do Plano Creator.</li>
      </ul>
      <p>
        Alguns desses fornecedores podem processar dados fora do Brasil, com as garantias previstas na LGPD. Também podemos fornecer dados
        quando houver ordem judicial ou obrigação legal.
      </p>

      <h2>4. Mídia kit público</h2>
      <p>
        Se você publicar o mídia kit, as informações dele (nome, bio, redes, números, preços e cases que você escolher mostrar) ficam
        visíveis para qualquer pessoa com o link. Seus valores de campanha, contatos e dados fiscais nunca aparecem lá.
      </p>

      <h2>5. Por quanto tempo guardamos</h2>
      <p>
        Enquanto a sua conta existir. Ao excluir a conta em Minha conta, os dados são apagados do banco na hora; as cópias de backup são
        substituídas automaticamente em até 30 dias. Registros de pagamento podem ser mantidos pelo prazo exigido pela lei fiscal.
      </p>

      <h2>6. Seus direitos</h2>
      <p>Pela LGPD, você pode a qualquer momento:</p>
      <ul>
        <li>confirmar quais dados temos e acessá-los;</li>
        <li>corrigir dados (direto em Minha conta e nas telas do app);</li>
        <li>excluir a conta e os dados (em Minha conta);</li>
        <li>pedir uma cópia dos seus dados (portabilidade);</li>
        <li>saber com quem compartilhamos e revogar consentimentos.</li>
      </ul>
      <p>
        Para o que não estiver disponível no app, escreva para <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. Respondemos em até 15 dias.
        Você também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD).
      </p>

      <h2>7. Segurança</h2>
      <p>
        Conexão sempre criptografada (HTTPS), senhas com hash, banco de dados sem acesso direto pela internet, limite de tentativas de
        login e backups diários. Se acontecer algum incidente que coloque seus dados em risco, avisaremos você e a ANPD.
      </p>

      <h2>8. Cookies e armazenamento</h2>
      <p>
        Não usamos cookies de rastreamento nem de publicidade. O app guarda no seu navegador apenas a sessão de login, para você não
        precisar entrar toda vez. O botão de login do Google, quando usado, segue a política do próprio Google.
      </p>

      <h2>9. Menores de idade</h2>
      <p>O CreatorPubli é para maiores de 18 anos.</p>

      <h2>10. Mudanças</h2>
      <p>Esta política pode ser atualizada; mudanças importantes serão avisadas por e-mail ou no app.</p>
    </LegalPage>
  )
}
