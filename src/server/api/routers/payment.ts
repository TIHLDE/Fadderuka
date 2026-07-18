import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  PAYMENT_AMOUNT_ORE,
  VippsError,
  VippsNotConfiguredError,
  buildOrderId,
  createPayment,
  parseUserIdFromOrderId,
  settlePayment,
} from "~/server/payment/vipps";

const phoneInput = z.object({
  phoneNumber: z.string().regex(/^\d{8}$/, "Telefonnummeret må være 8 siffer"),
});

/** Translate a Vipps-layer error into the tRPC error shown to the client. */
function toTRPCError(err: unknown): TRPCError {
  if (err instanceof TRPCError) return err;
  if (err instanceof VippsNotConfiguredError) {
    return new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err.message });
  }
  if (err instanceof VippsError) {
    return new TRPCError({ code: "BAD_GATEWAY", message: err.message });
  }
  console.error("[payment] unexpected error", err);
  return new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "Noe gikk galt med betalingen.",
  });
}

export const paymentRouter = createTRPCRouter({
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: { hasPaid: true, isVerified: true },
    });
    return {
      hasPaid: user?.hasPaid ?? false,
      isVerified: user?.isVerified ?? false,
    };
  }),

  initiatePayment: protectedProcedure
    .input(phoneInput)
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { hasPaid: true },
      });

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Bruker ikke funnet" });
      }

      if (user.hasPaid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Du har allerede betalt",
        });
      }

      await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: { phone: input.phoneNumber },
      });

      const orderId = buildOrderId(ctx.session.user.id);

      try {
        const payment = await createPayment(input.phoneNumber, orderId);

        // Persist the order so the callback and webhook can settle it, and so
        // "Jeg har allerede betalt" can re-check this user's own payments.
        await ctx.db.payment.create({
          data: {
            orderId,
            userId: ctx.session.user.id,
            phone: input.phoneNumber,
            amount: PAYMENT_AMOUNT_ORE,
          },
        });

        return { redirectUrl: payment.redirectUrl };
      } catch (err) {
        throw toTRPCError(err);
      }
    }),

  // Fallback for when the Vipps redirect never returns the user to us (they
  // closed the app, lost connection, etc.). We only ever settle *this* user's
  // own orders against Vipps — never trust a phone number as proof of payment.
  checkPaymentByPhone: protectedProcedure
    .input(phoneInput)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: { phone: input.phoneNumber },
      });

      const orders = await ctx.db.payment.findMany({
        where: {
          userId: ctx.session.user.id,
          status: { in: ["CREATED", "AUTHORIZED"] },
        },
        orderBy: { createdAt: "desc" },
        select: { orderId: true },
      });

      for (const order of orders) {
        try {
          const { paid } = await settlePayment(order.orderId);
          if (paid) return { found: true };
        } catch (err) {
          // A single unsettleable order shouldn't abort the whole check.
          console.error("[payment] settle failed for", order.orderId, err);
        }
      }

      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { hasPaid: true },
      });
      return { found: user?.hasPaid ?? false };
    }),

  confirmPayment: protectedProcedure
    .input(z.object({ orderId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // The order must belong to the authenticated user.
      if (parseUserIdFromOrderId(input.orderId) !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Ugyldig ordre" });
      }

      try {
        const { paid, state } = await settlePayment(input.orderId);
        if (!paid) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Betaling ikke bekreftet av Vipps (status: ${state})`,
          });
        }
        return { success: true };
      } catch (err) {
        throw toTRPCError(err);
      }
    }),
});
