"use client";

import Person from "@mui/icons-material/Person";
import { useMoney } from "@/lib/currency";
import { buildDetailSlug } from "@/lib/slug";
import KeyboardArrowRight from "@mui/icons-material/KeyboardArrowRight";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import MapIcon from "@mui/icons-material/Map";

/** Type only — the implementation is fetched on the first keystroke. See
 *  `useFuseConstructor` below. `import type` is erased at compile time, so this
 *  line puts nothing in the bundle. */
import type FuseType from "fuse.js";
import type { IFuseOptions } from "fuse.js";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import MenuIcon from "@mui/icons-material/Menu";
import MenuOpenIcon from "@mui/icons-material/MenuOpen";
import { useCombinedPoojasQuery } from "@/hooks/useAllPoojas";
import { useNewChadhavaListQuery } from "@/hooks/queries/useNewChadhavaListQuery";
import { useExclusivePoojasQuery } from "@/hooks/queries/usePoojaQueries";
import { useAllBlogs } from "@/hooks/useAllBlogs";
import { Col, Row } from "antd";
import "./Navbar.css";

import TempleHinduIcon from "@mui/icons-material/TempleHindu";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "@/store/store";
import { setShowLoginCard } from "@/store/userSlice";

import LanguageSelector from "@/components/shared/LanguageSelector";
import { t } from "i18next";
import I18nText from "@/components/shared/I18nText";
import MobileLangSelector from "@/components/shared/MobileLangSelector";

/** The login modal is on every page because the Navbar is, but it is only ever
 *  visible behind a tap on the profile icon (or a `showLoginCard` dispatch).
 *  Loaded statically it pulled antd's Modal/Input/Button/message — rc-dialog,
 *  rc-input, rc-textarea and their motion helpers, ~250KB of JS parsed on every
 *  page load before the main thread was free. Now that chunk is requested by the
 *  interaction that needs it. */
const LoginModel = dynamic(() => import("@/components/pages/home/LoginModel"), { ssr: false });

/** One search suggestion, as rendered in the dropdown. Module scope so
 *  FUSE_OPTIONS below can name it; it was declared inside the component. */
type Suggestion = { id: string; name: string; image: string };

/** Shared fuzzy-match settings for the four search indexes.
 *
 *  Module scope, not inside the component: a fresh object each render would make
 *  it a changing dependency of the four useMemo hooks that build the indexes,
 *  which would rebuild all four on every keystroke — the opposite of what the
 *  memo is for. */
const FUSE_OPTIONS: IFuseOptions<Suggestion> = {
  keys: ["name"],
  threshold: 0.4,
  distance: 100,
  minMatchCharLength: 2,
  ignoreLocation: true,
};

type SuggestionType = "puja" | "blog" | "chadhava" | "exclusive";

/**
 * API rows → suggestions. Guards the two ways a list can break the search: a
 * response that is not an array, and a row with no usable name — the substring
 * fallback calls `.toLowerCase()` on every name, and one missing title there
 * throws inside an effect and takes the whole page down.
 */
const toSuggestions = (
  rows: unknown,
  pick: (row: any) => { id?: unknown; name?: unknown; image?: unknown },
): Suggestion[] =>
  (Array.isArray(rows) ? rows : [])
    .map((row) => {
      const s = pick(row ?? {});
      return {
        id: String(s.id ?? ""),
        name: String(s.name ?? "").trim(),
        image: String(s.image ?? ""),
      };
    })
    .filter((s) => s.id && s.name);

/**
 * Whether the chadhava listing shows this chadhava — the same rule as
 * ChadhavaList3: active, and its first date not yet past. Search offers only
 * what the listing does; most chadhavas in the feed are closed ones.
 */
const isChadhavaListed = (item: any): boolean => {
  const active = [true, "true", 1, "1"].includes(item?.isActive);
  if (!active) return false;
  const dateStr = item.availableDates?.[0];
  if (!dateStr) return true;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return true;
  date.setHours(23, 59, 59, 999);
  return new Date() <= date;
};

/** Mobile menu — same reasoning as LoginModel above. */
const Drawer = dynamic(() => import("antd/es/drawer"), { ssr: false });

// Smooth scroll to page sections on hover with offset for header
const scrollToSection = (id: string) => {
  const el = document.getElementById(id);
  if (el) {
    const headerOffset = 120; // adjust this value as needed
    const elementPosition = el.getBoundingClientRect().top + window.scrollY;
    const offsetPosition = elementPosition - headerOffset;
    window.scrollTo({ top: offsetPosition, behavior: "smooth" });
  }
};

