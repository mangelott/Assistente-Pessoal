import { getAuthorizedGmailClient } from "./oauth";

function encodeSubject(subject: string) {
  return `=?UTF-8?B?${Buffer.from(subject, "utf-8").toString("base64")}?=`;
}

function toBase64Url(input: string) {
  return Buffer.from(input, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function buildMimeMessage({ to, subject, html }: { to: string; subject: string; html: string }) {
  const message = [
    `To: ${to}`,
    `Subject: ${encodeSubject(subject)}`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=UTF-8",
    "",
    html,
  ].join("\r\n");

  return toBase64Url(message);
}

export type CreateGmailDraftResult = { ok: true } | { ok: false; error: string };

/** Cria um rascunho numa conta Gmail ligada específica. Não envia nada — fica pendente de revisão manual no Gmail. */
export async function createGmailDraft(params: {
  accountEmail: string;
  to: string;
  subject: string;
  html: string;
}): Promise<CreateGmailDraftResult> {
  try {
    const gmail = await getAuthorizedGmailClient(params.accountEmail);
    if (!gmail) {
      return { ok: false, error: `A conta ${params.accountEmail} não está ligada.` };
    }

    const raw = buildMimeMessage(params);
    await gmail.users.drafts.create({
      userId: "me",
      requestBody: { message: { raw } },
    });

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Erro desconhecido ao criar rascunho." };
  }
}
