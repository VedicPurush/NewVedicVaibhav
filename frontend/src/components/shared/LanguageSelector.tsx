"use client";

import React, { useState, useEffect, useRef } from "react";
import TranslateIcon from "@mui/icons-material/Translate";
import { useTranslation } from "react-i18next";
import { ensureLanguageLoaded } from "@/lib/i18n";

/*  Google-Translate language codes for Indian languages  */
const languageMap: Record<string, { code: string; label: string; name: string }> = {
  Select_Language: { code: "Select", label: "Language", name: "Select" },
  English: { code: "en", label: "English", name: "English" },
  Hindi: { code: "hi", label: "हिन्दी", name: "Hindi" },
  Bengali: { code: "bn", label: "বাংলা", name: "Bengali" },
  Telugu: { code: "te", label: "తెలుగు", name: "Telugu" },
  Marathi: { code: "mr", label: "मराठी", name: "Marathi" },
  Tamil: { code: "ta", label: "தமிழ்", name: "Tamil" },
  Gujarati: { code: "gu", label: "ગુજરાતી", name: "Gujarati" },
  Kannada: { code: "kn", label: "ಕನ್ನಡ", name: "Kannada" },
  Malayalam: { code: "ml", label: "മലയാളം", name: "Malayalam" },
  Odia: { code: "or", label: "ଓଡ଼ିଆ", name: "Odia" },
  Punjabi: { code: "pa", label: "ਪੰਜਾਬੀ", name: "Punjabi" },
  Assamese: { code: "as", label: "অসমীয়া", name: "Assamese" },
  Urdu: { code: "ur", label: "اُردُو", name: "Urdu" },
  Sanskrit: { code: "sa", label: "संस्कृतम्", name: "Sanskrit" },
  Sindhi: { code: "sd", label: "سنڌي", name: "Sindhi" },
  Maithili: { code: "mai", label: "मैथिली", name: "Maithili" },
  Nepali: { code: "ne", label: "नेपाली", name: "Nepali" },
};

declare global {
  interface Window {
    doGTranslate?: (langPair: string) => void;
  }
}

const STORAGE_KEY = "vv_selected_language";
const SUPPORTED_URL_LANGS = new Set(["en", "hi"]);
const codeToLangName: Record<string, string> = { en: "English", hi: "Hindi" };
const getUrlLang = (): string | null => {
  const sp = new URLSearchParams(window.location.search);
  const val = sp.get("lang");
  return val ? val.toLowerCase() : null;
};

// Wait for Google Translate's injected function to be ready, then run cb
const waitForDoGTranslate = (
  cb: (fn: (langPair: string) => void) => void,
  attempts: number = 40,
  interval: number = 150,
) => {
  const tryNow = () => {
    if (window.doGTranslate && typeof window.doGTranslate === "function") {
      cb(window.doGTranslate);
      return;
    }
    if (attempts <= 0) return;
    setTimeout(() => waitForDoGTranslate(cb, attempts - 1, interval), interval);
  };
  tryNow();
};

// Set the googtrans cookie correctly for localhost and production
const setTranslateCookie = (langCode: string) => {
  const host = window.location.hostname;
  const isLocal = host === "localhost" || host === "127.0.0.1";
  const domainAttr = isLocal ? "" : `; domain=.${host}`;
  document.cookie = `googtrans=/en/${langCode}; path=/${domainAttr}`;
};

