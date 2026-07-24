import type Anthropic from "@anthropic-ai/sdk";

export const ASSISTANT_TOOLS: Anthropic.Tool[] = [
  {
    name: "search_companies",
    description:
      "Pesquisa empresas na web (ex: por setor e localização) e recolhe nome, telefone, email, website e avaliação " +
      "(rating). Os resultados vêm sempre ordenados da melhor para a pior avaliação. " +
      "Usa esta ferramenta sempre que o utilizador pedir para procurar, encontrar ou pesquisar empresas. " +
      "Se o utilizador mencionar uma região vaga do país (ex: 'zona centro', 'norte'), tenta traduzi-la em 2-3 " +
      "cidades concretas dessa região na própria query (ex: 'Coimbra, Viseu e Leiria' em vez de 'zona centro'), " +
      "porque o motor de pesquisa funciona muito melhor com localizações concretas do que com regiões amplas.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "A pesquisa em linguagem natural a enviar ao motor de pesquisa de empresas, ex: 'empresas de marketing em Lisboa'.",
        },
        limit: {
          type: "number",
          description:
            "Quantos resultados o utilizador quer (ex: se pedir 'as 15 melhores', usa 15). Por omissão 20, máximo 45.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "draft_email_campaign",
    description:
      "Redige um email (assunto + corpo) com base nas instruções do utilizador e prepara-o para ser enviado " +
      "a todas as empresas com email encontradas na última pesquisa (ou numa pesquisa específica). " +
      "NÃO envia o email — apenas cria um rascunho pendente de confirmação. Limite máximo de 15 destinatários por envio.",
    input_schema: {
      type: "object",
      properties: {
        instructions: {
          type: "string",
          description:
            "Instruções do utilizador sobre o conteúdo/objetivo do email, ex: 'apresentar os meus serviços de consultoria SEO'.",
        },
        searchSessionId: {
          type: "string",
          description: "ID da pesquisa de empresas a usar como destinatários. Se omitido, usa a pesquisa mais recente.",
        },
      },
      required: ["instructions"],
    },
  },
  {
    name: "confirm_send_campaign",
    description:
      "Confirma e ENVIA AUTOMATICAMENTE E DE IMEDIATO (via Resend) uma campanha de email já redigida e pendente. " +
      "Ninguém revê os emails depois disto — saem mesmo. " +
      "Só usa esta ferramenta quando o utilizador pedir explicitamente envio automático/imediato (ex: 'envia agora', " +
      "'confirmo, pode enviar', 'dispara os emails'). Se o utilizador não deixar claro se quer envio automático ou " +
      "rascunhos no Gmail para rever primeiro, pergunta-lhe antes de agir.",
    input_schema: {
      type: "object",
      properties: {
        campaignId: {
          type: "string",
          description: "ID da campanha a confirmar. Se omitido, usa a campanha pendente mais recente.",
        },
      },
    },
  },
  {
    name: "create_gmail_drafts",
    description:
      "Prepara um rascunho por destinatário na conta Gmail ligada do utilizador, para uma campanha já redigida " +
      "e pendente. NÃO envia nada — os rascunhos ficam no Gmail à espera que o utilizador os reveja e envie " +
      "manualmente. Usa esta ferramenta quando o utilizador pedir para 'guardar como rascunho', 'preparar no Gmail', " +
      "'quero rever antes no Gmail', ou disser que não quer envio automático. Se não houver conta Gmail ligada, " +
      "a ferramenta devolve um erro a explicar isso — informa o utilizador para ligar a conta na aplicação.",
    input_schema: {
      type: "object",
      properties: {
        campaignId: {
          type: "string",
          description: "ID da campanha. Se omitido, usa a campanha pendente mais recente.",
        },
      },
    },
  },
];
