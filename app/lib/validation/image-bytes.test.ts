import { describe, expect, it } from "vitest";
import { detectRasterImageType } from "./image-bytes";

// Minimal valid headers for each format
const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const WEBP_BYTES = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
]);

describe("detectRasterImageType", () => {
  it("detects PNG", () => {
    expect(detectRasterImageType(PNG_BYTES.buffer)).toBe("image/png");
  });

  it("detects JPEG", () => {
    expect(detectRasterImageType(JPEG_BYTES.buffer)).toBe("image/jpeg");
  });

  it("detects WebP", () => {
    expect(detectRasterImageType(WEBP_BYTES.buffer)).toBe("image/webp");
  });

  it("rejects unknown content", () => {
    const exe = new Uint8Array([0x4d, 0x5a, 0x90, 0x00]);
    expect(detectRasterImageType(exe.buffer)).toBeNull();
  });
});
