import type { WeatherBriefing } from "./types";

const WMO: Record<number, string> = {
  0: "clear sky",
  1: "mostly clear",
  2: "partly cloudy",
  3: "overcast",
  45: "fog",
  48: "freezing fog",
  51: "light drizzle",
  53: "drizzle",
  55: "heavy drizzle",
  61: "light rain",
  63: "rain",
  65: "heavy rain",
  71: "light snow",
  73: "snow",
  75: "heavy snow",
  77: "snow grains",
  80: "rain showers",
  81: "heavy rain showers",
  82: "violent rain showers",
  85: "snow showers",
  86: "heavy snow showers",
  95: "thunderstorms",
  96: "thunderstorms with hail",
  99: "severe thunderstorms with hail",
};

export async function getWeather(): Promise<WeatherBriefing> {
  const lat = process.env.LOCATION_LAT ?? "40.6782";
  const lon = process.env.LOCATION_LON ?? "-73.9442";
  const location = process.env.LOCATION_NAME ?? "your area";

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", lat);
  url.searchParams.set("longitude", lon);
  url.searchParams.set(
    "current",
    "temperature_2m,apparent_temperature,weather_code,wind_speed_10m",
  );
  url.searchParams.set(
    "daily",
    "temperature_2m_max,temperature_2m_min,precipitation_probability_max",
  );
  url.searchParams.set("temperature_unit", "fahrenheit");
  url.searchParams.set("wind_speed_unit", "mph");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", "1");

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`weather: ${res.status}`);
  const data = await res.json();

  const tempF = Math.round(data.current.temperature_2m);
  const feelsLikeF = Math.round(data.current.apparent_temperature);
  const conditions = WMO[data.current.weather_code] ?? "unknown conditions";
  const windMph = Math.round(data.current.wind_speed_10m);
  const highF = Math.round(data.daily.temperature_2m_max?.[0] ?? NaN);
  const lowF = Math.round(data.daily.temperature_2m_min?.[0] ?? NaN);
  const precipChancePct = data.daily.precipitation_probability_max?.[0] ?? null;

  const feelsPart =
    Math.abs(feelsLikeF - tempF) >= 3 ? `, feels like ${feelsLikeF}` : "";
  const rangePart =
    Number.isFinite(highF) && Number.isFinite(lowF)
      ? ` High of ${highF}, low of ${lowF}.`
      : "";
  const precipPart =
    precipChancePct != null && precipChancePct >= 30
      ? ` ${precipChancePct} percent chance of precipitation today.`
      : "";
  const windPart = windMph >= 15 ? ` Winds around ${windMph} miles per hour.` : "";

  const spoken = `In ${location}, it is ${tempF} degrees${feelsPart} with ${conditions}.${rangePart}${precipPart}${windPart}`;

  return {
    location,
    tempF,
    feelsLikeF,
    conditions,
    windMph,
    highF: Number.isFinite(highF) ? highF : null,
    lowF: Number.isFinite(lowF) ? lowF : null,
    precipChancePct,
    spoken,
  };
}
