import { NextResponse } from "next/server";
import { listConnectedGoogleAccounts } from "@/lib/google/oauth";

export async function GET() {
  const accounts = await listConnectedGoogleAccounts();
  return NextResponse.json({ accounts });
}
