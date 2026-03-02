import { createContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('zacess_token'));
    const [loading, setLoading] = useState(true);

    const loadUser = useCallback(async () => {
        if (!token) {
            setLoading(false);
            return;
        }
        try {
            const res = await api.get('/auth/me');
            setUser(res.data.data.user);
        } catch (err) {
            logout();
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        loadUser();
    }, [loadUser]);

    const login = async (email, password) => {
        const res = await api.post('/auth/login', { email, password });
        const { user: userData, token: newToken } = res.data.data;
        localStorage.setItem('zacess_token', newToken);
        localStorage.setItem('zacess_user', JSON.stringify(userData));
        setToken(newToken);
        setUser(userData);
        return res.data;
    };

    const register = async (name, email, password) => {
        const res = await api.post('/auth/register', { name, email, password, role: 'admin' });
        const { user: userData, token: newToken } = res.data.data;
        localStorage.setItem('zacess_token', newToken);
        localStorage.setItem('zacess_user', JSON.stringify(userData));
        setToken(newToken);
        setUser(userData);
        return res.data;
    };

    const logout = () => {
        localStorage.removeItem('zacess_token');
        localStorage.removeItem('zacess_user');
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}
