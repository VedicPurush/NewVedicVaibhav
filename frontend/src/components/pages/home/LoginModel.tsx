"use client";

import React, { useState, useEffect } from "react";
import { Modal, Input, Button, message } from "antd";
import axios from "axios";
import ReactDOM from "react-dom";
import { api } from "@/lib/api";

/** Fast2SMS sends a 4-digit code (see FAST2SMS_TEMPLATE_ID). */
const OTP_LENGTH = 4;

interface VedicVaibhavLoginModalProps {
  modalOpen: boolean;
  setModalOpen: (open: boolean) => void;
  onLoginSuccess?: () => void;
}


const VedicVaibhavLoginModal: React.FC<VedicVaibhavLoginModalProps> = ({
  modalOpen,
  setModalOpen,
}) => {
  // State management for the enhanced login functionality
  const [identifier, setIdentifier] = useState("");
  // Mobile is the only login method; email OTP login was removed. Kept as a
  // flag purely so the UI can tell "OTP not requested yet" from "OTP sent".
  const [identifierType, setIdentifierType] = useState<"mobile" | null>(null);
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpTimer, setOtpTimer] = useState(120);
  const [_canResend, setCanResend] = useState(false);
  const [_loadingAuth, setLoadingAuth] = useState(false);
  const [isButtonTemporarilyDisabled, setIsButtonTemporarilyDisabled] =
    useState(false);
  const [showWelcome, setShowWelcome] = React.useState(false);
  const [optIn, setOptIn] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);


  // Reset modal state when closed
  const resetLoginForm = () => {
    setIdentifier("");
    setIdentifierType(null);
    setOtp("");
    setOtpSent(false);
    setIsVerifyingOtp(false);
    setOtpTimer(120);
    setCanResend(false);
    setLoadingAuth(false);
    setIsButtonTemporarilyDisabled(false);
  };
  const handleModalClose = () => {
    resetLoginForm();
    setModalOpen(false);
  };
  const temporarilyDisableButton = (duration = 3000) => {
    setIsButtonTemporarilyDisabled(true);
    setTimeout(() => setIsButtonTemporarilyDisabled(false), duration);
  };

  // Mobile-only OTP. Email login was removed — see the note on `identifierType`.
  const sendIdentifierOtpHandler = async () => {
    const trimmed = identifier.trim();

    if (!/^\d{10}$/.test(trimmed)) {
      message.error("Please enter a valid 10-digit mobile number.");
      temporarilyDisableButton();
      return;
    }

    try {
      message.loading("Sending OTP...", 0.5);
      await api.post("/send-otp", { phone: trimmed });
      setIdentifierType("mobile");
      message.success("OTP sent successfully!");
      setOtpSent(true);
      setOtpTimer(120);
      setCanResend(false);
    } catch (error: unknown) {
      let errMsg = "Failed to send OTP";
      if (axios.isAxiosError(error)) {
        errMsg = error.response?.data?.error || errMsg;
      } else if (error instanceof Error) {
        errMsg = error.message;
      } else {
        errMsg = String(error);
      }
      message.error(errMsg);
    }
  };

  interface WelcomeModalProps {
    open: boolean;
    onClose: () => void;
    userName?: string;
    isNewUser?: boolean;
  }


  const WelcomeModal: React.FC<WelcomeModalProps> = ({
    open,
    onClose,
    userName = "",
  }) => {
    const dialogRef = React.useRef<HTMLDivElement | null>(null);

    React.useEffect(() => {
      if (!open) return;
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      };
      window.addEventListener("keydown", onKey);
      // focus the dialog for accessibility
      dialogRef.current?.focus();
      return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    if (!open) return null;

    return ReactDOM.createPortal(
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={{ zIndex: 2000 }}
        aria-hidden={!open}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label="Welcome to Vedic Vaibhav"
          tabIndex={-1}
          className="relative mx-4 w-full max-w-md rounded-2xl shadow-2xl outline-none animate-bounce-in"
          style={{
            background:
              "linear-gradient(135deg, #fef7ed 0%, #fff 50%, #fef7ed 100%)",
            animation: "bounceIn 0.6s ease-out",
          }}
        >
          {/* Top accent with orange gradient */}
          <div className="absolute -top-3 left-6 right-6 h-2 rounded-full bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 shadow-lg" />

          {/* Celebration rays */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
            <div
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 opacity-10 animate-spin-slow"
              style={{
                background:
                  "conic-gradient(from 0deg, transparent, #fb923c, transparent, #f97316, transparent)",
              }}
            />
          </div>

          {/* Content */}
          <div className="relative p-6 sm:p-8">
            {/* Success badge with party animation */}
            <div className="mx-auto -mt-12 mb-4 flex h-24 w-24 items-center justify-center rounded-full shadow-lg ring-4 ring-[#fb923c] bg-white">
              <img loading="lazy"
                src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/logo/vvfinallogo.png"
                alt="Vedic Vaibhav Logo"
                width={50}
                height={30}
                className="absolute h-16 w-20 "
              />
            </div>

            <div className="text-center">
              <h2 className="text-2xl font-semibold tracking-tight text-gray-800 sm:text-3xl animate-slide-up">
                Welcome{userName ? `, ${userName}` : ""}!
              </h2>
              <p
                className="mt-2 text-base text-gray-600 animate-slide-up"
                style={{ animationDelay: "0.2s" }}
              >
                You've successfully logged in to <br />
                <span className="font-medium text-xl text-orange-600">
                  Vedic Vaibhav
                </span>
                .
              </p>
              <p
                className="mt-1 text-sm text-gray-500 animate-slide-up"
                style={{ animationDelay: "0.4s" }}
              >
                May your journey be guided by clarity, calm, and insight.
              </p>
            </div>

            {isNewUser && (
              <div className="my-4 flex flex-col items-center">
                <div className="text-lg font-semibold text-orange-600">
                  Welcome Gift! Use Promo Code:
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className="bg-orange-100 border border-orange-300 px-4 py-1 rounded-xl text-base font-bold text-orange-700 tracking-widest"
                    style={{ letterSpacing: "2px", fontSize: "18px" }}
                  >
                    THANKYOU6
                  </span>
                  <button
                    className="ml-2 px-2 py-1 rounded-md bg-white border border-orange-400 text-orange-500 text-xs hover:bg-orange-50"
                    onClick={() => {
                      navigator.clipboard.writeText("THANKYOU6");
                      message.success("Promo code copied!");
                    }}
                  >
                    Copy
                  </button>
                </div>
                <span className="mt-2 text-xs text-gray-500">
                  Apply this code during your first booking!
                </span>
              </div>
            )}

            {/* CTA Buttons */}
            <div
              className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center animate-slide-up"
              style={{ animationDelay: "0.6s" }}
            >
              <button
                onClick={onClose}
                className="w-full rounded-xl border-2 border-orange-200 bg-white px-4 py-2 text-base font-medium text-gray-700 transition-all duration-300 hover:bg-orange-50 hover:border-orange-300 sm:w-auto"
              >
                Close
              </button>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes bounceIn {
            0% {
              transform: scale(0.3) translateY(-50px);
              opacity: 0;
            }
            50% {
              transform: scale(1.05) translateY(0);
              opacity: 1;
            }
            70% {
              transform: scale(0.95);
            }
            100% {
              transform: scale(1);
              opacity: 1;
            }
          }

          @keyframes float {
            0%,
            100% {
              transform: translateY(0px) rotate(0deg);
            }
            50% {
              transform: translateY(-20px) rotate(180deg);
            }
          }

          @keyframes party-bounce {
            0%,
            100% {
              transform: scale(1) rotate(0deg);
            }
            25% {
              transform: scale(1.1) rotate(-5deg);
            }
            75% {
              transform: scale(1.1) rotate(5deg);
            }
          }

          @keyframes slide-up {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes spin-slow {
            from {
              transform: translate(-50%, -50%) rotate(0deg);
            }
            to {
              transform: translate(-50%, -50%) rotate(360deg);
            }
          }

          @keyframes check-draw {
            0% {
              transform: scale(0);
              opacity: 0;
            }
            50% {
              transform: scale(1.2);
              opacity: 1;
            }
            100% {
              transform: scale(1);
              opacity: 1;
            }
          }

          .animate-float {
            animation: float 4s ease-in-out infinite;
          }

          .animate-party-bounce {
            animation: party-bounce 2s ease-in-out infinite;
          }

          .animate-slide-up {
            animation: slide-up 0.6s ease-out both;
          }

          .animate-spin-slow {
            animation: spin-slow 8s linear infinite;
          }

          .animate-check-draw {
            animation: check-draw 0.8s ease-out;
            animation-delay: 0.3s;
            animation-fill-mode: both;
          }
        `}</style>
      </div>,
      document.body
    );
  };

  const verifyIdentifierOtpHandler = async () => {
    if (otp.length !== OTP_LENGTH) {
      message.error(`Please enter a valid ${OTP_LENGTH}-digit OTP`);
      return;
    }

    try {
      setIsVerifyingOtp(true);
      message.loading("Verifying OTP...", 0.5);

      // 1) Verify the OTP
      await api.post("/verify-otp", {
        phone: identifier.trim(), // 10-digit
        otp,
        optIn,
      });

      // 2) Ensure user is saved and get token+user (idempotent)
      const upsertRes = await api.post("/phone-login-or-register", {
        phone: identifier.trim(),
        optIn,
      });

      const { user, token } = upsertRes.data;
      localStorage.setItem("userDetails", JSON.stringify({ user, token }));
      // The header and profile widgets re-read localStorage on this event.
      window.dispatchEvent(new CustomEvent("user-details-changed"));

      const isNewUser =
        new Date().getTime() - new Date(user.addedOn).getTime() < 2 * 60 * 1000; // 2 minutes window
      setIsNewUser(isNewUser);

      setShowWelcome(true);
      handleModalClose();
    } catch (error: unknown) {
      let errMsg = "OTP verification failed";
      if (axios.isAxiosError(error)) {
        errMsg =
          error.response?.data?.message ||
          error.response?.data?.error ||
          errMsg;
      } else if (error instanceof Error) {
        errMsg = error.message;
      } else {
        errMsg = String(error);
      }
      message.error(errMsg);
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // OTP box helpers
  const otpLength = OTP_LENGTH;
  const inputsRef = React.useRef<HTMLInputElement[]>([]);

  React.useEffect(() => {
    // trim any extra chars if the identifier type changes
    if (otp.length > otpLength) setOtp(otp.slice(0, otpLength));
  }, [identifierType]); // eslint-disable-line react-hooks/exhaustive-deps

  const focusInput = (i: number) => {
    const el = inputsRef.current[i];
    if (el) el.focus();
  };

  const handleBoxChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    i: number
  ) => {
    const raw = e.target.value;
    const val = raw.replace(/\D/g, "").slice(-1); // only keep last digit typed
    const next = (otp.slice(0, i) + val + otp.slice(i + 1)).slice(0, otpLength);
    setOtp(next);

    if (val && i < otpLength - 1) focusInput(i + 1);
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    i: number
  ) => {
    const key = e.key;
    if (key === "Backspace") {
      if (!otp[i] && i > 0) {
        // move back if current is already empty
        focusInput(i - 1);
        // also clear the previous char
        const next = otp.slice(0, i - 1) + "" + otp.slice(i);
        setOtp(next);
      } else {
        // clear current and stay
        const next = otp.slice(0, i) + "" + otp.slice(i + 1);
        setOtp(next);
      }
      e.preventDefault();
    } else if (key === "ArrowLeft" && i > 0) {
      focusInput(i - 1);
      e.preventDefault();
    } else if (key === "ArrowRight" && i < otpLength - 1) {
      focusInput(i + 1);
      e.preventDefault();
    } else if (key === "Enter") {
      // Submit from any digit box, so finishing the code and hitting Enter works
      // the same as tapping Verify. Ignored until every digit is filled.
      e.preventDefault();
      if (!isVerifyingOtp && otp.length === otpLength) void verifyIdentifierOtpHandler();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const pasted = (e.clipboardData.getData("text") || "")
      .replace(/\D/g, "")
      .slice(0, otpLength);
    if (!pasted) return;
    setOtp(pasted.padEnd(otpLength, ""));
    // focus last filled box
    const last = Math.min(pasted.length, otpLength) - 1;
    focusInput(Math.max(last, 0));
    e.preventDefault();
  };

  // 2-minute countdown timer
  useEffect(() => {
    if (otpSent) {
      setOtpTimer(120);
      const interval = setInterval(() => {
        setOtpTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [otpSent]);

  return (
    <>
      <WelcomeModal
        open={showWelcome}
        onClose={() => setShowWelcome(false)}
        isNewUser={isNewUser}
      />

      <Modal
        centered
        open={modalOpen}
        footer={null}
        onCancel={handleModalClose}
        closable={false}
        width={450}
        styles={{ body: { padding: 0 } }}
        style={{ borderRadius: "20px" }}
      >
        <div
          className="fixed flex items-center justify-center z-50"
          style={{ position: "relative" }}
        >
          <div
            className="bg-orange-100 p-6 rounded-lg shadow-xl max-w-md w-full relative"
            style={{
              border: "1px solid #e0e0e0",
              backgroundColor: "#fff7ed",
              maxWidth: "28rem",
              margin: "0 auto",
            }}
          >
            {/* Close Button */}
            <button
              onClick={handleModalClose}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
              style={{
                background: "none",
                border: "none",
                fontSize: "18px",
                cursor: "pointer",
                zIndex: 10,
              }}
            >
              &#10005;
            </button>

            {/* Logo / Title Section */}
            <div className="flex flex-col items-center mb-4">
              <img loading="lazy"
                src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/logo/vvfinallogo.png"
                alt="Vedic Vaibhav Logo"
                className="w-40 h-28"
                style={{
                  width: "160px",
                  height: "112px",
                  objectFit: "contain",
                }}
              />
              <h2
                className="text-xl mb-2 font-semibold"
                style={{
                  fontSize: "20px",
                  fontWeight: "600",
                  marginBottom: "8px",
                  color: "#374151",
                }}
              >
                Welcome to Vedic Vaibhav
              </h2>
              <p
                className="text-sm text-gray-500 text-center"
                style={{
                  fontSize: "14px",
                  color: "#6b7280",
                  textAlign: "center",
                  lineHeight: "1.4",
                  marginBottom: "16px",
                }}
              >
                Explore the Journey of Your Spiritual Life
              </p>
            </div>

            {/* White Card with login options */}
            <div
              className="border rounded-2xl p-4 bg-white"
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "16px",
                padding: "16px",
                backgroundColor: "white",
                boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
              }}
            >
              <div
                className="flex flex-col gap-2"
                style={{ display: "flex", flexDirection: "column", gap: "8px" }}
              >
                {/* Mobile number input */}
                <div className="flex flex-col gap-3 w-full">
                  <Input
                    placeholder="Enter 10-digit mobile number"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    // Enter sends the OTP, matching the button below it.
                    onPressEnter={() => {
                      if (!otpSent && !isButtonTemporarilyDisabled) void sendIdentifierOtpHandler();
                    }}
                    inputMode="numeric"
                    maxLength={10}
                    className="rounded-lg text-base"
                    disabled={otpSent}
                    style={{
                      borderRadius: "8px",
                      padding: "8px 12px",
                      fontSize: "16px",
                      height: "40px",
                      border: "1px solid #d1d5db",
                    }}
                  />

                  {/* Send OTP Button */}
                  {!otpSent && (
                    <Button
                      type="default"
                      onClick={sendIdentifierOtpHandler}
                      disabled={isButtonTemporarilyDisabled}
                      className="w-full rounded-lg bg-orange-50 text-orange-600 border border-orange-500 hover:bg-orange-100 transition-colors"
                      style={{
                        borderRadius: "8px",
                        height: "40px",
                        fontSize: "15px",
                        fontWeight: "600",
                        width: "100%",
                      }}
                    >
                      Send OTP
                    </Button>
                  )}
                </div>

                {/* OTP Verification Section */}
                {otpSent && (
                  <>
                    <div
                      onPaste={handlePaste}
                      style={{ display: "flex", gap: "8px" }}
                      aria-label={`${otpLength}-digit OTP input`}
                      className="flex justify-center gap-2"
                    >
                      {Array.from({ length: otpLength }).map((_, i) => (
                        <input
                          key={i}
                          ref={(el) => {
                            if (el) inputsRef.current[i] = el;
                          }}
                          value={otp[i] || ""}
                          onChange={(e) => handleBoxChange(e, i)}
                          onKeyDown={(e) => handleKeyDown(e, i)}
                          inputMode="numeric"
                          pattern="\d*"
                          maxLength={1}
                          aria-label={`Digit ${i + 1}`}
                          className="rounded-lg text-base"
                          style={{
                            borderRadius: "8px",
                            padding: "8px 12px",
                            fontSize: "16px",
                            height: "40px",
                            width: "40px",
                            textAlign: "center",
                            border: "1px solid #d1d5db",
                          }}
                        />
                      ))}
                    </div>

                    <Button
                      type="primary"
                      onClick={verifyIdentifierOtpHandler}
                      loading={isVerifyingOtp}
                      className="w-full rounded-lg bg-orange-500 text-white hover:bg-orange-600"
                      style={{
                        width: "100%",
                        borderRadius: "8px",
                        height: "40px",
                        backgroundColor: "#f97316",
                        borderColor: "#f97316",
                        fontSize: "14px",
                        fontWeight: "500",
                      }}
                    >
                      Verify OTP
                    </Button>

                    <div
                      className="text-center text-sm text-gray-600"
                      style={{
                        textAlign: "center",
                        fontSize: "12px",
                        color: "#6b7280",
                        marginTop: "8px",
                      }}
                    >
                      {otpTimer > 0 ? (
                        `Time left: ${otpTimer} sec`
                      ) : (
                        <Button
                          type="link"
                          onClick={sendIdentifierOtpHandler}
                          style={{
                            padding: 0,
                            fontSize: "12px",
                            color: "#f97316",
                            textDecoration: "underline",
                          }}
                        >
                          Resend OTP
                        </Button>
                      )}
                    </div>
                  </>
                )}

                <label className="flex  justify-center space-x-2 text-xs text-gray-500">
                  <input
                    type="checkbox"
                    checked={optIn}
                    onChange={(e) => setOptIn(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />

                  <span>
                    I would like to receive communication from Vedic Vaibhav via
                    SMS, Email, RCS, and WhatsApp for services, offers and
                    updates.
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default VedicVaibhavLoginModal;
