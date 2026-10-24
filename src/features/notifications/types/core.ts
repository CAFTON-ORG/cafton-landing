export interface NotificationView {
  id: string;
  kind: string;
  title: string;
  body?: string;
  href?: string;
  read: boolean;
  createdAt: string;
}
