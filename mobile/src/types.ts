export type ServiceType = "plumber" | "electrician" | "carpenter" | "general";

export type ServiceRequest = {
  requestId: string;
  clientId: string;
  serviceType: ServiceType;
  lat: number;
  lng: number;
  bairro?: string;
  details?: string;
  createdAt: string;
};

export type ServiceOffer = {
  offerId: string;
  requestId: string;
  providerId: string;
  distanceKm: number;
  etaMin: number;
  priceEstimate: number;
  expiresAt: string;
};

export type ServiceAccepted = {
  requestId: string;
  offerId: string;
  providerId: string;
  acceptedAt: string;
};
