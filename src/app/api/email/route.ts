import { NextResponse } from "next/server";
import { getEmail } from "@/lib/email";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json(await getEmail());
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
