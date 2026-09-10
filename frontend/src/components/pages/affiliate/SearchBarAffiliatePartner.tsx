"use client";

import React, { useRef } from "react";
import { apiUrl } from "@/lib/api";

// NOTE: /search is mounted at the server ROOT locally (app.use('/', affiliatePartnerRoutes))
// and behind the /api prefix in production, which is exactly what the shared API base encodes.
const SEARCH_URL = apiUrl("/search");

/** Departments the /search API returns, mapped to the short label shown on the badge. */
const DEPARTMENT_LABELS: Record<string, string> = {
  POOJAS: "Pooja",
  MANDIRS: "Mandir",
  PRODUCTS: "Product",
  CHADHAVAS: "Chadhava",
};

// Define a TypeScript type for a single search result.
type SearchResult = {
  id: string;
  name: string;
  image: string;
  link: string;
  /** What the API actually sends. `type` is kept below only as a legacy fallback. */
  department?: "POOJAS" | "MANDIRS" | "PRODUCTS" | "CHADHAVAS";
  type?: string;
};

/** Badge text: prefer the API's `department`, fall back to a legacy `type`, else nothing. */
const labelOf = (result: SearchResult): string =>
  (result.department && DEPARTMENT_LABELS[result.department]) || result.type || "";

const SearchBarAffiliatePartner: React.FC = () => {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [isPanelOpen, setIsPanelOpen] = React.useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    // Abort the in-flight request when the query changes, so a slow response for an older term
    // can never land after (and overwrite) the results for what the user is actually typing.
    const controller = new AbortController();
    const debounceTimer = setTimeout(() => {
      fetch(`${SEARCH_URL}?q=${encodeURIComponent(query.trim())}`, {
        signal: controller.signal,
      })
        .then((response) => (response.ok ? response.json() : []))
        // The endpoint returns a bare array; tolerate a { items } envelope too rather than
        // crashing the panel on an unexpected shape.
        .then((data) =>
          setResults(
            Array.isArray(data)
              ? data
              : Array.isArray(data?.items)
                ? data.items
                : []
          )
        )
        .catch((error) => {
          if ((error as any)?.name === "AbortError") return;
          console.error("Error fetching search results:", error);
          setResults([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 300);
    return () => {
      clearTimeout(debounceTimer);
      controller.abort();
    };
  }, [query]);

  React.useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsPanelOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleIconClick = () => {
    setIsPanelOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (results.length > 0) {
      window.open(results[0].link, "_blank");
      setIsPanelOpen(false);
    }
  };

  const handleSuggestionClick = (link: string) => {
    window.open(link, "_blank");
    setIsPanelOpen(false);
  };

  return (
    <div className="relative">
      {/* Search Icon Trigger */}
      <div
        className="cursor-pointer text-gray-600 hover:text-orange-500 transition-colors"
        onClick={handleIconClick}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-8 w-8"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      {/* Slide-down Search Panel */}
      {isPanelOpen && (
        <div
          ref={panelRef}
          className="absolute top-full right-0 mt-2 w-96 max-w-sm z-50 bg-white rounded-lg shadow-2xl border border-orange-500"
        >
          {/* Decorative arrow */}
          <div className="absolute right-4 -top-2 w-4 h-4 bg-white border-t border-l border-orange-500 transform rotate-45" />

          <form onSubmit={handleSubmit} className="p-4">
            <div className="relative">
              <svg
                className="w-6 h-6 text-orange-400 absolute top-1/2 left-3 transform -translate-y-1/2"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for anything..."
                className="w-full h-12 pl-12 pr-4 border-b-2 border-gray-300 focus:outline-none focus:border-orange-500"
              />
            </div>

            {/* Suggestions List */}
            <div className="mt-2 max-h-80 overflow-y-auto">
              {loading && (
                <div className="text-center text-gray-500 py-4">Searching...</div>
              )}

              {!loading && query.length > 1 && results.length === 0 && (
                <div className="text-center text-gray-500 py-4">
                  No results found.
                </div>
              )}

              {!loading &&
                results.length > 0 &&
                results.map((result) => (
                  <SuggestionItem
                    key={result.id}
                    result={result}
                    onClick={handleSuggestionClick}
                  />
                ))}
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

// Sub-component for displaying a single search suggestion item
const SuggestionItem: React.FC<{
  result: SearchResult;
  onClick: (link: string) => void;
}> = ({ result, onClick }) => {
  const getTypeStyles = (label: string) => {
    switch (label) {
      case "Pooja":
        return "bg-yellow-100 text-yellow-800";
      case "Mandir":
        return "bg-red-100 text-red-800";
      case "Product":
        return "bg-blue-100 text-blue-800";
      case "Chadhava":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };
  const label = labelOf(result);

  return (
    <div
      onClick={() => onClick(result.link)}
      className="flex items-center gap-4 p-2 hover:bg-gray-100 cursor-pointer rounded-md transition-colors"
    >
      <img
        loading="lazy"
        src={result.image}
        alt={result.name}
        className="w-12 h-12 rounded-md object-cover flex-shrink-0"
        onError={(e) => {
          (e.target as HTMLImageElement).src = `https://placehold.co/64x64/f7a36e/ffffff?text=${result.name.charAt(0)}`;
        }}
      />
      <div className="flex-grow overflow-hidden">
        <p className="text-gray-800 font-semibold truncate">{result.name}</p>
      </div>
      {label && (
        <span
          className={`text-xs font-bold px-2 py-1 rounded-full ${getTypeStyles(label)}`}
        >
          {label}
        </span>
      )}
    </div>
  );
};

export default SearchBarAffiliatePartner;
