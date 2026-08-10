import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { isPaymentExempt } from "~/server/fadder";
import {
  PAYMENT_AMOUNT_ORE,
  VippsError,
  VippsNotConfiguredError,
  buildOrderId,
  buildPaymentDescription,
  createPayment,
  parseUserIdFromOrderId,
  settlePayment,
} from "~/server/payment/vipps";

/**
 * How long an unfinished order is reused instead of a new one being minted.
 * Long enough to cover a user bouncing between tabs or retrying after a failed
 * redirect, short enough that a genuinely abandoned order doesn't block a fresh
 * attempt later in the day.
 */
const OPEN_ORDER_REUSE_MS = 30 * 60 * 1000;

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
      select: {
        hasPaid: true,
        isVerified: true,
        isAdmin: true,
        isFadder: true,
      },
    });
    return {
      hasPaid: user?.hasPaid ?? false,
      isVerified: user?.isVerified ?? false,
      // Drives the client: an exempt user must never be shown a payment
      // prompt, so the overlay asks for this rather than inferring it.
      isExempt: user ? isPaymentExempt(user) : false,
    };
  }),

  // Starts a Vipps payment for the signed-in user and returns the URL to
  // redirect them to. No phone number is collected — Vipps prompts for it on
  // its own checkout page in the WEB_REDIRECT flow.
  initiatePayment: protectedProcedure.mutation(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: {
        hasPaid: true,
        name: true,
        isAdmin: true,
        isFadder: true,
      },
    });

    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Bruker ikke funnet" });
    }

    // Faddere and admins owe nothing, and this is the guard that makes that
    // true rather than merely displayed: hiding the button in the UI would
    // still leave the mutation callable, and taking a fadder's money is the
    // one outcome this flow must make impossible.
    if (isPaymentExempt(user)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Faddere betaler ikke for fadderuka.",
      });
    }

    if (user.hasPaid) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Du har allerede betalt",
      });
    }

    // Reuse an order this user already has open instead of minting a second
    // one. Two tabs (or an impatient double-click) otherwise produce two live
    // Vipps references, and both can be authorised and later captured — the
    // user pays twice. `createPayment` is idempotent per reference on Vipps'
    // side, so handing back the same order is safe.
    const openOrder = await ctx.db.payment.findFirst({
      where: {
        userId: ctx.session.user.id,
        status: "CREATED",
        createdAt: { gte: new Date(Date.now() - OPEN_ORDER_REUSE_MS) },
      },
      orderBy: { createdAt: "desc" },
      select: { orderId: true },
    });

    const orderId = openOrder?.orderId ?? buildOrderId(ctx.session.user.id);

    try {
      // Payer's name in the description so the Vipps portal shows who paid.
      const payment = await createPayment(orderId, {
        paymentDescription: buildPaymentDescription({ name: user.name }),
      });

      // Persist the order so the callback and webhook can settle it, and so
      // "Jeg har allerede betalt" can re-check this user's own payments.
      if (!openOrder) {
        await ctx.db.payment.create({
          data: {
            orderId,
            userId: ctx.session.user.id,
            amount: PAYMENT_AMOUNT_ORE,
          },
        });
      }

      return { redirectUrl: payment.redirectUrl };
    } catch (err) {
      throw toTRPCError(err);
    }
  }),

  // Fallback for when the Vipps redirect never returns the user to us (they
  // closed the app, lost connection, etc.). We settle *this* user's own
  // pending orders against Vipps — the API, not any client input, is the proof
  // of payment, so this needs no arguments.
  checkMyPayment: protectedProcedure.mutation(async ({ ctx }) => {
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