const Navbar = ({ activeIndex }: { activeIndex?: string }) => {
  const router = useRouter();
  /** Subscribes this component to country/rate changes so the ₹50 app-download
   *  banner shows the devotee's own currency instead of a hardcoded rupee figure. */
  const { money } = useMoney();

  const [modalOpen, setModalOpen] = useState(false);
  // Latches on the first open so the lazily loaded modal is not unmounted on
  // close — that would discard the chunk's mounted instance and skip antd's
  // closing animation on every subsequent open.
  const [loginModalMounted, setLoginModalMounted] = useState(false);
  // For More menu
  const [moreAnchorEl, setMoreAnchorEl] = useState<HTMLElement | null>(null);
  const isMoreOpen = Boolean(moreAnchorEl);
  const handleMoreClick = (e: React.MouseEvent<HTMLElement>) => setMoreAnchorEl(e.currentTarget);
  const handleMoreClose = () => setMoreAnchorEl(null);
  const [searchQuery, setSearchQuery] = useState("");
  const desktopSuggestionsRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [pujaSuggestions, setPujaSuggestions] = useState<Suggestion[]>([]);
  const [blogSuggestions, setBlogSuggestions] = useState<Suggestion[]>([]);
  const [chadhavaSuggestions, setChadhavaSuggestions] = useState<Suggestion[]>([]);
  const [exclusiveSuggestions, setExclusiveSuggestions] = useState<Suggestion[]>([]);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  // The drawer's own search block. It shares searchQuery/isSuggestionsOpen with
  // the desktop box — the two are never visible at once, because the desktop
  // header sits in a Col with sm={0} xs={0} (display:none, but still in the DOM,
  // which is why click-outside has to test both containers rather than just one).
  const mobileSearchRef = useRef<HTMLDivElement | null>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement | null>(null);
  // The 5 search-index datasets below are heavy and irrelevant to 99% of page
  // loads — defer fetching them until the user actually focuses the search
  // box, instead of firing on every single page navigation site-wide.
  const [searchActivated, setSearchActivated] = useState(false);

  // Debounce hook for search input
  function useDebounce<T>(value: T, delay: number): T {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
      const handler = setTimeout(() => setDebounced(value), delay);
      return () => clearTimeout(handler);
    }, [value, delay]);
    return debounced;
  }

  /**
   * SSR-safe: hydrate the stored user after mount instead of reading at render.
   *
   * This also has to re-read on `user-details-changed`. Logging in happens inside
   * LoginModel, which writes localStorage and dispatches that event — but this
   * component only read localStorage once on mount, so the header kept showing
   * the "sign in" person icon until a full page reload. The twelve-jyotirling
   * navbar already listens for it; this one didn't.
   *
   * `storage` covers the same user logging in or out in another tab.
   */
  const [userDetails, setUserDetails] = useState<any>({});
  useEffect(() => {
    const readStoredUser = () => {
      try {
        setUserDetails(JSON.parse(localStorage.getItem("userDetails") || "{}"));
      } catch {
        setUserDetails({});
      }
    };

    readStoredUser();
    window.addEventListener("user-details-changed", readStoredUser);
    window.addEventListener("storage", readStoredUser);
    return () => {
      window.removeEventListener("user-details-changed", readStoredUser);
      window.removeEventListener("storage", readStoredUser);
    };
  }, []);

  const showLoginCard = useSelector((state: RootState) => state.user.showLoginCard);

  useEffect(() => {
    if (modalOpen) setLoginModalMounted(true);
  }, [modalOpen]);

  useEffect(() => {
    // Open the modal when showLoginCard is true
    if (showLoginCard) {
      setModalOpen(true);
    } else {
      setModalOpen(false);
    }
  }, [showLoginCard]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close only when the click is outside BOTH search boxes. The mobile one
      // lives inside the drawer, so testing the desktop container alone would
      // treat every tap in the drawer — including on the mobile input itself —
      // as "outside" and slam the results shut.
      const target = event.target as Node;
      const inDesktop = wrapperRef.current?.contains(target);
      const inMobile = mobileSearchRef.current?.contains(target);
      if (!inDesktop && !inMobile) {
        setIsSuggestionsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []); // Important: keep the empty dependency array

  const categoryLinks = [
    { title: "Puran", slug: "puran" },
    { title: "Upapuranas", slug: "upapuranas" },
    { title: "Vedas", slug: "vedas" },
    {
      title: "Sacred Audio MP3 Collection",
      slug: "sacred-audio-mp3-collection",
    },
    {
      title: "Sacred Scriptures and Ancient Texts",
      slug: "sacred-scriptures-and-ancient-texts",
    },
  ];

  const dispatch = useDispatch();
  const divRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (divRef.current && !divRef.current.contains(event.target as Node)) {
        dispatch(setShowLoginCard(false));
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dispatch]);

  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  // Same latch as `loginModalMounted`: mount the lazily loaded Drawer on its
  // first open and keep it, so closing still animates.
  const [drawerMounted, setDrawerMounted] = useState(false);
  useEffect(() => {
    if (isDrawerVisible) setDrawerMounted(true);
  }, [isDrawerVisible]);

  // Start with the server-rendered value and measure after mount — reading
  // window.innerWidth in the initializer makes the first client render differ
  // from the SSR HTML and breaks hydration.
  const [isXL, setIsXL] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsXL(window.innerWidth >= 1350);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  /* Pujas come from the combined list — legacy `poojas` plus `newpoojas`, the
     same one the puja page lists. `/fetch-all-pooja`, used here before, returns
     nothing any more, so no puja ever appeared in search. */
  const { data: poojasDTO = [], isLoading: loadingPoojas } = useCombinedPoojasQuery(null, searchActivated);
  const { data: chadhavaDTO = [], isLoading: loadingChadhava } = useNewChadhavaListQuery(searchActivated);
  const { data: exclusiveDTO = [], isLoading: loadingExclusive } = useExclusivePoojasQuery(searchActivated);
  const { data: blogsDTO = [], isLoading: loadingBlogs } = useAllBlogs(undefined, searchActivated);

  // Normalize
  const exclusivePoojas = useMemo(
    () =>
      toSuggestions(exclusiveDTO, (p) => ({
        id: p._id,
        name: p.title || p.Title || p.poojaName,
        image: p.poojaCardImage || p.images?.[0],
      })),
    [exclusiveDTO],
  );

  const poojas = useMemo(() => {
    // Exclusive pujas have a column of their own — list each puja once.
    const exclusiveIds = new Set(exclusivePoojas.map((p) => p.id));
    return toSuggestions(poojasDTO, (p) => ({
      id: p._id,
      name: p.title,
      image: p.poojaCardImage || p.images?.[0],
    })).filter((p) => !exclusiveIds.has(p.id));
  }, [poojasDTO, exclusivePoojas]);

  const blogs = useMemo(
    () => toSuggestions(blogsDTO, (b) => ({ id: b._id, name: b.title, image: b.images?.[0] })),
    [blogsDTO],
  );

  const chadhavas = useMemo(
    () =>
      toSuggestions(
        (Array.isArray(chadhavaDTO) ? chadhavaDTO : []).filter(isChadhavaListed),
        (c) => ({ id: c._id, name: c.chadhavaName, image: c.chadhavaWebCardImage?.location }),
      ),
    [chadhavaDTO],
  );

  /**
   * fuse.js, loaded on demand.
   *
   * The Navbar is on every page, so a static `import Fuse from "fuse.js"` put
   * the library (a 48KB chunk of its own) into the initial download of the whole
   * site — to power a search box that most visits never type into. Downloading
   * and compiling it competes for the main thread during hydration, which is
   * what Total Blocking Time measures.
   *
   * It is now fetched the first time the query is non-empty. Until the chunk
   * arrives, the four searches below fall back to the substring filter that was
   * already there for "fuzzy search found nothing" — so the box is never dead,
   * it is briefly just less clever. The 300ms debounce on the query usually
   * covers the fetch, so in practice the first rendered result set is already
   * the fuzzy one.
   */
  const [FuseCtor, setFuseCtor] = useState<typeof FuseType | null>(null);
  const searchWanted = searchQuery.trim().length > 0;

  useEffect(() => {
    if (!searchWanted || FuseCtor) return;
    let cancelled = false;
    import("fuse.js")
      .then((mod) => {
        // The updater form is required. Handed a bare function, setState CALLS
        // it as `updater(prev)` — and Fuse is a class, so `Fuse(prev)` threw
        // "Class constructor Fuse cannot be invoked without 'new'" and crashed
        // the page on the first keystroke in either search box.
        if (!cancelled) setFuseCtor(() => mod.default);
      })
      .catch(() => {
        // Chunk failed (offline, deploy mid-session) — substring search stands in.
      });
    return () => {
      cancelled = true;
    };
  }, [searchWanted, FuseCtor]);

  const fuseChadhavas = useMemo(
    () => (FuseCtor ? new FuseCtor<Suggestion>(chadhavas, FUSE_OPTIONS) : null),
    [FuseCtor, chadhavas],
  );

  const fusePoojas = useMemo(
    () => (FuseCtor ? new FuseCtor<Suggestion>(poojas, FUSE_OPTIONS) : null),
    [FuseCtor, poojas],
  );

  const fuseBlogs = useMemo(
    () => (FuseCtor ? new FuseCtor<Suggestion>(blogs, FUSE_OPTIONS) : null),
    [FuseCtor, blogs],
  );

  const fuseExclusive = useMemo(
    () => (FuseCtor ? new FuseCtor<Suggestion>(exclusivePoojas, FUSE_OPTIONS) : null),
    [FuseCtor, exclusivePoojas],
  );

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setSearchQuery(q);

    if (q.trim()) {
      setIsSuggestionsOpen(true); // Open suggestions as soon as the user types
    } else {
      setIsSuggestionsOpen(false); // Close them if the input is cleared
      setPujaSuggestions([]);
      setBlogSuggestions([]);
      setChadhavaSuggestions([]);
      setExclusiveSuggestions([]);
    }
  };

  const debouncedQuery = useDebounce(searchQuery, 300);

  /**
   * "Loading…" rather than "No results": while the lists are fetching, and
   * while a keystroke is still inside the debounce with nothing to show yet —
   * otherwise every pause in typing flashed "No results found" for 300ms
   * before the matches arrived.
   */
  const hasSuggestions =
    chadhavaSuggestions.length > 0 ||
    pujaSuggestions.length > 0 ||
    exclusiveSuggestions.length > 0 ||
    blogSuggestions.length > 0;
  const searchPending = searchQuery.trim() !== debouncedQuery.trim();
  const showSearchLoading =
    loadingPoojas ||
    loadingBlogs ||
    loadingChadhava ||
    loadingExclusive ||
    (searchPending && !hasSuggestions);

  /**
   * One query's matches, per column, at most 10 each: fuzzy once fuse.js has
   * loaded, a plain substring match until then (or when fuzzy finds nothing).
   * Shared by the dropdown and by Enter, so both rank the same way.
   */
  const findSuggestions = useCallback(
    (query: string): Record<SuggestionType, Suggestion[]> => {
      const lowerQ = query.toLowerCase();
      const match = (fuse: FuseType<Suggestion> | null, items: Suggestion[]) => {
        const fuzzy = fuse?.search(query).map((r) => r.item) ?? [];
        return (fuzzy.length ? fuzzy : items.filter((s) => s.name.toLowerCase().includes(lowerQ))).slice(0, 10);
      };
      return {
        puja: match(fusePoojas, poojas),
        blog: match(fuseBlogs, blogs),
        chadhava: match(fuseChadhavas, chadhavas),
        exclusive: match(fuseExclusive, exclusivePoojas),
      };
    },
    [fusePoojas, poojas, fuseBlogs, blogs, fuseChadhavas, chadhavas, fuseExclusive, exclusivePoojas],
  );

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      /**
       * Close only when the box is genuinely empty — test `searchQuery` (live),
       * not `debouncedQuery` (300ms behind).
       *
       * On the first keystroke the debounced value is still "", so this branch
       * runs and used to close the dropdown that handleSearchInputChange had
       * just opened. The old code papered over that by force-opening at the end
       * of this effect, with `isSuggestionsOpen` in its own dependency array —
       * which made the dropdown impossible to dismiss, because click-outside set
       * it false and the effect immediately set it true again.
       */
      if (!searchQuery.trim()) setIsSuggestionsOpen(false);
      if (pujaSuggestions.length) setPujaSuggestions([]);
      if (blogSuggestions.length) setBlogSuggestions([]);
      if (chadhavaSuggestions.length) setChadhavaSuggestions([]);
      if (exclusiveSuggestions.length) setExclusiveSuggestions([]);
      return;
    }

    const next = findSuggestions(debouncedQuery);

    if (JSON.stringify(next.puja) !== JSON.stringify(pujaSuggestions)) {
      setPujaSuggestions(next.puja);
    }
    if (JSON.stringify(next.blog) !== JSON.stringify(blogSuggestions)) {
      setBlogSuggestions(next.blog);
    }
    if (JSON.stringify(next.chadhava) !== JSON.stringify(chadhavaSuggestions)) {
      setChadhavaSuggestions(next.chadhava);
    }
    if (JSON.stringify(next.exclusive) !== JSON.stringify(exclusiveSuggestions)) {
      setExclusiveSuggestions(next.exclusive);
    }
    // NOTE: deliberately does NOT force the dropdown open here.
    //
    // This block used to read `if (!isSuggestionsOpen) setIsSuggestionsOpen(true)`
    // with `isSuggestionsOpen` in the dependency array below, which made the
    // dropdown impossible to dismiss: clicking outside set it false, the state
    // change re-ran this effect, and the effect set it straight back to true.
    // Opening is driven by user intent instead — typing (handleSearchInputChange)
    // and focusing the input — so results arriving late still land in an
    // already-open dropdown.
  }, [
    debouncedQuery,
    searchQuery,
    findSuggestions,
    pujaSuggestions,
    blogSuggestions,
    chadhavaSuggestions,
    exclusiveSuggestions,
  ]);

  const handleSuggestionClick = (id: string, type: SuggestionType, name?: string) => {
    // Hide suggestions and clear search bar for better UX
    setIsSuggestionsOpen(false);
    setSearchQuery("");

    // Shows the item's name in the address bar instead of a bare Mongo id —
    // see lib/slug.ts. The id is still what every lookup actually uses.
    const detailSlug = buildDetailSlug(name, id);

    // Navigate to the correct page based on the item type
    if (type === "puja") {
      router.push(`/services/puja/${detailSlug}/select-package`);
    } else if (type === "blog") {
      router.push(`/blogs/${id}`);
    } else if (type === "chadhava") {
      router.push(`/newchadhavapage/detail/${detailSlug}`);
    } else if (type === "exclusive") {
      router.push(`/services/puja/${detailSlug}/select-package`);
    }
  };

  /**
   * Enter opens the best match for what is in the box right now. It used to
   * send the query to `/search`, a page that has never existed — every Enter
   * landed on a 404.
   *
   * Searches afresh rather than reading the dropdown, which lags the input by
   * the 300ms debounce: typing "shiv" and pressing Enter at once would open the
   * top result of the previous query. A name that contains the query outright
   * beats a fuzzy near-miss; otherwise the first result in display order wins.
   * Returns false when there is nothing to open yet (lists still loading), so
   * the dropdown stays up.
   */
  const openTopSuggestion = (): boolean => {
    const query = searchQuery.trim();
    if (!query) return false;
    const found = findSuggestions(query);
    const ranked = (["chadhava", "puja", "exclusive", "blog"] as SuggestionType[]).flatMap((type) =>
      found[type].map((s) => ({ s, type })),
    );
    const lowerQ = query.toLowerCase();
    const pick = ranked.find(({ s }) => s.name.toLowerCase().includes(lowerQ)) ?? ranked[0];
    if (!pick) return false;
    handleSuggestionClick(pick.s.id, pick.type, pick.s.name);
    return true;
  };

  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20); // Change color after 10px scroll
    };

    // Passive: this listener never calls preventDefault, and marking it so lets
    // the browser scroll without waiting on it — which matters more now that
    // crossing the threshold swaps in a backdrop-filter.
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Both bars are see-through at rest so the page artwork shows through, and
  // pick up a frosted-glass fill once scrolled — see .vv-header in Navbar.css.
  // The `scrolled` flag drives both breakpoints.
  const menuIconColor = scrolled ? "black" : "black";

  return (
    <div>
      <Col xl={24} lg={24} md={24} sm={0} xs={0}>
        {/* The fill/blur live in .vv-header (Navbar.css) rather than inline,
            because an inline background would win over the .scrolled rule. */}
        <div
          className={`vv-header${scrolled ? " scrolled" : ""}`}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 100,
            width: "100%",
          }}
        >
          {/* Announcement Bar */}
          <div
            className="announcement-bar-static"
            style={{
              background: "#000000",
              borderBottom: "1px solid rgba(255, 255, 255, 0.15)",
              padding: "2px 24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              height: "32px",
              cursor: "pointer",
              // Neutral shadow — the old one was tinted orange to match the
              // gradient that used to fill this bar.
              boxShadow: "0 2px 12px rgba(0, 0, 0, 0.25)",
            }}
            onClick={() =>
              window.open(
                "https://play.google.com/store/apps/details?id=com.rahulrajput025.client",
                "_blank",
              )
            }
          >
            <span
              style={{
                color: "#FFFFFF",
                fontWeight: 700,
                fontSize: "11.5px",
                letterSpacing: "0.1px",
                textShadow: "0 1px 2px rgba(0,0,0,0.15)",
              }}
            >
              DOWNLOAD OUR APP &amp; GET {money(50)} OFF ON YOUR FIRST BOOKING!
            </span>
            <div
              style={{
                backgroundColor: "#FFFFFF",
                color: "#C2410C",
                padding: "2px 10px",
                borderRadius: "20px",
                fontWeight: 800,
                fontSize: "9px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                transition: "transform 0.2s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            >
              <span>GET APP</span>
            </div>
          </div>
          <Row
            style={{
              paddingLeft: "3%",
              width: "100%",
              alignItems: "center",
              paddingRight: "3%",
            }}
          >
            {/* Image  */}
            <Col
              xl={2}
              lg={2}
              md={2}
              sm={0}
              xs={0}
              onClick={() => router.push("/")}
              style={{ cursor: "pointer" }}
            >
              {/* The logo is the page's LCP element. It previously carried
                  loading="lazy" — which tells the browser to deprioritise the
                  one image LCP is measured on — and width/height="100%", which
                  are not valid intrinsic dimensions, so the browser reserved no
                  space and the entire page below the header jumped down when it
                  finally arrived (Lighthouse measured that single shift at 0.38
                  of a 0.44 CLS). The integers below are the file's real pixel
                  size; the inline style preserves the previous rendered size. */}
              <img
                loading="eager"
                fetchPriority="high"
                decoding="async"
                src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/logo/vvfinallogo.png"
                width={828}
                height={640}
                style={{ width: "100%", height: "auto" }}
                alt="Vedic Vaibhav Logo"
              />
            </Col>

            <Col xl={20} lg={20} md={20} sm={0} xs={0}>
              <nav
                className={`navbar-content${scrolled ? " scrolled" : ""}`}
                aria-label="Main Navigation"
              >
                <div
                  className="nav-item animated-underline"
                  onMouseEnter={() => scrollToSection("home")}
                >
                  <Link
                    href="/"
                    style={{
                      textDecoration: "none",
                      color: activeIndex === "home" ? "#FFE0B2" : "inherit",
                    }}
                  >
                    <I18nText text="NAVBAR.Home" />
                  </Link>
                </div>
                <div
                  className="nav-item animated-underline"
                  onMouseEnter={() => scrollToSection("chadhava")}
                >
                  <Link
                    href="/chadhava"
                    style={{
                      textDecoration: "none",
                      color: activeIndex === "chadhava" ? "#FFE0B2" : "inherit",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span>Chadhava</span>
                    </div>
                  </Link>
                </div>
                <div
                  className="nav-item animated-underline"
                  onMouseEnter={() => scrollToSection("services-puja")}
                >
                  <Link
                    href="/services/puja"
                    style={{
                      textDecoration: "none",
                      color: activeIndex === "puja" ? "#FFE0B2" : "inherit",
                    }}
                  >
                    <I18nText text="NAVBAR.Book Pooja" />
                  </Link>
                </div>
                <div className="nav-item animated-underline">
                  <Link
                    href="/blogs"
                    style={{
                      textDecoration: "none",
                      color: activeIndex === "blogs" ? "#FFE0B2" : "inherit",
                    }}
                  >
                    <I18nText text="NAVBAR.Blogs" />
                  </Link>
                </div>
                {isXL ? (
                  <>
                    <div
                      className="nav-item animated-underline"
                      onMouseEnter={() => scrollToSection("mandir")}
                    >
                      <Link
                        href="/mandir"
                        style={{
                          textDecoration: "none",
                          color: activeIndex === "mandir" ? "#FFE0B2" : "inherit",
                        }}
                      >
                        <I18nText text="NAVBAR.Mandir" />
                      </Link>
                    </div>
                    <div
                      className="nav-item animated-underline"
                      onMouseEnter={() => scrollToSection("banke-bihariji")}
                    >
                      <Link
                        href="/services/banke-bihariji"
                        style={{
                          textDecoration: "none",
                          color: activeIndex === "banke-bihariji" ? "#FFE0B2" : "inherit",
                        }}
                      >
                        Shri Banke Bihari Ji Seva
                      </Link>
                    </div>
                    <div className="nav-item animated-underline">
                      <Link
                        href="/4-dham-yatra"
                        style={{
                          textDecoration: "none",
                          color: activeIndex === "4-dham-yatra" ? "#FFE0B2" : "inherit",
                        }}
                      >
                        4 Dham Yatra
                      </Link>
                    </div>
                  </>
                ) : (
                  <>
                    <div
                      className="nav-item animated-underline"
                      onClick={handleMoreClick}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        cursor: "pointer",
                      }}
                    >
                      <span>More</span>
                      <KeyboardArrowDownIcon style={{ fontSize: 20, marginLeft: 4 }} />
                    </div>
                    <Menu
                      anchorEl={moreAnchorEl}
                      open={isMoreOpen}
                      onClose={handleMoreClose}
                      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                      transformOrigin={{ vertical: "top", horizontal: "right" }}
                    >
                      <MenuItem
                        onClick={() => {
                          router.push("/services/12-jyotirlinga");
                          handleMoreClose();
                        }}
                      >
                        12 Jyotirlinga
                      </MenuItem>
                      <MenuItem
                        onClick={() => {
                          router.push("/services/banke-bihariji");
                          handleMoreClose();
                        }}
                      >
                        Shri Banke Bihari Ji Seva
                      </MenuItem>
                      <MenuItem
                        onClick={() => {
                          router.push("/4-dham-yatra");
                          handleMoreClose();
                        }}
                      >
                        4 Dham Yatra
                      </MenuItem>
                      <MenuItem
                        onClick={() => {
                          router.push("/mandir");
                          handleMoreClose();
                        }}
                      >
                        <I18nText text="NAVBAR.Mandir" />
                      </MenuItem>
                      <MenuItem
                        onClick={() => {
                          router.push("/services/gau-seva");
                          handleMoreClose();
                        }}
                      >
                        Gau Seva
                      </MenuItem>
                      <MenuItem
                        onClick={() => {
                          window.open("https://vedicshop.store", "_blank");
                          handleMoreClose();
                        }}
                      >
                        Vedic Shop
                      </MenuItem>
                    </Menu>
                  </>
                )}
                {isXL && (
                  <div
                    className="nav-item animated-underline"
                    onMouseEnter={() => scrollToSection("jyotirlinga")}
                  >
                    <a
                      href="/services/12-jyotirlinga"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        textDecoration: "none",
                        color: activeIndex === "jyotirlinga" ? "#FFE0B2" : "inherit",
                      }}
                    >
                      12 Jyotirlinga
                    </a>
                  </div>
                )}
              </nav>
            </Col>

            {/* ALL */}
            <Col xl={2} lg={2} md={2} sm={4} xs={4}>
              <div className="navbar-icons">
                {/* LANGUAGE SELECTOR*/}
                <div style={{ marginLeft: "auto", marginRight: 0 }}>
                  <LanguageSelector />
                </div>
                <div className="search-container" ref={wrapperRef}>
                  <div className="search-icon-wrapper">
                    <SearchIcon />
                  </div>
                  <div className="search-input-wrapper">
                    <input
                      type="text"
                      className="search-input"
                      placeholder="Search Pujas, Products & more..."
                      value={searchQuery}
                      ref={searchInputRef}
                      onChange={handleSearchInputChange}
                      onFocus={() => {
                        // First focus is also what turns on the search-index queries (see searchActivated above).
                        setSearchActivated(true);
                        // Only open if there's already something to show
                        if (searchQuery.trim().length > 0) {
                          setIsSuggestionsOpen(true);
                        }
                      }} // Open suggestions on focus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") openTopSuggestion();
                      }}
                    />
                  </div>
                  {isSuggestionsOpen &&
                    searchQuery.trim() !== "" && ( // Also check if query is not just empty spaces
                      <div className="suggestions-dropdown" ref={desktopSuggestionsRef}>
                        {showSearchLoading ? (
                          <div className="no-results-global"> {t("Loading...")}</div>
                        ) : hasSuggestions ? (
                          <>
                            {/* Chadhava Column */}
                            {chadhavaSuggestions.length > 0 && (
                              <div className="suggestion-column">
                                <h4>
                                  <div className="column-icon prasad-icon"></div>
                                  Chadhava
                                </h4>
                                <div className="suggestion-scroll">
                                  {chadhavaSuggestions.map((sugg) => (
                                    <div
                                      key={sugg.id}
                                      onClick={() => handleSuggestionClick(sugg.id, "chadhava", sugg.name)}
                                      className="suggestion-item"
                                    >
                                      <img
                                        loading="lazy"
                                        src={sugg.image}
                                        alt={sugg.name}
                                        onError={(e) => {
                                          e.currentTarget.src =
                                            "https://via.placeholder.com/36/fb923c/ffffff?text=C";
                                        }}
                                      />
                                      <span>{sugg.name}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Poojas Column */}
                            {pujaSuggestions.length > 0 && (
                              <div className="suggestion-column">
                                <h4>
                                  <div className="column-icon puja-icon"></div>
                                  Puja
                                </h4>
                                <div className="suggestion-scroll">
                                  {pujaSuggestions.map((sugg) => (
                                    <div
                                      key={sugg.id}
                                      onClick={() => handleSuggestionClick(sugg.id, "puja", sugg.name)}
                                      className="suggestion-item"
                                    >
                                      <img
                                        loading="lazy"
                                        src={sugg.image}
                                        alt={sugg.name}
                                        onError={(e) => {
                                          e.currentTarget.src =
                                            "https://via.placeholder.com/36/fb923c/ffffff?text=P";
                                        }}
                                      />
                                      <span>{sugg.name}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}


                            {/* Blogs Column */}
                            {blogSuggestions.length > 0 && (
                              <div className="suggestion-column">
                                <h4>
                                  <div className="column-icon blog-icon"></div>
                                  <I18nText text="NAVBAR.Blogs" />
                                </h4>
                                <div className="suggestion-scroll">
                                  {blogSuggestions.map((sugg) => (
                                    <div
                                      key={sugg.id}
                                      onClick={() => handleSuggestionClick(sugg.id, "blog")}
                                      className="suggestion-item"
                                    >
                                      <img
                                        loading="lazy"
                                        src={sugg.image}
                                        alt={sugg.name}
                                        onError={(e) => {
                                          e.currentTarget.src =
                                            "https://via.placeholder.com/36/fed7aa/9a3412?text=B";
                                        }}
                                      />
                                      <span>{sugg.name}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Exclusive/Personalized Puja Column */}
                            {exclusiveSuggestions.length > 0 && (
                              <div className="suggestion-column">
                                <h4>
                                  <div className="column-icon puja-icon"></div>
                                  Personalized Puja
                                </h4>
                                <div className="suggestion-scroll">
                                  {exclusiveSuggestions.map((sugg) => (
                                    <div
                                      key={sugg.id}
                                      onClick={() => handleSuggestionClick(sugg.id, "exclusive", sugg.name)}
                                      className="suggestion-item"
                                    >
                                      <img
                                        loading="lazy"
                                        src={sugg.image}
                                        alt={sugg.name}
                                        onError={(e) => {
                                          e.currentTarget.src =
                                            "https://via.placeholder.com/36/fb923c/ffffff?text=E";
                                        }}
                                      />
                                      <span>{sugg.name}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          // This block renders if NO results are found in ANY category
                          <div className="no-results-global">
                            {t("No results found for")} "{searchQuery}"
                          </div>
                        )}
                      </div>
                    )}
                </div>

                {userDetails && userDetails.user && userDetails.user.phone ? (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <div
                      className="items-center text-center flex justify-center cursor-pointer "
                      style={{
                        borderRadius: "100px",
                        height: "35px",
                        width: "35px",
                      }}
                      onClick={() => router.push("/profile")}
                    >
                      <img
                        loading="lazy"
                        alt="profile"
                        style={{ borderRadius: "100px" }}
                        src={
                          userDetails.user.picture ||
                          "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/personicon.png"
                        }
                      ></img>
                    </div>
                  </div>
                ) : (
                  <Person
                    onClick={() => setModalOpen(true)}
                    className="person-icon "
                    style={{ cursor: "pointer" }}
                  />
                )}
              </div>
            </Col>
          </Row>
        </div>
      </Col>

      <Col xl={0} lg={0} md={0} sm={24} xs={24}>
        <div
          className={`mobile-navbar-transparent vv-header${scrolled ? " scrolled" : ""}`}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 100,
            width: "100%",
          }}
        >
          {/* Announcement Bar */}
          <div
            style={{
              background: "#000000",
              borderBottom: "1px solid rgba(255, 255, 255, 0.15)",
              padding: "4px 12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              height: "36px",
              cursor: "pointer",
              // Neutral shadow — the old one was tinted orange to match the
              // gradient that used to fill this bar.
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.25)",
            }}
            onClick={() =>
              window.open(
                "https://play.google.com/store/apps/details?id=com.rahulrajput025.client",
                "_blank",
              )
            }
          >
            <span
              style={{
                color: "#FFFFFF",
                fontWeight: 700,
                fontSize: "11px",
                letterSpacing: "0.1px",
              }}
            >
              Download our app and get {money(50)} off on Booking
            </span>
            <div
              style={{
                backgroundColor: "#FFFFFF",
                color: "#C2410C",
                padding: "3px 10px",
                borderRadius: "20px",
                fontWeight: 800,
                fontSize: "10px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
                display: "flex",
                alignItems: "center",
              }}
            >
              <span>GET</span>
            </div>
          </div>
          <Row
            style={{
              paddingLeft: "6%",
              width: "100%",
              alignItems: "center",
              paddingRight: "6%",
            }}
          >
            {/* Menu Drawer - Mobile */}
            <Col xl={0} lg={0} md={0} sm={3} xs={3}>
              <div
                onClick={() => {
                  setIsDrawerVisible(true);
                }}
              >
                {" "}
                <MenuIcon style={{ width: "1.5em", color: menuIconColor }} />
              </div>
              {/* Mounted on the first open only. Statically imported, antd's Drawer
                  pulled rc-drawer and its motion helpers into every page load for a
                  menu that is behind a tap on the hamburger. */}
              {drawerMounted && (
                <Drawer
                  placement="left"
                  open={isDrawerVisible}
                  closable={false}
                  width="90vw"
                  onClose={() => {
                    setIsDrawerVisible(false);
                  }}
                  destroyOnClose
                  styles={{
                    body: {
                      padding: 0,
                      borderRadius: 16,
                      overflowY: "auto",
                      overflowX: "hidden",
                      WebkitOverflowScrolling: "touch",
                    },
                  }}
                  title={null}
                >
                  <div style={{ backgroundColor: "#f8f9fa", minHeight: "100vh" }}>
                    {/* Header for non-logged in users */}
                    <div style={{ backgroundColor: "#f8f9fa", minHeight: "100vh" }}>
                      {/* Header */}
                      <div
                        style={{
                          padding: "12px 16px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          borderBottom: "1px solid #eee",
                        }}
                      >
                        {/* Left - Menu Icon */}
                        <div
                          onClick={() => {
                            setIsDrawerVisible(false);
                          }}
                          style={{
                            cursor: "pointer",
                            padding: 10, // gives clickable area
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "end",
                            width: 40, // minimum size
                            height: 40,
                            /**
                             * The logo wrapper beside this one uses marginLeft:-22
                             * to look optically centred, which drags it 22px back
                             * over this button. Being later in the DOM it then won
                             * the hit test across the right half of the icon —
                             * including its centre — so tapping "close" did
                             * nothing and the drawer appeared stuck open.
                             * Lifting this out of the static flow restores the
                             * full 40x40 target without moving the logo.
                             */
                            position: "relative",
                            zIndex: 1,
                          }}
                        >
                          <MenuOpenIcon style={{ fontSize: 24 }} />
                        </div>

                        {/* Center - Logo */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexGrow: 1,
                            marginLeft: -22, // shift left slightly to counter menu icon width
                          }}
                        >
                          <div
                            style={{
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                            }}
                            onClick={() => {
                              router.push("/");
                              setIsDrawerVisible(false);
                            }}
                          >
                            <img
                              loading="lazy"
                              alt={t("logo")}
                              src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/logo/Group%2026087761-optimized.webp"
                              style={{ height: 35, width: "auto" }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Search — mobile.
                          Same data and handlers as the desktop box; only the
                          layout differs. The desktop dropdown is a 4-column
                          overlay, which cannot work in a 90vw drawer, so results
                          stack vertically in a scrollable panel under the input. */}
                      <div className="vv-msearch" ref={mobileSearchRef}>
                        <div className="vv-msearch-bar">
                          <SearchIcon className="vv-msearch-bar-icon" />
                          <input
                            type="text"
                            className="vv-msearch-input"
                            placeholder={t("Search Pujas, Products & more...")}
                            value={searchQuery}
                            ref={mobileSearchInputRef}
                            onChange={handleSearchInputChange}
                            onFocus={() => {
                              setSearchActivated(true);
                              if (searchQuery.trim().length > 0) setIsSuggestionsOpen(true);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && openTopSuggestion()) setIsDrawerVisible(false);
                            }}
                          />
                          {searchQuery.trim() !== "" && (
                            <button
                              type="button"
                              aria-label={t("Clear search")}
                              className="vv-msearch-clear"
                              onClick={() => {
                                setSearchQuery("");
                                setIsSuggestionsOpen(false);
                                mobileSearchInputRef.current?.focus();
                              }}
                            >
                              <CloseIcon style={{ fontSize: 18 }} />
                            </button>
                          )}
                        </div>

                        {isSuggestionsOpen && searchQuery.trim() !== "" && (
                          <div className="vv-msearch-results">
                            {showSearchLoading ? (
                              <div className="vv-msearch-empty">{t("Loading...")}</div>
                            ) : hasSuggestions ? (
                              <>
                                {(
                                  [
                                    ["Chadhava", chadhavaSuggestions, "chadhava"],
                                    ["Puja", pujaSuggestions, "puja"],
                                    ["Personalized Puja", exclusiveSuggestions, "exclusive"],
                                    ["Blogs", blogSuggestions, "blog"],
                                  ] as [string, Suggestion[], SuggestionType][]
                                ).map(([label, items, type]) =>
                                  items.length === 0 ? null : (
                                    <div className="vv-msearch-group" key={type}>
                                      <h4 className="vv-msearch-group-title">{label}</h4>
                                      {/* Every match (at most 10 a group) — there is no
                                          results page to send the rest to, and the
                                          panel scrolls on its own. */}
                                      {items.map((sugg) => (
                                        <div
                                          key={sugg.id}
                                          className="vv-msearch-item"
                                          onClick={() => {
                                            handleSuggestionClick(sugg.id, type, sugg.name);
                                            setIsDrawerVisible(false);
                                          }}
                                        >
                                          <img
                                            loading="lazy"
                                            src={sugg.image}
                                            alt={sugg.name}
                                            onError={(e) => {
                                              e.currentTarget.style.visibility = "hidden";
                                            }}
                                          />
                                          <span>{sugg.name}</span>
                                        </div>
                                      ))}
                                    </div>
                                  ),
                                )}
                              </>
                            ) : (
                              <div className="vv-msearch-empty">
                                {t("No results found for")} &quot;{searchQuery}&quot;
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Login/Signup Section */}
                      {userDetails && userDetails.user ? (
                        <div></div>
                      ) : (
                        <div
                          style={{
                            padding: "15px 20px",
                            backgroundColor: "#fffbf6",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 14,
                              color: "#666",
                              marginBottom: 8,
                              fontStyle: "italic",
                            }}
                          >
                            <I18nText text="NAVBAR.To explore all the features, please" />
                          </div>
                          <button
                            style={{
                              backgroundColor: "#F24E1E",
                              color: "white",
                              border: "none",
                              borderRadius: 10,
                              padding: "8px 0",
                              width: "100%",
                              fontSize: 16,
                              fontWeight: 500,
                              cursor: "pointer",
                            }}
                            onClick={() => setModalOpen(true)}
                          >
                            <I18nText text="NAVBAR.LOGIN / SIGN UP" />
                          </button>
                        </div>
                      )}

                      {/* General Link Section */}
                      <div style={{ marginTop: 5 }}>
                        <div
                          style={{
                            padding: "0 20px 5px 20px",
                            fontSize: 15,
                            color: "#999",
                            fontWeight: 500,
                            textTransform: "uppercase",
                            letterSpacing: 0.5,
                            borderBottom: "2px solid #f0f0f0",
                          }}
                        >
                          <I18nText text="NAVBAR.GENERAL LINKS" />
                        </div>

                        <div style={{ backgroundColor: "#fffbf6" }}>
                          <Link
                            href="/chadhava"
                            onClick={() => setIsDrawerVisible(false)}
                            style={{
                              textDecoration: "none",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "7px 20px",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center" }}>
                              <TempleHinduIcon
                                style={{
                                  color: "#666",
                                  marginRight: 12,
                                  fontSize: 20,
                                }}
                              />
                              <span style={{ color: "#333", fontSize: 16 }}>Chadhava</span>
                            </div>
                            <KeyboardArrowRight style={{ color: "#ccc" }} />
                          </Link>

                          <Link
                            href="/services/puja"
                            onClick={() => setIsDrawerVisible(false)}
                            style={{
                              textDecoration: "none",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "7px 20px",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center" }}>
                              <svg
                                width="18"
                                height="18"
                                viewBox="0 0 14 14"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <mask id="path-1-inside-1_10035_877" fill="white">
                                  <path d="M14 8.16667C14 9.71376 13.2625 11.1975 11.9497 12.2915C10.637 13.3854 8.85652 14 7 14C5.14349 14 3.36301 13.3854 2.05025 12.2915C0.737498 11.1975 2.80326e-07 9.71376 0 8.16667L7 8.16667H14Z" />
                                </mask>
                                <path
                                  d="M14 8.16667C14 9.71376 13.2625 11.1975 11.9497 12.2915C10.637 13.3854 8.85652 14 7 14C5.14349 14 3.36301 13.3854 2.05025 12.2915C0.737498 11.1975 2.80326e-07 9.71376 0 8.16667L7 8.16667H14Z"
                                  stroke="#403E3E"
                                  strokeWidth="2"
                                  mask="url(#path-1-inside-1_10035_877)"
                                />
                                <path
                                  d="M5.93026 4.83366C5.44873 6.41699 6.89331 8.16699 7.37482 8.16699C7.85633 8.16699 9.09587 6.98372 9.30091 5.54199C9.58534 3.54199 7.92122 1.72255 7.35238 1.16699C6.49911 3.50033 6.32111 3.54849 5.93026 4.83366Z"
                                  stroke="#403E3E"
                                />
                              </svg>

                              <span
                                style={{
                                  color: "#333",
                                  fontSize: 16,
                                  paddingLeft: 10,
                                }}
                              >
                                <I18nText text="NAVBAR.Book Pooja" />
                              </span>
                            </div>
                            <KeyboardArrowRight style={{ color: "#ccc" }} />
                          </Link>

                          <Link
                            href="/services/banke-bihariji"
                            onClick={() => setIsDrawerVisible(false)}
                            style={{
                              textDecoration: "none",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "7px 20px",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center" }}>
                              <TempleHinduIcon
                                style={{ color: "#666", marginRight: 12, fontSize: 20 }}
                              />
                              <span style={{ color: "#333", fontSize: 16 }}>
                                Shri Banke Bihari Ji Mandir Puja
                              </span>
                            </div>
                            <KeyboardArrowRight style={{ color: "#ccc" }} />
                          </Link>

                          <Link
                            href="/4-dham-yatra"
                            onClick={() => setIsDrawerVisible(false)}
                            style={{
                              textDecoration: "none",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "7px 20px",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center" }}>
                              <MapIcon style={{ color: "#666", marginRight: 12, fontSize: 20 }} />
                              <span style={{ color: "#333", fontSize: 16 }}>4 Dham Yatra</span>
                            </div>
                            <KeyboardArrowRight style={{ color: "#ccc" }} />
                          </Link>

                          <a
                            href="/services/12-jyotirlinga"
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => setIsDrawerVisible(false)}
                            style={{
                              textDecoration: "none",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "7px 20px",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center" }}>
                              <TempleHinduIcon
                                style={{ color: "#666", marginRight: 12, fontSize: 20 }}
                              />
                              <span style={{ color: "#333", fontSize: 16 }}>12 Jyotirlinga</span>
                            </div>
                            <KeyboardArrowRight style={{ color: "#ccc" }} />
                          </a>

                          {/* <Link
                            href="/services/gau-seva"
                            onClick={() => setIsDrawerVisible(false)}
                            style={{
                              textDecoration: "none",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "7px 20px",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center" }}>
                              <span style={{ marginRight: 12, fontSize: 20, lineHeight: 1 }}>🐄</span>
                              <span style={{ color: "#333", fontSize: 16 }}>Gau Seva</span>
                            </div>
                            <KeyboardArrowRight style={{ color: "#ccc" }} />
                          </Link> */}

                          <Link
                            href="/services/new-jyotirling-chadhava"
                            onClick={() => setIsDrawerVisible(false)}
                            style={{
                              textDecoration: "none",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "7px 20px",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center" }}>
                              <TempleHinduIcon
                                style={{
                                  color: "#666",
                                  marginRight: 12,
                                  fontSize: 20,
                                }}
                              />
                              <span style={{ color: "#333", fontSize: 16 }}>
                                Jyotirling Chadhava Seva
                              </span>
                              <span
                                style={{
                                  backgroundColor: "#ef4444",
                                  color: "white",
                                  fontSize: 10,
                                  padding: "2px 6px",
                                  borderRadius: 3,
                                  marginLeft: 8,
                                  fontWeight: "bold",
                                  lineHeight: 1,
                                }}
                              >
                                New
                              </span>
                            </div>
                            <KeyboardArrowRight style={{ color: "#ccc" }} />
                          </Link>

                          <a
                            href="https://vedicshop.store"
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => setIsDrawerVisible(false)}
                            style={{
                              textDecoration: "none",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "7px 20px",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center" }}>
                              <svg
                                width="18"
                                height="18"
                                viewBox="0 0 14 14"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M6.23482 0.0699053C5.28521 0.315609 4.55142 1.05604 4.30904 2.00565C4.25924 2.20487 4.24263 2.37752 4.24263 2.72616V3.18436L3.12369 3.19432C2.06119 3.20428 1.9981 3.2076 1.91178 3.27069C1.86529 3.30721 1.8022 3.37694 1.77232 3.42674C1.71256 3.52635 0.0822831 10.1371 0.0225175 10.5256C-0.0239669 10.831 0.00259563 11.2926 0.0922441 11.6312C0.324666 12.5476 1.02525 13.3246 1.90513 13.6433C2.39654 13.8226 2.29361 13.8193 7.0649 13.806L11.4975 13.7961L11.7266 13.723C12.2645 13.5504 12.6463 13.3113 13.0282 12.9062C13.6657 12.2355 13.9512 11.2926 13.7919 10.3928C13.7387 10.0972 11.6967 3.51307 11.6237 3.40018C11.5971 3.35701 11.5241 3.29061 11.4643 3.25408C11.3647 3.191 11.3016 3.18768 10.4549 3.18768H9.55513V2.72948C9.55513 2.18826 9.49205 1.89276 9.29283 1.47772C8.96412 0.787092 8.31334 0.262484 7.54967 0.0665855C7.19439 -0.0230637 6.58677 -0.0230637 6.23482 0.0699053ZM7.38033 1.16229C7.87174 1.33162 8.26685 1.74002 8.40631 2.22479C8.43619 2.3244 8.46939 2.58338 8.48267 2.79588L8.50259 3.18768H6.89888H5.29517L5.3151 2.79588C5.32838 2.58338 5.36158 2.3244 5.39146 2.22479C5.53424 1.7367 5.94263 1.31502 6.42740 1.15897C6.69303 1.07596 7.12799 1.07596 7.38033 1.16229ZM4.24263 5.66795C4.24263 7.02596 4.24595 7.09237 4.30904 7.19862C4.40865 7.35799 4.55806 7.43768 4.77388 7.43768C4.98970 7.43768 5.13912 7.35799 5.23873 7.19862C5.30181 7.09237 5.30513 7.02596 5.30513 5.66795V4.25018H6.89888H8.49263V5.66795C8.49263 7.02596 8.49595 7.09237 8.55904 7.19862C8.65865 7.35799 8.80806 7.43768 9.02388 7.43768C9.23970 7.43768 9.38912 7.35799 9.48873 7.19862C9.55181 7.09237 9.55513 7.02596 9.55513 5.66795V4.25018H10.1495H10.7438L10.7803 4.35643C11.3481 6.14276 12.6795 10.5687 12.6961 10.7314C12.7626 11.3822 12.3840 12.1193 11.8096 12.4613C11.6934 12.531 11.4942 12.6207 11.3647 12.6605L11.1323 12.7336H6.91549C3.42252 12.7336 2.66881 12.7269 2.51607 12.6871C1.67935 12.4746 1.09166 11.7508 1.08834 10.924C1.08502 10.665 1.15142 10.3828 1.87525 7.44764L2.66549 4.25018H3.45572H4.24263V5.66795Z"
                                  fill="black"
                                  fillOpacity="0.75"
                                />
                              </svg>

                              <span
                                style={{
                                  color: "#333",
                                  fontSize: 16,
                                  paddingLeft: 10,
                                }}
                              >
                                <I18nText text="NAVBAR.Shop" />
                              </span>
                              <span
                                style={{
                                  backgroundColor: "#00C851",
                                  color: "white",
                                  fontSize: 10,
                                  padding: "2px 6px",
                                  borderRadius: 3,
                                  marginLeft: 8,
                                  fontWeight: 500,
                                }}
                              >
                                New
                              </span>
                            </div>
                            <KeyboardArrowRight style={{ color: "#ccc" }} />
                          </a>
                        </div>
                      </div>

                      {/* Knowledge & Services Section */}
                      <div style={{ marginTop: 10 }}>
                        <div
                          style={{
                            padding: "0 20px 5px 20px",
                            fontSize: 15,
                            color: "#999",
                            fontWeight: 500,
                            textTransform: "uppercase",
                            letterSpacing: 0.5,
                            borderBottom: "2px solid #f0f0f0",
                          }}
                        >
                          <I18nText text="NAVBAR.KNOWLEDGE & SERVICES" />
                        </div>

                        <div style={{ backgroundColor: "#fffbf6" }}>
                          <Link
                            href={`/vedic-pathshala/${categoryLinks[0].slug}`}
                            onClick={() => setIsDrawerVisible(false)}
                            style={{
                              textDecoration: "none",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "7px 20px",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center" }}>
                              <svg
                                width="18"
                                height="18"
                                viewBox="0 0 13 15"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M0.597656 0.164062C0 0.492188 0.0117188 0.398438 0 7.69922V14.5312H6.15234H12.3047V8.20312V1.875H11.8359H11.3672V1.40625V0.9375H11.8359H12.3047V0.46875V0H6.59766C2.07422 0.0117188 0.820312 0.0351562 0.597656 0.164062ZM10.3125 1.40625V1.875H5.90625C3.10547 1.875 1.42969 1.82812 1.27734 1.75781C0.996094 1.60547 0.984375 1.21875 1.26562 1.06641C1.39453 0.984375 3.10547 0.9375 5.89453 0.9375H10.3125V1.40625ZM11.25 8.4375V14.0625H6.62109H0.992188V8.4375V2.8125H6.62109H11.25V8.4375Z"
                                  fill="black"
                                />
                                <path
                                  d="M2.8125 6.09375V6.5625H6.5625H10.3125V6.09375V5.625H6.5625H2.8125V6.09375Z"
                                  fill="black"
                                />
                                <path
                                  d="M2.8125 7.96875V8.4375H6.5625H10.3125V7.96875V7.5H6.5625H2.8125V7.96875Z"
                                  fill="black"
                                />
                                <path
                                  d="M2.8125 9.84375V10.3125H5.625H8.4375V9.84375V9.375H5.625H2.8125V9.84375Z"
                                  fill="black"
                                />
                              </svg>

                              <span
                                style={{
                                  color: "#333",
                                  fontSize: 16,
                                  paddingLeft: 10,
                                }}
                              >
                                Vedic Pathshala
                              </span>
                            </div>
                            <KeyboardArrowRight style={{ color: "#ccc" }} />
                          </Link>

                          <Link
                            href="/mandir"
                            onClick={() => setIsDrawerVisible(false)}
                            style={{
                              textDecoration: "none",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "7px 20px",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center" }}>
                              <TempleHinduIcon
                                style={{
                                  color: "#666",
                                  marginRight: 12,
                                  fontSize: 20,
                                }}
                              />
                              <span style={{ color: "#333", fontSize: 16 }}>
                                Book Personalise Puja by Mandir
                              </span>
                            </div>
                            <KeyboardArrowRight style={{ color: "#ccc" }} />
                          </Link>

                          <Link
                            href="/sanatan-yatra"
                            onClick={() => setIsDrawerVisible(false)}
                            style={{
                              textDecoration: "none",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "7px 20px",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center" }}>
                              <MapIcon
                                style={{
                                  color: "#666",
                                  marginRight: 12,
                                  fontSize: 20,
                                }}
                              />
                              <span style={{ color: "#333", fontSize: 16 }}>Sanatan Yatra</span>
                            </div>
                            <KeyboardArrowRight style={{ color: "#ccc" }} />
                          </Link>

                          <Link
                            href="/video-proof"
                            onClick={() => setIsDrawerVisible(false)}
                            style={{
                              textDecoration: "none",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "7px 20px",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center" }}>
                              <svg
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                                style={{ marginRight: 12, flexShrink: 0 }}
                              >
                                <path
                                  d="M15 10L19.553 7.724A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14v-4Z"
                                  stroke="#666"
                                  strokeWidth="1.5"
                                  strokeLinejoin="round"
                                />
                                <rect
                                  x="3"
                                  y="7"
                                  width="12"
                                  height="10"
                                  rx="2"
                                  stroke="#666"
                                  strokeWidth="1.5"
                                />
                              </svg>
                              <span style={{ color: "#333", fontSize: 16 }}>Video Proof</span>
                            </div>
                            <KeyboardArrowRight style={{ color: "#ccc" }} />
                          </Link>
                        </div>
                      </div>

                      {/* Legal/Support Section */}
                      <div style={{ marginTop: 10 }}>
                        <div
                          style={{
                            padding: "0 20px 5px 20px",
                            fontSize: 15,
                            color: "#999",
                            fontWeight: 500,
                            textTransform: "uppercase",
                            letterSpacing: 0.5,
                            borderBottom: "2px solid #f0f0f0",
                          }}
                        >
                          <I18nText text="NAVBAR.LEGAL & SUPPORT" />
                        </div>

                        <div style={{ backgroundColor: "#fffbf6" }}>
                          <Link href={"/privacypolicy"} onClick={() => setIsDrawerVisible(false)}>
                            <div
                              style={{
                                padding: "7px 20px",
                              }}
                            >
                              <span style={{ color: "#333", fontSize: 16 }}>
                                <I18nText text="NAVBAR.Privacy Policy" />
                              </span>
                            </div>
                          </Link>

                          <Link
                            href={"/termsandconditions"}
                            onClick={() => setIsDrawerVisible(false)}
                          >
                            <div
                              style={{
                                padding: "7px 20px",
                              }}
                            >
                              <span style={{ color: "#333", fontSize: 16 }}>
                                <I18nText text="NAVBAR.Terms and Conditions" />
                              </span>
                            </div>
                          </Link>

                          <Link href={"/refundpolicy"} onClick={() => setIsDrawerVisible(false)}>
                            <div
                              style={{
                                padding: "7px 20px",
                              }}
                            >
                              <span style={{ color: "#333", fontSize: 16 }}>
                                <I18nText text="NAVBAR.Refund & Return Policy" />
                              </span>
                            </div>
                          </Link>
                        </div>
                      </div>
                      {/* Contact Support Section */}
                      <div style={{ marginTop: 10 }}>
                        <div
                          style={{
                            padding: "0 20px 5px 20px",
                            fontSize: 15,
                            color: "#999",
                            fontWeight: 500,
                            textTransform: "uppercase",
                            letterSpacing: 0.5,
                            borderBottom: "2px solid #f0f0f0",
                          }}
                        >
                          CONTACT SUPPORT
                        </div>

                        <div
                          style={{
                            padding: "8px 16px",
                            backgroundColor: "#fffbf6",
                          }}
                        >
                          {/* WhatsApp Row */}
                          <a
                            href="https://wa.me/919056955310"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ textDecoration: "none", display: "block" }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                backgroundColor: "#fff",
                                border: "1px solid #e0e0e0",
                                borderRadius: 10,
                                padding: "5px 16px",
                                marginBottom: 12,
                              }}
                            >
                              <img
                                loading="lazy"
                                src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg"
                                alt="whatsapp"
                                style={{
                                  width: 30,
                                  height: 30,
                                  marginRight: 10,
                                }}
                              />
                              <span style={{ fontSize: 14, color: "#333" }}>+91 9056955310</span>
                            </div>
                          </a>

                          {/* Call & Email Row */}
                          <div
                            style={{
                              display: "flex",
                              gap: 12,
                              marginBottom: 20,
                            }}
                          >
                            <a
                              href="tel:+919056955310"
                              style={{
                                flex: 1,
                                textDecoration: "none",
                                display: "flex",
                              }}
                            >
                              <div
                                style={{
                                  flex: 1,
                                  display: "flex",
                                  alignItems: "center",
                                  backgroundColor: "#fff",
                                  border: "1px solid #e0e0e0",
                                  borderRadius: 7,
                                  padding: "5px 12px",
                                }}
                              >
                                <svg
                                  width="18"
                                  height="18"
                                  viewBox="0 0 18 18"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    d="M8.43511 0.00994492C7.31752 0.0999794 6.50721 0.287876 5.57164 0.669542C3.38146 1.56401 1.60231 3.33338 0.684356 5.53138C0.332049 6.37496 0.132408 7.17548 0.0247584 8.1776C-0.0124296 8.52208 -0.0065578 9.53007 0.0345447 9.89999C0.189168 11.2838 0.582578 12.4718 1.26762 13.6188C2.41653 15.5408 4.26223 16.9833 6.38978 17.6214C7.20987 17.866 7.91448 17.9776 8.78938 17.9972C10.0518 18.0265 11.1635 17.8269 12.3301 17.363C13.6669 16.8326 14.8921 15.9538 15.8257 14.8617C17.6049 12.7772 18.3349 10.0507 17.8417 7.33206C17.4914 5.41395 16.454 3.58391 14.9724 2.26863C13.4751 0.939644 11.6568 0.172398 9.631 0.0158176C9.402 -0.00179863 8.62497 -0.00571251 8.43511 0.00994492ZM9.96178 1.50138C10.5137 1.57575 10.9678 1.6834 11.4689 1.8576C13.9605 2.71488 15.8434 4.85026 16.3836 7.42601C16.5088 8.03081 16.5362 8.30678 16.5382 8.98987C16.5382 9.67099 16.5167 9.89412 16.3992 10.4872C15.9784 12.6088 14.6807 14.4252 12.7939 15.535C12.1187 15.9342 11.3123 16.2435 10.5587 16.3961C9.90698 16.5292 9.50965 16.5625 8.81874 16.5488C8.28245 16.5371 8.05345 16.5155 7.58371 16.4255C6.74013 16.267 5.95135 15.9753 5.21346 15.5467C3.38929 14.4878 2.07793 12.7067 1.6258 10.6672C1.48096 10.0213 1.42812 9.46157 1.44377 8.80392C1.47705 7.5317 1.80978 6.33582 2.42828 5.25932C3.42061 3.53106 5.00599 2.28428 6.92019 1.72842C7.30773 1.61686 7.86164 1.51312 8.33725 1.46615C8.65041 1.43287 9.62904 1.4544 9.96178 1.50138Z"
                                    fill="#F24E1E"
                                  />
                                  <path
                                    d="M5.8711 4.9233C5.73018 4.95658 5.44833 5.06618 5.27022 5.15817C4.31703 5.6514 3.99604 6.57523 4.30725 7.92379C4.50885 8.79281 5.04122 9.8693 5.70669 10.7442C6.08053 11.2355 6.64422 11.8246 7.09439 12.1926C8.05345 12.9774 9.15147 13.545 10.271 13.8347C10.7975 13.9698 11.3162 13.9619 11.8075 13.8132C12.0169 13.7486 12.3555 13.5744 12.5356 13.4394C13.064 13.0381 13.3557 12.5253 13.3909 11.9362C13.4066 11.6582 13.3968 11.6367 13.1913 11.4821C12.7411 11.1454 12.0913 10.7931 11.6509 10.6483C11.3593 10.5524 11.1107 10.4976 11.0422 10.5152C10.96 10.5348 10.7897 10.709 10.3689 11.1963C10.1497 11.4527 9.95199 11.6719 9.9285 11.6837C9.90502 11.6954 9.83456 11.7013 9.76605 11.6974C9.52727 11.6817 9.11037 11.4351 8.55451 10.981C8.24526 10.7285 7.52694 10.0161 7.26663 9.70489C6.79101 9.13533 6.50721 8.64797 6.50721 8.40136C6.50721 8.23499 6.69511 8.02556 7.14136 7.68891C7.29207 7.57539 7.433 7.45796 7.45453 7.4286C7.51129 7.35031 7.52303 6.98039 7.47606 6.74551C7.34296 6.08396 6.89671 5.35781 6.43088 5.05052C6.24885 4.92917 6.04334 4.8822 5.8711 4.9233Z"
                                    fill="#F24E1E"
                                  />
                                </svg>

                                <span
                                  style={{
                                    fontSize: 10,
                                    color: "#333",
                                    marginLeft: 8,
                                  }}
                                >
                                  +91 9056955310
                                </span>
                              </div>
                            </a>

                            <a
                              href="mailto:support@vedicvaibhav.com"
                              style={{
                                flex: 1,
                                textDecoration: "none",
                                display: "flex",
                              }}
                            >
                              <div
                                style={{
                                  flex: 1,
                                  display: "flex",
                                  alignItems: "center",
                                  border: "1px solid #e0e0e0",
                                  borderRadius: 7,
                                  padding: "5px 12px",
                                  justifyContent: "center",
                                  backgroundColor: "#fff",
                                }}
                              >
                                <svg
                                  width="18"
                                  height="14"
                                  viewBox="0 0 18 14"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    d="M0.737305 7.44018V14H9.36865H18V7.44018V0.880353H9.36865H0.737305V7.44018ZM12.8039 5.28234C10.5943 7.49196 9.69664 8.30331 9.38591 8.30331C8.97161 8.30331 8.50552 7.87174 4.88035 4.10848L3.10229 2.26137H9.45497H15.7904L12.8039 5.28234ZM6.00243 7.45744C6.00243 7.52649 5.0875 8.51046 3.98269 9.6498L1.94569 11.7213V7.40565V3.08998L3.98269 5.19603C5.0875 6.36989 6.00243 7.37113 6.00243 7.45744ZM16.7571 9.6498L16.7053 11.6695L14.6683 9.58075L12.614 7.4747L14.6683 5.36865L16.7053 3.2626L16.7571 5.4377C16.7743 6.64609 16.7743 8.54499 16.7571 9.6498ZM9.33413 9.68433C10.1109 9.68433 10.6288 9.45991 11.233 8.87298C11.3539 8.75214 11.561 8.64856 11.6646 8.64856C11.7854 8.64856 12.7176 9.5117 13.7361 10.582L15.6005 12.5327L12.4759 12.5845C10.7669 12.6017 7.97037 12.6017 6.26137 12.5845L3.15408 12.5327L5.12203 10.4784L7.10724 8.42415L7.79775 9.04561C8.40194 9.59801 8.62636 9.68433 9.33413 9.68433Z"
                                    fill="#F24E1E"
                                  />
                                </svg>

                                <span
                                  style={{
                                    fontSize: 14,
                                    color: "#333",
                                    marginLeft: 8,
                                  }}
                                >
                                  <I18nText text="NAVBAR.Mail Us" />
                                </span>
                              </div>
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Drawer>
              )}
            </Col>

            {/* Image - Mobile */}
            <Col
              xl={0}
              lg={0}
              md={0}
              sm={18}
              xs={18}
              onClick={() => router.push("/")}
              style={{
                width: "100%",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                paddingBottom: "5px",
              }}
            >
              {/* Mobile header logo — the LCP element on phones. Same reasoning
                  as the desktop logo above: never lazy, and give it real
                  intrinsic dimensions. */}
              <img
                loading="eager"
                fetchPriority="high"
                decoding="async"
                alt="logo"
                src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/logo/vvfinallogo.png"
                width={828}
                height={640}
                style={{ width: "30%", height: "60px", objectFit: "contain" }}
              />
            </Col>

            {/* ALL */}
            <Col xl={2} lg={2} md={2} sm={3} xs={3}>
              <div className="navbar-icons pr-4">
                <div className="pr-1">
                  <MobileLangSelector />
                </div>
                {userDetails && userDetails.user && userDetails.user.phone ? (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <div
                      className="items-center text-center flex justify-center "
                      style={{
                        borderRadius: "100px",
                        height: "27px",
                        width: "27px",
                      }}
                      onClick={() => router.push("/profile")}
                    >
                      <img
                        loading="lazy"
                        alt="profile"
                        style={{ borderRadius: "100px" }}
                        src={
                          userDetails.user.picture ||
                          "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/personicon.png"
                        }
                      ></img>
                    </div>
                  </div>
                ) : (
                  <Person onClick={() => setModalOpen(true)} className="person-icon" />
                )}
                {loginModalMounted && (
                  <LoginModel
                    modalOpen={modalOpen}
                    setModalOpen={setModalOpen}
                    onLoginSuccess={() => {
                      setModalOpen(false);
                    }}
                  />
                )}
              </div>
            </Col>
          </Row>
        </div>
      </Col>

      {/* Spacer to push content down below fixed header */}
      <Col xl={24} lg={24} md={24} sm={0} xs={0}>
        <div style={{ height: "30px" }}></div>
      </Col>
      <Col xl={0} lg={0} md={0} sm={24} xs={24}>
        <div style={{ height: "40px" }}></div>
      </Col>
    </div>
  );
};

export default Navbar;
