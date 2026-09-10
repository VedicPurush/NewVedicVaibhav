"use client";

import React from "react";
import { Row, Col, Spin } from "antd";
import { Field, ErrorMessage } from "formik";
import PujaTextField from "../TextField";

interface ContactAndShippingFormProps {
    values: any;
    setFieldValue: (field: string, value: any, shouldValidate?: boolean) => void;
    pincodeLoading: boolean;
    handlePincodeChange: (e: React.ChangeEvent<HTMLInputElement>, setFieldValue: any) => void;
    serviceAvailable: boolean | null;
    cheapestCourier: any;
    estimatedDays: string;
    pincodeErrorMessage: string;
    isMobile?: boolean;
}

export const ContactAndShippingForm: React.FC<ContactAndShippingFormProps> = ({
    values,
    setFieldValue,
    pincodeLoading,
    handlePincodeChange,
    serviceAvailable,
    cheapestCourier,
    estimatedDays,
    pincodeErrorMessage,
    isMobile = false,
}) => {
    const normalizeMobile = (mobile: string) => {
        const digits = (mobile || "").replace(/\D/g, "");
        if (digits.length <= 10) return digits;
        if (digits.startsWith("91")) return digits.slice(-10);
        return digits.slice(-10);
    };

    return (
        <div className="space-y-4">
            {/* Unified Contact and Devotee Info Section */}
            <div
                className={
                    isMobile
                        ? "mb-4 rounded-2xl bg-white/95 backdrop-blur-lg border border-black/[0.04] shadow-[0_4px_24px_rgba(0,0,0,0.04)] px-5 py-5 space-y-3"
                        : "rounded-2xl bg-white/95 backdrop-blur-lg border border-black/[0.04] shadow-[0_4px_24px_rgba(0,0,0,0.04)] px-5 sm:px-6 py-5 sm:py-6 space-y-4"
                }
            >
                <div className="flex items-center gap-2">
                    <h3 className={isMobile ? "text-[15px] font-bold tracking-tight flex items-center gap-2 text-[#1a1a1a]" : "text-base sm:text-lg font-bold tracking-tight text-[#1a1a1a]"}>
                        <span className="text-amber-700">📞</span> {isMobile ? "Your contact details" : "Confirm your contact details"}
                    </h3>
                </div>

                <Row gutter={isMobile ? [16, 12] : [16, 16]} className={isMobile ? "mt-1" : ""} style={!isMobile ? { marginTop: "1%" } : {}}>
                    <Col xs={24} md={12}>
                        <Field name="mobile">
                            {({ field, form }: { field: any; form: any }) => (
                                <PujaTextField
                                    {...field}
                                    labelText="Mobile Number"
                                    placeholder="Enter mobile number"
                                    maxLength={10}
                                    prefix="+91"
                                    prefixIcon={<>🇮🇳</>}
                                    onChange={(e: any) =>
                                        form.setFieldValue(
                                            "mobile",
                                            normalizeMobile(e.target.value)
                                        )
                                    }
                                />
                            )}
                        </Field>
                        <div className="text-red-500 text-xs mt-1">
                            <ErrorMessage name="mobile" />
                        </div>
                    </Col>
                    
                    <Col xs={24} md={12}>
                        <Field name="email">
                            {({ field }: { field: any }) => (
                                <PujaTextField
                                    {...field}
                                    labelText="Email ID (Optional)"
                                    placeholder="Enter email ID"
                                />
                            )}
                        </Field>
                        <div className="text-red-500 text-xs mt-1">
                            <ErrorMessage name="email" />
                        </div>
                    </Col>
                </Row>
            </div>

            {/* Conditional Shipping Address Section - Only if prasad is 'yes' */}
            {values.prasad === "yes" && (
                <div
                    className={
                        isMobile
                            ? "mb-4 rounded-2xl bg-white/95 backdrop-blur-lg border border-black/[0.04] shadow-[0_4px_24px_rgba(0,0,0,0.04)] px-5 py-5 space-y-3"
                            : "rounded-2xl bg-white/95 backdrop-blur-lg border border-black/[0.04] shadow-[0_4px_24px_rgba(0,0,0,0.04)] px-5 sm:px-6 py-5 sm:py-6 space-y-4"
                    }
                >
                    <div className={isMobile ? "flex items-center gap-2 text-base font-semibold" : "mt-1"}>
                        <h1 className={isMobile ? "text-base font-semibold flex items-center gap-2" : "text-base sm:text-lg font-semibold flex items-center gap-2"}>
                            <span className="text-lg">🏠</span> Shipping Address
                        </h1>
                    </div>

                    <Row gutter={isMobile ? [16, 10] : [16, 16]} className={isMobile ? "mt-2" : ""} style={!isMobile ? { marginTop: "8px" } : {}}>
                        <Col span={24}>
                            <Field name="address1">
                                {({ field }: { field: any }) => (
                                    <PujaTextField {...field} labelText="Address Lane 1" placeholder="House no., Building, Street" />
                                )}
                            </Field>
                            <div className="text-red-500 text-xs mt-1">
                                <ErrorMessage name="address1" />
                            </div>
                        </Col>

                        <Col span={24}>
                            <Field name="address2">
                                {({ field }: { field: any }) => (
                                    <PujaTextField {...field} labelText="Address Lane 2 (optional)" placeholder="Area, Landmark" />
                                )}
                            </Field>
                        </Col>

                        <Col span={24}>
                            <Field name="pincode">
                                {({ field }: { field: any }) => (
                                    <div className="flex items-center">
                                        <div className="flex-1">
                                            <PujaTextField
                                                {...field}
                                                labelText="Pincode"
                                                placeholder="6-digit pincode"
                                                onChange={(e: any) => handlePincodeChange(e, setFieldValue)}
                                            />
                                        </div>
                                        {pincodeLoading && (
                                            <Spin size="small" style={{ marginLeft: "12px", marginTop: "15px" }} />
                                        )}
                                    </div>
                                )}
                            </Field>
                            <div className="text-red-500 text-xs mt-1">
                                <ErrorMessage name="pincode" />
                            </div>

                            {serviceAvailable === true && cheapestCourier && (
                                <div className="text-green-700 text-xs mt-1 pl-1">
                                    ✓ Delivery is available. Estimated delivery in {estimatedDays || "X"} days.
                                </div>
                            )}

                            {serviceAvailable === false && pincodeErrorMessage && (
                                <div className="text-red-500 text-xs mt-1 pl-1">
                                    {pincodeErrorMessage}
                                </div>
                            )}
                        </Col>

                        <Col span={24} md={12}>
                            <Field name="city">
                                {({ field }: { field: any }) => (
                                    <PujaTextField {...field} labelText="City" />
                                )}
                            </Field>
                            <div className="text-red-500 text-xs mt-1">
                                <ErrorMessage name="city" />
                            </div>
                        </Col>

                        <Col span={24} md={12}>
                            <Field name="state">
                                {({ field }: { field: any }) => (
                                    <PujaTextField {...field} labelText="State" />
                                )}
                            </Field>
                            <div className="text-red-500 text-xs mt-1">
                                <ErrorMessage name="state" />
                            </div>
                        </Col>

                        <Col span={24}>
                            <Field name="country">
                                {({ field }: { field: any }) => (
                                    <PujaTextField {...field} labelText="Country" />
                                )}
                            </Field>
                            <div className="text-red-500 text-xs mt-1">
                                <ErrorMessage name="country" />
                            </div>
                        </Col>
                    </Row>
                </div>
            )}
        </div>
    );
};
