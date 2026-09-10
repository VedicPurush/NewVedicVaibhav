"use client";

import { motion } from 'framer-motion';

const destinations = [
  {
    name: 'Char Dham',
    image: 'https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/sanatan%20yatra/chardham-optimized.webp',
    tag: 'Sacred Quad'
  },
  {
    name: 'Varanasi',
    image: 'https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/sanatan%20yatra/varanasi-optimized.webp',
    tag: 'Eternal City'
  },
  {
    name: 'Ayodhya',
    image: 'https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/sanatan%20yatra/ayodhya-optimized.webp',
    tag: 'Janmabhoomi'
  },
  {
    name: 'Puri',
    image: 'https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/sanatan%20yatra/puri-optimized.webp',
    tag: 'Jagannath Dham'
  }
];

const PopularDestinations = () => {
  return (
    <section className="sy-destinations-section">
      <div className="sy-container">
        <div className="sy-section-header">
          <h2 className="sy-section-title">Popular Destinations</h2>
          <p className="sy-section-subtitle">Sacred locations that define our spiritual heritage</p>
        </div>

        <div className="sy-destinations-grid">
          {destinations.map((dest, index) => (
            <motion.div
              key={index}
              className="sy-destination-card"
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15 }}
            >
              <div className="sy-dest-image-wrapper">
                <img loading="lazy"  src={dest.image} alt={dest.name} className="sy-dest-image"  />
                <div className="sy-dest-overlay">
                  <span className="sy-dest-tag">{dest.tag}</span>
                  <h3 className="sy-dest-name">{dest.name}</h3>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PopularDestinations;
