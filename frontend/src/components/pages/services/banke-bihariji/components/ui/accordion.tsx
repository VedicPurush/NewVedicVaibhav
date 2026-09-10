"use client";

import * as React from "react";
import Collapse from "@mui/material/Collapse";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

type AccordionContextValue = {
  openItem: string | null;
  setOpenItem: (id: string | null) => void;
  collapsible: boolean;
};

const AccordionContext = React.createContext<AccordionContextValue>({
  openItem: null,
  setOpenItem: () => {},
  collapsible: true,
});

const AccordionItemContext = React.createContext<{ value: string }>({ value: "" });

const Accordion = ({
  children,
  collapsible,
  className,
}: {
  children: React.ReactNode;
  type?: "single" | "multiple";
  collapsible?: boolean;
  className?: string;
}) => {
  const [openItem, setOpenItem] = React.useState<string | null>(null);
  return (
    <AccordionContext.Provider value={{ openItem, setOpenItem, collapsible: collapsible ?? false }}>
      <div className={className}>{children}</div>
    </AccordionContext.Provider>
  );
};

const AccordionItem = ({
  value,
  className,
  children,
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
}) => (
  <AccordionItemContext.Provider value={{ value }}>
    <div className={className}>{children}</div>
  </AccordionItemContext.Provider>
);

const AccordionTrigger = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  const { openItem, setOpenItem, collapsible } = React.useContext(AccordionContext);
  const { value } = React.useContext(AccordionItemContext);
  const isOpen = openItem === value;

  const handleClick = () => {
    if (isOpen && collapsible) {
      setOpenItem(null);
    } else {
      setOpenItem(value);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`flex w-full items-center justify-between text-left ${className ?? ""}`}
    >
      {children}
      <ExpandMoreIcon
        sx={{
          fontSize: 20,
          flexShrink: 0,
          transition: "transform 0.2s",
          transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
        }}
      />
    </button>
  );
};

const AccordionContent = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  const { openItem } = React.useContext(AccordionContext);
  const { value } = React.useContext(AccordionItemContext);
  const isOpen = openItem === value;

  return (
    <Collapse in={isOpen}>
      <div className={className}>{children}</div>
    </Collapse>
  );
};

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
