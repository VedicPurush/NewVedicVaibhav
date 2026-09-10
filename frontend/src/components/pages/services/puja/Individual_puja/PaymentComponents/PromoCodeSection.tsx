"use client";

import React from "react";
import { useMoney } from "@/lib/currency";
import { Button, Input, Modal } from "antd";
import { GiftFilled } from "@ant-design/icons";
import ArrowForwardIos from '@mui/icons-material/ArrowForwardIos';

export interface PromoCode {
    _id: string;
    promoName: string;
    discountAmount: number;
    startRange: number;
    description: string;
    startDate: string;
    expiryDate: string;
    promoType: string;
    isActive: boolean;
}

interface PromoCodeSectionProps {
    isModalOpen: boolean;
    setIsModalOpen: (open: boolean) => void;
    isPromoLoading: boolean;
    isPromoUpdating: boolean;
    couponCode: string;
    setCouponCode: (code: string) => void;
    manualCouponLoading: boolean;
    handleManualApply: () => void;
    manualCouponError: string;
    promoCodes: PromoCode[];
    handleApplyPromo: (promo: PromoCode) => void;
    totalPrice: number;
    selectedPromo: string | null;
    setSelectedPromo: (promo: string | null) => void;
    setDiscount: (discount: number) => void;
    discount: number;
    setIsPromoApplied: (applied: boolean) => void;
    isMobile?: boolean;
}

