"use client";

import React, { useState } from "react";
import useMediaQuery from '@mui/material/useMediaQuery';

interface MandirDataProps {
  introData: string;
  historyData: string;
}

const AccordionSection = ({
  title,
  htmlContent,
  isSmallScreen,
}: {
  title: string;
  htmlContent: string;
  isSmallScreen: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div
      style={{
        background: "#FFFEFA",
        border: "1px solid rgba(0,0,0,0.10)",
        borderRadius: 14,
        overflow: "hidden",
        marginBottom: 14,
        boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
      }}
    >
      {/* Header / Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: isSmallScreen ? "12px 14px" : "14px 20px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img loading="lazy"
            style={{ height: isSmallScreen ? 24 : 32 }}
            src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/overall_images/sidebar.png"
            alt=""
           />
          <span
            style={{
              color: "#1E1E1E",
              fontFamily: "Poppins",
              fontSize: isSmallScreen ? 14 : 16,
              fontWeight: 600,
              letterSpacing: "0.01em",
            }}
          >
            {title}
          </span>
        </div>
        {/* Chevron */}
        <span
          style={{
            display: "inline-block",
            fontSize: 18,
            color: "#E35600",
            transition: "transform 0.28s ease",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            lineHeight: 1,
          }}
        >
          ▾
        </span>
      </button>

      {/* Collapsible content */}
      <div
        style={{
          maxHeight: isOpen ? 2000 : 0,
          overflow: "hidden",
          transition: "max-height 0.35s ease",
        }}
      >
        <div
          style={{
            padding: isSmallScreen ? "0 14px 16px" : "0 20px 20px",
            fontSize: isSmallScreen ? 13 : 15,
            lineHeight: 1.75,
            color: "#374151",
          }}
        >
          <style>{`
            .md-content p, .md-content ul, .md-content ol, .md-content li, .md-content blockquote {
              margin: 0; padding: 0;
            }
            .md-content p { line-height: 1.7; }
            .md-content p + p { margin-top: 0.9em; }
            .md-content ul, .md-content ol { margin-left: 1.4em; margin-top: 0.8em; }
            .md-content ul { list-style-type: disc; }
            .md-content ol { list-style-type: decimal; }
            .md-content li { list-style-position: outside; display: list-item; margin-bottom: 0.4em; }
            .md-content blockquote {
              margin: 0.8em 0; padding-left: 0.9em;
              border-left: 3px solid #E35600; color: #555; font-style: italic;
            }
          `}</style>
          <div
            className="md-content"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </div>
      </div>
    </div>
  );
};

interface Span {
  text: string;
  attrs: any;
}

function buildHtmlFromOps(ops: any[]): string {
  let html = "";
  let inList: "bullet" | "ordered" | null = null;
  let currentLineSpans: Span[] = [];

  const renderLine = (spans: Span[], blockAttrs: any) => {
    let lineHtml = "";
    spans.forEach((span) => {
      let text = span.text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const attrs = span.attrs || {};
      if (attrs.bold) text = `<strong>${text}</strong>`;
      if (attrs.italic) text = `<em>${text}</em>`;
      if (attrs.underline) text = `<u>${text}</u>`;
      if (attrs.link) text = `<a href="${attrs.link}" target="_blank" rel="noopener noreferrer">${text}</a>`;
      lineHtml += text;
    });

    const list = blockAttrs?.list;
    const header = blockAttrs?.header;

    if (list === "bullet" || list === "ordered") {
      const targetList = list === "bullet" ? "bullet" : "ordered";
      if (inList !== targetList) {
        if (inList) {
          html += inList === "bullet" ? "</ul>" : "</ol>";
        }
        html += targetList === "bullet" ? "<ul>" : "<ol>";
        inList = targetList;
      }
      html += `<li>${lineHtml}</li>`;
    } else {
      if (inList) {
        html += inList === "bullet" ? "</ul>" : "</ol>";
        inList = null;
      }
      if (header) {
        html += `<h${header}>${lineHtml}</h${header}>`;
      } else {
        html += `<p>${lineHtml || "<br>"}</p>`;
      }
    }
  };

  ops.forEach((op) => {
    if (typeof op.insert === "string") {
      let text = op.insert;
      const attrs = op.attributes || {};

      let idx = text.indexOf("\n");
      while (idx !== -1) {
        const part = text.substring(0, idx);
        if (part) {
          currentLineSpans.push({ text: part, attrs });
        }
        renderLine(currentLineSpans, attrs);
        currentLineSpans = [];
        text = text.substring(idx + 1);
        idx = text.indexOf("\n");
      }

      if (text) {
        currentLineSpans.push({ text, attrs });
      }
    }
  });

  if (currentLineSpans.length > 0) {
    renderLine(currentLineSpans, {});
  }

  if (inList) {
    html += inList === "bullet" ? "</ul>" : "</ol>";
  }

  return html;
}

const convertDeltaToHtml = (raw: string | undefined): string => {
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.ops && Array.isArray(parsed.ops)) {
      return buildHtmlFromOps(parsed.ops);
    }
  } catch {
    // Not JSON
  }
  if (raw.trim().startsWith("<") && raw.trim().endsWith(">")) {
    return raw;
  }
  return raw
    .split("\n")
    .map((p) => (p.trim() ? `<p>${p.trim()}</p>` : "<p><br></p>"))
    .join("");
};

const MandirData: React.FC<MandirDataProps> = ({ introData, historyData }) => {
  const isSmallScreen = useMediaQuery("(max-width:600px)");

  const parsedIntro = convertDeltaToHtml(introData);
  const parsedHistory = convertDeltaToHtml(historyData);

  return (
    <div style={{ marginTop: 16 }}>
      <AccordionSection
        title="MANDIR'S INTRODUCTION"
        htmlContent={parsedIntro}
        isSmallScreen={isSmallScreen}
      />
      <AccordionSection
        title="MANDIR'S HISTORY"
        htmlContent={parsedHistory}
        isSmallScreen={isSmallScreen}
      />
    </div>
  );
};

export default MandirData;
