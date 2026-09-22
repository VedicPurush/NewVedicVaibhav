"use client";

import { useState } from "react";
import { ClockCircleOutlined, PlayCircleFilled } from "@ant-design/icons";
import ServiceVideoModal from "@/components/shared/ServiceVideoModal";
import type { ServiceVideo } from "@/hooks/queries/useServiceVideosQuery";

/**
 * Videos delivered to this devotee that no booking on the page claims.
 *
 * Order ids are typed into the ops sheet by hand and bookings get archived, so
 * a video can outlive the record it belongs to. Dropping it would mean the
 * devotee paid for a ritual, the video exists, and the site shows nothing —
 * so it is listed here instead, with its order id so support can trace it.
 *
 * Renders nothing when everything matched, which is the normal case.
 */
const UnlinkedChadhavaVideos: React.FC<{ videos: ServiceVideo[] }> = ({ videos }) => {
  const [openUrl, setOpenUrl] = useState<string | null>(null);

  if (videos.length === 0) return null;

  return (
    <div
      style={{
        border: "1px solid rgba(0,0,0,0.08)",
        borderRadius: 12,
        padding: 14,
        marginBottom: 16,
        backgroundColor: "#fffaf5",
        fontFamily: "Poppins",
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 600, color: "rgba(0,0,0,0.8)" }}>
        Your Chadhava Videos
      </div>
      <div style={{ fontSize: 12, color: "rgba(0,0,0,0.55)", marginTop: 2 }}>
        Recorded at the temple for your offerings.
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
        {videos.map((video) => (
          <div
            key={video._id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: 12.5, color: "rgba(0,0,0,0.65)", minWidth: 0, wordBreak: "break-word" }}>
              Order ID: {video.orderId || "N/A"}
            </span>
            {video.status === "ready" ? (
              <button
                type="button"
                onClick={() => setOpenUrl(video.videoUrl)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "linear-gradient(135deg, #7A0F1F 0%, #C2410C 100%)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "7px 14px",
                  fontFamily: "Poppins",
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <PlayCircleFilled style={{ fontSize: 14 }} />
                Watch
              </button>
            ) : (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "#FFF4E5",
                  border: "1px solid #FFD8A8",
                  color: "#9A4B00",
                  borderRadius: 8,
                  padding: "6px 12px",
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                <ClockCircleOutlined style={{ fontSize: 13 }} />
                Coming soon
              </span>
            )}
          </div>
        ))}
      </div>

      {openUrl && (
        <ServiceVideoModal
          open
          onClose={() => setOpenUrl(null)}
          videoUrl={openUrl}
          title="Your Chadhava Video"
        />
      )}
    </div>
  );
};

export default UnlinkedChadhavaVideos;
