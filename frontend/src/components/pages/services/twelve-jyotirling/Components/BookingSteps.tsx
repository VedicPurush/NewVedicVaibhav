"use client";

import React from "react";
import { motion } from "framer-motion";
import TempleHinduIcon from "@mui/icons-material/TempleHindu";
import InventoryIcon from "@mui/icons-material/Inventory";
import EditNoteIcon from "@mui/icons-material/EditNote";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";

const steps = [
    { id: 1, label: "Select Jyotirling", icon: <TempleHinduIcon fontSize="small" /> },
    { id: 2, label: "Select Package", icon: <InventoryIcon fontSize="small" /> },
    { id: 3, label: "Fill Details", icon: <EditNoteIcon fontSize="small" /> },
    { id: 4, label: "Confirm", icon: <CheckCircleOutlineIcon fontSize="small" /> },
];

interface BookingStepsProps {
    activeStep?: number; // 1–4
}

const BookingSteps: React.FC<BookingStepsProps> = ({ activeStep = 1 }) => {
    // Progress bar width: spans between step circles
    // 0% at step 1, ~33% gap between each step
    const progressPercent = ((activeStep - 1) / (steps.length - 1)) * 100;

    return (
        <div className="w-full max-w-2xl mx-auto px-4 py-2">
            <div className="relative flex justify-between items-center">
                {/* Background track */}
                <div className="absolute top-5 left-0 w-full h-[3px] bg-transparent rounded-full" />

                {/* Active progress fill */}
                <motion.div
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                    className="absolute top-5 left-0 h-[3px] rounded-full"
                    style={{
                        background: "linear-gradient(90deg, #f5d78e, #c89b3c)",
                    }}
                />

                {steps.map((step) => {
                    const isCompleted = step.id < activeStep;
                    const isActive = step.id === activeStep;

                    return (
                        <div key={step.id} className="flex flex-col items-center gap-1.5 z-10">
                            <motion.div
                                animate={{
                                    scale: isActive ? 1.15 : 1,
                                    boxShadow: isActive
                                        ? "0 0 16px rgba(245,215,142,0.7)"
                                        : isCompleted
                                            ? "0 0 8px rgba(200,155,60,0.4)"
                                            : "none",
                                }}
                                transition={{ duration: 0.3 }}
                                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors duration-300
                                    ${isActive
                                        ? "bg-[#c89b3c] border-[#f5d78e] text-black"
                                        : isCompleted
                                            ? "bg-[#f5d78e] border-[#c89b3c] text-black"
                                            : "bg-[#c89b3c]/20 border-[#c89b3c]/60 text-[#c89b3c]/70"
                                    }`}
                            >
                                {step.icon}
                            </motion.div>
                            <span
                                className={`text-[10px] md:text-xs font-medium text-center leading-tight
                                    ${isActive
                                        ? "text-[#f5d78e]"
                                        : isCompleted
                                            ? "text-[#c89b3c]"
                                            : "text-[#a89070]"
                                    }`}
                            >
                                {step.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default BookingSteps;
