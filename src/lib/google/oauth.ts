import { google } from "googleapis";
import { prisma } from "@/lib/prisma";

export const GMAIL_SCOPES = ["https://www.googleapis.com/auth/gmail.compose"];

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

  await prisma.googleAccount.deleteMany({});
  await prisma.googleAccount.create({
    data: {
      email: data.email ?? "desconhecido",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDate: new Date(tokens.expiry_date),
      scope: tokens.scope ?? GMAIL_SCOPES.join(" "),
    },
  });

  return data.email ?? null;
}

export async function getConnectedGoogleAccountEmail(): Promise<string | null> {
  const account = await prisma.googleAccount.findFirst({ orderBy: { createdAt: "desc" } });
  return account?.email ?? null;
}

/** Devolve um cliente Gmail autenticado, renovando e persistindo o access token quando necessário. */
export async function getAuthorizedGmailClient() {
  const account = await prisma.googleAccount.findFirst({ orderBy: { createdAt: "desc" } });
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
