import { describe, expect, it } from "vitest";
import {
  businessDays,
  dashboardMaxDate,
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
const atHour = (date: Date, hour: number) => {
  const result = new Date(date);
  result.setHours(hour, 0, 0, 0);
  return result;
};

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

// #535 — British School sa scrapuje 12:15 deň vopred, dashboard preto
// odomyká zajtrajšok o 12:00, pokiaľ samo zajtra nie je voľno.
describe("dashboardMaxDate", () => {
  it("stays on today before noon", () => {
    expect(dashboardMaxDate(atHour(monday(), 11))).toBe("2026-08-10");
  });

  it("unlocks tomorrow from noon on a weekday whose tomorrow is a workday", () => {
    expect(dashboardMaxDate(atHour(monday(), 12))).toBe("2026-08-11");
  });

  it("does not unlock past a weekend — Friday noon stays on Friday", () => {
    const friday = new Date(2026, 7, 7);
    expect(dashboardMaxDate(atHour(friday, 12))).toBe("2026-08-07");
  });

  it("unlocks Monday from Sunday noon, matching the Sun–Thu scrape crontab", () => {
    expect(dashboardMaxDate(atHour(sunday(), 12))).toBe("2026-08-10");
  });

  it("does not unlock a tomorrow that is a holiday", () => {
    const holidays = new Set(["2026-08-11"]);
    expect(dashboardMaxDate(atHour(monday(), 12), { holidays })).toBe("2026-08-10");
  });

  it("saturday noon stays on the last business day (Friday)", () => {
    expect(dashboardMaxDate(atHour(saturday(), 12))).toBe("2026-08-07");
  });
});
