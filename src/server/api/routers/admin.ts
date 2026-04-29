import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  adminProcedure,
  createTRPCRouter,
} from "~/server/api/trpc";

export const adminRouter = createTRPCRouter({
  /** List all users with their verification/admin status and group memberships */
  getUsers: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        klasse: true,
        studieretning: true,
        isVerified: true,
        isAdmin: true,
        createdAt: true,
        memberships: {
          select: {
            id: true,
            role: true,
            gruppe: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  /** Verify or unverify a user */
  setUserVerified: adminProcedure
    .input(z.object({ userId: z.string(), isVerified: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.user.update({
        where: { id: input.userId },
        data: { isVerified: input.isVerified },
      });
    }),

  /** Promote or demote admin status */
  setUserAdmin: adminProcedure
    .input(z.object({ userId: z.string(), isAdmin: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.user.update({
        where: { id: input.userId },
        data: { isAdmin: input.isAdmin },
      });
    }),

  /** List all faddergrupper with member counts */
  getGrupper: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.fadderGruppe.findMany({
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        _count: { select: { messages: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  }),

  /** Create a new faddergruppe */
  createGruppe: adminProcedure
    .input(z.object({ name: z.string().min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.fadderGruppe.create({
        data: { name: input.name },
      });
    }),

  /** Rename a faddergruppe */
  updateGruppe: adminProcedure
    .input(z.object({ gruppeId: z.string(), name: z.string().min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.fadderGruppe.update({
        where: { id: input.gruppeId },
        data: { name: input.name },
      });
    }),

  /** Delete a faddergruppe and all its memberships/messages */
  deleteGruppe: adminProcedure
    .input(z.object({ gruppeId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.fadderGruppe.delete({
        where: { id: input.gruppeId },
      });
    }),

  /** Add a user to a faddergruppe with a role */
  addMember: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        gruppeId: z.string(),
        role: z.enum(["FADDER", "FADDERBARN"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.fadderGruppeMember.findUnique({
        where: {
          userId_gruppeId: {
            userId: input.userId,
            gruppeId: input.gruppeId,
          },
        },
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Brukeren er allerede medlem av denne gruppen",
        });
      }
      return ctx.db.fadderGruppeMember.create({
        data: {
          userId: input.userId,
          gruppeId: input.gruppeId,
          role: input.role,
        },
      });
    }),

  /** Remove a member from a faddergruppe */
  removeMember: adminProcedure
    .input(z.object({ membershipId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.fadderGruppeMember.delete({
        where: { id: input.membershipId },
      });
    }),

  /** Change a member's role within a group */
  updateMemberRole: adminProcedure
    .input(
      z.object({
        membershipId: z.string(),
        role: z.enum(["FADDER", "FADDERBARN"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.fadderGruppeMember.update({
        where: { id: input.membershipId },
        data: { role: input.role },
      });
    }),

  /** Permanently delete an unverified user and all their data */
  deleteUser: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: input.userId },
        select: { isVerified: true },
      });
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Bruker ikke funnet" });
      }
      if (user.isVerified) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Kan ikke slette verifiserte brukere",
        });
      }
      return ctx.db.user.delete({ where: { id: input.userId } });
    }),

  /** Verify a user and assign them to a faddergruppe as FADDERBARN in one step */
  verifyAndAssign: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        gruppeId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.user.update({
        where: { id: input.userId },
        data: { isVerified: true },
      });
      // Only create membership if not already a member
      const existing = await ctx.db.fadderGruppeMember.findUnique({
        where: {
          userId_gruppeId: {
            userId: input.userId,
            gruppeId: input.gruppeId,
          },
        },
      });
      if (!existing) {
        await ctx.db.fadderGruppeMember.create({
          data: {
            userId: input.userId,
            gruppeId: input.gruppeId,
            role: "FADDERBARN",
          },
        });
      }
      return { success: true };
    }),
});
