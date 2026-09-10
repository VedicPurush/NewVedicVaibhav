"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useMusic } from "./MusicContext";

const GlobalBackgroundMusic = () => {
  const pathname = usePathname();
  const { musicUrl, setMusicUrl, isMuted, setIsMuted } = useMusic();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [hasUserInteraction, setHasUserInteraction] = useState(false);

  // List of paths where music is allowed to play
  // includes checks if the current path *contains* any of these strings
  const activePaths = ["/newchadhavapage", "/newchadhavapaymentpage"];

  const isMusicRoute = activePaths.some((path) =>
    (pathname ?? "").toLowerCase().includes(path.toLowerCase()),
  );

  // Stop music if we leave the allowed routes
  useEffect(() => {
    if (!isMusicRoute) {
      setMusicUrl(null);
    }
  }, [pathname, isMusicRoute, setMusicUrl]);

  useEffect(() => {
    const enablePlayback = () => setHasUserInteraction(true);

    window.addEventListener("pointerdown", enablePlayback, { once: true });
    window.addEventListener("keydown", enablePlayback, { once: true });

    return () => {
      window.removeEventListener("pointerdown", enablePlayback);
      window.removeEventListener("keydown", enablePlayback);
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = 0.2;
    audio.muted = isMuted;

    if (musicUrl && isMusicRoute) {
      const playAudio = async () => {
        try {
          if (audio.src !== musicUrl) {
            audio.src = musicUrl;
            audio.load();
          }
          if (audio.paused) {
            await audio.play();
          }
        } catch (err) {
          console.warn("Background music playback was prevented:", err);
        }
      };
      void playAudio();
    } else {
      // Stop if no URL or not on music route
      if (!audio.paused) {
        audio.pause();
        audio.currentTime = 0;
      }
    }
  }, [musicUrl, isMusicRoute, isMuted, hasUserInteraction]);

  const toggleMute = useCallback(() => {
    setHasUserInteraction(true);

    const audio = audioRef.current;
    const nextMuted = audio ? !audio.muted : !isMuted;
    setIsMuted(nextMuted);

    if (!audio) return;

    audio.muted = nextMuted;

    // Calling play directly inside the click handler satisfies browser media
    // policies even when this is the visitor's first interaction with the page.
    if (!nextMuted && musicUrl && isMusicRoute && audio.paused) {
      void audio.play().catch((err) => {
        console.warn("Background music playback was prevented:", err);
      });
    }
  }, [isMuted, isMusicRoute, musicUrl, setIsMuted]);

  // Always render audio element, so ref is stable
  return (
    <>
      <audio ref={audioRef} loop playsInline className="hidden" style={{ display: "none" }} />
      {musicUrl && isMusicRoute && (
        <button
          type="button"
          onClick={toggleMute}
          aria-label={isMuted ? "Unmute background music" : "Mute background music"}
          aria-pressed={!isMuted}
          title={isMuted ? "Unmute background music" : "Mute background music"}
          className="fixed right-3 top-[calc(env(safe-area-inset-top)+5rem)] z-[900] flex h-10 w-10 items-center justify-center rounded-full border border-orange-200 bg-white/95 text-lg text-orange-700 shadow-lg backdrop-blur transition hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 sm:right-5 sm:top-24 sm:h-11 sm:w-11 sm:text-xl"
        >
          <span aria-hidden="true">{isMuted ? "🔇" : "🔊"}</span>
        </button>
      )}
    </>
  );
};

export default GlobalBackgroundMusic;