const LanguageSelector: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  // SSR-safe: default first, hydrate the stored language after mount.
  const [selectedLang, setSelectedLang] = useState<string>("Select_Language");
  const [loading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { i18n } = useTranslation();

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setSelectedLang(stored);
  }, []);

  const handleLangChange = async (langName: string) => {
    setSelectedLang(langName);
    setIsOpen(false);

    const langCode = languageMap[langName]?.code || "en";

    await ensureLanguageLoaded(langCode);
    i18n.changeLanguage(langCode);
    localStorage.setItem(STORAGE_KEY, langName);
    setTranslateCookie(langCode);

    // Single translate call to reduce double DOM mutations
    waitForDoGTranslate((translateFn) => {
      try {
        if (typeof (window as any).requestIdleCallback === "function") {
          (window as any).requestIdleCallback(() => translateFn(`en|${langCode}`));
        } else {
          setTimeout(() => translateFn(`en|${langCode}`), 0);
        }
      } catch {
        // no-op
      }
    });
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Apply ?lang=en|hi on initial load (only English/Hindi)
  useEffect(() => {
    const urlLang = getUrlLang();
    if (urlLang && SUPPORTED_URL_LANGS.has(urlLang)) {
      const langName = codeToLangName[urlLang];
      if (langName) {
        setSelectedLang(langName);
        const langCode = languageMap[langName]?.code || "en";
        ensureLanguageLoaded(langCode).then(() => i18n.changeLanguage(langCode));
        localStorage.setItem(STORAGE_KEY, langName);
        setTranslateCookie(langCode);
        waitForDoGTranslate((translateFn) => {
          try {
            setTimeout(() => translateFn(`en|${langCode}`), 0);
          } catch {
            // no-op
          }
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // React to browser back/forward: re-apply ?lang=en|hi if present
  useEffect(() => {
    const onPop = () => {
      const urlLang = getUrlLang();
      if (urlLang && SUPPORTED_URL_LANGS.has(urlLang)) {
        const langName = codeToLangName[urlLang];
        if (langName) {
          setSelectedLang(langName);
          const langCode = languageMap[langName]?.code || "en";
          i18n.changeLanguage(langCode);
          localStorage.setItem(STORAGE_KEY, langName);
          setTranslateCookie(langCode);
          waitForDoGTranslate((translateFn) => {
            try {
              setTimeout(() => translateFn(`en|${langCode}`), 0);
            } catch {
              // no-op
            }
          });
        }
      }
      // If ?lang absent or not en/hi, do nothing
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      translate="no"
      ref={dropdownRef}
      style={{
        position: "relative",
        width: "fit-content",
        fontFamily: "Arial",
        userSelect: "none",
      }}
    >
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: "#fff",
          border: "1px solid #FF7D00",
          borderRadius: 6,
          padding: "6px 10px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
          color: "#FF7D00",
        }}
      >
        <span>
          {loading ? (
            "Loading…"
          ) : selectedLang === "Select_Language" ? (
            <TranslateIcon style={{ fontSize: 18 }} />
          ) : (
            languageMap[selectedLang]?.label || "English"
          )}
        </span>

        <span style={{ fontSize: 10, marginLeft: 4 }}>▼</span>
      </div>

      {isOpen && (
        <div
          translate="no"
          style={{
            position: "absolute",
            top: "110%",
            left: 0,
            width: "200px",
            background: "#fff",
            border: "1px solid #FF7D00",
            borderRadius: 6,
            zIndex: 999,
            maxHeight: 250,
            overflowY: "auto",
            boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
          }}
        >
          {Object.entries(languageMap).map(([lang, { label, name }]) => (
            <div
              key={lang}
              onClick={() => handleLangChange(lang)}
              style={{
                padding: "10px 12px",
                background:
                  lang === selectedLang
                    ? "#FFEAD0"
                    : lang === "Select_Language"
                      ? "#F2F2F2"
                      : "#fff",
                color: lang === "Select_Language" ? "#666" : "#000",
                fontWeight: lang === "Select_Language" ? "bold" : 500,
                cursor: lang === "Select_Language" ? "default" : "pointer",
                pointerEvents: lang === "Select_Language" ? "none" : "auto",
                borderBottom: "1px solid #eee",
                fontSize: "14px",
              }}
              onMouseEnter={(e) => {
                if (lang !== "Select_Language") {
                  e.currentTarget.style.backgroundColor = "#FFF3E0";
                }
              }}
              onMouseLeave={(e) => {
                if (lang !== "Select_Language") {
                  e.currentTarget.style.backgroundColor =
                    lang === selectedLang ? "#FFEAD0" : "#fff";
                }
              }}
            >
              <span translate="no">{`${label} (${name})`}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;
