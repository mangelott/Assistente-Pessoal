import { NextResponse } from "next/server";
import { disconnectGoogleAccount } from "@/lib/google/oauth";

export async function DELETE(_request: Request, ctx: RouteContext<"/api/auth/google/accounts/[id]">) {
  const { id } = await ctx.params;
  const removed = await disconnectGoogleAccount(id);

  if (!removed) {
    return NextResponse.json({ error: "Conta não encontrada." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, email: removed.email });
}
