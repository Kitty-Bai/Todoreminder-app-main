import React, { createContext, useContext, useEffect, useState } from 'react';
import AuthService from './AuthService';

const AuthContext = createContext({
  user: null,
  isLoading: true,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('Setting up auth state listener in AuthContext');
    const unsubscribe = AuthService.onAuthStateChanged((user) => {
      console.log('Auth state changed in AuthContext:', user ? user.uid : 'none');
      setUser(user);
      setIsLoading(false);
    });

    return () => {
      console.log('Cleaning up auth state listener in AuthContext');
      unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}; 