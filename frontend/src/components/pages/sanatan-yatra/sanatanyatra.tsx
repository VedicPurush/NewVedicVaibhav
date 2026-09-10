"use client";

import Layout from '@/components/layout/Layout';
import HeroContent from './HeroContent';
import FeatureHighlights from './FeatureHighlights';
import YatraBookingServices from './YatraBookingServices';
import PopularDestinations from './PopularDestinations';
import WhyChooseUs from './WhyChooseUs';
import './SanatanStyles.css';

const SanatanYatra = () => {
  return (
    <Layout
      activeIndex="sanatan-yatra"
      content={
        <div className="sy-modern-page">
          {/* Animated Background Canvas */}
          <div className="sy-bg-canvas">
            <div className="sy-bg-glow" />
            <div className="sy-mandala-watermark" />
          </div>

          {/* Scrolling Content Block */}
          <div className="sy-content-wrapper">
            <HeroContent />
            <YatraBookingServices />
            <PopularDestinations />
            <FeatureHighlights />
            <WhyChooseUs />

            {/* Launch Status Footer */}
            <div className="sy-launch-footer">
              <div className="sy-status-badge-modern">
                <span>Started: 1 Aug 2025</span>
                <span className="sy-status-divider" />
                <span>Public Opening Soon</span>
              </div>
            </div>
          </div>
        </div>
      }
    />
  );
};

export default SanatanYatra;
