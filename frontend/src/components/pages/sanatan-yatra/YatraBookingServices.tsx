"use client";

import { motion } from 'framer-motion';
import TempleHindu from '@mui/icons-material/TempleHindu';
import WorkspacePremium from '@mui/icons-material/WorkspacePremium';
import AutoMode from '@mui/icons-material/AutoMode';
import MenuBook from '@mui/icons-material/MenuBook';
import Diversity3 from '@mui/icons-material/Diversity3';
import LocationCity from '@mui/icons-material/LocationCity';

const services = [
  {
    icon: <TempleHindu />,
    title: 'Standard Pilgrimage',
    description: 'Reliable and comfortable group tours with guided darshans and verified accommodations.',
    color: '#FF7D00'
  },
  {
    icon: <WorkspacePremium />,
    title: 'Premium Divine Tours',
    description: 'Elite spiritual experiences with luxury stays, priority darshans, and private transport.',
    color: '#D4AF37'
  },
  {
    icon: <AutoMode />,
    title: 'Customized Journeys',
    description: 'Tailor-made itineraries designed around your personal spiritual goals and timeline.',
    color: '#4B0082'
  },
  {
    icon: <MenuBook />,
    title: 'Vedic Heritage Tours',
    description: 'Explore the historical and archaeological depth of our sacred sites with expert scholars.',
    color: '#8B4513'
  },
  {
    icon: <LocationCity />,
    title: 'Cultural Immersion',
    description: 'Deep dive into local traditions, classical arts, and authentic spiritual life of holy cities.',
    color: '#2E8B57'
  },
  {
    icon: <Diversity3 />,
    title: 'Family Spiritual Holiday',
    description: 'Specially curated journeys for all ages, blending devotion with Comfort and education.',
    color: '#DC143C'
  }
];

const YatraBookingServices = () => {
  return (
    <section id="services" className="sy-services-section">
      <div className="sy-container">
        <div className="sy-section-header">
          <h2 className="sy-section-title">Divine Services</h2>
          <p className="sy-section-subtitle">Choose the perfect path for your spiritual journey</p>
        </div>

        <div className="sy-services-grid">
          {services.map((service, index) => (
            <motion.div
              key={index}
              className="sy-service-card"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="sy-card-icon" style={{ color: service.color }}>
                {service.icon}
              </div>
              <h3 className="sy-card-title">{service.title}</h3>
              <p className="sy-card-desc">{service.description}</p>
              {/* <button className="sy-card-btn">Explore Service</button> */}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default YatraBookingServices;
