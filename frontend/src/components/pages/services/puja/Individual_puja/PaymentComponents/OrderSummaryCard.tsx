"use client";

import React from "react";
import dayjs from "dayjs";
import { useMoney } from "@/lib/currency";

export interface OrderSummaryProps {
    selectedPuja: any;
    templeDetails: any;
    selectedpackagename: string;
    poojaDate: string;
    poojaTime: string;
    poojaDay?: string;
    packagePrice: number;
    isMobile: boolean;
    prasadSelected?: "yes" | "no";
    // Will be needed if we make added services dynamic
    // addedRows: any[];
    // handleRemoveService: (service: string, price: number, desc: string) => void;
}

export const OrderSummaryCard: React.FC<OrderSummaryProps> = ({
    selectedPuja,
    templeDetails,
    selectedpackagename,
    poojaDate,
    poojaTime,
    poojaDay,
    packagePrice,
    isMobile,
    prasadSelected,
}) => {
  /** Prices render in the devotee's own currency; the India list price is the
   *  input and the server owns the markup. See lib/currency.ts. */
  const { money } = useMoney();
    if (isMobile) {
        return (
            <div className="payment-mobile-card-wrapper">
                {/* Animated Border Background */}
                <div className="payment-animated-border" />

                {/* Inner Content Wrapper */}
                <div className="payment-order-summary-inner-mobile">
                    <div className="payment-mobile-card-title">
                        <span style={{ color: "#F4A619" }}>🕉</span>
                        {selectedPuja.title}
                    </div>
                    <div
                        className="payment-mobile-card-desc"
                        dangerouslySetInnerHTML={{
                            __html: selectedPuja.poojaCardBenefit,
                        }}
                    />

                    <div className="payment-mobile-divider-subtle payment-mobile-divider-subtle-sm"></div>

                    <div className="payment-mobile-info-row payment-mobile-info-row-sm">
                        <span className="payment-mobile-info-label">
                            Package:&nbsp;
                        </span>
                        <span className="payment-mobile-info-value">
                            {selectedpackagename}
                        </span>
                    </div>

                    <div className="payment-mobile-divider-subtle"></div>

                    <div className="payment-mobile-info-row">
                        <span className="payment-mobile-info-label">
                            Date & Day:&nbsp;
                        </span>
                        <span className="payment-mobile-info-value">
                            {dayjs(poojaDate).format("DD/MM/YYYY")}, {poojaDay || dayjs(poojaDate).format("dddd")}
                        </span>
                    </div>

                    <div className="payment-mobile-divider-subtle"></div>

                    <div className="payment-mobile-location">
                        <span style={{ color: "#2c1810" }}>
                            {templeDetails.nameEnglish}, {templeDetails.city},{" "}
                            {templeDetails.state}
                        </span>
                    </div>

                    <div className="payment-mobile-divider-subtle" />
                    <div className="payment-mobile-info-row">
                        <span className="payment-mobile-info-label">
                            Puja Price:&nbsp;
                        </span>
                        <span className="payment-mobile-info-value" style={{ fontWeight: 700 }} translate="no">
                            {money(packagePrice)}
                        </span>
                    </div>

                    {prasadSelected === "yes" && (
                        <>
                            <div className="payment-mobile-divider-subtle" />
                            <div className="payment-mobile-info-row">
                                <span className="payment-mobile-info-label">
                                    📦 Prasad Box:&nbsp;
                                </span>
                                <span className="payment-mobile-info-value" style={{ color: "#16a34a", fontWeight: 700 }} translate="no">
                                    {money(201)}
                                </span>
                            </div>
                        </>
                    )}

                    <div className="payment-mobile-total-row">
                        <span className="payment-mobile-total-label">
                            Total Amount:
                        </span>
                        <span className="payment-mobile-total-value" translate="no">
                            {money(packagePrice + (prasadSelected === "yes" ? 201 : 0))}
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="payment-order-summary">
            {/* Animated Border */}
            <div className="payment-animated-border" />

            {/* Inner content wrapper */}
            <div className="payment-order-summary-inner">
                <table className="payment-table">
                    <thead>
                        <tr>
                            <th>S.No</th>
                            <th>Item Description</th>
                            <th>Temple Name</th>
                            <th>Package</th>
                            <th>Date of Puja</th>
                            <th>Time of Puja</th>
                            <th>Price</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>1</td>
                            <td className="payment-table-desc">
                                <div>{selectedPuja.title}</div>
                            </td>
                            <td>
                                {templeDetails.nameEnglish}, {templeDetails.city}
                            </td>
                            <td>
                                {selectedpackagename}
                            </td>
                            <td>
                                <div>{dayjs(poojaDate).format("DD/MM/YYYY")}</div>
                                <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{poojaDay || dayjs(poojaDate).format("dddd")}</div>
                            </td>
                            <td>
                                {poojaTime}
                            </td>
                            <td className="payment-table-price" translate="no">
                                {money(packagePrice)}
                            </td>
                            <td>
                                --
                            </td>
                        </tr>
                    </tbody>

                    {prasadSelected === "yes" && (
                        <tbody>
                            <tr>
                                <td>2</td>
                                <td className="payment-table-desc">
                                    <div>📦 Prasad Box</div>
                                </td>
                                <td>
                                    {templeDetails.nameEnglish}, {templeDetails.city}
                                </td>
                                <td>--</td>
                                <td>--</td>
                                <td>--</td>
                                <td className="payment-table-price" translate="no">
                                    {money(201)}
                                </td>
                                <td>--</td>
                            </tr>
                        </tbody>
                    )}
                </table>
            </div>


        </div>
    );
};
