import "server-only";

import sharp from "sharp";

import { MAX_UPLOAD_BYTES, type MediaExtension } from "@/lib/media";

/** Longest edge kept. Bigger images are scaled down; smaller ones are never enlarged. */
export const MAX_EDGE = 2400;
const MAX_INPUT_PIXELS = 40_000_000;

export type ImageFormat = "png" | "jpeg" | "webp";

export interface CleanImage {
  data: Buffer;
  width: number;
  height: number;
  mime: string;
  extension: MediaExtension;
}

/** A rejection whose message is safe to show to the person who uploaded the file. */
export class ImageRejected extends Error {}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** What the bytes claim to be, from the file signature. Never from the name or the browser-supplied type. */
export function detectFormat(bytes: Buffer): ImageFormat | null {
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(PNG_SIGNATURE)) return "png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return "jpeg";
  if (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString("latin1") === "RIFF" &&
    bytes.subarray(8, 12).toString("latin1") === "WEBP"
  ) {
    return "webp";
  }
  return null;
}

const OUTPUT: Record<ImageFormat, { mime: string; extension: MediaExtension }> = {
  png: { mime: "image/png", extension: "png" },
  jpeg: { mime: "image/jpeg", extension: "jpg" },
  webp: { mime: "image/webp", extension: "webp" },
};

/**
 * Accepts only a real PNG, JPEG or WebP and returns a freshly encoded copy.
 *
 * The signature must match and the decoder must agree with it. Re-encoding drops
 * everything that is not pixels (EXIF and GPS, text chunks, trailing data, a script
 * hidden in a "polyglot" file), applies the camera's rotation, and caps the size.
 * What is stored is always a plain, bounded, still image of the same format.
 */
export async function sanitizeImage(input: Buffer): Promise<CleanImage> {
  if (input.length === 0) throw new ImageRejected("That file is empty.");
  if (input.length > MAX_UPLOAD_BYTES)
    throw new ImageRejected("Each image must be 4 MB or smaller.");
  const claimed = detectFormat(input);
  if (!claimed) throw new ImageRejected("Only JPG, PNG or WebP images are accepted.");

  try {
    const source = sharp(input, { limitInputPixels: MAX_INPUT_PIXELS, failOn: "error" });
    const meta = await source.metadata();
    if (meta.format !== claimed) throw new ImageRejected("That file isn't a valid image.");
    if ((meta.pages ?? 1) > 1) throw new ImageRejected("Animated images aren't accepted.");

    const pipeline = source
      .rotate()
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true });
    const encoded =
      claimed === "png"
        ? pipeline.png({ compressionLevel: 9 })
        : claimed === "jpeg"
          ? pipeline.jpeg({ quality: 86, mozjpeg: true })
          : pipeline.webp({ quality: 86 });

    const { data, info } = await encoded.toBuffer({ resolveWithObject: true });
    return { data, width: info.width, height: info.height, ...OUTPUT[claimed] };
  } catch (error) {
    if (error instanceof ImageRejected) throw error;
    throw new ImageRejected("That image couldn't be read. Try a different file.");
  }
}
