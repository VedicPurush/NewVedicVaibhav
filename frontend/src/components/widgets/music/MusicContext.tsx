"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

interface MusicContextType {
  musicUrl: string | null;
  setMusicUrl: (url: string | null) => void;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

export const MusicProvider = ({ children }: { children: ReactNode }) => {
  const [musicUrl, setMusicUrl] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    setIsMuted(localStorage.getItem("vv_background_music_muted") === "true");
  }, []);

  const updateMuted = useCallback((muted: boolean) => {
    setIsMuted(muted);
    localStorage.setItem("vv_background_music_muted", String(muted));
  }, []);

  return (
    <MusicContext.Provider value={{ musicUrl, setMusicUrl, isMuted, setIsMuted: updateMuted }}>
      {children}
    </MusicContext.Provider>
  );
};

export const useMusic = () => {
  const context = useContext(MusicContext);
  if (!context) {
    throw new Error("useMusic must be used within a MusicProvider");
  }
  return context;
};
