import { NextResponse } from "next/server";
import { getNews } from "@/lib/news";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json(await getNews());
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
