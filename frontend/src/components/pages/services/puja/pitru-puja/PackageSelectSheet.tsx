"use client";

import React from "react";
import CloseIcon from "@mui/icons-material/Close";
import PersonIcon from "@mui/icons-material/Person";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

export interface PujaPackage {
  id: string;
  title: string;
  persons: number;
  price: number;
  image?: string;
  accent: "rose" | "violet" | "amber";
}

const ACCENT_STYLES: Record<
  PujaPackage["accent"],
  { bg: string; border: string; badge: string; price: string; dot: string; iconBg: string; iconColor: string }
> = {
  rose: {
    bg: "bg-rose-50",
    border: "border-rose-300",
    badge: "text-rose-500",
    price: "text-rose-600",
    dot: "bg-rose-500",
    iconBg: "bg-rose-100",
    iconColor: "#F43F5E",
  },
  violet: {
    bg: "bg-violet-50",
    border: "border-violet-300",
    badge: "text-violet-500",
    price: "text-violet-600",
    dot: "bg-violet-500",
    iconBg: "bg-violet-100",
    iconColor: "#8B5CF6",
  },
  amber: {
    bg: "bg-amber-50",
    border: "border-amber-300",
    badge: "text-amber-500",
    price: "text-amber-600",
    dot: "bg-amber-500",
    iconBg: "bg-amber-100",
    iconColor: "#D97706",
  },
};

interface PackageSelectSheetProps {
  isOpen: boolean;
  packages: PujaPackage[];
  selectedId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
  onProceed: (pkg: PujaPackage) => void;
}

const PackageSelectSheet: React.FC<PackageSelectSheetProps> = ({
  isOpen,
  packages,
  selectedId,
  onSelect,
  onClose,
  onProceed,
}) => {
  if (!isOpen || packages.length === 0) return null;

  const selectedPackage = packages.find((pkg) => pkg.id === selectedId) ?? packages[0];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-full max-w-3xl bg-white rounded-t-3xl max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <h2 className="text-[16px] font-semibold text-stone-800">Select your Puja Package</h2>
          <button type="button" onClick={onClose} className="text-stone-500 hover:text-stone-700">
            <CloseIcon style={{ fontSize: 20 }} />
          </button>
        </div>

        <div className="px-4 pb-3 flex-1 overflow-y-auto space-y-3">
          {packages.map((pkg) => {
            const accent = ACCENT_STYLES[pkg.accent];
            const isSelected = pkg.id === selectedId;
            return (
              <button
                key={pkg.id}
                type="button"
                onClick={() => onSelect(pkg.id)}
                className={`w-full flex items-center gap-3 rounded-2xl border p-1 text-left transition-colors ${
                  isSelected ? `${accent.bg} ${accent.border}` : "bg-white border-stone-200"
                }`}
              >
                {pkg.image ? (
                  <img
                    loading="lazy"
                    src={pkg.image}
                    alt={pkg.title}
                    className="w-20 h-20 rounded-xl object-cover shrink-0 bg-stone-100"
                  />
                ) : (
                  <span className={`flex items-center justify-center w-14 h-14 rounded-xl shrink-0 ${accent.iconBg}`}>
                    <PersonIcon style={{ fontSize: 26, color: accent.iconColor }} />
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-semibold text-stone-800">{pkg.title}</div>
                  <div className={`flex items-center gap-1 text-[12px] mt-0.5 ${accent.badge}`}>
                    <PersonIcon style={{ fontSize: 14 }} />
                    {pkg.persons} Person
                  </div>
                  <div className={`text-[16px] font-bold mt-0.5 ${accent.price}`}>₹{pkg.price}/-</div>
                </div>
                <span
                  className={`flex items-center justify-center w-5 h-5 rounded-full border-2 shrink-0 ${
                    isSelected ? accent.border : "border-stone-300"
                  }`}
                >
                  {isSelected && <span className={`w-2.5 h-2.5 rounded-full ${accent.dot}`} />}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between bg-[#EA6A12] px-5 py-4">
          <div className="text-white leading-tight">
            <div className="text-[15px] font-bold">₹{selectedPackage.price}/-</div>
            <div className="text-[12px] opacity-90">{selectedPackage.title}</div>
          </div>
          <button
            type="button"
            onClick={() => onProceed(selectedPackage)}
            className="inline-flex items-center gap-1.5 rounded-full bg-white text-[#EA6A12] font-semibold text-[14px] px-5 py-2.5 shadow-sm hover:bg-stone-50 transition-colors"
          >
            Proceed
            <ArrowForwardIcon style={{ fontSize: 18 }} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PackageSelectSheet;
