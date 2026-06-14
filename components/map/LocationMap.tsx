"use client";

import { MapContainer, TileLayer, Marker, Polyline, useMapEvents, useMap } from "react-leaflet";
import { useEffect } from "react";
import L from "leaflet";
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

function Recenter({ value, vendorPos }: { value: Pos | null, vendorPos?: Pos | null }) {
  const map = useMap();
  useEffect(() => {
    if (value && vendorPos) {
      const bounds = L.latLngBounds(
        [value.lat, value.lng],
        [vendorPos.lat, vendorPos.lng]
      );
      map.fitBounds(bounds, { padding: [50, 50], duration: 1 });
    } else if (value) {
      map.flyTo([value.lat, value.lng], 15, { duration: 1 });
    } else if (vendorPos) {
      map.flyTo([vendorPos.lat, vendorPos.lng], 15, { duration: 1 });
    }
  }, [value, vendorPos, map]);
  return null;
}

export default function LocationMap({
  value,
  vendorPos,
  onPick,
  height = 320,
}: {
  value: Pos | null;
  vendorPos?: Pos | null;
  onPick?: (p: Pos) => void;
  height?: number;
}) {
  const center: [number, number] = value ? [value.lat, value.lng] : (vendorPos ? [vendorPos.lat, vendorPos.lng] : [28.4744, 77.504]);
  return (
    <MapContainer center={center} zoom={11} style={{ height, width: "100%", borderRadius: 12, zIndex: 0 }}>
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {onPick && <ClickHandler onPick={onPick} />}
      <Recenter value={value} vendorPos={vendorPos} />
      
      {/* Buyer Marker */}
      {value && <Marker position={[value.lat, value.lng]} />}
      
      {/* Vendor Marker */}
      {vendorPos && <Marker position={[vendorPos.lat, vendorPos.lng]} opacity={0.8} />}

      {/* Path between Buyer and Vendor */}
      {value && vendorPos && (
        <Polyline 
          positions={[[value.lat, value.lng], [vendorPos.lat, vendorPos.lng]]} 
          color="#c2410c" 
          weight={4} 
          dashArray="10, 10" 
          opacity={0.7} 
        />
      )}
    </MapContainer>
  );
}