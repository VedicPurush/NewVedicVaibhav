"use client";

import React, { useState } from "react";
import { Col, Row, Modal, Button, Carousel } from "antd";
import { StarFilled, TagFilled } from "@ant-design/icons";
import Delete from '@mui/icons-material/Delete';
import { useMoney } from "@/lib/currency";
import "../Payment.css";

interface PaymentIdolSectionProps {
    selectedPuja: any;
    silveridolselected: boolean;
    setsilveridolselected: (value: boolean) => void;
    idolquantity: number;
    handleIncrease: () => void;
    handleDecrease: () => void;
    isMobile: boolean;
}

export const PaymentIdolSection: React.FC<PaymentIdolSectionProps> = ({
    selectedPuja,
    silveridolselected,
    setsilveridolselected,
    idolquantity,
    handleIncrease,
    handleDecrease,
    isMobile,
}) => {
  /** Prices render in the devotee's own currency; the India list price is the
   *  input and the server owns the markup. See lib/currency.ts. */
  const { money } = useMoney();
    const [isidolModalVisible, setIsidolModalVisible] = useState(false);
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(true);
    const [isDimensionExpanded, setIsDimensionExpanded] = useState(true);
    const [isIssueExpanded, setIsIssueExpanded] = useState(true);
    const [isReturnExpanded, setIsReturnExpanded] = useState(true);

    const showModal = () => setIsidolModalVisible(true);
    const handleidolCancel = () => setIsidolModalVisible(false);

    const [expanded, _setExpanded] = useState(false);
    const charLimit = 150; // Limit before "Read More"

    // Ensure idolDescription exists and remove HTML tags
    const cleanDescription = selectedPuja?.idolDetails?.idolDescription
        ? selectedPuja.idolDetails.idolDescription.replace(/<[^>]*>/g, "")
        : "";

    // Return null if idol is not available
    if (!selectedPuja?.idolDetails?.isIdolAvailable) {
        return isMobile ? (
            <Row style={{ paddingInline: "3%" }}></Row>
        ) : (
            <Row style={{ paddingInline: "6%" }}></Row>
        );
    }

    const renderDesktopView = () => (
        <div className="payment-idol-section">
            {/* Decorative circles */}
            <div className="payment-idol-decor-1"></div>
            <div className="payment-idol-decor-2"></div>

            <Row
                style={{
                    alignItems: "center",
                    display: "flex",
                    position: "relative",
                    zIndex: 1,
                }}
            >
                <Col span={14}>
                    <Row style={{ paddingBlock: "2%" }}>
                        <Col span={8} onClick={showModal}>
                            <div className="payment-idol-image-container">
                                <img loading="lazy" 
                                    src={selectedPuja.idolDetails.idolImages[0]}
                                    className="payment-idol-image"
                                 />
                                <div
                                    className="payment-idol-add-btn"
                                    style={{
                                        backgroundColor: silveridolselected ? "#9CA3AF" : "#1AA11F",
                                    }}
                                    onClick={showModal}
                                >
                                    {silveridolselected ? "✓ ADDED" : "+ ADD TO CART"}
                                </div>
                            </div>
                        </Col>

                        <Col span={16}>
                            <div className="payment-idol-details">
                                <div className="payment-idol-name">
                                    {selectedPuja.idolDetails.idolName}
                                </div>
                                <div className="payment-idol-desc">
                                    {selectedPuja.idolDetails.idolDescription.replace(
                                        /<[^>]*>/g,
                                        ""
                                    )}
                                </div>
                                <div className="payment-idol-features">
                                    <span className="payment-idol-feature-item">
                                        <span className="payment-idol-check">✓</span> 999 Pure
                                        Silver
                                    </span>
                                    <span className="payment-idol-feature-item">
                                        <span className="payment-idol-check">✓</span> Sacred &
                                        Elegant
                                    </span>
                                    <span className="payment-idol-feature-item">
                                        <span className="payment-idol-check">✓</span> Ideal for
                                        Gifting
                                    </span>
                                </div>
                                <div className="payment-idol-price" translate="no">
                                    {money(selectedPuja.idolDetails.idolPrice)}
                                </div>
                            </div>
                        </Col>
                    </Row>
                </Col>

                <Col span={10}>
                    <div className="payment-idol-benefits-container">
                        <div className="payment-idol-benefits-inner">
                            <div className="payment-idol-benefits-card">
                                <div className="payment-idol-benefits-heading">
                                    {selectedPuja?.idolDetails?.idolBenefitHeading}
                                </div>
                                <ul className="payment-idol-benefits-list">
                                    <li className="payment-idol-benefits-item">
                                        <span className="payment-idol-benefits-icon">🙏</span> Brings
                                        Strength & Protection
                                    </li>
                                    <li className="payment-idol-benefits-item">
                                        <span className="payment-idol-benefits-icon">💰</span> Attracts Prosperity & Good
                                        Fortune
                                    </li>
                                    <li className="payment-idol-benefits-item">
                                        <span className="payment-idol-benefits-icon">🛡️</span>{" "}
                                        Removes Obstacles & Negativity
                                    </li>
                                    <li className="payment-idol-benefits-item">
                                        <span className="payment-idol-benefits-icon">☮️</span>{" "}
                                        Enhances Peace & Spiritual Energy
                                    </li>
                                </ul>
                            </div>
                        </div>
                        <div className="payment-idol-banner">
                            <img loading="lazy"  src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/pooja-images/sidhbanner%20(1).png"  />
                        </div>
                    </div>
                </Col>
            </Row>
        </div>
    );

    const renderMobileView = () => (
        <div className="payment-idol-section payment-idol-section-mobile">
            {/* Decorative circles */}
            <div className="payment-idol-decor-1 payment-idol-decor-mobile-1"></div>
            <div className="payment-idol-decor-2 payment-idol-decor-mobile-2"></div>

            <Row
                style={{
                    alignItems: "center",
                    display: "flex",
                    position: "relative",
                    zIndex: 1,
                }}
            >
                <Col span={24}>
                    <Row style={{ paddingBlock: "2%" }}>
                        <Col span={10} onClick={showModal}>
                            <div style={{ position: "relative" }}>
                                <img loading="lazy" 
                                    src={selectedPuja.idolDetails.idolImages[0]}
                                    className="payment-idol-image payment-idol-image-mobile"
                                ></img>
                            </div>
                        </Col>

                        <Col span={14}>
                            <div
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    paddingLeft: "4%",
                                }}
                            >
                                <div className="payment-idol-name payment-idol-name-mobile">
                                    {selectedPuja.idolDetails.idolName}
                                </div>
                                <div className="payment-idol-desc payment-idol-desc-mobile">
                                    {expanded
                                        ? cleanDescription
                                        : `${cleanDescription.slice(0, charLimit)}...`}

                                    {cleanDescription.length > charLimit && (
                                        <span
                                            onClick={showModal}
                                            style={{
                                                color: "#1AA11F",
                                                cursor: "pointer",
                                                fontWeight: "bold",
                                                marginLeft: "5px",
                                            }}
                                        >
                                            {expanded ? "Read Less" : "Read More"}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </Col>

                        <Col span={24}>
                            <div className="payment-idol-features payment-idol-features-mobile">
                                <span className="payment-idol-feature-item payment-idol-feature-item-mobile">
                                    <span className="payment-idol-check">✓</span> 999 Pure Silver
                                </span>
                                <span className="payment-idol-feature-item payment-idol-feature-item-mobile">
                                    <span className="payment-idol-check">✓</span> Sacred & Elegant
                                </span>
                                <span className="payment-idol-feature-item payment-idol-feature-item-mobile">
                                    <span className="payment-idol-check">✓</span> Ideal for Gifting
                                </span>
                            </div>
                        </Col>
                    </Row>
                </Col>

                <Col span={24}>
                    <div
                        style={{
                            display: "flex",
                            height: "100%",
                            justifyContent: "center",
                            alignItems: "center",
                            marginTop: "4%",
                        }}
                    >
                        <div style={{ width: "100%" }}>
                            <div className="payment-idol-benefits-card payment-idol-benefits-card-mobile">
                                <div className="payment-idol-benefits-heading payment-idol-benefits-heading-mobile">
                                    {selectedPuja?.idolDetails?.idolBenefitHeading}
                                </div>
                                <ul className="payment-idol-benefits-list payment-idol-benefits-list-mobile">
                                    <li className="payment-idol-benefits-item payment-idol-benefits-item-mobile">
                                        <span className="payment-idol-benefits-icon payment-idol-benefits-icon-mobile">
                                            🙏
                                        </span>{" "}
                                        Brings Strength & Protection
                                    </li>
                                    <li className="payment-idol-benefits-item payment-idol-benefits-item-mobile">
                                        <span className="payment-idol-benefits-icon payment-idol-benefits-icon-mobile">
                                            💰
                                        </span>{" "}
                                        Attracts Prosperity & Good Fortune
                                    </li>
                                    <li className="payment-idol-benefits-item payment-idol-benefits-item-mobile">
                                        <span className="payment-idol-benefits-icon payment-idol-benefits-icon-mobile">
                                            🛡️
                                        </span>{" "}
                                        Removes Obstacles & Negativity
                                    </li>
                                    <li className="payment-idol-benefits-item">
                                        <span className="payment-idol-benefits-icon payment-idol-benefits-icon-mobile">
                                            ☮️
                                        </span>{" "}
                                        Enhances Peace & Spiritual Energy
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </Col>

                <Col span={24}>
                    <div className="payment-mobile-action-row">
                        <div className="payment-mobile-price-tag" translate="no">
                            {money(selectedPuja.idolDetails.idolPrice)}
                        </div>

                        <Button
                            type="primary"
                            block
                            className="payment-mobile-add-btn"
                            style={{
                                backgroundColor: silveridolselected ? "#9CA3AF" : "#1AA11F",
                                cursor: silveridolselected ? "not-allowed" : "pointer",
                            }}
                            onClick={showModal}
                        >
                            {silveridolselected ? "✓ ADDED" : "+ ADD TO CART"}
                        </Button>

                        {silveridolselected && (
                            <div
                                className="payment-mobile-delete-btn"
                                onClick={() => {
                                    setsilveridolselected(false);
                                }}
                            >
                                <Delete style={{ color: "white", fontSize: "20px" }} />
                            </div>
                        )}
                    </div>
                </Col>
            </Row>
        </div>
    );

    return (
        <>
            {isMobile ? renderMobileView() : renderDesktopView()}

            {/* Modal View */}
            <Modal
                open={isidolModalVisible}
                onCancel={handleidolCancel}
                footer={null}
                width={1000}
            >
                <Row gutter={[10, 10]} style={{ padding: "4%" }}>
                    {/* Image Section */}
                    <Col lg={10} xl={10} md={10} xs={24} sm={24}>
                        <Carousel autoplay autoplaySpeed={1700} dots={true} effect="fade">
                            {selectedPuja?.idolDetails?.idolImages?.map(
                                (image: any, index: number) => (
                                    <div key={index}>
                                        <img loading="lazy" 
                                            src={image}
                                            style={{
                                                width: "100%",
                                                borderRadius: "12px",
                                                border: "1px solid rgba(0,0,0,0.2)",
                                                objectFit: "cover",
                                                height: "300px",
                                            }}
                                            alt={`Slide ${index + 1}`}
                                         />
                                    </div>
                                )
                            )}
                        </Carousel>
                    </Col>

                    {/* Details Section */}
                    <Col lg={14} xl={14} md={14} xs={24} sm={24}>
                        {/* Badges */}
                        <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                            <span
                                style={{
                                    backgroundColor: "#A000A0",
                                    color: "white",
                                    padding: "4px 10px",
                                    borderRadius: "6px",
                                    fontSize: "12px",
                                    fontWeight: "bold",
                                    fontFamily: "Montserrat",
                                }}
                            >
                                Best Seller
                            </span>
                            <span
                                style={{
                                    backgroundColor: "#FF4C4C",
                                    color: "white",
                                    padding: "4px 10px",
                                    borderRadius: "6px",
                                    fontSize: "12px",
                                    fontWeight: "bold",
                                    fontFamily: "Montserrat",
                                }}
                            >
                                <TagFilled style={{ marginRight: "4px" }} />
                                {Math.round(
                                    ((selectedPuja?.idolDetails?.idolMrpPrice -
                                        selectedPuja?.idolDetails?.idolPrice) /
                                        selectedPuja?.idolDetails?.idolMrpPrice) *
                                    100
                                )}
                                % OFF
                            </span>
                        </div>

                        {/* Title */}
                        <h2
                            style={{
                                fontSize: "20px",
                                fontWeight: "bold",
                                marginBottom: "8px",
                                fontFamily: "Montserrat",
                            }}
                        >
                            {selectedPuja?.idolDetails?.idolName}
                        </h2>

                        {/* Rating */}
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "5px",
                                fontFamily: "Open Sans",
                            }}
                        >
                            <StarFilled style={{ color: "#FFD700" }} />
                            <span style={{ fontSize: "14px", fontWeight: "bold" }}>
                                {selectedPuja?.idolDetails?.rating}
                            </span>
                            <span style={{ color: "gray", fontSize: "14px" }}>
                                ({selectedPuja?.idolDetails?.numberOfReviews} Reviews)
                            </span>
                        </div>

                        {/* Price */}
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                                marginTop: "3px",
                            }}
                        >
                            <span
                                style={{
                                    fontSize: "24px",
                                    fontWeight: "bold",
                                    color: "#1AA11F",
                                    fontFamily: "Open Sans",
                                }}
                                translate="no"
                            >
                                {money(selectedPuja?.idolDetails?.idolPrice)}
                            </span>
                            <span
                                style={{
                                    textDecoration: "line-through",
                                    color: "gray",
                                    fontSize: "14px",
                                    fontFamily: "Open Sans",
                                }}
                                translate="no"
                            >
                                {money(selectedPuja?.idolDetails?.idolMrpPrice)}
                            </span>
                            <span
                                style={{
                                    backgroundColor: "#FFCDD2",
                                    color: "#D32F2F",
                                    padding: "3px 8px",
                                    borderRadius: "6px",
                                    fontSize: "12px",
                                    fontWeight: "bold",
                                    fontFamily: "Montserrat",
                                }}
                            >
                                {Math.round(
                                    ((selectedPuja?.idolDetails?.idolMrpPrice -
                                        selectedPuja?.idolDetails?.idolPrice) /
                                        selectedPuja?.idolDetails?.idolMrpPrice) *
                                    100
                                )}
                                % OFF
                            </span>
                        </div>

                        {/* Description */}
                        <p
                            style={{
                                color: "gray",
                                fontSize: "14px",
                                marginTop: "8px",
                                fontFamily: "Montserrat",
                            }}
                        >
                            Inclusive of all Taxes.
                        </p>

                        {/* Quantity Selector */}
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                width: "120px",
                                border: "1px solid #ccc",
                                borderRadius: "12px",
                                padding: "2px 15px",
                                fontSize: "16px",
                                fontWeight: "500",
                                marginTop: "2%",
                            }}
                        >
                            <button
                                onClick={handleDecrease}
                                style={{
                                    background: "none",
                                    border: "none",
                                    fontSize: "20px",
                                    cursor: "pointer",
                                }}
                            >
                                –
                            </button>

                            <span>{idolquantity}</span>

                            <button
                                onClick={handleIncrease}
                                style={{
                                    background: "none",
                                    border: "none",
                                    fontSize: "20px",
                                    cursor: "pointer",
                                }}
                            >
                                +
                            </button>
                        </div>

                        {/* Add to Cart Button */}
                        <div
                            style={{
                                display: "flex",
                                marginTop: "4%",
                                justifyContent: "center",
                                alignItems: "center",
                            }}
                        >
                            <Button
                                type="primary"
                                block
                                disabled={silveridolselected}
                                onClick={() => {
                                    setsilveridolselected(true);

                                    setTimeout(() => {
                                        setIsidolModalVisible(false);
                                    }, 1000);
                                }}
                                style={{
                                    backgroundColor: silveridolselected ? "grey" : "#1AA11F",
                                    borderRadius: "50px",
                                    fontSize: "18px",
                                    height: "45px",
                                    color: "white",
                                    cursor: silveridolselected ? "not-allowed" : "pointer",
                                }}
                            >
                                {silveridolselected ? "ADDED" : "ADD +"}
                            </Button>

                            {silveridolselected && (
                                <div
                                    onClick={() => {
                                        setsilveridolselected(false);
                                    }}
                                    style={{ cursor: "pointer", marginLeft: "10px" }}
                                >
                                    <Delete />
                                </div>
                            )}
                        </div>
                    </Col>

                    {/* Product Description */}
                    <Col span={24}>
                        <div
                            className="border rounded-lg shadow-md bg-white"
                            style={{
                                border: "1px solid rgba(0,0,0,0.5)",
                                overflow: "hidden",
                                marginTop: "3%",
                            }}
                        >
                            {/* Header Section */}
                            <div
                                style={{
                                    borderBottom: "1px solid rgba(0,0,0,0.5)",
                                    padding: "1% 2%",
                                }}
                                className="flex justify-between items-center cursor-pointer"
                                onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                            >
                                <div className="flex items-center gap-2">
                                    <span role="img" aria-label="document">
                                        📜
                                    </span>
                                    <h2
                                        className="text-lg font-semibold"
                                        style={{ color: "#A14004" }}
                                    >
                                        Product Description
                                    </h2>
                                </div>
                                <button
                                    className="text-orange-700"
                                    style={{ fontSize: "20px" }}
                                >
                                    {isDescriptionExpanded ? "-" : "+"}
                                </button>
                            </div>

                            {/* Collapsible Content */}
                            {isDescriptionExpanded && (
                                <div
                                    className="payment-modal-desc-container"
                                    dangerouslySetInnerHTML={{
                                        __html: selectedPuja?.idolDetails?.idolBigDescription || "",
                                    }}
                                ></div>
                            )}
                        </div>
                    </Col>

                    {/* Size and weight */}
                    <Col span={24}>
                        <div className="border rounded-lg shadow-md bg-white payment-accordion-card">
                            {/* Header Section */}
                            <div
                                className="payment-accordion-header flex justify-between items-center cursor-pointer"
                                onClick={() => setIsDimensionExpanded(!isDimensionExpanded)}
                            >
                                <div className="flex items-center gap-2">
                                    <span role="img" aria-label="scale" className="payment-accordion-icon">
                                        ⚖️
                                    </span>
                                    <h2 className="text-lg font-semibold payment-accordion-title">
                                        Size &amp; Weight
                                    </h2>
                                </div>
                                <button className="payment-accordion-btn">
                                    {isDimensionExpanded ? "-" : "+"}
                                </button>
                            </div>

                            {/* Collapsible Content */}
                            {isDimensionExpanded && (
                                <div className="payment-accordion-content">
                                    <div className="payment-accordion-row">
                                        <span className="payment-accordion-label">Width :</span>
                                        <span className="payment-accordion-value">
                                            &nbsp;{selectedPuja?.idolDetails?.width}
                                        </span>
                                        <span className="payment-accordion-value">
                                            &nbsp;{selectedPuja?.idolDetails?.widthUnit}
                                        </span>
                                    </div>
                                    <div className="payment-accordion-row">
                                        <span className="payment-accordion-label">Height :</span>
                                        <span className="payment-accordion-value">
                                            &nbsp;{selectedPuja?.idolDetails?.height}
                                        </span>
                                        <span className="payment-accordion-value">
                                            &nbsp;{selectedPuja?.idolDetails?.heightUnit}
                                        </span>
                                    </div>
                                    <div className="payment-accordion-row">
                                        <span className="payment-accordion-label">Weight :</span>
                                        <span className="payment-accordion-value">
                                            &nbsp;{selectedPuja?.idolDetails?.weight}
                                        </span>
                                        <span className="payment-accordion-value">
                                            &nbsp;{selectedPuja?.idolDetails?.weightUnit}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </Col>

                    {/* Facing any issue */}
                    <Col span={24}>
                        <div className="border rounded-lg shadow-md bg-white payment-accordion-card">
                            {/* Header Section */}
                            <div
                                className="payment-accordion-header flex justify-between items-center cursor-pointer"
                                onClick={() => setIsIssueExpanded(!isIssueExpanded)}
                            >
                                <div className="flex items-center gap-2">
                                    <span role="img" aria-label="warning" className="payment-accordion-icon">
                                        ⚠️
                                    </span>
                                    <h2 className="text-lg font-semibold payment-accordion-title">
                                        Facing any issue?
                                    </h2>
                                </div>
                                <button className="payment-accordion-btn">
                                    {isIssueExpanded ? "-" : "+"}
                                </button>
                            </div>

                            {/* Collapsible Content */}
                            {isIssueExpanded && (
                                <div className="payment-accordion-text">
                                    <p className="payment-accordion-para">
                                        We are here for you. If you have any questions related to
                                        out products, website, or your order - please{" "}
                                        <a href="/shop/contact">
                                            <u>contact us</u>{" "}
                                        </a>
                                    </p>
                                </div>
                            )}
                        </div>
                    </Col>

                    {/* Return & Replacement */}
                    <Col span={24}>
                        <div className="border rounded-lg shadow-md bg-white payment-accordion-card">
                            {/* Header Section */}
                            <div
                                className="payment-accordion-header flex justify-between items-center cursor-pointer"
                                onClick={() => setIsReturnExpanded(!isReturnExpanded)}
                            >
                                <div className="flex items-center gap-2">
                                    <span role="img" aria-label="box" className="payment-accordion-icon">
                                        📦
                                    </span>
                                    <h2 className="text-lg font-semibold payment-accordion-title">
                                        Return &amp; Replacement
                                    </h2>
                                </div>
                                <button className="payment-accordion-btn">
                                    {isReturnExpanded ? "-" : "+"}
                                </button>
                            </div>

                            {/* Collapsible Content */}
                            {isReturnExpanded && (
                                <div className="payment-accordion-text">
                                    <ul className="payment-accordion-list" style={{ listStyleType: "disc", paddingLeft: "1.5rem", marginBottom: "1rem" }}>
                                        <li className="payment-accordion-list-item">Orders are dispatched within 24 working hours.</li>
                                        <li className="payment-accordion-list-item">Delivery typically takes 3-7 working days depending on the location.</li>
                                        <li className="payment-accordion-list-item">Tracking details are emailed upon dispatch.</li>
                                        <li className="payment-accordion-list-item">Contact us for any delivery queries.</li>
                                    </ul>
                                    <p className="payment-accordion-para">
                                        We only ask that you don't use the product and preserve its
                                        original condition, tags, and packaging. You are welcome to
                                        try on a product but please take adequate measure to
                                        preserve its condition.
                                    </p>
                                    <ul className="payment-accordion-list" style={{ listStyleType: "disc", paddingLeft: "1.5rem", marginTop: "1rem" }}>
                                        <li className="payment-accordion-list-item">Return Request should be initiated within 7days of order delivery.</li>
                                        <li className="payment-accordion-list-item">The tags on the product should be intact.</li>
                                        <li className="payment-accordion-list-item">The product should be unwashed, unused and in an undamaged condition.</li>
                                        <li className="payment-accordion-list-item">The item needs to be returned along with the original packaging.</li>
                                        <li className="payment-accordion-list-item">Reverse pickup charges would be 300/-</li>
                                    </ul>
                                </div>
                            )}
                        </div>
                    </Col>
                </Row>
            </Modal>
        </>
    );
};
