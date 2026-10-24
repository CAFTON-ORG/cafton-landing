/**
 * Where the parts of the system that react to events are connected: the one place that knows both
 * sides, so the part that announces an event (Sales) never imports the part that reacts (Delivery,
 * later Finance). `emit` loads this the first time anything is announced, inside the same bundle as
 * the emitter, so the handlers are registered on the same bus. (A separate startup hook such as
 * `instrumentation.ts` is bundled apart from the pages and would register on a bus nobody emits to.)
 */
import "@/features/delivery/services/handlers";
