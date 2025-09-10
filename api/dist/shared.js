export const Topics = {
    ServiceRequested: 'service.requested',
    ServiceOffer: 'service.offer',
    ServiceAccepted: 'service.accepted',
};
// util simples para distância e estimativas
export function haversineKm(aLat, aLng, bLat, bLng) {
    const R = 6371;
    const toRad = (d) => d * Math.PI / 180;
    const dLat = toRad(bLat - aLat);
    const dLng = toRad(bLng - aLng);
    const A = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(A));
}
export const etaMin = (km, avg = 25) => Math.max(1, Math.round((km / avg) * 60));
export const price = (km, min) => Math.round((12 + km * 2.5 + min * 0.5) * 100) / 100;
