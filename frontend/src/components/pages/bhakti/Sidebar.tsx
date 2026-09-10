"use client";

import React from "react";
import ArrowForward from '@mui/icons-material/ArrowForward';
import SearchIcon from '@mui/icons-material/Search';

interface SidebarProps {
  categoriesList: { key: string; slug: string }[];
  selectedSlug: string;
  handleCategoryChange: (slug: string) => void;
  searchTerm: string;
  setSearchTerm: (s: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  categoriesList,
  selectedSlug,
  handleCategoryChange,
  searchTerm,
  setSearchTerm,
}) => {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:block w-1/4 bg-white p-4 border-gray-200">
        <div className="sticky  border border-gray-200 rounded-lg p-4">
          {/* Search box */}
          <div className="relative p-3 mb-3 rounded-lg bg-[#F5F5F5]">
            <input
              type="text"
              placeholder="Search for Puran"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="w-full px-3 py-2 pl-10 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            />
            <SearchIcon fontSize="small" className="absolute left-5 top-1/2 transform -translate-y-1/2 text-gray-500" />
            <ArrowForward fontSize="small" className="absolute right-5 top-1/2 transform -translate-y-1/2 text-gray-500 cursor-pointer" />
          </div>
          {/* Filters */}
          {searchTerm === "" && (
            <>
              <h2 className="text-xl mb-4">Filters</h2>
              <div className="space-y-2">
                {categoriesList.map(({ key, slug }) => (
                  <div
                    key={slug}
                    onClick={() => handleCategoryChange(slug)}
                    className={`cursor-pointer justify-between px-3 py-2 rounded transition-colors ${
                      selectedSlug === slug
                        ? "text-white bg-orange-500 font-semibold"
                        : "hover:bg-gray-100 border border-gray-200"
                    }`}
                  >
                    {key}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </aside>

      {/* Mobile header/sidebar */}
      <div className="block md:hidden w-full bg-white p-4 border-b border-gray-200">
        <div className="relative mb-4 rounded-lg bg-[#F5F5F5] p-3">
          <input
            type="text"
            placeholder="Search for Puran"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 pl-10 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
          />
          <SearchIcon fontSize="small" className="absolute left-5 top-1/2 transform -translate-y-1/2 text-gray-500" />
          <ArrowForward fontSize="small" className="absolute right-5 top-1/2 transform -translate-y-1/2 text-gray-500 cursor-pointer" />
        </div>
        {/* Filters dropdown only if no searchTerm */}
        {searchTerm === "" && (
          <select
            value={selectedSlug}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
          >
            {categoriesList.map(({ key, slug }) => (
              <option key={slug} value={slug}>
                {key}
              </option>
            ))}
          </select>
        )}
      </div>
    </>
  );
};

export default Sidebar;
