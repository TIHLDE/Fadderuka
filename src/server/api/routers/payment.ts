import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

/**
 * -------------------------------------------------------
 * Vipps API Placeholder
 * -------------------------------------------------------
 * Replace these functions with actual Vipps ePayment API
 * calls once you have your API keys configured.
 *
 * Vipps ePayment API docs:
 * https://developer.vippsmobilepay.com/docs/APIs/epayment-api/
 *
 * Required env vars (see .env):
 *   VIPPS_CLIENT_ID
 *   VIPPS_CLIENT_SECRET
 *   VIPPS_MERCHANT_SERIAL_NUMBER
 *   VIPPS_SUBSCRIPTION_KEY
 *   VIPPS_API_URL          (e.g. https://api.vipps.no)
 *   VIPPS_CALLBACK_URL     (your callback endpoint)
 * -------------------------------------------------------
 */

// TODO: Replace with actual Vipps access token retrieval
// POST {VIPPS_API_URL}/accesstoken/get
// Headers: client_id, client_secret, Ocp-Apim-Subscription-Key
async function _getVippsAccessToken(): Promise<string> {
  // const response = await fetch(`${env.VIPPS_API_URL}/accesstoken/get`, {
  //   method: "POST",
  //   headers: {
  //     "client_id": env.VIPPS_CLIENT_ID,
  //     "client_secret": env.VIPPS_CLIENT_SECRET,
  //     "Ocp-Apim-Subscription-Key": env.VIPPS_SUBSCRIPTION_KEY,
  //     "Merchant-Serial-Number": env.VIPPS_MERCHANT_SERIAL_NUMBER,
  //   },
  // });
  // const data = await response.json();
  // return data.access_token;
  return "placeholder-access-token";
}

// TODO: Replace with actual Vipps ePayment create call
// POST {VIPPS_API_URL}/epayment/v1/payments
async function _createVippsPayment(_phoneNumber: string, _orderId: string) {
  // const accessToken = await getVippsAccessToken();
  // const response = await fetch(`${env.VIPPS_API_URL}/epayment/v1/payments`, {
  //   method: "POST",
  //   headers: {
  //     "Authorization": `Bearer ${accessToken}`,
  //     "Content-Type": "application/json",
  //     "Ocp-Apim-Subscription-Key": env.VIPPS_SUBSCRIPTION_KEY,
  //     "Merchant-Serial-Number": env.VIPPS_MERCHANT_SERIAL_NUMBER,
  //     "Idempotency-Key": orderId,
  //   },
  //   body: JSON.stringify({
  //     amount: { currency: "NOK", value: 30000 }, // 300 NOK in øre
  //     paymentMethod: { type: "WALLET" },
  //     customer: { phoneNumber },
  //     reference: orderId,
  //     returnUrl: `${env.VIPPS_CALLBACK_URL}/payment/callback?orderId=${orderId}`,
  //     userFlow: "WEB_REDIRECT",
  //     paymentDescription: "Fadderuka - TIHLDE",
  //   }),
  // });
  // const data = await response.json();
  // return data.redirectUrl;
  return {
    redirectUrl: "https://api.vipps.no/placeholder-redirect",
  };
}

export const paymentRouter = createTRPCRouter({
  /**
   * Get the current user's payment status.
   */
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: { hasPaid: true, isVerified: true, phone: true },
    });
    return {
      hasPaid: user?.hasPaid ?? false,
      isVerified: user?.isVerified ?? false,
    };
  }),

  /**
   * Initiate a Vipps payment for the current user.
   * Returns a redirect URL to Vipps checkout.
   */
  initiatePayment: protectedProcedure
    .input(
      z.object({
        phoneNumber: z
          .string()
          .regex(/^\d{8}$/, "Telefonnummeret må være 8 siffer"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
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

      // Save phone number to user profile
      await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: { phone: input.phoneNumber },
      });

      const orderId = `fadderuka-${ctx.session.user.id}-${Date.now()}`;

      // TODO: Replace with actual Vipps API call
      const payment = await _createVippsPayment(input.phoneNumber, orderId);

      return { redirectUrl: payment.redirectUrl };
    }),

  /**
   * Check if a phone number is already registered as paid.
   * Used for the "Jeg har allerede betalt" flow.
   */
  checkPaymentByPhone: protectedProcedure
    .input(
      z.object({
        phoneNumber: z
          .string()
          .regex(/^\d{8}$/, "Telefonnummeret må være 8 siffer"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Look up if any user with this phone number has paid
      const paidUser = await ctx.db.user.findFirst({
        where: {
          phone: input.phoneNumber,
          hasPaid: true,
        },
        select: { id: true },
      });

      if (paidUser) {
        // Mark the current user as paid and verified
        await ctx.db.user.update({
          where: { id: ctx.session.user.id },
          data: {
            hasPaid: true,
            isVerified: true,
            phone: input.phoneNumber,
          },
        });
        return { found: true };
      }

      return { found: false };
    }),

  /**
   * Vipps payment callback handler.
   * Called after Vipps redirects back or via webhook.
   *
   * TODO: In production, verify the payment status with Vipps API:
   * GET {VIPPS_API_URL}/epayment/v1/payments/{reference}
   * and check that state === "AUTHORIZED" or "CAPTURED"
   */
  confirmPayment: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        orderId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // TODO: Verify payment with Vipps API before marking as paid
      // const accessToken = await getVippsAccessToken();
      // const response = await fetch(
      //   `${env.VIPPS_API_URL}/epayment/v1/payments/${input.orderId}`,
      //   { headers: { Authorization: `Bearer ${accessToken}`, ... } }
      // );
      // const data = await response.json();
      // if (data.state !== "AUTHORIZED" && data.state !== "CAPTURED") {
      //   throw new TRPCError({ code: "BAD_REQUEST", message: "Betaling ikke bekreftet" });
      // }

      await ctx.db.user.update({
        where: { id: input.userId },
        data: {
          hasPaid: true,
          isVerified: true,
        },
      });

      return { success: true };
    }),
});
