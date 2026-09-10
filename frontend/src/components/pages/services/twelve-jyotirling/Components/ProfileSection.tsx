"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, Modal } from "antd";
import { UserOutlined, LogoutOutlined, CloseOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import SubscriptionBookings from "./SubscriptionBookings";

interface ProfileModalProps {
  visible: boolean;
  onClose: () => void;
  initialTab?: 'profile' | 'bookings';
}

const ProfileModal: React.FC<ProfileModalProps> = ({ visible, onClose, initialTab = 'profile' }) => {
  const [userDetails, setUserDetails] = useState<any>(null);
  const [showBookings, setShowBookings] = useState(initialTab === 'bookings');
  const [logoutConfirmVisible, setLogoutConfirmVisible] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("userDetails");
    if (storedUser) {
      setUserDetails(JSON.parse(storedUser));
    }
    
    if (visible) {
      setShowBookings(initialTab === 'bookings');
    }
    
    const handleAuthChange = () => {
      const updatedUser = localStorage.getItem("userDetails");
      setUserDetails(updatedUser ? JSON.parse(updatedUser) : null);
    };

    window.addEventListener("user-details-changed", handleAuthChange);
    
    return () => {
      window.removeEventListener("user-details-changed", handleAuthChange);
    };
  }, [visible, initialTab]);

  // ── Lock body scroll on mobile when modal is open ────────────────
  useEffect(() => {
    if (!visible) return;

    const scrollY = window.scrollY;
    const body = document.body;

    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.overflow = 'hidden';

    return () => {
      body.style.position = '';
      body.style.top = '';
      body.style.left = '';
      body.style.right = '';
      body.style.overflow = '';
      window.scrollTo(0, scrollY);
    };
  }, [visible]);


  if (!userDetails) return null;

  const user = userDetails.user;

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={null}
      destroyOnClose
      closeIcon={<CloseOutlined style={{ color: '#ea580c', fontSize: '20px' }} />}
      width={1000}
      centered
      styles={{
        mask: { backdropFilter: 'blur(6px)' },
        wrapper: { overflow: 'hidden' },
      }}
      modalRender={(modal) => (
        <div
          className="relative overflow-hidden shadow-2xl"
          style={{ backgroundColor: '#fffaf0', borderRadius: '16px', border: '1px solid rgba(234,88,12,0.2)' }}
        >
          <div
            className="custom-scroll p-4 md:p-6 pb-20"
            style={{
              maxHeight: '90vh',
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
              overscrollBehavior: 'contain',
              touchAction: 'pan-y',
            }}
            onTouchMove={(e) => e.stopPropagation()}
          >
            {modal}
          </div>
        </div>
      )}
    >

      <div className="text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Main Info Card */}
          <div
            className="flex flex-col items-center p-8 md:p-12 relative rounded-2xl overflow-hidden"
            style={{
              backgroundColor: '#fff7ed',
              border: '1.5px solid rgba(234,88,12,0.2)',
            }}
          >
             
             {/* Avatar Section */}
             <div className="relative mb-6">
                {/* Orange Glow Ring */}
                <div
                  className="absolute inset-0 rounded-full scale-105"
                  style={{
                    boxShadow: '0 0 25px rgba(234,88,12,0.5), inset 0 0 10px rgba(234,88,12,0.3)',
                    border: '2px solid rgba(234,88,12,0.4)',
                  }}
                />
                
                <Avatar 
                  src={user?.picture || "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/personicon.png"} 
                  icon={<UserOutlined />} 
                  size={window.innerWidth < 768 ? 96 : 110} 
                  className="relative z-10"
                  style={{ backgroundColor: '#ffedd5', border: '3px solid #ea580c' }}
                />
             </div>

             {/* Info Section */}
             <div className="w-full">
                <span
                  className="text-[10px] md:text-[11px] uppercase tracking-[0.4em] font-bold mb-3 block"
                  style={{ fontFamily: "'Montserrat', sans-serif", color: '#ea580c' }}
                >
                  Spiritual Profile
                </span>
                
                <h2
                  className="text-2xl md:text-3xl mb-4 uppercase"
                  style={{ fontFamily: "'Cinzel', serif", color: '#c2410c', letterSpacing: '0.05em' }}
                >
                  {user?.given_name} {user?.family_name || ''}
                </h2>
                
                <div
                  className="flex flex-col gap-2 text-[10px] md:text-[11px] font-bold tracking-widest uppercase mb-10"
                  style={{ fontFamily: "'Montserrat', sans-serif" }}
                >
                  <span className="flex items-center justify-center gap-2">
                    <span style={{ color: '#ea580c' }}>Email:</span>{' '}
                    <span style={{ color: '#431407' }}>{user?.email || 'N/A'}</span>
                  </span>
                  <span className="flex items-center justify-center gap-2">
                    <span style={{ color: '#ea580c' }}>Phone:</span>{' '}
                    <span style={{ color: '#431407' }}>{user?.phone || 'N/A'}</span>
                  </span>
                </div>
                
                {/* Actions */}
                <div className="flex flex-col items-center gap-4 w-full">
                  <button
                    onClick={() => setShowBookings(!showBookings)}
                    className="w-[200px] py-4 rounded-xl font-bold tracking-widest text-[11px] uppercase transition-all hover:scale-105 shadow-lg"
                    style={{
                      background: "linear-gradient(135deg, #fef08a, #f97316, #ea580c)",
                      color: "#431407",
                      fontFamily: "'Montserrat', sans-serif",
                      border: 'none',
                      boxShadow: '0 4px 16px rgba(234,88,12,0.35)',
                    }}
                  >
                    {showBookings ? "BACK TO PROFILE" : "VIEW MY BOOKINGS"}
                  </button>
                  
                  <button
                    onClick={() => setLogoutConfirmVisible(true)}
                    className="w-[140px] py-2.5 rounded-xl text-[10px] font-bold tracking-widest uppercase transition-colors flex items-center justify-center gap-2"
                    style={{
                      fontFamily: "'Montserrat', sans-serif",
                      color: '#c2410c',
                      backgroundColor: 'rgba(234,88,12,0.08)',
                      border: '1px solid rgba(234,88,12,0.2)',
                    }}
                  >
                    <LogoutOutlined style={{ fontSize: '12px' }} /> LOGOUT
                  </button>
                </div>
             </div>
          </div>

          <AnimatePresence mode="wait">
            {showBookings ? (
              <motion.div
                key="bookings"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
              >
                <div
                  className="relative text-left mt-4 rounded-2xl"
                  style={{
                    backgroundColor: '#fff7ed',
                    padding: '20px',
                    border: '1px solid rgba(234,88,12,0.15)',
                  }}
                >
                   <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 pt-2 gap-4 border-b pb-4" style={{ borderColor: 'rgba(234,88,12,0.15)' }}>
                      <h3
                        className="text-xl md:text-2xl"
                        style={{ fontFamily: "'Cinzel', serif", color: '#c2410c', letterSpacing: '0.05em' }}
                      >
                        Thy Divine Journeys
                      </h3>
                      <span
                        className="text-[10px] font-bold tracking-[0.3em] uppercase"
                        style={{ color: '#ea580c' }}
                      >
                        Booking Confirmation
                      </span>
                   </div>
                   
                   <SubscriptionBookings mobile={user?.phone?.replace(/\D/g, "").slice(-10)} />
                </div>
              </motion.div>
            ):(
              <motion.div></motion.div>
              )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Logout Confirm Modal */}
      <Modal
        title={null}
        open={logoutConfirmVisible}
        onCancel={() => setLogoutConfirmVisible(false)}
        footer={null}
        centered
        width={350}
        styles={{
          mask: { backdropFilter: 'blur(10px)', zIndex: 11000 },
          content: { 
            backgroundColor: '#fffaf0', 
            border: '1px solid rgba(234,88,12,0.3)',
            borderRadius: '16px',
            padding: '24px',
            zIndex: 11001
          }
        }}
        closable={false}
      >
        <div className="text-center">
          <ExclamationCircleOutlined style={{ fontSize: '40px', color: '#ea580c', marginBottom: '16px' }} />
          <h3
            style={{
              fontFamily: "'Cinzel', serif",
              color: '#c2410c',
              fontSize: '18px',
              marginBottom: '8px',
            }}
          >
            Logout Confirmation
          </h3>
          <p style={{ color: '#7c2d12', marginBottom: '24px', opacity: 0.85, fontSize: '13px' }}>
            Are you sure you want to end your divine session?
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setLogoutConfirmVisible(false)}
              className="flex-1 py-2.5 rounded-xl font-bold tracking-widest text-[10px] uppercase transition-all"
              style={{
                background: 'rgba(234,88,12,0.06)',
                color: '#9a3412',
                border: '1px solid rgba(234,88,12,0.2)',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => {
                localStorage.removeItem("userDetails");
                window.dispatchEvent(new CustomEvent("user-details-changed"));
                onClose();
              }}
              className="flex-1 py-2.5 rounded-xl font-bold tracking-widest text-[10px] uppercase transition-all"
              style={{
                background: 'linear-gradient(135deg, #fef08a, #f97316)',
                color: '#431407',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 3px 12px rgba(234,88,12,0.3)',
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </Modal>
    </Modal>
  );
};

export default ProfileModal;
