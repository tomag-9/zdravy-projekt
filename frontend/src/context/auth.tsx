import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "/api";

interface User {
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  groups?: string[];
  is_staff?: boolean;
  settings?: UserSettings;
}

export interface UserSettings {
  visible_menus?: string[];
  visible_meals?: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  visible_diets?: any[];
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, refresh: string) => Promise<User | null>;
  logout: () => void;
  isAuthenticated: boolean;
  refreshToken: () => Promise<boolean>;
  apiFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  fetchUserProfile: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Remove all per-user order data from localStorage so a newly logged-in
 *  user never sees data that belonged to the previous session. */
function clearOrderLocalStorage() {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (
      key &&
      (key.startsWith("order_") ||
        key.startsWith("activeMeals_") ||
        key === "enabledCategories" ||
        key === "appSettings")
    ) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k));
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(
    sessionStorage.getItem("access_token"),
  );
  // True while the initial profile fetch is in-flight (prevents route flicker)
  const [isLoading, setIsLoading] = useState<boolean>(
    !!sessionStorage.getItem("access_token"),
  );
  const navigate = useNavigate();

  // Logout function
  const logout = useCallback(() => {
    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("refresh_token");
    // Also clear localStorage in case anything was stored there
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    // Clear per-user order data so next user starts fresh
    clearOrderLocalStorage();
    setToken(null);
    setUser(null);
    navigate("/login");
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
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
      console.error("Token refresh failed:", error);
      logout();
      return false;
    }
  }, [logout]);

  // Custom fetch wrapper that handles auth headers and token refresh
  const apiFetch = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const currentToken = sessionStorage.getItem("access_token");
      const headers = new Headers(init?.headers);

      if (currentToken) {
        headers.set("Authorization", `Bearer ${currentToken}`);
      }

      // Prevent browser from caching API responses. Note: this cache option does not affect CORS preflight.
      const config = { ...init, headers, cache: "no-store" as RequestCache };

      // First attempt
      let response = await fetch(input, config);

      // If unauthorized, try to refresh and retry
      if (response.status === 401) {
        const refreshed = await refreshToken();
        if (refreshed) {
          const newToken = sessionStorage.getItem("access_token");
          headers.set("Authorization", `Bearer ${newToken}`);
          response = await fetch(input, {
            ...init,
            headers,
            cache: "no-store" as RequestCache,
          });
        }
      } else if (response.status === 403) {
        // Forbidden — may be caused by an expired JWT that the backend returns as 403.
        // Attempt a token refresh and retry. If the refresh or the retried request still
        // results in 403/failure, treat it as an invalid session and redirect to login.
        const refreshed = await refreshToken();
        if (refreshed) {
          const newToken = sessionStorage.getItem("access_token");
          headers.set("Authorization", `Bearer ${newToken}`);
          const retried = await fetch(input, {
            ...init,
            headers,
            cache: "no-store" as RequestCache,
          });
          if (retried.status === 403) {
            // Valid token but still forbidden → session/account issue, force logout.
            logout();
          }
          response = retried;
        }
        // If refresh failed, refreshToken() already called logout().
      }
      return response;
    },
    [logout, refreshToken],
  );

  const fetchUserProfile = useCallback(async (): Promise<User | null> => {
    try {
      const response = await apiFetch(`${API_URL}/user/profile/`);
      if (response.ok) {
        const userData: User = await response.json();
        setUser(userData);
        return userData;
      }
      return null;
    } catch (e) {
      console.error("Failed to fetch user profile", e);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    // Determine initial auth state
    const storedToken = sessionStorage.getItem("access_token");
    if (storedToken) {
      setToken(storedToken);
      fetchUserProfile();
    }

    // Set up token refresh interval (every 4 minutes, tokens expire in 5 minutes)
    const refreshInterval = setInterval(
      () => {
        if (sessionStorage.getItem("refresh_token")) {
          refreshToken();
        }
      },
      4 * 60 * 1000,
    ); // 4 minutes

    return () => clearInterval(refreshInterval);
  }, [refreshToken, fetchUserProfile]);

  const login = async (
    accessToken: string,
    refreshTokenStr: string,
  ): Promise<User | null> => {
    // Wipe previous user's local order data before loading the new user's profile
    clearOrderLocalStorage();
    sessionStorage.setItem("access_token", accessToken);
    sessionStorage.setItem("refresh_token", refreshTokenStr);
    setToken(accessToken);
    setIsLoading(true);
    // Await profile so callers can navigate based on role (e.g. is_staff)
    const userData = await fetchUserProfile();
    return userData;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        isAuthenticated: !!token,
        refreshToken,
        apiFetch,
        fetchUserProfile,
      }}
    >
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
