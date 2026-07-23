import { NextResponse } from "next/server";
import { z } from "zod";
import { runAssistantTurn } from "@/lib/assistant/orchestrator";

const commandSchema = z.object({
  text: z.string().min(1),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = commandSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Falta o texto do comando." }, { status: 400 });
  }

  try {
    const result = await runAssistantTurn(parsed.data.text);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Erro ao processar comando do assistente:", err);
    const message = err instanceof Error ? err.message : "Erro desconhecido.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
