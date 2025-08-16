export type ServiceType = 'plumber' | 'electrician' | 'carpenter' | 'general';
export interface ServiceRequest { requestId:string; clientId:string; serviceType:ServiceType; lat:number; lng:number; bairro?:string; details?:string; createdAt:string; }
export interface ServiceOffer { offerId:string; requestId:string; providerId:string; distanceKm:number; etaMin:number; priceEstimate:number; expiresAt:string; }
export const Topics = { ServiceRequested:'service.requested', ServiceOffer:'service.offer', ServiceAccepted:'service.accepted' } as const;
