"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useMoney } from "@/lib/currency";
import { Dialog, Box, Typography, Button, IconButton, Slide } from "@mui/material";
import type { TransitionProps } from "@mui/material/transitions";
import CloseIcon from "@mui/icons-material/Close";
import CardGiftcardIcon from "@mui/icons-material/CardGiftcard";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import { useSearchParams } from "next/navigation";

/**
 * Vedic Vaibhav — "Get the app" modal.
 *
 * Shown ONLY to visitors who arrive on a partner/affiliate referral link (`?ref=<code>`), and
 * only once per code — a visitor who has already seen it for that code never sees it again, on
 * any later visit. The gate is the `?ref=` in the URL, so it behaves identically on localhost
 * and on the live domain; nothing here is environment-specific.
 *
 * The referral code is embedded into the Play Store link as the **install referrer**
 * (`referrer=referralCode=<code>`). When they install and log in, the app reads that install
 * referrer and links the account to the referrer — so every in-app purchase is attributed to the
 * same promoter/partner/affiliate. If they dismiss and buy on the website instead, the existing
 * `?ref=` → checkout attribution already covers that path.
 */

const APP_PACKAGE = "com.rahulrajput025.client";
/** Codes already shown, so the modal survives reloads and future visits — not just the session. */
const SHOWN_CODES_KEY = "vv_app_modal_shown_refs";
const LOGO_URL =
  "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/logo/vvfinallogo.png";

/** Brand saffron, matching the site's theme-color meta and the "GET APP" navbar strip. */
const BRAND = "#FF6B00";
const BRAND_DEEP = "#E04300";

/** Set by the referral-capture script in the root layout on a referral arrival. */
const REF_ARRIVAL_KEY = "vv_ref_arrival";

/**
 * The referral code for this visit, or "" when the visitor did not arrive on a referral link.
 *
 * Reading `?ref=` off the URL does NOT work here: the inline referral-capture script in the
 * root layout strips the param with history.replaceState before React hydrates, so React
 * always observes an empty search on a real referral landing. That script stores the code in
 * sessionStorage under `vv_ref_arrival` instead, which is the signal we rely on. The URL is
 * still checked first, to catch an in-app SPA navigation carrying a ?ref= — those never reach
 * the inline script, so the param survives.
 */
function refCodeForThisVisit(search: string): string {
  try {
    const fromUrl = new URLSearchParams(search).get("ref")?.trim();
    if (fromUrl) return fromUrl;
    return sessionStorage.getItem(REF_ARRIVAL_KEY)?.trim() || "";
  } catch {
    return "";
  }
}

/** Reads the shown-codes list, tolerating blocked, missing or corrupt storage. */
function readShownCodes(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(SHOWN_CODES_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((c): c is string => typeof c === "string") : [];
  } catch {
    // Unreadable/corrupt storage: treat as not-yet-shown rather than suppressing the modal.
    return [];
  }
}

function alreadyShownFor(code: string): boolean {
  return readShownCodes().includes(code);
}

function markShownFor(code: string): void {
  const codes = readShownCodes();
  if (codes.includes(code)) return;
  try {
    localStorage.setItem(SHOWN_CODES_KEY, JSON.stringify([...codes, code]));
  } catch {
    /* storage blocked — modal may reappear on a later visit, which is acceptable */
  }
}

/** Play Store URL; when a referral code exists it is passed as the install referrer. */
function playStoreUrl(code: string): string {
  const base = `https://play.google.com/store/apps/details?id=${APP_PACKAGE}`;
  if (!code) return base;
  return `${base}&referrer=${encodeURIComponent(`referralCode=${code}`)}`;
}

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & { children: React.ReactElement },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

/** Google Play mark, inlined so the modal needs no extra network request to render its CTA. */
const PlayMark = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 512 512" aria-hidden="true" focusable="false">
    <path
      fill="currentColor"
      d="M325.3 234.3 104.6 13l280.8 161.2-60.1 60.1zM47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0zm425.2 225.6-58.9-34.1-65.7 64.5 65.7 64.5 60.1-34.1c18-14.3 18-46.5-1.2-60.8zM104.6 499l280.8-161.2-60.1-60.1L104.6 499z"
    />
  </svg>
);

