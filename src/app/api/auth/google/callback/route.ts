import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForGoogleAccount } from "@/lib/google/oauth";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");

  if (error || !code) {
    console.error("Google OAuth callback: erro devolvido pela Google:", error);
    return NextResponse.redirect(new URL(`/?google=error`, request.url));
  }

  try {
    await exchangeCodeForGoogleAccount(code);
    return NextResponse.redirect(new URL(`/?google=connected`, request.url));
  } catch (err) {
    console.error("Google OAuth callback: falha ao trocar o código por tokens:", err);
    return NextResponse.redirect(new URL(`/?google=error`, request.url));
  }
}
