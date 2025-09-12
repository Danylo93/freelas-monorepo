import React, { createContext, useContext, useState } from "react";
import type { ServiceType } from "../types";

export type RequestItem = {
  id: string;
  serviceType: ServiceType;
  status: "pending" | "accepted" | "completed";
};

type RequestsContextType = {
  requests: RequestItem[];
  addRequest: (id: string, serviceType: ServiceType) => void;
  markAccepted: (id: string) => void;
  completeRequest: (id: string) => void;
};

const RequestsContext = createContext<RequestsContextType>({
  requests: [],
  addRequest: () => {},
  markAccepted: () => {},
  completeRequest: () => {},
});

export const RequestsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [requests, setRequests] = useState<RequestItem[]>([]);

  const addRequest = (id: string, serviceType: ServiceType) => {
    setRequests(prev => [...prev, { id, serviceType, status: "pending" }]);
  };

  const markAccepted = (id: string) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: "accepted" } : r));
  };

  const completeRequest = (id: string) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: "completed" } : r));
  };

  return (
    <RequestsContext.Provider value={{ requests, addRequest, markAccepted, completeRequest }}>
      {children}
    </RequestsContext.Provider>
  );
};

export const useRequests = () => useContext(RequestsContext);

