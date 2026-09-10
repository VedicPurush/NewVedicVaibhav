"use client";

import { Col, Row, Select } from "antd";
import Layout from "@/components/layout/Layout";
import { useEffect, useState } from "react";
import Share from '@mui/icons-material/Share';
import useMediaQuery from '@mui/material/useMediaQuery';
import { api } from "@/lib/api";

const Suvichar = () => {
  return (
    <div>
      <Layout content={<ChalisaContent />} activeIndex="explore" />
    </div>
  );
};

export default Suvichar;

const ChalisaContent = () => {
  const [quotes, setQuotes] = useState<
    Array<{ descriptionEnglish: string; descriptionHindi: string }>
  >([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const isSmallScreen = useMediaQuery("(max-width:600px)");
  const [language, setLanguage] = useState<"english" | "hindi">("english");

  useEffect(() => {
    api
      .get("/fetch-daily-quotes")
      .then((response) => {
        setQuotes(response.data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching daily quotes:", error);
        setError("Failed to fetch quotes");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <p>Loading...</p>;
  }

  if (error) {
    return <p>Error: {error}</p>;
  }

  if (quotes.length === 0) {
    return <p>No quotes available</p>;
  }

  return (
    <div>
      <Col lg={24} xl={24} md={24} xs={0} sm={0}>
        <img loading="lazy"
          style={{ paddingInline: "6%" }}
          src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/AartiSection/suvicharbanner%20(2).jpg"
          alt="Aarti Banner"
        />
      </Col>

      <Col lg={0} xl={0} md={0} xs={24} sm={24}>
        <img loading="lazy"
          style={{ paddingInline: "3%", borderRadius: "20px" }}
          src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/AartiSection/suvicharbannermob%20(1).jpg"
          alt="Aarti Banner"
        />
      </Col>

      <Select
        defaultValue="english"
        style={{
          width: 100,
          borderRadius: "20px",
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
          backgroundColor: "white", // This won't apply directly
          marginLeft: isSmallScreen ? "3%" : "6%",
          marginTop: isSmallScreen ? "2%" : "1%",
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

      <Row
        style={{
          paddingInline: isSmallScreen ? "2.1%" : "5.1%",
          paddingTop: isSmallScreen ? "2%" : "0%",
        }}
      >
        {quotes.map((quote, index) => (
          <Col
            style={{ padding: "1%" }}
            key={index}
            lg={8}
            xl={8}
            md={12}
            xs={24}
            sm={24}
          >
            <div
              style={{
                paddingBlock: "4%",
                paddingInline: "3%",
                backgroundColor: "#D8A160",
                borderRadius: "12px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: "5%",
                  color: "#FF6505",
                  padding: "2%",
                  height: "22px",
                  fontSize: "12px",
                  width: "22px",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  borderRadius: "50px",
                  backgroundColor: "white",
                  right: "5%",
                }}
              >
                <Share style={{ fontSize: "18px" }} />
              </div>
              <img loading="lazy"
                src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/AartiSection/quoteup.svg"
                alt="Quote Up"
              />
              {language === "english" ? (
                <div
                  style={{ marginBlock: "2%", color: "white" }}
                  dangerouslySetInnerHTML={{ __html: quote.descriptionEnglish }}
                ></div>
              ) : (
                <div
                  style={{ marginBlock: "2%", color: "white" }}
                  dangerouslySetInnerHTML={{ __html: quote.descriptionHindi }}
                ></div>
              )}
              <img loading="lazy"
                src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/AartiSection/quotedown.svg"
                alt="Quote Down"
              />
            </div>
          </Col>
        ))}
      </Row>
    </div>
  );
};
