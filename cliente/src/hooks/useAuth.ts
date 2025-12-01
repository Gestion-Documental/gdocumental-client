import { useState } from 'react';
import { User } from '../types';

export const useAuth = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const login = (user: User, authToken: string) => {
    setCurrentUser(user);
    setToken(authToken);
  };

  const logout = () => {
    setCurrentUser(null);
    setToken(null);
  };

  return { currentUser, token, login, logout };
};
