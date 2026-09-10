import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "@/locales/en/translation.json";

// Map the display name saved by the Navbar to an i18n language code
const langNameToCode: Record<string, string> = {
  English: "en", Hindi: "hi", Gujarati: "gu", Telugu: "te", Marathi: "mr",
  Bengali: "bn", Tamil: "ta", Malayalam: "ml", Kannada: "kn", Punjabi: "pa",
  Odia: "or", Assamese: "as", Urdu: "ur", Sindhi: "sd", Nepali: "ne",
  Maithili: "mai", Sanskrit: "sa",
};

// Every locale used to be statically imported (~624KB of JSON bundled into
// every page, for 16 languages almost nobody selects). Only English loads
// eagerly now; the rest load on demand via ensureLanguageLoaded below.
const localeLoaders: Record<string, () => Promise<{ default: Record<string, unknown> }>> = {
  hi: () => import("@/locales/hi/translation.json"),
  gu: () => import("@/locales/gu/translation.json"),
  te: () => import("@/locales/te/translation.json"),
  mr: () => import("@/locales/mr/translation.json"),
  bn: () => import("@/locales/bn/translation.json"),
  ta: () => import("@/locales/ta/translation.json"),
  ml: () => import("@/locales/ml/translation.json"),
  kn: () => import("@/locales/kn/translation.json"),
  pa: () => import("@/locales/pa/translation.json"),
  or: () => import("@/locales/or/translation.json"),
  as: () => import("@/locales/as/translation.json"),
  ur: () => import("@/locales/ur/translation.json"),
  sd: () => import("@/locales/sd/translation.json"),
  ne: () => import("@/locales/ne/translation.json"),
  mai: () => import("@/locales/mai/translation.json"),
  sa: () => import("@/locales/sa/translation.json"),
};

/** Fetch + register a locale's translation bundle if it isn't loaded yet. Safe to call
 *  repeatedly (e.g. on every language-switch click) — a no-op once a locale is loaded. */
export async function ensureLanguageLoaded(langCode: string): Promise<void> {
  if (langCode === "en" || i18n.hasResourceBundle(langCode, "translation")) return;
  const load = localeLoaders[langCode];
  if (!load) return;
  try {
    const mod = await load();
    i18n.addResourceBundle(langCode, "translation", mod.default, true, true);
  } catch {
    // Offline / chunk load failure — UI stays in the current language rather than breaking.
  }
}

export { langNameToCode };

// SSR-safe: localStorage only exists in the browser; the server always starts in English.
const savedLangName =
  (typeof window !== "undefined" && window.localStorage.getItem("vv_selected_language")) ||
  "English";
const savedLangCode = langNameToCode[savedLangName] || "en";

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
    },
    lng: savedLangCode, // Restore saved language on startup
    fallbackLng: "en",
    interpolation: {
      escapeValue: false,
    },
  });

  // A returning visitor's saved language loads asynchronously right after boot —
  // i18next reads through `fallbackLng` (English) until this resolves, so there's
  // no broken/missing-key flash, just a brief moment of English before it switches.
  if (savedLangCode !== "en") {
    ensureLanguageLoaded(savedLangCode).then(() => {
      i18n.changeLanguage(savedLangCode);
    });
  }
}

export default i18n;
