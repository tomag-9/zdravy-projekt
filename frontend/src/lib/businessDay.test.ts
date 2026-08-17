import { describe, expect, it } from "vitest";
import {
  businessDays,
  dayOffReason,
  isDayOff,
  nextBusinessDay,
  previousBusinessDay,
  stepBusinessDay,
  toDateKey,
} from "./businessDay";

// August 2026: 10. je pondelok, 8. sobota, 9. nedeľa.
const monday = () => new Date(2026, 7, 10);
const saturday = () => new Date(2026, 7, 8);
const sunday = () => new Date(2026, 7, 9);

describe("previousBusinessDay", () => {
  it("leaves a weekday unchanged", () => {
    expect(previousBusinessDay(monday()).getDate()).toBe(10);
  });

  it("rolls a Saturday back to Friday", () => {
    const result = previousBusinessDay(saturday());
    expect(result.getDay()).toBe(5);
    expect(result.getDate()).toBe(7);
  });

  it("rolls a Sunday back to Friday", () => {
    const result = previousBusinessDay(sunday());
    expect(result.getDay()).toBe(5);
    expect(result.getDate()).toBe(7);
  });

  it("skips a holiday as well as the weekend", () => {
    const holidays = new Set(["2026-08-07"]);
    expect(toDateKey(previousBusinessDay(saturday(), { holidays }))).toBe("2026-08-06");
  });
});

describe("isDayOff / dayOffReason", () => {
  it("separates weekend, holiday and prevádzka closure", () => {
    const sets = {
      holidays: new Set(["2026-08-11"]),
      closures: new Set(["2026-08-12"]),
    };
    expect(dayOffReason(saturday(), sets)).toBe("weekend");
    expect(dayOffReason(new Date(2026, 7, 11), sets)).toBe("holiday");
    expect(dayOffReason(new Date(2026, 7, 12), sets)).toBe("closure");
    expect(dayOffReason(monday(), sets)).toBeNull();
  });

  it("ignores closures when none are passed", () => {
    expect(isDayOff(new Date(2026, 7, 12))).toBe(false);
    expect(isDayOff(new Date(2026, 7, 12), { closures: new Set(["2026-08-12"]) })).toBe(true);
  });
});

describe("nextBusinessDay / stepBusinessDay", () => {
  it("nextBusinessDay keeps a business day, stepBusinessDay always moves", () => {
    expect(toDateKey(nextBusinessDay(monday()))).toBe("2026-08-10");
    expect(toDateKey(stepBusinessDay(monday(), 1)!)).toBe("2026-08-11");
    expect(toDateKey(stepBusinessDay(monday(), -1)!)).toBe("2026-08-07");
  });

  it("steps over a closed range", () => {
    const closures = new Set(["2026-08-11", "2026-08-12", "2026-08-13"]);
    expect(toDateKey(stepBusinessDay(monday(), 1, { closures })!)).toBe("2026-08-14");
  });
});

describe("businessDays", () => {
  it("returns the next N ordering days, skipping every kind of day off", () => {
    const days = businessDays(monday(), 3, {
      holidays: new Set(["2026-08-11"]),
      closures: new Set(["2026-08-12"]),
    });
    expect(days.map(toDateKey)).toEqual(["2026-08-10", "2026-08-13", "2026-08-14"]);
  });
});
