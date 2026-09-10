export interface VvUtmData {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  utm_term: string;
}

export const captureVvUtm = () => {
  try {
    // 1. Check if we already have first-touch UTM stored.
    const stored = localStorage.getItem("vv_utm");
    if (stored) {
      // We already have a first touch captured, do not overwrite.
      return;
    }

    // 2. We don't have one, let's look at the URL for new UTM params.
    const params = new URLSearchParams(window.location.search);

    const utm_source = params.get("utm_source");
    const utm_medium = params.get("utm_medium");
    const utm_campaign = params.get("utm_campaign");
    const utm_content = params.get("utm_content");
    const utm_term = params.get("utm_term");

    // 3. If there are NO utm parameters in URL, we classify as organic (Direct/Organic Traffic)
    if (!utm_source && !utm_medium && !utm_campaign) {
      const defaultUtmData: VvUtmData = {
        utm_source: "organic",
        utm_medium: "none",
        utm_campaign: "none",
        utm_content: "none",
        utm_term: "none",
      };
      localStorage.setItem("vv_utm", JSON.stringify(defaultUtmData));
      return;
    }

    // 4. Otherwise, we found UTM params, store them as first-touch.
    const utmData: VvUtmData = {
      utm_source: utm_source || "unknown",
      utm_medium: utm_medium || "unknown",
      utm_campaign: utm_campaign || "unknown",
      utm_content: utm_content || "unknown",
      utm_term: utm_term || "unknown",
    };

    localStorage.setItem("vv_utm", JSON.stringify(utmData));
  } catch (error) {
    // Silent fail if localStorage is restricted (e.g. privacy blockers)
    console.warn("Could not capture vv_utm:", error);
  }
};

export const getVvUtm = (): VvUtmData | null => {
  try {
    const data = localStorage.getItem("vv_utm");
    if (data) {
      return JSON.parse(data) as VvUtmData;
    }
  } catch (error) {
    console.warn("Could not retrieve vv_utm:", error);
  }
  return null;
};
