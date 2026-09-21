import mongoose, { type Connection } from "mongoose";
import { env } from "./env";
import { logger } from "../lib/logger";

/**
 * Named MongoDB connections. The legacy server created a full Mongoose instance
 * per database; here each database is a lazy `createConnection` on the shared
 * mongoose module, and every model registers itself on the connection it
 * belongs to (e.g. `dbMain.model("User", userSchema)`).
 */
type Database = { readonly label: string; readonly uri: string; readonly conn: Connection };

/** Populated by `create` — the URI is kept so a failed connection can be re-opened. */
const databases: Database[] = [];

const create = (label: string, uri: string): Connection => {
  const conn = mongoose.createConnection(uri);
  conn.on("connected", () => logger.info(`MongoDB [${label}] connected: ${conn.host}`));
  conn.on("error", (err) => logger.error({ err }, `MongoDB [${label}] connection error`));
  conn.on("disconnected", () => logger.warn(`MongoDB [${label}] disconnected`));
  databases.push({ label, uri, conn });
  return conn;
};

export const dbMain = create("vedic-vaibhav-main", env.db.main);
export const dbJyotirling = create("jyotirling", env.db.jyotirling);
export const dbPartnerAffiliate = create("partner-affiliate", env.db.partnerAffiliate);

/**
 * Backoff between boot-time connection attempts. A `mongodb+srv://` URI needs a
 * DNS SRV lookup before the driver can reach anything, and a flaky home or ISP
 * resolver answering SERVFAIL for it ("querySrv ESERVFAIL _mongodb._tcp…") used
 * to take the whole process down. Those blips clear in seconds — retry instead.
 */
const RETRY_DELAYS_MS = [1_000, 3_000, 6_000] as const;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** Bad credentials or a malformed URI will never come good — fail on the spot. */
const isPermanent = (err: unknown): boolean => {
  const { name, code } = (err ?? {}) as { name?: string; code?: unknown };
  // 18 = AuthenticationFailed, 8000 = Atlas "bad auth".
  return name === "MongoParseError" || code === 18 || code === 8000;
};

const connect = async ({ label, uri, conn }: Database): Promise<void> => {
  for (let attempt = 0; ; attempt++) {
    try {
      // `create` already started dialing, so the first attempt only awaits that;
      // later ones re-open the same connection object (models stay bound to it).
      await (attempt === 0 ? conn.asPromise() : conn.openUri(uri));
      return;
    } catch (err) {
      if (isPermanent(err) || attempt >= RETRY_DELAYS_MS.length) throw err;
      const delay = RETRY_DELAYS_MS[attempt];
      logger.warn(
        { err },
        `MongoDB [${label}] connection attempt ${attempt + 1} failed — retrying in ${delay}ms`,
      );
      await sleep(delay);
    }
  }
};

/** Await every connection; the server refuses to start if any database is down. */
export const connectAllDatabases = async (): Promise<void> => {
  await Promise.all(databases.map((db) => connect(db)));
};

/** Graceful shutdown — close every open connection. */
export const disconnectAllDatabases = async (): Promise<void> => {
  await Promise.all(databases.map(({ conn }) => conn.close()));
};
