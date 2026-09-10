"use client";

import React, { useState, useEffect, useRef } from "react";
import TranslateIcon from "@mui/icons-material/Translate";
import { useTranslation } from "react-i18next";
import { ensureLanguageLoaded } from "@/lib/i18n";

/* Language config */
const languageMap: Record<string, { code: string; label: string; name: string }> = {
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

const MobileLangSelector: React.FC = () => {
  // SSR-safe: window is read after mount; default to desktop presentation.
  const [isMobile, setIsMobile] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLang, setSelectedLang] = useState<string>("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { i18n } = useTranslation();

  useEffect(() => {
    setIsMobile(window.innerWidth <= 640);
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setSelectedLang(stored);
  }, []);

  const handleLangChange = (langName: string) => {
    setSelectedLang(langName);
    setIsOpen(false);

    const langCode = languageMap[langName]?.code || "en";
    const domain = window.location.hostname.includes("localhost")
      ? "localhost"
      : window.location.hostname;

    ensureLanguageLoaded(langCode).then(() => i18n.changeLanguage(langCode));
    localStorage.setItem(STORAGE_KEY, langName);
    document.cookie = `googtrans=/en/${langCode}; path=/; domain=${domain};`;

    if (window.doGTranslate) {
      const translateFn = window.doGTranslate;
      translateFn("en|en");
      setTimeout(() => {
        translateFn(`en|${langCode}`);
        setTimeout(() => {
          translateFn(`en|${langCode}`);
        }, 500);
      }, 1000);
    }
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

  return (
    <div
      ref={dropdownRef}
      translate="no"
      style={{
        position: "relative",
        width: "fit-content",
        fontFamily: "Arial",
        userSelect: "none",
        zIndex: 40,
      }}
    >
      {/* Dropdown Trigger */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: "#fff",
          border: "1px solid #FF7D00",
          borderRadius: 6,
          padding: "3px 6px",
          display: "flex",
          alignItems: "center",
          gap: 6,
          cursor: "pointer",
          color: "#FF7D00",
          fontWeight: 500,
          fontSize: 14,
          minWidth: isMobile ? 42 : 100,
          justifyContent: isMobile ? "center" : "space-between",
        }}
      >
        {selectedLang ? (
          isMobile ? (
            <span style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 2 }}>
              {languageMap[selectedLang]?.code.toUpperCase()}
              <span style={{ fontSize: 8 }}>▼</span>
            </span>
          ) : (
            <>
              {languageMap[selectedLang]?.label}
              <span style={{ fontSize: 10, marginLeft: 2 }}>▼</span>
            </>
          )
        ) : (
          <>
            <TranslateIcon style={{ fontSize: isMobile ? 20 : 18 }} />
            {!isMobile && <span style={{ fontSize: 10 }}>▼</span>}
          </>
        )}
      </div>

      {/* Language List */}
      {isOpen && (
        <div
          translate="no"
          style={{
            position: "absolute",
            top: "110%",
            left: 0,
            width: isMobile ? 80 : 200,
            background: "#fff",
            border: "1px solid #FF7D00",
            borderRadius: 6,
            maxHeight: 250,
            overflowY: "auto",
            boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
          }}
        >
          {Object.entries(languageMap).map(([lang, { label, code, name }]) => (
            <div
              key={lang}
              onClick={() => handleLangChange(lang)}
              style={{
                padding: "8px 10px",
                background: lang === selectedLang ? "#FFEAD0" : "#fff",
                color: "#000",
                fontWeight: 500,
                fontSize: 14,
                cursor: "pointer",
                borderBottom: "1px solid #eee",
                display: "flex",
                justifyContent: isMobile ? "center" : "space-between",
                alignItems: "center",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#FFF3E0";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor =
                  lang === selectedLang ? "#FFEAD0" : "#fff";
              }}
            >
              {isMobile ? (
                <span>{code.toUpperCase()}</span>
              ) : (
                <span>
                  {label} ({name})
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MobileLangSelector;
