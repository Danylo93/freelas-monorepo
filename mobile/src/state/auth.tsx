import React, { createContext, useContext, useState } from "react";
type Role = "client"|"provider";
type Auth = { token:string|null; role:Role|null; userId:string|null; setAuth:(a:Partial<Auth>)=>void; logout:()=>void };
const Ctx = createContext<Auth>({ token:null, role:null, userId:null, setAuth:()=>{}, logout:()=>{} });
export function AuthProvider({children}:{children:React.ReactNode}) {
  const [auth, set] = useState<Auth>({ token:null, role:null, userId:null, setAuth:()=>{}, logout:()=>{} });
  const setAuth = (a:Partial<Auth>) => set(prev => ({ ...prev, ...a, setAuth, logout }));
  const logout = () => set({ token:null, role:null, userId:null, setAuth, logout });
  return <Ctx.Provider value={{...auth, setAuth, logout}}>{children}</Ctx.Provider>;
}
export const useAuth = ()=>useContext(Ctx);
