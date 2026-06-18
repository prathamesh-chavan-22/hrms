import { describe, expect, it } from "vitest";
import { GPS_MAX_AGE_MS, normalizeGpsSubmission } from "./attendance.server";

describe("normalizeGpsSubmission", () => {
  const fresh = Date.now() - 30_000;
  const valid = {
    lat: 12.97,
    lng: 77.59,
    addr: "Bengaluru",
    capturedAt: fresh,
    accuracyM: 25,
  };

  it("strips coords when GPS is not required", () => {
    const { coords, error } = normalizeGpsSubmission(false, valid);
    expect(error).toBeNull();
    expect(coords).toEqual({
      lat: null,
      lng: null,
      addr: null,
      capturedAt: null,
      accuracyM: null,
    });
  });

  it("accepts a fresh, in-range fix when GPS is required", () => {
    const { coords, error } = normalizeGpsSubmission(true, valid);
    expect(error).toBeNull();
    expect(coords.lat).toBe(12.97);
    expect(coords.capturedAt).toBe(fresh);
  });

  it("rejects missing coordinates", () => {
    const { error } = normalizeGpsSubmission(true, { ...valid, lat: null });
    expect(error).toMatch(/required/i);
  });

  it("rejects out-of-range coordinates", () => {
    const { error } = normalizeGpsSubmission(true, { ...valid, lat: 91 });
    expect(error).toMatch(/invalid/i);
  });

  it("rejects stale GPS locks", () => {
    const { error } = normalizeGpsSubmission(true, {
      ...valid,
      capturedAt: Date.now() - GPS_MAX_AGE_MS - 1,
    });
    expect(error).toMatch(/expired/i);
  });

  it("rejects fixes with very poor accuracy", () => {
    const { error } = normalizeGpsSubmission(true, { ...valid, accuracyM: 9_999 });
    expect(error).toMatch(/accuracy/i);
  });
});
