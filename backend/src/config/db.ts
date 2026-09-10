import mongoose, { type Connection } from "mongoose";
import { env } from "./env";
import { logger } from "../lib/logger";

/**
 * Named MongoDB connections. The legacy server created a full Mongoose instance
 * per database; here each database is a lazy `createConnection` on the shared
 * mongoose module, and every model registers itself on the connection it
 * belongs to (e.g. `dbMain.model("User", userSchema)`).
 */
const create = (label: string, uri: string): Connection => {
  const conn = mongoose.createConnection(uri);
  conn.on("connected", () => logger.info(`MongoDB [${label}] connected: ${conn.host}`));
  conn.on("error", (err) => logger.error({ err }, `MongoDB [${label}] connection error`));
  conn.on("disconnected", () => logger.warn(`MongoDB [${label}] disconnected`));
  return conn;
};

export const dbMain = create("vedic-vaibhav-main", env.db.main);
export const dbJyotirling = create("jyotirling", env.db.jyotirling);
export const dbPartnerAffiliate = create("partner-affiliate", env.db.partnerAffiliate);

const all: ReadonlyArray<Connection> = [
  dbMain,
  dbJyotirling,
  dbPartnerAffiliate,
];

/** Await every connection; the server refuses to start if any database is down. */
export const connectAllDatabases = async (): Promise<void> => {
  await Promise.all(all.map((conn) => conn.asPromise()));
};

/** Graceful shutdown — close every open connection. */
export const disconnectAllDatabases = async (): Promise<void> => {
  await Promise.all(all.map((conn) => conn.close()));
};
