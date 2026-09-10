"use client";

import { motion } from "framer-motion";

const AudioPlayer = ({ url, title }: { url: string; title?: string }) => {
  const isZip = url.endsWith(".zip");

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex items-center justify-center min-h-screen bg-gradient-to-br from-yellow-100 via-white to-green-100 px-4"
    >
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-6 text-center space-y-6">
        <motion.h2
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="text-2xl font-bold text-gray-800"
        >
          {title || "Audio Player"}
        </motion.h2>

        {!isZip ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <audio controls className="w-full rounded-md">
              <source src={url} type="audio/mpeg" />
              Your browser does not support the audio element.
            </audio>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <a
              href={url}
              download
              className="inline-block px-6 py-3 bg-gradient-to-r from-green-500 to-green-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg hover:from-green-600 hover:to-green-800 transition-all duration-300"
            >
              Download ZIP File
            </a>
          </motion.div>
        )}

        <p className="text-sm text-gray-500">
          {isZip
            ? "Click the button above to download the ZIP file to your device."
            : "Use the audio controls above to listen. Works best on headphones!"}
        </p>
      </div>
    </motion.div>
  );
};

export default AudioPlayer;
