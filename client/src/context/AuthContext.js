import React, { createContext, useContext, useState } from 'react';
import { auth } from '../firebase'; // make sure to adjust the path for your firebase configuration

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);

    const register = async (email, password) => {
        return await auth.createUserWithEmailAndPassword(email, password);
    };

    const login = async (email, password) => {
        return await auth.signInWithEmailAndPassword(email, password);
    };

    const logout = async () => {
        return await auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ currentUser, register, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};
