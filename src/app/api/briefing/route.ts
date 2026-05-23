import { NextResponse } from "next/server";
import { getWeather } from "@/lib/weather";
import { getNews } from "@/lib/news";
import { getEmail } from "@/lib/email";
import type { Briefing } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

function greeting(now: Date): string {
  const hour = now.getHours();
  if (hour < 5) return "Hello, night owl.";
  if (hour < 12) return "Good morning.";
  if (hour < 17) return "Good afternoon.";
  if (hour < 21) return "Good evening.";
  return "Hello.";
}

function dateLine(now: Date): string {
  return now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export async function GET(): Promise<NextResponse<Briefing>> {
  const now = new Date();

  const [weatherRes, newsRes, emailRes] = await Promise.allSettled([
    getWeather(),
    getNews(),
    getEmail(),
  ]);

  const weather =
    weatherRes.status === "fulfilled" ? weatherRes.value : { error: String(weatherRes.reason) };
  const news =
    newsRes.status === "fulfilled" ? newsRes.value : { error: String(newsRes.reason) };
  const email =
    emailRes.status === "fulfilled" ? emailRes.value : { error: String(emailRes.reason) };

  const greet = greeting(now);
  const dateStr = dateLine(now);

  const parts: string[] = [`${greet} Here is your briefing for ${dateStr}.`];
  if ("spoken" in weather) parts.push(weather.spoken);
  else parts.push("Weather is unavailable right now.");
  if ("spoken" in email) parts.push(email.spoken);
  else parts.push("Email is unavailable right now.");
  if ("spoken" in news) parts.push(news.spoken);
  else parts.push("News is unavailable right now.");
  parts.push("That's your briefing.");

  const script = parts.join(" ");

  return NextResponse.json(
    {
      generatedAt: now.toISOString(),
      greeting: `${greet} ${dateStr}.`,
      weather,
      news,
      email,
      script,
    },
    { headers: { "cache-control": "no-store, no-cache, must-revalidate, max-age=0" } },
  );
}
