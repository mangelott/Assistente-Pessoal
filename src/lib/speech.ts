type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionEventLike = {
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isSpeechRecognitionSupported(): boolean {
  return getSpeechRecognitionConstructor() !== null;
}

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Ouve uma única frase e devolve o texto transcrito final. */
export function listenOnce(options?: { lang?: string }): Promise<string> {
  return new Promise((resolve, reject) => {
    const Ctor = getSpeechRecognitionConstructor();
    if (!Ctor) {
      reject(new Error("O reconhecimento de voz não é suportado neste navegador."));
      return;
    }

    const recognition = new Ctor();
    recognition.lang = options?.lang ?? "pt-PT";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const last = event.results[event.results.length - 1];
      const transcript = last?.[0]?.transcript ?? "";
      resolve(transcript.trim());
    };

    recognition.onerror = (event) => {
      reject(event);
    };

    recognition.onend = () => {
      // se nunca disparou onresult, resolve com string vazia para não bloquear a UI
    };

    recognition.start();
  });
}

export function speak(text: string, options?: { lang?: string }) {
  if (!isSpeechSynthesisSupported()) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = options?.lang ?? "pt-PT";
  window.speechSynthesis.speak(utterance);
}
