import { NextResponse } from "next/server";
import { getWeather } from "@/lib/weather";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json(await getWeather());
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
