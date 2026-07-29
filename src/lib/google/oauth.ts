import { google } from "googleapis";
import { prisma } from "@/lib/prisma";

export const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
];

function getOAuthClient() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET e GOOGLE_OAUTH_REDIRECT_URI têm de estar definidos.",
    );
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getGoogleAuthUrl() {
  const client = getOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GMAIL_SCOPES,
  });
}

/** Troca o código OAuth por tokens e liga (ou atualiza) essa conta — não afeta outras contas já ligadas. */
export async function exchangeCodeForGoogleAccount(code: string) {
  const client = getOAuthClient();
  const { tokens } = await client.getToken(code);

  if (!tokens.access_token || !tokens.refresh_token || !tokens.expiry_date) {
    throw new Error(
      "A Google não devolveu um refresh token. Remove o acesso da app em myaccount.google.com/permissions e tenta ligar outra vez.",
    );
  }

  client.setCredentials(tokens);
  const oauth2 = google.oauth2({ auth: client, version: "v2" });
  const { data } = await oauth2.userinfo.get();

  if (!data.email) {
    throw new Error("A Google não devolveu o email da conta.");
  }

  await prisma.googleAccount.upsert({
    where: { email: data.email },
    update: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDate: new Date(tokens.expiry_date),
      scope: tokens.scope ?? GMAIL_SCOPES.join(" "),
    },
    create: {
      email: data.email,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDate: new Date(tokens.expiry_date),
      scope: tokens.scope ?? GMAIL_SCOPES.join(" "),
    },
  });

  return data.email;
}

export type ConnectedGoogleAccount = { id: string; email: string };

export async function listConnectedGoogleAccounts(): Promise<ConnectedGoogleAccount[]> {
  return prisma.googleAccount.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true },
  });
}

/** Revoga o acesso junto da Google (melhor esforço) e remove a conta ligada. */
export async function disconnectGoogleAccount(id: string): Promise<{ email: string } | null> {
  const account = await prisma.googleAccount.findUnique({ where: { id } });
  if (!account) return null;

  try {
    const client = getOAuthClient();
    await client.revokeToken(account.refreshToken);
  } catch {
    // segue com a remoção local mesmo que a revogação junto da Google falhe
  }

  await prisma.googleAccount.delete({ where: { id } });
  return { email: account.email };
}

export type ResolveAccountResult = { ok: true; email: string } | { ok: false; error: string };

/**
 * Decide qual conta Gmail ligada usar numa ação: usa a indicada se existir, a única se só houver uma,
 * ou devolve um erro a pedir para o utilizador escolher quando há várias e nenhuma foi indicada.
 */
export async function resolveGmailAccount(accountEmail?: string): Promise<ResolveAccountResult> {
  const accounts = await listConnectedGoogleAccounts();

  if (accounts.length === 0) {
    return {
      ok: false,
      error: "Ainda não ligaste nenhuma conta Gmail. Liga uma conta na aplicação primeiro.",
    };
  }

  if (accountEmail) {
    const match = accounts.find((a) => a.email.toLowerCase() === accountEmail.toLowerCase());
    if (!match) {
      return {
        ok: false,
        error: `A conta ${accountEmail} não está ligada. Contas ligadas: ${accounts.map((a) => a.email).join(", ")}.`,
      };
    }
    return { ok: true, email: match.email };
  }

  if (accounts.length === 1) {
    return { ok: true, email: accounts[0].email };
  }

  return {
    ok: false,
    error: `Tens várias contas Gmail ligadas (${accounts.map((a) => a.email).join(", ")}). Diz qual queres usar.`,
  };
}

/** Devolve um cliente Gmail autenticado para uma conta específica, renovando e persistindo o access token quando necessário. */
export async function getAuthorizedGmailClient(accountEmail: string) {
  const account = await prisma.googleAccount.findUnique({ where: { email: accountEmail } });
  if (!account) {
    return null;
  }

  const client = getOAuthClient();
  client.setCredentials({
    access_token: account.accessToken,
    refresh_token: account.refreshToken,
    expiry_date: account.expiryDate.getTime(),
  });

  client.on("tokens", (tokens) => {
    if (!tokens.access_token || !tokens.expiry_date) return;
    prisma.googleAccount
      .update({
        where: { id: account.id },
        data: { accessToken: tokens.access_token, expiryDate: new Date(tokens.expiry_date) },
      })
      .catch(() => {});
  });

  return google.gmail({ version: "v1", auth: client });
}
