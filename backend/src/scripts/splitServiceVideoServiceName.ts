/**
 * Split `links.service` into the service a video belongs to and the offering's
 * own name.
 *
 * The admin tool stored the offering's name in `service` ("Shri Krishna
 * Janmashtami Special Chadhava"), which the website reads as the service type —
 * so those videos never reached the profile. For every row this sets:
 *   service     → "chadhava" / "puja", via `classifyService` (same rule as the API)
 *   serviceName → the name that was in `service`; failing that, the name of the
 *                 devotee's matching chadhava booking
 * and removes the hand-typed `"service "` key (trailing space) once read.
 *
 * Run it only AFTER the admin tool matches rows on `serviceName`: the old tool
 * matches Excel rows on `service`, and would insert a second copy of every
 * migrated row the next time a sheet names that service.
 *
 * Idempotent — a clean row is left alone, so re-running picks up only rows
 * written since. Rows it cannot classify, or whose `serviceName` already holds
 * a different name, are listed and left untouched. `--apply` first writes the
 * old values of every row it changes to a JSON file in the OS temp folder.
 *
 * Run from the backend/ folder:
 *   pnpm tsx src/scripts/splitServiceVideoServiceName.ts            (dry run)
 *   pnpm tsx src/scripts/splitServiceVideoServiceName.ts --apply    (writes)
 */

import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { mongo } from "mongoose";
import { dbMain, disconnectAllDatabases } from "../config/db";
import { normalizePhone } from "../config/currency";
import { logger } from "../lib/logger";
import ServiceVideo from "../modules/content/serviceVideo.model";
import NewChadhavaBooking from "../modules/chadhava/newChadhavaBooking.model";
import {
  classifyService,
  isServiceType,
  rawServiceOf,
  serviceNameOf,
} from "../modules/content/serviceVideo.helpers";

type RawLink = {
  _id: mongo.ObjectId;
  number?: string;
  orderId?: string;
  service?: string;
  serviceName?: string;
  "service "?: string;
};

type Booking = { orderID?: string; whatsapp?: string; puja?: { chadhavaName?: string } };

const chunk = <T>(items: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
};

/** Bookings are matched on phone AND order id: some rows carry another devotee's order id. */
const bookingKey = (phone: unknown, orderId: unknown): string =>
  `${normalizePhone(phone)}|${String(orderId ?? "").trim()}`;

