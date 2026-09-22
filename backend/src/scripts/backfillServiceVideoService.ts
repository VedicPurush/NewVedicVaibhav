/**
 * Stamp `service: "chadhava"` on every row in the `links` collection that does
 * not have one yet.
 *
 * Every video delivered before the field existed was a chadhava video, so the
 * backfill is unambiguous. Idempotent and additive — it only touches rows where
 * `service` is missing or blank, and re-running it is a no-op.
 *
 * Run from the backend/ folder:
 *   pnpm tsx src/scripts/backfillServiceVideoService.ts            (dry run)
 *   pnpm tsx src/scripts/backfillServiceVideoService.ts --apply    (writes)
 */

import type { FilterQuery } from "mongoose";
import { dbMain, disconnectAllDatabases } from "../config/db";
import { logger } from "../lib/logger";
import ServiceVideo, {
  SERVICE_CHADHAVA,
  type IServiceVideo,
} from "../modules/content/serviceVideo.model";

const MISSING_SERVICE: FilterQuery<IServiceVideo> = {
  $or: [{ service: { $exists: false } }, { service: null }, { service: "" }],
};

const run = async (): Promise<void> => {
  const apply = process.argv.includes("--apply");

  logger.info("Connecting to MongoDB (main)...");
  await dbMain.asPromise();

  const total = await ServiceVideo.estimatedDocumentCount();
  const pending = await ServiceVideo.countDocuments(MISSING_SERVICE);
  logger.info(`links: ${total} rows, ${pending} without a service field.`);

  if (pending === 0) {
    logger.info("Nothing to backfill.");
    return;
  }

  if (!apply) {
    logger.info(`Dry run — re-run with --apply to set service="${SERVICE_CHADHAVA}" on ${pending} rows.`);
    return;
  }

  const result = await ServiceVideo.updateMany(MISSING_SERVICE, {
    $set: { service: SERVICE_CHADHAVA },
  });
  logger.info(`Backfilled ${result.modifiedCount} of ${pending} rows.`);

  const left = await ServiceVideo.countDocuments(MISSING_SERVICE);
  logger.info(left === 0 ? "All rows now carry a service." : `${left} rows still missing a service.`);
};

run()
  .catch((err) => {
    logger.error({ err }, "backfillServiceVideoService failed");
    process.exitCode = 1;
  })
  .finally(() => {
    // Importing config/db opens all three connections, not just dbMain — closing
    // one leaves the other two holding the event loop open and the script hangs.
    void disconnectAllDatabases().then(() => process.exit(process.exitCode ?? 0));
  });
