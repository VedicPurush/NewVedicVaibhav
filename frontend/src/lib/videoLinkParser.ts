export interface ParsedVideo {
  embedUrl: string;
  thumbUrl: string;
  type: "youtube" | "drive" | "unknown";
  title: string;
}

/** Converts a full YouTube or Google Drive share URL into embedUrl + thumbUrl. */
export const parseVideoLink = (raw: string, title: string): ParsedVideo => {
  const url = (raw || "").trim();

  // YouTube: watch?v=ID, youtu.be/ID, /shorts/ID, /embed/ID
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  );
  if (ytMatch) {
    const id = ytMatch[1];
    return {
      embedUrl: `https://www.youtube.com/embed/${id}?autoplay=0&mute=0&playsinline=1`,
      thumbUrl: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
      type: "youtube",
      title,
    };
  }

  // Google Drive: drive.google.com/file/d/FILE_ID/... — and the host-less
  // "file/d/FILE_ID/view?usp=drive_link" form the ops tool writes into `links`,
  // which is a perfectly good Drive path with only the domain missing.
  const driveMatch = url.match(/(?:drive\.google\.com\/)?\bfile\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch) {
    const id = driveMatch[1];
    return {
      embedUrl: `https://drive.google.com/file/d/${id}/preview`,
      thumbUrl: `https://drive.google.com/thumbnail?id=${id}&sz=w400`,
      type: "drive",
      title,
    };
  }

  return { embedUrl: url, thumbUrl: "", type: "unknown", title };
};

export const FALLBACK_VIDEOS: ParsedVideo[] = [
  "bsfHGON6YvM", "ZA3Tl_B6GuE", "WwsnWvXU6gM",
  "rjdpIc9m2nM", "SpsBWQnwCSw", "zCs7O3Ga-RE", "T_3SS5XTtns",
].map((id, i) => ({
  embedUrl: `https://www.youtube.com/embed/${id}?autoplay=0&mute=0&playsinline=1`,
  thumbUrl: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
  type: "youtube" as const,
  title: `Vedic Vaibhav reel ${i + 1}`,
}));
