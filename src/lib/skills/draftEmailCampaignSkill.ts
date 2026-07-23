import { prisma } from "@/lib/prisma";
import { anthropic, ASSISTANT_MODEL } from "@/lib/claude";

export type DraftEmailCampaignInput = {
  instructions: string;
  searchSessionId?: string;
  maxRecipients?: number;
};

const HARD_MAX_RECIPIENTS = 15;

async function draftSubjectAndBody(instructions: string): Promise<{ subject: string; bodyHtml: string }> {
  const message = await anthropic.messages.create({
    model: ASSISTANT_MODEL,
    max_tokens: 1024,
    system:
      "Escreves emails comerciais curtos, profissionais e diretos em português de Portugal, para prospeção B2B. " +
      "Usa o placeholder literal {{empresa}} onde o nome da empresa destinatária deve aparecer. " +
      "Responde APENAS com um objeto JSON válido no formato {\"subject\": string, \"bodyHtml\": string}, sem texto à volta. " +
      "O bodyHtml deve usar tags HTML simples (<p>, <br>) e terminar com uma assinatura genérica '[O teu nome]'.",
    messages: [{ role: "user", content: instructions }],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  const raw = textBlock && "text" in textBlock ? textBlock.text : "{}";

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw) as { subject: string; bodyHtml: string };
  return parsed;
}

export async function runDraftEmailCampaignSkill({
  instructions,
  searchSessionId,
  maxRecipients,
}: DraftEmailCampaignInput) {
  const targetSession = searchSessionId
    ? await prisma.searchSession.findUnique({ where: { id: searchSessionId } })
    : await prisma.searchSession.findFirst({ orderBy: { createdAt: "desc" } });

  if (!targetSession) {
    return {
      error: "Não encontrei nenhuma pesquisa de empresas anterior. Pede primeiro uma pesquisa.",
    };
  }

  const companies = await prisma.company.findMany({
    where: { searchSessionId: targetSession.id, email: { not: null } },
  });

  const alreadyContactedEmails = new Set(
    (
      await prisma.emailCampaignRecipient.findMany({
        where: { status: "SENT", email: { in: companies.map((c) => c.email!) } },
        select: { email: true },
      })
    ).map((r) => r.email),
  );

  const eligible = companies.filter((c) => c.email && !alreadyContactedEmails.has(c.email));

  const cap = Math.min(maxRecipients ?? HARD_MAX_RECIPIENTS, HARD_MAX_RECIPIENTS, eligible.length);
  const selected = eligible.slice(0, cap);

  if (selected.length === 0) {
    return {
      error:
        "Não há destinatários novos com email disponível nesta pesquisa (podem já ter sido todos contactados).",
    };
  }

  const { subject, bodyHtml } = await draftSubjectAndBody(instructions);

  const campaign = await prisma.emailCampaign.create({
    data: {
      subject,
      bodyTemplate: bodyHtml,
      status: "PENDING_CONFIRMATION",
      maxRecipients: cap,
      recipients: {
        create: selected.map((c) => ({
          companyId: c.id,
          email: c.email!,
          status: "DRAFTED",
        })),
      },
    },
    include: { recipients: { include: { company: true } } },
  });

  return {
    campaignId: campaign.id,
    subject,
    bodyPreview: bodyHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 400),
    recipientCount: campaign.recipients.length,
    recipients: campaign.recipients.map((r) => ({ company: r.company.name, email: r.email })),
    requiresConfirmation: true,
  };
}
