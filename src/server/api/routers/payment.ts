import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";
import { env } from "~/env";

// Vipps ePayment API docs: https://developer.vippsmobilepay.com/docs/APIs/epayment-api/

async function getVippsAccessToken(): Promise<string> {
  if (
    !env.VIPPS_CLIENT_ID ||
    !env.VIPPS_CLIENT_SECRET ||
    !env.VIPPS_SUBSCRIPTION_KEY ||
    !env.VIPPS_API_URL
  ) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Vipps er ikke konfigurert på serveren",
    });
  }

  const response = await fetch(`${env.VIPPS_API_URL}/accesstoken/get`, {
    method: "POST",
    headers: {
      client_id: env.VIPPS_CLIENT_ID,
      client_secret: env.VIPPS_CLIENT_SECRET,
      "Ocp-Apim-Subscription-Key": env.VIPPS_SUBSCRIPTION_KEY,
      "Merchant-Serial-Number": env.VIPPS_MERCHANT_SERIAL_NUMBER ?? "",
    },
  });

  if (!response.ok) {
    const body = await response.text();
    console.error("Vipps access token error:", response.status, body);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Kunne ikke hente Vipps tilgangstoken",
    });
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

async function createVippsPayment(
  phoneNumber: string,
  orderId: string,
): Promise<{ redirectUrl: string }> {
  if (
    !env.VIPPS_API_URL ||
    !env.VIPPS_SUBSCRIPTION_KEY ||
    !env.VIPPS_MERCHANT_SERIAL_NUMBER ||
    !env.VIPPS_CALLBACK_URL
  ) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Vipps er ikke konfigurert på serveren",
    });
  }

  const accessToken = await getVippsAccessToken();

  const response = await fetch(`${env.VIPPS_API_URL}/epayment/v1/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Ocp-Apim-Subscription-Key": env.VIPPS_SUBSCRIPTION_KEY,
      "Merchant-Serial-Number": env.VIPPS_MERCHANT_SERIAL_NUMBER,
      "Idempotency-Key": orderId,
    },
    body: JSON.stringify({
      amount: { currency: "NOK", value: 30000 }, // 300 NOK in øre
      paymentMethod: { type: "WALLET" },
      customer: { phoneNumber: `47${phoneNumber}` }, // E.164 format
      reference: orderId,
      returnUrl: `${env.VIPPS_CALLBACK_URL}/payment/callback?orderId=${orderId}`,
      userFlow: "WEB_REDIRECT",
      paymentDescription: "Fadderuka - TIHLDE",
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error("Vipps create payment error:", response.status, body);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Kunne ikke opprette Vipps betaling",
    });
  }

  const data = (await response.json()) as { redirectUrl: string };
  return { redirectUrl: data.redirectUrl };
}

async function getVippsPaymentStatus(orderId: string): Promise<string> {
  if (
    !env.VIPPS_API_URL ||
    !env.VIPPS_SUBSCRIPTION_KEY ||
    !env.VIPPS_MERCHANT_SERIAL_NUMBER
  ) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Vipps er ikke konfigurert på serveren",
    });
  }

  const accessToken = await getVippsAccessToken();

  const response = await fetch(
    `${env.VIPPS_API_URL}/epayment/v1/payments/${orderId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Ocp-Apim-Subscription-Key": env.VIPPS_SUBSCRIPTION_KEY,
        "Merchant-Serial-Number": env.VIPPS_MERCHANT_SERIAL_NUMBER,
      },
    },
  );

  if (!response.ok) {
    const body = await response.text();
    console.error("Vipps payment status error:", response.status, body);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Kunne ikke hente betalingsstatus fra Vipps",
    });
  }

  const data = (await response.json()) as { state: string };
  return data.state;
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
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bruker ikke funnet",
        });
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

      const orderId = `fadderuka-${ctx.session.user.id}-${Date.now()}`;
      const payment = await createVippsPayment(input.phoneNumber, orderId);

      return { redirectUrl: payment.redirectUrl };
    }),

  checkPaymentByPhone: protectedProcedure
    .input(
      z.object({
        phoneNumber: z
          .string()
          .regex(/^\d{8}$/, "Telefonnummeret må være 8 siffer"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const paidUser = await ctx.db.user.findFirst({
        where: {
          phone: input.phoneNumber,
          hasPaid: true,
        },
        select: { id: true },
      });

      if (paidUser) {
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

  confirmPayment: protectedProcedure
    .input(z.object({ orderId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // orderId format: fadderuka-{userId}-{timestamp}
      // Ensure this order belongs to the authenticated user
      if (!input.orderId.includes(ctx.session.user.id)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Ugyldig ordre",
        });
      }

      const state = await getVippsPaymentStatus(input.orderId);

      if (state !== "AUTHORIZED" && state !== "CAPTURED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Betaling ikke bekreftet av Vipps (status: ${state})`,
        });
      }

      await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: { hasPaid: true, isVerified: true },
      });

      return { success: true };
    }),
});
