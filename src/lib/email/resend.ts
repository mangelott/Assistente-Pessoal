import { Resend } from "resend";

function getClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY não está definido no ambiente.");
  }
  return new Resend(apiKey);
}

function buildFooter() {
  const senderName = process.env.SENDER_NAME ?? "Remetente";
  const senderAddress = process.env.SENDER_ADDRESS ?? "";

  return `
    <hr style="margin-top:24px;border:none;border-top:1px solid #ddd" />
    <p style="font-size:12px;color:#666">
      Enviado por ${senderName}${senderAddress ? ` · ${senderAddress}` : ""}.<br />
      Se não quiser voltar a receber este tipo de contacto, responda a este email com "remover" e não voltará a ser contactado.
    </p>
  `.trim();
}

export type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
};

export type SendEmailResult = { ok: true } | { ok: false; error: string };

export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<SendEmailResult> {
  const from = process.env.EMAIL_FROM;
  if (!from) {
    return { ok: false, error: "EMAIL_FROM não está definido no ambiente." };
  }

  try {
    const client = getClient();
    const replyTo = process.env.EMAIL_REPLY_TO;
    const { error } = await client.emails.send({
      from,
      to,
      subject,
      html: `${html}\n${buildFooter()}`,
      ...(replyTo ? { replyTo } : {}),
    });
    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Erro desconhecido ao enviar email." };
  }
}
