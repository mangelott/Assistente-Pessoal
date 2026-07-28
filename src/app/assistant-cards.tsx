"use client";

type CompanyResult = {
  name: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  rating?: number | null;
  userRatingsTotal?: number | null;
};

export function CompanyResultsCard(props: {
  totalFound: number;
  totalWithEmail: number;
  usedMockData?: boolean;
  companies: CompanyResult[];
}) {
  return (
    <div className="mt-2 rounded-lg border border-gray-200 bg-white p-3 text-sm">
      <p className="mb-2 font-medium">
        {props.totalFound} empresas encontradas · {props.totalWithEmail} com email
      </p>
      {props.usedMockData && (
        <p className="mb-2 rounded bg-amber-50 px-2 py-1 text-xs text-amber-700">
          Dados de exemplo — configura GOOGLE_PLACES_API_KEY para resultados reais.
        </p>
      )}
      <ul className="divide-y divide-gray-100">
        {props.companies.map((c, i) => (
          <li key={i} className="py-1.5">
            <p className="font-medium">
              {c.name}
              {c.rating != null && (
                <span className="ml-2 font-normal text-amber-600">
                  ★ {c.rating.toFixed(1)}
                  {c.userRatingsTotal != null ? ` (${c.userRatingsTotal})` : ""}
                </span>
              )}
            </p>
            <p className="text-gray-500">
              {c.email ?? "sem email"} {c.phone ? `· ${c.phone}` : ""}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CampaignPreviewCard(props: {
  campaignId: string;
  subject: string;
  bodyPreview: string;
  recipientCount: number;
  recipients: { company: string; email: string }[];
  onGmailDraft: (campaignId: string) => void;
  draftingInGmail: boolean;
}) {
  return (
    <div className="mt-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
      <p className="mb-1 font-medium">Rascunho pronto · {props.recipientCount} destinatários</p>
      <p className="mb-1">
        <span className="font-medium">Assunto:</span> {props.subject}
      </p>
      <p className="mb-2 text-gray-600">{props.bodyPreview}</p>
      <ul className="mb-3 max-h-32 overflow-y-auto text-xs text-gray-500">
        {props.recipients.map((r, i) => (
          <li key={i}>
            {r.company} — {r.email}
          </li>
        ))}
      </ul>
      <button
        onClick={() => props.onGmailDraft(props.campaignId)}
        disabled={props.draftingInGmail}
        className="rounded-md bg-gray-900 px-3 py-1.5 text-white disabled:opacity-50"
      >
        {props.draftingInGmail ? "A preparar..." : "Guardar rascunhos no Gmail"}
      </button>
    </div>
  );
}

export function GmailDraftsResultCard(props: {
  draftedCount: number;
  failedCount: number;
  totalRecipients: number;
  gmailAccount?: string;
}) {
  return (
    <div className="mt-2 rounded-lg border border-blue-300 bg-blue-50 p-3 text-sm">
      <p className="font-medium">
        {props.draftedCount} de {props.totalRecipients} rascunhos criados no Gmail
        {props.gmailAccount ? ` (${props.gmailAccount})` : ""}
        {props.failedCount > 0 ? ` — ${props.failedCount} falharam` : ""}.
      </p>
      <p className="mt-1 text-xs text-gray-600">Revê e envia manualmente a partir do Gmail quando quiseres.</p>
    </div>
  );
}

type GmailMessageResult = {
  subject: string;
  from: string;
  date: string;
  snippet: string;
  link: string;
};

export function GmailSearchResultsCard(props: { totalFound: number; messages: GmailMessageResult[] }) {
  if (props.totalFound === 0) {
    return (
      <div className="mt-2 rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-500">
        Não encontrei nenhum email com esses critérios.
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-lg border border-gray-200 bg-white p-3 text-sm">
      <p className="mb-2 font-medium">{props.totalFound} emails encontrados</p>
      <ul className="divide-y divide-gray-100">
        {props.messages.map((m, i) => (
          <li key={i} className="py-1.5">
            <a href={m.link} target="_blank" rel="noopener noreferrer" className="font-medium underline">
              {m.subject}
            </a>
            <p className="text-gray-500">
              {m.from} · {m.date}
            </p>
            {m.snippet && <p className="mt-0.5 text-xs text-gray-400">{m.snippet}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ErrorCard(props: { error: string }) {
  return (
    <div className="mt-2 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">{props.error}</div>
  );
}
