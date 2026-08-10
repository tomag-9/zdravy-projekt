import { describe, expect, it } from "vitest";
import { normalizeForSearch } from "./searchNormalize";

describe("normalizeForSearch", () => {
  it("is case-insensitive", () => {
    expect(normalizeForSearch("Bratislava")).toBe(normalizeForSearch("BRATISLAVA"));
    expect(normalizeForSearch("bratislava")).toBe(normalizeForSearch("BRATISLAVA"));
  });

  it("is diacritics-insensitive", () => {
    expect(normalizeForSearch("Žilina")).toBe(normalizeForSearch("Zilina"));
    expect(normalizeForSearch("Staré")).toBe(normalizeForSearch("Stare"));
  });

  it("ignores punctuation", () => {
    expect(normalizeForSearch("Stare Mesto")).toBe(normalizeForSearch("Staré, Mesto."));
    expect(normalizeForSearch("Klub - Detva")).toBe(normalizeForSearch("Klub Detva"));
  });

  it("collapses and trims whitespace", () => {
    expect(normalizeForSearch("  Stare   Mesto  ")).toBe(normalizeForSearch("Stare Mesto"));
    expect(normalizeForSearch("Stare\tMesto")).toBe("stare mesto");
  });

  it("combines all normalizations at once", () => {
    expect(normalizeForSearch("  STARÉ, Mesto.  ")).toBe("stare mesto");
  });
});
