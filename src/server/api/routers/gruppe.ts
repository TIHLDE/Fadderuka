import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createTRPCRouter,
  verifiedProcedure,
} from "~/server/api/trpc";
import { areGrupperPublished, canSeeGruppe } from "~/server/gruppe-visibility";

const channelSchema = z.enum(["ANNOUNCEMENT", "CHAT"]);

export const gruppeRouter = createTRPCRouter({
  /** Whether the faddergrupper have been released to fadderbarn. */
  getPublication: verifiedProcedure.query(async ({ ctx }) => {
    return { published: await areGrupperPublished(ctx.db) };
  }),

  /**
   * Get the current user's faddergruppe membership(s).
   *
   * A fadderbarn gets `null` until the grupper are published — the same answer
   * as "you have no gruppe yet", which is deliberate: before publication the
   * assignment simply doesn't exist as far as they're concerned.
   */
  getMyGruppe: verifiedProcedure.query(async ({ ctx }) => {
    const membership = await ctx.db.fadderGruppeMember.findFirst({
      where: { userId: ctx.session.user.id },
      include: {
        gruppe: {
          include: {
            members: {
              include: {
                user: { select: { id: true, name: true, email: true } },
              },
              orderBy: { role: "asc" },
            },
          },
        },
      },
    });
    if (!membership) return null;

    const visible = canSeeGruppe({
      isAdmin: ctx.session.user.isAdmin,
      role: membership.role,
      published: await areGrupperPublished(ctx.db),
    });
    return visible ? membership : null;
  }),

  /** Get messages for a group (user must be a member or admin) */
  getMessages: verifiedProcedure
    .input(z.object({ gruppeId: z.string(), channel: channelSchema }))
    .query(async ({ ctx, input }) => {
      // Check access: must be admin or member of the group
      const isAdmin = ctx.session.user.isAdmin;
      if (!isAdmin) {
        const membership = await ctx.db.fadderGruppeMember.findUnique({
          where: {
            userId_gruppeId: {
              userId: ctx.session.user.id,
              gruppeId: input.gruppeId,
            },
          },
        });
        if (!membership) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Du har ikke tilgang til denne gruppen",
          });
        }
        // An unpublished gruppe is closed to its fadderbarn, messages included:
        // the announcements are written by the faddere before release, and
        // reading them would give away the gruppe the page still hides.
        const published = await areGrupperPublished(ctx.db);
        if (!canSeeGruppe({ role: membership.role, published })) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Faddergruppene er ikke publisert enda",
          });
        }
      }

      return ctx.db.groupMessage.findMany({
        where: { gruppeId: input.gruppeId, channel: input.channel },
        include: {
          author: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  /**
   * Post a message to a group.
   * ANNOUNCEMENT channel: only FADDER role or admin.
   * CHAT channel: any member (FADDER or FADDERBARN) or admin.
   */
  postMessage: verifiedProcedure
    .input(
      z.object({
        gruppeId: z.string(),
        content: z.string().min(1).max(2000),
        channel: channelSchema.default("ANNOUNCEMENT"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const isAdmin = ctx.session.user.isAdmin;

      if (!isAdmin) {
        const membership = await ctx.db.fadderGruppeMember.findUnique({
          where: {
            userId_gruppeId: {
              userId: ctx.session.user.id,
              gruppeId: input.gruppeId,
            },
          },
        });
        if (!membership) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Du har ikke tilgang til denne gruppen",
          });
        }
        if (input.channel === "ANNOUNCEMENT" && membership.role !== "FADDER") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Kun faddere kan poste meldinger",
          });
        }
        const published = await areGrupperPublished(ctx.db);
        if (!canSeeGruppe({ role: membership.role, published })) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Faddergruppene er ikke publisert enda",
          });
        }
      }

      const created = await ctx.db.groupMessage.create({
        data: {
          content: input.content,
          authorId: ctx.session.user.id,
          gruppeId: input.gruppeId,
          channel: input.channel,
        },
        include: {
          author: { select: { id: true, name: true } },
        },
      });

      // Faddere write their welcome messages before the grupper are released.
      // Notifying the fadderbarn then would announce the very gruppe we are
      // still hiding, so they only get pinged once publication has happened.
      const published = await areGrupperPublished(ctx.db);
      const otherMembers = await ctx.db.fadderGruppeMember.findMany({
        where: {
          gruppeId: input.gruppeId,
          userId: { not: ctx.session.user.id },
          ...(published ? {} : { role: "FADDER" as const }),
        },
        select: { userId: true },
      });

      if (otherMembers.length > 0) {
        const channelLabel =
          input.channel === "ANNOUNCEMENT" ? "kunngjøring" : "melding";
        await ctx.db.notification.createMany({
          data: otherMembers.map((member) => ({
            userId: member.userId,
            gruppeId: input.gruppeId,
            message: `${created.author.name} postet en ny ${channelLabel} i faddergruppa: "${input.content.slice(0, 80)}"`,
          })),
        });
      }

      return created;
    }),

  /** Delete a message (author or admin only) */
  deleteMessage: verifiedProcedure
    .input(z.object({ messageId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const message = await ctx.db.groupMessage.findUnique({
        where: { id: input.messageId },
      });
      if (!message) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      if (message.authorId !== ctx.session.user.id && !ctx.session.user.isAdmin) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return ctx.db.groupMessage.delete({
        where: { id: input.messageId },
      });
    }),
});
