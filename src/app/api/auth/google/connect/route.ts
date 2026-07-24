import { NextResponse } from "next/server";
import { getGoogleAuthUrl } from "@/lib/google/oauth";

export async function GET() {
  try {
    const url = getGoogleAuthUrl();
    return NextResponse.redirect(url);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
