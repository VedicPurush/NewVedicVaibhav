"use client";

import React, { useState } from "react";
import Modal from '@mui/material/Modal';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import CloseIcon from "@mui/icons-material/Close";
import { api } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";

interface BookingLookupModalProps {
  open: boolean;
  onClose: () => void;
}

const BookingLookupModal: React.FC<BookingLookupModalProps> = ({ open, onClose }) => {
  const [mobile, setMobile] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [searched, setSearched] = useState(false);

  const handleFetch = async () => {
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const response = await api.get(`/jyotirlinga-subscription/mobile/${mobile}`);
      setBookings(response.data.bookings || []);
    } catch (err: any) {
      console.error("Error fetching bookings:", err);
      setError(err.response?.data?.message || "Failed to fetch bookings. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      sx={{ display: "flex", alignItems: "center", justifyCenter: "center", backdropFilter: "blur(8px)" }}
    >
      <Box
        sx={{
          width: "90%",
          maxWidth: 600,
          maxHeight: "85vh",
          bgcolor: "#1a120b",
          border: "2px solid #c89b3c",
          borderRadius: 6,
          p: { xs: 3, md: 5 },
          position: "relative",
          outline: "none",
          overflowY: "auto",
          boxShadow: "0 0 50px rgba(200, 155, 60, 0.3)",
        }}
      >
        <IconButton
          onClick={onClose}
          sx={{ position: "absolute", top: 16, right: 16, color: "#c89b3c" }}
        >
          <CloseIcon />
        </IconButton>

        <Typography variant="h4" sx={{ color: "#f5d78e", fontFamily: "Cinzel, serif", textAlign: "center", mb: 2 }}>
          Your Divine Bookings
        </Typography>
        <Typography variant="body1" sx={{ color: "#d6c2a3", textAlign: "center", mb: 4, fontStyle: "italic" }}>
          Enter your mobile number to see your sacred journeys
        </Typography>

        <Box sx={{ display: "flex", gap: 2, mb: 4 }}>
          <TextField
            fullWidth
            label="Mobile Number"
            variant="outlined"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            error={!!error}
            helperText={error}
            sx={{
              "& .MuiOutlinedInput-root": {
                color: "#f5d78e",
                "& fieldset": { borderColor: "rgba(200,155,60,0.5)" },
                "&:hover fieldset": { borderColor: "#c89b3c" },
                "&.Mui-focused fieldset": { borderColor: "#c89b3c" },
              },
              "& .MuiInputLabel-root": { color: "#d6c2a3" },
              "& .MuiInputLabel-root.Mui-focused": { color: "#f5d78e" },
            }}
          />
          <Button
            variant="contained"
            onClick={handleFetch}
            disabled={loading}
            sx={{
              background: "linear-gradient(135deg, #f5d78e, #c89b3c)",
              color: "#000",
              fontWeight: "bold",
              px: 4,
              borderRadius: 2,
              "&:hover": { opacity: 0.9, background: "linear-gradient(135deg, #f5d78e, #c89b3c)" },
            }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : "Fetch"}
          </Button>
        </Box>

        <AnimatePresence>
          {searched && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {bookings.length > 0 ? (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {bookings.map((booking) => (
                    <Box
                      key={booking._id}
                      sx={{
                        p: 3,
                        borderRadius: 3,
                        bgcolor: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(200,155,60,0.2)",
                        transition: "transform 0.2s",
                        "&:hover": { transform: "translateY(-4px)", borderColor: "rgba(200,155,60,0.5)" },
                      }}
                    >
                      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                        <Typography variant="h6" sx={{ color: "#f5d78e" }}>
                          {booking.planName} Plan
                        </Typography>
                        <Box
                          sx={{
                            px: 2,
                            py: 0.5,
                            borderRadius: 1,
                            fontSize: "0.75rem",
                            fontWeight: "bold",
                            bgcolor: booking.status === "confirmed" || booking.status === "completed" ? "#1e4620" : "#4a3b1e",
                            color: booking.status === "confirmed" || booking.status === "completed" ? "#a3e635" : "#f5d78e",
                            textTransform: "uppercase",
                          }}
                        >
                          {booking.status}
                        </Box>
                      </Box>

                      <Typography variant="body2" sx={{ color: "#cfc2b0", mb: 2 }}>
                        Order ID: {booking.orderID} • {new Date(booking.bookingDate).toLocaleDateString()}
                      </Typography>

                      <Divider sx={{ borderColor: "rgba(200,155,60,0.1)", mb: 2 }} />

                      <Typography variant="subtitle2" sx={{ color: "#e7b56d", mb: 1 }}>
                        Selected Jyotirlinga:
                      </Typography>
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                        {booking.jyotirlingaIds.map((j: any) => (
                          <Box
                            key={j._id}
                            sx={{
                              px: 1.5,
                              py: 0.5,
                              borderRadius: 4,
                              bgcolor: "rgba(200,155,60,0.1)",
                              border: "1px solid rgba(200,155,60,0.2)",
                              fontSize: "0.75rem",
                              color: "#f5d78e",
                            }}
                          >
                            {j.nameEnglish}
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  ))}
                </Box>
              ) : (
                !loading && (
                  <Box sx={{ textAlign: "center", py: 8 }}>
                    <Typography variant="h6" sx={{ color: "#d6c2a3", opacity: 0.6 }}>
                      No bookings found for this number.
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#cfc2b0", mt: 1 }}>
                      Start your divine journey today by selecting Jyotirlinga!
                    </Typography>
                  </Box>
                )
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </Box>
    </Modal>
  );
};

export default BookingLookupModal;