const run = async (): Promise<void> => {
  const apply = process.argv.includes("--apply");

  logger.info("Connecting to MongoDB (main)...");
  await dbMain.asPromise();

  const docs = await ServiceVideo.find({}).lean<RawLink[]>();

  const orderIds = [...new Set(docs.map((d) => String(d.orderId ?? "").trim()).filter(Boolean))];
  const bookings = new Map<string, Booking>();
  for (const part of chunk(orderIds, 500)) {
    const found = await NewChadhavaBooking.find({ orderID: { $in: part } })
      .select({ orderID: 1, whatsapp: 1, "puja.chadhavaName": 1 })
      .lean<Booking[]>();
    for (const b of found) bookings.set(bookingKey(b.whatsapp, b.orderID), b);
  }

  const ops: mongo.AnyBulkWriteOperation[] = [];
  const backup: RawLink[] = [];
  const skipped: string[] = [];
  const samples: string[] = [];
  const tally = { nameFromService: 0, nameFromBooking: 0, typeSet: 0, strayKeyRemoved: 0 };
  /** Every distinct name moved out of `service`, with where it was filed — the list to eyeball before --apply. */
  const filed = new Map<string, { service: string; rows: number }>();

  for (const doc of docs) {
    const raw = rawServiceOf(doc);
    const booking = bookings.get(bookingKey(doc.number, doc.orderId));
    const service = classifyService(raw, Boolean(booking));
    const id = String(doc._id);

    if (!isServiceType(service)) {
      skipped.push(`${id}  unclassifiable service "${raw}"`);
      continue;
    }
    const existingName = doc.serviceName?.trim() ?? "";
    if (existingName && !isServiceType(raw) && raw && existingName.toLowerCase() !== raw.toLowerCase()) {
      skipped.push(`${id}  serviceName "${existingName}" differs from service "${raw}"`);
      continue;
    }

    const nameFromRow = serviceNameOf(doc, raw);
    const serviceName = nameFromRow || booking?.puja?.chadhavaName?.trim() || "";

    const set: Record<string, string> = {};
    if (doc.service !== service) set.service = service;
    if (serviceName && doc.serviceName !== serviceName) set.serviceName = serviceName;
    const strayKey = "service " in doc;
    if (Object.keys(set).length === 0 && !strayKey) continue;

    if (set.service) {
      tally.typeSet++;
      const key = `${raw} → ${service}`;
      filed.set(key, { service, rows: (filed.get(key)?.rows ?? 0) + 1 });
    }
    if (set.serviceName) tally[nameFromRow ? "nameFromService" : "nameFromBooking"]++;
    if (strayKey) tally.strayKeyRemoved++;

    backup.push({
      _id: doc._id,
      service: doc.service,
      serviceName: doc.serviceName,
      ...(strayKey ? { "service ": doc["service "] } : {}),
    });
    ops.push({
      updateOne: {
        filter: { _id: doc._id },
        update: {
          ...(Object.keys(set).length ? { $set: set } : {}),
          // Not in the schema, so it goes through the driver, which is also why
          // every write here bypasses Mongoose casting.
          ...(strayKey ? { $unset: { "service ": "" } } : {}),
        },
      },
    });
    if (samples.length < 15) {
      samples.push(
        `${doc.orderId}  service "${doc.service ?? ""}" → "${service}"` +
          `  serviceName "${doc.serviceName ?? ""}" → "${serviceName}"`,
      );
    }
  }

  logger.info(`links: ${docs.length} rows, ${ops.length} to change, ${skipped.length} skipped.`);
  logger.info(
    `service set on ${tally.typeSet}; serviceName moved from service on ${tally.nameFromService}, ` +
      `filled from the booking on ${tally.nameFromBooking}; stray "service " key on ${tally.strayKeyRemoved}.`,
  );
  if (samples.length) logger.info(`Sample changes:\n  ${samples.join("\n  ")}`);
  if (filed.size) {
    const lines = [...filed.entries()]
      .sort((a, b) => a[1].service.localeCompare(b[1].service) || b[1].rows - a[1].rows)
      .map(([key, { rows }]) => `${String(rows).padStart(5)}  ${key}`);
    logger.info(`Names moved out of service (rows, name → service):\n  ${lines.join("\n  ")}`);
  }
  if (skipped.length) logger.warn(`Left untouched for a person to check:\n  ${skipped.join("\n  ")}`);

  if (ops.length === 0) {
    logger.info("Nothing to change.");
    return;
  }
  if (!apply) {
    logger.info(`Dry run — re-run with --apply to change ${ops.length} rows.`);
    return;
  }

  const backupPath = join(tmpdir(), `links-service-backup-${Date.now()}.json`);
  writeFileSync(backupPath, JSON.stringify(backup, null, 2));
  logger.info(`Old values of the ${backup.length} rows being changed saved to ${backupPath}`);

  let modified = 0;
  for (const part of chunk(ops, 500)) {
    const result = await ServiceVideo.collection.bulkWrite(part, { ordered: false });
    modified += result.modifiedCount;
  }
  logger.info(`Changed ${modified} of ${ops.length} rows.`);
};

run()
  .catch((err) => {
    logger.error({ err }, "splitServiceVideoServiceName failed");
    process.exitCode = 1;
  })
  .finally(() => {
    // Importing config/db opens all three connections, not just dbMain — closing
    // one leaves the other two holding the event loop open and the script hangs.
    void disconnectAllDatabases().then(() => process.exit(process.exitCode ?? 0));
  });
