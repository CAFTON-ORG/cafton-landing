import { actorId } from "@/lib/actions";
import { verifySession } from "@/lib/auth/dal";
import { countUnread, listNotifications } from "../server";
import { NotificationBell } from "./notification-bell";

/** Server wrapper: loads this person's notifications for the top bar. */
export async function Bell() {
  const staff = await verifySession();
  const userId = actorId(staff);
  const [notifications, unread] = userId
    ? await Promise.all([listNotifications(userId), countUnread(userId)])
    : [[], 0];
  return <NotificationBell notifications={notifications} unread={unread} />;
}
