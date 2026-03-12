import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { auth } from '../config/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const register = useCallback(async (email, password) => {
    setError(null);
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const token = await cred.user.getIdToken();
    localStorage.setItem('authToken', token);
    return cred.user;
  }, []);

  const login = useCallback(async (email, password) => {
    setError(null);
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const token = await cred.user.getIdToken();
    localStorage.setItem('authToken', token);
    return cred.user;
  }, []);

  const logout = useCallback(async () => {
    setError(null);
    localStorage.removeItem('authToken');
    await signOut(auth);
  }, []);

  useEffect(() => {
  const unsub = onAuthStateChanged(auth, async (user) => {
    setCurrentUser(user);
    if (user) {
      const token = await user.getIdToken();
      localStorage.setItem('authToken', token);
    } else {
      localStorage.removeItem('authToken');
    }
    setLoading(false);
  });
  return unsub;
}, []);

  const value = useMemo(
    () => ({ currentUser, loading, error, setError, register, login, logout }),
    [currentUser, loading, error, register, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};