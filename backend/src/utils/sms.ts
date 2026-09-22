import axios from "axios";
import { env } from "../config/env";

/**
 * Fast2SMS, DLT route.
 * ---------------------
 * Transactional SMS in India goes out on a DLT-registered template: the text
 * lives with the operator, not here, and `dltTemplateId` selects it. What this
 * call supplies is the ordered list of variables that fill its {#var#} slots —
 * so the order of `variables` is fixed by whoever registered the template, and
 * changing it here silently sends the wrong words.
 *
 * Registered templates in use:
 *   195395 — booking confirmation: devotee | puja | date   (puja, pitru puja)
 *   194832 — order id only:        orderId                 (chadhava)
 *
 * Every caller treats a failure as best-effort and logs it: an SMS that did not
 * arrive must never fail a payment that did.
 */

const FAST2SMS_BULK_URL = "https://www.fast2sms.com/dev/bulkV2";

/** The sender header the DLT templates above are registered against. */
export const DEFAULT_SENDER_ID = "VVORDR";

export interface Fast2SmsArgs {
  /** Indian mobile. Anything non-numeric is stripped and the last 10 digits used. */
  to: string;
  /** DLT template id, as registered with the operator. */
  dltTemplateId: string;
  /** Values for the template's variables, in the template's own order. */
  variables: string[];
  senderId?: string;
}

/**
 * Sends one DLT SMS. Throws on a transport failure or a rejection from
 * Fast2SMS, so callers can log the reason rather than silently believing the
 * message went out.
 */
export const sendFast2SmsDlt = async ({
  to,
  dltTemplateId,
  variables,
  senderId = DEFAULT_SENDER_ID,
}: Fast2SmsArgs): Promise<void> => {
  const last10 = String(to ?? "")
    .replace(/\D/g, "")
    .slice(-10);
  if (last10.length !== 10) throw new Error(`Not an Indian 10-digit mobile: "${to}"`);
  if (!env.fast2sms.apiKey) throw new Error("FAST2SMS_API_KEY is not configured");

  const response = await axios.get(FAST2SMS_BULK_URL, {
    params: {
      authorization: env.fast2sms.apiKey,
      route: "dlt",
      sender_id: senderId,
      message: dltTemplateId,
      // Fast2SMS separates variables with a literal pipe. axios percent-encodes
      // each value, so a name containing "|" cannot split one field into two.
      variables_values: variables.map((v) => String(v ?? "")).join("|"),
      flash: 0,
      numbers: last10,
      schedule_time: "",
    },
    timeout: 10_000,
    headers: { Accept: "application/json" },
  });

  // A rejected send still comes back HTTP 200 with `return: false`, so the
  // status code alone is not evidence that anything was delivered.
  if (!response.data?.return) {
    throw new Error(`Fast2SMS rejected the send: ${JSON.stringify(response.data)}`);
  }
};
