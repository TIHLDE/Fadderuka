import { revalidateTag } from "next/cache";
import { z } from "zod";
import {
  adminProcedure,
  createTRPCRouter,
  verifiedProcedure,
} from "~/server/api/trpc";
import {
  getPhotonFadderukaEvents,
  PHOTON_EVENTS_TAG,
  type EventItem,
} from "~/server/events/photon";

export const activityRouter = createTRPCRouter({
  getAll: verifiedProcedure.query(({ ctx }) => {
    return ctx.db.activity.findMany({
      orderBy: { date: "asc" },
    });
  }),

  /**
   * Merged, date-sorted event feed shown inside the app: Fadderuka events from
   * Photon plus any locally-managed activities. Admins still create local
   * activities via the mutations below; Photon events are read-only.
   */
  getUpcoming: verifiedProcedure.query(async ({ ctx }): Promise<EventItem[]> => {
    const [local, photon] = await Promise.all([
      ctx.db.activity.findMany({ orderBy: { date: "asc" } }),
      getPhotonFadderukaEvents(),
    ]);

    const localEvents: EventItem[] = local.map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      location: a.location,
      date: a.date,
      imageUrl: a.imageUrl,
      source: "local",
    }));

    return [...photon, ...localEvents].sort(
      (a, b) => a.date.getTime() - b.date.getTime(),
    );
  }),

  /**
   * Tømmer cachen for Photon-svarene, slik at neste sidevisning henter events
   * på nytt med én gang i stedet for å vente på at cachen går ut.
   */
  refreshPhoton: adminProcedure.mutation(async () => {
    // "max" utløper oppføringene uansett hvilken cache-profil de har.
    revalidateTag(PHOTON_EVENTS_TAG, "max");
    const events = await getPhotonFadderukaEvents();
    return { count: events.length };
  }),

  create: adminProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        description: z.string().min(1),
        location: z.string().min(1),
        imageUrl: z.string().url().optional().or(z.literal("")),
        date: z.string().datetime(),
      }),
    )
    .mutation(({ ctx, input }) => {
      return ctx.db.activity.create({
        data: {
          title: input.title,
          description: input.description,
          location: input.location,
          // `||` is intentional: coerce empty string (allowed by the schema) to null, not "".
          // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
          imageUrl: input.imageUrl || null,
          date: new Date(input.date),
        },
      });
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).max(200),
        description: z.string().min(1),
        location: z.string().min(1),
        imageUrl: z.string().url().optional().or(z.literal("")),
        date: z.string().datetime(),
      }),
    )
    .mutation(({ ctx, input }) => {
      return ctx.db.activity.update({
        where: { id: input.id },
        data: {
          title: input.title,
          description: input.description,
          location: input.location,
          // `||` is intentional: coerce empty string (allowed by the schema) to null, not "".
          // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
          imageUrl: input.imageUrl || null,
          date: new Date(input.date),
        },
      });
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => {
      return ctx.db.activity.delete({ where: { id: input.id } });
    }),
});
