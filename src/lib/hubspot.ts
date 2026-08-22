import "server-only";

import { buildHubSpotMessage, type ContactFormData } from "@/lib/contact";

type HubSpotSubmissionContext = {
  hutk?: string;
  pageName: string;
  pageUri: string;
};

export type HubSpotSubmitResult = { ok: true } | { ok: false; message: string };

/** Sends a verified contact request to HubSpot without exposing its configuration to the browser. */
export async function submitContactToHubSpot(
  contact: ContactFormData,
  leadSource: string,
  context: HubSpotSubmissionContext,
): Promise<HubSpotSubmitResult> {
  const portalId = process.env.HUBSPOT_PORTAL_ID;
  const formGuid = process.env.HUBSPOT_FORM_GUID;

  if (!portalId || !formGuid) {
    console.error("HubSpot contact form configuration is missing.");
    return {
      ok: false,
      message:
        "The contact form isn't configured yet. Please email us directly.",
    };
  }

  try {
    const response = await fetch(
      `https://api.hsforms.com/submissions/v3/integration/submit/${portalId}/${formGuid}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: [
            { name: "firstname", value: contact.firstName },
            { name: "lastname", value: contact.lastName },
            { name: "email", value: contact.email },
            { name: "phone", value: contact.phone },
            { name: "message", value: buildHubSpotMessage(contact) },
            { name: "website_lead_source", value: leadSource },
          ],
          context,
        }),
        cache: "no-store",
      },
    );

    if (response.ok) return { ok: true };

    const data = await response.json().catch(() => null);
    console.error("HubSpot rejected the contact submission.", {
      status: response.status,
      message: data?.message,
    });
    return {
      ok: false,
      message:
        "Something went wrong sending your message. Please try again or email us directly.",
    };
  } catch (error) {
    console.error("Unable to submit the contact request to HubSpot.", error);
    return {
      ok: false,
      message: "Network error. Please try again or email us directly.",
    };
  }
}
