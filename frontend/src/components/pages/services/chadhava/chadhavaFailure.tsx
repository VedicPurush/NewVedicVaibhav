"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import HighlightOffRounded from '@mui/icons-material/HighlightOffRounded';
import HomeRounded from '@mui/icons-material/HomeRounded';
import { keyframes } from "@mui/material/styles";

const popIn = keyframes`
  0% { transform: scale(0.92); opacity: 0; }
  60% { transform: scale(1.02); opacity: 1; }
  100% { transform: scale(1); }
`;

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const ChadhavaPaymentFailure: React.FC = () => {
  const router = useRouter();

  const handleGoBack = () => router.push("/chadhava");
  const handleHome = () => router.push("/");

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        p: 2,
        position: "relative",
        overflow: "hidden",
        background: "linear-gradient(120deg, #fff7fb, #f0f4ff, #fff7fb)",
      }}
    >
      {/* Shimmer wash */}
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(100deg, transparent, rgba(255,255,255,0.5), transparent)",
          backgroundSize: "200% 100%",
          animation: `${shimmer} 8s linear infinite`,
          pointerEvents: "none",
          mixBlendMode: "soft-light",
        }}
      />

      <Paper
        elevation={6}
        sx={{
          width: "100%",
          maxWidth: 520,
          borderRadius: 4,
          p: { xs: 3, sm: 4 },
          textAlign: "center",
          animation: `${popIn} 500ms ease-out`,
          bgcolor: "background.paper",
          position: "relative",
        }}
      >
        {/* Icon */}
        <Stack
          direction="row"
          spacing={1}
          justifyContent="center"
          alignItems="center"
          sx={{ mb: 2 }}
        >
          <HighlightOffRounded
            sx={{
              fontSize: 40,
              color: "error.main",
              ml: 0.5,
            }}
          />
        </Stack>

        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Payment Failed
        </Typography>

        <Typography variant="body1" sx={{ mt: 1.2, color: "text.secondary" }}>
          Oh no! Your <strong>chadhava</strong> payment didn’t go through.
          <br />
          Don’t worry—we haven’t charged you. You can try again in a moment.
        </Typography>

        {/* Status ribbon */}
        <Box
          sx={{
            mt: 2.5,
            display: "inline-flex",
            alignItems: "center",
            gap: 1,
            px: 1.5,
            py: 0.75,
            borderRadius: 999,
            bgcolor: "error.light",
            color: "error.contrastText",
          }}
        >
          <HighlightOffRounded sx={{ fontSize: 18 }} />
          <Typography variant="caption" sx={{ fontWeight: 600 }}>
            Transaction declined
          </Typography>
        </Box>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          sx={{ mt: 3.5, justifyContent: "center" }}
        >
          <Button
            variant="outlined"
            color="inherit"
            onClick={handleGoBack}
            sx={{ borderRadius: 2, px: 2.5, py: 1 }}
          >
            Go To Chadhava
          </Button>
          <Button
            variant="text"
            color="warning"
            onClick={handleHome}
            startIcon={<HomeRounded />}
            sx={{
              borderRadius: 2,
              px: 2.5,
              py: 1,
              "&:hover": { bgcolor: "warning.light" },
            }}
          >
            Home
          </Button>
        </Stack>

        {/* Help text */}
        <Typography
          variant="caption"
          sx={{ display: "block", mt: 2, color: "text.secondary" }}
        >
          Tip: Check your card details, balance, or network, then try again.
        </Typography>
      </Paper>
    </Box>
  );
};

export default ChadhavaPaymentFailure;
