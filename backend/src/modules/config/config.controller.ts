import type { Request, Response } from "express";
import { currencyConfig } from "../../config/currency";
import { clientIp, countryFromRequest } from "../../utils/geoip";

/**
 * GET /api/config/currency
 *
 * The live FX table AND the caller's country, in one round trip. Two jobs in one
 * request on purpose: the browser needs both before it can price the page, and a
 * second round trip in front of a checkout buys nothing.
 */
export const getCurrencyConfig = async (req: Request, res: Response): Promise<void> => {
  const country = await countryFromRequest(req).catch(() => null);

  /**
   * 🔒 `no-store` IS LOAD-BEARING.
   *
   * A rates-only response could happily be `public, max-age=300`. Once the
   * CALLER'S COUNTRY is in the payload that becomes a privacy bug — a shared or
   * CDN cache would hand one visitor's country to the next, and price the page
   * for the wrong market while it was at it.
   *
   * The payload is a few hundred bytes, so not caching costs nothing measurable,
   * and a rate change takes effect on the very next page load.
   */
  res.set("Cache-Control", "private, no-store");

  res.status(200).json({
    ...currencyConfig(),
    country,
    /**
     * ?debug=1 echoes the resolved IP — the one thing you cannot otherwise see,
     * and the first thing to check when detection "doesn't work". If it comes
     * back null or as the server's own address, the proxy in front is not
     * passing X-Forwarded-For.
     */
    ...(req.query.debug === "1" && { debugIp: clientIp(req) }),
  });
};
