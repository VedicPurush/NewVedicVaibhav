"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Layout from "@/components/layout/Layout";
import { motion } from "framer-motion";
import Sidebar from "@/components/pages/bhakti/Sidebar";
import { api } from "@/lib/api";
import {
  Vedas,
  PuranItems,
  Upapuranas,
  Audio,
  AncientTexts,
  SanatanYatra,
} from "@/components/pages/bhakti/vedicgyanData";

interface God {
  _id: string;
  godName: string;
  godImage: string;
}

interface PuranItem {
  title: string;
  path: string;
  image: string;
}

const categoriesList = [
  { key: "Bhakti", slug: "bhakti" },
  { key: "Puran", slug: "puran" },
  { key: "Upapuranas", slug: "upapuranas" },
  { key: "Vedas", slug: "vedas" },
  { key: "Sanatan Yatra", slug: "sanatan-yatra" },
  { key: "Sacred Audio MP3 Collection", slug: "sacred-audio-mp3-collection" },
  {
    key: "Sacred Scriptures and Ancient Texts",
    slug: "sacred-scriptures-and-ancient-texts",
  },
];

const VedicGyanContent: React.FC = () => {
  // Optimized data structure for categories.
  const categoriesData: Record<string, PuranItem[]> = {
    Puran: PuranItems,
    Upapuranas: Upapuranas,
    Vedas: Vedas,
    "Sanatan Yatra": SanatanYatra,
    "Sacred Audio MP3 Collection": Audio,
    "Sacred Scriptures and Ancient Texts": AncientTexts,
  };

  // Default to the first filter category.
  const defaultSlug = categoriesList[0].slug;

  const params = useParams();
  const category = params?.category as string | undefined;
  const router = useRouter();

  // Derive which category key to use
  const selectedSlug = category || defaultSlug;
  const selectedCategoryKey =
    categoriesList.find((c) => c.slug === selectedSlug)?.key ||
    categoriesList[0].key;

  // Sync URL → state on mount
  useEffect(() => {
    if (!category) {
      router.replace(`/vedic-pathshala/${defaultSlug}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, router]);

  const [searchTerm, setSearchTerm] = useState("");
  const [gods, setGods] = useState<God[]>([]);

  // fetch gods on mount
  useEffect(() => {
    api
      .get("/fetch-all-gods")
      .then(({ data }) => setGods(data.gods || []))
      .catch(() => setGods([]));
  }, []);

  // all items for search
  const allItems = Object.values(categoriesData).flat();
  const filteredGods = searchTerm
    ? gods.filter((god) =>
      god.godName.toLowerCase().includes(searchTerm.toLowerCase())
    )
    : [];
  const filteredItems = searchTerm
    ? allItems.filter((item) =>
      item.title.toLowerCase().includes(searchTerm.toLowerCase())
    )
    : categoriesData[selectedCategoryKey];

  // when user picks a new category filter
  const handleCategoryChange = (slug: string) => {
    setSearchTerm("");
    router.push(`/vedic-pathshala/${slug}`);
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      {/* Sidebar (desktop+mobile header) */}
      <Sidebar
        categoriesList={categoriesList}
        selectedSlug={selectedSlug}
        handleCategoryChange={handleCategoryChange}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
      />

      {/* Main content */}
      <main className="flex-1 p-4">
        {searchTerm ? (
          <>
            <h2 className="text-xl font-semibold mb-2">Gods</h2>
            {filteredGods.length === 0 && (
              <div className="mb-6 text-gray-500">No gods found.</div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-8">
              {filteredGods.map((god) => (
                <div
                  key={god._id}
                  className="block cursor-pointer"
                  onClick={() => router.push(`/vedic-pathshala/bhakti/${god._id}`)}
                >
                  <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                    whileHover={{ scale: 1.05 }}
                    className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col cursor-pointer"
                  >
                    <img loading="lazy"
                      src={god.godImage}
                      alt={god.godName}
                      className="h-48 w-full object-cover"
                    />
                    <div className="p-3 text-center font-semibold">
                      {god.godName}
                    </div>
                  </motion.div>
                </div>
              ))}
            </div>
            <h2 className="text-xl font-semibold mb-2">Texts</h2>
            {filteredItems.length === 0 && (
              <div className="mb-6 text-gray-500">No texts found.</div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {filteredItems.map((item, idx) => (
                <Link href={`/${item.path}`} key={idx} className="block">
                  <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                    whileHover={{ scale: 1.05 }}
                    className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col cursor-pointer"
                  >
                    <img loading="lazy"
                      src={item.image}
                      alt={item.title}
                      className="h-48 w-full object-cover"
                    />
                    <div className="p-3 text-center font-semibold">
                      {item.title}
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          </>
        ) : (
          <>
            <h1 className="text-3xl mb-4">{selectedCategoryKey}</h1>
            {filteredItems.length === 0 ? (
              <div className="text-center text-gray-600 mt-4">
                No result found
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {filteredItems.map((item, idx) => (
                  <Link href={`/${item.path}`} key={idx} className="block">
                    <motion.div
                      initial={{ opacity: 0, y: 50 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.1 }}
                      whileHover={{ scale: 1.05 }}
                      className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col cursor-pointer"
                    >
                      <img loading="lazy"
                        src={item.image}
                        alt={item.title}
                        className="h-48 w-full object-cover"
                      />
                      <div className="p-3 flex flex-row items-center justify-between flex-grow">
                        <h2 className="text-base w-full line-clamp-2 md:w-[70%] font-semibold">
                          {item.title}
                        </h2>
                        <span className="hidden md:block text-center px-8 py-2 bg-green-500 text-white rounded-lg hover:text-green-500 hover:bg-white hover:border-green-400 hover:border transition-colors duration-300">
                          View
                        </span>
                      </div>
                    </motion.div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

const VedicGyan: React.FC = () => {
  return <Layout content={<VedicGyanContent />} activeIndex="vedic-gyan" />;
};

export default VedicGyan;
