/**
 * Broad geographic guardrail for content published as "รีวิวสุพรรณบุรี".
 * This is intentionally a bounding box, not a substitute for a full boundary
 * polygon: it rejects clearly wrong provinces while avoiding false negatives
 * near the provincial border.
 */
export const SUPHAN_BURI_BOUNDS = {
  minLatitude: 13.95,
  maxLatitude: 15.25,
  minLongitude: 99.15,
  maxLongitude: 100.45,
} as const;

export function isSuphanBuriCoordinate(latitude: number | null, longitude: number | null): boolean {
  return (
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= SUPHAN_BURI_BOUNDS.minLatitude &&
    latitude <= SUPHAN_BURI_BOUNDS.maxLatitude &&
    longitude >= SUPHAN_BURI_BOUNDS.minLongitude &&
    longitude <= SUPHAN_BURI_BOUNDS.maxLongitude
  );
}

/** A record without any coordinates can still be reviewed manually. */
export function hasOutOfSuphanBuriCoordinates(latitude: number | null, longitude: number | null): boolean {
  return latitude !== null && longitude !== null && !isSuphanBuriCoordinate(latitude, longitude);
}
