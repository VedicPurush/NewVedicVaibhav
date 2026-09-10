"use client";

import React, { useEffect, useRef } from "react";
import { api } from "@/lib/api";

interface PhoneAutoVerificationProps {
  phone: string;
  onUserFound: (user: any) => void;
  onUserNotFound: () => void;
  onVerifying: (isVerifying: boolean) => void;
}

const PhoneAutoVerification: React.FC<PhoneAutoVerificationProps> = ({
  phone,
  onUserFound,
  onUserNotFound,
  onVerifying,
}) => {
  const lastFetchedPhoneRef = useRef<string>("");
  const fetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Use refs for callbacks to avoid re-triggering the effect when parent re-renders
  const onVerifyingRef = useRef(onVerifying);
  const onUserFoundRef = useRef(onUserFound);
  const onUserNotFoundRef = useRef(onUserNotFound);

  useEffect(() => {
    onVerifyingRef.current = onVerifying;
    onUserFoundRef.current = onUserFound;
    onUserNotFoundRef.current = onUserNotFound;
  });

  useEffect(() => {
    // Clear any pending timer
    if (fetchTimerRef.current) {
      clearTimeout(fetchTimerRef.current);
      fetchTimerRef.current = null;
    }

    let digits = phone.replace(/\D/g, "");
    if (digits.length > 10 && digits.startsWith("91")) {
      digits = digits.slice(-10);
    }
    if (digits.length === 10 && digits !== lastFetchedPhoneRef.current) {
      lastFetchedPhoneRef.current = digits;

      onVerifyingRef.current(true);
      fetchTimerRef.current = setTimeout(async () => {
        try {
          const response = await api.get(`/get-user-by-phone/${digits}`);
          const { user } = response.data;
          if (user) {
            onUserFoundRef.current(user);
          } else {
            onUserNotFoundRef.current();
          }
        } catch (err: any) {
          if (err.response?.status === 404) {
            onUserNotFoundRef.current();
          } else {
            console.error("Auto-verification error:", err);
          }
        } finally {
          onVerifyingRef.current(false);
        }
      }, 500);
    }

    return () => {
      if (fetchTimerRef.current) {
        clearTimeout(fetchTimerRef.current);
      }
    };
  }, [phone]);

  return null;
};

export default PhoneAutoVerification;
