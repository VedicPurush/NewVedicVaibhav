"use client";

import { motion } from 'framer-motion';
import VerifiedUser from '@mui/icons-material/VerifiedUser';
import LocationOn from '@mui/icons-material/LocationOn';
import SupportAgent from '@mui/icons-material/SupportAgent';
import LocalParking from '@mui/icons-material/LocalParking';

const features = [
  {
    icon: <VerifiedUser />,
    title: 'Verified Pandits',
    desc: 'Perform rituals with highly learned and verified Pandits at Every destination.'
  },
  {
    icon: <LocationOn />,
    title: 'Hidden Gems',
    desc: 'Discover secluded sacred spots rarely visited by common tourists.'
  },
  {
    icon: <SupportAgent />,
    title: '24/7 Spiritual Support',
    desc: 'Our divine guides are available round the clock for your assistance.'
  },
  {
    icon: <LocalParking />,
    title: 'Seamless Logistics',
    desc: 'From VIP darshan passes to comfortable transport, we handle everything.'
  }
];

const WhyChooseUs = () => {
  return (
    <section className="sy-why-us-section">
      <div className="sy-container">
        <div className="sy-section-header">
          <h2 className="sy-section-title">Why Travel With Us?</h2>
          <p className="sy-section-subtitle">A spiritual commitment to your path of devotion</p>
        </div>

        <div className="sy-features-v-grid">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              className="sy-v-feature-row"
              initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <div className="sy-v-feature-icon">{feature.icon}</div>
              <div className="sy-v-feature-content">
                <h3 className="sy-v-feature-title">{feature.title}</h3>
                <p className="sy-v-feature-desc">{feature.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyChooseUs;
