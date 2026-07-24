import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useNavigate } from "react-router-dom";
import { logger } from '../lib/logger';

const API_URL = import.meta.env.VITE_API_URL || "/api";
const CACHED_PROFILE_KEY = "cached_user_profile";
const REFRESH_LOCK_KEY = "auth_refresh_in_progress";
const REFRESH_LOCK_TIMEOUT_MS = 5000;

interface UserProfile {
  billing_name?: string;
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
  billing_name?: string;
  onboarding_completed?: boolean;
  groups?: string[];
  is_staff?: boolean;
  profile?: UserProfile;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (accessToken: string) => Promise<User | null>;
  logout: () => Promise<void>;
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function readRefreshLock(): number | null {
  const raw = localStorage.getItem(REFRESH_LOCK_KEY);
  if (!raw) return null;
  const timestamp = Number(raw);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function isRefreshLocked(): boolean {
  const timestamp = readRefreshLock();
  return timestamp !== null && Date.now() - timestamp < REFRESH_LOCK_TIMEOUT_MS;
}

async function waitForCrossTabRefresh(
  tokenBeforeRefresh: string | null,
): Promise<string | null> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < REFRESH_LOCK_TIMEOUT_MS) {
    const refreshedByAnotherTab = localStorage.getItem("access_token");
    if (
      refreshedByAnotherTab &&
      refreshedByAnotherTab !== tokenBeforeRefresh
    ) {
      return refreshedByAnotherTab;
    }

    if (!isRefreshLocked()) {
      return null;
    }

    await sleep(100);
  }

  return null;
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
  // Single in-flight refresh promise shared across all callers.
  // With ROTATE_REFRESH_TOKENS+BLACKLIST_AFTER_ROTATION, two concurrent refresh
  // calls using the same cookie cause the second to get 401 and trigger a spurious
  // logout.  Deduplicating here ensures only one network request is in-flight at a
  // time — any concurrent caller awaits the same promise instead of racing.
  const refreshInFlight = useRef<Promise<boolean> | null>(null);

  // Logout: blacklist the server-side refresh token cookie, then clear local state.
  const logout = useCallback(async () => {
    const currentToken = localStorage.getItem("access_token");
    if (currentToken) {
      try {
        await fetch(`${API_URL}/token/logout/`, {
          method: "POST",
          headers: { Authorization: `Bearer ${currentToken}` },
          credentials: "include",
        });
      } catch {
        // Network failure — proceed with local cleanup regardless
      }
    }

    localStorage.removeItem("access_token");
    localStorage.removeItem(CACHED_PROFILE_KEY);
    // Legacy: clear any old refresh tokens that may have been stored in prior versions
    localStorage.removeItem("refresh_token");
    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("refresh_token");
    clearOrderLocalStorage();
    setToken(null);
    setUser(null);
    navigate("/login");
  }, [navigate]);

  // Refresh access token using the httpOnly refresh cookie.
  // The browser sends the cookie automatically — no token in the request body.
  const refreshToken = useCallback(async (): Promise<boolean> => {
    // Return the in-flight promise if a refresh is already running so concurrent
    // callers (setInterval, visibilitychange, apiFetch 401) share one request.
    if (refreshInFlight.current) return refreshInFlight.current;

    const doRefresh = async (): Promise<boolean> => {
      const tokenBeforeRefresh = localStorage.getItem("access_token");

      if (isRefreshLocked()) {
        const refreshedByAnotherTab =
          await waitForCrossTabRefresh(tokenBeforeRefresh);
        if (refreshedByAnotherTab) {
          setToken(refreshedByAnotherTab);
          return true;
        }
      }

      localStorage.setItem(REFRESH_LOCK_KEY, String(Date.now()));

      try {
        const response = await fetch(`${API_URL}/token/refresh/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include", // sends the httpOnly refresh cookie
        });

        if (response.ok) {
          const data = await response.json();
          localStorage.setItem("access_token", data.access);
          setToken(data.access);
          return true;
        } else if (response.status === 401 || response.status === 403) {
          const refreshedByAnotherTab =
            await waitForCrossTabRefresh(tokenBeforeRefresh);
          if (refreshedByAnotherTab) {
            setToken(refreshedByAnotherTab);
            return true;
          }

          // Refresh cookie is invalid or blacklisted — session is truly over.
          await logout();
          return false;
        } else {
          // Transient server error (e.g. 500/502). Do NOT log the user out.
          logger.warn("Token refresh failed with non-auth status:", response.status);
          return false;
        }
      } catch (error) {
        // Network error — do NOT log the user out; the cookie is still valid.
        if (!isNetworkFetchError(error)) {
          logger.error("Token refresh failed with unexpected error:", error);
        }
        return false;
      } finally {
        localStorage.removeItem(REFRESH_LOCK_KEY);
        refreshInFlight.current = null;
      }
    };

    refreshInFlight.current = doRefresh();
    return refreshInFlight.current;
  }, [logout]);

  // Custom fetch wrapper that handles auth headers and token refresh
  const apiFetch = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const currentToken = localStorage.getItem("access_token");
      const headers = new Headers(init?.headers);

      if (currentToken) {
        headers.set("Authorization", `Bearer ${currentToken}`);
      }

      // Prevent browser from caching API responses.
      const config = { ...init, headers, cache: "no-store" as RequestCache };

      let response = await fetch(input, config);

      const syncServerTimeOffset = (res: Response) => {
        const serverDate = res.headers.get("Date");
        if (!serverDate) return;
        const serverMs = Date.parse(serverDate);
        if (Number.isNaN(serverMs)) return;
        sessionStorage.setItem(
          "server_time_offset_ms",
          String(serverMs - Date.now()),
        );
      };

      syncServerTimeOffset(response);

      // 401 = expired/missing access token → refresh and retry
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
      }
      // 403 = permission denial for a valid session — do NOT logout.
      // The API uses 401 for auth/token issues and 403 for authorization failures.

      return response;
    },
    [refreshToken],
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
      // 401 after apiFetch already attempted a refresh → session is truly gone.
      if (response.status === 401) {
        await logout();
      }
      return null;
    } catch (e) {
      if (!isNetworkFetchError(e)) {
        logger.error("Failed to fetch user profile", e);
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [apiFetch, logout]);

  useEffect(() => {
    const existingToken = localStorage.getItem("access_token");
    if (existingToken) {
      setToken(existingToken);
      fetchUserProfile();
    }

    // Proactively refresh the access token every 14 minutes (it expires in 30).
    const refreshInterval = setInterval(
      () => {
        if (localStorage.getItem("access_token")) {
          refreshToken();
        }
      },
      14 * 60 * 1000,
    );

    // On PWA foreground restore the access token may be stale — refresh immediately
    // so the first user action doesn't block on an expired token.
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "visible" &&
        localStorage.getItem("access_token")
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

  // login() accepts only the access token — the refresh token arrives as an
  // httpOnly cookie set by the server and is never visible to JavaScript.
  const login = async (accessToken: string): Promise<User | null> => {
    clearOrderLocalStorage();
    localStorage.removeItem(CACHED_PROFILE_KEY);
    localStorage.setItem("access_token", accessToken);
    setToken(accessToken);
    setIsLoading(true);
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
