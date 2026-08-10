import { headers } from "next/headers";
import { cache } from "react";
import { auth } from "~/server/auth/config";
import { db } from "~/server/db";

const getHeaderUserContext = cache(async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const isGruppeMember = session?.user
    ? !!(await db.fadderGruppeMember.findFirst({
        where: { userId: session.user.id },
        select: { id: true },
      }))
    : false;

  return {
    session,
    isGruppeMember,
  };
});

export default getHeaderUserContext;
