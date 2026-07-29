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
    name: "create_gmail_drafts",
    description:
      "Prepara um rascunho por destinatário numa conta Gmail ligada do utilizador, para uma campanha já redigida " +
      "e pendente. NÃO envia nada — os rascunhos ficam no Gmail à espera que o utilizador os reveja e envie " +
      "manualmente. Usa esta ferramenta sempre que o utilizador pedir para enviar/despachar os emails de uma " +
      "campanha — é a única forma de despachar emails nesta aplicação. " +
      "Se houver mais do que uma conta Gmail ligada e não indicares 'accountEmail', a ferramenta devolve um erro " +
      "a listar as contas disponíveis — pergunta ao utilizador qual quer usar e volta a chamar com essa conta. " +
      "Se não houver nenhuma conta ligada, informa o utilizador para ligar uma na aplicação.",
    input_schema: {
      type: "object",
      properties: {
        campaignId: {
          type: "string",
          description: "ID da campanha. Se omitido, usa a campanha pendente mais recente.",
        },
        accountEmail: {
          type: "string",
          description: "Email da conta Gmail ligada a usar para criar os rascunhos. Obrigatório se houver mais do que uma conta ligada.",
        },
      },
    },
  },
  {
    name: "search_gmail",
    description:
      "Pesquisa emails numa (ou em todas, se não especificares) conta(s) Gmail ligada(s) do utilizador " +
      "(só leitura — nunca abre, apaga nem altera nada). " +
      "Usa esta ferramenta quando o utilizador pedir para encontrar/procurar um email sobre um tópico, de uma " +
      "pessoa, com um ficheiro anexado, etc. Traduz o pedido para a sintaxe de pesquisa do Gmail no campo 'query':\n" +
      "- Palavras-chave simples pesquisam o assunto e corpo do email.\n" +
      "- 'from:nome ou email' — de quem enviou.\n" +
      "- 'to:nome ou email' — para quem foi enviado.\n" +
      "- 'subject:palavra' — no assunto.\n" +
      "- 'filename:nome' — com um anexo com esse nome/extensão (ex: 'filename:relatorio.pdf').\n" +
      "- 'has:attachment' — que tenha algum anexo.\n" +
      "- 'after:AAAA/MM/DD' / 'before:AAAA/MM/DD' / 'newer_than:7d' — por data.\n" +
      "Podes combinar vários (ex: 'from:joão filename:contrato has:attachment'). " +
      "Se o utilizador não indicar uma conta específica e houver várias ligadas, pesquisa em todas automaticamente " +
      "(não precisas de perguntar, ao contrário do 'create_gmail_drafts'). " +
      "Se não houver conta Gmail ligada, a ferramenta devolve um erro — informa o utilizador para ligar a conta.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "A pesquisa traduzida para a sintaxe do Gmail, ex: 'filename:contrato.pdf from:joão'.",
        },
        limit: {
          type: "number",
          description: "Quantos emails devolver no máximo. Por omissão 10, máximo 25.",
        },
        accountEmail: {
          type: "string",
          description: "Email de uma conta Gmail ligada específica, se o utilizador quiser restringir a pesquisa só a essa.",
        },
      },
      required: ["query"],
    },
  },
];
