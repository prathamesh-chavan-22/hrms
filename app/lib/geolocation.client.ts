export type GeoResult = {
  lat: number;
  lng: number;
  addr: string | null;
};

export type GeoError =
  | "permission_denied"
  | "position_unavailable"
  | "timeout"
  | "unsupported";

export async function getCurrentPosition(): Promise<GeoResult> {
  if (!navigator.geolocation) {
    throw new Error("unsupported" satisfies GeoError);
  }

  const position = await new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10_000,
      maximumAge: 0,
    });
  }).catch((err: GeolocationPositionError) => {
    if (err.code === 1) throw new Error("permission_denied" satisfies GeoError);
    if (err.code === 2) throw new Error("position_unavailable" satisfies GeoError);
    throw new Error("timeout" satisfies GeoError);
  });

  const lat = position.coords.latitude;
  const lng = position.coords.longitude;
  const addr = await reverseGeocode(lat, lng);

  return { lat, lng, addr };
}

export function geoErrorMessage(code: string): string {
  switch (code as GeoError) {
    case "permission_denied":
      return "Location access denied. Enable GPS in browser settings.";
    case "position_unavailable":
      return "Location unavailable. Move to an open area and retry.";
    case "timeout":
      return "GPS timed out. Try again.";
    case "unsupported":
      return "Your browser does not support GPS.";
    default:
      return "Could not get location.";
  }
}

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
    const res = await fetch(url, {
      headers: { "Accept-Language": "en", "User-Agent": "Glacia-HRMS/1.0" },
    });
    if (!res.ok) return null;
    const json = await res.json() as { display_name?: string };
    return json.display_name ?? null;
  } catch {
    return null;
  }
}
