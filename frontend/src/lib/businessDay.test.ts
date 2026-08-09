import { describe, expect, it } from "vitest";
import { previousBusinessDay } from "./businessDay";

describe("previousBusinessDay", () => {
  it("leaves a weekday unchanged", () => {
    const monday = new Date(2026, 7, 10); // Monday
    expect(previousBusinessDay(monday).getDate()).toBe(10);
  });

  it("rolls a Saturday back to Friday", () => {
    const saturday = new Date(2026, 7, 8);
    const result = previousBusinessDay(saturday);
    expect(result.getDay()).toBe(5);
    expect(result.getDate()).toBe(7);
  });

  it("rolls a Sunday back to Friday", () => {
    const sunday = new Date(2026, 7, 9);
    const result = previousBusinessDay(sunday);
    expect(result.getDay()).toBe(5);
    expect(result.getDate()).toBe(7);
  });
});
