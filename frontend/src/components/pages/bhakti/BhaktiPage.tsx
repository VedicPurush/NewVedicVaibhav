"use client";

// GodsList.tsx
import React, { useEffect, useState } from "react";
import { Card, Spin, Row, Col } from "antd";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import Layout from "@/components/layout/Layout";
import Sidebar from "./Sidebar";
import {
  AncientTexts,
  Audio,
  PuranItems,
  Upapuranas,
  Vedas,
} from "./vedicgyanData";
import { api } from "@/lib/api";
// Import vedicgyan data arrays and structures

const MotionRow = motion.create(Row);
const MotionCol = motion.create(Col);
const MotionCard = motion.create(Card);

const containerVariants: Variants = {
  hidden: { opacity: 0, scale: 0.98 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { staggerChildren: 0.1, when: "beforeChildren" },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 120, damping: 20 },
  },
};

interface Chalisa {
  name: string;
  text: string;
}
interface Mantra {
  mantraName: string;
  mantra: string;
  explanation: string;
  recording: string;
}
interface Aarti {
  name: string;
  text: string;
}
interface Ashtakam {
  name: string;
  text: string;
}
interface Music {
  title: string;
  fileUrl: string;
}

interface God {
  _id: string;
  godName: string;
  godImage: string;
  chalisa: Chalisa[];
  mantra: Mantra[];
  aarti: Aarti[];
  ashtakam: Ashtakam[];
  music: Music[];
}

const categoriesList = [
  { key: "Bhakti", slug: "bhakti" },
  { key: "Puran", slug: "puran" },
  { key: "Upapuranas", slug: "upapuranas" },
  { key: "Vedas", slug: "vedas" },
  { key: "Sacred Audio MP3 Collection", slug: "sacred-audio-mp3-collection" },
  {
    key: "Sacred Scriptures and Ancient Texts",
    slug: "sacred-scriptures-and-ancient-texts",
  },
];

// --- Vedicgyan categoriesData ---
const categoriesData: { [key: string]: Array<any> } = {
  Puran: PuranItems,
  Vedas: Vedas,
  Upapuranas: Upapuranas,
  "Sacred Audio MP3 Collection": Audio,
  "Sacred Scriptures and Ancient Texts": AncientTexts,
};
const allItems = Object.values(categoriesData).flat();

