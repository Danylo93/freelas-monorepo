export type ServiceType = 'plumber' | 'electrician' | 'carpenter' | 'general';
export interface ServiceRequest { requestId:string; clientId:string; serviceType:ServiceType; lat:number; lng:number; bairro?:string; details?:string; createdAt:string; }
export interface ServiceOffer { offerId:string; requestId:string; providerId:string; distanceKm:number; etaMin:number; priceEstimate:number; expiresAt:string; }
export const Topics = { ServiceRequested:'service.requested', ServiceOffer:'service.offer', ServiceAccepted:'service.accepted' } as const;

export function haversineKm(aLat:number,aLng:number,bLat:number,bLng:number){const r=(x:number)=>x*Math.PI/180,R=6371;const dLat=r(bLat-aLat),dLng=r(bLng-aLng);const A=Math.sin(dLat/2)**2+Math.cos(r(aLat))*Math.cos(r(bLat))*Math.sin(dLng/2)**2;return 2*R*Math.asin(Math.sqrt(A));}
export const etaMin = (km:number, avg=25)=>Math.max(1, Math.round((km/avg)*60));
export const price = (km:number, min:number)=>Math.round((12 + km*2.5 + min*0.5)*100)/100;

