"use client";

import { CalendarDays, MapPin } from "lucide-react";

import { ActivityImage } from "~/components/ui/activity-image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import Markdown from "~/components/ui/markdown";
import { TIME_ZONE } from "~/lib/date";

export interface ModalActivity {
  id: string;
  title: string;
  description: string;
  location: string;
  date: Date;
  imageUrl: string | null;
}

/**
 * Detaljene for én aktivitet. Bygget på Photons Dialog, så overlay, fokus,
 * Escape og scroll-lås er de samme som i resten av TIHLDE — og Dialog
 * portaler selv, så en transformert forelder (Reveal/Stagger) kan ikke
 * forskyve den.
 */
export default function ActivityModal({
  activity,
  onClose,
}: {
  activity: ModalActivity | null;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={activity !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      {activity ? (
        <DialogContent className="gap-0 p-0 sm:max-w-3xl">
          <ActivityImage
            src={activity.imageUrl}
            alt=""
            className="aspect-[21/9] w-full shrink-0 object-cover"
          />
          <div className="flex flex-col gap-4 p-6">
            <DialogHeader>
              <DialogTitle className="text-2xl">{activity.title}</DialogTitle>
            </DialogHeader>
            <ActivityMeta activity={activity} />
            <Markdown className="text-base">{activity.description}</Markdown>
          </div>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}

function ActivityMeta({ activity }: { activity: ModalActivity }) {
  const date = new Date(activity.date);
  const when = `${date.toLocaleDateString("no-NO", {
    timeZone: TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
  })} kl. ${date.toLocaleTimeString("no-NO", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  })}`;

  return (
    <div className="text-muted-foreground flex flex-col gap-1 text-sm">
      <div className="flex items-center gap-2">
        <CalendarDays className="size-4 shrink-0" />
        <span className="first-letter:uppercase">{when}</span>
      </div>
      <div className="flex items-center gap-2">
        <MapPin className="size-4 shrink-0" />
        {activity.location.startsWith("http") ? (
          <a
            href={activity.location}
            target="_blank"
            rel="noopener noreferrer"
            className="text-link hover:underline"
          >
            Vis på kart
          </a>
        ) : (
          <span>{activity.location}</span>
        )}
      </div>
    </div>
  );
}
