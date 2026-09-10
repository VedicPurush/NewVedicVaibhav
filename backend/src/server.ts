// Env must load (and validate) before anything else reads process.env.
import { env } from "./config/env";
import http from "node:http";
import app from "./app";
import { connectAllDatabases, disconnectAllDatabases } from "./config/db";
import { logger } from "./lib/logger";
import { startPendingBookingSweeps } from "./jobs/bookingSweeps";

const server = http.createServer(app);

const start = async (): Promise<void> => {
  try {
    const dbHost = (() => {
      const m = /@([^/,?]+)/.exec(env.db.main);
      return m ? m[1] : "unknown";
    })();
    logger.info(
      `Environment: NODE_ENV=${env.nodeEnv}, db=${dbHost}, ` +
        `payments=${env.razorpay.mode}, meta-capi=${env.metaCapi.pixelId ? "on" : "OFF"}, ` +
        `partner-affiliate=${env.isLocal ? "local" : "production"}`,
    );
    await connectAllDatabases();

    if (env.enableBookingSweeps) {
      startPendingBookingSweeps();
    } else {
      logger.warn(
        "Pending-booking sweeps DISABLED — this process will not mutate bookings on a timer. " +
          "Set ENABLE_BOOKING_SWEEPS=true to run them here.",
      );
    }

    server.listen(env.port, "0.0.0.0", () => {
      logger.info(`Server listening on port ${env.port}`);
    });
  } catch (error) {
    logger.fatal({ error }, "Failed to start server");
    process.exit(1);
  }
};

const shutdown = async (signal: string): Promise<void> => {
  logger.info(`${signal} received — shutting down gracefully`);
  server.close(async () => {
    await disconnectAllDatabases();
    process.exit(0);
  });
  // Force-exit if connections refuse to drain.
  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

void start();
