import { prisma } from "@/lib/prisma";
import { createGmailDraft } from "@/lib/google/gmailDrafts";
import { getConnectedGoogleAccountEmail } from "@/lib/google/oauth";

export type CreateGmailDraftsInput = {
  campaignId?: string;
};

const HARD_MAX_RECIPIENTS = 15;

export async function runCreateGmailDraftsSkill({ campaignId }: CreateGmailDraftsInput) {
  const connectedEmail = await getConnectedGoogleAccountEmail();
  if (!connectedEmail) {
    return {
      error:
        "Ainda não ligaste nenhuma conta Gmail. Liga uma conta na aplicação antes de pedires rascunhos no Gmail.",
    };
  }

  const campaign = campaignId
    ? await prisma.emailCampaign.findUnique({
        where: { id: campaignId },
        include: { recipients: { include: { company: true } } },
      })
    : await prisma.emailCampaign.findFirst({
        where: { status: "PENDING_CONFIRMATION" },
        orderBy: { createdAt: "desc" },
        include: { recipients: { include: { company: true } } },
      });

  if (!campaign) {
    return { error: "Não encontrei nenhuma campanha de email pendente de confirmação." };
  }

  if (campaign.status !== "PENDING_CONFIRMATION") {
    return { error: `Esta campanha já está no estado "${campaign.status}", não é possível preparar rascunhos.` };
  }

  await prisma.emailCampaign.update({
    where: { id: campaign.id },
    data: { status: "DRAFTING_IN_GMAIL", confirmedAt: new Date() },
  });

  const recipients = campaign.recipients.slice(0, HARD_MAX_RECIPIENTS);

  let draftedCount = 0;
  let failedCount = 0;

  for (const recipient of recipients) {
    const personalizedBody = campaign.bodyTemplate.replaceAll("{{empresa}}", recipient.company.name);
    const result = await createGmailDraft({
      to: recipient.email,
      subject: campaign.subject,
      html: personalizedBody,
    });

    if (result.ok) {
      draftedCount += 1;
      await prisma.emailCampaignRecipient.update({
        where: { id: recipient.id },
        data: { status: "GMAIL_DRAFTED" },
      });
      await prisma.company.update({ where: { id: recipient.companyId }, data: { status: "GMAIL_DRAFTED" } });
    } else {
      failedCount += 1;
      await prisma.emailCampaignRecipient.update({
        where: { id: recipient.id },
        data: { error: result.error },
      });
    }
  }

  await prisma.emailCampaign.update({
    where: { id: campaign.id },
    data: { status: "DRAFTED_IN_GMAIL" },
  });

  return {
    campaignId: campaign.id,
    draftedCount,
    failedCount,
    totalRecipients: recipients.length,
    gmailAccount: connectedEmail,
  };
}
