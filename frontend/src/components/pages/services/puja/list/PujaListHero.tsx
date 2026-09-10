"use client";

import { Dropdown } from "antd";
import type { MenuProps } from "antd";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";

export type PujaSortKey = "upcoming" | "popularity" | "price-asc" | "price-desc" | "newest";

const SORT_LABELS: Record<PujaSortKey, string> = {
  upcoming: "Upcoming",
  popularity: "Popularity",
  "price-asc": "Price: Low to High",
  "price-desc": "Price: High to Low",
  newest: "Newest First",
};

const sortMenuItems: MenuProps["items"] = (Object.keys(SORT_LABELS) as PujaSortKey[]).map((key) => ({
  key,
  label: SORT_LABELS[key],
}));

function SortPill({
  value,
  onChange,
  showIcon,
}: {
  value: PujaSortKey;
  onChange: (v: PujaSortKey) => void;
  showIcon?: boolean;
}) {
  return (
    <Dropdown
      trigger={["click"]}
      menu={{
        items: sortMenuItems,
        selectedKeys: [value],
        onClick: ({ key }) => onChange(key as PujaSortKey),
      }}
    >
      <button
        type="button"
        className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3.5 py-2 text-[12px] font-medium text-stone-700 shadow-sm hover:border-orange-300 transition-colors whitespace-nowrap"
      >
        {showIcon && <CalendarMonthRoundedIcon style={{ fontSize: 15, color: "#EA580C" }} />}
        Sort by: {SORT_LABELS[value]}
        <KeyboardArrowDownRoundedIcon style={{ fontSize: 16 }} />
      </button>
    </Dropdown>
  );
}

function SearchBar({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.05)] focus-within:border-orange-400 focus-within:shadow-[0_0_0_4px_rgba(234,88,12,0.12)] transition-all ${className ?? ""}`}
    >
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 min-w-0 bg-transparent outline-none text-[13px] text-stone-700 placeholder:text-stone-400"
      />
      <SearchRoundedIcon style={{ fontSize: 18, color: "#A8A29E" }} />
    </div>
  );
}

interface PujaListHeroProps {
  searchTerm: string;
  onSearchChange: (v: string) => void;
  sortBy: PujaSortKey;
  onSortChange: (v: PujaSortKey) => void;
  rangeStart: number;
  rangeEnd: number;
  total: number;
}

const PujaListHero: React.FC<PujaListHeroProps> = ({
  searchTerm,
  onSearchChange,
  sortBy,
  onSortChange,
  rangeStart,
  rangeEnd,
  total,
}) => {
  return (
    <>
      <style>{`
        .puja-ornate-line { position: relative; height: 1px; background: linear-gradient(90deg, transparent, #c9972c88, transparent); }
        .puja-ornate-line::before, .puja-ornate-line::after {
          content: '✦'; position: absolute; top: 50%; transform: translateY(-50%);
          color: #c9972c; font-size: 8px; line-height: 1;
        }
        .puja-ornate-line::before { left: -14px; }
        .puja-ornate-line::after { right: -14px; }
      `}</style>

      {/* ── Mobile ── */}
      {/* Bells + arch are already baked into bookPuja_mobile_bg — no hand-drawn emoji bells needed here. */}
      <div className=" md:hidden relative px-5 pt-16 pb-5 text-center mt-2">
        <h1 className="font-display text-[25px] font-bold text-[#7C2D12] flex items-center justify-center gap-1.5">
          Book Online Pooja
          <span className="text-base" aria-hidden>🪷</span>
        </h1>
        <p className="font-elegant italic text-[13px] text-stone-500 mt-1">
          Sacred Pujas. Trusted Temples. Anywhere in India.
        </p>
        <div className="puja-ornate-line w-20 mx-auto mt-3 mb-5" />

        <div className="flex flex-col gap-2.5">
          <SearchBar
            value={searchTerm}
            onChange={onSearchChange}
            placeholder="Search pooja, temple or deity..."
          />
          {/* <div className="flex justify-start">
            <SortPill value={sortBy} onChange={onSortChange} showIcon />
          </div> */}
        </div>
      </div>

      {/* ── Desktop ── */}
      <div className=" hidden md:flex min-h-[100px] flex-col justify-center px-8 py-2 text-center">
        <div className="text-orange-600 text-2xl mb-1" aria-hidden>ॐ</div>
        <h1 className="font-display text-[42px] leading-tight font-bold tracking-[-0.02em] text-[#7C2D12] flex items-center justify-center gap-6">
          <span className="puja-ornate-line w-20" aria-hidden />
          Book Online Pooja
          <span className="puja-ornate-line w-20" aria-hidden />
        </h1>
        <p className="font-elegant text-stone-600 text-[15px] mt-3 max-w-2xl mx-auto leading-7">
          Perform sacred rituals at revered temples across India.
          <br />
          Pujas conducted by trusted priests with devotion and purity.
        </p>

        <div className="flex items-center justify-center w-full max-w-6xl mx-auto mt-4">
          <SearchBar
            value={searchTerm}
            onChange={onSearchChange}
            placeholder="Search by Pooja or Temple..."
            className="w-full max-w-[560px] py-3"
          />
          {/* <span className="text-[13px] text-stone-500 whitespace-nowrap">
            {total > 0 ? `Showing ${rangeStart}-${rangeEnd} of ${total} Poojas` : ""}
          </span>
          <SortPill value={sortBy} onChange={onSortChange} /> */}
        </div>
      </div>
    </>
  );
};

export default PujaListHero;
