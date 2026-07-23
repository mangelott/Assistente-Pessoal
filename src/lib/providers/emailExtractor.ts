const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

const IGNORED_DOMAINS = [
  "sentry.io",
  "wixpress.com",
  "example.com",
  "godaddy.com",
  "cloudflare.com",
  "schema.org",
];

const PREFERRED_PREFIXES = ["geral", "info", "contacto", "contact", "hello", "comercial"];

function pickBestEmail(candidates: string[], websiteHost: string | null): string | null {
  const unique = Array.from(new Set(candidates.map((e) => e.toLowerCase())));
  const valid = unique.filter((e) => !IGNORED_DOMAINS.some((d) => e.endsWith(`@${d}`) || e.includes(`.${d}`)));
  if (valid.length === 0) return null;

  if (websiteHost) {
    const sameDomain = valid.filter((e) => e.endsWith(`@${websiteHost}`));
    const preferred = sameDomain.find((e) =>
      PREFERRED_PREFIXES.some((p) => e.startsWith(`${p}@`) || e.startsWith(`${p}.`)),
    );
    if (preferred) return preferred;
    if (sameDomain.length > 0) return sameDomain[0];
  }

  const preferredAny = valid.find((e) => PREFERRED_PREFIXES.some((p) => e.startsWith(`${p}@`)));
  return preferredAny ?? valid[0];
}

async function fetchPageText(url: string, timeoutMs = 6000): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (assistente-pessoal lead finder)" },
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/** Tenta extrair um email de contacto do website de uma empresa, tentando a homepage e uma página de contactos comum. */
export async function extractEmailFromWebsite(website: string): Promise<string | null> {
  let host: string | null = null;
  try {
    host = new URL(website).host.replace(/^www\./, "");
  } catch {
    return null;
  }

  const candidatePaths = ["", "/contacto", "/contactos", "/contact", "/contact-us", "/sobre"];
  const found: string[] = [];

  for (const path of candidatePaths) {
    const url = website.replace(/\/$/, "") + path;
    const html = await fetchPageText(url);
    if (!html) continue;
    const matches = html.match(EMAIL_REGEX);
    if (matches) found.push(...matches);
    if (found.length > 0 && path !== "") break;
  }

  return pickBestEmail(found, host);
}
