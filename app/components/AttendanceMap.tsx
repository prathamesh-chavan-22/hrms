import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type MapMarker = {
  lat: number;
  lng: number;
  name: string;
  time: string;
  addr?: string | null;
};

interface AttendanceMapProps {
  markers: MapMarker[];
  className?: string;
}

export function AttendanceMap({ markers, className = "" }: AttendanceMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || markers.length === 0) return;

    let cancelled = false;

    import("leaflet").then((L) => {
      if (cancelled || !containerRef.current) return;

      // Remove existing map
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      const center: [number, number] = [markers[0].lat, markers[0].lng];
      const map = L.map(containerRef.current!).setView(center, 13);
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Custom square brutalist icon
      const icon = L.divIcon({
        className: "",
        iconSize: [18, 18],
        iconAnchor: [9, 9],
        html: `<div style="width:18px;height:18px;background:var(--accent,#06B6D4);border:2px solid var(--rule,#0B1620);"></div>`,
      });

      markers.forEach((m) => {
        const addrSnippet = m.addr
          ? `<br/><span style="opacity:0.6;">${escapeHtml(m.addr.slice(0, 60))}${m.addr.length > 60 ? "…" : ""}</span>`
          : "";
        const popup = L.popup({
          className: "leaflet-brutalist-popup",
        }).setContent(
          `<div style="font-family:monospace;font-size:11px;line-height:1.6;text-transform:uppercase;letter-spacing:0.04em;"><b>${escapeHtml(m.name)}</b><br/>IN: ${escapeHtml(m.time)}${addrSnippet}</div>`
        );
        L.marker([m.lat, m.lng], { icon }).addTo(map).bindPopup(popup);
      });

      if (markers.length > 1) {
        const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng]));
        map.fitBounds(bounds, { padding: [32, 32] });
      }
    });

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [markers]);

  if (markers.length === 0) {
    return (
      <div className={`bevel-sunken flex items-center justify-center ${className}`} style={{ minHeight: 200 }}>
        <p className="eyebrow text-muted">NO GPS LOCATIONS TODAY</p>
      </div>
    );
  }

  return (
    <div className={`bevel hard-shadow overflow-hidden ${className}`} style={{ minHeight: 320 }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%", minHeight: 320 }} />
    </div>
  );
}
