import { NextResponse } from "next/server";
import { runConfirmSendCampaignSkill } from "@/lib/skills/confirmSendCampaignSkill";

export async function POST(_request: Request, ctx: RouteContext<"/api/campaigns/[id]/confirm">) {
  const { id } = await ctx.params;

  try {
    const result = await runConfirmSendCampaignSkill({ campaignId: id });
    return NextResponse.json(result);
  } catch (err) {
    console.error("Erro ao confirmar envio da campanha:", err);
    const message = err instanceof Error ? err.message : "Erro desconhecido.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
