export type HubspotField = { name: string; value: string };

export type HubspotSubmitResult =
  | { ok: true }
  | { ok: false; message: string };

function getHubspotCookie(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(/(?:^|; )hubspotutk=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : undefined;
}

/** Submits a set of fields to a HubSpot form via the public Forms Submission API. */
export async function submitToHubspotForm(
  fields: HubspotField[],
  pageName: string
): Promise<HubspotSubmitResult> {
  const portalId = process.env.NEXT_PUBLIC_HUBSPOT_PORTAL_ID;
  const formGuid = process.env.NEXT_PUBLIC_HUBSPOT_FORM_GUID;

  if (!portalId || !formGuid) {
    return {
      ok: false,
      message: "The contact form isn't configured yet. Please email us directly.",
    };
  }

  const hutk = getHubspotCookie();

  try {
    const response = await fetch(
      `https://api.hsforms.com/submissions/v3/integration/submit/${portalId}/${formGuid}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields,
          context: {
            pageUri: window.location.href,
            pageName,
            ...(hutk ? { hutk } : {}),
          },
        }),
      }
    );

    if (response.ok) {
      return { ok: true };
    }

    const data = await response.json().catch(() => null);
    const message =
      data?.message ??
      data?.errors?.[0]?.message ??
      "Something went wrong sending your message. Please try again or email us directly.";
    return { ok: false, message };
  } catch {
    return {
      ok: false,
      message: "Network error. Please try again or email us directly.",
    };
  }
}
