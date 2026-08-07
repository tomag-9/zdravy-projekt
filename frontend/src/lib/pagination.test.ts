import { describe, expect, it, vi } from "vitest";
import { fetchAllPages } from "./pagination";

const response = (payload: unknown) => ({
  ok: true,
  status: 200,
  json: async () => payload,
}) as Response;

describe("fetchAllPages", () => {
  it("follows every page and combines the results", async () => {
    const apiFetch = vi.fn()
      .mockResolvedValueOnce(response({ results: [1, 2], next: "/api/items/?page=2" }))
      .mockResolvedValueOnce(response({ results: [3], next: null }));

    await expect(fetchAllPages<number>(apiFetch, "/api/items/")).resolves.toEqual([1, 2, 3]);
    expect(apiFetch).toHaveBeenNthCalledWith(2, "/api/items/?page=2");
  });

  it("supports endpoints that return an unpaginated array", async () => {
    const apiFetch = vi.fn().mockResolvedValue(response([1, 2, 3]));

    await expect(fetchAllPages<number>(apiFetch, "/api/items/")).resolves.toEqual([1, 2, 3]);
  });
});
