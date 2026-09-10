"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import Layout from "@/components/layout/Layout";
import { useEffect, useState } from "react";
import useMediaQuery from '@mui/material/useMediaQuery';
import { Select } from "antd";
import ArrowForwardIos from '@mui/icons-material/ArrowForwardIos';
import { api } from "@/lib/api";

const AartiPage = () => {
  return (
    <div>
      <Layout content={<AartiPageContent />} activeIndex="explore" />
    </div>
  );
};

export default AartiPage;

interface AartiData {
  id: string;
  nameEnglish: string;
  nameHindi: string;
  descriptionEnglish: string;
  descriptionHindi: string;
  godName: string;
  aartiImage: string;
  _id: string;
}

const AartiPageContent = () => {
  const params = useParams<{ aartiid: string }>();
  const aartiid = params?.aartiid;
  const [aartiData, setAartiData] = useState<AartiData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const isSmallScreen = useMediaQuery("(max-width:600px)");
  const [language, setLanguage] = useState<"english" | "hindi">("english");

  useEffect(() => {
    if (aartiid) {
      api
        .get(`/fetch-library-data-by-id/${aartiid}`)
        .then((response) => {
          setAartiData(response.data.library);
          setLoading(false);
        })
        .catch((error) => {
          console.error("Error fetching data:", error);
          setError("Failed to fetch data");
          setLoading(false);
        });
    } else {
      setError("Invalid ID");
      setLoading(false);
    }
  }, [aartiid]);

  if (loading) {
    return <p>Loading...</p>;
  }

  if (error) {
    return <p>Error: {error}</p>;
  }

  if (!aartiData) {
    return <p>No data available</p>;
  }

  return (
    <>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          paddingInline: "0%",
          height: isSmallScreen ? "320vh" : "400vh",
        }}
      >
        <div
          style={{
            paddingBottom: "11%",
            paddingTop: "2%",
            backgroundColor: "#EE9641",
            position: "relative",
            paddingInline: "6%",
          }}
        >
          <Link href="/"> Home</Link>{" "}
          <ArrowForwardIos style={{ fontSize: "12px" }} />{" "}
          <Link href="/aarti"> Aarti</Link>
          <ArrowForwardIos style={{ fontSize: "12px" }} /> {aartiid}
        </div>
        <div
          style={{
            position: "absolute",
            top: isSmallScreen ? "3%" : "6%",
            zIndex: 2,
            width: "100%",
          }}
        >
          <div
            style={{
              width: "100%",
              position: "relative",
              height: "auto",
              paddingInline: isSmallScreen ? "6%" : "21%",
            }}
          >
            <img loading="lazy"
              style={{ width: "100%", height: isSmallScreen ? "300vh" : "320vh" }}
              src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/AartiSection/arrtibg%20(1).jpg"
            ></img>
            <div
              style={{
                position: "absolute",
                zIndex: "10",
                top: isSmallScreen ? "1%" : "2%",
                left: "50%",
                transform: "translateX(-50%)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <img loading="lazy"
                src={aartiData.aartiImage}
                alt={aartiData.nameEnglish}
                style={{
                  width: "100%",
                  borderRadius: "12px",
                  maxWidth: "500px",
                  marginBottom: isSmallScreen ? "5%" : "2%",
                }}
              />
              <Select
                defaultValue="english"
                style={{
                  width: 100,
                  borderRadius: "20px",
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
                  backgroundColor: "white", // This won't apply directly
                  marginBlock: "2%",
                }}
                dropdownStyle={{
                  backgroundColor: "white",
                }}
                onChange={(value) => setLanguage(value as "english" | "hindi")}
                options={[
                  { value: "english", label: "English" },
                  { value: "hindi", label: "Hindi" },
                ]}
                variant="borderless"
              />
              <h1
                style={{
                  fontFamily: "Montserrat",
                  fontSize: "20px",
                  fontWeight: "600",
                  marginTop: isSmallScreen ? "3%" : "1%",
                }}
              >
                {language === "english"
                  ? aartiData.nameEnglish
                  : aartiData.nameHindi}
              </h1>
              <h3
                style={{
                  fontFamily: "Montserrat",
                  fontSize: "14px",
                  fontWeight: "500",
                  marginBottom: "2%",
                }}
              >
                Dedicated to : <u>{aartiData.godName}</u>
              </h3>
              {language === "english" ? (
                <div
                  style={{ fontSize: "16px" }}
                  dangerouslySetInnerHTML={{
                    __html: aartiData.descriptionEnglish,
                  }}
                ></div>
              ) : (
                <div
                  style={{ fontSize: "16px" }}
                  dangerouslySetInnerHTML={{ __html: aartiData.descriptionHindi }}
                ></div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
