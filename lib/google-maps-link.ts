// lib/google-maps-link.ts
// Reads a Google Maps link that an editor copied from Google Maps ("Share").
// No API key or billing needed: short links (maps.app.goo.gl) are followed by
// redirect, and the venue pin is parsed from the final URL.
//
// Google place URLs look like:
//   https://www.google.com/maps/place/<name>/@<viewLat>,<viewLng>,15z/data=...!3d<lat>!4d<lng>...
// `!3d/!4d` is the venue pin; `@lat,lng` is only the map viewport centre and
// can be ~1 km off, so it is used as a last resort.

const SHORT_LINK_HOSTS = new Set(["maps.app.goo.gl", "goo.gl"]);
const MAPS_HOST_PATTERN = /^(?:www\.|maps\.)?google\.(?:com|co\.th)$/;
const MAX_REDIRECTS = 5;
const MAX_URL_LENGTH = 2048;

export interface ParsedGoogleMapsLink {
  /** Venue name from the /maps/place/<name>/ segment, if present. */
  name: string | null;
  latitude: number | null;
  longitude: number | null;
}

function parseUrl(value: string): URL | null {
  if (value.length > MAX_URL_LENGTH) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    return url;
  } catch {
    return null;
  }
}

function isShortLink(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  return host === "maps.app.goo.gl" || (host === "goo.gl" && url.pathname.startsWith("/maps"));
}

function isMapsUrl(url: URL): boolean {
  return MAPS_HOST_PATTERN.test(url.hostname.toLowerCase()) &&
    (url.hostname.toLowerCase().startsWith("maps.") || url.pathname.startsWith("/maps"));
}

/** True for any link the editor may paste: a share short link or a full Google Maps URL. */
export function isGoogleMapsLink(value: string): boolean {
  const url = parseUrl(value);
  return Boolean(url && (isShortLink(url) || isMapsUrl(url)));
}

function toPoint(lat: string | undefined, lng: string | undefined) {
  const latitude = Number(lat);
  const longitude = Number(lng);
  return Number.isFinite(latitude) && Number.isFinite(longitude) && lat && lng ? { latitude, longitude } : null;
}

/** Extract venue name and pin from a full (already redirected) Google Maps URL. */
export function parseGoogleMapsUrl(value: string): ParsedGoogleMapsLink {
  const url = parseUrl(value);
  if (!url || !isMapsUrl(url)) return { name: null, latitude: null, longitude: null };
  const full = url.toString();
  let path = url.pathname;
  try { path = decodeURIComponent(path); } catch { /* keep raw path */ }

  const nameMatch = path.match(/\/maps\/place\/([^/]+)/);
  const name = nameMatch ? nameMatch[1].replace(/\+/g, " ").trim() || null : null;

  const pin = full.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  const query = (url.searchParams.get("q") ?? url.searchParams.get("query") ?? url.searchParams.get("ll") ?? "")
    .match(/^\s*(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)\s*$/);
  const viewport = path.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  const point = toPoint(pin?.[1], pin?.[2]) ?? toPoint(query?.[1], query?.[2]) ?? toPoint(viewport?.[1], viewport?.[2]);

  return { name, latitude: point?.latitude ?? null, longitude: point?.longitude ?? null };
}

/**
 * Follow a share short link to the full Google Maps URL. Only Google hosts are
 * followed. Returns null when the link cannot be resolved (never throws).
 */
export async function expandGoogleMapsLink(value: string, fetchImpl: typeof fetch = fetch): Promise<string | null> {
  let url = parseUrl(value);
  for (let hop = 0; url && hop <= MAX_REDIRECTS; hop++) {
    if (isMapsUrl(url)) return url.toString();
    if (!isShortLink(url) && !SHORT_LINK_HOSTS.has(url.hostname.toLowerCase())) return null;
    try {
      const response = await fetchImpl(url.toString(), {
        method: "GET",
        redirect: "manual",
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      const location = response.headers.get("location");
      if (!location || response.status < 300 || response.status >= 400) return null;
      url = parseUrl(new URL(location, url).toString());
    } catch {
      return null;
    }
  }
  return null;
}
