export const Topics = { ServiceRequested: 'service.requested', ServiceOffer: 'service.offer', ServiceAccepted: 'service.accepted' };
export function haversineKm(aLat, aLng, bLat, bLng) { const r = (x) => x * Math.PI / 180, R = 6371; const dLat = r(bLat - aLat), dLng = r(bLng - aLng); const A = Math.sin(dLat / 2) ** 2 + Math.cos(r(aLat)) * Math.cos(r(bLat)) * Math.sin(dLng / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(A)); }
export const etaMin = (km, avg = 25) => Math.max(1, Math.round((km / avg) * 60));
export const price = (km, min) => Math.round((12 + km * 2.5 + min * 0.5) * 100) / 100;
