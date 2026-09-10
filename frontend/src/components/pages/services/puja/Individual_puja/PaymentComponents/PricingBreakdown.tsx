"use client";

import React from "react";
import { Row } from "antd";
import { useMoney } from "@/lib/currency";

export interface AddedRow {
    description: string;
    templeName: string | undefined;
    packageName: string;
    date: string;
    time: string;
    price: number;
}

interface PricingBreakdownProps {
    selectedpackagename: string;
    packagePrice: number;
    addedRows: AddedRow[];
    silveridolselected: boolean;
    idolquantity: number;
    selectedPuja: any;
    isPromoApplied: boolean;
    discount: number;
    totalPrice: number;
    prasadSelected?: "yes" | "no";
    isMobile?: boolean;
}

export const PricingBreakdown: React.FC<PricingBreakdownProps> = ({
    selectedpackagename,
    packagePrice,
    addedRows,
    silveridolselected,
    idolquantity,
    selectedPuja,
    isPromoApplied,
    discount,
    totalPrice,
    prasadSelected,
    isMobile = false,
}) => {
  /** Prices render in the devotee's own currency; the India list price is the
   *  input and the server owns the markup. See lib/currency.ts. */
  const { money } = useMoney();
    if (isMobile) {
        return (
            <div className="mb-3">
                <div className="flex items-center gap-2 text-sm font-bold font-[Montserrat] mb-2 text-[#1a1a1a] tracking-tight">
                    <span>💰</span>
                    <span>Bill Details</span>
                </div>

                <div className="w-full rounded-2xl bg-white/95 backdrop-blur-lg border border-black/[0.04] shadow-[0_4px_24px_rgba(0,0,0,0.04)] px-5 py-4 space-y-3">
                    <Row className="flex justify-between items-center text-sm text-black/60">
                        <div className="font-medium">{selectedpackagename}</div>
                        <div className="font-bold text-[#1a1a1a]" translate="no">{money(packagePrice)}</div>
                    </Row>

                    {addedRows.map((row, index) => (
                        <Row
                            key={index}
                            className="flex justify-between items-center text-xs text-black/70"
                        >
                            <div>{row.description}</div>
                            <div translate="no">{money(row.price)}</div>
                        </Row>
                    ))}

                    {prasadSelected === "yes" && (
                        <Row className="flex justify-between items-center text-xs text-black/70">
                            <div>Prasad Box</div>
                            <div translate="no">{money(201)}</div>
                        </Row>
                    )}

                    {silveridolselected && (
                        <Row className="flex justify-between items-center text-xs text-black/70">
                            <div>
                                999 Sidh Silver Idol{" "}
                                <span className="font-bold"> x {idolquantity}</span>
                            </div>
                            <div translate="no">
                                {money(selectedPuja?.idolDetails?.idolPrice * idolquantity)}
                            </div>
                        </Row>
                    )}

                    {isPromoApplied && (
                        <Row className="flex justify-between items-center text-xs text-black/70">
                            <div>Discount</div>
                            <div translate="no">- {money(discount)}</div>
                        </Row>
                    )}

                    <div className="h-px w-full bg-black/[0.06] my-2" />

                    <Row className="flex justify-between items-center text-sm font-bold text-[#1a1a1a]">
                        <div>Total Amount</div>
                        <div className="text-[#FF6505]" translate="no">{money(totalPrice)}</div>
                    </Row>
                </div>
            </div>
        );
    }

    // Desktop View
    return (
        <div className="w-[48%] mr-0 md:mr-4 mb-4 md:mb-0">
            <div
                style={{
                    fontFamily: "Montserrat",
                    fontSize: "18px",
                    fontWeight: 600,
                    marginBottom: "2%",
                }}
                className="flex items-center gap-2 w-full "
            >
                <span>💰</span>
                <span>Bill Details</span>
            </div>

            <div className="w-full rounded-2xl bg-white/95 backdrop-blur-lg border border-black/[0.04] shadow-[0_4px_24px_rgba(0,0,0,0.04)] px-5 py-4 space-y-3">
                <Row
                    style={{
                        display: "flex",
                        color: "rgba(0,0,0,0.6)",
                        marginBlock: "1%",
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}
                >
                    <div className="text-sm font-medium">{selectedpackagename}</div>
                    <div className="text-sm font-semibold" translate="no">{money(packagePrice)}</div>
                </Row>

                {addedRows.map((row, index) => (
                    <Row
                        key={index}
                        style={{
                            marginBlock: "1%",
                            display: "flex",
                            color: "rgba(0,0,0,0.6)",
                            justifyContent: "space-between",
                            alignItems: "center",
                        }}
                    >
                        <div className="text-xs sm:text-sm">{row.description}</div>
                        <div className="text-xs sm:text-sm font-medium" translate="no">{money(row.price)}</div>
                    </Row>
                ))}

                {prasadSelected === "yes" && (
                    <Row
                        style={{
                            marginBlock: "1%",
                            display: "flex",
                            color: "rgba(0,0,0,0.6)",
                            justifyContent: "space-between",
                            alignItems: "center",
                        }}
                    >
                        <div className="text-xs sm:text-sm">Prasad Box</div>
                        <div className="text-xs sm:text-sm font-medium" translate="no">{money(201)}</div>
                    </Row>
                )}

                {silveridolselected && (
                    <Row
                        style={{
                            display: "flex",
                            color: "rgba(0,0,0,0.6)",
                            marginBlock: "1%",
                            justifyContent: "space-between",
                            alignItems: "center",
                        }}
                    >
                        <div className="text-xs sm:text-sm">
                            999 Sidh Silver Idol{" "}
                            <span className="font-bold"> x {idolquantity}</span>
                        </div>
                        <div className="text-xs sm:text-sm font-medium" translate="no">
                            {money(selectedPuja?.idolDetails?.idolPrice * idolquantity)}
                        </div>
                    </Row>
                )}

                {isPromoApplied && (
                    <Row
                        style={{
                            display: "flex",
                            color: "rgba(0,0,0,0.6)",
                            marginBlock: "1%",
                            justifyContent: "space-between",
                            alignItems: "center",
                        }}
                    >
                        <div className="text-xs sm:text-sm">Discount</div>
                        <div className="text-xs sm:text-sm font-medium" translate="no">- {money(discount)}</div>
                    </Row>
                )}

                <div className="h-[1px] w-full bg-neutral-300 my-2" />

                <Row
                    style={{
                        marginBlock: "1%",
                        display: "flex",
                        color: "rgba(0,0,0,1)",
                        fontWeight: 600,
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}
                >
                    <div className="text-sm sm:text-base">Total Amount</div>
                    <div className="text-sm sm:text-base" translate="no">{money(totalPrice)}</div>
                </Row>
            </div>
        </div>
    );
};
