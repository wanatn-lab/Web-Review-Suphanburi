import { isGoogleMapsLink } from "./google-maps-link";
import { isSuphanBuriCoordinate } from "./location-validation";

// lib/maps-link.ts
// Builds the "open in Google Maps" link for a review.
// With a Place ID, the official Maps URLs API opens the venue's own page
// (name, hours, photos, reviews). `query` is only a fallback that Google uses
// if it cannot resolve the Place ID.
// https://developers.google.com/maps/documentation/urls/get-started#search-action

type MappableReview = {
  latitude: number | null;
  longitude: number | null;
  location_text: string | null;
  google_place_id?: string | null;
  google_maps_url?: string | null;
};

const PLACE_ID_PATTERN = /^[A-Za-z0-9_-]{1,512}$/;
const SEARCH_BASE = "https://www.google.com/maps/search/?api=1";

export function isValidPlaceId(value: unknown): value is string {
  return typeof value === "string" && PLACE_ID_PATTERN.test(value);
}

export function reviewMapsUrl(review: MappableReview): string | null {
  // A link pasted from Google Maps "Share" already opens the venue page.
  if (review.google_maps_url && isGoogleMapsLink(review.google_maps_url)) return review.google_maps_url;
  const hasGeo = isSuphanBuriCoordinate(review.latitude, review.longitude);
  const locationText = review.location_text?.trim() || null;
  const fallbackQuery = locationText ?? (hasGeo ? `${review.latitude},${review.longitude}` : null);

  if (isValidPlaceId(review.google_place_id) && fallbackQuery) {
    return `${SEARCH_BASE}&query=${encodeURIComponent(fallbackQuery)}&query_place_id=${encodeURIComponent(review.google_place_id)}`;
  }
  if (hasGeo) return `${SEARCH_BASE}&query=${review.latitude},${review.longitude}`;
  if (locationText) return `${SEARCH_BASE}&query=${encodeURIComponent(locationText)}`;
  return null;
}