const GodsList: React.FC = () => {
  const [gods, setGods] = useState<God[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();

  useEffect(() => {
    const fetchGods = async () => {
      setLoading(true);
      try {
        const { data } = await api.get<{ gods: God[] }>("/fetch-all-gods");
        setGods(data.gods);
      } catch (err) {
        console.error("Error fetching gods:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchGods();
  }, []);

  const handleCategoryChange = (slug: string) => {
    setSearchTerm("");
    router.push(`/vedic-pathshala/${slug}`);
  };

  // Search filtering
  const filteredGods = searchTerm
    ? gods.filter((god) =>
      god.godName.toLowerCase().includes(searchTerm.toLowerCase())
    )
    : gods;
  const filteredVedicItems = searchTerm
    ? allItems.filter(
      (item) =>
        item.title &&
        item.title.toLowerCase().includes(searchTerm.toLowerCase())
    )
    : [];

  const renderGodCard = (god: God) => (
    <MotionCol
      key={god._id}
      xs={12}
      sm={8}
      md={6}
      lg={4}
      style={{ display: "flex", justifyContent: "center" }}
      variants={itemVariants}
    >
      <MotionCard
        hoverable
        onClick={() => router.push(`/vedic-pathshala/bhakti/${god._id}`)}
        style={{
          width: "100%",
          maxWidth: "150px",
          borderRadius: "12px",
          overflow: "hidden",
          textAlign: "center",
          boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
          background: "#fff8ef",
          cursor: "pointer",
        }}
        variants={itemVariants}
        whileHover={{ scale: 1.05, boxShadow: "0 8px 16px rgba(0,0,0,0.2)" }}
        whileTap={{ scale: 0.95 }}
        cover={
          <motion.img
            alt={god.godName}
            src={god.godImage}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            style={{
              height: "120px",
              width: "100%",
              objectFit: "cover",
              borderRadius: "15px",
              backgroundColor: "#fff",
            }}
          />
        }
      >
        <div
          className="-my-3 "
          style={{
            fontWeight: "bold",
            color: "#f57c00",
            fontSize: "14px",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {god.godName}
        </div>
      </MotionCard>
    </MotionCol>
  );

  const renderTextCard = (item: any) => (
    <MotionCol
      key={item.id || item.title}
      xs={12}
      sm={8}
      md={6}
      lg={4}
      style={{ display: "flex", justifyContent: "center" }}
      variants={itemVariants}
    >
      <div
        style={{ width: "100%", maxWidth: "150px", cursor: "pointer" }}
        onClick={() => router.push("/" + item.path)}
      >
        <MotionCard
          hoverable
          style={{
            width: "100%",
            maxWidth: "150px",
            borderRadius: "12px",
            overflow: "hidden",
            textAlign: "center",
            boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
            background: "#e3f2fd",
            cursor: "pointer",
            padding: 0,
          }}
          variants={itemVariants}
          whileHover={{ scale: 1.05, boxShadow: "0 8px 16px rgba(0,0,0,0.2)" }}
          whileTap={{ scale: 0.95 }}
          styles={{ body: { padding: "12px 8px 10px 8px" } }}
        >
          {item.image && (
            <img loading="lazy"
              src={item.image}
              alt={item.title}
              style={{
                height: "120px",
                width: "100%",
                objectFit: "cover",
                borderRadius: "15px 15px 0 0",
                backgroundColor: "#fff",
                marginBottom: "8px",
              }}
            />
          )}
          <div className="font-bold text-[12px] text-blue-700 text-start items-start line-clamp-2">
            {item.title}
          </div>
        </MotionCard>
      </div>
    </MotionCol>
  );

  const pageContent = (
    <>
      {loading ? (
        <Spin size="large" style={{ display: "block", margin: "100px auto" }} />
      ) : searchTerm ? (
        <div>
          {/* Gods Section */}
          <div
            style={{
              marginBottom: 16,
              marginLeft: 8,
              fontWeight: 600,
              fontSize: 18,
              color: "#f57c00",
            }}
          >
            Gods
          </div>
          <MotionRow
            gutter={[24, 24]}
            justify="center"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            style={{ marginBottom: 32 }}
          >
            {filteredGods.length > 0 ? (
              filteredGods.map(renderGodCard)
            ) : (
              <Col
                span={24}
                style={{ textAlign: "center", color: "#999", marginTop: 20 }}
              >
                No gods found
              </Col>
            )}
          </MotionRow>
          {/* Texts Section */}
          <div
            style={{
              marginBottom: 16,
              marginLeft: 8,
              fontWeight: 600,
              fontSize: 18,
              color: "#1976d2",
            }}
          >
            Texts
          </div>
          <MotionRow
            gutter={[24, 24]}
            justify="center"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {filteredVedicItems.length > 0 ? (
              filteredVedicItems.map(renderTextCard)
            ) : (
              <Col
                span={24}
                style={{ textAlign: "center", color: "#999", marginTop: 20 }}
              >
                No texts found
              </Col>
            )}
          </MotionRow>
        </div>
      ) : (
        <MotionRow
          gutter={[24, 24]}
          justify="center"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {filteredGods.map(renderGodCard)}
        </MotionRow>
      )}
    </>
  );

  return (
    <Layout
      content={
        <div className="flex flex-col overflow-hidden md:flex-row min-h-screen">
          <Sidebar
            categoriesList={categoriesList}
            selectedSlug={"bhakti"}
            handleCategoryChange={handleCategoryChange}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
          />
          <div className="flex-1 mt-5  ">{pageContent}</div>
        </div>
      }
    />
  );
};

export default GodsList;
