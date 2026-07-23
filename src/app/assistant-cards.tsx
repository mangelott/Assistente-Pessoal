"use client";

type CompanyResult = { name: string; phone: string | null; email: string | null; website: string | null };

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
            <p className="font-medium">{c.name}</p>
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
  onConfirm: (campaignId: string) => void;
  confirming: boolean;
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
        onClick={() => props.onConfirm(props.campaignId)}
        disabled={props.confirming}
        className="rounded-md bg-gray-900 px-3 py-1.5 text-white disabled:opacity-50"
      >
        {props.confirming ? "A enviar..." : "Confirmar e enviar"}
      </button>
    </div>
  );
}

export function SendResultCard(props: { sentCount: number; failedCount: number; totalRecipients: number }) {
  return (
    <div className="mt-2 rounded-lg border border-green-300 bg-green-50 p-3 text-sm">
      <p className="font-medium">
        Enviados {props.sentCount} de {props.totalRecipients} emails
        {props.failedCount > 0 ? ` (${props.failedCount} falharam)` : ""}.
      </p>
    </div>
  );
}

export function ErrorCard(props: { error: string }) {
  return (
    <div className="mt-2 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">{props.error}</div>
  );
}
