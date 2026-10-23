/**
 * Runs once when the server starts. This is where parts of the system that react to events are
 * connected, so the part that announces an event (Sales) never has to import the part that reacts
 * (Delivery, later Finance).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("@/features/delivery/handlers");
  }
}
