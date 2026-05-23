import { NextResponse } from "next/server";
import { buildAuthUrl } from "@/lib/gmail-oauth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.redirect(buildAuthUrl());
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
