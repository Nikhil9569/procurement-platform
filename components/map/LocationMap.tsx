"use client";

import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import { useEffect } from "react";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import "leaflet-defaulticon-compatibility";

type Pos = { lat: number; lng: number };

function ClickHandler({ onPick }: { onPick: (p: Pos) => void }) {
  useMapEvents({
    click(e) { onPick({ lat: e.latlng.lat, lng: e.latlng.lng }); },
  });
  return null;
}

function Recenter({ value }: { value: Pos | null }) {
  const map = useMap();
  useEffect(() => {
    if (value) map.flyTo([value.lat, value.lng], 15, { duration: 1 });
  }, [value, map]);
  return null;
}

export default function LocationMap({
  value,
  onPick,
  height = 320,
}: {
  value: Pos | null;
  onPick: (p: Pos) => void;
  height?: number;
}) {
  const center: [number, number] = value ? [value.lat, value.lng] : [28.4744, 77.504];
  return (
    <MapContainer center={center} zoom={11} style={{ height, width: "100%", borderRadius: 12, zIndex: 0 }}>
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler onPick={onPick} />
      <Recenter value={value} />
      {value && <Marker position={[value.lat, value.lng]} />}
    </MapContainer>
  );
}