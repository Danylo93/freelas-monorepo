"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import io from "socket.io-client";

const Map = dynamic(() => import("../src/Map"), { ssr: false });

export default function Page() {
  const [pos, setPos] = useState({ lat: -23.5447, lng: -46.4731 });
  const [bairro, setBairro] = useState("Vila Carmosina");
  const [offers, setOffers] = useState<any[]>([]);
  const sock = useRef<any>();

  useEffect(() => {
    sock.current = io("http://localhost:3001");
    return () => sock.current?.disconnect();
  }, []);

  const request = async () => {
    setOffers([]);
    const r = await fetch("http://localhost:3001/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: "web-demo",
        serviceType: "plumber",
        lat: pos.lat,
        lng: pos.lng,
        bairro,
      }),
    }).then((r) => r.json());
    sock.current.emit("join", `request:${r.requestId}`);
    sock.current.on("offer", (o: any) => setOffers((p) => [o, ...p]));
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", height: "100vh" }}>
      <div style={{ padding: 16, overflow: "auto" }}>
        <h2>Solicitar Serviço</h2>
        <div>Lat: <input type="number" value={pos.lat} onChange={e=>setPos(p=>({...p,lat:parseFloat(e.target.value)}))}/></div>
        <div>Lng: <input type="number" value={pos.lng} onChange={e=>setPos(p=>({...p,lng:parseFloat(e.target.value)}))}/></div>
        <div>Bairro: <input value={bairro} onChange={e=>setBairro(e.target.value)} /></div>
        <button onClick={request} style={{ marginTop: 8 }}>Pedir encanador</button>
        <h3>Ofertas</h3>
        {offers.map((o) => (
          <div key={o.offerId} style={{ border: "1px solid #ddd", padding: 8, marginBottom: 8 }}>
            <div>Provider: {o.providerId}</div>
            <div>Distância: {o.distanceKm} km | ETA: {o.etaMin} min | Preço: R$ {o.priceEstimate}</div>
            <button
              onClick={() =>
                fetch(`http://localhost:3001/requests/${o.requestId}/accept`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ providerId: o.providerId }),
                })
              }
            >
              Aceitar
            </button>
          </div>
        ))}
      </div>

      <div><Map client={pos} /></div>
    </div>
  );
}
