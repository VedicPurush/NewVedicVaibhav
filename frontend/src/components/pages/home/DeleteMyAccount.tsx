"use client";

import React, { useState, useRef, useEffect } from "react";
import { Input, Button, message, Radio, Modal } from "antd";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { api } from "@/lib/api";

const REASONS = [
  "Privacy concerns",
  "Found a better service",
  "Too many notifications",
  "Not useful anymore",
  "Other",
];

const OTP_SECONDS = 120;

const normalize10 = (val: string) => (val || "").replace(/\D/g, "").slice(-10);
const pickStoredPhone = (): string | null => {
  try {
    const raw = localStorage.getItem("userDetails");
    if (!raw || raw === "undefined") return null;
    const parsed = JSON.parse(raw);
    const phone: string | undefined =
      parsed?.user?.phone || parsed?.phone || parsed?.mobile || parsed?.mobileNumber;
    return phone ? normalize10(phone) : null;
  } catch {
    return null;
  }
};

const DeleteMyAccount: React.FC = () => {
  // The legacy app pulled `user`/`logout` from the removed E-com AuthContext,
  // which itself only mirrored localStorage `userDetails`. Replicate that here.
  const [user, setUser] = useState<any>(null);
  useEffect(() => {
    try {
      const stored = localStorage.getItem("userDetails");
      if (stored && stored !== "undefined") setUser(JSON.parse(stored));
    } catch (error) {
      console.error("Error parsing userDetails from localStorage:", error);
      localStorage.removeItem("userDetails");
    }
  }, []);
  const logout = () => {
    setUser(null);
    localStorage.removeItem("userDetails");
    window.dispatchEvent(new CustomEvent("user-details-changed"));
  };

  // State for mobile and OTP
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(OTP_SECONDS);
  const [canResend, setCanResend] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Reason
  const [reason, setReason] = useState<string | null>(null);
  const [otherReason, setOtherReason] = useState("");

  // Modals
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);

  // OTP input logic
  const otpLength = 4;
  const inputsRef = useRef<HTMLInputElement[]>([]);
  const otpIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* --- Timer --- */
  useEffect(() => {
    if (!otpSent) return;
    setOtpTimer(OTP_SECONDS);
    setCanResend(false);
    if (otpIntervalRef.current) clearInterval(otpIntervalRef.current);
    otpIntervalRef.current = setInterval(() => {
      setOtpTimer((p) => {
        if (p <= 1) {
          if (otpIntervalRef.current) clearInterval(otpIntervalRef.current);
          otpIntervalRef.current = null;
          setCanResend(true);
          return 0;
        }
        return p - 1;
      });
    }, 1000);
    return () => {
      if (otpIntervalRef.current) clearInterval(otpIntervalRef.current);
    };
  }, [otpSent]);

  useEffect(() => {
    if (otpVerified && otpIntervalRef.current) {
      clearInterval(otpIntervalRef.current);
      otpIntervalRef.current = null;
      setOtpTimer(0);
      setCanResend(false);
    }
  }, [otpVerified]);

  /* --- OTP send/verify --- */
  const sendOtpHandler = async () => {
    const trimmed = mobile.trim();
    if (!/^\d{10}$/.test(trimmed)) {
      message.error("Please enter a valid 10-digit mobile number.");
      return;
    }
    try {
      message.loading("Sending OTP...", 0.6);
      await api.post("/send-otp", { phone: trimmed });
      setOtpSent(true);
      setOtp("");
      setOtpVerified(false);
      message.success("OTP sent!");
    } catch (err: any) {
      message.error(err?.response?.data?.error || err?.message || "Failed to send OTP");
    }
  };

  const verifyOtpHandler = async () => {
    if (otp.length !== otpLength) {
      message.error(`Please enter the ${otpLength}-digit OTP.`);
      return;
    }
    try {
      setIsVerifying(true);
      await api.post("/verify-otp", { phone: mobile.trim(), otp });
      setOtpVerified(true);
      message.success("Mobile verified!");
    } catch (err: any) {
      setOtpVerified(false);
      message.error(err?.response?.data?.error || err?.message || "OTP verification failed");
    } finally {
      setIsVerifying(false);
    }
  };

  /* --- OTP inputs UX --- */
  const focusInput = (i: number) => inputsRef.current[i]?.focus();
  const handleBoxChange = (e: React.ChangeEvent<HTMLInputElement>, i: number) => {
    const val = e.target.value.replace(/\D/g, "").slice(-1);
    const next = (otp.slice(0, i) + val + otp.slice(i + 1)).slice(0, otpLength);
    setOtp(next);
    if (val && i < otpLength - 1) focusInput(i + 1);
  };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, i: number) => {
    if (e.key === "Backspace") {
      if (!otp[i] && i > 0) {
        focusInput(i - 1);
        setOtp(otp.slice(0, i - 1) + "" + otp.slice(i));
      } else {
        setOtp(otp.slice(0, i) + "" + otp.slice(i + 1));
      }
      e.preventDefault();
    } else if (e.key === "ArrowLeft" && i > 0) {
      focusInput(i - 1);
      e.preventDefault();
    } else if (e.key === "ArrowRight" && i < otpLength - 1) {
      focusInput(i + 1);
      e.preventDefault();
    }
  };
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const pasted = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, otpLength);
    if (!pasted) return;
    setOtp(pasted.padEnd(otpLength, ""));
    const last = Math.min(pasted.length, otpLength) - 1;
    focusInput(Math.max(last, 0));
    e.preventDefault();
  };

  /* --- Pre-confirm + Delete --- */
  const onOpenConfirm = () => setConfirmOpen(true);

  const handleDeleteAccount = async () => {
    const phone = mobile.trim();
    const finalReason = reason === "Other" ? otherReason : reason;

    try {
      setIsDeleting(true);
      await api.post("/delete-account", { phone, reason: finalReason });
      setConfirmOpen(false);

      // Success UI
      setSuccessOpen(true);
      message.success({ content: "Account deleted.", duration: 2 });

      // Pull phone from auth state *if present*, without requiring it on the User type
      const ctxPhone = normalize10((((user as any)?.user?.phone ?? (user as any)?.phone) as string) || "");
      const loggedPhone = ctxPhone || pickStoredPhone(); // fall back to localStorage
      if (loggedPhone && loggedPhone === normalize10(phone)) {
        logout(); // clears userDetails
        setTimeout(() => {
          window.location.replace("/"); // soft redirect to home (logged-out state)
        }, 1100);
      }
    } catch (err: any) {
      message.error(err?.response?.data?.error || err?.message || "Failed to delete account");
    } finally {
      setIsDeleting(false);
    }
  };

  /* --- UI --- */
  const disabledDelete =
    !otpVerified || !reason || (reason === "Other" && !otherReason.trim());

  return (
    <>
      <Navbar />

      {/* Background aura */}
      <div className="relative min-h-[80vh] mt-[7vh] md:mt-[10vh] bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-300 via-orange-500 to-amber-300" />

        <div className="mx-auto flex max-w-3xl items-center justify-center px-4 py-10">
          {/* Saffron card */}
          <div className="w-full rounded-2xl border border-amber-200/70 bg-white/90 shadow-[0_12px_40px_rgba(245,158,11,.18)] backdrop-blur">
            {/* Header */}
            <div className="flex items-center gap-3 rounded-t-2xl border-b border-amber-200/70 bg-gradient-to-b from-orange-50 to-white p-5">
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-stone-900">
                  Delete My Account
                </h1>
                <p className="text-xs text-stone-600">
                  Permanent action. Sanātana-inspired, safety-first workflow.
                </p>
              </div>
            </div>

            {/* Body */}
            <div className="space-y-4 p-5">
              {/* Mobile */}
              <div className="flex gap-2">
                <Input
                  placeholder="Enter 10-digit mobile number"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  maxLength={10}
                  disabled={otpSent}
                  className="rounded-md"
                />
                <Button
                  type="primary"
                  onClick={sendOtpHandler}
                  disabled={otpSent}
                  className="!bg-orange-500 !border-orange-500 hover:!bg-orange-600"
                >
                  {otpSent ? "OTP Sent" : "Send OTP"}
                </Button>
              </div>

              {/* OTP */}
              {otpSent && (
                <>
                  <div
                    onPaste={handlePaste}
                    aria-label="4-digit OTP input"
                    className="mb-1 flex justify-center gap-2"
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
                        className="h-12 w-12 rounded-lg border text-center text-lg font-semibold outline-none transition
                                   focus:border-orange-400 focus:ring-2 focus:ring-orange-300/60
                                   disabled:border-emerald-500 disabled:bg-emerald-50"
                      />
                    ))}
                  </div>
                  <div>
                    <Button
                      type="primary"
                      onClick={verifyOtpHandler}
                      loading={isVerifying}
                      disabled={otpVerified}
                      className={`w-full ${otpVerified ? "!bg-emerald-500 !border-emerald-500" : "!bg-orange-500 !border-orange-500"} `}
                    >
                      {otpVerified ? "Mobile Verified" : "Verify OTP"}
                    </Button>
                    {!otpVerified && (
                      <div className="mb-1 mt-2 text-center text-xs text-gray-500">
                        {otpTimer > 0 ? (
                          <>Time left: {otpTimer} sec</>
                        ) : (
                          <Button
                            type="link"
                            onClick={sendOtpHandler}
                            disabled={!canResend}
                            className="!p-0 !text-orange-600"
                          >
                            Resend OTP
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Reason */}
              {otpVerified && (
                <div className="rounded-xl border border-amber-200/70 bg-orange-50/50 p-4">
                  <div className="mb-2 font-medium text-stone-800">
                    Why do you want to delete your account?
                  </div>
                  <Radio.Group
                    onChange={(e) => {
                      setReason(e.target.value);
                      if (e.target.value !== "Other") setOtherReason("");
                    }}
                    value={reason}
                    className="flex flex-col gap-2"
                  >
                    {REASONS.map((r) => (
                      <Radio key={r} value={r}>
                        {r}
                      </Radio>
                    ))}
                  </Radio.Group>
                  {reason === "Other" && (
                    <Input.TextArea
                      value={otherReason}
                      onChange={(e) => setOtherReason(e.target.value)}
                      placeholder="Please specify…"
                      rows={3}
                      className="mt-2"
                    />
                  )}
                </div>
              )}

              {/* Warning */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900">
                <div className="mb-1 font-semibold">
                  ⚠️ Warning — You will be logged out from this device
                </div>
                <p>
                  If the number you delete matches the one currently logged in, we’ll
                  automatically sign you out here after deletion.
                </p>
              </div>

              {/* Action */}
              <Button
                danger
                type="primary"
                block
                disabled={disabledDelete}
                loading={isDeleting}
                onClick={onOpenConfirm}
                className={`mt-1 ${disabledDelete ? "!bg-gray-200 !border-gray-200 !text-gray-500" : "!bg-red-600 !border-red-600 hover:!bg-red-700"}`}
              >
                {isDeleting ? "Deleting…" : "Confirm Delete My Account"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Footer />

      {/* Confirm Modal */}
      <Modal
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        footer={null}
        centered
        width={460}
        styles={{ body: { padding: 0, borderRadius: 16, overflow: "hidden" } }}
      >
        <div className="rounded-2xl">
          <div className="flex items-center gap-3 border-b border-amber-200/70 bg-gradient-to-r from-orange-100 via-amber-100 to-white px-5 py-4">
            <div className="grid size-10 place-items-center rounded-lg bg-gradient-to-br from-amber-300 to-amber-500 text-white shadow ring-1 ring-white/70">
              ॐ
            </div>
            <div className="text-base font-semibold text-stone-900">Confirm Account Deletion</div>
          </div>
          <div className="space-y-3 p-5">
            <p className="text-sm text-stone-700">
              This will permanently delete your Vedic Vaibhav account linked to{" "}
              <b>+91 {mobile}</b>. This action cannot be undone.
            </p>
            <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900">
              <b>You will be logged out on this device</b> if this number matches the currently
              logged-in account.
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
              <Button
                danger
                type="primary"
                loading={isDeleting}
                onClick={handleDeleteAccount}
                className="!bg-red-600 !border-red-600 hover:!bg-red-700"
              >
                Delete Account
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Success Modal */}
      <Modal
        open={successOpen}
        footer={null}
        onCancel={() => setSuccessOpen(false)}
        centered
        width={420}
        styles={{ body: { padding: 0, borderRadius: 16, overflow: "hidden" } }}
      >
        <div className="rounded-2xl">
          <div className="flex items-center gap-3 border-b border-amber-200/70 bg-gradient-to-r from-amber-200 via-orange-200 to-white px-5 py-4">
            <div className="grid size-10 place-items-center rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow ring-1 ring-white/70">
              ✅
            </div>
            <div className="text-base font-semibold text-stone-900">Account Deleted</div>
          </div>
          <div className="space-y-3 p-5 text-center">
            <div className="text-stone-700">
              Your account has been deleted successfully.
              <br />
              <span className="text-stone-500">ॐ शान्तिः शान्तिः शान्तिः</span>
            </div>
            <Button type="primary" className="!bg-orange-500 !border-orange-500" onClick={() => setSuccessOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default DeleteMyAccount;
