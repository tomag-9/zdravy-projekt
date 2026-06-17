import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ForgotPasswordPage from "../pages/ForgotPasswordPage";
import ResetPasswordPage from "../pages/ResetPasswordPage";

// ─── Helpers ────────────────────────────────────────────────────────────────

function renderForgotPassword() {
  return render(
    <MemoryRouter initialEntries={["/forgot-password"]}>
      <Routes>
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

function renderResetPassword(token = "valid-token-123") {
  return render(
    <MemoryRouter initialEntries={[`/reset-password?token=${token}`]}>
      <Routes>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

// ─── ForgotPasswordPage ──────────────────────────────────────────────────────

describe("ForgotPasswordPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders email input and submit button", () => {
    renderForgotPassword();
    expect(screen.getByPlaceholderText(/vase@meno.sk/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Odoslať odkaz/i })).toBeInTheDocument();
  });

  it("renders back to login link", () => {
    renderForgotPassword();
    expect(screen.getByText(/Späť na prihlásenie/i)).toBeInTheDocument();
  });

  it("shows success state after 200 response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ detail: "ok" }),
    } as Response));

    renderForgotPassword();
    fireEvent.change(screen.getByPlaceholderText(/vase@meno.sk/i), {
      target: { value: "test@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Odoslať odkaz/i }));
    await waitFor(() => screen.getByRole("dialog"));
    fireEvent.click(screen.getByRole("button", { name: /^Odoslať$/i }));

    await waitFor(() =>
      expect(screen.getByText(/Skontrolujte e-mail/i)).toBeInTheDocument(),
    );
    expect(screen.getByText(/test@example.com/i)).toBeInTheDocument();
    expect(screen.getByText(/spam/i)).toBeInTheDocument();
  });

  it("shows rate-limit message on 429 response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({
        detail: "Príliš veľa pokusov. Skúste to znova za 1 minút.",
        retry_after_seconds: 60,
      }),
    } as Response));

    renderForgotPassword();
    fireEvent.change(screen.getByPlaceholderText(/vase@meno.sk/i), {
      target: { value: "test@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Odoslať odkaz/i }));
    await waitFor(() => screen.getByRole("dialog"));
    fireEvent.click(screen.getByRole("button", { name: /^Odoslať$/i }));

    await waitFor(() =>
      expect(screen.getByText(/Príliš veľa pokusov/i)).toBeInTheDocument(),
    );
  });

  it("shows generic error on non-ok non-429 response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ detail: "Bad request" }),
    } as Response));

    renderForgotPassword();
    fireEvent.change(screen.getByPlaceholderText(/vase@meno.sk/i), {
      target: { value: "bad@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Odoslať odkaz/i }));
    await waitFor(() => screen.getByRole("dialog"));
    fireEvent.click(screen.getByRole("button", { name: /^Odoslať$/i }));

    await waitFor(() =>
      expect(screen.getByText(/Bad request/i)).toBeInTheDocument(),
    );
  });

  it("shows network error when fetch throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new Error("network failure")));

    renderForgotPassword();
    fireEvent.change(screen.getByPlaceholderText(/vase@meno.sk/i), {
      target: { value: "test@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Odoslať odkaz/i }));
    await waitFor(() => screen.getByRole("dialog"));
    fireEvent.click(screen.getByRole("button", { name: /^Odoslať$/i }));

    await waitFor(() =>
      expect(screen.getByText(/Nepodarilo sa pripojiť/i)).toBeInTheDocument(),
    );
  });
});

// ─── ResetPasswordPage ───────────────────────────────────────────────────────

describe("ResetPasswordPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders password fields and submit button", () => {
    renderResetPassword();
    expect(screen.getByPlaceholderText(/Minimálne 8 znakov/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Zopakujte nové heslo/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Nastaviť nové heslo/i }),
    ).toBeInTheDocument();
  });

  it("shows error when token is missing", () => {
    render(
      <MemoryRouter initialEntries={["/reset-password"]}>
        <Routes>
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText(/Chybajúci alebo neplatný odkaz/i)).toBeInTheDocument();
  });

  it("shows error when passwords do not match", async () => {
    renderResetPassword();
    fireEvent.change(screen.getByPlaceholderText(/Minimálne 8 znakov/i), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Zopakujte nové heslo/i), {
      target: { value: "different123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Nastaviť nové heslo/i }));

    await waitFor(() =>
      expect(screen.getByText(/Heslá sa nezhodujú/i)).toBeInTheDocument(),
    );
  });

  it("shows error when password is too short", async () => {
    renderResetPassword();
    fireEvent.change(screen.getByPlaceholderText(/Minimálne 8 znakov/i), {
      target: { value: "short" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Zopakujte nové heslo/i), {
      target: { value: "short" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Nastaviť nové heslo/i }));

    await waitFor(() =>
      expect(screen.getByText(/aspoň 8 znakov/i)).toBeInTheDocument(),
    );
  });

  it("shows success state after 200 response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ detail: "Heslo bolo úspešne zmenené." }),
    } as Response));

    renderResetPassword();
    fireEvent.change(screen.getByPlaceholderText(/Minimálne 8 znakov/i), {
      target: { value: "newpassword123" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Zopakujte nové heslo/i), {
      target: { value: "newpassword123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Nastaviť nové heslo/i }));

    await waitFor(() =>
      expect(screen.getByText(/Heslo bolo zmenené/i)).toBeInTheDocument(),
    );
  });

  it("shows backend error on failure response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ detail: "Token je neplatný alebo vypršal." }),
    } as Response));

    renderResetPassword();
    fireEvent.change(screen.getByPlaceholderText(/Minimálne 8 znakov/i), {
      target: { value: "newpassword123" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Zopakujte nové heslo/i), {
      target: { value: "newpassword123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Nastaviť nové heslo/i }));

    await waitFor(() =>
      expect(screen.getByText(/Token je neplatný/i)).toBeInTheDocument(),
    );
  });
});
