"use client";

// import React from 'react';
import { motion, type Variants } from 'framer-motion';

const features = [
  {
    icon: '🪷',
    title: 'Focus on Devotion',
    desc: 'Let your heart be with God. We handle every logistic so your spiritual journey stays uninterrupted.',
  },
  {
    icon: '✨',
    title: 'Complete Packages',
    desc: 'Travel, stay, and all arrangements — every detail of your pilgrimage thoughtfully covered.',
  },
  {
    icon: '🙏',
    title: 'Surrender Your Worries',
    desc: 'Just surrender. We ensure a peaceful, worry-free, and deeply spiritual yatra experience.',
  },
  {
    icon: '🏛️',
    title: 'Seamless Journeys',
    desc: 'Meticulously planned travel to the holiest destinations across India, guided by expertise and reverence.',
  },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } },
};

const FeatureHighlights = () => {
  return (
    <section>
      <div className="sy-container">
        <motion.p
          className="sy-section-label"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          What We Offer
        </motion.p>
        <motion.h2
          className="sy-section-title"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, delay: 0.08 }}
        >
          Everything for your <span className="sy-text-gradient-orange">sacred journey</span>
        </motion.h2>

        <motion.div
          className="sy-features-grid"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
        >
          {features.map((feat, idx) => (
            <motion.div key={idx} className="sy-feature-card" variants={cardVariants}>
              <div className="sy-feature-icon-wrap">{feat.icon}</div>
              <h3 className="sy-feature-title">{feat.title}</h3>
              <p className="sy-feature-desc">{feat.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default FeatureHighlights;
