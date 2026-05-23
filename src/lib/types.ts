export type WeatherBriefing = {
  location: string;
  tempF: number;
  feelsLikeF: number | null;
  conditions: string;
  windMph: number;
  highF: number | null;
  lowF: number | null;
  precipChancePct: number | null;
  spoken: string;
};

export type NewsItem = {
  title: string;
  source: string;
  url: string;
  publishedAt?: string;
};

export type NewsBriefing = {
  local: NewsItem[];
  ai: NewsItem[];
  spoken: string;
};

export type EmailMessage = {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  starred: boolean;
};

export type EmailBriefing = {
  unreadCount: number;
  flaggedCount: number;
  unread: EmailMessage[];
  flagged: EmailMessage[];
  spoken: string;
  configured: boolean;
};

export type Briefing = {
  generatedAt: string;
  greeting: string;
  weather: WeatherBriefing | { error: string };
  news: NewsBriefing | { error: string };
  email: EmailBriefing | { error: string };
  script: string;
};
