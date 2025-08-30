"use client";
import { MapContainer, TileLayer, Marker, Polyline, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export default function Map({
  client,
  provider,
}: {
  client: { lat: number; lng: number };
  provider?: { lat: number; lng: number };
}) {
  if (typeof window === "undefined") return null; // guarda extra

  return (
    <MapContainer center={[client.lat, client.lng]} zoom={13} style={{ height: "100%", width: "100%" }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Marker position={[client.lat, client.lng]}>
        <Popup>Cliente</Popup>
      </Marker>
      {provider && (
        <>
          <Marker position={[provider.lat, provider.lng]}>
            <Popup>Prestador</Popup>
          </Marker>
          <Polyline positions={[[client.lat, client.lng], [provider.lat, provider.lng]]} />
        </>
      )}
    </MapContainer>
  );
}
