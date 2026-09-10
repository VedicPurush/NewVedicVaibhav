"use client";

import { Avatar, Col, Menu, Row, Dropdown, Button, Grid } from "antd";
import type { MenuProps } from "antd";
import { DownOutlined } from "@ant-design/icons";
import Layout from "@/components/layout/Layout";
import "./Profile.css";
import { useEffect, useState } from "react";
import PersonalInfo from "../PersonalInfo/PersonalInfo";
import { useRouter, useSearchParams } from "next/navigation";
import { useDispatch } from "react-redux";
import { setShowLoginCard } from "@/store/userSlice";
import PoojaBookings from "../PoojaBookings/PoojaBookings";
import PersonalisedPujaBookings from "../PersonalizedPujaBookings/PersonalizedPujaBookings";
import ArrowBack from "@mui/icons-material/ArrowBack";
import AccountCircle from "@mui/icons-material/AccountCircle";
import Puja from "@/components/widgets/home/Puja";
import ChadhavaBookings from "../Chadhavabookings/Chadhavabookings";
import BankeBihariBookings from "../BankeBihariBookings/BankeBihariBookings";
import YatraBookings from "../FourDhamYatraBookings/YatraBookings";
import GauSevaBookings from "../GauSevaBookings/GauSevaBookings";
import MyCoupons from "../MyCoupons/MyCoupons";
import Navbar from "@/components/layout/Navbar";
import LogoutConfirmModal from "@/components/shared/LogoutConfirmModal";
import JyotirlingChadhavaBookings from "../JyotirlingChadhavaBookings/JyotirlingChadhavaBookings";

const { useBreakpoint } = Grid;

type StoredUser = Record<string, string | undefined>;

const readStoredUser = (): StoredUser => {
  try {
    const userDetails = JSON.parse(localStorage.getItem("userDetails") || "{}");
    return userDetails?.user || {};
  } catch {
    return {};
  }
};

const menuItems = [
  { key: "my-account", label: "My Account" },
  { key: "my-coupons", label: "🎁 My Coupons" },
  { key: "chadhava", label: "Chadhava Bookings" },
  { key: "4-dham-yatra", label: "4-Dham Bookings" },
  { key: "gau-seva", label: "Gau Seva Bookings" },
  { key: "pooja", label: "Pooja Bookings" },
  { key: "personalized", label: "Personalized Bookings" },
  { key: "banke-bihari", label: "Banke Bihariji Bookings" },
  { key: "jyotirling-chadhava", label: "Jyotirling Chadhava" },
];

/**
 * Retired tabs still arrive as bookmarked links — `/profile?tab=prasad` is the
 * live example. Without this the panel renders "Select an option to see the
 * details" with nothing highlighted in the menu, which reads as a broken page
 * rather than a removed feature.
 */
const resolveTab = (tab: string | null): string =>
  menuItems.some((item) => item.key === tab) ? (tab as string) : "my-account";

const renderTabContent = (selectedKey: string) => {
  switch (selectedKey) {
    case "my-account":
      return <PersonalInfo />;
    case "my-coupons":
      return <MyCoupons />;
    case "pooja":
      return <PoojaBookings />;
    case "personalized":
      return <PersonalisedPujaBookings />;
    case "chadhava":
      return <ChadhavaBookings />;
    case "4-dham-yatra":
      return <YatraBookings />;
    case "gau-seva":
      return <GauSevaBookings />;
    case "banke-bihari":
      return <BankeBihariBookings />;
    case "jyotirling-chadhava":
      return <JyotirlingChadhavaBookings />;
    default:
      return <div>Select an option to see the details</div>;
  }
};

