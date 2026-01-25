import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(sessionStorage.getItem("access_token"));
  const [refreshTokenValue, setRefreshTokenValue] = useState<string | null>(sessionStorage.getItem("refresh_token"));

  // Refresh access token using refresh token
  const refreshToken = useCallback(async (): Promise<boolean> => {
    const refresh = sessionStorage.getItem("refresh_token");
    if (!refresh) return false;

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
        return true;
      } else {
        // Refresh token is invalid, logout
        logout();
        return false;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      logout();
      return false;
    }
  }, []);

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
    setRefreshTokenValue(refreshTokenStr);
    setUser({ username: "User" });
  };

  const logout = () => {
    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("refresh_token");
    setToken(null);
    setRefreshTokenValue(null);
    setUser(null);
    window.location.href = '/login';
  };

  // Add an interceptor-like effect to check for 401s and auto-refresh
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
        const response = await originalFetch(...args);
        
        // If 401 and we have a refresh token, try to refresh
        if (response.status === 401 && refreshTokenValue) {
            const refreshed = await refreshToken();
            if (refreshed) {
                // Retry the original request with new token
                const [url, options] = args;
                const newOptions = {
                    ...options,
                    headers: {
                        ...(options as RequestInit)?.headers,
                        'Authorization': `Bearer ${sessionStorage.getItem("access_token")}`
                    }
                };
                return originalFetch(url, newOptions);
            }
        }
        
        return response;
    };
    return () => { window.fetch = originalFetch; };
  }, [refreshTokenValue, refreshToken]);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token, refreshToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
