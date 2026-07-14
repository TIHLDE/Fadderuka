import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";

const channelSchema = z.enum(["ANNOUNCEMENT", "CHAT"]);

export const gruppeRouter = createTRPCRouter({
  /** Get the current user's faddergruppe membership(s) */
  getMyGruppe: protectedProcedure.query(async ({ ctx }) => {
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
    return membership;
  }),

  /** Get messages for a group (user must be a member or admin) */
  getMessages: protectedProcedure
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
  postMessage: protectedProcedure
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

      const otherMembers = await ctx.db.fadderGruppeMember.findMany({
        where: {
          gruppeId: input.gruppeId,
          userId: { not: ctx.session.user.id },
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
            messageId: created.id,
            message: `${created.author.name} postet en ny ${channelLabel} i faddergruppa: "${input.content.slice(0, 80)}"`,
          })),
        });
      }

      return created;
    }),

  /** Delete a message (author or admin only) */
  deleteMessage: protectedProcedure
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
