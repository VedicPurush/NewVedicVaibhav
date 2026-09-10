"use client";

import React, { useState, useEffect } from "react";
import { Spin, Empty, message } from "antd";
import { api } from "@/lib/api";
import { motion } from "framer-motion";

interface SubscriptionBookingsProps {
  mobile: string;
}

const SubscriptionBookings: React.FC<SubscriptionBookingsProps> = ({ mobile }) => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const response = await api.get(`/jyotirlinga-subscription/mobile/${mobile}`);
        setBookings(response.data.bookings || []);
      } catch (err) {
        console.error("Error fetching bookings:", err);
        message.error("Failed to fetch your divine bookings.");
      } finally {
        setLoading(false);
      }
    };

    const handleUpdate = () => {
      fetchBookings();
    };

    if (mobile) {
      fetchBookings();
      window.addEventListener("bookings-updated", handleUpdate);
    }

    return () => {
      window.removeEventListener("bookings-updated", handleUpdate);
    };
  }, [mobile]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spin size="large" />
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="py-10 text-center">
        <Empty
          description={<span style={{ color: '#9a3412', opacity: 0.7, fontStyle: 'italic' }}>No sacred journeys found yet.</span>}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {bookings.map((booking, index) => {
        const isConfirmed = booking.status === 'confirmed' || booking.status === 'completed';

        return (
          <motion.div
            key={booking._id}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1, duration: 0.5 }}
            className="group relative p-3 md:p-4 overflow-hidden transition-all duration-500"
            style={{
              backgroundColor: '#fffaf0',
              borderRadius: '16px',
              border: '1px solid rgba(234,88,12,0.2)',
              boxShadow: '0 2px 12px rgba(234,88,12,0.06)',
            }}
          >
            {/* Ambient Background Logo */}
            <div className="absolute -bottom-6 -right-6 w-32 h-32 opacity-[0.04] pointer-events-none group-hover:scale-105 transition-transform duration-700">
              <img loading="lazy"
                src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/logo/vvfinallogo.png"
                alt=""
                className="w-full h-full"
              />
            </div>

            <div className="flex flex-col gap-3 relative z-10">
              {/* Header: Title & Status */}
              <div className="flex items-start justify-between">
                <div>
                  <h4
                    className="text-xl md:text-2xl tracking-wide leading-tight"
                    style={{ fontFamily: "'Cinzel', serif", color: '#c2410c' }}
                  >
                    {booking.planName}
                  </h4>
                  <p
                    className="text-[11px] font-medium mt-0.5 uppercase tracking-wide"
                    style={{ fontFamily: "'Montserrat', sans-serif", color: '#7c2d12', opacity: 0.75 }}
                  >
                    Order: {booking.orderID} •{' '}
                    {new Date(booking.bookingDate).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>

                <div
                  className="inline-block px-4 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase h-fit"
                  style={{
                    backgroundColor: isConfirmed ? 'rgba(21,128,61,0.1)' : 'rgba(234,88,12,0.1)',
                    color: isConfirmed ? '#15803d' : '#ea580c',
                    border: `1px solid ${isConfirmed ? 'rgba(21,128,61,0.25)' : 'rgba(234,88,12,0.25)'}`,
                  }}
                >
                  {booking.status}
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-3 lg:grid-cols-3 gap-4 mt-2">
                {[
                  { label: 'Plan Name', value: booking.planName },
                  {
                    label: 'Booking Date',
                    value: new Date(booking.bookingDate).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    }),
                  },
                  { label: 'Devotee Name', value: booking.name },
                  { label: 'Mobile', value: booking.mobile },
                  {
                    label: 'Email',
                    value: booking.email?.length > 15 ? booking.email.substring(0, 15) + '...' : booking.email,
                  },
                  { label: 'Gotra', value: booking.gotra },
                  { label: 'Payment Mode', value: booking.paymentMode },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <span
                      className="text-[10px] uppercase tracking-widest font-bold block mb-0.5"
                      style={{ color: '#ea580c' }}
                    >
                      {label}
                    </span>
                    <span
                      className="text-xs md:text-sm font-medium capitalize"
                      style={{ fontFamily: "'Montserrat', sans-serif", color: '#431407' }}
                    >
                      {value || 'N/A'}
                    </span>
                  </div>
                ))}

                {/* Family Members */}
                {booking.familyMembers && booking.familyMembers.length > 0 && (
                  <div className="mt-2 col-span-3">
                    <span
                      className="text-[10px] uppercase tracking-widest font-bold block mb-1"
                      style={{ color: '#ea580c' }}
                    >
                      Family Members
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {booking.familyMembers.map((member: any, i: number) => (
                        <span
                          key={i}
                          className="px-3 py-1 rounded-md text-[11px] font-medium"
                          style={{
                            fontFamily: "'Montserrat', sans-serif",
                            backgroundColor: 'rgba(234,88,12,0.08)',
                            color: '#7c2d12',
                            border: '1px solid rgba(234,88,12,0.15)',
                          }}
                        >
                          {member.name}{' '}
                          <span style={{ opacity: 0.6 }}>({member.relation})</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sacred Destinations */}
              <div className="mt-2">
                <span
                  className="text-[10px] uppercase tracking-widest font-bold block mb-1"
                  style={{ color: '#ea580c' }}
                >
                  Sacred Destinations
                </span>
                <div className="flex flex-wrap gap-2">
                  {booking.jyotirlingaIds?.map((j: any) => (
                    <span
                      key={j._id}
                      className="px-3 py-1 rounded text-[11px] font-bold tracking-wide"
                      style={{
                        fontFamily: "'Cinzel', serif",
                        backgroundColor: 'rgba(234,88,12,0.06)',
                        border: '1px solid rgba(234,88,12,0.2)',
                        color: '#c2410c',
                      }}
                    >
                      {j.nameEnglish}
                    </span>
                  ))}
                </div>
              </div>

              {/* Footer: Price */}
              <div
                className="flex items-center justify-between pt-3"
                style={{ borderTop: '1px solid rgba(234,88,12,0.15)' }}
              >
                <div>
                  <span
                    className="text-[10px] uppercase tracking-widest font-bold block mb-0.5"
                    style={{ color: '#ea580c' }}
                  >
                    Total Offering
                  </span>
                  <span
                    className="text-2xl font-bold tracking-tight"
                    style={{ fontFamily: "'Cinzel', serif", color: '#c2410c' }}
                  >
                    ₹{booking.totalPrice || '0'}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default SubscriptionBookings;
