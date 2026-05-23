import { refreshAccessToken } from "./gmail-oauth";
import type { EmailBriefing, EmailMessage } from "./types";

type GmailListResp = {
  messages?: { id: string; threadId: string }[];
  resultSizeEstimate: number;
};

type GmailMessage = {
  id: string;
  snippet: string;
  labelIds: string[];
  payload: {
    headers: { name: string; value: string }[];
  };
};

const GMAIL = "https://gmail.googleapis.com/gmail/v1/users/me";

async function gmailFetch<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${GMAIL}${path}`, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`gmail ${path}: ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

async function listIds(query: string, token: string, max: number): Promise<string[]> {
  const data = await gmailFetch<GmailListResp>(
    `/messages?q=${encodeURIComponent(query)}&maxResults=${max}`,
    token,
  );
  return (data.messages ?? []).map((m) => m.id);
}

async function getMessage(id: string, token: string): Promise<EmailMessage> {
  const data = await gmailFetch<GmailMessage>(
    `/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`,
    token,
  );
  const headers = Object.fromEntries(
    data.payload.headers.map((h) => [h.name.toLowerCase(), h.value]),
  );
  return {
    id: data.id,
    from: cleanFrom(headers.from ?? "Unknown"),
    subject: headers.subject ?? "(no subject)",
    snippet: data.snippet ?? "",
    starred: data.labelIds.includes("STARRED"),
  };
}

function cleanFrom(raw: string): string {
  const m = raw.match(/^\s*"?([^"<]+?)"?\s*<.*>\s*$/);
  if (m) return m[1].trim();
  return raw;
}

export async function getEmail(): Promise<EmailBriefing> {
  const refresh = process.env.GMAIL_REFRESH_TOKEN;
  if (!refresh) {
    return {
      unreadCount: 0,
      flaggedCount: 0,
      unread: [],
      flagged: [],
      spoken:
        "Email is not yet connected. Visit slash A P I slash auth slash gmail slash start to authorize.",
      configured: false,
    };
  }

  const token = await refreshAccessToken(refresh);

  const [unreadIds, flaggedIds] = await Promise.all([
    listIds("is:unread in:inbox", token, 10),
    listIds("is:starred", token, 10),
  ]);

  const allIds = Array.from(new Set([...unreadIds, ...flaggedIds]));
  const messages = await Promise.all(allIds.map((id) => getMessage(id, token)));
  const byId = new Map(messages.map((m) => [m.id, m]));

  const unread = unreadIds.map((id) => byId.get(id)!).filter(Boolean);
  const flagged = flaggedIds.map((id) => byId.get(id)!).filter(Boolean);

  const topUnread = unread.slice(0, 5);
  const unreadPart =
    unread.length === 0
      ? "Inbox zero. No unread mail."
      : `You have ${unread.length} unread ${unread.length === 1 ? "message" : "messages"}. ` +
        `Top: ${topUnread.map((m) => `from ${m.from}, ${m.subject}`).join("; ")}.`;

  const flaggedPart =
    flagged.length === 0
      ? ""
      : ` ${flagged.length} flagged: ${flagged
          .slice(0, 5)
          .map((m) => `from ${m.from}, ${m.subject}`)
          .join("; ")}.`;

  return {
    unreadCount: unread.length,
    flaggedCount: flagged.length,
    unread,
    flagged,
    spoken: `${unreadPart}${flaggedPart}`,
    configured: true,
  };
}
