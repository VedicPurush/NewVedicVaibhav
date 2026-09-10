"use client";

import { useEffect, useState } from "react";
import Layout from "@/components/layout/Layout";
import { Col, Row, Select } from "antd";
import { useRouter } from "next/navigation";
import ArrowForwardIos from '@mui/icons-material/ArrowForwardIos';
import Search from '@mui/icons-material/Search';
import Input from '@mui/material/Input';
import useMediaQuery from '@mui/material/useMediaQuery';
import { api } from "@/lib/api";

interface AartiData {
  id: string;
  nameEnglish: string;
  descriptionEnglish: string;
  aartiImage: string;
  _id: string;
  nameHindi: string;
}

const Aarti = () => {
  return (
    <div>
      <Layout content={<AartiContent />} activeIndex="explore" />
    </div>
  );
};

export default Aarti;

const AartiContent = () => {
  const [aartiData, setAartiData] = useState<AartiData[]>([]);
  const isSmallScreen = useMediaQuery("(max-width:600px)");
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredAarti, setFilteredAarti] = useState<AartiData[]>([]);
  const [language, setLanguage] = useState<"english" | "hindi">("english");

  useEffect(() => {
    api
      .get("/fetch-library-data")
      .then((response) => {
        const filteredData = response.data.filter(
          (item: AartiData) => item.id === "aarti"
        );
        setAartiData(filteredData);
        setFilteredAarti(filteredData);
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
      });
  }, []);

  useEffect(() => {
    const results = aartiData.filter((aarti) =>
      (language === "english"
        ? aarti.nameEnglish.toLowerCase()
        : aarti.nameHindi.toLowerCase()
      ).includes(searchQuery.toLowerCase())
    );
    setFilteredAarti(results);
  }, [searchQuery, aartiData, language]);

  const router = useRouter();

  return (
    <div
      style={{
        backgroundColor: "#FFF9F3",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Col
        style={{ paddingInline: isSmallScreen ? "3%" : "6%" }}
        lg={24}
        xl={24}
        md={24}
        xs={0}
        sm={0}
      >
        <img loading="lazy"
          style={{ borderRadius: "20px" }}
          src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/AartiSection/aartibanner.webp"
          alt="Aarti Banner"
        />
      </Col>
      <Col
        style={{ paddingInline: isSmallScreen ? "3%" : "6%" }}
        lg={0}
        xl={0}
        md={0}
        xs={24}
        sm={24}
      >
        <img loading="lazy"
          style={{ borderRadius: "12px" }}
          src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/AartiSection/aartibannermob.webp"
          alt="Aarti Banner"
        />
      </Col>

      <div
        style={{
          display: "flex",
          marginTop: isSmallScreen ? "5%" : "2%",
          marginInline: isSmallScreen ? "3%" : "6%",
          justifyContent: "start",
          alignItems: "center",
          gap: isSmallScreen ? "3%" : "1%",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#EFE6E6",
            borderRadius: "30px",
            paddingLeft: "1%",
            maxWidth: "400px",
            width: "100%",
            minWidth: isSmallScreen ? "250px" : "400px",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
          }}
        >
          <img loading="lazy"
            src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/AartiSection/noto_diya-lamp.svg"
            alt="Aarti Icon"
          />
          <Input
            disableUnderline
            placeholder={
              language === "english" ? "Search aarti by name" : "आरती खोजें"
            }
            value={searchQuery}
            onChange={(e: any) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              fontSize: "16px",
              color: "#666",
              paddingTop: "1.7%",
              paddingLeft: "0.5%",
            }}
          />
          <div
            style={{
              backgroundColor: "#FF6600",
              padding: "8px",
              borderRadius: "50%",
              cursor: "pointer",
            }}
          >
            <Search style={{ color: "white" }} />
          </div>
        </div>

        <Select
          defaultValue="english"
          style={{
            width: 100,
            borderRadius: "20px",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
            backgroundColor: "#EFE6E6", // This won't apply directly
          }}
          dropdownStyle={{
            backgroundColor: "#EFE6E6", // Apply background color to the dropdown menu
          }}
          onChange={(value) => setLanguage(value as "english" | "hindi")}
          options={[
            { value: "english", label: "English" },
            { value: "hindi", label: "Hindi" },
          ]}
          variant="borderless"
        />
      </div>

      <Row
        style={{
          marginBlock: isSmallScreen ? "5%" : "2%",
          paddingInline: isSmallScreen ? "3%" : "5.6%",
        }}
      >
        {filteredAarti.length > 0 ? (
          filteredAarti.map((aarti) => (
            <Col
              key={aarti._id}
              style={{
                padding: isSmallScreen ? "0%" : "0.5%",
                marginBottom: isSmallScreen ? "2%" : "0%",
              }}
              lg={8}
              xl={8}
              md={12}
              xs={24}
              sm={24}
            >
              <div
                onClick={() => router.push(`/aarti/${aarti._id}`)}
                style={{
                  cursor: "pointer",
                  padding: "1%",
                  display: "flex",
                  borderRadius: "12px",
                  paddingRight: "1%",
                  backgroundColor: "#EE9641",
                  alignItems: "start",
                  gap: "10px",
                  marginBottom: "1%",
                }}
              >
                <img loading="lazy"
                  src={aarti.aartiImage}
                  alt={aarti.nameEnglish}
                  style={{
                    width: isSmallScreen ? "55%" : "45%",
                    height: "130px",
                    borderRadius: "10px",
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    width: "100%",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "1%",
                      width: "100%",
                    }}
                  >
                    <img loading="lazy"
                      style={{ height: "30px", width: "30px" }}
                      src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/AartiSection/vvcircle.svg"
                    ></img>
                    <div
                      style={{
                        fontWeight: "400",
                        fontFamily: "Open Sans",
                        fontSize: "12px",
                        color: "white",
                        marginLeft: "1%",
                      }}
                    >
                      {language === "english" ? "Vedic Vaibhav" : "वेदिक वैभव"}
                    </div>
                  </div>

                  <div
                    style={{
                      fontSize: "18px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontWeight: "500",
                      fontFamily: "Poppins",
                      marginTop: "11%",
                      color: "white",
                    }}
                  >
                    {language === "english"
                      ? aarti.nameEnglish
                      : aarti.nameHindi}
                    <ArrowForwardIos
                      style={{
                        padding: "1%",
                        borderRadius: "50px",
                        backgroundColor: "rgba(255,255,255,0.3)",
                      }}
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    color: "white",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                ></div>
              </div>
            </Col>
          ))
        ) : (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              marginBlock: "3%",
              color: "#999",
            }}
          >
            No results found
          </div>
        )}
      </Row>
    </div>
  );
};
