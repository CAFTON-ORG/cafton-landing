type TurnstileVerification = {
  success: boolean;
  "error-codes"?: string[];
};

export async function verifyTurnstileToken(
  token: string,
  remoteIp?: string,
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    console.error("TURNSTILE_SECRET_KEY is not configured.");
    return false;
  }

  let response: Response;
  try {
    response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret,
          response: token,
          ...(remoteIp ? { remoteip: remoteIp } : {}),
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      },
    );
  } catch (error) {
    console.error("Cloudflare Turnstile verification request failed.", error);
    return false;
  }

  if (!response.ok) {
    console.error("Cloudflare Turnstile verification request failed.");
    return false;
  }

  const result = (await response.json()) as TurnstileVerification;
  if (!result.success) {
    console.warn("Cloudflare Turnstile verification rejected the submission.", {
      errorCodes: result["error-codes"],
    });
  }

  return result.success;
}
