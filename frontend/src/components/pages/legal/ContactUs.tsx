"use client";

import { Col, Row } from "antd";
import { Formik, Field, Form } from "formik";
import * as Yup from "yup";
import Swal from "sweetalert2";
import QuestionAnswerIcon from "@mui/icons-material/QuestionAnswer";
import FmdGoodIcon from "@mui/icons-material/FmdGood";
import CallIcon from "@mui/icons-material/Call";
import Layout from "@/components/layout/Layout";
import React, { useState } from "react";
import { api } from "@/lib/api";

const ContactUs = () => {
  return (
    <>
      <Layout content={<ContactUsContent />} />
    </>
  );
};

export default ContactUs;

const ContactUsContent = () => {
  // Modal states for viewing an image
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Open the modal with the selected image's URL
  const handleOpenModal = (file: File) => {
    const imageUrl = URL.createObjectURL(file);
    setSelectedImage(imageUrl);
    setShowModal(true);
  };

  // Close the modal
  const handleCloseModal = () => {
    setSelectedImage(null);
    setShowModal(false);
  };

  const validationSchema = Yup.object({
    fullName: Yup.string()
      .required("Full name is required")
      .min(2, "Too short!"),
    email: Yup.string()
      .email("Invalid email address")
      .required("Email is required"),
    phoneNumber: Yup.string()
      .matches(/^[0-9]{10}$/, "Phone number must be 10 digits")
      .required("Phone number is required"),
    message: Yup.string().required("Message is required"),
    // problemImage is optional, so no validation needed
  });

  const handleSubmit = async (values: any, { resetForm }: any) => {
    try {
      const formData = new FormData();
      formData.append("name", values.fullName);
      formData.append("email", values.email);
      formData.append("number", values.phoneNumber);
      formData.append("description", values.message);

      // Append multiple images if present
      if (values.problemImage && values.problemImage.length > 0) {
        for (let i = 0; i < values.problemImage.length; i++) {
          formData.append("problemImage", values.problemImage[i]);
        }
      }

      const response = await api.post(`/contact-us-mail`, formData);

      if (response.status === 200) {
        Swal.fire({
          icon: "success",
          title: "🙏 Message Sent!",
          text: "We'll get back to you within 24 hours.",
          showConfirmButton: false,
          timer: 2000,
        });
        resetForm();
      }
    } catch (error: any) {
      console.error("Error submitting contact form:", error);
      Swal.fire({
        icon: "error",
        title: "Oops!",
        text:
          error.response?.data?.message ||
          "Something went wrong. Please try again later.",
      });
    }
  };

  const widgetcontact = () => {
    return (
      <div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              paddingTop: "2%",
              paddingInline: "7%",
              borderRadius: "10px",
              boxShadow: "0 0 10px rgba(0,0,0,0.1)",
              fontFamily: "Arial, sans-serif",
              backgroundColor: "#fff",
            }}
          >
            <h1
              style={{
                fontSize: "28px",
                marginBottom: "10px",
                fontWeight: "bold",
              }}
            >
              Contact Vedic Vaibhav: We&rsquo;re Here to Help
            </h1>
            <p style={{ marginBottom: "5px" }}>
              Have any questions about our <strong>online puja services</strong>{" "}
              or spiritual offerings? Feel free to reach out using the form
              below, and our team will get back to you within 24 hours.
            </p>
            <p style={{ marginBottom: "20px" }}>
              Whether it&apos;s a query regarding a service, feedback on our
              platform, or help with booking a puja, we are here to assist.
            </p>

            <Formik
              initialValues={{
                fullName: "",
                email: "",
                phoneNumber: "",
                message: "",
                problemImage: [] as File[] | null,
              }}
              validationSchema={validationSchema}
              onSubmit={handleSubmit}
            >
              {({ errors, touched, isSubmitting, setFieldValue, values }) => (
                <Form>
                  <div
                    style={{
                      display: "flex",
                      flexDirection:
                        typeof window !== "undefined" &&
                        window.matchMedia("(min-width: 768px)").matches
                          ? "row"
                          : "column",
                      gap: "15px",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <label>Full Name*</label>
                      <Field
                        name="fullName"
                        type="text"
                        placeholder="Enter your full name"
                        style={{
                          width: "100%",
                          padding: "10px",
                          margin: "5px 0",
                          borderRadius: "5px",
                          border: `1px solid ${errors.fullName && touched.fullName ? "red" : "#ccc"
                            }`,
                        }}
                      />
                      {errors.fullName && touched.fullName && (
                        <div
                          style={{
                            color: "red",
                            fontSize: "12px",
                            marginTop: "5px",
                          }}
                        >
                          {errors.fullName}
                        </div>
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "15px",
                      marginTop: "10px",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <label>Email*</label>
                      <Field
                        name="email"
                        type="email"
                        placeholder="Enter your email"
                        style={{
                          width: "100%",
                          padding: "10px",
                          margin: "5px 0",
                          borderRadius: "5px",
                          border: `1px solid ${errors.email && touched.email ? "red" : "#ccc"
                            }`,
                        }}
                      />
                      {errors.email && touched.email && (
                        <div
                          style={{
                            color: "red",
                            fontSize: "12px",
                            marginTop: "5px",
                          }}
                        >
                          {errors.email}
                        </div>
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "15px",
                      marginTop: "10px",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <label>Phone Number*</label>
                      <Field
                        name="phoneNumber"
                        type="text"
                        placeholder="Enter your phone number"
                        style={{
                          width: "100%",
                          padding: "10px",
                          margin: "5px 0",
                          borderRadius: "5px",
                          border: `1px solid ${errors.phoneNumber && touched.phoneNumber
                            ? "red"
                            : "#ccc"
                            }`,
                        }}
                      />
                      {errors.phoneNumber && touched.phoneNumber && (
                        <div
                          style={{
                            color: "red",
                            fontSize: "12px",
                            marginTop: "5px",
                          }}
                        >
                          {errors.phoneNumber}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ marginTop: "10px" }}>
                    <label>Message*</label>
                    <Field
                      name="message"
                      as="textarea"
                      placeholder="Enter your message"
                      style={{
                        width: "100%",
                        height: "100px",
                        padding: "10px",
                        margin: "5px 0",
                        borderRadius: "5px",
                        border: `1px solid ${errors.message && touched.message ? "red" : "#ccc"
                          }`,
                      }}
                    />
                    {errors.message && touched.message && (
                      <div
                        style={{
                          color: "red",
                          fontSize: "12px",
                          marginTop: "5px",
                        }}
                      >
                        {errors.message}
                      </div>
                    )}
                  </div>

                  {/* Multiple Image Upload Field */}
                  <div style={{ marginTop: "10px" }}>
                    <label>Upload Problem Image(s) (Optional)</label>
                    <input
                      id="problemImage"
                      name="problemImage"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(
                        event: React.ChangeEvent<HTMLInputElement>
                      ) => {
                        if (
                          event.currentTarget.files &&
                          event.currentTarget.files.length > 0
                        ) {
                          // Store all selected files
                          setFieldValue(
                            "problemImage",
                            event.currentTarget.files
                          );
                        } else {
                          setFieldValue("problemImage", []);
                        }
                      }}
                      style={{
                        width: "100%",
                        padding: "10px",
                        margin: "5px 0",
                        borderRadius: "5px",
                        border: "1px solid #ccc",
                      }}
                    />
                  </div>

                  {/* Thumbnails preview */}
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "10px",
                      marginTop: "10px",
                    }}
                  >
                    {values.problemImage &&
                      Array.from(values.problemImage).map(
                        (file: File, index: number) => (
                          <div key={index}>
                            <img loading="lazy"
                              src={URL.createObjectURL(file)}
                              alt={file.name}
                              style={{
                                width: "80px",
                                height: "80px",
                                objectFit: "cover",
                                cursor: "pointer",
                              }}
                              onClick={() => handleOpenModal(file)}
                            />
                          </div>
                        )
                      )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                      backgroundColor: isSubmitting ? "#ccc" : "#ff6600",
                      color: "#fff",
                      padding: "10px 20px",
                      borderRadius: "12px",
                      border: "none",
                      cursor: isSubmitting ? "not-allowed" : "pointer",
                      marginBlock: "20px",
                      fontSize: "16px",
                      width: "100%",
                    }}
                  >
                    {isSubmitting ? "Sending..." : "Send Message"}
                  </button>
                </Form>
              )}
            </Formik>
          </div>
        </div>

        {/* Modal for zoomed image */}
        {showModal && selectedImage && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              backgroundColor: "rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
            }}
            onClick={handleCloseModal}
          >
            <div
              style={{
                position: "relative",
                backgroundColor: "#fff",
                padding: "10px",
                borderRadius: "5px",
              }}
            >
              <img loading="lazy"
                src={selectedImage}
                alt="Zoomed"
                style={{ maxWidth: "90vw", maxHeight: "80vh" }}
              />
              <button
                onClick={handleCloseModal}
                style={{
                  position: "absolute",
                  top: "10px",
                  right: "10px",
                  backgroundColor: "transparent",
                  border: "none",
                  fontSize: "20px",
                  cursor: "pointer",
                }}
              >
                &times;
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const chat = () => {
    return (
      <div>
        <div
          style={{
            border: "1px solid rgba(0,0,0,0.7)",
            borderRadius: "15px",
            display: "flex",
            justifyContent: "space-around",
            marginBlock: "4%",
            paddingBlock: "2%",
            backgroundColor: "#fff",
          }}
        >
          <div style={{ lineHeight: "25px", textAlign: "center" }}>
            <QuestionAnswerIcon
              style={{ color: "#FF6505", height: "35px", width: "35px" }}
            />
            <div
              style={{ fontSize: "16px", fontWeight: "600", marginTop: "5px" }}
            >
              Chat with Us
            </div>
            <div>Our support team is here to assist you.</div>
            <div style={{ fontSize: "14px", fontWeight: "500" }}>
              <a href="mailto:support@vedicvaibhav.com">
                support@vedicvaibhav.com
              </a>
            </div>
          </div>

          <div style={{ lineHeight: "25px", textAlign: "center" }}>
            <FmdGoodIcon
              style={{ color: "#FF6505", height: "35px", width: "35px" }}
            />
            <div
              style={{ fontSize: "16px", fontWeight: "600", marginTop: "5px" }}
            >
              Visit Our Office
            </div>
            <div>1031, 10th floor , Tricity Trade Tower , Zirakpur-Patiala Heighway , Zirakpur ,Punjab , 140603</div>
          </div>

          <div style={{ lineHeight: "25px", textAlign: "center" }}>
            <CallIcon
              style={{ color: "#FF6505", height: "35px", width: "35px" }}
            />
            <div
              style={{ fontSize: "16px", fontWeight: "600", marginTop: "5px" }}
            >
              Call Us
            </div>
            <div>Mon-Fri: 8am - 5pm</div>
            <div style={{ fontSize: "14px", fontWeight: "500" }}>
              <a href="tel:+919872788769">+91 9872788769</a>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const chatMob = () => {
    return (
      <div>
        <div
          style={{
            border: "1px solid rgba(0,0,0,0.7)",
            borderRadius: "15px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            textAlign: "center",
            alignItems: "center",
            marginBlock: "10%",
            paddingBlock: "6%",
            backgroundColor: "#fff",
          }}
        >
          <QuestionAnswerIcon
            style={{ color: "#FF6505", height: "35px", width: "35px" }}
          />
          <div
            style={{ fontSize: "16px", fontWeight: "600", marginTop: "5px" }}
          >
            Chat with Us
          </div>
          <div>Our team is ready to help you.</div>
          <div style={{ fontSize: "14px", fontWeight: "500" }}>
            <a href="mailto:support@vedicvaibhav.com">
              support@vedicvaibhav.com
            </a>
          </div>

          <FmdGoodIcon
            style={{
              color: "#FF6505",
              height: "35px",
              width: "35px",
              marginTop: "15px",
            }}
          />
          <div
            style={{ fontSize: "16px", fontWeight: "600", marginTop: "5px" }}
          >
            Visit Our Office
          </div>
          <div>1031, 10th floor , Tricity Trade Tower , Zirakpur-Patiala Heighway , Zirakpur ,Punjab , 140603</div>

          <CallIcon
            style={{
              color: "#FF6505",
              height: "35px",
              width: "35px",
              marginTop: "15px",
            }}
          />
          <div
            style={{ fontSize: "16px", fontWeight: "600", marginTop: "5px" }}
          >
            Call Us
          </div>
          <div>Mon-Fri: 8am - 5pm</div>
          <div style={{ fontSize: "14px", fontWeight: "500" }}>
            <a href="tel:+919872788769">+91 9872788769</a>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ paddingTop: "20px" }}>
      <Col xl={24} lg={24} md={24} xs={24} sm={24}>
        <Row style={{ paddingInline: "6%", alignItems: "start" }}>
          <Col
            xl={8}
            lg={8}
            md={8}
            sm={0}
            xs={0}
            style={{ width: "100%", height: "100%" }}
          >
            <img loading="lazy"
              src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/overall_images/handcontact.png"
              style={{ width: "100%", height: "100%" }}
              alt="Contact Us Banner"
            />
          </Col>

          <Col xl={1} lg={1} md={1} xs={0} sm={0}></Col>

          <Col xl={15} lg={15} md={15} xs={0} sm={0}>
            {widgetcontact()}
          </Col>
          <Col xl={24} lg={24} md={24} sm={0} xs={0}>
            {chat()}
          </Col>
          <Col xl={0} lg={0} md={0} xs={24} sm={24}>
            {widgetcontact()}
          </Col>
          <Col xl={0} lg={0} md={0} sm={24} xs={24}>
            {chatMob()}
          </Col>
        </Row>
      </Col>
    </div>
  );
};
