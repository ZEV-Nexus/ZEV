"use client";

import { useAblyNotification } from "@/shared/hooks/use-ably-notification";

/**
 * AblyNotificationProvider
 *
 * This component initializes the global Ably notification subscription.
 * Place it inside the chat layout so that logged-in users automatically
 * receive real-time notifications (e.g., room invitations).
 */
export default function AblyNotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useAblyNotification();
  return <>{children}</>;
}
