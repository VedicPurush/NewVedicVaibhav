"use client";

import { Col } from "antd";
import React, { useState } from "react";

interface FAQProps {
  question: string;
  answer: string;
}

interface FAQItemProps extends FAQProps {
  isOpen: boolean;
  onClick: () => void;
}

const FAQItem: React.FC<FAQItemProps> = ({ question, answer, isOpen, onClick }) => {
  return (
    <div style={{ width: '100%' }}>
      {/* Desktop View */}
      <Col xl={24} lg={24} md={24} xs={0} sm={0}>
        <div
          style={{
            border: "1px solid #ddd",
            width: '100%',
            borderRadius: "8px",
            overflow: 'hidden',
            margin: "10px 0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            transition: "all 0.6s ease",
          }}
        >
          <div
            onClick={onClick}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "1% 2%",
              fontSize: '16px',
              cursor: "pointer",
              fontFamily: "Montserrat",
              borderBottom: isOpen ? "1px solid #ddd" : "none",
            }}
          >
            <span>{question}</span>
            <span style={{ fontSize: "18px", color: "#FF6B00" }}>{isOpen ? "▲" : "▼"}</span>
          </div>
          <div
            style={{
              maxHeight: isOpen ? "500px" : "0",
              opacity: isOpen ? 1 : 0,
              transition: "max-height 0.5s ease, opacity 0.5s ease",
              padding: isOpen ? "1% 2%" : "0 2%",
              backgroundColor: "#fff",
              overflow: "hidden",
            }}
          >
            <p style={{ margin: 0, lineHeight: "1.6", color: "#333" }}>{answer}</p>
          </div>
        </div>
      </Col>

      {/* Mobile View */}
      <Col xl={0} lg={0} md={0} xs={24} sm={24}>
        <div
          style={{
            border: "1px solid #ddd",
            width: '100%',
            borderRadius: "8px",
            overflow: 'hidden',
            margin: "7px 0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            transition: "all 0.3s ease",
          }}
        >
          <div
            onClick={onClick}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "1% 2%",
              fontSize: '14px',
              cursor: "pointer",
              fontFamily: "Montserrat",
              borderBottom: isOpen ? "1px solid #ddd" : "none",
            }}
          >
            <span>{question}</span>
            <span style={{ fontSize: "18px", color: "#FF6B00" }}>{isOpen ? "▲" : "▼"}</span>
          </div>
          <div
            style={{
              maxHeight: isOpen ? "500px" : "0",
              opacity: isOpen ? 1 : 0,
              transition: "max-height 0.5s ease, opacity 0.5s ease",
              padding: isOpen ? "1% 2%" : "0 2%",
              backgroundColor: "#fff",
              overflow: "hidden",
            }}
          >
            <p style={{ margin: 0, lineHeight: "1.6", color: "#333", fontSize: "12px" }}>
              {answer}
            </p>
          </div>
        </div>
      </Col>
    </div>
  );
};

const FAQList: React.FC = () => {
  const faqs: FAQProps[] = [
    {
      question: "Why should I choose Vedic Vaibhav for performing Puja?",
      answer: "Vedic Vaibhav ensures that all Pujas are performed by experienced Vedic priests at renowned temples. We follow authentic Vedic rituals with complete transparency. You receive timely updates, photos, videos, or a certificate as proof of the Puja’s completion, ensuring peace of mind and spiritual satisfaction.",
    },
    {
      question: "I don’t know my Gotra, what should I do?",
      answer: 'If you are unaware of your Gotra, you can mention "Kashyap Gotra," which is widely accepted. Our support team can also guide you in selecting the right option if needed.',
    },
    {
      question: "Who will perform the Puja?",
      answer: 'The Puja will be performed by qualified, experienced Vedic priests who are well-versed in authentic rituals. These priests are carefully selected to ensure every Puja is performed with devotion, precision, and Vedic accuracy.',
    },
    {
      question: "What rituals are included in the Puja?",
      answer:
        "The rituals depend on the type of Puja being performed. Typically, it includes 1. Sankalp (taking a vow in your name) 2. Mantra chanting 3. Havan (fire ritual) 4. Offerings to deities A detailed description of the specific Puja process will be shared with you before the booking. 5. How will I know the Puja has been performed in my name? Once the Puja is completed, you will receive proof of completion, which may include photos, videos, or an e-certificate, depending on the type of Puja. This ensures transparency and builds trust that the Puja was performed on your behalf.",
    },
    {
      question: "How will I know the Puja has been performed in my name?",
      answer:
        "Once the Puja is completed, you will receive proof of completion, which may include photos, videos, or an e-certificate, depending on the type of Puja. This ensures transparency and builds trust that the Puja was performed on your behalf.",
    },
    {
      question: "What other services are offered by Vedic Vaibhav?",
      answer:
        "Once the Puja is completed, you will receive proof of completion, which may include photos, videos, or an e-certificate, depending on the type of Puja. This ensures transparency and builds trust that the Puja was performed on your behalf.",
    },
  ];

  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const handleToggle = (index: number) => {
    setActiveIndex(prevIndex => (prevIndex === index ? null : index));
  };

  return (
    <div style={{width:"100%", backgroundColor:"white"}}>
      {/* Desktop View */}
      <Col xl={24} lg={24} md={24} xs={0} sm={0}>
        <div
          style={{
            paddingInline: "6%",

            paddingBottom: "5%",
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'column'
          }}
        >
          <div style={{ fontSize: '18px', fontWeight: '600', fontFamily: 'Montserrat', marginBottom: '2%' }}>
            Frequently Asked Questions (FAQs)
          </div>
          {faqs.map((faq, index) => (
            <FAQItem
              key={index}
              question={faq.question}
              answer={faq.answer}
              isOpen={activeIndex === index}
              onClick={() => handleToggle(index)}
            />
          ))}
        </div>
      </Col>

      {/* Mobile View */}
      <Col xl={0} lg={0} md={0} xs={24} sm={24}>
        <div
          style={{
            paddingInline: "3%",
            width: "100%",
            paddingBlock: "3.5%",
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'column'
          }}
        >
          <div style={{ fontSize: '16px', fontWeight: '600', fontFamily: 'Montserrat', marginBottom: '2%' }}>
            Frequently Asked Questions (FAQs)
          </div>
          {faqs.map((faq, index) => (
            <FAQItem
              key={index}
              question={faq.question}
              answer={faq.answer}
              isOpen={activeIndex === index}
              onClick={() => handleToggle(index)}
            />
          ))}
        </div>
      </Col>
    </div>
  );
};

export default FAQList;
