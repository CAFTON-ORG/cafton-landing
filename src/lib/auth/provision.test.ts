import { describe, expect, it } from "vitest";

import { googleAvatarUrl } from "./identity";
import { inviteEmailFromClaims } from "./provision";

describe("inviteEmailFromClaims", () => {
  it("accepts a Google-verified email and normalises it", () => {
    expect(
      inviteEmailFromClaims({ email: " Ada@Cafton.com ", app_metadata: { provider: "google" } }),
    ).toBe("ada@cafton.com");
  });

  it("accepts google among several providers", () => {
    expect(
      inviteEmailFromClaims({
        email: "a@b.co",
        app_metadata: { provider: "email", providers: ["email", "google"] },
      }),
    ).toBe("a@b.co");
  });

  it("refuses non-Google sign-ins and malformed claims", () => {
    expect(
      inviteEmailFromClaims({ email: "a@b.co", app_metadata: { provider: "email" } }),
    ).toBeNull();
    expect(inviteEmailFromClaims({ email: 5, app_metadata: { provider: "google" } })).toBeNull();
    expect(
      inviteEmailFromClaims({ email: "not-an-email", app_metadata: { provider: "google" } }),
    ).toBeNull();
    expect(inviteEmailFromClaims(null)).toBeNull();
  });
});

describe("googleAvatarUrl", () => {
  it("only trusts https URLs on Google's image host", () => {
    expect(googleAvatarUrl({ picture: "https://lh3.googleusercontent.com/a/x" })).toBe(
      "https://lh3.googleusercontent.com/a/x",
    );
    expect(googleAvatarUrl({ picture: "https://evil.example/x.png" })).toBeUndefined();
    expect(googleAvatarUrl({ picture: "http://lh3.googleusercontent.com/x" })).toBeUndefined();
  });
});
