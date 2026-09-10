"use client";

import Layout from "@/components/layout/Layout";
import { useEffect, useState } from "react";
import useMediaQuery from '@mui/material/useMediaQuery';
import { Select } from "antd";
import { api } from "@/lib/api";

const ChalisaPage = () => {
  return (
    <div>
      <Layout content={<AartiPageContent />} activeIndex="explore" />
    </div>
  );
};

export default ChalisaPage;

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
  const [aartiData, setAartiData] = useState<AartiData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const isSmallScreen = useMediaQuery("(max-width:600px)");
  const [language, setLanguage] = useState<"english" | "hindi">("english");

  useEffect(() => {
    // The old SPA passed the record id via react-router location.state;
    // the list page now stores it in sessionStorage before navigating.
    let id: string | null = null;
    try {
      id = sessionStorage.getItem("chalisaSelectedId");
    } catch {
      id = null;
    }

    if (id) {
      api
        .get(`/fetch-library-data-by-id/${id}`)
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
  }, []);

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
      <div style={{ backgroundColor: "#FFF9F3", paddingBottom: "3%" }}>
        <img loading="lazy"
          src={aartiData.aartiImage}
          alt={aartiData.nameEnglish}
          style={{
            width: "100%",
            maxWidth: "500px",
            marginBottom: isSmallScreen ? "5%" : "2%",
          }}
        />
        <div
          style={{
            paddingInline: isSmallScreen ? "3%" : "6%",
            backgroundColor: "#FFF9F3",
          }}
        >
          <Select
            defaultValue="english"
            style={{
              width: 100,
              borderRadius: "20px",
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
              backgroundColor: "white", // This won't apply directly
            }}
            dropdownStyle={{
              backgroundColor: "white", // Apply background color to the dropdown menu
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
            {language === "english" ? aartiData.nameEnglish : aartiData.nameHindi}
          </h1>

          {language === "english" ? (
            <div
              style={{ fontSize: "16px" }}
              dangerouslySetInnerHTML={{ __html: aartiData.descriptionEnglish }}
            ></div>
          ) : (
            <div
              style={{ fontSize: "16px", textAlign: "start" }}
              dangerouslySetInnerHTML={{ __html: aartiData.descriptionHindi }}
            ></div>
          )}
        </div>
      </div>
    </>
  );
};
