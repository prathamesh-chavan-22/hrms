export type RasterImageType = "image/png" | "image/jpeg" | "image/webp";

const PNG = [0x89, 0x50, 0x4e, 0x47];
const JPEG = [0xff, 0xd8, 0xff];
const WEBP_RIFF = [0x52, 0x49, 0x46, 0x46];
const WEBP_MAGIC = [0x57, 0x45, 0x42, 0x50];

function matches(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  if (bytes.length < offset + signature.length) return false;
  return signature.every((byte, i) => bytes[offset + i] === byte);
}

/** Detect raster image type from magic bytes. Returns null if unknown. */
export function detectRasterImageType(buffer: ArrayBuffer): RasterImageType | null {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 3) return null;

  if (matches(bytes, PNG)) return "image/png";
  if (matches(bytes, JPEG)) return "image/jpeg";
  if (bytes.length >= 12 && matches(bytes, WEBP_RIFF, 0) && matches(bytes, WEBP_MAGIC, 8)) {
    return "image/webp";
  }

  return null;
}

export function extensionForImageType(type: RasterImageType): string {
  switch (type) {
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
  }
}
