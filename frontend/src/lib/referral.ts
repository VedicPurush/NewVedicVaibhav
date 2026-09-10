/**
 * Captures a partner/affiliate referral code from a `?ref=` query parameter into
 * localStorage, under the exact key every checkout/booking flow already reads.
 *
 * Semantics: last-click-wins for the session. If the current URL carries a `?ref=` value,
 * it always overwrites whatever was stored before (the most recent link the visitor clicked
 * gets credit for what happens next). If a page has no `?ref=` param, whatever was captured
 * earlier in the visit is left untouched, so browsing across multiple pages after the
 * referral click doesn't lose attribution.
 */
export const REFERRAL_CODE_STORAGE_KEY = "vedicvaibhav_ref_code";

export const captureReferralCode = (search: string): void => {
  try {
    const params = new URLSearchParams(search);
    const ref = params.get("ref");
    if (ref && ref.trim()) {
      localStorage.setItem(REFERRAL_CODE_STORAGE_KEY, ref.trim());
    }
  } catch (error) {
    // Silent fail if localStorage is restricted (e.g. privacy blockers).
    console.warn("Could not capture referral code:", error);
  }
};
