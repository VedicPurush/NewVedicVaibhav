"use client";

import { Button, Modal } from "antd";
import { LogoutOutlined } from "@ant-design/icons";
import "./LogoutConfirmModal.css";

type LogoutConfirmModalProps = {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

/**
 * Confirmation step for the profile section's logout buttons.
 *
 * The session lives entirely in the `userDetails` localStorage key — there is no
 * server-side session to fall back on — so logging out by mis-tap costs the user
 * a full phone/email OTP round trip to get back in. Both logout entry points (the
 * desktop side panel in Profile, the My Account card in PersonalInfo) route
 * through this, so the two behave the same.
 *
 * Each caller keeps its own logout logic and passes it as `onConfirm`; the two
 * clear the session in different ways and unifying them is not this component's job.
 */
const LogoutConfirmModal = ({ open, onCancel, onConfirm }: LogoutConfirmModalProps) => (
  <Modal
    open={open}
    onCancel={onCancel}
    footer={null}
    centered
    width={340}
    closable={false}
    className="vv-logout-modal"
    styles={{ mask: { background: "rgba(28,16,8,0.45)", backdropFilter: "blur(2px)" } }}
  >
    <div className="vv-logout-modal__body">
      <div className="vv-logout-modal__badge" aria-hidden="true">
        <LogoutOutlined />
      </div>
      <h3 className="vv-logout-modal__title">Leaving so soon?</h3>
      <p className="vv-logout-modal__text">
        Your bookings and blessings stay safe with us. Come back soon.
      </p>
      <div className="vv-logout-modal__actions">
        <Button className="vv-logout-modal__stay" onClick={onCancel}>
          Stay
        </Button>
        <Button className="vv-logout-modal__confirm" onClick={onConfirm}>
          Log Out
        </Button>
      </div>
    </div>
  </Modal>
);

export default LogoutConfirmModal;
