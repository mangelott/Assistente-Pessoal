import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/resend";

export type ConfirmSendCampaignInput = {
  campaignId?: string;
};

const HARD_MAX_RECIPIENTS = 15;

export async function runConfirmSendCampaignSkill({ campaignId }: ConfirmSendCampaignInput) {
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
    return { error: `Esta campanha já está no estado "${campaign.status}", não pode ser reenviada.` };
  }

  await prisma.emailCampaign.update({ where: { id: campaign.id }, data: { status: "SENDING", confirmedAt: new Date() } });

  const recipients = campaign.recipients.slice(0, HARD_MAX_RECIPIENTS);

  let sentCount = 0;
  let failedCount = 0;

  for (const recipient of recipients) {
    const personalizedBody = campaign.bodyTemplate.replaceAll("{{empresa}}", recipient.company.name);
    const result = await sendEmail({ to: recipient.email, subject: campaign.subject, html: personalizedBody });

    if (result.ok) {
      sentCount += 1;
      await prisma.emailCampaignRecipient.update({
        where: { id: recipient.id },
        data: { status: "SENT", sentAt: new Date() },
      });
      await prisma.company.update({ where: { id: recipient.companyId }, data: { status: "SENT" } });
    } else {
      failedCount += 1;
      await prisma.emailCampaignRecipient.update({
        where: { id: recipient.id },
        data: { status: "BOUNCED", error: result.error },
      });
    }
  }

  await prisma.emailCampaign.update({
    where: { id: campaign.id },
    data: { status: "SENT", sentAt: new Date() },
  });

  return {
    campaignId: campaign.id,
    sentCount,
    failedCount,
    totalRecipients: recipients.length,
  };
}
