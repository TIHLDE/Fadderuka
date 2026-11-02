import { z } from "zod";

import { GENDER_VALUES } from "~/lib/gender";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

/**
 * What a user may change about themselves.
 *
 * `protectedProcedure`, not `verifiedProcedure`: answering about yourself is
 * not fadderuka content, and a TIHLDE login that has not paid yet must still be
 * able to answer the gender prompt.
 */
export const profileRouter = createTRPCRouter({
  /** Set the signed-in user's own gender (#145). Never anyone else's. */
  setGender: protectedProcedure
    .input(z.object({ gender: z.enum(GENDER_VALUES) }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: { gender: input.gender },
        select: { gender: true },
      });
      return user;
    }),
});
