"use client";
import React, { useEffect, useState } from "react";
import { GoogleMap, Marker, DirectionsRenderer, useJsApiLoader } from "@react-google-maps/api";

export default function Map({
  client,
  provider,
}: {
  client: { lat: number; lng: number };
  provider?: { lat: number; lng: number };
}) {
  const { isLoaded } = useJsApiLoader({
    id: "google-map",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
  });
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);

  useEffect(() => {
    if (!isLoaded || !provider) return;
    const service = new google.maps.DirectionsService();
    service.route(
      { origin: client, destination: provider, travelMode: google.maps.TravelMode.DRIVING },
      (res, status) => {
        if (status === google.maps.DirectionsStatus.OK && res) {
          setDirections(res);
        }
      }
    );
  }, [isLoaded, client, provider]);

  if (!isLoaded) return <p>Mapa não disponível</p>;

  const eta = directions?.routes?.[0]?.legs?.[0]?.duration?.text;

  return (
    <GoogleMap mapContainerStyle={{ height: "100%", width: "100%" }} center={client} zoom={13}>
      <Marker position={client} label="C" />
      {provider && <Marker position={provider} label="P" />}
      {directions && <DirectionsRenderer directions={directions} options={{ suppressMarkers: true }} />}
      {eta && (
        <div
          style={{
            position: "absolute",
            bottom: 8,
            left: 8,
            background: "#fff",
            padding: "4px 8px",
            borderRadius: 4,
            boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
          }}
        >
          Chegada {eta}
        </div>
      )}
    </GoogleMap>
  );
}

