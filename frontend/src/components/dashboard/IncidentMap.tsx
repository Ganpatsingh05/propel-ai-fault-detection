"use client";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Incident } from "@/types";
import { useEffect } from "react";

const COLORS: Record<string, string> = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#3b82f6" };

function makeIcon(severity: string) {
  const color = COLORS[severity] || COLORS.medium;
  return L.divIcon({
    className: "",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    html: `<div style="width:24px;height:24px;border-radius:50%;background:${color};border:2px solid ${color}44;box-shadow:0 0 12px ${color}88;display:flex;align-items:center;justify-content:center"><div style="width:8px;height:8px;border-radius:50%;background:white;opacity:0.9"></div></div>`,
  });
}

function FitBounds({ incidents }: { incidents: Incident[] }) {
  const map = useMap();
  useEffect(() => {
    const pts = incidents.filter(i => i.location.latitude && i.location.longitude).map(i => [i.location.latitude!, i.location.longitude!] as [number, number]);
    if (pts.length > 0) map.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 16 });
  }, [incidents, map]);
  return null;
}

interface Props { incidents: Incident[]; onSelect: (i: Incident) => void }

export default function IncidentMap({ incidents, onSelect }: Props) {
  const mapped = incidents.filter(i => i.location.latitude && i.location.longitude);
  const center: [number, number] = mapped.length > 0
    ? [mapped[0].location.latitude!, mapped[0].location.longitude!]
    : [12.97, 77.75];

  return (
    <MapContainer center={center} zoom={14} style={{ height: "100%", width: "100%" }} zoomControl={false}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>' />
      <FitBounds incidents={mapped} />
      {mapped.map((inc) => (
        <Marker key={inc.id} position={[inc.location.latitude!, inc.location.longitude!]}
          icon={makeIcon(inc.ticket?.priority || inc.severity)}
          eventHandlers={{ click: () => onSelect(inc) }}
        >
          <Popup>
            <div style={{ fontFamily: "Inter, sans-serif", minWidth: 180 }}>
              <p style={{ fontWeight: 600, fontSize: 13, margin: 0 }}>{inc.title}</p>
              <p style={{ fontSize: 11, color: "#999", marginTop: 4 }}>{inc.location.transformerCode} • {inc.faultType.replace("_", " ")}</p>
              <p style={{ fontSize: 11, color: "#bbb", marginTop: 4 }}>Confidence: {(inc.confidence * 100).toFixed(0)}%</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
