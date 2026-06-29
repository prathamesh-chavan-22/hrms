import { describe, it, expect } from "vitest";
import { countInclusiveDays, computeBalance } from "./leave.service";

describe("countInclusiveDays", () => {
  it("returns 1 for same-day range", () => {
    expect(countInclusiveDays("2026-06-01", "2026-06-01")).toBe(1);
  });

  it("returns inclusive span across days", () => {
    expect(countInclusiveDays("2026-06-01", "2026-06-05")).toBe(5);
  });

  it("throws when end is before start", () => {
    expect(() => countInclusiveDays("2026-06-05", "2026-06-01")).toThrow();
  });
});

describe("computeBalance", () => {
  it("subtracts approved usage from entitlement", () => {
    expect(computeBalance(15, 4)).toEqual({ entitled: 15, used: 4, remaining: 11 });
  });

  it("does not go negative", () => {
    expect(computeBalance(5, 8).remaining).toBe(0);
  });
});
