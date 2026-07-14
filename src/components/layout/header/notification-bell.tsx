"use client";

import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

function formatTime(date: Date) {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return new Date(date).toLocaleTimeString("no-NO", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  if (days === 1) return "I gar";
  if (days < 7) return `${days} dager siden`;
  return new Date(date).toLocaleDateString("no-NO", {
    day: "numeric",
    month: "short",
  });
}

export function NotificationBell() {
  const router = useRouter();
  const utils = api.useUtils();

  const { data: unreadCount } = api.notification.unreadCount.useQuery(
    undefined,
    { refetchInterval: 30_000 },
  );
  const { data: notifications } = api.notification.list.useQuery();

  const markRead = api.notification.markRead.useMutation({
    onSuccess: () => {
      void utils.notification.unreadCount.invalidate();
      void utils.notification.list.invalidate();
    },
  });

  const handleSelect = (notificationId: string) => {
    markRead.mutate({ id: notificationId });
    router.push("/faddergruppe");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Varsler"
          className="hover:bg-muted/50 hover:text-foreground relative rounded-md p-2 transition"
          type="button"
        >
          <Bell className="h-4 w-4" />
          {!!unreadCount && unreadCount > 0 && (
            <span className="absolute top-0.5 right-0.5 grid h-4 w-4 place-items-center rounded-full bg-red-500 text-[10px] font-semibold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Varsler</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications && notifications.length > 0 ? (
          notifications.map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              onSelect={() => handleSelect(notification.id)}
              className={cn(
                "flex cursor-pointer flex-col items-start gap-1 whitespace-normal py-2",
                !notification.read && "bg-accent/50",
              )}
            >
              <span className="text-sm leading-snug">
                {notification.message}
              </span>
              <span className="text-muted-foreground text-xs">
                {formatTime(notification.createdAt)}
              </span>
            </DropdownMenuItem>
          ))
        ) : (
          <div className="text-muted-foreground px-2 py-4 text-center text-sm">
            Ingen varsler
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
