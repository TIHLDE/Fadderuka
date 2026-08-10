// Must come first: sets DATABASE_URL and the fake service URLs before `~/env`
// is imported (and validated) anywhere downstream.
import "./env";

import { afterAll, afterEach, beforeEach } from "vitest";

import { db, resetDb } from "./helpers/db";
import { fetchMock, installFetchMock } from "./helpers/fetch-mock";

installFetchMock();

beforeEach(async () => {
  await resetDb();
  fetchMock.reset();
});

afterEach(() => {
  fetchMock.reset();
});

afterAll(async () => {
  await db.$disconnect();
});
