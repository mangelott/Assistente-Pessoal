import { NextResponse } from "next/server";
import { runCreateGmailDraftsSkill } from "@/lib/skills/createGmailDraftsSkill";

export async function POST(_request: Request, ctx: RouteContext<"/api/campaigns/[id]/gmail-drafts">) {
  const { id } = await ctx.params;

  try {
    const result = await runCreateGmailDraftsSkill({ campaignId: id });
    return NextResponse.json(result);
  } catch (err) {
    console.error("Erro ao criar rascunhos no Gmail:", err);
    const message = err instanceof Error ? err.message : "Erro desconhecido.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
