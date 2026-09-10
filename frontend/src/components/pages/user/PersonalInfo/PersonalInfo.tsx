"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Avatar, Col, Row, Modal, Tooltip, Divider } from "antd";
import { useRouter } from "next/navigation";
import { Card, Typography, Input, Select, Button, message } from "antd";
import { TimePicker } from "antd";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import {
  SaveOutlined,
  LogoutOutlined,
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  CopyOutlined,
} from "@ant-design/icons";
import { api } from "@/lib/api";
import LogoutConfirmModal from "@/components/shared/LogoutConfirmModal";

const { Title, Text } = Typography;

type FormData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gender: string;
  dob: string; // YYYY-MM-DD
  birthTime: string; // "HH:mm"
  gotra: string;
  address: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
};

type AnyUser = {
  _id?: string;
  given_name?: string;
  family_name?: string;
  firstname?: string;
  lastname?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  gender?: string;
  picture?: string;
  dob?: string;
  birthTime?: string;
  gotra?: string;
  address?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  [k: string]: any;
};

type StoredUserDetails = { user?: AnyUser; token?: string } | null;

/* ------------------------------ utils ------------------------------ */
const safeParse = (raw: string | null): StoredUserDetails => {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const isNumericEmail = (email?: string) => {
  if (!email) return false;
  const [local] = email.split("@");
  return /^\d+$/.test(local); // true ONLY if local part is all digits
};

const normalizeUser = (u: AnyUser | null | undefined): AnyUser | null => {
  if (!u) return null;
  const given_name = u.given_name ?? u.firstname ?? u.firstName ?? "";
  const family_name = u.family_name ?? u.lastname ?? u.lastName ?? "";
  return {
    ...u,
    given_name,
    family_name,
    firstname: u.firstname ?? given_name,
    lastname: u.lastname ?? family_name,
    phone: u.phone ?? "",
    email: u.email ?? "",
    gender: u.gender ?? "",
    picture: u.picture ?? "",
    dob: u.dob ?? "",
    birthTime: u.birthTime ?? "",
    gotra: u.gotra ?? "",

    address: u.address ?? "",
    address1: u.address1 ?? "",
    address2: u.address2 ?? "",
    city: u.city ?? "",
    state: u.state ?? "",
    country: u.country ?? "",
    pincode: u.pincode ?? "",
  };
};

const setUserDetails = (next: StoredUserDetails) => {
  if (next === null) {
    localStorage.removeItem("userDetails");
  } else {
    localStorage.setItem("userDetails", JSON.stringify(next));
  }
  window.dispatchEvent(
    new CustomEvent("user-details-changed", { detail: next })
  );
};

const formFromUser = (user: AnyUser | null): FormData => ({
  firstName: user?.given_name ?? "",
  lastName: user?.family_name ?? "",
  email: user?.email ?? "",
  phone: user?.phone?.replace("+91 ", "") ?? "",
  gender: user?.gender || "Please Select Gender",
  dob: user?.dob || "",
  birthTime: user?.birthTime || "",
  gotra: user?.gotra || "",

  address: user?.address || "",
  address1: user?.address1 || "",
  address2: user?.address2 || "",
  city: user?.city || "",
  state: user?.state || "",
  country: user?.country || "",
  pincode: user?.pincode || "",
});

/* ---------------------------- component ---------------------------- */
const PersonalInfo: React.FC = () => {
  const router = useRouter();

  const [stored, setStored] = useState<StoredUserDetails>(null);

  const user = useMemo(() => normalizeUser(stored?.user) ?? null, [stored]);
  const [isDirty, setIsDirty] = useState(false);

  const [formData, setFormData] = useState<FormData>(formFromUser(null));

  const [userImage, setUserImage] = useState<string>("");

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  // Hydrate from localStorage after mount (SSR-safe)
  useEffect(() => {
    setStored(safeParse(localStorage.getItem("userDetails")));
  }, []);

  const showModal = (messageText: string, success: boolean) => {
    setModalMessage(messageText);
    setIsSuccess(success);
    setIsModalVisible(true);
  };
  const handleModalClose = () => setIsModalVisible(false);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    if (name === "phone") {
      const digitsOnly = value.replace(/\D/g, "");
      if (digitsOnly.length <= 10) {
        setFormData((prev) => ({ ...prev, phone: digitsOnly }));
      }
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTimeChange = (value: Dayjs | null) => {
    setFormData((prev) => ({
      ...prev,
      birthTime: value ? value.format("HH:mm") : "",
    }));
  };

  const handleLogout = () => {
    setUserDetails(null);
    setStored(null);
    router.push("/");
  };

  const writeUserToLocalStorage = (u: AnyUser | null) => {
    const normalized = normalizeUser(u);
    const current = safeParse(localStorage.getItem("userDetails")) ?? {};
    const prevId = (current as any)?.user?._id;
    const nextUser =
      prevId && normalized?._id && prevId !== normalized._id
        ? normalized
        : { ...(current as any).user, ...(normalized ?? {}) };
    const next = { ...(current || {}), user: nextUser };
    setUserDetails(next);
    setStored(next);
  };

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "userDetails") {
        setStored(safeParse(e.newValue));
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    const onUserDetailsChanged = (e: Event) => {
      const detail = (e as CustomEvent).detail as StoredUserDetails | undefined;
      if (typeof detail !== "undefined") {
        setStored(detail);
      } else {
        setStored(safeParse(localStorage.getItem("userDetails")));
      }
    };
    window.addEventListener("user-details-changed", onUserDetailsChanged);
    return () =>
      window.removeEventListener("user-details-changed", onUserDetailsChanged);
  }, []);

  const refreshProfile = async () => {
    try {
      let fetched: AnyUser | null = null;

      if (user?._id) {
        try {
          const r = await api.get(
            `/get-user-by-id/${encodeURIComponent(user._id)}`
          );
          fetched = r?.data?.user ?? null;
        } catch {}
      } else if (!fetched && user?.phone) {
        try {
          const encodedPhone = encodeURIComponent(user.phone);
          const r = await api.get(`/get-user-by-phone/${encodedPhone}`);
          fetched = r?.data?.user ?? null;
        } catch {}
      } else if (!fetched && user?.email) {
        try {
          const r = await api.get(
            `/get-user-by-email/${encodeURIComponent(user.email).toLowerCase()}`
          );
          fetched = r?.data?.user ?? null;
        } catch {}
      }

      if (fetched) {
        if (fetched.picture) setUserImage(fetched.picture);
        writeUserToLocalStorage(fetched);
      }
    } catch (err) {
      console.error("refreshProfile failed:", err);
    }
  };

  useEffect(() => {
    // Compare only editable fields for difference
    const compare = formFromUser(user);
    setIsDirty(JSON.stringify(formData) !== JSON.stringify(compare));
  }, [formData, user]);

  const handleSaveClick = async () => {
    if (!user?._id) {
      showModal("User not found. Please sign in again.", false);
      return;
    }
    if (formData.phone.length !== 10) {
      showModal("Phone number must contain exactly 10 digits after +91.", false);
      return;
    }
    if (!formData.gender || formData.gender === "Please Select Gender") {
      showModal("Please select a gender.", false);
      return;
    }
    if (!formData.dob) {
      showModal("Please select date of birth.", false);
      return;
    }
    if (!formData.birthTime) {
      showModal("Please select birth time.", false);
      return;
    }
    if (!formData.gotra) {
      showModal("Please enter gotra.", false);
      return;
    }
    if (!formData.address1) {
      showModal("Please enter Address Line 1.", false);
      return;
    }
    if (!formData.city) {
      showModal("Please enter City.", false);
      return;
    }
    if (!formData.state) {
      showModal("Please enter State.", false);
      return;
    }
    if (!formData.pincode) {
      showModal("Please enter Pincode.", false);
      return;
    }

    const fullAddress = `${formData.address1}, ${
      formData.address2 ? formData.address2 + ", " : ""
    }${formData.city}, ${formData.state}, ${formData.country} - ${formData.pincode}`;

    try {
      const payload = {
        phone: `+91 ${formData.phone.trim()}`,
        gender: formData.gender,
        firstname: formData.firstName.trim(),
        lastname: formData.lastName.trim(),
        dob: formData.dob,
        birthTime: formData.birthTime,
        gotra: formData.gotra,
        address: fullAddress,
        address1: formData.address1,
        address2: formData.address2,
        city: formData.city,
        state: formData.state,
        country: formData.country,
        pincode: formData.pincode,
      };

      const { data } = await api.post(
        `/update-user-profile/${user._id}`,
        payload
      );

      const updated = data?.user as AnyUser | undefined;
      if (updated) {
        if (updated.picture) setUserImage(updated.picture);
        writeUserToLocalStorage(updated);
      } else {
        await refreshProfile();
      }

      showModal("Profile updated successfully!", true);
    } catch (error) {
      console.error("Error updating profile:", error);
      showModal("Failed to update profile. Please try again.", false);
    }
  };

  useEffect(() => {
    if (user?._id || user?.email || user?.phone) {
      refreshProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id, user?.email, user?.phone]);

  useEffect(() => {
    setFormData(formFromUser(user));
    setUserImage(user?.picture ?? "");
  }, [
    user?._id,
    user?.email,
    user?.phone,
    user?.picture,
    user?.given_name,
    user?.family_name,
    user?.gender,
    user?.dob,
    user?.birthTime,
    user?.gotra,
    user?.address,
    user?.address1,
    user?.address2,
    user?.city,
    user?.state,
    user?.country,
    user?.pincode,
  ]);

  // Common style for fields
  const fieldStyle = {
    borderRadius: 10,
    background: "white",
  } as React.CSSProperties;

  // Disabled fields style
  const disabledFieldStyle = {
    ...fieldStyle,
    color: "rgba(0,0,0,0.75)",
    background: "white",
    opacity: 1,
    cursor: "not-allowed",
  } as React.CSSProperties;

  const labelStyle = {
    display: "block",
    fontSize: 12,
    color: "rgba(0,0,0,0.65)",
    marginBottom: 6,
    letterSpacing: 0.2,
  } as React.CSSProperties;

  return (
    <>
      {/* Desktop / Tablet */}
      <Col xl={24} md={24} lg={24} xs={0} sm={0}>
        <Card
          title={
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Title level={4} style={{ margin: 0 }}>
                Personal Information
              </Title>
            </div>
          }
          style={{
            width: "100%",
            borderRadius: 16,
            border: "1px solid #F0F0F0",
            boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
          }}
          styles={{ body: { padding: 20 } }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              marginBottom: 12,
            }}
          >
            <Avatar src={user?.picture || userImage || ""} size={64} />
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ fontWeight: 600, fontSize: 16 }}>
                {`${formData.firstName || ""} ${formData.lastName || ""}`.trim() ||
                  "Your Name"}
              </div>
              <div style={{ fontSize: 12, color: "rgba(0,0,0,0.45)" }}>
                Manage your basic profile details
              </div>
            </div>
          </div>

          <Divider style={{ margin: "12px 0" }} />

          <Row gutter={[20, 20]} style={{ marginTop: 8 }}>
            {/* First Name */}
            <Col span={12}>
              <Text style={labelStyle}>First Name</Text>
              <Input
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                size="large"
                placeholder="Enter first name"
                prefix={<UserOutlined style={{ color: "rgba(0,0,0,0.35)" }} />}
              />
            </Col>

            {/* Last Name */}
            <Col span={12}>
              <Text style={labelStyle}>Last Name</Text>
              <Input
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                size="large"
                placeholder="Enter last name"
                prefix={<UserOutlined style={{ color: "rgba(0,0,0,0.35)" }} />}
              />
            </Col>

            {/* Email (only if valid & not numeric email) */}
            {formData?.email?.trim() && !isNumericEmail(formData.email) && (
              <Col span={12}>
                <Text style={labelStyle}>Email</Text>
                <Input
                  name="email"
                  value={formData.email}
                  disabled
                  size="large"
                  style={disabledFieldStyle}
                  prefix={<MailOutlined style={{ color: "rgba(0,0,0,0.35)" }} />}
                />
              </Col>
            )}

            {/* Phone (non-editable, with copy) */}
            <Col span={12}>
              <Text style={labelStyle}>Phone</Text>
              <Input
                name="phone"
                value={formData.phone}
                disabled
                size="large"
                maxLength={10}
                style={disabledFieldStyle}
                prefix={<PhoneOutlined style={{ color: "rgba(0,0,0,0.35)" }} />}
                addonBefore={
                  <span style={{ color: "rgba(0,0,0,0.65)" }}>+91</span>
                }
                suffix={
                  <Tooltip title="Copy number">
                    <Button
                      type="text"
                      icon={<CopyOutlined />}
                      onClick={async () => {
                        try {
                          await navigator.clipboard?.writeText(
                            `+91 ${formData.phone || ""}`
                          );
                          message.success("Number copied to clipboard");
                        } catch {
                          message.error("Failed to copy number");
                        }
                      }}
                    />
                  </Tooltip>
                }
              />
            </Col>

            {/* Gender */}
            <Col span={12}>
              <Text style={labelStyle}>Select Gender</Text>
              <Select
                value={formData.gender}
                onChange={(value) =>
                  setFormData((p) => ({ ...p, gender: String(value) }))
                }
                size="large"
                options={[
                  {
                    label: "Please Select Gender",
                    value: "Please Select Gender",
                  },
                  { label: "Male", value: "Male" },
                  { label: "Female", value: "Female" },
                  { label: "Other", value: "Other" },
                  { label: "Prefer not to say", value: "Prefer not to say" },
                ]}
                dropdownStyle={{ borderRadius: 10 }}
              />
            </Col>

            {/* Date of Birth */}
            <Col span={12}>
              <Text style={labelStyle}>Date of Birth</Text>
              <Input
                type="date"
                name="dob"
                value={formData.dob}
                onChange={handleInputChange}
                size="large"
              />
            </Col>

            {/* Birth Time */}
            <Col span={12}>
              <Text style={labelStyle}>Birth Time</Text>
              <TimePicker
                value={
                  formData.birthTime ? dayjs(formData.birthTime, "HH:mm") : null
                }
                onChange={handleTimeChange}
                format="HH:mm"
                minuteStep={5}
                className="w-full"
              />
            </Col>

            {/* Gotra */}
            <Col span={12}>
              <Text style={labelStyle}>Gotra</Text>
              <Input
                name="gotra"
                value={formData.gotra}
                onChange={handleInputChange}
                size="large"
                placeholder="Enter gotra"
              />
            </Col>

            {/* Address 1 */}
            <Col span={12}>
              <Text style={labelStyle}>Address 1</Text>
              <Input
                name="address1"
                value={formData.address1}
                onChange={handleInputChange}
                size="large"
                placeholder="House No, Building"
              />
            </Col>

            {/* Address 2 */}
            <Col span={12}>
              <Text style={labelStyle}>Address 2</Text>
              <Input
                name="address2"
                value={formData.address2}
                onChange={handleInputChange}
                size="large"
                placeholder="Area, Colony"
              />
            </Col>

            {/* City */}
            <Col span={12}>
              <Text style={labelStyle}>City</Text>
              <Input
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                size="large"
                placeholder="City"
              />
            </Col>

            {/* State */}
            <Col span={12}>
              <Text style={labelStyle}>State</Text>
              <Input
                name="state"
                value={formData.state}
                onChange={handleInputChange}
                size="large"
                placeholder="State"
              />
            </Col>

            {/* Country */}
            <Col span={12}>
              <Text style={labelStyle}>Country</Text>
              <Input
                name="country"
                value={formData.country}
                onChange={handleInputChange}
                size="large"
                placeholder="Country"
              />
            </Col>

            {/* Pincode */}
            <Col span={12}>
              <Text style={labelStyle}>Pincode</Text>
              <Input
                name="pincode"
                value={formData.pincode}
                onChange={handleInputChange}
                size="large"
                maxLength={6}
                placeholder="Pincode"
              />
            </Col>
          </Row>

          {/* Save CTA */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
              marginTop: 20,
            }}
          >
            <Button
              type="primary"
              size="large"
              icon={<SaveOutlined />}
              onClick={handleSaveClick}
              style={{
                backgroundColor: "#00BD68",
                borderRadius: 10,
                height: 44,
                display: isDirty ? "block" : "none",
              }}
            >
              Save
            </Button>
          </div>

          {/* Status Modal */}
          <Modal
            open={isModalVisible}
            onCancel={handleModalClose}
            footer={null}
            centered
          >
            <div style={{ textAlign: "center", padding: 20 }}>
              <h3>{isSuccess ? "Success!" : "Error!"}</h3>
              <p>{modalMessage}</p>
              <button
                onClick={handleModalClose}
                style={{
                  backgroundColor: isSuccess ? "#28a745" : "#dc3545",
                  color: "white",
                  border: "none",
                  padding: "10px 20px",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
              >
                OK
              </button>
            </div>
          </Modal>
        </Card>
      </Col>
      <Col xl={0} md={0} lg={0} xs={24} sm={24}>
        <Card
          title={
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Title level={5} style={{ margin: 0 }}>
                Personal Information
              </Title>
            </div>
          }
          style={{
            width: "100%",
            borderRadius: 16,
            border: "1px solid #F0F0F0",
            boxShadow: "0 8px 28px rgba(0,0,0,0.06)",
            overflow: "hidden",
          }}
          styles={{ body: { padding: 16 } }}
        >
          <Row gutter={[12, 12]}>
            {/* First Name */}
            <Col span={24}>
              <Text style={labelStyle}>First Name</Text>
              <Input
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                size="large"
                placeholder="Enter first name"
                prefix={<UserOutlined style={{ color: "rgba(0,0,0,0.35)" }} />}
              />
            </Col>

            {/* Last Name */}
            <Col span={24}>
              <Text style={labelStyle}>Last Name</Text>
              <Input
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                size="large"
                placeholder="Enter last name"
                prefix={<UserOutlined style={{ color: "rgba(0,0,0,0.35)" }} />}
              />
            </Col>

            {/* Email (only if valid & not numeric email) */}
            {formData?.email?.trim() && !isNumericEmail(formData.email) && (
              <Col span={12}>
                <Text style={labelStyle}>Email</Text>
                <Input
                  name="email"
                  value={formData.email}
                  disabled
                  size="large"
                  style={disabledFieldStyle}
                  prefix={<MailOutlined style={{ color: "rgba(0,0,0,0.35)" }} />}
                />
              </Col>
            )}

            {/* Phone */}
            <Col span={24}>
              <Text style={labelStyle}>Phone</Text>
              <Input
                name="phone"
                value={formData.phone}
                disabled
                size="large"
                maxLength={10}
                addonBefore={
                  <span style={{ color: "rgba(0,0,0,0.65)" }}>+91</span>
                }
                prefix={<PhoneOutlined style={{ color: "rgba(0,0,0,0.35)" }} />}
                style={disabledFieldStyle}
                suffix={
                  <Button
                    type="text"
                    size="small"
                    onClick={async () => {
                      try {
                        await navigator.clipboard?.writeText(
                          `+91 ${formData.phone || ""}`
                        );
                        message.success("Number copied to clipboard");
                      } catch {
                        message.error("Failed to copy number");
                      }
                    }}
                  >
                    Copy
                  </Button>
                }
              />
            </Col>

            {/* Gender */}
            <Col span={24}>
              <Text style={labelStyle}>Select Gender</Text>
              <Select
                value={formData.gender}
                onChange={(value) =>
                  setFormData((prev) => ({ ...prev, gender: String(value) }))
                }
                size="large"
                options={[
                  {
                    label: "Please Select Gender",
                    value: "Please Select Gender",
                  },
                  { label: "Male", value: "Male" },
                  { label: "Female", value: "Female" },
                  { label: "Other", value: "Other" },
                  { label: "Prefer not to say", value: "Prefer not to say" },
                ]}
                dropdownStyle={{ borderRadius: 10 }}
              />
            </Col>

            {/* Date of Birth */}
            <Col span={24}>
              <Text style={labelStyle}>Date of Birth</Text>
              <Input
                type="date"
                name="dob"
                value={formData.dob}
                onChange={handleInputChange}
                size="large"
              />
            </Col>

            {/* Birth Time */}
            <Col span={24}>
              <Text style={labelStyle}>Birth Time</Text>
              <TimePicker
                value={
                  formData.birthTime ? dayjs(formData.birthTime, "HH:mm") : null
                }
                onChange={handleTimeChange}
                format="HH:mm"
                minuteStep={5}
                className="w-full"
              />
            </Col>

            {/* Gotra */}
            <Col span={24}>
              <Text style={labelStyle}>Gotra</Text>
              <Input
                name="gotra"
                value={formData.gotra}
                onChange={handleInputChange}
                size="large"
                placeholder="Enter gotra"
              />
            </Col>

            {/* Address 1 */}
            <Col span={24}>
              <Text style={labelStyle}>Address 1</Text>
              <Input
                name="address1"
                value={formData.address1}
                onChange={handleInputChange}
                size="large"
                placeholder="House No, Building"
              />
            </Col>

            {/* Address 2 */}
            <Col span={24}>
              <Text style={labelStyle}>Address 2</Text>
              <Input
                name="address2"
                value={formData.address2}
                onChange={handleInputChange}
                size="large"
                placeholder="Area, Colony"
              />
            </Col>

            {/* City */}
            <Col span={24}>
              <Text style={labelStyle}>City</Text>
              <Input
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                size="large"
                placeholder="City"
              />
            </Col>

            {/* State */}
            <Col span={24}>
              <Text style={labelStyle}>State</Text>
              <Input
                name="state"
                value={formData.state}
                onChange={handleInputChange}
                size="large"
                placeholder="State"
              />
            </Col>

            {/* Country */}
            <Col span={24}>
              <Text style={labelStyle}>Country</Text>
              <Input
                name="country"
                value={formData.country}
                onChange={handleInputChange}
                size="large"
                placeholder="Country"
              />
            </Col>

            {/* Pincode */}
            <Col span={24}>
              <Text style={labelStyle}>Pincode</Text>
              <Input
                name="pincode"
                value={formData.pincode}
                onChange={handleInputChange}
                size="large"
                maxLength={6}
                placeholder="Pincode"
              />
            </Col>
          </Row>

          {/* Actions */}
          <div style={{ marginTop: 16 }}>
            <Button
              type="primary"
              size="large"
              icon={<SaveOutlined />}
              onClick={handleSaveClick}
              block
              style={{
                backgroundColor: "#00BD68",
                borderRadius: 12,
                height: 44,
                boxShadow: "0 6px 16px rgba(0,189,104,0.25)",
                display: isDirty ? "block" : "none",
              }}
            >
              Save
            </Button>

            <Button
              type="text"
              danger
              icon={<LogoutOutlined />}
              onClick={() => setLogoutConfirmOpen(true)}
              className="w-full flex justify-center items-center mt-3"
              style={{ height: 44 }}
            >
              Log Out
            </Button>
          </div>

          <LogoutConfirmModal
            open={logoutConfirmOpen}
            onCancel={() => setLogoutConfirmOpen(false)}
            onConfirm={handleLogout}
          />
        </Card>
      </Col>
    </>
  );
};

export default PersonalInfo;
