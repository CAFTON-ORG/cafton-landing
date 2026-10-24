import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { detectFormat, ImageRejected, sanitizeImage } from "./image";

const png = (width = 40, height = 20) =>
  sharp({ create: { width, height, channels: 3, background: "#336699" } })
    .png()
    .toBuffer();
const jpeg = (width = 40, height = 20) =>
  sharp({ create: { width, height, channels: 3, background: "#996633" } })
    .withMetadata({ exif: { IFD0: { Copyright: "secret-person@example.com" } } })
    .jpeg()
    .toBuffer();

describe("detectFormat", () => {
  it("reads the format from the signature, not from any name", async () => {
    expect(detectFormat(await png())).toBe("png");
    expect(detectFormat(await jpeg())).toBe("jpeg");
    expect(
      detectFormat(
        await sharp({ create: { width: 4, height: 4, channels: 3, background: "#fff" } })
          .webp()
          .toBuffer(),
      ),
    ).toBe("webp");
    expect(detectFormat(Buffer.from("<svg onload=alert(1)>"))).toBeNull();
    expect(detectFormat(Buffer.alloc(0))).toBeNull();
  });
});

describe("sanitizeImage", () => {
  it("returns a bounded, plain copy with its real dimensions", async () => {
    const clean = await sanitizeImage(await png(40, 20));
    expect(clean).toMatchObject({ width: 40, height: 20, mime: "image/png", extension: "png" });
    expect(detectFormat(clean.data)).toBe("png");
  });

  it("scales a huge image down to the maximum edge, keeping its shape, and never enlarges", async () => {
    const big = await sanitizeImage(await png(5000, 2500));
    expect(Math.max(big.width, big.height)).toBe(2400);
    expect(big.width / big.height).toBeCloseTo(2, 1);
    const small = await sanitizeImage(await png(100, 100));
    expect(small.width).toBe(100);
  });

  it("strips metadata such as EXIF from photos", async () => {
    const original = await jpeg();
    expect((await sharp(original).metadata()).exif).toBeDefined();

    const clean = await sanitizeImage(original);
    expect((await sharp(clean.data).metadata()).exif).toBeUndefined();
    expect(clean.data.toString("latin1")).not.toContain("secret-person");
    expect(clean.extension).toBe("jpg");
  });

  it("rejects anything that is not a real raster image", async () => {
    await expect(
      sanitizeImage(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg' onload='alert(1)'/>")),
    ).rejects.toBeInstanceOf(ImageRejected);
    await expect(sanitizeImage(Buffer.from("GIF89a....."))).rejects.toThrow(/JPG, PNG or WebP/);
    await expect(sanitizeImage(Buffer.alloc(0))).rejects.toThrow(/empty/);
  });

  it("rejects a file whose bytes lie about their format, and a truncated image", async () => {
    const real = await png();
    const liar = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), real.subarray(3)]); // JPEG header on PNG data
    await expect(sanitizeImage(liar)).rejects.toBeInstanceOf(ImageRejected);
    await expect(sanitizeImage(real.subarray(0, 30))).rejects.toBeInstanceOf(ImageRejected);
  });

  it("rejects a file over the upload limit", async () => {
    const oversize = Buffer.concat([await png(), Buffer.alloc(4 * 1024 * 1024 + 1)]);
    await expect(sanitizeImage(oversize)).rejects.toThrow(/4 MB/);
  });
});
