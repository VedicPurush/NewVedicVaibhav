"use client";

import React from "react";
import { useTranslation } from "react-i18next";

interface Props {
  text: string;
  className?: string;
  tag?: keyof React.JSX.IntrinsicElements;
}

const I18nText: React.FC<Props> = ({ text, className = "", tag = "span" }) => {
  const { t } = useTranslation();
  const Tag = tag;
  return (
    <Tag className={`gskip ${className}`} {...({ translate: "no" } as any)}>
      {t(text)}
    </Tag>
  );
};

export default I18nText;
