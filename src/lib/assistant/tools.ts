import type Anthropic from "@anthropic-ai/sdk";

export const ASSISTANT_TOOLS: Anthropic.Tool[] = [
  {
    name: "search_companies",
    description:
      "Pesquisa empresas na web (ex: por setor e localização) e recolhe nome, telefone, email e website. " +
      "Usa esta ferramenta sempre que o utilizador pedir para procurar, encontrar ou pesquisar empresas.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "A pesquisa em linguagem natural a enviar ao motor de pesquisa de empresas, ex: 'empresas de marketing em Lisboa'.",
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
      "Confirma e envia definitivamente uma campanha de email que já foi redigida e está pendente de confirmação. " +
      "Só usa esta ferramenta quando o utilizador confirmar explicitamente que quer enviar (ex: 'sim, envia', 'confirmo', 'pode enviar').",
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
];
