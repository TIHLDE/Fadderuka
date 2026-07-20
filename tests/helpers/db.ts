import { db } from "~/server/db";

/**
 * Every table, ordered so the single TRUNCATE covers them all. CASCADE handles
 * the foreign keys, but listing them explicitly keeps the reset honest: a new
 * model that isn't added here will show up as leaked rows between tests.
 */
const TABLES = [
  "LoginAttempt",
  "Payment",
  "Notification",
  "GroupMessage",
  "FadderGruppeMember",
  "Session",
  "Post",
  "Activity",
  "FadderGruppe",
  "User",
] as const;

/** Wipe all data between tests. Fast enough to run per test. */
export async function resetDb(): Promise<void> {
  await db.$executeRawUnsafe(
    `TRUNCATE TABLE ${TABLES.map((t) => `"${t}"`).join(", ")} RESTART IDENTITY CASCADE`,
  );
}

let seq = 0;
/** Unique-per-run suffix so parallel-ish fixtures never collide on unique keys. */
const uniq = () => `${Date.now().toString(36)}${(seq += 1)}`;

export async function createUser(
  overrides: Partial<{
    tihldeUserId: string;
    name: string;
    email: string | null;
    isAdmin: boolean;
    adminOverride: boolean | null;
    isVerified: boolean;
    hasPaid: boolean;
    studieretning: string | null;
    klasse: string | null;
    passwordHash: string | null;
    passwordIsTemporary: boolean;
    createdAt: Date;
  }> = {},
) {
  const id = uniq();
  return db.user.create({
    data: {
      tihldeUserId: overrides.tihldeUserId ?? `bruker${id}`,
      name: overrides.name ?? `Test Bruker ${id}`,
      email: overrides.email === undefined ? `${id}@test.no` : overrides.email,
      isAdmin: overrides.isAdmin ?? false,
      adminOverride: overrides.adminOverride ?? null,
      isVerified: overrides.isVerified ?? false,
      hasPaid: overrides.hasPaid ?? false,
      studieretning: overrides.studieretning ?? null,
      klasse: overrides.klasse ?? null,
      passwordHash: overrides.passwordHash ?? null,
      passwordIsTemporary: overrides.passwordIsTemporary ?? false,
      ...(overrides.createdAt ? { createdAt: overrides.createdAt } : {}),
    },
  });
}

export async function createAdmin(
  overrides: Parameters<typeof createUser>[0] = {},
) {
  return createUser({ isAdmin: true, isVerified: true, hasPaid: true, ...overrides });
}

export async function createGruppe(name?: string) {
  return db.fadderGruppe.create({ data: { name: name ?? `Gruppe ${uniq()}` } });
}

export async function addMember(
  userId: string,
  gruppeId: string,
  role: "FADDER" | "FADDERBARN",
) {
  return db.fadderGruppeMember.create({ data: { userId, gruppeId, role } });
}

export async function createPayment(
  userId: string,
  overrides: Partial<{
    orderId: string;
    status:
      | "CREATED"
      | "AUTHORIZED"
      | "CAPTURED"
      | "ABORTED"
      | "EXPIRED"
      | "TERMINATED"
      | "FAILED"
      | "REFUNDED";
    amount: number;
    capturedAt: Date | null;
    createdAt: Date;
  }> = {},
) {
  return db.payment.create({
    data: {
      orderId: overrides.orderId ?? `fadderuka-${userId}-${uniq()}`,
      userId,
      amount: overrides.amount ?? 38_000,
      status: overrides.status ?? "CREATED",
      capturedAt: overrides.capturedAt ?? null,
      ...(overrides.createdAt ? { createdAt: overrides.createdAt } : {}),
    },
  });
}

export { db };
