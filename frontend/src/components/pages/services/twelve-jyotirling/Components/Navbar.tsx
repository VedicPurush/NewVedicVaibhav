"use client";

import React, { useState, useEffect, useRef } from "react";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import TranslateIcon from "@mui/icons-material/Translate";
import LoginModel from "@/components/pages/home/LoginModel";
import { Avatar, Dropdown, MenuProps, Modal } from "antd";
import { UserOutlined, LogoutOutlined, BookOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import ProfileModal from "./ProfileSection";
import { useTranslation } from "react-i18next";
import { ensureLanguageLoaded } from "@/lib/i18n";

declare global {
  interface Window {
    doGTranslate?: (langPair: string) => void;
  }
}

// ── Language selector helpers ────────────────────────────────────────────────
const languageMap: Record<string, { code: string; label: string; name: string }> = {
  Select_Language: { code: "Select", label: "Language", name: "Select" },
  English:   { code: "en",  label: "English",      name: "English"   },
  Hindi:     { code: "hi",  label: "हिन्दी",         name: "Hindi"     },
  Bengali:   { code: "bn",  label: "বাংলা",          name: "Bengali"   },
  Telugu:    { code: "te",  label: "తెలుగు",         name: "Telugu"    },
  Marathi:   { code: "mr",  label: "मराठी",          name: "Marathi"   },
  Tamil:     { code: "ta",  label: "தமிழ்",          name: "Tamil"     },
  Gujarati:  { code: "gu",  label: "ગુજરાતી",        name: "Gujarati"  },
  Kannada:   { code: "kn",  label: "ಕನ್ನಡ",          name: "Kannada"   },
  Malayalam: { code: "ml",  label: "മലയാളം",         name: "Malayalam" },
  Odia:      { code: "or",  label: "ଓଡ଼ିଆ",           name: "Odia"      },
  Punjabi:   { code: "pa",  label: "ਪੰਜਾਬੀ",         name: "Punjabi"   },
  Assamese:  { code: "as",  label: "অসমীয়া",         name: "Assamese"  },
  Urdu:      { code: "ur",  label: "اُردُو",           name: "Urdu"      },
  Sanskrit:  { code: "sa",  label: "संस्कृतम्",      name: "Sanskrit"  },
  Nepali:    { code: "ne",  label: "नेपाली",          name: "Nepali"    },
};

const STORAGE_KEY = "vv_selected_language";

const waitForDoGTranslate = (
  cb: (fn: (lp: string) => void) => void,
  attempts = 40,
  interval = 150
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

const setTranslateCookie = (langCode: string) => {
  const host = window.location.hostname;
  const isLocal = host === "localhost" || host === "127.0.0.1";
  const domainAttr = isLocal ? "" : `; domain=.${host}`;
  document.cookie = `googtrans=/en/${langCode}; path=/${domainAttr}`;
};

// ── Themed language selector component ───────────────────────────────────────
const JyotirlingLangSelector: React.FC<{ dropUp?: boolean }> = ({ dropUp = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLang, setSelectedLang] = useState<string>(
    () => localStorage.getItem(STORAGE_KEY) || "Select_Language"
  );
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { i18n } = useTranslation();

  const handleLangChange = (langName: string) => {
    if (langName === "Select_Language") return;
    setSelectedLang(langName);
    setIsOpen(false);
    const langCode = languageMap[langName]?.code || "en";
    ensureLanguageLoaded(langCode).then(() => i18n.changeLanguage(langCode));
    localStorage.setItem(STORAGE_KEY, langName);
    setTranslateCookie(langCode);
    waitForDoGTranslate((fn) => {
      try {
        if (typeof (window as any).requestIdleCallback === "function") {
          (window as any).requestIdleCallback(() => fn(`en|${langCode}`));
        } else {
          setTimeout(() => fn(`en|${langCode}`), 0);
        }
      } catch (_) {}
    });
  };

  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setIsOpen(false);
    };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  const isDefault = selectedLang === "Select_Language";
  const label = isDefault ? null : languageMap[selectedLang]?.label;

  return (
    <div
      translate="no"
      ref={dropdownRef}
      style={{ position: "relative", userSelect: "none", fontFamily: "'Cinzel', serif" }}
    >
      {/* Trigger */}
      <div
        onClick={() => setIsOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          cursor: "pointer",
          padding: "5px 10px",
          borderRadius: 8,
          border: isOpen
            ? "1px solid #ea580c"
            : "1px solid rgba(234,88,12,0.35)",
          background: isOpen
            ? "rgba(234,88,12,0.12)"
            : "rgba(234,88,12,0.06)",
          color: "#c2410c",
          fontSize: 13,
          transition: "all 0.2s",
          minWidth: 38,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = "#ea580c";
          (e.currentTarget as HTMLDivElement).style.color = "#c2410c";
        }}
        onMouseLeave={(e) => {
          if (!isOpen) {
            (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(234,88,12,0.35)";
            (e.currentTarget as HTMLDivElement).style.color = "#c2410c";
          }
        }}
      >
        <TranslateIcon style={{ fontSize: 16, color: "#ea580c" }} />
        {label && (
          <span style={{ color: "#c2410c", fontWeight: 600, letterSpacing: "0.04em" }}>
            {label}
          </span>
        )}
        <span style={{ fontSize: 9, color: "#ea580c", marginLeft: 1 }}>▼</span>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          translate="no"
          style={{
            position: "absolute",
            ...(dropUp ? { bottom: "110%", top: "auto" } : { top: "110%" }),
            right: 0,
            width: 200,
            background: "#fffaf0",
            border: "1px solid rgba(234,88,12,0.3)",
            borderRadius: 8,
            zIndex: 9999,
            maxHeight: 240,
            overflowY: "auto",
            boxShadow: "0 4px 20px rgba(234,88,12,0.15), 0 0 12px rgba(234,88,12,0.08)",
            scrollbarWidth: "thin",
            scrollbarColor: "#ea580c transparent",
          }}
        >
          {Object.entries(languageMap).map(([lang, { label: lbl, name }]) => {
            const isHeader = lang === "Select_Language";
            const isActive = lang === selectedLang;
            return (
              <div
                key={lang}
                onClick={() => handleLangChange(lang)}
                style={{
                  padding: "9px 13px",
                  background: isActive
                    ? "rgba(234,88,12,0.12)"
                    : isHeader
                    ? "rgba(234,88,12,0.04)"
                    : "transparent",
                  color: isActive ? "#c2410c" : isHeader ? "#9a3412" : "#431407",
                  fontWeight: isActive ? 700 : isHeader ? 700 : 400,
                  fontSize: isHeader ? 11 : 13,
                  letterSpacing: isHeader ? "0.1em" : "0.02em",
                  cursor: isHeader ? "default" : "pointer",
                  pointerEvents: isHeader ? "none" : "auto",
                  borderBottom: "1px solid rgba(234,88,12,0.08)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => {
                  if (!isHeader) (e.currentTarget as HTMLDivElement).style.background = "rgba(234,88,12,0.08)";
                }}
                onMouseLeave={(e) => {
                  if (!isHeader) (e.currentTarget as HTMLDivElement).style.background = isActive ? "rgba(234,88,12,0.12)" : "transparent";
                }}
              >
                <span translate="no">{isHeader ? "Select Language" : `${lbl} (${name})`}</span>
                {isActive && <span style={{ color: "#ea580c", fontSize: 11 }}>✦</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const links = [
  { label: "Calendar", href: "#calendar" },
  { label: "Find My Jyotirlinga", href: "#rashi" },
  { label: "Testimonials", href: "#testimonials" },
  { label: "FAQ", href: "#faq" },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [activeProfileTab, setActiveProfileTab] = useState<'profile' | 'bookings'>('profile');
  const [userDetails, setUserDetails] = useState<any>(null);
  const [logoutConfirmVisible, setLogoutConfirmVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize, { passive: true });
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem("userDetails");
    if (storedUser) {
      setUserDetails(JSON.parse(storedUser));
    }

    const handleAuthChange = () => {
      const updatedUser = localStorage.getItem("userDetails");
      setUserDetails(updatedUser ? JSON.parse(updatedUser) : null);
    };

    window.addEventListener("user-details-changed", handleAuthChange);
    window.addEventListener("storage", handleAuthChange);
    
    return () => {
      window.removeEventListener("user-details-changed", handleAuthChange);
      window.removeEventListener("storage", handleAuthChange);
    };
  }, []);

  const handleLogout = () => {
    setLogoutConfirmVisible(true);
  };

  const confirmLogout = () => {
    localStorage.removeItem("userDetails");
    setUserDetails(null);
    setProfileModalVisible(false);
    setLogoutConfirmVisible(false);
    setOpen(false);
    window.dispatchEvent(new CustomEvent("user-details-changed"));
  };

  const openProfile = (tab: 'profile' | 'bookings') => {
    setActiveProfileTab(tab);
    setProfileModalVisible(true);
  };

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      label: 'My Profile',
      icon: <UserOutlined />,
      onClick: () => openProfile('profile')
    },
    {
      key: 'bookings',
      label: 'My Bookings',
      icon: <BookOutlined />,
      onClick: () => openProfile('bookings')
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      label: 'Logout',
      icon: <LogoutOutlined />,
      danger: true,
      onClick: handleLogout
    },
  ];

  const scrollTo = (href: string) => {
    setOpen(false);
    document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        backgroundColor: scrolled ? (isMobile ? "#fffaf0ee" : "#0f0d0aee") : "transparent",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        boxShadow: scrolled ? "0 2px 20px rgba(0,0,0,0.5)" : "none",
      }}
    >
      {/* Main Navbar Row */}
      <div className="flex items-center justify-between md:px-48 px-4 py-4">
        {/* Brand (Left) */}
        <a
          href="#"
          className="flex flex-col group"
          style={{
            fontFamily: "'Cinzel', 'Trajan Pro', serif",
          }}
        >
          <span
            className="tracking-[0.2em] text-sm md:text-base font-bold uppercase transition-colors duration-300 font-display"
            style={{ color: isMobile ? "#c2410c" : "#b8892a" }}
          >
            12 Jyotirlinga
          </span>
          <span
            className="text-[9px] uppercase tracking-[0.35em] ml-0.5 mt-0.5 transition-colors duration-300"
            style={{ color: isMobile ? "#9a3412" : "#d4cfc9", opacity: 0.8 }}
          >
            by Vedic Vaibhav
          </span>
        </a>

        {/* Desktop Nav Links (Right Side) */}
        <div className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <button
              key={l.href}
              onClick={() => scrollTo(l.href)}
              className="text-sm   tracking-wide transition-colors duration-200 font-display"
              style={{
                color: "#d4cfc9",
                background: "none",
                border: "none",
                cursor: "pointer",
                letterSpacing: "0.06em",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#b8892a")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#d4cfc9")}
            >
              {l.label}
            </button>
          ))}

          {/* Language Selector */}
          <JyotirlingLangSelector />

          {/* Auth Section / Subscribe Button */}
          {userDetails ? (
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" arrow>
              <div className="cursor-pointer flex items-center gap-2">
                <Avatar 
                  src={userDetails.user?.picture || "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/personicon.png"} 
                  icon={<UserOutlined />} 
                  style={{ backgroundColor: '#b8892a', verticalAlign: 'middle' }}
                  size="large"
                />
                <div className="flex flex-col">
                  <span className="text-[10px] text-[#d4cfc9] opacity-60 uppercase tracking-wider">Namaste</span>
                  <span className="text-xs text-[#f5d78e] font-display font-bold">
                    {userDetails.user?.given_name || 'User'}
                  </span>
                </div>
              </div>
            </Dropdown>
          ) : (
            <button
              onClick={() => setLoginModalOpen(true)}
              className="text-xs uppercase tracking-wide px-5 py-3 transition-opacity duration-200 rounded-[10px]"
              style={{
                background:
                  "linear-gradient(135deg, #cc951e 0%, #f2d592 50%, #c08919 100%)",
                color: "#0f0d0a",
                fontFamily: "'Cinzel', 'Trajan Pro', serif",
                border: "none",
                cursor: "pointer",
                boxShadow:
                  "0 0 14px rgba(184,137,42,0.35), inset 0 1px 0 rgba(255,255,255,0.15)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              Login / Signup
            </button>
          )}
        </div>

        <div className="md:hidden flex items-center gap-3">
          {userDetails && (
            <div
              onClick={() => openProfile('profile')}
              className="cursor-pointer md:block hidden"
            >
              <Avatar
                src={userDetails.user?.picture || "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/personicon.png"}
                size="default"
                style={{ backgroundColor: '#b8892a', border: '1px solid rgba(184,137,42,0.3)' }}
              />
            </div>
          )}
          <JyotirlingLangSelector />
          <button
            className="flex items-center"
            onClick={() => setOpen(!open)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: isMobile ? "#ea580c" : "#d4cfc9",
            }}
          >
            {open ? (
              <CloseIcon style={{ fontSize: 22 }} />
            ) : (
              <MenuIcon style={{ fontSize: 22 }} />
            )}
          </button>
        </div>
      </div>

      {/* Thin Gold Divider */}
      <div
        style={{
          height: "1px",
          background:
            "linear-gradient(90deg, transparent, #b8892a55, transparent)",
        }}
        className="hidden md:block"
      />

      {/* Mobile Dropdown */}
      {open && (
        <div
          className="md:hidden px-6 py-6 space-y-4"
          style={{
            backgroundColor: "#fffaf0",
            borderTop: "1px solid #ea580c33",
          }}
        >
          {/* {links.map((l) => (
            <button
              key={l.href}
              onClick={() => scrollTo(l.href)}
              className="block text-sm w-full text-left tracking-wide transition-colors duration-200"
              style={{
                color: "#d4cfc9",
                fontFamily: "'Gill Sans', 'Optima', sans-serif",
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#b8892a")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#d4cfc9")}
            >
              {l.label}
            </button>
          ))} */}

          {/* Language Selector (mobile) */}
          {/* <div className="pt-3 border-t border-[#ea580c33]">
            <p className="text-[10px] uppercase tracking-widest text-[#c2410c] mb-2"
               style={{ fontFamily: "'Cinzel', serif" }}>
              Language
            </p>
            <JyotirlingLangSelector dropUp />
          </div> */}

          {userDetails ? (
             <div className="pt-4 border-t border-[#ea580c33] space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar 
                    src={userDetails.user?.picture || "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/personicon.png"} 
                    icon={<UserOutlined />} 
                    style={{ backgroundColor: '#f97316' }}
                  />
                  <span className="text-sm text-[#431407] font-display font-bold">
                    {userDetails.user?.given_name || 'User'}
                  </span>
                </div>
                <button 
                  onClick={() => {
                    setOpen(false);
                    openProfile('profile');
                  }}
                  className="block w-full text-left text-sm text-[#c2410c]"
                >
                  My Profile
                </button>
                <button 
                  onClick={() => {
                    setOpen(false);
                    openProfile('bookings');
                  }}
                  className="block w-full text-left text-sm text-[#c2410c]"
                >
                  My Bookings
                </button>
                <button 
                  onClick={handleLogout}
                  className="block w-full text-left text-sm text-red-500"
                >
                  Logout
                </button>
             </div>
          ) : (
            <button
              onClick={() => {
                setOpen(false);
                setLoginModalOpen(true);
              }}
              className="w-full text-xs font-bold uppercase tracking-widest py-3 mt-3 transition-opacity duration-200"
              style={{
                background:
                  "linear-gradient(135deg, #c9972c 0%, #e8b84b 50%, #b8892a 100%)",
                color: "#0f0d0a",
                fontFamily: "'Cinzel', 'Trajan Pro', serif",
                letterSpacing: "0.12em",
                border: "none",
                cursor: "pointer",
                boxShadow: "0 0 14px rgba(184,137,42,0.35)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              Login / Signup
            </button>
          )}
        </div>
      )}
      <LoginModel modalOpen={loginModalOpen} setModalOpen={setLoginModalOpen} />
      <ProfileModal 
        visible={profileModalVisible} 
        onClose={() => setProfileModalVisible(false)} 
        initialTab={activeProfileTab}
      />

      {/* Logout Confirmation Modal */}
      <Modal
        title={null}
        open={logoutConfirmVisible}
        onCancel={() => setLogoutConfirmVisible(false)}
        footer={null}
        centered
        width={isMobile ? 320 : 400}
        zIndex={1100}
        styles={{
          mask: { backdropFilter: isMobile ? 'blur(4px)' : 'blur(8px)', backgroundColor: isMobile ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.6)' },
          content: {
            backgroundColor: isMobile ? '#fffaf0' : '#0f0d0a',
            border: isMobile ? '1.5px solid rgba(234,88,12,0.3)' : '1px solid #b8892a55',
            borderRadius: '20px',
            padding: isMobile ? '20px' : '24px',
            boxShadow: isMobile ? '0 8px 32px rgba(234,88,12,0.15)' : '0 0 40px rgba(184,137,42,0.3)',
          }
        }}
        closable={false}
      >
        <div className="text-center p-2">
          {/* Icon */}
          <div style={{
            width: 60,
            height: 60,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            background: isMobile ? 'rgba(234,88,12,0.1)' : 'rgba(184,137,42,0.15)',
            border: isMobile ? '2px solid rgba(234,88,12,0.3)' : '2px solid rgba(184,137,42,0.4)',
          }}>
            <ExclamationCircleOutlined style={{ fontSize: '28px', color: isMobile ? '#ea580c' : '#b8892a' }} />
          </div>

          {/* Title */}
          <h3 style={{
            fontFamily: "'Cinzel', serif",
            color: isMobile ? '#431407' : '#f5d78e',
            fontSize: '18px',
            fontWeight: 700,
            marginBottom: '8px',
            letterSpacing: '0.02em',
          }}>
            Confirm Logout
          </h3>

          {/* Message */}
          <p style={{
            color: isMobile ? '#78350f' : '#d4cfc9',
            marginBottom: '24px',
            fontSize: '13px',
            lineHeight: 1.6,
            opacity: isMobile ? 0.85 : 0.8,
          }}>
            Are you sure you want to logout? You will need to login again to access your profile and bookings.
          </p>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => setLogoutConfirmVisible(false)}
              className="flex-1 py-3 rounded-2xl font-bold tracking-wide text-xs uppercase transition-all"
              style={{
                background: isMobile ? 'rgba(234,88,12,0.08)' : 'rgba(255,255,255,0.05)',
                color: isMobile ? '#c2410c' : '#d4cfc9',
                border: isMobile ? '1.5px solid rgba(234,88,12,0.25)' : '1px solid rgba(255,255,255,0.1)',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={confirmLogout}
              className="flex-1 py-3 rounded-2xl font-bold tracking-wide text-xs uppercase transition-all"
              style={{
                background: isMobile
                  ? 'linear-gradient(135deg, #ea580c, #c2410c)'
                  : 'linear-gradient(135deg, #c9972c, #b8892a)',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                boxShadow: isMobile
                  ? '0 4px 16px rgba(234,88,12,0.4)'
                  : '0 0 14px rgba(184,137,42,0.3)',
              }}
            >
              Logout Now
            </button>
          </div>
        </div>
      </Modal>
    </nav>
  );
};


export default Navbar;
