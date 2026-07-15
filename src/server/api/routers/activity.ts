import { z } from "zod";
import { adminProcedure, createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const activityRouter = createTRPCRouter({
  getAll: publicProcedure.query(({ ctx }) => {
    return ctx.db.activity.findMany({
      orderBy: { date: "asc" },
    });
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
