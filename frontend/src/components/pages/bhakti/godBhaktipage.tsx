"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Tabs,
  Spin,
  Image,
  Row,
  Col,
  Card,
  Modal,
  Typography,
  Button,
} from "antd";
import parse from "html-react-parser";
import { ReloadOutlined } from "@ant-design/icons";
import Pause from '@mui/icons-material/Pause';
import PlayArrow from '@mui/icons-material/PlayArrow';
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import Layout from "@/components/layout/Layout";
import Sidebar from "./Sidebar";
import { api } from "@/lib/api";

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

const MotionDiv = motion.div;
const MotionRow = motion.create(Row);
const MotionCol = motion.create(Col);
const MotionCard = motion.create(Card);

const containerVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { when: "beforeChildren", staggerChildren: 0.1 },
  },
};
const headerVariants: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};
const itemVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring", stiffness: 120, damping: 20 },
  },
};

interface Chalisa {
  _id: string;
  name: string;
  text: string;
}
interface Mantra {
  _id: string;
  mantraName: string;
  mantra: string;
  explanation: string;
  recording: string;
}
interface Aarti {
  _id: string;
  name: string;
  text: string;
}
interface Ashtakam {
  _id: string;
  name: string;
  text: string;
}
interface Music {
  _id: string;
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

const GodDetails: React.FC = () => {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [god, setGod] = useState<God | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // modal / audio state
  const [selectedMantra, setSelectedMantra] = useState<Mantra | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const { Paragraph } = Typography;
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(
    null
  );
  const [playingId, setPlayingId] = useState<string | null>(null);

  // Sidebar state and navigation
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();
  const handleCategoryChange = (slug: string) => {
    setSearchTerm("");
    router.push(`/vedic-pathshala/${slug}`);
  };

  useEffect(() => {
    const fetchGod = async () => {
      setLoading(true);
      try {
        const response = await api.get<{ god: God }>(`/fetch-god/${id}`);
        setGod(response.data.god);
      } catch (error) {
        console.error("Error fetching god:", error);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchGod();
  }, [id]);

  const staticMantraImage =
    "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/Bhakti/mantra.png";

  const tabsWrapperStyle = {
    backgroundColor: "rgba(255,255,255,0.9)",
    border: "1px solid #ebe8e1",
    borderRadius: "18px",
    boxShadow: "0 12px 40px rgba(0,0,0,0.12)",
    padding: "24px",
    backdropFilter: "blur(6px)",
  };

  const handleMantraClick = (mantra: Mantra) => {
    setSelectedMantra(mantra);
    setIsModalVisible(true);
  };

  // Filter logic for god name using searchTerm (case-insensitive)
  let showGodDetails = true;
  if (god && searchTerm.trim() !== "") {
    showGodDetails = god.godName
      .toLowerCase()
      .includes(searchTerm.trim().toLowerCase());
  }

  // loading spinner or content, or "No result found" if filtered out
  const pageContent =
    loading || !god ? (
      <Spin size="large" style={{ display: "block", margin: "100px auto" }} />
    ) : !showGodDetails ? (
      <div
        style={{
          textAlign: "center",
          margin: "100px auto",
          fontSize: "1.2rem",
          color: "#888",
        }}
      >
        No result found
      </div>
    ) : (
      <div className="w-full px-2 md:px-8">
        <MotionDiv
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          style={{
            maxWidth: "900px",
            margin: "0 auto",
            padding: "30px 0px 60px",
            background: "rgba(255, 255, 255, 0.85)",
            borderRadius: "24px",

            backdropFilter: "blur(10px)",
            minHeight: "100vh",
            backgroundImage:
              "linear-gradient(135deg, #fff7e6 0%, #fffaf0 50%, #fff7e6 100%), url('https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/Bhakti/lotus-pattern.svg')",
            backgroundSize: "cover",
            backgroundAttachment: "fixed",
            backgroundBlendMode: "overlay",
          }}
        >
          <motion.div
            variants={headerVariants}
            style={{ textAlign: "center", marginBottom: "20px" }}
          >
            <Image
              src={god.godImage}
              alt={god.godName}
              width={150}
              style={{ borderRadius: "12px" }}
            />
            <h1 style={{ marginTop: "15px", color: "#333" }}>{god.godName}</h1>
          </motion.div>

          <div style={tabsWrapperStyle}>
            <Tabs
              defaultActiveKey="chalisa"
              centered
              tabBarGutter={40}
              tabBarStyle={{ fontWeight: "bold" }}
              items={[
                {
                  key: "chalisa",
                  label: <>📜 Chalisa</>,
                  children: god.chalisa.length ? (
                    god.chalisa.map((item) => (
                      <MotionDiv
                        key={item._id}
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        whileHover={{ scale: 1 }}
                        style={{ textAlign: "center", marginBottom: "30px" }}
                      >
                        <h2 style={{ color: "#f57c00", marginBottom: "15px" }}>
                          {item.name}
                        </h2>
                        <div
                          style={{
                            maxWidth: "500px",
                            margin: "0 auto",
                            fontSize: "16px",
                            color: "#555",
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {parse(item.text)}
                        </div>
                      </MotionDiv>
                    ))
                  ) : (
                    <p style={{ textAlign: "center" }}>No Chalisa available.</p>
                  ),
                },
                {
                  key: "mantra",
                  label: <>🕉️ Mantra</>,
                  children: (
                    <MotionRow
                      gutter={[16, 16]}
                      justify="center"
                      variants={containerVariants}
                      initial="hidden"
                      animate="visible"
                    >
                      {god.mantra.length ? (
                        god.mantra.map((item) => (
                          <MotionCol
                            key={item._id}
                            xs={12}
                            sm={8}
                            md={6}
                            style={{
                              display: "flex",
                              justifyContent: "center",
                            }}
                            variants={itemVariants}
                            whileHover={{ scale: 1.05 }}
                          >
                            <MotionCard
                              hoverable
                              onClick={() => handleMantraClick(item)}
                              variants={itemVariants}
                              whileHover={{
                                scale: 1.05,
                                boxShadow: "0 8px 16px rgba(0,0,0,0.2)",
                              }}
                              style={{
                                width: "120px",
                                textAlign: "center",
                                borderRadius: "10px",
                                overflow: "hidden",
                                background: "#fff8ef",
                                cursor: "pointer",
                              }}
                              cover={
                                <img loading="lazy"
                                  alt={item.mantraName}
                                  src={staticMantraImage}
                                  style={{
                                    height: "100px",
                                    objectFit: "contain",
                                    padding: "10px",
                                  }}
                                />
                              }
                            >
                              <div
                                style={{
                                  fontWeight: "bold",
                                  color: "#f57c00",
                                  fontSize: "12px",
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                {item.mantraName}
                              </div>
                            </MotionCard>
                          </MotionCol>
                        ))
                      ) : (
                        <p>No Mantras available.</p>
                      )}
                    </MotionRow>
                  ),
                },
                {
                  key: "aarti",
                  label: <>🔥 Aarti</>,
                  children: god.aarti.length ? (
                    god.aarti.map((item) => (
                      <MotionDiv
                        key={item._id}
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        whileHover={{ scale: 1.01 }}
                        style={{ textAlign: "center", marginBottom: "30px" }}
                      >
                        <h2 style={{ color: "#f57c00", marginBottom: "15px" }}>
                          {item.name}
                        </h2>
                        <div
                          style={{
                            maxWidth: "500px",
                            margin: "0 auto",
                            fontSize: "16px",
                            lineHeight: "2",
                            color: "#333",
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {parse(item.text)}
                        </div>
                      </MotionDiv>
                    ))
                  ) : (
                    <p style={{ textAlign: "center" }}>No Aarti available.</p>
                  ),
                },
                {
                  key: "ashtakam",
                  label: <>🕉️ Ashtakam</>,
                  children: god.ashtakam.length ? (
                    god.ashtakam.map((item) => (
                      <MotionDiv
                        key={item._id}
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        whileHover={{ scale: 1.01 }}
                        style={{ textAlign: "center", marginBottom: "30px" }}
                      >
                        <h2 style={{ color: "#f57c00", marginBottom: "15px" }}>
                          {item.name}
                        </h2>
                        <div
                          style={{
                            maxWidth: "500px",
                            margin: "0 auto",
                            fontSize: "16px",
                            lineHeight: "2",
                            color: "#333",
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {parse(item.text)}
                        </div>
                      </MotionDiv>
                    ))
                  ) : (
                    <p style={{ textAlign: "center" }}>
                      No Ashtakam available.
                    </p>
                  ),
                },
                {
                  key: "music",
                  label: <>🎶 Music</>,
                  children: god.music.length ? (
                    god.music.map((item) => {
                      const isPlaying = playingId === item._id;
                      const handlePlayPause = () => {
                        if (currentAudio && isPlaying) {
                          currentAudio.pause();
                          setPlayingId(null);
                        } else {
                          const audio = new Audio(`https://${item.fileUrl}`);
                          audio.play();
                          setCurrentAudio(audio);
                          setPlayingId(item._id);
                          audio.onended = () => setPlayingId(null);
                        }
                      };
                      return (
                        <MotionDiv
                          key={item._id}
                          variants={itemVariants}
                          initial="hidden"
                          animate="visible"
                          whileHover={{ scale: 1.02 }}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "10px 15px",
                            margin: "10px auto",
                            borderRadius: "10px",
                            background: isPlaying ? "#ffecdb" : "#fff",
                            maxWidth: "500px",
                            boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
                          }}
                        >
                          <div style={{ fontSize: "14px", fontWeight: 500 }}>
                            Aarti : {item.title}
                          </div>
                          <Button
                            shape="circle"
                            icon={isPlaying ? <Pause /> : <PlayArrow />}
                            onClick={handlePlayPause}
                            style={{
                              backgroundColor: "#f57c00",
                              borderColor: "#f57c00",
                              color: "#fff",
                            }}
                          />
                        </MotionDiv>
                      );
                    })
                  ) : (
                    <p style={{ textAlign: "center" }}>No Music available.</p>
                  ),
                },
              ]}
            />
          </div>

          <Modal
            open={isModalVisible}
            onCancel={() => setIsModalVisible(false)}
            footer={null}
            centered
            width={400}
          >
            {selectedMantra && (
              <motion.div
                variants={containerVariants}
                className="p-10"
                initial="hidden"
                animate="visible"
              >
                <div style={{ textAlign: "center", marginBottom: "10px" }}>
                  <h2 style={{ fontSize: "18px", color: "#f57c00" }}>
                    {selectedMantra.mantraName}
                  </h2>
                  <div style={{ fontSize: "16px", marginBottom: "10px" }}>
                    {selectedMantra.mantra}
                  </div>
                  <Paragraph
                    ellipsis={{
                      rows: 4,
                      expandable: true,
                      symbol: "Read more",
                    }}
                    style={{ color: "#555" }}
                  >
                    {parse(selectedMantra.explanation)}
                  </Paragraph>
                </div>

                <div style={{ textAlign: "center", marginTop: "20px" }}>
                  <audio
                    controls
                    loop={repeat}
                    style={{ width: "100%" }}
                    src={`https://${selectedMantra.recording}`}
                  />
                  <Button
                    icon={<ReloadOutlined />}
                    type={repeat ? "primary" : "default"}
                    onClick={() => setRepeat(!repeat)}
                    style={{ marginTop: "10px" }}
                  >
                    Repeat {repeat ? "ON" : "OFF"}
                  </Button>
                </div>
              </motion.div>
            )}
          </Modal>
        </MotionDiv>
      </div>
    );

  return (
    <Layout
      activeIndex="bhakti"
      content={
        <div className="flex flex-col md:flex-row min-h-screen">
          <Sidebar
            categoriesList={categoriesList}
            selectedSlug="bhakti"
            handleCategoryChange={handleCategoryChange}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
          />
          <div className="flex-1">{pageContent}</div>
        </div>
      }
    />
  );
};

export default GodDetails;
