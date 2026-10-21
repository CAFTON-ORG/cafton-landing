import { afterEach, describe, expect, it, vi } from "vitest";

import { formatBytes, isMediaPath, mediaPathFromUrl, mediaPublicUrl, newMediaPath } from "./media";

afterEach(() => vi.unstubAllEnvs());

describe("media paths", () => {
  it("only accepts content/<uuid>.<ext>", () => {
    expect(isMediaPath(newMediaPath("jpg"))).toBe(true);
    expect(isMediaPath(newMediaPath("webp"))).toBe(true);
    expect(isMediaPath("content/../secret.jpg")).toBe(false);
    expect(isMediaPath("other/11111111-1111-4111-8111-111111111111.png")).toBe(false);
    expect(isMediaPath("content/11111111-1111-4111-8111-111111111111.svg")).toBe(false);
    expect(isMediaPath("https://evil.example/a.png")).toBe(false);
  });

  it("builds the public address and reads the path back out of it", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abc.supabase.co/");
    const path = newMediaPath("png");
    const url = mediaPublicUrl(path);
    expect(url).toBe(`https://abc.supabase.co/storage/v1/object/public/media/${path}`);
    expect(mediaPathFromUrl(url)).toBe(path);
    expect(mediaPathFromUrl(`${url}?v=2`)).toBe(path);
    expect(mediaPathFromUrl("/images/hero-dark.jpg")).toBeNull();
    expect(
      mediaPathFromUrl(
        "https://abc.supabase.co/storage/v1/object/public/media/content/not-a-uuid.png",
      ),
    ).toBeNull();
  });

  it("has no public address when Supabase is not configured", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    expect(mediaPublicUrl(newMediaPath("jpg"))).toBe("");
  });
});

describe("formatBytes", () => {
  it("is human", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(3.5 * 1024 * 1024)).toBe("3.5 MB");
  });
});
