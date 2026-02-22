import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import { ReactNode } from "react";
import ProfilePage from "./ProfilePage";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_PROFILE = {
  username: "testuser",
  email: "test@example.com",
  first_name: "Test",
  last_name: "User",
  date_joined: "2024-01-15T10:00:00Z",
  groups: ["client"],
};

// ── Auth mock ─────────────────────────────────────────────────────────────────

const mockApiFetch = vi.fn();

vi.mock("../../../context/auth", () => ({
  useAuth: vi.fn(() => ({ apiFetch: mockApiFetch })),
  AuthProvider: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeResponse(data: unknown, ok = true) {
  return {
    ok,
    json: () => Promise.resolve(data),
  } as unknown as Response;
}

const renderPage = () =>
  render(
    <MemoryRouter>
      <ProfilePage />
    </MemoryRouter>,
  );

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("ProfilePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Loading ────────────────────────────────────────────────────────────────

  it("shows loading spinner while fetching", () => {
    // Never resolves during this test
    mockApiFetch.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByText(/načítavam profil/i)).toBeInTheDocument();
  });

  // ── Successful load ────────────────────────────────────────────────────────

  it("renders profile data after successful fetch", async () => {
    mockApiFetch.mockResolvedValue(makeResponse(MOCK_PROFILE));
    renderPage();

    await waitFor(() =>
      expect(screen.getByText("testuser")).toBeInTheDocument(),
    );

    expect(screen.getByDisplayValue("Test")).toBeInTheDocument(); // first_name
    expect(screen.getByDisplayValue("User")).toBeInTheDocument(); // last_name
    expect(screen.getByDisplayValue("test@example.com")).toBeInTheDocument();
    expect(screen.getByText("client")).toBeInTheDocument();
  });

  it("shows formatted registration date", async () => {
    mockApiFetch.mockResolvedValue(makeResponse(MOCK_PROFILE));
    renderPage();

    await waitFor(() =>
      expect(screen.getByText("testuser")).toBeInTheDocument(),
    );
    // 15. januára 2024 or similar sk-SK formatted date
    expect(screen.getByText(/2024/)).toBeInTheDocument();
  });

  // ── Failed load ────────────────────────────────────────────────────────────

  it("shows error message when profile fetch fails (non-ok response)", async () => {
    mockApiFetch.mockResolvedValue(makeResponse(null, false));
    renderPage();

    await waitFor(() =>
      expect(
        screen.getByText(/nepodarilo sa načítať profil/i),
      ).toBeInTheDocument(),
    );
  });

  it("shows error message when profile fetch throws a network error", async () => {
    mockApiFetch.mockRejectedValue(new Error("Network error"));
    renderPage();

    await waitFor(() =>
      expect(
        screen.getByText(/chyba pri načítaní profilu/i),
      ).toBeInTheDocument(),
    );
  });

  // ── Form fields ────────────────────────────────────────────────────────────

  it("pre-fills form fields with loaded profile data", async () => {
    mockApiFetch.mockResolvedValue(makeResponse(MOCK_PROFILE));
    renderPage();

    await waitFor(() =>
      expect(screen.getByDisplayValue("test@example.com")).toBeInTheDocument(),
    );

    expect(screen.getByDisplayValue("Test")).toBeInTheDocument();
    expect(screen.getByDisplayValue("User")).toBeInTheDocument();
  });

  it("updates first_name field on user input", async () => {
    mockApiFetch.mockResolvedValue(makeResponse(MOCK_PROFILE));
    renderPage();

    await waitFor(() =>
      expect(screen.getByDisplayValue("Test")).toBeInTheDocument(),
    );

    const firstNameInput = screen.getByDisplayValue("Test");
    fireEvent.change(firstNameInput, { target: { value: "Nové Meno" } });
    expect(screen.getByDisplayValue("Nové Meno")).toBeInTheDocument();
  });

  it("updates email field on user input", async () => {
    mockApiFetch.mockResolvedValue(makeResponse(MOCK_PROFILE));
    renderPage();

    await waitFor(() =>
      expect(screen.getByDisplayValue("test@example.com")).toBeInTheDocument(),
    );

    const emailInput = screen.getByDisplayValue("test@example.com");
    fireEvent.change(emailInput, { target: { value: "novy@email.sk" } });
    expect(screen.getByDisplayValue("novy@email.sk")).toBeInTheDocument();
  });

  // ── Successful save ────────────────────────────────────────────────────────

  it("shows success message after successful PATCH", async () => {
    const updatedProfile = { ...MOCK_PROFILE, first_name: "Ján" };
    // First call = GET, second call = PATCH
    mockApiFetch
      .mockResolvedValueOnce(makeResponse(MOCK_PROFILE))
      .mockResolvedValueOnce(makeResponse(updatedProfile));

    renderPage();

    await waitFor(() =>
      expect(screen.getByDisplayValue("Test")).toBeInTheDocument(),
    );

    const firstNameInput = screen.getByDisplayValue("Test");
    fireEvent.change(firstNameInput, { target: { value: "Ján" } });

    const saveButton = screen.getByRole("button", { name: /uložiť zmeny/i });
    fireEvent.click(saveButton);

    await waitFor(() =>
      expect(
        screen.getByText(/profil bol úspešne aktualizovaný/i),
      ).toBeInTheDocument(),
    );
  });

  it("sends PATCH request with correct method and body", async () => {
    mockApiFetch
      .mockResolvedValueOnce(makeResponse(MOCK_PROFILE))
      .mockResolvedValueOnce(
        makeResponse({ ...MOCK_PROFILE, last_name: "Nový" }),
      );

    renderPage();

    await waitFor(() =>
      expect(screen.getByDisplayValue("User")).toBeInTheDocument(),
    );

    const lastNameInput = screen.getByDisplayValue("User");
    fireEvent.change(lastNameInput, { target: { value: "Nový" } });

    const saveButton = screen.getByRole("button", { name: /uložiť zmeny/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      const patchCall = (mockApiFetch as Mock).mock.calls[1];
      expect(patchCall[1]).toMatchObject({
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });
      const body = JSON.parse(patchCall[1].body);
      expect(body.last_name).toBe("Nový");
    });
  });

  // ── Failed save ────────────────────────────────────────────────────────────

  it("shows error message when PATCH fails (non-ok response)", async () => {
    mockApiFetch
      .mockResolvedValueOnce(makeResponse(MOCK_PROFILE))
      .mockResolvedValueOnce(makeResponse(null, false));

    renderPage();

    await waitFor(() =>
      expect(screen.getByDisplayValue("Test")).toBeInTheDocument(),
    );

    const saveButton = screen.getByRole("button", { name: /uložiť zmeny/i });
    fireEvent.click(saveButton);

    await waitFor(() =>
      expect(
        screen.getByText(/nepodarilo sa aktualizovať profil/i),
      ).toBeInTheDocument(),
    );
  });

  it("shows error message when PATCH throws a network error", async () => {
    mockApiFetch
      .mockResolvedValueOnce(makeResponse(MOCK_PROFILE))
      .mockRejectedValueOnce(new Error("Network error"));

    renderPage();

    await waitFor(() =>
      expect(screen.getByDisplayValue("Test")).toBeInTheDocument(),
    );

    const saveButton = screen.getByRole("button", { name: /uložiť zmeny/i });
    fireEvent.click(saveButton);

    await waitFor(() =>
      expect(screen.getByText(/chyba pri ukladaní zmien/i)).toBeInTheDocument(),
    );
  });

  // ── Save button state ──────────────────────────────────────────────────────

  it("disables save button while saving", async () => {
    let resolvePatch!: (value: Response) => void;
    const patchPromise = new Promise<Response>(
      (resolve) => (resolvePatch = resolve),
    );

    mockApiFetch
      .mockResolvedValueOnce(makeResponse(MOCK_PROFILE))
      .mockReturnValueOnce(patchPromise);

    renderPage();

    await waitFor(() =>
      expect(screen.getByDisplayValue("Test")).toBeInTheDocument(),
    );

    const saveButton = screen.getByRole("button", { name: /uložiť zmeny/i });
    fireEvent.click(saveButton);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /ukladám/i })).toBeDisabled(),
    );

    // Resolve and cleanup
    resolvePatch(makeResponse(MOCK_PROFILE));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /uložiť zmeny/i }),
      ).toBeInTheDocument(),
    );
  });

  // ── Username is read-only ──────────────────────────────────────────────────

  it("does NOT include an editable username field", async () => {
    mockApiFetch.mockResolvedValue(makeResponse(MOCK_PROFILE));
    renderPage();

    await waitFor(() =>
      expect(screen.getByText("testuser")).toBeInTheDocument(),
    );

    // Username is displayed as a heading, not in an input
    const inputs = document.querySelectorAll("input");
    const inputValues = Array.from(inputs).map((i) => i.value);
    expect(inputValues).not.toContain("testuser");
  });

  // ── Group display ──────────────────────────────────────────────────────────

  it("shows 'Používateľ' when user has no groups", async () => {
    mockApiFetch.mockResolvedValue(
      makeResponse({ ...MOCK_PROFILE, groups: [] }),
    );
    renderPage();

    await waitFor(() =>
      expect(screen.getByText("Používateľ")).toBeInTheDocument(),
    );
  });

  it("shows all groups joined by comma when user has multiple groups", async () => {
    mockApiFetch.mockResolvedValue(
      makeResponse({ ...MOCK_PROFILE, groups: ["client", "admin"] }),
    );
    renderPage();

    await waitFor(() =>
      expect(screen.getByText("client, admin")).toBeInTheDocument(),
    );
  });
});
