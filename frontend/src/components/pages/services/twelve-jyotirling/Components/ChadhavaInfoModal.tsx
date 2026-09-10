"use client";

import React from "react";
import Modal from '@mui/material/Modal';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Fade from '@mui/material/Fade';
import Backdrop from '@mui/material/Backdrop';
import CloseIcon from "@mui/icons-material/Close";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

interface ChadhavaInfoModalProps {
    open: boolean;
    onClose: () => void;
}

const ChadhavaInfoModal: React.FC<ChadhavaInfoModalProps> = ({ open, onClose }) => {
    return (
        <Modal
            open={open}
            onClose={onClose}
            closeAfterTransition
            BackdropComponent={Backdrop}
            BackdropProps={{
                timeout: 500,
                sx: { backgroundColor: "rgba(0, 0, 0, 0.85)" }
            }}
        >
            <Fade in={open}>
                <Box
                    sx={{
                        position: "absolute",
                        top: "55%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        width: "90%",
                        maxWidth: 600,
                        bgcolor: "#1a120b",
                        border: "1px solid #c89b3c",
                        borderRadius: 4,
                        boxShadow: "0 0 50px rgba(200, 155, 60, 0.3)",
                        p: { xs: 3, md: 5 },
                        outline: "none",
                        color: "#d6c2a3",
                        overflowY: "auto",
                        maxHeight: "85vh",
                        "&::-webkit-scrollbar": {
                            display: "none",
                        },
                        msOverflowStyle: "none",
                        scrollbarWidth: "none",
                    }}
                >
                    <IconButton
                        onClick={onClose}
                        sx={{
                            position: "absolute",
                            top: 0,
                            right: 0,
                            color: "#c89b3c",
                            "&:hover": { color: "#f5d78e" }
                        }}
                    >
                        <CloseIcon />
                    </IconButton>

                    <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
                        <InfoOutlinedIcon sx={{ color: "#f5d78e", fontSize: 32 }} />
                        <Typography
                            variant="h4"
                            sx={{
                                color: "#f5d78e",
                                fontFamily: "Cinzel, serif",
                                fontSize: { xs: "1.5rem", md: "2rem" }
                            }}
                        >
                            The 12 Jyotirlinga Chadhava
                        </Typography>
                    </Box>

                    <Typography variant="body1" sx={{ mb: 2, lineHeight: 1.8 }}>
                        The 12 Jyotirlinga pilgrimage is a divine journey through the most sacred abodes of Lord Shiva.
                        Each Jyotirlinga represents a unique manifestation of the infinite cosmic light.
                    </Typography>

                    <Box sx={{ bgcolor: "rgba(200, 155, 60, 0.05)", p: 3, borderRadius: 2, border: "1px solid rgba(200, 155, 60, 0.1)", mb: 3 }}>
                        <Typography variant="h6" sx={{ color: "#f5d78e", mb: 1, fontFamily: "Cinzel, serif" }}>
                            Process of Chadhava
                        </Typography>
                        <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                            When you subscribe to this 12-month journey, a special Chadhava (offering) is performed in your name
                            at one Jyotirlinga every month, following the sacred lunar calendar. This ensures year-round
                            blessings for you and your family.
                        </Typography>
                    </Box>

                    <Typography variant="subtitle1" sx={{ color: "#f5d78e", mb: 1, fontWeight: "bold" }}>
                        What you receive:
                    </Typography>
                    <Box component="ul" sx={{ pl: 2, mt: 0, "& li": { mb: 1 } }}>
                        <li>Monthly Puja performed in your Gotra and Name.</li>
                        <li>Sacred Prasad from each temple delivered to your doorstep.</li>
                        <li>Digital Darshan and Puja confirmation.</li>
                        <li>Special blessings on Maha Shivratri and important festivals.</li>
                    </Box>

                    <Box sx={{ mt: 4, textAlign: "center" }}>
                        <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.5)", fontStyle: "italic", fontSize: 13 }}>
                            "May the light of the 12 Jyotirlinga illuminate your path to spiritual prosperity."
                        </Typography>
                    </Box>
                </Box>
            </Fade>
        </Modal>
    );
};

export default ChadhavaInfoModal;
