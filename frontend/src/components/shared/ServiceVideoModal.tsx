"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CloseOutlined, ExportOutlined } from "@ant-design/icons";
import { parseVideoLink } from "@/lib/videoLinkParser";

interface ServiceVideoModalProps {
  open: boolean;
  onClose: () => void;
  /** Absolute URL from the API — a Drive share link or a YouTube link. */
  videoUrl: string;
  title: string;
}

/**
 * Plays a delivered ritual video (chadhava today, puja next).
 *
 * Portrait-first, because that is what these are: reels shot on a phone at the
 * temple. Framed 16:9 they collapsed into a thumbnail-sized strip between two
 * black pillars, so the player is given the tallest box the viewport allows and
 * the video fills it. A landscape clip still letterboxes cleanly inside that box.
 *
 * On phones it takes over the screen instead of sitting in a dialog — there is
 * nothing on the page behind it worth keeping visible, and every pixel spent on
 * a backdrop is a pixel taken off the video.
 */
const ServiceVideoModal: React.FC<ServiceVideoModalProps> = ({
  open,
  onClose,
  videoUrl,
  title,
}) => {
  const [mounted, setMounted] = useState(false);
  /** width / height of the actual video, once the thumbnail probe below lands. */
  const [ratio, setRatio] = useState<number | null>(null);

  useEffect(() => setMounted(true), []);

  const video = parseVideoLink(videoUrl, title);
  const isDrive = video.type === "drive";
  const thumbUrl = video.thumbUrl;

  /**
   * Ask Drive how tall the video is.
   *
   * An iframe is cross-origin, so its contents cannot be measured — but Drive's
   * thumbnail endpoint renders at the video's own aspect ratio (a phone reel
   * comes back 400×711). Loading that one small image tells us whether to frame
   * the player portrait or landscape, instead of guessing and pillarboxing.
   *
   * Drive only: YouTube's hqdefault.jpg is always 4:3 with its own black bars,
   * so probing it would report a ratio the video does not have.
   */
  useEffect(() => {
    if (!open || !isDrive || !thumbUrl) return;
    let cancelled = false;
    const img = new window.Image();
    img.onload = () => {
      if (!cancelled && img.naturalWidth > 0 && img.naturalHeight > 0) {
        setRatio(img.naturalWidth / img.naturalHeight);
      }
    };
    img.src = thumbUrl;
    return () => {
      cancelled = true;
    };
  }, [open, isDrive, thumbUrl]);

  /** Escape to close, and no scrolling the bookings list behind the player. */
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  /* Until the probe answers, assume what these videos overwhelmingly are: a
     portrait reel for Drive, a normal 16:9 clip for YouTube. */
  const aspectRatio = ratio ?? (isDrive ? 9 / 16 : 16 / 9);

  return createPortal(
    /* A portal is required, not cosmetic: the booking card sets overflow:hidden,
       which would clip a player rendered inside it. */
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        /* dvh, not vh: on mobile Chrome/Safari a 100vh sheet runs on under the
           address bar, which would bury the "Open in Google Drive" button. */
        height: "100dvh",
        zIndex: 1100,
        /* Near-opaque, not a light scrim: at 0.94 the navbar and the booking
           cards read through the backdrop and the sheet looked like a glitch. */
        background: "rgba(6,6,8,0.985)",
        backdropFilter: "blur(6px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        fontFamily: "Poppins",
      }}
    >
      {/* Header — capped and centred so that on a wide screen the title sits
          above the video instead of stranded in the far corner, while on a
          phone the cap never binds and it stays a normal left-aligned heading.
          The right padding keeps it clear of the close button. */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          flexShrink: 0,
          width: "100%",
          maxWidth: 640,
          padding: "14px 60px 10px 16px",
        }}
      >
        <div
          style={{
            color: "#fff",
            fontSize: 14,
            fontWeight: 600,
            lineHeight: 1.3,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {title}
        </div>
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, marginTop: 3 }}>
          Recorded for you at the temple
        </div>
      </div>

      {/* Pinned to the viewport corner rather than the header, so it stays where
          a thumb expects it whatever the title does. */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close video"
        style={{
          position: "absolute",
          top: 12,
          right: 14,
          width: 36,
          height: 36,
          borderRadius: "50%",
          border: "none",
          background: "rgba(255,255,255,0.16)",
          color: "#fff",
          fontSize: 14,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CloseOutlined />
      </button>

      {/* Player — takes every row the header and footer leave behind. `minHeight: 0`
          is what lets a flex child actually shrink to the viewport on mobile. */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          flex: 1,
          minHeight: 0,
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 10px",
        }}
      >
        <div
          style={{
            position: "relative",
            /* Height-led with a matching aspect ratio: the box is exactly as
               tall as the screen allows and exactly as wide as the video needs,
               so nothing is letterboxed. maxWidth clamps it on a narrow phone,
               where the browser trades a little height back. */
            height: "100%",
            width: "auto",
            aspectRatio: String(aspectRatio),
            maxWidth: "100%",
            background: "#000",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <iframe
            src={video.embedUrl}
            title={title}
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
          />
        </div>
      </div>

      {/* Footer — the escape hatch. A Drive file whose sharing was never opened
          up renders as a permission page inside the iframe, and this link is the
          only way the devotee can do anything about it. */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ flexShrink: 0, width: "100%", padding: "12px 16px 16px", textAlign: "center" }}
      >
        <a
          href={videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            color: "#fff",
            background: "rgba(255,255,255,0.12)",
            borderRadius: 999,
            padding: "9px 18px",
            fontSize: 12.5,
            fontWeight: 500,
          }}
        >
          <ExportOutlined />
          {isDrive ? "Open in Google Drive" : "Open in a new tab"}
        </a>
      </div>
    </div>,
    document.body,
  );
};

export default ServiceVideoModal;
