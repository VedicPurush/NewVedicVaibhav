"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import CloseIcon from "@mui/icons-material/Close";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import AutoStoriesIcon from "@mui/icons-material/AutoStories";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
import { IJyotirlinga } from "../index";

interface Props {
  jyotirlinga: IJyotirlinga | null;
  onClose: () => void;
}

function parseQuillDeltaLines(raw: string): string[] {
  try {
    const delta = JSON.parse(raw);
    if (!delta?.ops) return [raw];
    const text = delta.ops
      .map((op: { insert?: unknown }) => (typeof op.insert === "string" ? op.insert : ""))
      .join("");
    return text
      .split("\n")
      .map((l: string) => l.trim())
      .filter((l: string) => l.length > 0);
  } catch {
    return [raw];
  }
}

const JyotirlingaInfoModal: React.FC<Props> = ({ jyotirlinga, onClose }) => {
  return (
    <AnimatePresence>
      {jyotirlinga && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 backdrop-blur-sm"
            style={{ background: "rgba(67,20,7,0.55)" }}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 24 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none px-4"
          >
            <div
              className="relative w-full max-w-md rounded-3xl pointer-events-auto overflow-hidden flex flex-col"
              style={{
                maxHeight: "88vh",
                background: "#fffaf0",
                border: "1.5px solid rgba(234,88,12,0.25)",
                boxShadow: "0 8px 48px rgba(194,65,12,0.18), 0 2px 16px rgba(234,88,12,0.12)",
              }}
            >
              {/* Bhagwa top accent bar */}
              <div
                className="h-1.5 w-full flex-shrink-0"
                style={{
                  background: "linear-gradient(90deg, transparent, #fef08a, #f97316, #ea580c, #f97316, #fef08a, transparent)",
                }}
              />

              {/* Header */}
              <div
                className="flex items-start justify-between px-5 pt-4 pb-4 flex-shrink-0"
                style={{ borderBottom: "1px solid rgba(234,88,12,0.12)" }}
              >
                <div className="flex items-start gap-3">
                  {/* Temple icon badge */}
                  <div
                    className="flex-shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center text-xl"
                    style={{
                      background: "linear-gradient(135deg, #fef08a, #f97316)",
                      boxShadow: "0 4px 12px rgba(234,88,12,0.25)",
                    }}
                  >
                    🛕
                  </div>
                  <div>
                    <h3
                      className="text-base font-bold leading-tight"
                      style={{ fontFamily: "'Cinzel', serif", color: "#c2410c" }}
                    >
                      {jyotirlinga.nameEnglish}
                    </h3>
                    <p
                      className="text-sm font-medium mt-0.5"
                      style={{ fontFamily: "'Cinzel', serif", color: "#ea580c" }}
                    >
                      {jyotirlinga.nameHindi}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <LocationOnIcon sx={{ fontSize: 13, color: "#9a3412" }} />
                      <p className="text-xs" style={{ color: "#9a3412" }}>
                        {jyotirlinga.location}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="flex-shrink-0 ml-3 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                  style={{
                    background: "rgba(234,88,12,0.08)",
                    color: "#c2410c",
                    border: "1px solid rgba(234,88,12,0.2)",
                  }}
                >
                  <CloseIcon sx={{ fontSize: 18 }} />
                </button>
              </div>

              {/* Scrollable Body */}
              <style>{`
                .jyotirlinga-modal-scroll::-webkit-scrollbar { width: 4px; }
                .jyotirlinga-modal-scroll::-webkit-scrollbar-track { background: transparent; }
                .jyotirlinga-modal-scroll::-webkit-scrollbar-thumb { background: linear-gradient(180deg, #fef08a, #f97316); border-radius: 999px; }
                .jyotirlinga-modal-scroll::-webkit-scrollbar-thumb:hover { background: #ea580c; }
              `}</style>
              <div className="overflow-y-auto flex-1 jyotirlinga-modal-scroll">

                {/* Info Image */}
                {jyotirlinga.infoImage && (
                  <div className="w-full overflow-hidden px-4 pt-4 pb-2">
                    <div
                      className="w-full rounded-2xl overflow-hidden"
                      style={{
                        border: "1.5px solid rgba(234,88,12,0.2)",
                        boxShadow: "0 4px 20px rgba(194,65,12,0.1)",
                      }}
                    >
                      <img loading="lazy" 
                        src={jyotirlinga.infoImage}
                        alt={`${jyotirlinga.nameEnglish} info`}
                        className="w-full object-cover"
                        style={{ maxHeight: "200px" }}
                       />
                    </div>
                  </div>
                )}

                <div className="px-5 py-4 space-y-5">
                  {/* Description */}
                  {jyotirlinga.infoDescription && (() => {
                    const lines = parseQuillDeltaLines(jyotirlinga.infoDescription);
                    return (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <AutoStoriesIcon sx={{ fontSize: 14, color: "#ea580c" }} />
                          <p
                            className="text-xs font-bold uppercase tracking-widest"
                            style={{ color: "#c2410c" }}
                          >
                            About this Jyotirlinga
                          </p>
                        </div>

                        {lines.length > 1 ? (
                          <ul className="space-y-2.5">
                            {lines.map((line, idx) => (
                              <li
                                key={idx}
                                className="flex items-start gap-3 text-sm leading-relaxed"
                                style={{ color: "#431407" }}
                              >
                                <span
                                  className="mt-2 flex-shrink-0 w-1.5 h-1.5 rounded-full"
                                  style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}
                                />
                                {line}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p
                            className="text-sm leading-relaxed"
                            style={{ color: "#431407" }}
                          >
                            {lines[0]}
                          </p>
                        )}
                      </div>
                    );
                  })()}

                  {/* Divider between sections */}
                  {jyotirlinga.infoDescription && jyotirlinga.miniatureImages && jyotirlinga.miniatureImages.length > 0 && (
                    <div
                      className="w-full h-px"
                      style={{ background: "linear-gradient(90deg, transparent, rgba(234,88,12,0.2), transparent)" }}
                    />
                  )}

                  {/* Gallery */}
                  {jyotirlinga.miniatureImages && jyotirlinga.miniatureImages.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <PhotoLibraryIcon sx={{ fontSize: 14, color: "#ea580c" }} />
                        <p
                          className="text-xs font-bold uppercase tracking-widest"
                          style={{ color: "#c2410c" }}
                        >
                          Gallery
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        {jyotirlinga.miniatureImages.map((url, idx) => (
                          <div
                            key={idx}
                            className="rounded-xl overflow-hidden aspect-square"
                            style={{
                              border: "1.5px solid rgba(234,88,12,0.18)",
                              boxShadow: "0 2px 10px rgba(194,65,12,0.08)",
                            }}
                          >
                            <img loading="lazy" 
                              src={url}
                              alt={`${jyotirlinga.nameEnglish} ${idx + 1}`}
                              className="w-full h-full object-cover"
                             />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Fallback */}
                  {!jyotirlinga.infoImage && !jyotirlinga.infoDescription && (!jyotirlinga.miniatureImages || jyotirlinga.miniatureImages.length === 0) && (
                    <div className="py-8 text-center">
                      <div className="text-4xl mb-3">🛕</div>
                      <p className="text-sm" style={{ color: "#9a3412" }}>
                        Detailed temple info coming soon.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div
                className="px-5 pb-5 pt-4 flex-shrink-0"
                style={{ borderTop: "1px solid rgba(234,88,12,0.1)" }}
              >
                <button
                  onClick={onClose}
                  className="w-full py-2.5 rounded-2xl text-sm font-bold tracking-wide transition-all duration-200"
                  style={{
                    background: "linear-gradient(135deg, #fef08a, #f97316)",
                    color: "#431407",
                    border: "none",
                    boxShadow: "0 4px 16px rgba(234,88,12,0.3)",
                    letterSpacing: "0.04em",
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default JyotirlingaInfoModal;
