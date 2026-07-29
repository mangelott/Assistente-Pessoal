import { searchGmailMessages } from "@/lib/google/gmailSearch";
import { listConnectedGoogleAccounts, resolveGmailAccount } from "@/lib/google/oauth";

export type SearchGmailInput = {
  query: string;
  limit?: number;
  accountEmail?: string;
};

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 25;

export async function runSearchGmailSkill({ query, limit, accountEmail }: SearchGmailInput) {
  const cappedLimit = Math.min(Math.max(limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);

  try {
    if (accountEmail) {
      const account = await resolveGmailAccount(accountEmail);
      if (!account.ok) return { error: account.error };

      const messages = await searchGmailMessages(account.email, query, cappedLimit);
      return { query, totalFound: messages.length, messages };
    }

    // sem conta indicada: pesquisa em todas as contas ligadas
    const accounts = await listConnectedGoogleAccounts();
    if (accounts.length === 0) {
      return {
        error: "Ainda não ligaste nenhuma conta Gmail. Liga uma conta na aplicação antes de pedires pesquisas no Gmail.",
      };
    }

    const resultsPerAccount = await Promise.all(
      accounts.map((a) => searchGmailMessages(a.email, query, cappedLimit)),
    );
    const messages = resultsPerAccount.flat().slice(0, cappedLimit);

    return { query, totalFound: messages.length, messages };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Erro desconhecido ao pesquisar no Gmail.",
    };
  }
}
