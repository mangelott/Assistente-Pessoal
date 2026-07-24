import { NextResponse } from "next/server";
import { getConnectedGoogleAccountEmail } from "@/lib/google/oauth";

export async function GET() {
  const email = await getConnectedGoogleAccountEmail();
  return NextResponse.json({ connected: Boolean(email), email });
}
