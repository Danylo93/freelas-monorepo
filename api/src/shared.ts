// src/shared.ts
export type ServiceType = 'plumber' | 'electrician' | 'carpenter' | 'general';

export interface ServiceRequest {
  requestId: string;
  clientId: string;
  serviceType: ServiceType;
  lat: number;
  lng: number;
  bairro?: string;
  details?: string;
  createdAt: string;
}

export interface ServiceOffer {
  offerId: string;
  requestId: string;
  providerId: string;
  distanceKm: number;
  etaMin: number;
  priceEstimate: number;
  expiresAt: string;
}

export type ServiceAccepted = {
  requestId: string;
  offerId: string;
  providerId: string;
  acceptedAt: string;
};

export const Topics = {
  ServiceRequested: 'service.requested',
  ServiceOffer: 'service.offer',
  ServiceAccepted: 'service.accepted',
} as const;

// util simples para distância e estimativas
export function haversineKm(aLat:number,aLng:number,bLat:number,bLng:number){
  const R=6371; const toRad=(d:number)=>d*Math.PI/180;
  const dLat=toRad(bLat-aLat); const dLng=toRad(bLng-aLng);
  const A = Math.sin(dLat/2)**2 + Math.cos(toRad(aLat))*Math.cos(toRad(bLat))*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.sqrt(A));
}
export const etaMin = (km:number, avg=25)=>Math.max(1, Math.round((km/avg)*60));
export const price = (km:number, min:number)=>Math.round((12 + km*2.5 + min*0.5)*100)/100;
