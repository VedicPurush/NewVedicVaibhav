"use client";

import { Col, Row, Spin } from "antd";
import { useCallback, useState } from "react";
import useMediaQuery from '@mui/material/useMediaQuery';
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import { MANDIR_KEYS } from "@/lib/query-keys/mandir.keys";
import { fetchMandirById } from "@/lib/api/mandir.api";
import { useActiveMandirsQuery } from "@/hooks/queries/useMandirQueries";
import { buildDetailSlug } from "@/lib/slug";

const MandirRecommend = () => {
  const [hoveredMandirId, setHoveredMandirId] = useState<string | null>(null);
  const isSmallScreen = useMediaQuery("(max-width:600px)");

  const router = useRouter();
  const queryClient = useQueryClient();

  const { data = [], isLoading, isError, isFetching } = useActiveMandirsQuery();

  const prefetchMandirDetail = useCallback(
    (id: string) => {
      const mandirId = String(id || "");
      if (!mandirId) return;

      queryClient.prefetchQuery({
        queryKey: MANDIR_KEYS.detail(mandirId),
        queryFn: () => fetchMandirById(mandirId),
        staleTime: 30 * 60 * 1000,
      });
    },
    [queryClient]
  );

  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "24px" }}>
        <Spin size="large" />
      </div>
    );
  }

  if (isError) {
    return (
      <div style={{ color: "white", textAlign: "center", padding: "16px" }}>
        Failed to load mandirs
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: "#093649", paddingBlock: "2%" }}>
      <Row
        justify="center"
        style={{
          color: "#F8F7F4",
          fontSize: isSmallScreen ? "18px" : "20px",
          fontFamily: "Poppins",
        }}
      >
        Discover Sacred Sites Beyond Borders
      </Row>

      <Row
        justify="center"
        style={{
          fontSize: isSmallScreen ? "18px" : "32px",
          fontFamily: "Poppins",
          fontWeight: "500",
          color: "#FF6505",
        }}
      >
        Most Famous Temple
      </Row>

      {/* ✅ Updating badge (background refetch) */}
      {!isLoading && isFetching && (
        <Row justify="center" style={{ marginTop: 8, marginBottom: 8 }}>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/70 backdrop-blur border border-orange-200 text-orange-800 text-xs font-semibold shadow-sm">
            <span className="inline-block h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
            Updating…
          </div>
        </Row>
      )}

      <Row
        style={{
          marginInline: isSmallScreen ? "4%" : "6%",
          justifyContent: "center",
          gap: isSmallScreen ? "" : "2%",
          marginBlock: "2%",
        }}
        gutter={[isSmallScreen ? 10 : 0, isSmallScreen ? 20 : 0]}
      >
        {data.slice(0, 4).map((mandir: any) => (
          <Col
            xs={12}
            sm={12}
            md={12}
            lg={5}
            xl={5}
            key={mandir._id}
            onClick={() => {
              router.push(`/mandir/${buildDetailSlug(mandir.nameEnglish, mandir._id)}`);
            }}
            onMouseEnter={() => {
              setHoveredMandirId(mandir._id);
              prefetchMandirDetail(mandir._id);
            }}
            onMouseLeave={() => setHoveredMandirId(null)}
            onFocus={() => prefetchMandirDetail(mandir._id)}
            onTouchStart={() => prefetchMandirDetail(mandir._id)}
          >
            <div
              className="mt-3"
              style={{
                backgroundImage: `url(${mandir.mandirSectionImage})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
                width: "100%",
                aspectRatio: "2/1",
                height: "auto",
                borderRadius: "0.5vw",
                display: "flex",
                alignItems: "end",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              {hoveredMandirId === mandir._id && (
                <div
                  style={{
                    textAlign: "center",
                    color: "white",
                    width: "100%",
                    background: "linear-gradient(to right, #0CD5F2, #38717B)",
                    paddingBlock: "1%",
                    borderBottomLeftRadius: "0.5vw",
                    borderBottomRightRadius: "0.5vw",
                  }}
                >
                  {mandir.nameHindi}
                </div>
              )}
            </div>

            <div
              style={{
                textAlign: "center",
                fontSize: isSmallScreen ? "10px" : "16px",
                color: "white",
              }}
            >
              {mandir.nameEnglish}
            </div>

            <div
              style={{
                textAlign: "center",
                fontSize: isSmallScreen ? "8px" : "14px",
                color: "#D0D0D0",
              }}
            >
              {mandir.location}
            </div>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default MandirRecommend;
