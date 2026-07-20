import { TRPCError } from "@trpc/server";
import type { PaymentStatus } from "@prisma/client";
import { z } from "zod";
import {
  adminProcedure,
  createTRPCRouter,
} from "~/server/api/trpc";
import { generateTempPassword, hashPassword } from "~/server/auth/password";
import {
  PAYMENT_AMOUNT_ORE,
  VippsError,
  VippsNotConfiguredError,
  fetchPaymentEvents,
  fetchPaymentSnapshot,
  refundPayment,
  settlePayment,
} from "~/server/payment/vipps";

/** Translate a Vipps-layer error into the tRPC error shown to the admin. */
function toTRPCError(err: unknown): TRPCError {
  if (err instanceof TRPCError) return err;
  if (err instanceof VippsNotConfiguredError) {
    return new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err.message });
  }
  if (err instanceof VippsError) {
    return new TRPCError({ code: "BAD_GATEWAY", message: err.message });
  }
  console.error("[admin] unexpected Vipps error", err);
  return new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "Noe gikk galt mot Vipps.",
  });
}

export const adminRouter = createTRPCRouter({
  /** List all users with their verification/admin status and group memberships */
  getUsers: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.user.findMany({
      select: {
        id: true,
        tihldeUserId: true,
        name: true,
        email: true,
        klasse: true,
        studieretning: true,
        isVerified: true,
        isAdmin: true,
        hasPaid: true,
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

  /**
   * Issue a one-time local password for a user whose TIHLDE account is still
   * pending approval, so they can log in here in the meantime. Needed for
   * everyone who registered before we started storing a local hash — their
   * password only ever went to TIHLDE, so it cannot be recovered.
   *
   * The plaintext is returned once, for the admin to pass on; only the hash is
   * stored, and a successful TIHLDE login clears it again.
   */
  resetUserPassword: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const password = generateTempPassword();
      const user = await ctx.db.user.update({
        where: { id: input.userId },
        data: {
          passwordHash: await hashPassword(password),
          // Brukeren blir bedt om å bytte det ut ved neste sidelast.
          passwordIsTemporary: true,
        },
        select: { tihldeUserId: true },
      });
      return { tihldeUserId: user.tihldeUserId, password };
    }),

  /**
   * Promote or demote admin status.
   *
   * Also pins the decision via `adminOverride` so it survives the next login —
   * without it, login would re-derive admin status from TIHLDE and overwrite
   * whatever was set here.
   */
  setUserAdmin: adminProcedure
    .input(z.object({ userId: z.string(), isAdmin: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.user.update({
        where: { id: input.userId },
        data: { isAdmin: input.isAdmin, adminOverride: input.isAdmin },
      });
    }),

  /** List all faddergrupper with member counts */
  getGrupper: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.fadderGruppe.findMany({
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, studieretning: true },
            },
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

  /**
   * The combined registration/payment overview: exactly one row per registered
   * user, flat (not grouped by studieretning like `getUsers`). This is the
   * single source for the admin table, the key figures and the CSV export, so
   * the per-user payment facts are derived here rather than in the client.
   */
  getRegistrations: adminProcedure.query(async ({ ctx }) => {
    const users = await ctx.db.user.findMany({
      // Only fadderbarn pay. Admins and faddere would otherwise inflate both the
      // sign-up count and the outstanding sum with people who never owed money.
      // Users without a group are kept: an unassigned registration is a
      // fadderbarn until proven otherwise, and they are exactly who to chase.
      where: {
        isAdmin: false,
        memberships: { none: { role: "FADDER" } },
      },
      select: {
        id: true,
        name: true,
        email: true,
        klasse: true,
        studieretning: true,
        isVerified: true,
        hasPaid: true,
        createdAt: true,
        memberships: {
          select: { id: true, role: true, gruppe: { select: { id: true, name: true } } },
        },
        payments: {
          select: {
            orderId: true,
            status: true,
            amount: true,
            createdAt: true,
            capturedAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return users.map((user) => {
      const captured = user.payments.filter((p) => p.status === "CAPTURED");

      // A user can have several orders (abandoned attempts, retries). The
      // captured one is what counts; otherwise report their most recent attempt.
      const paidAt = captured.reduce<Date | null>((earliest, p) => {
        if (!p.capturedAt) return earliest;
        return !earliest || p.capturedAt < earliest ? p.capturedAt : earliest;
      }, null);

      const amountPaid = captured.reduce((sum, p) => sum + p.amount, 0);
      const latest = user.payments[0];
      const membership = user.memberships[0];

      const paymentStatus: PaymentStatus | null =
        captured.length > 0 ? "CAPTURED" : (latest?.status ?? null);

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        klasse: user.klasse,
        studieretning: user.studieretning,
        isVerified: user.isVerified,
        hasPaid: user.hasPaid,
        registeredAt: user.createdAt,
        gruppe: membership?.gruppe.name ?? null,
        rolle: membership?.role ?? null,
        paymentStatus,
        paidAt,
        amountPaid,
        orderId: captured[0]?.orderId ?? latest?.orderId ?? null,
        attemptCount: user.payments.length,
      };
    });
  }),

  /** Raw Vipps orders (a user may have several), newest first. */
  getPayments: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.payment.findMany({
      select: {
        id: true,
        orderId: true,
        status: true,
        amount: true,
        createdAt: true,
        capturedAt: true,
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  /** Live status and event timeline for one order, straight from Vipps. */
  getPaymentDetails: adminProcedure
    .input(z.object({ orderId: z.string() }))
    .query(async ({ input }) => {
      try {
        const [snapshot, events] = await Promise.all([
          fetchPaymentSnapshot(input.orderId),
          fetchPaymentEvents(input.orderId),
        ]);
        return { snapshot, events };
      } catch (err) {
        throw toTRPCError(err);
      }
    }),

  /**
   * Refund one order in full and unmark the user as paid. Irreversible — the
   * money leaves the merchant account — so the client must confirm first.
   * All the guards (nothing captured, already refunded) live in the Vipps
   * layer, which reads the live payment before moving anything.
   */
  refundPayment: adminProcedure
    .input(z.object({ orderId: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const order = await ctx.db.payment.findUnique({
        where: { orderId: input.orderId },
        select: { user: { select: { name: true } } },
      });

      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Fant ingen betaling med denne referansen.",
        });
      }

      try {
        const { refunded } = await refundPayment(input.orderId);
        console.warn(
          `[admin] refunded ${refunded} øre for ${input.orderId} (${order.user.name}) by ${ctx.session.user.id}`,
        );
        return { refunded, name: order.user.name };
      } catch (err) {
        throw toTRPCError(err);
      }
    }),

  /**
   * Reconcile every unsettled order against Vipps. The webhook normally does
   * this, so this is the manual catch-up for orders whose webhook never landed.
   * One failing order must not abort the run — mirrors `payment.checkMyPayment`.
   */
  syncPayments: adminProcedure.mutation(async ({ ctx }) => {
    const orders = await ctx.db.payment.findMany({
      where: { status: { in: ["CREATED", "AUTHORIZED"] } },
      select: { orderId: true },
      orderBy: { createdAt: "desc" },
    });

    let settled = 0;
    let failed = 0;

    for (const order of orders) {
      try {
        const { paid } = await settlePayment(order.orderId);
        if (paid) settled += 1;
      } catch (err) {
        failed += 1;
        console.error("[admin] settle failed for", order.orderId, err);
      }
    }

    return { checked: orders.length, settled, failed };
  }),

  /** Fadderuka price in øre, so the client doesn't hardcode the amount. */
  getPaymentAmount: adminProcedure.query(() => ({ amountOre: PAYMENT_AMOUNT_ORE })),
});
