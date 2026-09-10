"use client";

import React from "react";
import { Row, Col, Button } from "antd";
import { Field, ErrorMessage, FieldArray, FieldArrayRenderProps, FieldProps } from "formik";
import PujaTextField from "../TextField";
import Delete from '@mui/icons-material/Delete';

const groupArrayIntoPairs = (arr: any[]) => {
    const pairs = [];
    for (let i = 0; i < arr.length; i += 2) {
        pairs.push(arr.slice(i, i + 2));
    }
    return pairs;
};

interface UserDetailsFormProps {
    packageName: string;
    selectedPuja: any;
    formData: any[];
    bhaktaSectionRef?: React.RefObject<HTMLDivElement | null>;
    isMobile?: boolean;
}

export const UserDetailsForm: React.FC<UserDetailsFormProps> = ({
    packageName,
    selectedPuja,
    formData,
    bhaktaSectionRef,
    isMobile = false,
}) => {
    return (
        <>
            {/* Non-joint-family / non-vip Bhakta Section */}
            {packageName !== "jointFamilyPackage" && packageName !== "vipPackage" && (
                <div
                    ref={bhaktaSectionRef}
                    className={
                        isMobile
                            ? "mb-4 rounded-2xl bg-white/95 backdrop-blur-lg border border-black/[0.04] shadow-[0_4px_24px_rgba(0,0,0,0.04)] px-5 pt-4 pb-3"
                            : "w-full md:w-[48%] rounded-2xl bg-white/95 backdrop-blur-lg border border-black/[0.04] shadow-[0_4px_24px_rgba(0,0,0,0.04)] px-5 py-4"
                    }
                >
                    <div
                        className={
                            isMobile
                                ? "flex items-center gap-2 text-[15px] font-bold tracking-tight font-[Montserrat] text-[#1a1a1a]"
                                : "flex items-center gap-2 font-[Montserrat] text-[18px] font-bold tracking-tight text-[#1a1a1a]"
                        }
                    >
                        <span>
                            {selectedPuja?.title?.toLowerCase().includes("pitra")
                                ? "Fill the Name of the Bhakta and Pitra"
                                : "Fill the Name of the Bhakta"}
                        </span>
                    </div>
                    <div
                        className={
                            isMobile
                                ? "mt-1 mb-2 text-xs font-medium text-black/70 font-[Montserrat]"
                                : "mt-1 font-[Montserrat] text-[12px] font-medium text-black/70 mb-1%"
                        }
                    >
                        Panditji will {isMobile ? "take these names along with gotra " : "read the Sankalp for this name along with the Gotra "}
                        during the puja.
                    </div>

                    {isMobile
                        ? formData.map((field, index) => (
                            <Row gutter={[16, 10]} key={index} className="flex items-center justify-center">
                                <Col span={24} className="mt-1">
                                    <Field name={field.name}>
                                        {({ field: formikField }: { field: any }) => (
                                            <PujaTextField
                                                {...formikField}
                                                placeholder={`Enter ${field.label}`}
                                                labelText={field.label}
                                            />
                                        )}
                                    </Field>
                                    <div className="text-xs text-red-500 mt-1">
                                        <ErrorMessage name={field.name} />
                                    </div>
                                </Col>
                            </Row>
                        ))
                        : formData.map((field, index) =>
                            index % 2 === 0 ? (
                                <Row gutter={[16, 16]} key={index}>
                                    <Col xs={24} md={24} className="mt-2">
                                        <Field name={field.name}>
                                            {({ field: formikField }: FieldProps) => (
                                                <PujaTextField
                                                    {...formikField}
                                                    placeholder={`Enter ${field.label}`}
                                                    labelText={field.label}
                                                />
                                            )}
                                        </Field>
                                        <div className="text-red-500 text-xs mt-1">
                                            <ErrorMessage name={field.name} />
                                        </div>
                                    </Col>

                                    {formData[index + 1] && (
                                        <Col xs={24} md={24} className="mt-2">
                                            <Field name={formData[index + 1].name}>
                                                {({ field: formikField }: FieldProps) => (
                                                    <PujaTextField
                                                        {...formikField}
                                                        placeholder={`Enter ${formData[index + 1].label}`}
                                                        labelText={formData[index + 1].label}
                                                    />
                                                )}
                                            </Field>
                                            <div className="text-red-500 text-xs mt-1">
                                                <ErrorMessage name={formData[index + 1].name} />
                                            </div>
                                        </Col>
                                    )}
                                </Row>
                            ) : null
                        )}
                </div>
            )}

            {/* JointFamily / VIP Bhakta + Gotra arrays */}
            {(packageName === "jointFamilyPackage" || packageName === "vipPackage") && (
                <div className={isMobile ? "" : "w-full md:w-[48%]"}>
                    <FieldArray name="gotras">
                        {() => (
                            <FieldArray name="bhaktaNames">
                                {({ push: pushBhakta, remove: removeBhakta, form }: FieldArrayRenderProps) => {
                                    const handleAdd = () => {
                                        pushBhakta("");
                                        if (isMobile) {
                                            if (form.values.gotras) {
                                                form.setFieldValue("gotras", [...(form.values.gotras || []), ""]);
                                            }
                                        } else {
                                            form.setFieldValue("gotras", [...(form.values.gotras || []), ""]);
                                        }
                                    };

                                    const handleRemove = (idx: number) => {
                                        removeBhakta(idx);
                                        if (isMobile) {
                                            if (form.values.gotras) {
                                                const updatedGotras = [...form.values.gotras];
                                                updatedGotras.splice(idx, 1);
                                                form.setFieldValue("gotras", updatedGotras);
                                            }
                                        } else {
                                            const updatedGotras = [...form.values.gotras];
                                            updatedGotras.splice(idx, 1);
                                            form.setFieldValue("gotras", updatedGotras);
                                        }
                                    };

                                    const bhaktaPairs = groupArrayIntoPairs(form.values.bhaktaNames);
                                    const gotraPairs = groupArrayIntoPairs(form.values.gotras || []);

                                    return (
                                        <div
                                            className={
                                                isMobile
                                                    ? ""
                                                    : "rounded-2xl bg-white border border-amber-100 shadow-sm px-4 sm:px-5 py-4 sm:py-5 space-y-5"
                                            }
                                        >
                                            <div className={isMobile ? "rounded-2xl bg-white/95 backdrop-blur-lg border border-black/[0.04] shadow-[0_4px_24px_rgba(0,0,0,0.04)] px-5 py-4 mb-4" : ""}>
                                                {/* Header */}
                                                <div>
                                                    <h3 className={isMobile ? "text-base font-semibold flex items-center gap-2" : "text-base sm:text-lg font-semibold flex items-center gap-2"}>
                                                        <span>
                                                            {selectedPuja?.title?.toLowerCase().includes("pitra")
                                                                ? (isMobile ? "Fill the Name of the Bhakta and Pitra" : "Fill the Names of the Bhakta and Pitra")
                                                                : (isMobile ? "Fill the Name of the Bhakta" : "Fill the Names of the Bhakta")}
                                                        </span>
                                                    </h3>
                                                    <p className={isMobile ? "text-xs text-black/70 pb-2 pt-1" : "text-sm text-black/70 pt-1 pb-2"}>
                                                        Please enter the names of all Bhaktas participating in the puja.
                                                    </p>
                                                </div>

                                                {bhaktaPairs.map((pair, pairIndex) => (
                                                    <Row gutter={isMobile ? [16, 10] : [16, 16]} key={pairIndex} className="mt-1">
                                                        {pair.map((_, idx: number) => {
                                                            const bhaktaIndex = pairIndex * 2 + idx;
                                                            return (
                                                                <Col xs={24} sm={isMobile ? 12 : undefined} md={isMobile ? undefined : 24} span={isMobile ? 12 : undefined} key={bhaktaIndex} className={isMobile ? "mt-1" : "mt-2"}>
                                                                    <Field name={`bhaktaNames[${bhaktaIndex}]`}>
                                                                        {({ field }: FieldProps) => (
                                                                            <PujaTextField
                                                                                {...field}
                                                                                placeholder={`Enter Bhakta Name ${bhaktaIndex + 1}`}
                                                                                labelText={`Bhakta Name ${bhaktaIndex + 1}`}
                                                                            />
                                                                        )}
                                                                    </Field>
                                                                    <div className={isMobile ? "text-xs text-red-500 mt-1" : "text-red-500 text-xs mt-1"}>
                                                                        <ErrorMessage name={`bhaktaNames[${bhaktaIndex}]`} />
                                                                    </div>

                                                                    {bhaktaIndex >= 6 && (
                                                                        isMobile ? (
                                                                            <Delete
                                                                                className="mt-2 cursor-pointer text-red-500"
                                                                                onClick={() => handleRemove(bhaktaIndex)}
                                                                            />
                                                                        ) : (
                                                                            <div className="mt-2 flex justify-end">
                                                                                <button
                                                                                    type="button"
                                                                                    className="w-8 h-8 flex items-center justify-center rounded-full border border-red-300 text-red-500 hover:bg-red-50 transition"
                                                                                    onClick={() => handleRemove(bhaktaIndex)}
                                                                                >
                                                                                    <Delete />
                                                                                </button>
                                                                            </div>
                                                                        )
                                                                    )}
                                                                </Col>
                                                            );
                                                        })}
                                                    </Row>
                                                ))}

                                                {form.values.bhaktaNames.length < 15 && (
                                                    <Button
                                                        type="dashed"
                                                        onClick={handleAdd}
                                                        className={isMobile ? "w-full mt-3 rounded-full h-10" : ""}
                                                        style={!isMobile ? { width: "100%", marginTop: "10px", borderRadius: "9999px", height: 42 } : undefined}
                                                    >
                                                        Add People
                                                    </Button>
                                                )}
                                            </div>

                                            {/* Gotra list */}
                                            <div className={isMobile ? "mb-3 rounded-2xl bg-white/95 backdrop-blur-lg border border-black/[0.04] shadow-[0_4px_24px_rgba(0,0,0,0.04)] px-5 py-3" : ""}>
                                                <div className="flex items-center gap-2 font-[Montserrat] text-[18px] font-semibold">
                                                    <span className={isMobile ? "text-base" : ""}>Fill the Gotras</span>
                                                </div>
                                                <div className={isMobile ? "mt-1 mb-2 text-xs font-[Montserrat] font-medium text-black/70" : "mt-1 font-[Montserrat] text-[12px] font-medium text-black/70 mb-1%"}>
                                                    Gotras will be recited during the puja.
                                                </div>

                                                {gotraPairs.map((pair, pairIndex) => (
                                                    <Row gutter={isMobile ? [16, 10] : [16, 16]} key={pairIndex} className="mt-1">
                                                        {pair.map((_, idx: number) => {
                                                            const gotraIndex = pairIndex * 2 + idx;
                                                            return (
                                                                <Col xs={24} sm={isMobile ? 12 : undefined} md={isMobile ? undefined : 24} span={isMobile ? 12 : undefined} key={gotraIndex} className={isMobile ? "mt-1" : "mt-2"}>
                                                                    <Field name={`gotras[${gotraIndex}]`}>
                                                                        {({ field }: FieldProps) => (
                                                                            <PujaTextField
                                                                                {...field}
                                                                                placeholder={`Enter Gotra ${gotraIndex + 1}`}
                                                                                labelText={`Gotra ${gotraIndex + 1}`}
                                                                            />
                                                                        )}
                                                                    </Field>
                                                                    <div className={isMobile ? "text-xs text-red-500 mt-1" : "text-red-500 text-xs mt-1"}>
                                                                        <ErrorMessage name={`gotras[${gotraIndex}]`} />
                                                                    </div>
                                                                </Col>
                                                            );
                                                        })}
                                                    </Row>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                }}
                            </FieldArray>
                        )}
                    </FieldArray>
                </div>
            )}

            {/* Single Gotra Section */}
            {packageName !== "jointFamilyPackage" && packageName !== "vipPackage" && (
                <div className={isMobile ? "mb-3 rounded-2xl bg-white/95 backdrop-blur-lg border border-black/[0.04] shadow-[0_4px_24px_rgba(0,0,0,0.04)] px-5 pt-4 pb-3" : "w-full md:w-[48%] rounded-2xl bg-white/95 backdrop-blur-lg border border-black/[0.04] shadow-[0_4px_24px_rgba(0,0,0,0.04)] px-5 py-4 mb-1"}>
                    <div className={isMobile ? "flex items-center gap-2 text-[15px] font-bold tracking-tight font-[Montserrat] text-[#1a1a1a]" : "flex items-center gap-2 font-[Montserrat] text-[18px] font-bold tracking-tight text-[#1a1a1a]"}>
                        <span>Fill the Gotra</span>
                    </div>
                    <div className={isMobile ? "mt-1 mb-0 text-xs font-[Montserrat] font-medium text-black/70" : "mt-1 font-[Montserrat] text-[12px] font-medium text-black/70 mb-1%"}>
                        Gotra will be recited during the puja.
                    </div>

                    <Row gutter={isMobile ? [16, 10] : [16, 16]}>
                        <Col xs={24} md={24} span={isMobile ? 24 : undefined} className="mt-2">
                            <Field name="gotra">
                                {({ field: formikField }: FieldProps) => (
                                    <PujaTextField
                                        {...formikField}
                                        placeholder="Enter Gotra"
                                        labelText="Enter Gotra"
                                    />
                                )}
                            </Field>
                            <div className={isMobile ? "text-xs text-red-500 mt-1" : "text-red-500 text-xs mt-1"}>
                                <ErrorMessage name="gotra" />
                            </div>
                        </Col>
                    </Row>
                </div>
            )}
        </>
    );
};
