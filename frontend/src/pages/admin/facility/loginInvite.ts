import type { Login } from "./LoginFields";

/** Znova pošle setup e-mail (nový link) danému loginu. */
export async function resendLoginInvite(
  apiFetch: (input: string, init?: RequestInit) => Promise<Response>,
  apiBase: string,
  login: Login,
): Promise<{ ok: boolean; detail?: string }> {
  try {
    const res = await apiFetch(`${apiBase}/admin/users/${login.user_id}/resend-invite/`, {
      method: "POST",
    });
    if (res.ok) return { ok: true };
    const data = await res.json().catch(() => null);
    return { ok: false, detail: data?.detail };
  } catch {
    return { ok: false };
  }
}
