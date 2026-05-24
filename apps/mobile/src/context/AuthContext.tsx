import React, { createContext, useContext } from 'react';

type AuthContextValue = {
  login: () => void;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextValue>({
  login: () => {},
  logout: () => {},
});

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
