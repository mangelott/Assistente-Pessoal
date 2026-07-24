import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForGoogleAccount } from "@/lib/google/oauth";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(new URL(`/?google=error`, request.url));
  }

  try {
    await exchangeCodeForGoogleAccount(code);
    return NextResponse.redirect(new URL(`/?google=connected`, request.url));
  } catch {
    return NextResponse.redirect(new URL(`/?google=error`, request.url));
  }
}
