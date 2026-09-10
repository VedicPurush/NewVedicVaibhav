export interface PujaBadge {
  icon: string;
  label: string;
  className: string;
}

/**
 * The API only exposes two boolean signals (isFeatured/isExclusive) — there's no
 * categorical "Trending"/"Best Seller"/etc. field. FEATURED_BADGE and EXCLUSIVE_BADGE
 * are grounded in those real flags; CYCLE_BADGES fills in visual variety for the rest,
 * sized to exactly one page (12) so a full grid page never repeats a badge.
 */
const CYCLE_BADGES: PujaBadge[] = [
  { icon: "📈", label: "Trending", className: "bg-blue-500" },
  { icon: "⭐", label: "Best Seller", className: "bg-purple-500" },
  { icon: "❤️", label: "Devotee's Choice", className: "bg-rose-500" },
  { icon: "⏳", label: "Limited Seats", className: "bg-amber-500" },
  { icon: "✨", label: "New", className: "bg-emerald-500" },
  { icon: "🙌", label: "Popular", className: "bg-orange-600" },
  { icon: "💎", label: "Best Value", className: "bg-teal-500" },
  { icon: "🌟", label: "Special", className: "bg-fuchsia-500" },
  { icon: "🔒", label: "Secure Booking", className: "bg-slate-600" },
  { icon: "🕉️", label: "Divine Blessings", className: "bg-yellow-600" },
  { icon: "🤝", label: "Trusted Priests", className: "bg-indigo-600" },
  { icon: "🎯", label: "Top Rated", className: "bg-cyan-600" },
];

const FEATURED_BADGE: PujaBadge = { icon: "🔥", label: "Most Popular", className: "bg-orange-500" };
const EXCLUSIVE_BADGE: PujaBadge = { icon: "💎", label: "Exclusive", className: "bg-teal-600" };

export function getPujaBadge(index: number, isFeatured?: boolean, isExclusive?: boolean): PujaBadge {
  if (isFeatured) return FEATURED_BADGE;
  if (isExclusive) return EXCLUSIVE_BADGE;
  return CYCLE_BADGES[index % CYCLE_BADGES.length];
}
