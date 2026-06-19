"use client";

import { MapContainer, TileLayer, Marker, Polyline, useMapEvents, useMap, Circle } from"react-leaflet";
import { useEffect } from"react";
import L from"leaflet";
import"leaflet/dist/leaflet.css";
import"leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import"leaflet-defaulticon-compatibility";

type Pos = { lat: number; lng: number };

function ClickHandler({ onPick }: { onPick: (p: Pos) => void }) {
  useMapEvents({
    click(e) { onPick({ lat: e.latlng.lat, lng: e.latlng.lng }); },
  });
  return null;
}

function Recenter({ value, vendorPos, radius }: { value: Pos | null, vendorPos?: Pos | null, radius?: number }) {
  const map = useMap();
  useEffect(() => {
    if (value && vendorPos) {
      const bounds = L.latLngBounds(
        [value.lat, value.lng],
        [vendorPos.lat, vendorPos.lng]
      );
      map.fitBounds(bounds, { padding: [50, 50], duration: 1 });
    } else if (value) {
      // If radius is set, adjust zoom accordingly
      const zoom = radius && radius > 50 ? 9 : radius && radius > 20 ? 11 : 13;
      map.flyTo([value.lat, value.lng], zoom, { duration: 1 });
    } else if (vendorPos) {
      map.flyTo([vendorPos.lat, vendorPos.lng], 13, { duration: 1 });
    }
  }, [value, vendorPos, radius, map]);
  return null;
}

export default function LocationMap({
  value,
  vendorPos,
  onPick,
  height = 320,
  radius,
}: {
  value: Pos | null;
  vendorPos?: Pos | null;
  onPick?: (p: Pos) => void;
  height?: number;
  radius?: number;
}) {
  const center: [number, number] = value ? [value.lat, value.lng] : (vendorPos ? [vendorPos.lat, vendorPos.lng] : [28.4744, 77.504]);
  return (
    <MapContainer center={center} zoom={11} style={{ height, width:"100%", borderRadius: 12, zIndex: 0 }}>
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {onPick && <ClickHandler onPick={onPick} />}
      <Recenter value={value} vendorPos={vendorPos} radius={radius} />
      
      {/* Buyer/Main Marker */}
      {value && <Marker position={[value.lat, value.lng]} />}
      
      {/* Service Area Circle Overlay */}
      {value && radius && (
        <Circle
          center={[value.lat, value.lng]}
          radius={radius * 1000} // convert km to meters
          pathOptions={{
            color:"#E8A838",
            fillColor:"#E8A838",
            fillOpacity: 0.1,
            weight: 1.5,
            dashArray:"4 4"
          }}
        />
      )}
      
      {/* Vendor Marker */}
      {vendorPos && <Marker position={[vendorPos.lat, vendorPos.lng]} opacity={0.8} />}

      {/* Path between Buyer and Vendor */}
      {value && vendorPos && (
        <Polyline 
          positions={[[value.lat, value.lng], [vendorPos.lat, vendorPos.lng]]} 
          color="#0F1E3C" 
          weight={3} 
          dashArray="6, 6" 
          opacity={0.6} 
        />
      )}
    </MapContainer>
  );
}