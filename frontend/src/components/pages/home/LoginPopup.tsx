"use client";

import React, { useEffect, useRef, useState } from "react";
import LoginModel from "./LoginModel";

const PROFILE_DELAY = 30000; // 30 seconds

type ReminderKind = "login" | "profile" | null;

interface PopupShellProps {
  icon?: React.ReactNode;
  title: string;
  subtitle: string;
  primary: string;
  secondary: string;
  onPrimary: () => void;
  onSecondary: () => void;
  children?: React.ReactNode;
}

/**
 * Declared at module scope, not inside the parent component. Defining it inline
 * created a new component *type* on every render, so React tore down and rebuilt
 * the whole popup — replaying the entrance animation and dropping focus.
 */
const PopupShell: React.FC<PopupShellProps> = ({
  icon,
  title,
  subtitle,
  primary,
  secondary,
  onPrimary,
  onSecondary,
  children,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);

  // Escape closes, focus starts inside the dialog, and Tab is kept within it.
  useEffect(() => {
    primaryRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onSecondary();
        return;
      }

      if (e.key !== "Tab" || !dialogRef.current) return;

      const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onSecondary]);

  return (
    /* The container used to be a bare `fixed inset-0` with no background — an
       invisible full-viewport layer that silently swallowed every click on the
       page while the popup was open. It now reads as a real modal backdrop and
       dismisses on click. */
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 px-4"
      onClick={onSecondary}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="relative rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden animate-slide-in-bounce"
        style={{
          background:
            "linear-gradient(135deg, #FEF3C7 0%, #FDE68A 25%, #FCD34D 50%, #F59E0B 75%, #D97706 100%)",
          boxShadow:
            "0 20px 60px -15px rgba(217, 119, 6, 0.5), 0 0 0 1px rgba(251, 191, 36, 0.3)",
          fontFamily: "'Poppins', 'Inter', sans-serif",
        }}
      >
        <div className="relative p-6 text-center">
          {icon && (
            <div className="relative inline-flex items-center justify-center mb-4">
              <div className="absolute inset-0 bg-orange-400 rounded-full blur-xl opacity-50 animate-pulse" />
              <div className="relative bg-white rounded-full p-3 shadow-lg">{icon}</div>
            </div>
          )}

          <h2 className="text-2xl font-bold text-orange-900 mb-2 relative">
            <span className="relative inline-block">
              {title}
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-50 animate-shimmer" />
            </span>
          </h2>
          <p className="text-sm text-orange-800 font-medium mb-5">{subtitle}</p>

          {children}

          <div className="flex gap-3 justify-center">
            <button
              type="button"
              onClick={onSecondary}
              className="px-5 py-2.5 rounded-xl text-orange-800 transition-all font-semibold text-sm transform hover:scale-105 underline-offset-4 hover:underline"
            >
              {secondary}
            </button>
            <button
              ref={primaryRef}
              type="button"
              onClick={onPrimary}
              className="relative px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold hover:from-orange-700 hover:to-red-700 transition-all text-sm shadow-lg hover:shadow-xl transform hover:scale-105 overflow-hidden group"
            >
              <span className="relative z-10 flex items-center gap-2">{primary}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const LoginReminderModal: React.FC = () => {
  // One reminder at a time — the two are mutually exclusive by definition
  // (logged out vs logged in but incomplete), so a single piece of state and a
  // single timer replace the two overlapping timers plus the `hasReminded` flag
  // that was captured stale in its own closure and always read false.
  const [reminder, setReminder] = useState<ReminderKind>(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      const raw = localStorage.getItem("userDetails");

      if (!raw) {
        setReminder("login");
        return;
      }

      try {
        const userDetails = JSON.parse(raw);
        if (!userDetails?.user?.isUpdated) setReminder("profile");
      } catch {
        // Corrupt entry — treat it as logged out rather than nagging.
        setReminder("login");
      }
    }, PROFILE_DELAY);

    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => setReminder(null);

  const handleLogin = () => {
    setReminder(null);
    setLoginModalOpen(true);
  };

  const handleProfileComplete = () => {
    setReminder(null);
    window.location.href = "/profile";
  };

  return (
    <>
      {reminder === "login" && (
        <PopupShell
          icon={
            <span className="block h-20">
              <img
                loading="lazy"
                src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/logo/vvfinallogo.png"
                alt=""
                aria-hidden="true"
                width={80}
                height={64}
                className="w-20 h-16"
              />
            </span>
          }
          title="Join Your Spiritual Path"
          subtitle="🪔 Begin your sacred journey with us"
          primary="Login Now ✨"
          secondary="Maybe Later"
          onPrimary={handleLogin}
          onSecondary={dismiss}
        >
          <div className="my-2 flex flex-col items-center">
            <div className="bg-orange-100 border border-orange-300 rounded-xl px-3 py-2 text-base font-semibold text-orange-700 shadow-sm mb-1 flex items-center gap-2">
              <span>Login now and get a promo code for your first booking!</span>
            </div>
            <span className="text-xs text-gray-500 mt-1">
              Use during your first order for an exclusive discount.
            </span>
          </div>
        </PopupShell>
      )}

      {reminder === "profile" && (
        <PopupShell
          icon={<span className="text-4xl">🪔</span>}
          title="Complete Your Spiritual Profile"
          subtitle="Fill your details to experience the full journey and connect deeper with the community."
          primary="Complete Now"
          secondary="Skip for Now"
          onPrimary={handleProfileComplete}
          onSecondary={dismiss}
        />
      )}

      {loginModalOpen && (
        <LoginModel
          modalOpen={loginModalOpen}
          setModalOpen={setLoginModalOpen}
          onLoginSuccess={() => setLoginModalOpen(false)}
        />
      )}
    </>
  );
};

export default LoginReminderModal;
