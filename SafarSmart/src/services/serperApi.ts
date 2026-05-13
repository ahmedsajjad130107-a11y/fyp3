/**
 * Serper API – reviews and search (events/festivals).
 * Use EXPO_PUBLIC_SERPER_API_KEY in app config; fallback for dev only.
 */
import axios from 'axios';

const SERPER_BASE = 'https://google.serper.dev';

import Constants from 'expo-constants';

const API_KEY =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_SERPER_API_KEY ||
  '9bda64eb7b539376dc35ed611d101cf5d62ec465';

const headers = {
  'X-API-KEY': API_KEY,
  'Content-Type': 'application/json',
};

export interface SerperReviewSnippet {
  title?: string;
  snippet?: string;
  link?: string;
  rating?: number;
  date?: string;
}

export interface SerperReviewsResult {
  reviews?: SerperReviewSnippet[];
  place?: { name?: string; rating?: number; reviewsCount?: number };
  error?: string;
}

export interface SerperSearchResult {
  organic?: Array<{ title: string; link: string; snippet: string; date?: string }>;
  knowledgeGraph?: { title?: string; description?: string };
  error?: string;
}

/**
 * Fetch review snippets for a place/destination.
 * Tries /reviews first; falls back to /search with "reviews [place]" for snippets.
 * Gracefully returns empty array on failure or no data.
 */
export async function fetchReviewsForPlace(placeName: string, destinationCity?: string): Promise<SerperReviewsResult> {
  const query = destinationCity
    ? `reviews ${placeName} ${destinationCity} Pakistan`
    : `reviews ${placeName} Pakistan`;
  try {
    const res = await axios.post<SerperReviewsResult & { organic?: Array<{ title: string; snippet: string; link?: string }> }>(
      `${SERPER_BASE}/reviews`,
      { query },
      { headers, timeout: 10000 }
    );
    const data = res.data;
    if (data?.reviews && Array.isArray(data.reviews)) return data;
    if (data?.place) return data;
    if (data?.organic && data.organic.length > 0) {
      return {
        reviews: data.organic.slice(0, 6).map((o) => ({ title: o.title, snippet: o.snippet, link: o.link })),
      };
    }
    return { reviews: [] };
  } catch {
    try {
      const searchRes = await axios.post<{ organic?: Array<{ title: string; snippet: string; link?: string }> }>(
        `${SERPER_BASE}/search`,
        { q: query, num: 6 },
        { headers, timeout: 10000 }
      );
      const organic = searchRes.data?.organic;
      if (organic?.length) {
        return {
          reviews: organic.map((o) => ({ title: o.title, snippet: o.snippet, link: o.link })),
        };
      }
    } catch {
      // ignore fallback failure
    }
    return { reviews: [] };
  }
}

/**
 * Search for events/festivals near a destination city.
 * Gracefully returns empty array on failure or no data.
 */
/** Parse date from snippet/title or ISO string; return null if not parseable. */


/* ─────────────────────────────────────────────────────────────
   DATE PARSER (STRICT - NO GUESSING)
──────────────────────────────────────────────────────────── */

function parseEventDate(item: { date?: string; snippet?: string; title?: string }): Date | null {
  const text = [item.date, item.snippet, item.title]
    .filter(Boolean)
    .join(' ')
    .trim();

  if (!text) return null;

  // ISO: 2026-05-12
  const isoMatch = text.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (isoMatch) {
    const d = new Date(isoMatch[0]);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // DMY: 12/05/2026
  const dmyMatch = text.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](20\d{2})\b/);
  if (dmyMatch) {
    const d = new Date(
      Number(dmyMatch[3]),
      Number(dmyMatch[2]) - 1,
      Number(dmyMatch[1])
    );
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // Month format: May 12, 2026
  const monthMatch = text.match(
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s*(20\d{2})?\b/i
  );

  if (monthMatch) {
    const year = monthMatch[3] ? Number(monthMatch[3]) : new Date().getFullYear();
    const monthIndex = new Date(`${monthMatch[1]} 1, 2000`).getMonth();
    const day = Number(monthMatch[2]);

    const d = new Date(year, monthIndex, day);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  return null;
}

/* ─────────────────────────────────────────────────────────────
   FILTER (TRIP-AWARE - CORE FIX)
──────────────────────────────────────────────────────────── */

export function filterEventsToUpcomingOnly(
  organic: any[],
  tripStart?: Date,
  tripEnd?: Date,
  today: Date = new Date()
) {
  if (!Array.isArray(organic)) return [];

  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  return organic.filter((item) => {
    const d = parseEventDate(item);

    // ❌ HARD RULE: no date = reject
    if (!d) return false;

    const eventDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

    // ✅ If trip window exists → STRICT overlap logic
    if (tripStart && tripEnd) {
      const start = new Date(tripStart);
      const end = new Date(tripEnd);

      return eventDate >= start && eventDate <= end;
    }

    // fallback → only future events
    return eventDate >= startOfToday;
  });
}

/* ─────────────────────────────────────────────────────────────
   EVENT FETCH (CLEAN + LESS NOISE)
──────────────────────────────────────────────────────────── */

export async function fetchEventsAndFestivals(destinationCity: string) {
  const today = new Date();
  const year = today.getFullYear();

  // cleaner query → reduces outdated festival spam
  const q = `upcoming events festivals ${destinationCity} Pakistan ${year} official schedule`;

  try {
    const res = await axios.post(
      `${SERPER_BASE}/search`,
      { q, num: 10 },
      {
        headers,
        timeout: 10000,
      }
    );

    const data = res.data;

    return {
      organic: Array.isArray(data?.organic) ? data.organic : [],
      knowledgeGraph: data?.knowledgeGraph ?? null,
    };
  } catch (e) {
    return {
      organic: [],
      error: axios.isAxiosError(e) ? e.message : 'Failed to fetch events',
    };
  }
}