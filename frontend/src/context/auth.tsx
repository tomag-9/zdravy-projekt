import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "/api";
const CACHED_PROFILE_KEY = "cached_user_profile";

interface UserProfile {
  company_name: string;
  ico?: string;
  dic?: string;
  registration_status: string;
  email_verified: boolean;
  registration_date: string;
}

interface User {
  email: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  onboarding_completed?: boolean;
  groups?: string[];
  is_staff?: boolean;
  settings?: UserSettings;
  profile?: UserProfile;
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
  updateProfile: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function isNetworkFetchError(error: unknown): boolean {
  return error instanceof TypeError && error.message === "Failed to fetch";
}

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

function loadCachedProfile(): User | null {
  try {
    const raw = localStorage.getItem(CACHED_PROFILE_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const storedToken = localStorage.getItem("access_token");
  const cachedProfile = storedToken ? loadCachedProfile() : null;

  const [user, setUser] = useState<User | null>(cachedProfile);
  const [token, setToken] = useState<string | null>(storedToken);
  // Show loading only when there's a token but no cached profile yet
  const [isLoading, setIsLoading] = useState<boolean>(
    !!storedToken && !cachedProfile,
  );
  const navigate = useNavigate();

  // Logout function
  const logout = useCallback(() => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem(CACHED_PROFILE_KEY);
    // Legacy: also clear sessionStorage in case old sessions stored tokens there
    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("refresh_token");
    // Clear per-user order data so next user starts fresh
    clearOrderLocalStorage();
    setToken(null);
    setUser(null);
    navigate("/login");
  }, [navigate]);

  // Refresh access token using refresh token
  const refreshToken = useCallback(async (): Promise<boolean> => {
    const refresh = localStorage.getItem("refresh_token");
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
        localStorage.setItem("access_token", data.access);
        setToken(data.access);
        // If the backend rotates refresh tokens, update it here
        if (data.refresh) {
          localStorage.setItem("refresh_token", data.refresh);
        }
        return true;
      } else if (response.status === 401 || response.status === 403) {
        // Server explicitly rejected the refresh token — session is truly invalid,
        // log the user out.
        logout();
        return false;
      } else {
        // Transient server error (e.g. 500/502). Do NOT log the user out so the
        // app can retry later without destroying a valid session.
        console.warn("Token refresh failed with non-auth status:", response.status);
        return false;
      }
    } catch (error) {
      // Network error (e.g. phone just woke up and connection isn't ready yet).
      // Do NOT log the user out — the refresh token is still valid. The next
      // API call will retry the refresh once the network is available.
      if (!isNetworkFetchError(error)) {
        console.error("Token refresh failed with unexpected error:", error);
      }
      return false;
    }
  }, [logout]);

  // Custom fetch wrapper that handles auth headers and token refresh
  const apiFetch = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const currentToken = localStorage.getItem("access_token");
      const headers = new Headers(init?.headers);

      if (currentToken) {
        headers.set("Authorization", `Bearer ${currentToken}`);
      }

      // Prevent browser from caching API responses. Note: this cache option does not affect CORS preflight.
      const config = { ...init, headers, cache: "no-store" as RequestCache };

      // First attempt
      let response = await fetch(input, config);

      const syncServerTimeOffset = (res: Response) => {
        const serverDate = res.headers.get("Date");
        if (!serverDate) return;
        const serverMs = Date.parse(serverDate);
        if (Number.isNaN(serverMs)) return;
        // Keep in sessionStorage — OrderService reads it from there
        sessionStorage.setItem(
          "server_time_offset_ms",
          String(serverMs - Date.now()),
        );
      };

      syncServerTimeOffset(response);

      // If unauthorized, try to refresh and retry
      if (response.status === 401) {
        const refreshed = await refreshToken();
        if (refreshed) {
          const newToken = localStorage.getItem("access_token");
          headers.set("Authorization", `Bearer ${newToken}`);
          response = await fetch(input, {
            ...init,
            headers,
            cache: "no-store" as RequestCache,
          });
          syncServerTimeOffset(response);
        }
      } else if (response.status === 403) {
        // Forbidden — may be caused by an expired JWT that the backend returns as 403.
        // Attempt a token refresh and retry. If the refresh or the retried request still
        // results in 403/failure, treat it as an invalid session and redirect to login.
        const refreshed = await refreshToken();
        if (refreshed) {
          const newToken = localStorage.getItem("access_token");
          headers.set("Authorization", `Bearer ${newToken}`);
          const retried = await fetch(input, {
            ...init,
            headers,
            cache: "no-store" as RequestCache,
          });
          syncServerTimeOffset(retried);
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
        localStorage.setItem(CACHED_PROFILE_KEY, JSON.stringify(userData));
        setUser(userData);
        return userData;
      }
      return null;
    } catch (e) {
      if (!isNetworkFetchError(e)) {
        console.error("Failed to fetch user profile", e);
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    // Determine initial auth state
    const existingToken = localStorage.getItem("access_token");
    if (existingToken) {
      setToken(existingToken);
      fetchUserProfile();
    }

    // Set up token refresh interval (every 14 minutes, access tokens expire in 30 minutes)
    const refreshInterval = setInterval(
      () => {
        if (localStorage.getItem("refresh_token")) {
          refreshToken();
        }
      },
      14 * 60 * 1000,
    ); // 14 minutes

    // When the PWA returns to the foreground after being backgrounded, mobile
    // browsers throttle/pause setInterval so the token may be stale. Refresh
    // proactively on visibility restore so the first user action doesn't block.
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "visible" &&
        localStorage.getItem("refresh_token")
      ) {
        refreshToken();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(refreshInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshToken, fetchUserProfile]);

  const updateProfile = useCallback((updates: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      localStorage.setItem(CACHED_PROFILE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const login = async (
    accessToken: string,
    refreshTokenStr: string,
  ): Promise<User | null> => {
    // Wipe previous user's local order data and cached profile before loading new user
    clearOrderLocalStorage();
    localStorage.removeItem(CACHED_PROFILE_KEY);
    localStorage.setItem("access_token", accessToken);
    localStorage.setItem("refresh_token", refreshTokenStr);
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
        updateProfile,
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
