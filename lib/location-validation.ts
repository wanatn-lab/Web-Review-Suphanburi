/**
 * Coarse bounding box for Suphan Buri province. It is deliberately used only
 * to reject obviously wrong pins (for example, a pin in Nonthaburi), not to
 * claim that a coordinate identifies an exact storefront.
 */
const SUPHAN_BURI_BOUNDS = {
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
