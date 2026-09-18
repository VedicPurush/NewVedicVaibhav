"use client";

/**
 * The "View Details" control shared by the booking cards.
 *
 * Each card keeps only what identifies a booking on its face at phone width —
 * what was booked, for how much, and its status — and collapses the identifiers,
 * contact block and long-form copy behind this. A wide screen has room for all
 * of it at once, so the cards do not render the toggle there at all.
 */
const DetailsToggle = ({ open, onToggle }: { open: boolean; onToggle: () => void }) => (
  <button
    type="button"
    onClick={onToggle}
    aria-expanded={open}
    className="w-full mt-3 pt-3 border-t border-gray-100 flex items-center justify-end gap-1 text-xs font-semibold text-orange-600"
  >
    {open ? "Hide Details" : "View Details"}
    <svg
      className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
    </svg>
  </button>
);

export default DetailsToggle;
