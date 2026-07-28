import { searchGmailMessages } from "@/lib/google/gmailSearch";
import { getConnectedGoogleAccountEmail } from "@/lib/google/oauth";

export type SearchGmailInput = {
  query: string;
  limit?: number;
};

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 25;

export async function runSearchGmailSkill({ query, limit }: SearchGmailInput) {
  const connectedEmail = await getConnectedGoogleAccountEmail();
  if (!connectedEmail) {
    return {
      error: "Ainda não ligaste nenhuma conta Gmail. Liga uma conta na aplicação antes de pedires pesquisas no Gmail.",
    };
  }

  const cappedLimit = Math.min(Math.max(limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);

  try {
    const messages = await searchGmailMessages(query, cappedLimit);
    return {
      query,
      totalFound: messages.length,
      messages,
    };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Erro desconhecido ao pesquisar no Gmail.",
    };
  }
}
