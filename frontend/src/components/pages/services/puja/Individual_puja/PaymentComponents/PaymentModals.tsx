"use client";

import React, { useState } from "react";
import { useMoney } from "@/lib/currency";
import { Modal, Button, Input, Row, Select } from "antd";

const { Option } = Select;

interface PaymentModalsProps {
    modalVisible: string | null;
    setModalVisible: React.Dispatch<React.SetStateAction<string | null>>;
    handleModalConfirm: (service: string, price: number) => void;
}

export const PaymentModals: React.FC<PaymentModalsProps> = ({
    modalVisible,
    setModalVisible,
    handleModalConfirm,
}) => {
    /** Prices display in the devotee's own currency; the India list price is the
     *  input and the server owns the markup. See lib/currency.ts. */
    const { money } = useMoney();
    const [customPrice, setCustomPrice] = useState<string>("");
    const [currentServicePrice, setCurrentServicePrice] = useState<number>(0);

    const handleNumericChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = e.target;
        if (value === "" || /^[0-9]*$/.test(value)) {
            setCustomPrice(value);
        }
    };

    const onConfirmCustom = (serviceName: string) => {
        handleModalConfirm(serviceName, parseFloat(customPrice) || currentServicePrice);
    };

    const renderDakshinaModal = () => (
        <Modal
            open={modalVisible === "Dakshina to Pandit"}
            onCancel={() => setModalVisible(null)}
            footer={null}
            styles={{ body: { textAlign: "center" } }}
        >
            <div
                style={{
                    background: "linear-gradient(to bottom, #FFFFFF, #F1AE7C)",
                    borderRadius: "8px",
                }}
            >
                <img loading="lazy" 
                    src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/pooja-images/flower.png"
                    style={{ width: "100%" }}
                    alt="Flower Decoration"
                 />
                <div
                    style={{
                        fontSize: "20px",
                        color: "black",
                        marginBottom: "3%",
                        marginTop: "1.5%",
                    }}
                >
                    Dakshina to Pandit Ji!
                </div>
                <Button
                    onClick={() => handleModalConfirm("Dakshina to Pandit", 51)}
                    style={{ margin: "5px" }}
                >
                    {money(51)}
                </Button>
                <Button
                    onClick={() => handleModalConfirm("Dakshina to Pandit", 101)}
                    style={{ margin: "5px" }}
                >
                    {money(101)}
                </Button>
                <Button
                    onClick={() => handleModalConfirm("Dakshina to Pandit", 501)}
                    style={{ margin: "5px" }}
                >
                    {money(501)}
                </Button>
                <Button
                    onClick={() => handleModalConfirm("Dakshina to Pandit", 1100)}
                    style={{ margin: "5px" }}
                >
                    {money(1100)}
                </Button>
                <Button
                    onClick={() => handleModalConfirm("Dakshina to Pandit", 2100)}
                    style={{ margin: "5px" }}
                >
                    {money(2100)}
                </Button>
                <div style={{ paddingInline: "20%" }}>
                    <Input
                        placeholder="Add with your preference"
                        value={customPrice}
                        onChange={handleNumericChange}
                        style={{ margin: "10px 0", borderRadius: "10px", padding: "5px" }}
                    />
                </div>
                <div
                    style={{
                        justifyContent: "center",
                        width: "100%",
                        display: "flex",
                        marginTop: "5%",
                    }}
                >
                    <img loading="lazy" 
                        src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/pooja-images/paymentdiya.png"
                        style={{ width: "40%" }}
                        alt="Payment Diya"
                     />
                </div>
                <p style={{ paddingInline: "7%", marginTop: "5%", fontSize: "12px" }}>
                    You will receive a personalized card confirming that your donation to
                    the pandit has been successfully processed. This card serves as an
                    official acknowledgment and a token of gratitude for your generous
                    contribution.
                </p>
                <Button
                    style={{
                        marginTop: "3%",
                        marginBottom: "0%",
                        backgroundColor: "#FF6505",
                        paddingInline: "10%",
                    }}
                    type="primary"
                    onClick={() => onConfirmCustom("Dakshina to Pandit")}
                >
                    Done
                </Button>
                <div
                    style={{
                        width: "100%",
                        justifyContent: "start",
                        paddingBottom: "3%",
                    }}
                >
                    <img loading="lazy" 
                        src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/pooja-images/panditji.png"
                        style={{ width: "40%" }}
                        alt="Pandit Ji"
                     />
                </div>
            </div>
        </Modal>
    );

    const renderDonateModal = () => (
        <Modal
            open={modalVisible === "Donate to Mandir"}
            onCancel={() => setModalVisible(null)}
            footer={null}
            styles={{ body: { textAlign: "center" } }}
            style={{ borderRadius: "30px" }}
        >
            <div
                style={{
                    background: "linear-gradient(to bottom, #FFFFFF, #F1AE7C)",
                    borderRadius: "8px",
                }}
            >
                <img loading="lazy" 
                    src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/pooja-images/flower.png"
                    style={{ width: "100%" }}
                    alt="Flower Decoration"
                 />
                <div
                    style={{
                        fontSize: "20px",
                        color: "black",
                        marginBottom: "3%",
                        marginTop: "1.5%",
                    }}
                >
                    Donate to the Mandir!
                </div>
                <Button
                    onClick={() => handleModalConfirm("Donate to Mandir", 51)}
                    style={{ margin: "5px" }}
                >
                    {money(51)}
                </Button>
                <Button
                    onClick={() => handleModalConfirm("Donate to Mandir", 101)}
                    style={{ margin: "5px" }}
                >
                    {money(101)}
                </Button>
                <Button
                    onClick={() => handleModalConfirm("Donate to Mandir", 501)}
                    style={{ margin: "5px" }}
                >
                    {money(501)}
                </Button>
                <Button
                    onClick={() => handleModalConfirm("Donate to Mandir", 1100)}
                    style={{ margin: "5px" }}
                >
                    {money(1100)}
                </Button>
                <Button
                    onClick={() => handleModalConfirm("Donate to Mandir", 2100)}
                    style={{ margin: "5px" }}
                >
                    {money(2100)}
                </Button>
                <div style={{ paddingInline: "20%" }}>
                    <Input
                        placeholder="Add with your preference"
                        value={customPrice}
                        onChange={handleNumericChange}
                        style={{ margin: "10px 0", borderRadius: "10px", padding: "5px" }}
                    />
                </div>
                <div
                    style={{
                        justifyContent: "center",
                        width: "100%",
                        display: "flex",
                        marginTop: "5%",
                    }}
                >
                    <img loading="lazy" 
                        src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/pooja-images/paymentdiya.png"
                        style={{ width: "40%" }}
                        alt="Payment Diya"
                     />
                </div>
                <p style={{ paddingInline: "7%", marginTop: "5%", fontSize: "12px" }}>
                    You will receive a personalized card confirming that your donation to
                    the Mandir has been successfully processed. This card serves as an
                    official acknowledgment and a token of gratitude for your generous
                    contribution.
                </p>
                <Button
                    style={{
                        marginTop: "3%",
                        marginBottom: "0%",
                        backgroundColor: "#FF6505",
                        paddingInline: "10%",
                    }}
                    type="primary"
                    onClick={() => onConfirmCustom("Donate to Mandir")}
                >
                    Done
                </Button>
                <div style={{ width: "100%", justifyContent: "start" }}>
                    <img loading="lazy" 
                        src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/pooja-images/mandir.png"
                        style={{ width: "100%", borderRadius: "8px" }}
                        alt="Mandir"
                     />
                </div>
            </div>
        </Modal>
    );

    const renderBrahmanModal = () => (
        <Modal
            open={modalVisible === "Brahman Bhoj"}
            onCancel={() => setModalVisible(null)}
            footer={null}
            styles={{ body: { textAlign: "center" } }}
        >
            <div
                style={{
                    background: "linear-gradient(to bottom, #FFFFFF, #F1AE7C)",
                    borderRadius: "8px",
                }}
            >
                <img loading="lazy" 
                    src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/pooja-images/flower.png"
                    style={{ width: "100%" }}
                    alt="Flower Decoration"
                 />
                <div
                    style={{
                        fontSize: "20px",
                        color: "black",
                        marginBottom: "3%",
                        marginTop: "1.5%",
                    }}
                >
                    Brahman Bhoj!
                </div>
                <Row style={{ justifyContent: "center" }}>
                    <div
                        onClick={() => handleModalConfirm("Brahman Bhoj", 301)}
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            alignItems: "center",
                            margin: "5px",
                            backgroundColor: "white",
                            width: "15%",
                            borderRadius: "12px",
                            paddingBlock: "1%",
                            cursor: "pointer",
                        }}
                    >
                        <div>2 pandit</div>
                        <img loading="lazy" 
                            src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/pooja-images/panditji.png"
                            style={{ width: "70%" }}
                            alt="Pandit Ji"
                         />
                        <div
                            style={{
                                backgroundColor: "#1AA11F",
                                borderRadius: "12px",
                                width: "70%",
                                alignSelf: "center",
                                color: "white",
                                marginTop: "2%",
                            }}
                        >
                            {money(301)}
                        </div>
                    </div>
                    <div
                        onClick={() => handleModalConfirm("Brahman Bhoj", 601)}
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            alignItems: "center",
                            margin: "5px",
                            backgroundColor: "white",
                            width: "15%",
                            borderRadius: "12px",
                            paddingBlock: "1%",
                            cursor: "pointer",
                        }}
                    >
                        <div>4 pandit</div>
                        <img loading="lazy" 
                            src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/pooja-images/panditji.png"
                            style={{ width: "70%" }}
                            alt="Pandit Ji"
                         />
                        <div
                            style={{
                                backgroundColor: "#1AA11F",
                                borderRadius: "12px",
                                width: "70%",
                                alignSelf: "center",
                                color: "white",
                                marginTop: "2%",
                            }}
                        >
                            {money(601)}
                        </div>
                    </div>
                    <div
                        onClick={() => handleModalConfirm("Brahman Bhoj", 901)}
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            alignItems: "center",
                            margin: "5px",
                            backgroundColor: "white",
                            width: "15%",
                            borderRadius: "12px",
                            paddingBlock: "1%",
                            cursor: "pointer",
                        }}
                    >
                        <div>6 pandit</div>
                        <img loading="lazy" 
                            src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/pooja-images/panditji.png"
                            style={{ width: "70%" }}
                            alt="Pandit Ji"
                         />
                        <div
                            style={{
                                backgroundColor: "#1AA11F",
                                borderRadius: "12px",
                                width: "70%",
                                alignSelf: "center",
                                color: "white",
                                marginTop: "2%",
                            }}
                        >
                            {money(901)}
                        </div>
                    </div>
                    <div
                        onClick={() => handleModalConfirm("Brahman Bhoj", 1201)}
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            alignItems: "center",
                            margin: "5px",
                            backgroundColor: "white",
                            width: "15%",
                            borderRadius: "12px",
                            paddingBlock: "1%",
                            cursor: "pointer",
                        }}
                    >
                        <div>8 pandit</div>
                        <img loading="lazy" 
                            src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/pooja-images/panditji.png"
                            style={{ width: "70%" }}
                            alt="Pandit Ji"
                         />
                        <div
                            style={{
                                backgroundColor: "#1AA11F",
                                borderRadius: "12px",
                                width: "70%",
                                alignSelf: "center",
                                color: "white",
                                marginTop: "2%",
                            }}
                        >
                            {money(1201)}
                        </div>
                    </div>
                </Row>
                <Row style={{ justifyContent: "center" }}>
                    <Select
                        style={{ width: "50%", margin: "10px" }}
                        placeholder="Select Pandit Option"
                        onChange={(value) => setCurrentServicePrice(value as number)}
                    >
                        <Option value={1801}>12 Pandits ({money(1801)})</Option>
                        <Option value={2101}>14 Pandits ({money(2101)})</Option>
                        <Option value={2401}>18 Pandits ({money(2401)})</Option>
                        <Option value={2701}>20 Pandits ({money(2701)})</Option>
                    </Select>
                </Row>
                <div
                    style={{
                        justifyContent: "center",
                        width: "100%",
                        display: "flex",
                        marginTop: "5%",
                    }}
                >
                    <img loading="lazy" 
                        src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/pooja-images/paymentdiya.png"
                        style={{ width: "40%" }}
                        alt="Payment Diya"
                     />
                </div>
                <p style={{ paddingInline: "7%", marginTop: "5%", fontSize: "12px" }}>
                    You will receive a personalized card & Images confirming that your
                    Brahman Bhoj has been successfully processed. This card serves as an
                    official acknowledgment and a token of gratitude for your generous
                    contribution.
                </p>
                <Button
                    style={{
                        marginTop: "3%",
                        marginBottom: "0%",
                        backgroundColor: "#FF6505",
                        paddingInline: "10%",
                    }}
                    type="primary"
                    onClick={() => {
                        handleModalConfirm("Brahman Bhoj", currentServicePrice);
                    }}
                >
                    Done
                </Button>
                <div
                    style={{
                        width: "100%",
                        justifyContent: "start",
                        paddingBottom: "3%",
                        display: "flex",
                        flexDirection: "column",
                    }}
                >
                    <img loading="lazy" 
                        src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/pooja-images/panditji.png"
                        style={{ width: "40%" }}
                        alt="Pandit Ji"
                     />
                </div>
            </div>
        </Modal>
    );

    return (
        <>
            {renderDakshinaModal()}
            {renderDonateModal()}
            {renderBrahmanModal()}
        </>
    );
};
