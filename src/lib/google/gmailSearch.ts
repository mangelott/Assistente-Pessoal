import { getAuthorizedGmailClient } from "./oauth";

export type GmailSearchResult = {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  link: string;
};

function getHeader(headers: { name?: string | null; value?: string | null }[] | undefined, name: string) {
  return headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
}

/** Pesquisa mensagens no Gmail usando a mesma sintaxe da barra de pesquisa do Gmail (from:, filename:, has:attachment, etc.). */
export async function searchGmailMessages(query: string, maxResults = 10): Promise<GmailSearchResult[]> {
  const gmail = await getAuthorizedGmailClient();
  if (!gmail) {
    throw new Error("Nenhuma conta Gmail ligada.");
  }

  const listRes = await gmail.users.messages.list({
    userId: "me",
    q: query,
    maxResults,
  });

  const messageIds = listRes.data.messages ?? [];

  const results: GmailSearchResult[] = [];
  for (const { id } of messageIds) {
    if (!id) continue;
    const msg = await gmail.users.messages.get({
      userId: "me",
      id,
      format: "metadata",
      metadataHeaders: ["Subject", "From", "Date"],
    });

    results.push({
      id,
      threadId: msg.data.threadId ?? id,
      subject: getHeader(msg.data.payload?.headers, "Subject") || "(sem assunto)",
      from: getHeader(msg.data.payload?.headers, "From"),
      date: getHeader(msg.data.payload?.headers, "Date"),
      snippet: msg.data.snippet ?? "",
      link: `https://mail.google.com/mail/u/0/#all/${id}`,
    });
  }

  return results;
}
