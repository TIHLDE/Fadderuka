import "server-only";

import { Prisma } from "@prisma/client";

/**
 * Recognising the database errors a user can actually cause.
 *
 * Without this every Prisma failure lands in a route's catch-all and comes out
 * as "Noe gikk galt" — which is how a student who was simply already
 * registered ended up stuck at a stand, retrying a form that could never
 * succeed. A unique-constraint violation is not an internal error; it is the
 * database telling us something specific and repeatable about the request.
 */

/** Prisma's code for "unique constraint failed". */
const UNIQUE_CONSTRAINT = "P2002";

/** Whether this error is a unique-constraint violation. */
export function isUniqueConstraintError(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === UNIQUE_CONSTRAINT
  );
}

/**
 * Which form field a unique-constraint violation belongs to, so the client can
 * highlight it. Prisma reports the offending columns in `meta.target`; we map
 * the ones that correspond to something the user typed.
 */
export function uniqueConstraintField(err: unknown): string | undefined {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError)) return undefined;

  const target = err.meta?.target;
  const columns = Array.isArray(target)
    ? target.map(String)
    : typeof target === "string"
      ? [target]
      : [];

  if (columns.includes("email")) return "email";
  if (columns.includes("tihldeUserId")) return "user_id";
  return undefined;
}