export const PromoCodeSection: React.FC<PromoCodeSectionProps> = ({
    isModalOpen,
    setIsModalOpen,
    isPromoLoading,
    isPromoUpdating,
    couponCode,
    setCouponCode,
    manualCouponLoading,
    handleManualApply,
    manualCouponError,
    promoCodes,
    handleApplyPromo,
    totalPrice,
    selectedPromo,
    setSelectedPromo,
    setDiscount,
    discount,
    setIsPromoApplied,
    isMobile = false,
}) => {
    /** Prices display in the devotee's own currency; the India list price is
     *  the input and the server owns the markup. See lib/currency.ts. */
    const { money } = useMoney();
    return (
        <div className={`w-full ${isMobile ? 'max-w-md mx-auto mt-2' : 'max-w-[48%]'}`}>
            <button
                className={`flex items-center justify-between w-full ${isMobile
                    ? "p-3 active:scale-[0.99] transition-all"
                    : "p-4 hover:shadow-2xl transition-all"
                    } bg-gradient-to-r from-[#ff5a00] to-[#ff8a00] text-white rounded-2xl shadow-[0_8px_20px_rgba(255,90,0,0.3)] hover:scale-[1.01] active:scale-[0.98] transition-all`}
                onClick={(e) => {
                    e.preventDefault();
                    setIsModalOpen(true);
                }}
            >
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-xl">
                        <GiftFilled />
                    </div>
                    <span className="font-bold text-sm sm:text-base inline-flex items-center gap-2 tracking-tight">
                        View all coupons
                        {isPromoLoading && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/20">
                                Loading…
                            </span>
                        )}
                        {isPromoUpdating && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/20">
                                Updating…
                            </span>
                        )}
                    </span>
                </div>
                <ArrowForwardIos className="text-base sm:text-xl opacity-70" />
            </button>
            <Modal open={isModalOpen} onCancel={() => setIsModalOpen(false)} footer={null}>
                <div className="p-5" style={{ display: "flex", flexDirection: "column" }}>
                    <div
                        style={{
                            padding: "2%",
                            fontFamily: "Montserrat",
                            fontSize: "16px",
                            fontWeight: "600",
                        }}
                        className="flex items-center gap-2"
                    >
                        <span>View All Coupons</span>
                    </div>

                    {isPromoLoading && (
                        <div className="mb-3">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-800 text-xs font-semibold">
                                <span className="inline-block h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                                Loading coupons…
                            </div>
                        </div>
                    )}
                    {isPromoUpdating && (
                        <div className="mb-3">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/70 backdrop-blur border border-orange-200 text-orange-800 text-xs font-semibold shadow-sm">
                                <span className="inline-block h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                                Updating…
                            </div>
                        </div>
                    )}

                    {/* Manual coupon entry */}
                    <div className="mt-3" style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                        <Input
                            placeholder="Enter Coupon Code"
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value)}
                            disabled={manualCouponLoading}
                            className="h-10 rounded-xl"
                        />
                        <Button
                            type="primary"
                            onClick={handleManualApply}
                            loading={manualCouponLoading}
                            className="bg-gradient-to-r from-[#ff5a00] to-[#ff8a00] border-none text-white h-10 rounded-xl font-bold px-6 shadow-[0_8px_16px_rgba(255,90,0,0.25)] hover:scale-105 active:scale-95 transition-transform"
                        >
                            Apply
                        </Button>
                    </div>

                    {manualCouponError && (
                        <div style={{ color: "red", marginBottom: "12px" }} className="text-sm">
                            {manualCouponError}
                        </div>
                    )}

                    {promoCodes.length > 0 ? (
                        promoCodes.map((promo) => (
                            <div
                                key={promo._id}
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    padding: "16px",
                                    borderRadius: "16px",
                                    marginBottom: "12px",
                                    boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
                                    border: "1px solid rgba(0,0,0,0.04)",
                                    background: "white",
                                }}
                            >
                                <div className="flex justify-between items-center mb-1">
                                    <span className="font-semibold text-sm sm:text-base">
                                        {promo.promoName}
                                    </span>
                                    <Button
                                        type="primary"
                                        onClick={() => handleApplyPromo(promo)}
                                        style={{
                                            background: selectedPromo === promo.promoName ? "#10B981" : "linear-gradient(135deg, #ff5a00, #ff8a00)",
                                            borderColor: selectedPromo === promo.promoName ? "#10B981" : "transparent",
                                            color: "white",
                                            borderRadius: 12,
                                            height: 32,
                                            paddingInline: 18,
                                            fontSize: 12,
                                            fontWeight: 700,
                                            boxShadow: selectedPromo === promo.promoName ? "none" : "0 4px 12px rgba(255,90,0,0.2)"
                                        }}
                                        className="shadow-sm hover:scale-105 active:scale-95 transition-transform"
                                        disabled={(totalPrice + (selectedPromo ? discount : 0)) < promo.startRange}
                                    >
                                        <span key={selectedPromo === promo.promoName ? "applied" : "apply"}>
                                            {selectedPromo === promo.promoName ? "Applied ✅" : "Apply"}
                                        </span>
                                    </Button>
                                </div>
                                <p className="text-xs sm:text-sm text-gray-600">{promo.description}</p>
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-gray-400 p-4 text-sm">No coupons available</p>
                    )}
                </div>
            </Modal>

            {selectedPromo && (
                <div className="mt-3 flex items-center justify-between p-3.5 border border-emerald-500/30 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-800 text-sm shadow-[0_8px_30px_rgba(16,185,129,0.12)] transform transition-all duration-500 opacity-100 translate-y-0 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-white/40 mask-image-linear-gradient opacity-0 transition-opacity duration-500 hover:opacity-100" />
                    <div className="flex items-center gap-2 z-10">
                        <span className="text-xl animate-bounce">✨</span>
                        <div className="flex flex-col">
                            <span key={selectedPromo} className="text-emerald-900 font-bold tracking-tight text-[15px]"><span translate="no">{selectedPromo}</span> Applied</span>
                            <span className="text-emerald-700 font-medium text-xs">You saved <span translate="no">{money(discount)}</span></span>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            setSelectedPromo(null);
                            setDiscount(0);
                            setIsPromoApplied(false);
                        }}
                        className="text-red-500 font-bold text-xs uppercase tracking-wider px-3 py-1.5 rounded-lg bg-red-100/50 hover:bg-red-100 active:scale-95 transition-all z-10"
                    >
                        Remove
                    </button>
                </div>
            )}
        </div>
    );
};
