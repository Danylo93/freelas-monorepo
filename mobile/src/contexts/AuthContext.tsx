import React, { createContext, useContext, useState } from 'react';

type Role = 'client' | 'provider';

type AuthContextType = {
  role: Role | null;
  userId: string | null;
  login: (role: Role, id: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType>({
  role: null,
  userId: null,
  login: () => {},
  logout: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<Role | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const login = (r: Role, id: string) => {
    setRole(r);
    setUserId(id);
  };

  const logout = () => {
    setRole(null);
    setUserId(null);
  };

  return (
    <AuthContext.Provider value={{ role, userId, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