function AppDownloadModalInner() {
  /** Subscribes this component to country/rate changes for the banner below. */
  const { money } = useMoney();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const searchParams = useSearchParams();
  const searchString = searchParams.toString();
  const search = searchString ? `?${searchString}` : "";

  // Re-runs on route change, so a `?ref=` picked up during an in-app SPA navigation opens the
  // modal too — not only a landing from an external referral link.
  useEffect(() => {
    const visitCode = refCodeForThisVisit(search);
    if (!visitCode || alreadyShownFor(visitCode)) return;

    const t = window.setTimeout(() => {
      setCode(visitCode);
      setOpen(true);
      markShownFor(visitCode);
    }, 1600);
    return () => window.clearTimeout(t);
  }, [search]);

  const handleClose = () => setOpen(false);

  const handleGetApp = () => {
    try {
      window.open(playStoreUrl(code), "_blank", "noopener,noreferrer");
    } catch {
      window.location.href = playStoreUrl(code);
    }
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      TransitionComponent={Transition}
      maxWidth="xs"
      fullWidth
      aria-labelledby="vv-app-modal-title"
      BackdropProps={{ sx: { backgroundColor: "rgba(38,16,4,0.62)", backdropFilter: "blur(3px)" } }}
      PaperProps={{
        sx: {
          borderRadius: 4,
          overflow: "hidden",
          m: 2,
          boxShadow: "0 24px 60px -12px rgba(120,45,0,0.55)",
        },
      }}
    >
      <Box sx={{ position: "relative", p: 0 }}>
        {/* Header band */}
        <Box
          sx={{
            position: "relative",
            background: `linear-gradient(150deg, ${BRAND} 0%, ${BRAND_DEEP} 100%)`,
            px: 3,
            pt: 4,
            pb: 3.5,
            textAlign: "center",
            color: "#fff",
            overflow: "hidden",
            // Soft light bloom behind the logo, so the band reads as depth rather than a flat fill.
            "&::before": {
              content: '""',
              position: "absolute",
              top: -70,
              left: "50%",
              transform: "translateX(-50%)",
              width: 240,
              height: 240,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(255,255,255,0.30), rgba(255,255,255,0) 70%)",
              pointerEvents: "none",
            },
          }}
        >
          <IconButton
            onClick={handleClose}
            aria-label="Close"
            size="small"
            sx={{
              position: "absolute",
              top: 10,
              right: 10,
              color: "#fff",
              bgcolor: "rgba(0,0,0,0.16)",
              "&:hover": { bgcolor: "rgba(0,0,0,0.3)" },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>

          <Box
            sx={{
              position: "relative",
              width: 76,
              height: 76,
              borderRadius: "22px",
              mx: "auto",
              mb: 1.75,
              bgcolor: "#fff",
              display: "grid",
              placeItems: "center",
              boxShadow: "0 10px 24px -6px rgba(0,0,0,0.35)",
            }}
          >
            <Box
              component="img"
              src={LOGO_URL}
              alt="Vedic Vaibhav"
              loading="lazy"
              sx={{ width: 56, height: 56, objectFit: "contain" }}
            />
          </Box>

          <Typography
            id="vv-app-modal-title"
            variant="h6"
            sx={{
              fontWeight: 800,
              position: "relative",
              letterSpacing: "-0.2px",
              // Keeps the title on one line on narrow phones instead of orphaning "App".
              fontSize: { xs: "1.06rem", sm: "1.25rem" },
            }}
          >
            Get the Vedic Vaibhav App
          </Typography>
          <Typography
            variant="body2"
            sx={{
              opacity: 0.95,
              mt: 0.5,
              position: "relative",
              fontSize: { xs: "0.8rem", sm: "0.875rem" },
            }}
          >
            Faster booking, live order tracking &amp; member-only offers.
          </Typography>

          {/* The same incentive the site's top banner advertises. */}
          <Box
            sx={{
              position: "relative",
              display: "inline-flex",
              alignItems: "center",
              gap: 0.75,
              mt: 2,
              px: 1.75,
              py: 0.75,
              borderRadius: 99,
              bgcolor: "#fff",
              color: BRAND_DEEP,
              boxShadow: "0 4px 12px -2px rgba(0,0,0,0.2)",
            }}
          >
            <LocalOfferIcon sx={{ fontSize: 15 }} />
            <Typography variant="caption" sx={{ fontWeight: 800, letterSpacing: "0.2px" }}>
              {money(50)} OFF YOUR FIRST BOOKING
            </Typography>
          </Box>
        </Box>

        {/* Body */}
        <Box sx={{ px: 3, py: 3 }}>
          {/* Invite panel — the code is the point of this modal, so it leads. */}
          <Box
            sx={{
              p: 2,
              mb: 2.25,
              borderRadius: 3,
              bgcolor: "#fff7ed",
              border: "1px solid #fed7aa",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.25 }}>
              <CardGiftcardIcon sx={{ color: BRAND_DEEP, fontSize: 19 }} />
              <Typography variant="body2" sx={{ fontWeight: 800, color: "#7c2d12" }}>
                You've been invited
              </Typography>
            </Box>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1,
                px: 1.5,
                py: 1,
                borderRadius: 2,
                bgcolor: "#fff",
                border: "1px dashed #fdba74",
              }}
            >
              <Typography
                variant="caption"
                sx={{ color: "#9a3412", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px" }}
              >
                Invite code
              </Typography>
              <Typography
                sx={{
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                  fontWeight: 800,
                  fontSize: "1rem",
                  color: BRAND_DEEP,
                  letterSpacing: "1px",
                }}
              >
                {code}
              </Typography>
            </Box>

            <Typography variant="caption" sx={{ color: "#b45309", display: "block", mt: 1.25, lineHeight: 1.5 }}>
              Install using the button below to keep your invite linked to your account.
            </Typography>
          </Box>

          {/* Dark CTA: separates from the saffron header and reads as a real store badge. */}
          <Button
            fullWidth
            variant="contained"
            size="large"
            disableElevation
            startIcon={<PlayMark size={20} />}
            onClick={handleGetApp}
            sx={{
              textTransform: "none",
              borderRadius: 2.5,
              py: 1.35,
              bgcolor: "#1a1a1a",
              color: "#fff",
              justifyContent: "center",
              boxShadow: "0 10px 24px -10px rgba(0,0,0,0.65)",
              "&:hover": { bgcolor: "#000" },
              "& .MuiButton-startIcon": { mr: 1.5 },
            }}
          >
            <Box sx={{ textAlign: "left", lineHeight: 1.1 }}>
              <Typography
                sx={{ fontSize: "0.6rem", opacity: 0.75, letterSpacing: "0.8px", textTransform: "uppercase" }}
              >
                Get it on
              </Typography>
              <Typography sx={{ fontSize: "1rem", fontWeight: 700, lineHeight: 1.2 }}>
                Google Play
              </Typography>
            </Box>
          </Button>

          <Button
            fullWidth
            onClick={handleClose}
            sx={{
              mt: 1.25,
              textTransform: "none",
              fontWeight: 600,
              color: "text.secondary",
              "&:hover": { bgcolor: "transparent", color: BRAND_DEEP },
            }}
          >
            Continue on website
          </Button>

          {/* Existing site claim (see the root metadata description) — not a new promise. */}
          <Typography
            variant="caption"
            sx={{ display: "block", textAlign: "center", mt: 1, color: "text.disabled" }}
          >
            Trusted by 1 lakh+ devotees across India
          </Typography>
        </Box>
      </Box>
    </Dialog>
  );
}

export default function AppDownloadModal() {
  // useSearchParams must sit under a Suspense boundary when rendered globally.
  return (
    <Suspense fallback={null}>
      <AppDownloadModalInner />
    </Suspense>
  );
}
