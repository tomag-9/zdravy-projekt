import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import usePrevadzky from "./usePrevadzky";

const mockApiFetch = vi.fn();

vi.mock("../../../context/auth", () => ({
    useAuth: () => ({ apiFetch: mockApiFetch }),
}));

vi.mock("../../../lib/logger", () => ({
    logger: { error: vi.fn(), debug: vi.fn() },
}));

const ok = (body: unknown) =>
    Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });

const P = (id: number, nazov: string) => ({ id, nazov, adresa: "", celok: "Jolly", pack_separately_enabled: false });

describe("usePrevadzky", () => {
    beforeEach(() => mockApiFetch.mockReset());

    it("single prevadzka needs no choice", async () => {
        mockApiFetch.mockReturnValue(ok([P(1, "Pramienok")]));
        const { result } = renderHook(() => usePrevadzky());
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.needsChoice).toBe(false);
        expect(result.current.single?.nazov).toBe("Pramienok");
    });

    it("multiple prevadzky require a choice", async () => {
        mockApiFetch.mockReturnValue(ok([P(1, "Jolly 1"), P(2, "Jolly 2")]));
        const { result } = renderHook(() => usePrevadzky());
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.needsChoice).toBe(true);
        expect(result.current.single).toBeNull();
    });

    it("failed request degrades to no prevadzky, not a crash", async () => {
        mockApiFetch.mockReturnValue(Promise.resolve({ ok: false, status: 500 }));
        const { result } = renderHook(() => usePrevadzky());
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.prevadzky).toEqual([]);
        expect(result.current.needsChoice).toBe(false);
    });
});
