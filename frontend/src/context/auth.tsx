import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

interface User {
  username: string;
  email?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, refresh: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  refreshToken: () => Promise<boolean>;
  apiFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(sessionStorage.getItem("access_token"));
  const navigate = useNavigate();

  // Logout function
  const logout = useCallback(() => {
    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("refresh_token");
    setToken(null);
    setUser(null);
    navigate('/login');
  }, [navigate]);

  // Refresh access token using refresh token
  const refreshToken = useCallback(async (): Promise<boolean> => {
    const refresh = sessionStorage.getItem("refresh_token");
    if (!refresh) {
        logout();
        return false;
    }

    try {
      const response = await fetch(`${API_URL}/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh })
      });

      if (response.ok) {
        const data = await response.json();
        sessionStorage.setItem("access_token", data.access);
        setToken(data.access);
        // If the backend rotates refresh tokens, update it here
        if (data.refresh) {
            sessionStorage.setItem("refresh_token", data.refresh);
        }
        return true;
      } else {
        logout();
        return false;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      logout();
      return false;
    }
  }, [logout]);

  // Custom fetch wrapper that handles auth headers and token refresh
  const apiFetch = useCallback(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const currentToken = sessionStorage.getItem("access_token");
    const headers = new Headers(init?.headers);
    
    if (currentToken) {
        headers.set('Authorization', `Bearer ${currentToken}`);
    }

    const config = { ...init, headers };
    
    // First attempt
    let response = await fetch(input, config);

    // If unauthorized, try to refresh and retry
    if (response.status === 401) {
        const refreshed = await refreshToken();
        if (refreshed) {
             const newToken = sessionStorage.getItem("access_token");
             headers.set('Authorization', `Bearer ${newToken}`);
             response = await fetch(input, { ...init, headers });
        }
    }
    return response;
  }, [refreshToken]);

  useEffect(() => {
    // Determine initial auth state
    const storedToken = sessionStorage.getItem("access_token");
    if (storedToken) {
      setToken(storedToken);
      setUser({ username: "User" }); 
    }

    // Set up token refresh interval (every 4 minutes, tokens expire in 5 minutes)
    const refreshInterval = setInterval(() => {
      if (sessionStorage.getItem("refresh_token")) {
        refreshToken();
      }
    }, 4 * 60 * 1000); // 4 minutes

    return () => clearInterval(refreshInterval);
  }, [refreshToken]);

  const login = (accessToken: string, refreshTokenStr: string) => {
    sessionStorage.setItem("access_token", accessToken);
    sessionStorage.setItem("refresh_token", refreshTokenStr);
    setToken(accessToken);
    setUser({ username: "User" });
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token, refreshToken, apiFetch }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
