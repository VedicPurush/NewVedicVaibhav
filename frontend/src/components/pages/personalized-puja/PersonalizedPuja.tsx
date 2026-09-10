"use client";

import React, { useEffect, useState } from "react";
import Layout from "@/components/layout/Layout";
import { Formik, Form, Field, FieldArray } from "formik";
import type { FormikHelpers } from "formik";
import * as Yup from "yup";
import { Input, Button, Col, Row, DatePicker } from "antd";
import Swal from "sweetalert2";
import { useRouter } from "next/navigation";

import CarouselComponent from "./Carousel";
import dayjs, { Dayjs } from "dayjs"; // Use Day.js
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { api } from "@/lib/api";

// Extend Day.js with necessary plugins
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

interface FormValues {
  firstName: string;
  lastName: string;
  fullName: string[];
  gotra: string[];
  mobile: string;
  email: string;
  problemName: string;
  description: string;
  poojaDate: string; // Storing as 'YYYY-MM-DD'
}

const PersonalizedPuja = () => {
  return (
    <div>
      <Layout
        content={<PersonalizedPujaContent />}
        activeIndex="personalizedPuja"
      />
    </div>
  );
};

export default PersonalizedPuja;

const PersonalizedPujaContent = () => {
  // Validation Schema
  const validationSchema = Yup.object().shape({
    firstName: Yup.string().required("First name is required."),
    lastName: Yup.string().required("Last name is required."),
    fullName: Yup.array()
      .of(Yup.string().required("Full name is required."))
      .min(1, "At least one Full Name is required."),
    gotra: Yup.array()
      .of(Yup.string().required("Gotra is required."))
      .min(1, "At least one Gotra is required."),
    mobile: Yup.string()
      .matches(/^\d{10}$/, "Mobile number must be exactly 10 digits.")
      .required("Mobile number is required."),
    email: Yup.string()
      .email("Invalid email format.")
      .required("Email is required."),
    problemName: Yup.string().required("Purpose is required."),
    description: Yup.string().required("Description is required."),
    poojaDate: Yup.string()
      .required("Pooja Date is required.")
      .test("is-valid-date", "Invalid date format.", (value) =>
        dayjs(value, "YYYY-MM-DD", true).isValid()
      ),
  });

  // Pre-fill from localStorage if available (hydrated after mount — SSR safe)
  const [userDetails, setUserDetails] = useState<any>({});
  useEffect(() => {
    try {
      setUserDetails(JSON.parse(localStorage.getItem("userDetails") || "{}"));
    } catch {
      setUserDetails({});
    }
  }, []);
  const prefilledEmail = userDetails.user?.email || "";
  const prefilledMobile = userDetails.user?.phone?.replace(/\D/g, "") || "";

  // Initial Form Values
  const initialValues: FormValues = {
    firstName: "",
    lastName: "",
    fullName: [""],
    gotra: [""],
    mobile: prefilledMobile,
    email: prefilledEmail,
    problemName: "",
    description: "",
    poojaDate: "",
  };

  // Toast setup
  const Toast = Swal.mixin({
    toast: true,
    position: "center",
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    customClass: {
      popup: "attractive-toast-popup",
    },
    didOpen: (toast) => {
      toast.style.color = "#ffffff";
      toast.style.boxShadow = "0px 0px 10px rgba(0,0,0,0.2)";
    },
  });

  const router = useRouter();

  // Disable all dates before (today + 6 days)
  const today = dayjs().startOf("day");
  const disableDates = (current: Dayjs) => {
    // Disable up to (today + 5 days).
    // The earliest selectable date is 6 days from now.
    return current.isBefore(today.add(6, "day"), "day");
  };

  // Handle Form Submission
  const handleSubmit = async (
    values: FormValues,
    { setSubmitting, resetForm }: FormikHelpers<FormValues>
  ) => {
    const userID = userDetails?.user?._id;

    const requestData = {
      ...values,
      userID,
      // Ensure the date is stored in YYYY-MM-DD
      poojaDate: dayjs(values.poojaDate).format("YYYY-MM-DD"),
    };

    try {
      // Show 'processing' toast
      Swal.fire({
        toast: true,
        icon: "info",
        title: "<strong>Submitting your request...</strong>",
        position: "center",
        showConfirmButton: false,
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
        customClass: {
          popup: "processing-toast",
        },
      });

      // Post request
      await api.post(`/add-personalized-pooja-booking`, requestData);

      // Close 'processing' toast
      Swal.close();

      // Show success
      Toast.fire({
        iconHtml: "✅",
        title: "<strong>Request submitted successfully!</strong>",
        didOpen: (toast) => {
          toast.style.background = "linear-gradient(135deg, #28a745, #28d745)";
          toast.style.color = "#ffffff";
          toast.style.boxShadow = "0px 0px 20px rgba(0,0,0,0.3)";
          toast.style.fontSize = "18px";
        },
      });

      // Navigate to the personalized-bookings tab (legacy passed selectedKey "4"
      // via router state; the profile page now reads a ?tab= slug).
      router.push("/profile?tab=personalized");
      resetForm();
    } catch (error: any) {
      Swal.close();

      // Show error
      Toast.fire({
        iconHtml: "❌",
        title:
          "<strong>" +
          (error.response?.data?.message || "Error submitting form") +
          "</strong>",
        didOpen: (toast) => {
          toast.style.background = "linear-gradient(135deg, #FF4B2B, #FF416C)";
          toast.style.color = "#ffffff";
          toast.style.boxShadow = "0px 0px 20px rgba(0,0,0,0.3)";
          toast.style.fontSize = "18px";
        },
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Some styling
  const inputStyle = {
    borderRadius: "8px",
    borderColor: "rgba(0,0,0,0.4)",
    color: "#2b2b2b",
  } as React.CSSProperties;

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {/* Desktop Banner */}
      <Col xl={24} lg={24} md={24} xs={0} sm={0}>
        <div style={{ position: "relative" }}>
          <img loading="lazy"
            src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/pooja-images/personalizedbanner.png"
            alt="Personalized Pooja Banner"
            style={{ width: "100%", height: "auto" }}
          />
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%,-50%)",
              color: "white",
              fontSize: "30px",
              fontWeight: "500",
              display: "flex",
              flexDirection: "column",
              textAlign: "center",
            }}
          >
            <div style={{ fontFamily: "Kodchasan", fontWeight: "700" }}>
              Want to Book
            </div>
            <div style={{ fontFamily: "Kodchasan", fontWeight: "700" }}>
              Puja, Shringar & Hawan ?
            </div>
          </div>
        </div>
      </Col>

      {/* Mobile Banner */}
      <Col xl={0} lg={0} md={0} xs={24} sm={24}>
        <div style={{ width: "100%" }}>
          <img loading="lazy"
            src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/pooja-images/banner_contact.png"
            style={{ width: "100%", height: "auto" }}
            alt="Mobile Banner"
          />
        </div>
      </Col>

      {/* Mobile Text Overlay */}
      <Col xl={0} lg={0} md={0} xs={24} sm={24}>
        <div
          style={{
            fontSize: "20px",
            fontWeight: "700",
            display: "flex",
            flexDirection: "column",
            textAlign: "center",
            paddingTop: "10px",
          }}
        >
          <div style={{ fontFamily: "Kodchasan", fontWeight: "700" }}>
            Want to Book
          </div>
          <div style={{ fontFamily: "Kodchasan", fontWeight: "700" }}>
            Puja, Shringar & Hawan ?
          </div>
        </div>
      </Col>

      {/* Steps Image (Desktop) */}
      <Col xl={24} lg={24} md={24} xs={0} sm={0}>
        <div
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "center",
            marginBlock: "2%",
          }}
        >
          <img loading="lazy"
            src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/pooja-images/steps.png"
            style={{ width: "50%", height: "auto" }}
            alt="Booking Steps"
          />
        </div>
      </Col>

      {/* Carousel (Mobile) */}
      <Col xl={0} lg={0} md={0} xs={24} sm={24}>
        <div style={{ paddingBlock: "7%" }}>
          <CarouselComponent />
        </div>
      </Col>

      {/* Form Section */}
      <div
        style={{
          background: "linear-gradient(to bottom, #209CBE, #FFFFFF)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <Formik<FormValues>
              initialValues={initialValues}
              validationSchema={validationSchema}
              validateOnMount={true}
              enableReinitialize={true}
              onSubmit={handleSubmit}
            >
              {({
                values,
                errors,
                touched,
                isSubmitting,
                isValid,
                setFieldValue,
              }) => (
                <Form>
                  <div style={{ marginInline: "6%" }}>
                    {/* Contact Information Section */}
                    <div
                      style={{
                        background: "white",
                        padding: "20px",
                        borderRadius: "12px",
                        marginBlock: "2%",
                        boxShadow: "0px 4px 8px rgba(0,0,0,0.4)",
                      }}
                    >
                      <h2 style={{ fontSize: "18px", marginBottom: "20px" }}>
                        Contact Information
                      </h2>
                      <Row gutter={[16, 16]}>
                        {/* First Name */}
                        <Col xs={24} sm={12} md={8}>
                          <label htmlFor="firstName">First Name*</label>
                          <Field name="firstName">
                            {({ field }: any) => (
                              <Input
                                {...field}
                                id="firstName"
                                placeholder="First Name"
                                maxLength={50}
                                onChange={(e) => {
                                  setFieldValue("firstName", e.target.value.replace(/[^a-zA-Z\s\-\.]/g, ""));
                                }}
                                style={inputStyle}
                                aria-label="First Name"
                              />
                            )}
                          </Field>
                          {touched.firstName && errors.firstName && (
                            <div style={{ color: "red", fontSize: "12px" }}>
                              {errors.firstName}
                            </div>
                          )}
                        </Col>

                        {/* Last Name */}
                        <Col xs={24} sm={12} md={8}>
                          <label htmlFor="lastName">Last Name*</label>
                          <Field name="lastName">
                            {({ field }: any) => (
                              <Input
                                {...field}
                                id="lastName"
                                placeholder="Last Name"
                                maxLength={50}
                                onChange={(e) => {
                                  setFieldValue("lastName", e.target.value.replace(/[^a-zA-Z\s\-\.]/g, ""));
                                }}
                                style={inputStyle}
                                aria-label="Last Name"
                              />
                            )}
                          </Field>
                          {touched.lastName && errors.lastName && (
                            <div style={{ color: "red", fontSize: "12px" }}>
                              {errors.lastName}
                            </div>
                          )}
                        </Col>

                        {/* Mobile */}
                        <Col xs={24} sm={12} md={8}>
                          <label htmlFor="mobile">Mobile*</label>
                          <Field name="mobile">
                            {({ field }: any) => (
                              <Input
                                {...field}
                                id="mobile"
                                placeholder="Enter 10-digit mobile number"
                                type="tel"
                                maxLength={10}
                                prefix={
                                  <div className="flex items-center gap-1 font-medium text-black/70 mr-1">
                                    🇮🇳 +91
                                  </div>
                                }
                                onChange={(e) => {
                                  setFieldValue("mobile", e.target.value.replace(/\D/g, "").slice(0, 10));
                                }}
                                style={inputStyle}
                                aria-label="Mobile Number"
                              />
                            )}
                          </Field>
                          {touched.mobile && errors.mobile && (
                            <div style={{ color: "red", fontSize: "12px" }}>
                              {errors.mobile}
                            </div>
                          )}
                        </Col>
                      </Row>

                      <Row gutter={[16, 16]} style={{ marginTop: "20px" }}>
                        {/* Email */}
                        <Col xs={24} sm={12} md={8}>
                          <label htmlFor="email">Email*</label>
                          <Field name="email">
                            {({ field }: any) => (
                              <Input
                                {...field}
                                id="email"
                                type="email"
                                maxLength={100}
                                placeholder="Email Address"
                                style={inputStyle}
                                aria-label="Email Address"
                              />
                            )}
                          </Field>
                          {touched.email && errors.email && (
                            <div style={{ color: "red", fontSize: "12px" }}>
                              {errors.email}
                            </div>
                          )}
                        </Col>

                        {/* Purpose (problemName) */}
                        <Col xs={24} sm={12} md={8}>
                          <label htmlFor="problemName">Purpose*</label>
                          <Field name="problemName">
                            {({ field }: any) => (
                              <Input
                                {...field}
                                id="problemName"
                                placeholder="Purpose"
                                maxLength={100}
                                style={inputStyle}
                                aria-label="Purpose"
                              />
                            )}
                          </Field>
                          {touched.problemName && errors.problemName && (
                            <div style={{ color: "red", fontSize: "12px" }}>
                              {errors.problemName}
                            </div>
                          )}
                        </Col>

                        {/* Pooja Date */}
                        <Col xs={24} sm={12} md={8}>
                          <label htmlFor="poojaDate">Date*</label>
                          <DatePicker
                            id="poojaDate"
                            style={{ width: "100%" }}
                            disabledDate={disableDates}
                            format="YYYY-MM-DD"
                            // Correct usage of onChange
                            onChange={(_date, dateString) => {
                              setFieldValue("poojaDate", dateString);
                            }}
                            value={
                              values.poojaDate
                                ? dayjs(values.poojaDate, "YYYY-MM-DD")
                                : null
                            }
                            aria-label="Pooja Date"
                          />
                          {touched.poojaDate && errors.poojaDate && (
                            <div style={{ color: "red", fontSize: "12px" }}>
                              {errors.poojaDate}
                            </div>
                          )}
                        </Col>
                      </Row>

                      <Row gutter={[16, 16]} style={{ marginTop: "20px" }}>
                        {/* Description */}
                        <Col xs={24}>
                          <label htmlFor="description">Description*</label>
                          <Field name="description">
                            {({ field }: any) => (
                              <Input.TextArea
                                {...field}
                                id="description"
                                rows={4}
                                maxLength={1000}
                                placeholder="Description"
                                style={{ ...inputStyle, resize: "none" }}
                                aria-label="Description"
                              />
                            )}
                          </Field>
                          {touched.description && errors.description && (
                            <div style={{ color: "red", fontSize: "12px" }}>
                              {errors.description}
                            </div>
                          )}
                        </Col>
                      </Row>
                    </div>

                    {/* Participant Details */}
                    <div
                      style={{
                        background: "white",
                        padding: "20px",
                        borderRadius: "12px",
                        marginBottom: "2%",
                        boxShadow: "0px 4px 8px rgba(0,0,0,0.4)",
                      }}
                    >
                      <h3 style={{ fontSize: "18px", marginBottom: "20px" }}>
                        Participant Details
                      </h3>
                      <FieldArray name="fullName">
                        {({ push, remove }) => (
                          <>
                            {values.fullName.map((_, index) => (
                              <Row
                                key={index}
                                gutter={[16, 16]}
                                style={{ marginBottom: "1%" }}
                              >
                                {/* Full Name */}
                                <Col xs={24} sm={12} md={10}>
                                  <label htmlFor={`fullName.${index}`}>
                                    Full Name*
                                  </label>
                                  <Field name={`fullName.${index}`}>
                                    {({ field }: any) => (
                                      <Input
                                        {...field}
                                        placeholder="Full Name"
                                        maxLength={100}
                                        onChange={(e) => {
                                          setFieldValue(`fullName.${index}`, e.target.value.replace(/[^a-zA-Z\s\-\.]/g, ""));
                                        }}
                                        style={inputStyle}
                                        aria-label={`Full Name ${index + 1}`}
                                      />
                                    )}
                                  </Field>
                                  {Array.isArray(touched.fullName) &&
                                    touched.fullName[index] &&
                                    Array.isArray(errors.fullName) &&
                                    errors.fullName[index] && (
                                      <div
                                        style={{
                                          color: "red",
                                          fontSize: "12px",
                                        }}
                                      >
                                        {errors.fullName[index]}
                                      </div>
                                    )}
                                </Col>

                                {/* Gotra */}
                                <Col xs={24} sm={12} md={10}>
                                  <label htmlFor={`gotra.${index}`}>
                                    Gotra*
                                  </label>
                                  <Field name={`gotra.${index}`}>
                                    {({ field }: any) => (
                                      <Input
                                        {...field}
                                        placeholder="Gotra"
                                        maxLength={50}
                                        onChange={(e) => {
                                          setFieldValue(`gotra.${index}`, e.target.value.replace(/[^a-zA-Z\s\-\.]/g, ""));
                                        }}
                                        style={inputStyle}
                                        aria-label={`Gotra ${index + 1}`}
                                      />
                                    )}
                                  </Field>
                                  {Array.isArray(touched.gotra) &&
                                    touched.gotra[index] &&
                                    Array.isArray(errors.gotra) &&
                                    errors.gotra[index] && (
                                      <div
                                        style={{
                                          color: "red",
                                          fontSize: "12px",
                                        }}
                                      >
                                        {errors.gotra[index]}
                                      </div>
                                    )}
                                </Col>

                                {/* Remove Button */}
                                <Col xs={24} sm={12} md={4}>
                                  {index > 0 && (
                                    <Button
                                      danger
                                      type="text"
                                      onClick={() => remove(index)}
                                      style={{ marginTop: "32px" }}
                                    >
                                      Remove
                                    </Button>
                                  )}
                                </Col>
                              </Row>
                            ))}
                            <Button
                              style={{
                                marginTop: "20px",
                                border: "1px dashed rgba(0,0,0,0.6)",
                                width: "100%",
                              }}
                              onClick={() => {
                                push("");
                                // Also push a gotra entry
                                const newGotra = [...values.gotra, ""];
                                setFieldValue("gotra", newGotra);
                              }}
                            >
                              Add Participant
                            </Button>
                          </>
                        )}
                      </FieldArray>
                    </div>

                    {/* Submit Button */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        width: "100%",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <Button
                        type="primary"
                        htmlType="submit"
                        className="custom-submit-button"
                        style={{
                          backgroundColor: "#F4450F",
                          boxShadow: "0px 0px 4px 0px rgba(0,0,0,0.4)",
                          borderRadius: "10px",
                          width: "40%",
                          fontSize: "16px",
                          marginTop: "1.5%",
                          marginBottom: "1%",
                          paddingBlock: "1.5%",
                          paddingInline: "16px",
                          color: "white",
                        }}
                        disabled={isSubmitting || !isValid}
                      >
                        {isSubmitting ? "Submitting..." : "Submit Request"}
                      </Button>

                      <style>
                        {`
    @media (max-width: 768px) {
      .custom-submit-button {
        width: 100% !important;
        padding-left: 24px !important;
        padding-right: 24px !important;
      }
    }
  `}
                      </style>

                      <div
                        style={{
                          fontFamily: "Kodchasan",
                          fontSize: "16px",
                          marginBottom: "2%",
                        }}
                      >
                        Prasad Will Be Delivered At Your Home
                      </div>
                    </div>
                  </div>

                  {/* Form Banner */}
                  <Col span={24}>
                    <img loading="lazy"
                      src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/pooja-images/formbannerpersonalized.png"
                      style={{ width: "100%", height: "auto" }}
                      alt="Form Banner"
                    />
                  </Col>
                </Form>
              )}
            </Formik>
          </div>
        </div>
      </div>
    </div>
  );
};
