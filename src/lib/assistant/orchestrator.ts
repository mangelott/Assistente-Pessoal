import type Anthropic from "@anthropic-ai/sdk";
import { anthropic, ASSISTANT_MODEL } from "@/lib/claude";
import { prisma } from "@/lib/prisma";
import { ASSISTANT_TOOLS } from "./tools";
import { runSearchCompaniesSkill } from "@/lib/skills/searchCompaniesSkill";
import { runDraftEmailCampaignSkill } from "@/lib/skills/draftEmailCampaignSkill";
import { runConfirmSendCampaignSkill } from "@/lib/skills/confirmSendCampaignSkill";

const SYSTEM_PROMPT = `
És um assistente pessoal por voz, em português de Portugal, que ajuda o utilizador a automatizar duas tarefas:
1. Pesquisar empresas (ex: por setor/localização) e recolher contactos.
2. Redigir e enviar emails em lote às empresas encontradas, sempre com confirmação explícita do utilizador antes de qualquer envio.

Regras importantes:
- Nunca uses a ferramenta "confirm_send_campaign" sem uma confirmação explícita e inequívoca do utilizador nesta conversa.
- O utilizador está frequentemente a conduzir. Sê breve, claro e natural nas respostas, como se estivesses a falar.
- Se faltar informação para executar uma ação (ex: não sabes que tipo de empresa procurar), pergunta antes de agir.
`.trim();

const HISTORY_LIMIT = 12;

async function loadHistory(): Promise<Anthropic.MessageParam[]> {
  const messages = await prisma.conversationMessage.findMany({
    orderBy: { createdAt: "desc" },
    take: HISTORY_LIMIT,
  });
  return messages
    .reverse()
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
}

async function executeSkill(name: string, input: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case "search_companies":
      return runSearchCompaniesSkill({ query: String(input.query ?? "") });
    case "draft_email_campaign":
      return runDraftEmailCampaignSkill({
        instructions: String(input.instructions ?? ""),
        searchSessionId: input.searchSessionId ? String(input.searchSessionId) : undefined,
      });
    case "confirm_send_campaign":
      return runConfirmSendCampaignSkill({
        campaignId: input.campaignId ? String(input.campaignId) : undefined,
      });
    default:
      return { error: `Ferramenta desconhecida: ${name}` };
  }
}

function extractText(message: Anthropic.Message): string {
  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

export type AssistantTurnResult = {
  reply: string;
  toolName?: string;
  data?: unknown;
};

export async function runAssistantTurn(userText: string): Promise<AssistantTurnResult> {
  const history = await loadHistory();

  await prisma.conversationMessage.create({ data: { role: "user", content: userText } });

  const messages: Anthropic.MessageParam[] = [...history, { role: "user", content: userText }];

  const firstResponse = await anthropic.messages.create({
    model: ASSISTANT_MODEL,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    tools: ASSISTANT_TOOLS,
    messages,
  });

  const toolUse = firstResponse.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");

  if (!toolUse) {
    const reply = extractText(firstResponse) || "Desculpa, não percebi. Podes repetir?";
    await prisma.conversationMessage.create({ data: { role: "assistant", content: reply } });
    return { reply };
  }

  const skillData = await executeSkill(toolUse.name, toolUse.input as Record<string, unknown>);

  const followUpMessages: Anthropic.MessageParam[] = [
    ...messages,
    { role: "assistant", content: firstResponse.content },
    {
      role: "user",
      content: [
        {
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: JSON.stringify(skillData),
        },
      ],
    },
  ];

  const secondResponse = await anthropic.messages.create({
    model: ASSISTANT_MODEL,
    max_tokens: 512,
    system:
      SYSTEM_PROMPT +
      "\n\nAcabaste de executar uma ação. Explica o resultado ao utilizador em 1-3 frases faladas, em português de Portugal. " +
      "Se o resultado incluir uma campanha de email pendente de confirmação, pergunta claramente se pode enviar. " +
      "Se houver um erro, explica-o de forma simples.",
    messages: followUpMessages,
  });

  const reply = extractText(secondResponse) || "Feito.";
  await prisma.conversationMessage.create({ data: { role: "assistant", content: reply } });

  return { reply, toolName: toolUse.name, data: skillData };
}
