import { NextResponse, type NextRequest } from "next/server";
import { exchangeCodeForTokens } from "@/lib/gmail-oauth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");
  if (error) return html(`OAuth error: ${escape(error)}`);
  if (!code) return html("Missing code.");

  try {
    const tokens = await exchangeCodeForTokens(code);
    if (!tokens.refresh_token) {
      return html(
        "No refresh_token returned. Revoke access at " +
          "<a href=\"https://myaccount.google.com/permissions\">myaccount.google.com/permissions</a> " +
          "and try again — Google only returns refresh_token on first consent.",
      );
    }
    return html(
      `<p>Copy this into <code>GMAIL_REFRESH_TOKEN</code> in your <code>.env.local</code> (or Vercel env):</p>` +
        `<pre style="user-select:all;padding:1rem;background:#111;border:1px solid #333;border-radius:8px;overflow-wrap:anywhere;white-space:pre-wrap">${escape(tokens.refresh_token)}</pre>` +
        `<p>Then restart the dev server.</p>`,
    );
  } catch (err) {
    return html(`Token exchange failed: ${escape(String(err))}`);
  }
}

function escape(s: string) {
  return s.replace(/[&<>"]/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&quot;",
  );
}

function html(body: string) {
  return new NextResponse(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
      `<title>Gmail OAuth</title>` +
      `<body style="font-family:system-ui;max-width:640px;margin:2rem auto;padding:1rem;background:#0b0d12;color:#e6e8ee">` +
      `<h1 style="font-weight:600">Oakwind Rustle &middot; Gmail OAuth</h1>${body}</body>`,
    { status: 200, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}
