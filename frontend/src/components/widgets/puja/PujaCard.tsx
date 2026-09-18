"use client";

// PujaCard.tsx

import React, { useCallback } from 'react';
import { useMoney } from "@/lib/currency";
import { Col } from 'antd';
import { useRouter } from "next/navigation";
import TempleHinduIcon from "@mui/icons-material/TempleHindu";
import DateRangeIcon from "@mui/icons-material/DateRange";
import useMediaQuery from '@mui/material/useMediaQuery';
import { useQueryClient } from '@tanstack/react-query';
import { PUJA_KEYS } from "@/lib/query-keys/puja.keys";
import { fetchActivePoojaById } from "@/lib/api/puja.api";
import { buildDetailSlug } from "@/lib/slug";
// ---------------- DATE HELPERS (defensive: pick latest if array) ----------------
const parseFlexibleDate = (value: any): Date | null => {
  if (!value) return null;
  if (value instanceof Date && !isNaN(value.getTime())) return value;
  if (typeof value === "number") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return null;

    // dd-mm-yyyy
    const m1 = s.match(/^([0-3]?\d)-([0-1]?\d)-(\d{4})$/);
    if (m1) {
      const dd = Number(m1[1]);
      const mm = Number(m1[2]);
      const yyyy = Number(m1[3]);
      const d = new Date(yyyy, mm - 1, dd, 0, 0, 0);
      return isNaN(d.getTime()) ? null : d;
    }

    // yyyy-mm-dd or ISO
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
};

const formatLatestDateForUI = (value: any): string => {
  if (!value) return "-";

  // if array comes from backend, pick the latest
  if (Array.isArray(value)) {
    const parsed = value.map(parseFlexibleDate).filter(Boolean) as Date[];
    if (parsed.length === 0) return "-";
    parsed.sort((a, b) => b.getTime() - a.getTime());
    return parsed[0].toLocaleDateString();
  }

  const d = parseFlexibleDate(value);
  if (!d) return String(value);
  return d.toLocaleDateString();
};
// ------------------------------------------------------------------------------

interface PujaCardProps {
  id: string;
  imgSrc: string;
  Title: string;
  MoolMantra: string;
  poojaCardBenefit: string;
  price: number;
  mandirName: string; // New prop for Mandir Name
  mandirDate: any;
  /** Overrides the default select-package route, for pujas with their own landing page. */
  href?: string;
}

const PujaCard: React.FC<PujaCardProps> = ({
  id,
  imgSrc,
  Title,
  // MoolMantra,
  // poojaCardBenefit,
  price,
  mandirName,
  mandirDate,
  href,
}) => {
  /** Prices display in the devotee's own currency; the India list price is the
   *  input and the server owns the markup. See lib/currency.ts. */
  const { money } = useMoney();
  const router = useRouter();
  const isSmallScreen = useMediaQuery("(max-width:600px)");

  const queryClient = useQueryClient();
  const displayMandirDate = formatLatestDateForUI(mandirDate);

  const prefetchDetail = useCallback(() => {
    const pujaId = String(id);
    // Custom-route pujas are not in the pooja collections, so there is nothing to prefetch.
    if (!pujaId || href) return;

    queryClient.prefetchQuery({
      queryKey: PUJA_KEYS.activeDetail(pujaId),
      queryFn: () => fetchActivePoojaById(pujaId),
      staleTime: 30 * 60 * 1000, // keep aligned with detail hook
    });
  }, [id, href, queryClient]);

  return (
    <div style={{ width: "100%" }}>
      <Col xs={24} sm={24} md={24} lg={24} xl={24}>
        <div style={{ padding: "1%", marginBottom: "0%" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              borderRadius: "15px",
              backgroundColor: "#F8F7F4",
              boxShadow: "0px 0px 4px 0px rgba(0,0,0,0.5)",
              position: "relative",
              cursor: "pointer",
              overflow: "hidden",
            }}
            onMouseEnter={prefetchDetail}
            onFocus={prefetchDetail}
            onTouchStart={prefetchDetail}
            onClick={() => router.push(href ?? `/services/puja/${buildDetailSlug(Title, id)}/select-package`)}
          >
            <div style={{ position: "relative", }}>
              <img
                src={imgSrc}
                style={{
                  borderTopLeftRadius: "15px",
                  borderTopRightRadius: "15px",
                  display: "block",
                  width: "100%",
                  // Puja card images are uploaded at 1.85:1. Fixing the box keeps
                  // any other shape (e.g. a wider banner) from changing the card's
                  // height, and cover crops it instead of stretching it.
                  aspectRatio: "1.85 / 1",
                  objectFit: "cover",
                }}
                alt={Title}
                loading="eager"

              />
            </div>

            <div style={{ display: "block", padding: "3%" }}>

              {/* <div
                style={{
                  fontSize: "14px",
                  fontStyle: "italic",
                  color: "rgba(0,0,0,0.7)",
                
                  display: "flex",
                  marginTop: "10px",
                  paddingBottom: "1%",
                  fontFamily: "Open Sans",
                  borderBottom: "1px dashed rgba(0,0,0,0.3)",
                  marginBottom: "1%",
                }}
              >
                
                {poojaCardBenefit}
              </div> */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "3%",
                  paddingBottom: "3%",
                }}
              >
                <div>
                  <TempleHinduIcon style={{ color: "#F55E00", fontSize: "15px" }} />
                </div>
                <div
                  style={{
                    fontSize: isSmallScreen ? "9px" : "14px",
                    fontWeight: "400",
                    marginTop: "5px",
                    lineClamp: 1,
                    WebkitLineClamp: 1,
                    display: "-webkit-box",
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}

                >
                  {mandirName}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "3%" }}>
                <div>
                  <DateRangeIcon style={{ color: "#F55E00", fontSize: "15px" }} />
                </div>
                <div style={{ fontSize: isSmallScreen ? "9px" : "14px" }}>{displayMandirDate}</div>
              </div>

              <div
                style={{
                  display: "flex",
                  marginTop: "3%",
                  justifyContent: "space-between",
                  alignItems: "center",
                  backgroundColor: "#00BD68",
                  boxShadow: "0px 2px 2px 0px rgba(0,0,0,0.25)",
                  border: "1px solid transparent",
                  borderRadius: "15px",
                  paddingBlock: "2%",
                  paddingLeft: "4%",
                  paddingRight: "2%",
                  gap: "1%",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    color: "white",
                    fontWeight: "300",
                    fontSize: isSmallScreen ? "9px" : "14px",
                    fontStyle: "italic",
                    whiteSpace: "normal",
                  }}
                >
                  Starts from {money(price)}
                </div>

                <div
                  style={{
                    color: "#00BD68",
                    backgroundColor: "white",
                    fontSize: isSmallScreen ? "10px" : "14px",
                    cursor: "pointer",
                    fontWeight: "600",
                    display: "flex",
                    height: isSmallScreen ? "24px" : "30px",
                    justifyContent: "center",
                    alignItems: "center",
                    padding: isSmallScreen ? "0 4px" : "0 12px",
                    width: "auto",
                    whiteSpace: "nowrap",
                    borderRadius: "10px",
                    border: "2px solid transparent", // Transparent border for smooth hover effect
                    transition:
                      "transform 0.3s ease, background-color 0.3s ease, color 0.3s ease, border 0.3s ease",
                  }}
                >
                  Book Puja
                </div>
              </div>
            </div>
          </div>
        </div>
      </Col>
    </div>
  );
};

export default PujaCard;