/** Shown at /profile when nobody is signed in. */
const SignInRequired = () => {
  const dispatch = useDispatch();
  const router = useRouter();

  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        padding: "48px 24px",
        textAlign: "center",
      }}
    >
      <AccountCircle style={{ fontSize: 64, color: "#c9972c" }} />
      <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: "#7c2d12" }}>
        Please log in to view your profile
      </h1>
      <p style={{ margin: 0, maxWidth: 420, color: "#6b7280", fontSize: 14 }}>
        Your bookings, coupons and personal details live behind a quick OTP on your mobile number.
      </p>
      <div style={{ display: "flex", gap: 10, marginTop: 6, flexWrap: "wrap", justifyContent: "center" }}>
        <Button type="primary" size="large" onClick={() => dispatch(setShowLoginCard(true))}>
          Log in
        </Button>
        <Button size="large" onClick={() => router.push("/")}>
          Back to home
        </Button>
      </div>
    </div>
  );
};

const ProfilePage = () => {
  const screens = useBreakpoint();

  /**
   * /profile is a client-rendered page behind localStorage, so it cannot be
   * gated by middleware. Without this check a signed-out visitor (or anyone who
   * just logged out and hit Back) got the full profile chrome with every field
   * blank, which reads as data loss rather than "you are signed out".
   *
   * Three states, not two: "checking" renders nothing for the one tick before
   * localStorage is readable, so neither the sign-in prompt nor an empty
   * profile flashes on the way to the right one. Re-checks on
   * `user-details-changed` so logging in through the modal swaps this view for
   * the real profile without a reload.
   */
  const [authState, setAuthState] = useState<"checking" | "in" | "out">("checking");

  useEffect(() => {
    const check = () => {
      const u = readStoredUser();
      setAuthState(u && (u._id || u.phone) ? "in" : "out");
    };
    check();
    window.addEventListener("user-details-changed", check);
    window.addEventListener("storage", check);
    return () => {
      window.removeEventListener("user-details-changed", check);
      window.removeEventListener("storage", check);
    };
  }, []);

  if (authState === "checking") return null;

  if (authState === "out") {
    return (
      <div style={{ minHeight: "100vh" }}>
        {screens.md ? (
          <Layout content={<SignInRequired />} />
        ) : (
          <>
            <Navbar />
            <div className="mt-[8vh]">
              <SignInRequired />
            </div>
          </>
        )}
      </div>
    );
  }

  // Only mount ONE layout — prevents duplicate API calls from both mounting
  return (
    <div>
      {screens.md ? (
        <Layout content={<ProfilePageContent />} />
      ) : (
        <ProfilePageContentMob />
      )}
    </div>
  );
};

export default ProfilePage;

const ProfilePageContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tab = resolveTab(searchParams.get("tab"));
  const [selectedKey, setSelectedKey] = useState<string>(tab);
  const [user, setUser] = useState<StoredUser>({});
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  useEffect(() => {
    setUser(readStoredUser());
  }, []);

  // Sync selectedKey with URL
  useEffect(() => {
    if (tab !== selectedKey) {
      setSelectedKey(tab);
    }
  }, [tab]);

  // Handle tab change
  const handleClick: MenuProps["onClick"] = (e) => {
    setSelectedKey(e.key);
    router.push(`/profile?tab=${e.key}`, { scroll: false });
  };

  const handleLogout = () => {
    localStorage.removeItem("userDetails");
    window.location.href = "/"; // navigates and reloads in one go
  };

  return (
    <div>
      <Col xs={0} sm={0} md={24} lg={24} xl={24}>
        <Row
          style={{
            width: "100%",
            paddingInline: "6%",
            paddingBlock: "3%",
            backgroundColor: "white",
          }}
          gutter={[0, 0]}
        >
          {/* Left Panel */}
          <Col span={8}>
            <div
              style={{
                boxShadow: "0px 0px 4px 0px rgba(0,0,0,0.25)",
                backgroundColor: "white",
                borderRadius: "12px",
                padding: "2%",
                display: "flex",
                gap: "2%",
                alignItems: "center",
              }}
            >
              <Avatar
                src={
                  user.picture ||
                  "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/personicon.png"
                }
                size="large"
              />
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div
                  style={{
                    fontSize: "16px",
                    color: "rgba(0,0,0,0.5)",
                    fontWeight: "500",
                  }}
                >
                  Namaste
                </div>
              </div>
            </div>

            <Menu
              onClick={handleClick}
              style={{
                border: "none",
                borderRadius: "12px",
                marginTop: "3%",
                boxShadow: "0px 0px 4px 0px rgba(0,0,0,0.25)",
              }}
              selectedKeys={[selectedKey]}
              items={menuItems}
              mode="vertical"
            />

            <div style={{ display: "flex", justifyContent: "center" }}>
              <div
                onClick={() => setLogoutConfirmOpen(true)}
                style={{
                  backgroundColor: "red",
                  marginTop: "20px",
                  cursor: "pointer",
                  color: "white",
                  textAlign: "center",
                  borderRadius: "12px",
                  width: "40%",
                  padding: "1%",
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                Logout
              </div>
            </div>
          </Col>

          {/* Right Panel */}
          <Col span={1}></Col>
          <Col span={15}>{renderTabContent(selectedKey)}</Col>
        </Row>
      </Col>

      <LogoutConfirmModal
        open={logoutConfirmOpen}
        onCancel={() => setLogoutConfirmOpen(false)}
        onConfirm={handleLogout}
      />
    </div>
  );
};

const ProfilePageContentMob = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tab = resolveTab(searchParams.get("tab"));
  const [selectedKey, setSelectedKey] = useState<string>(tab);
  const [user, setUser] = useState<StoredUser>({});

  useEffect(() => {
    setUser(readStoredUser());
  }, []);

  // Sync tab param to selectedKey
  useEffect(() => {
    if (tab !== selectedKey) {
      setSelectedKey(tab);
    }
  }, [tab]);

  const handleClick: MenuProps["onClick"] = (e) => {
    setSelectedKey(e.key);
    router.push(`/profile?tab=${e.key}`, { scroll: false });
  };

  const menu = {
    items: menuItems,
    onClick: handleClick,
  };

  const selectedLabel =
    menuItems.find((item) => item.key === selectedKey)?.label ||
    "Select an option";

  return (
    <div style={{ minHeight: "100vh" }}>
      <Navbar />
      <Col xs={24} sm={24} md={0} lg={0} xl={0}>
        <div
          className="mt-[8vh]"
          style={{ display: "flex", flexDirection: "column", width: "100%" }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 15px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                fontSize: "16px",
                fontWeight: "600",
              }}
              onClick={() => router.push("/")}
            >
              <ArrowBack
                style={{ fontSize: 20, marginRight: 8, cursor: "pointer" }}
              />
              My Profile
            </div>
          </div>
        </div>

        {/* Profile dropdown */}
        <div
          style={{
            paddingInline: "3%",
            paddingBlock: "3%",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              boxShadow: "0px 0px 4px 0px rgba(0,0,0,0.25)",
              borderRadius: "12px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                backgroundColor: "white",
                paddingInline: "2%",
                paddingBlock: "4%",
                display: "flex",
                gap: "2%",
                alignItems: "center",
                backgroundImage:
                  "url(https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/home-images/profile_back2.png)",
                backgroundSize: "cover",
              }}
            >
              <Avatar
                src={
                  user.picture ||
                  "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/personicon.png"
                }
                size="large"
              />
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div
                  style={{
                    fontSize: "16px",
                    color: "white",
                    fontWeight: "500",
                  }}
                >
                  Namaste
                </div>
              </div>
            </div>
            <Dropdown menu={menu} trigger={["click"]}>
              <Button
                style={{
                  width: "100%",
                  borderRadius: "0px",
                  color: "black",
                  display: "flex",
                  justifyContent: "space-between",
                  paddingBlock: "5%",
                }}
              >
                {selectedLabel} <DownOutlined />
              </Button>
            </Dropdown>
          </div>
        </div>

        {/* Content */}
        <Row style={{ paddingInline: "3%" }} gutter={[0, 0]}>
          <Col span={24}>{renderTabContent(selectedKey)}</Col>
        </Row>

        {/* Footer Widget */}
        <Puja />
      </Col>
    </div>
  );
};
