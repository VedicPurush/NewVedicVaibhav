import { api } from "@/lib/api";
import type { SevaPackage } from "../data/sevaData";

interface BBPackageAPI {
  _id: string;
  packageName: string;
  packagePrice: number;
  numberOfDays: number;
  description: string;
  prasadBoxIncludes?: string[];
}

/** Assign badge/highlighted based on sorted position */
function assignBadges(sorted: BBPackageAPI[]): SevaPackage[] {
  const n = sorted.length;
  return sorted.map((pkg, i): SevaPackage => {
    const perDayAmt = pkg.numberOfDays > 1
      ? Math.round(pkg.packagePrice / pkg.numberOfDays)
      : null;

    // badge logic: second pkg = recommended, second-to-last = best value, last = maha seva
    let badge: string | undefined;
    let badgeColor: string | undefined;
    let highlighted = false;

    if (n >= 3 && i === 1) {
      badge = "Recommended";
      badgeColor = "rose";
      highlighted = true;
    } else if (n >= 2 && i === n - 2 && i !== 1) {
      badge = "Best Value";
      badgeColor = "gold";
    } else if (i === n - 1 && n >= 2) {
      badge = "Maha Seva";
      badgeColor = "peacock";
    }

    return {
      id: pkg._id,
      name: pkg.packageName,          // ← package name from MongoDB
      duration: pkg.packageName,
      days: pkg.numberOfDays,
      price: pkg.packagePrice,
      priceDisplay: `₹${pkg.packagePrice.toLocaleString("en-IN")}`,
      perDay: perDayAmt ? `₹${perDayAmt}/day` : undefined,
      features: pkg.description
        .split(/[\n,•]+/) // support commas, newlines, and bullet separators
        .map((f) => f.trim().replace(/^[-•\s]+/, ""))
        .filter(Boolean),
      prasadItems: pkg.prasadBoxIncludes || [],
      badge,
      badgeColor,
      highlighted,
    };
  });
}

export async function fetchBBPackages(): Promise<SevaPackage[]> {
  const { data } = await api.get<BBPackageAPI[]>(`/bb-packages`);
  const sorted = [...data].sort((a, b) => a.numberOfDays - b.numberOfDays);
  return assignBadges(sorted);
}
