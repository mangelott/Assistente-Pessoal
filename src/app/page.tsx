"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { isSpeechRecognitionSupported, listenOnce, speak } from "@/lib/speech";
import {
  CampaignPreviewCard,
  CompanyResultsCard,
  ErrorCard,
  GmailDraftsResultCard,
  GmailSearchResultsCard,
} from "./assistant-cards";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  toolName?: string;
  data?: Record<string, unknown>;
};

function uid() {
  return Math.random().toString(36).slice(2);
}

const noopSubscribe = () => () => {};

function useSpeechSupported() {
  return useSyncExternalStore(noopSubscribe, isSpeechRecognitionSupported, () => false);
}

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: uid(),
      role: "assistant",
      text: "Olá! Diz-me o que precisas — por exemplo: \"procura empresas de marketing em Lisboa\".",
    },
  ]);
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draftingGmailId, setDraftingGmailId] = useState<string | null>(null);
  const [textInput, setTextInput] = useState("");
  const [googleAccount, setGoogleAccount] = useState<{ connected: boolean; email: string | null } | null>(null);
  const speechSupported = useSpeechSupported();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    fetch("/api/auth/google/status")
      .then((res) => res.json())
      .then(setGoogleAccount)
      .catch(() => setGoogleAccount({ connected: false, email: null }));

    const params = new URLSearchParams(window.location.search);
    const googleResult = params.get("google");
    if (googleResult) {
      window.history.replaceState({}, "", window.location.pathname);
      const text =
        googleResult === "connected"
          ? "Conta Gmail ligada com sucesso."
          : "Não consegui ligar a conta Gmail. Tenta outra vez.";
      queueMicrotask(() => {
        setMessages((prev) => [...prev, { id: uid(), role: "assistant", text }]);
      });
    }
  }, []);

  async function sendCommand(text: string) {
    if (!text.trim() || busy) return;
    setMessages((prev) => [...prev, { id: uid(), role: "user", text }]);
    setBusy(true);
    try {
      const res = await fetch("/api/assistant/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) {
        const reply = data.error ?? "Ocorreu um erro.";
        setMessages((prev) => [...prev, { id: uid(), role: "assistant", text: reply }]);
        speak(reply);
        return;
      }
      setMessages((prev) => [
        ...prev,
        { id: uid(), role: "assistant", text: data.reply, toolName: data.toolName, data: data.data },
      ]);
      speak(data.reply);
    } finally {
      setBusy(false);
    }
  }

  async function handleMicClick() {
    if (listening || busy) return;
    setListening(true);
    try {
      const transcript = await listenOnce();
      setListening(false);
      if (transcript) await sendCommand(transcript);
    } catch {
      setListening(false);
    }
  }

  async function handleGmailDraft(campaignId: string) {
    setDraftingGmailId(campaignId);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/gmail-drafts`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || data.error) {
        const reply = data.error ?? "Não foi possível criar os rascunhos no Gmail.";
        setMessages((prev) => [...prev, { id: uid(), role: "assistant", text: reply }]);
        speak(reply);
        return;
      }
      const reply = `Criei ${data.draftedCount} de ${data.totalRecipients} rascunhos no Gmail.`;
      setMessages((prev) => [
        ...prev,
        { id: uid(), role: "assistant", text: reply, toolName: "create_gmail_drafts", data },
      ]);
      speak(reply);
    } finally {
      setDraftingGmailId(null);
    }
  }

  function handleTextSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = textInput;
    setTextInput("");
    sendCommand(text);
  }

  return (
    <div className="flex flex-1 flex-col items-center px-4 py-6">
      {googleAccount && (
        <div className="mb-3 w-full max-w-lg rounded-md border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600 flex items-center justify-between">
          {googleAccount.connected ? (
            <span>Gmail ligado: {googleAccount.email}</span>
          ) : (
            <span>Nenhuma conta Gmail ligada — os rascunhos no Gmail não vão funcionar.</span>
          )}
          <a href="/api/auth/google/connect" className="ml-2 shrink-0 font-medium text-gray-900 underline">
            {googleAccount.connected ? "Ligar outra conta" : "Ligar Gmail"}
          </a>
        </div>
      )}
      <div
        ref={scrollRef}
        className="w-full max-w-lg flex-1 space-y-3 overflow-y-auto pb-4"
        style={{ maxHeight: "calc(100vh - 260px)" }}
      >
        {messages.map((m) => (
          <div key={m.id} className={m.role === "user" ? "text-right" : "text-left"}>
            <div
              className={
                "inline-block max-w-[85%] rounded-2xl px-4 py-2 text-sm " +
                (m.role === "user" ? "bg-gray-900 text-white" : "bg-white border border-gray-200")
              }
            >
              {m.text}
            </div>

            {m.toolName === "search_companies" && m.data && !m.data.error && (
              <CompanyResultsCard
                totalFound={Number(m.data.totalFound ?? 0)}
                totalWithEmail={Number(m.data.totalWithEmail ?? 0)}
                usedMockData={Boolean(m.data.usedMockData)}
                companies={(m.data.companies as never[]) ?? []}
              />
            )}

            {m.toolName === "draft_email_campaign" && m.data && !m.data.error && (
              <CampaignPreviewCard
                campaignId={String(m.data.campaignId)}
                subject={String(m.data.subject)}
                bodyPreview={String(m.data.bodyPreview)}
                recipientCount={Number(m.data.recipientCount ?? 0)}
                recipients={(m.data.recipients as never[]) ?? []}
                onGmailDraft={handleGmailDraft}
                draftingInGmail={draftingGmailId === m.data.campaignId}
              />
            )}

            {m.toolName === "create_gmail_drafts" && m.data && !m.data.error && (
              <GmailDraftsResultCard
                draftedCount={Number(m.data.draftedCount ?? 0)}
                failedCount={Number(m.data.failedCount ?? 0)}
                totalRecipients={Number(m.data.totalRecipients ?? 0)}
                gmailAccount={m.data.gmailAccount ? String(m.data.gmailAccount) : undefined}
              />
            )}

            {m.toolName === "search_gmail" && m.data && !m.data.error && (
              <GmailSearchResultsCard
                totalFound={Number(m.data.totalFound ?? 0)}
                messages={(m.data.messages as never[]) ?? []}
              />
            )}

            {m.data?.error != null && <ErrorCard error={String(m.data.error)} />}
          </div>
        ))}
        {busy && <div className="text-sm text-gray-400">A pensar...</div>}
      </div>

      <div className="w-full max-w-lg space-y-3">
        <div className="flex justify-center">
          <button
            onClick={handleMicClick}
            disabled={!speechSupported || busy}
            className={
              "flex h-20 w-20 items-center justify-center rounded-full text-white shadow-lg transition disabled:opacity-40 " +
              (listening ? "bg-red-600 animate-pulse" : "bg-gray-900 hover:bg-gray-800")
            }
            aria-label="Falar com o assistente"
          >
            🎤
          </button>
        </div>
        {!speechSupported && (
          <p className="text-center text-xs text-gray-400">
            Reconhecimento de voz não suportado neste navegador — usa o campo de texto abaixo.
          </p>
        )}

        <form onSubmit={handleTextSubmit} className="flex gap-2">
          <input
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Ou escreve um comando..."
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-gray-900 px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            Enviar
          </button>
        </form>
      </div>
    </div>
  );
}
