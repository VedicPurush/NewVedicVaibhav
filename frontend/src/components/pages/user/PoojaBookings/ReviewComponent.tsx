"use client";

import { useEffect, useState } from "react";
import { message } from "antd";
import Modal from "@mui/material/Modal";
import TextField from "@mui/material/TextField";
import Rating from "@mui/material/Rating";
import RadioGroup from "@mui/material/RadioGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Radio from "@mui/material/Radio";
import FormGroup from "@mui/material/FormGroup";
import Checkbox from "@mui/material/Checkbox";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import CloseIcon from "@mui/icons-material/Close";
import StarIcon from "@mui/icons-material/Star";
import { useTranslation } from "react-i18next";
import { apiUrl } from "@/lib/api";

type ReviewItem = {
  _id?: string;
  pujaId: string;
  poojaname?: string;
  name: string;
  phone: string;
  satisfaction: number;
  spiritualExperience?: string;
  quality: number;
  appreciatedAspects?: string[];
  appreciatedOther?: string;
  improvementSuggestions?: string;
  isComplete?: boolean;
  addedOn?: string;
  updatedAt?: string;
  rating?: number;
  review?: string;
};

type UserInfo = { name: string | null; phone: string | null };

const getUserInfoFromLocal = (): UserInfo => {
  try {
    // 1. PRIORITY: checkoutContact object (for non-logged-in users who just completed payment)
    const rawCheckout = localStorage.getItem("checkoutContact");
    if (rawCheckout) {
      const parsed = JSON.parse(rawCheckout);
      if (parsed && parsed.name && parsed.phone) {
        const phone = String(parsed.phone).replace(/\D/g, "").slice(-10);
        if (phone.length === 10) return { name: parsed.name, phone };
      }
    }

    // 2. userDetails.user object (for logged-in users)
    const rawUserDetails = localStorage.getItem("userDetails");
    if (rawUserDetails) {
      const parsed = JSON.parse(rawUserDetails);
      if (parsed && parsed.user) {
        // Check multiple possible name fields
        const name = parsed.user.name || parsed.user.given_name || null;
        const phoneRaw = parsed.user.phone || parsed.user.mobile || "";
        const phone = String(phoneRaw).replace(/\D/g, "").slice(-10);
        if (phone.length === 10) return { name, phone };
      }
    }

    // 3. Direct phone or mobile key
    const direct =
      localStorage.getItem("phone") || localStorage.getItem("mobile");
    if (direct) {
      const norm = direct.replace(/\D/g, "").slice(-10);
      if (norm.length === 10) return { name: null, phone: norm };
    }

    // 4. Other fallback user objects (auth/profile)
    const raw = localStorage.getItem("auth") || localStorage.getItem("profile");
    if (raw) {
      const u = JSON.parse(raw);
      const name = u?.name || u?.user?.name || u?.user?.given_name || null;
      const phoneRaw =
        u?.phone || u?.mobile || u?.user?.phone || u?.user?.mobile || "";
      const phone = String(phoneRaw).replace(/\D/g, "").slice(-10);
      if (phone.length === 10) return { name, phone };
    }
  } catch (e) {
    console.error("Error reading user info from localStorage", e);
  }
  return { name: null, phone: null };
};

const initialForm = (poojaname = "", pujaId = "", bookingId = "") => ({
  bookingId,
  pujaId,
  poojaname,
  name: "",
  phone: "",
  satisfaction: 0,
  spiritualExperience: "",
  quality: 0,
  appreciatedAspects: [] as string[],
  appreciatedOther: "",
  improvementSuggestions: "",
});

const ReviewComponent = ({
  pujaId,
  poojaname,
  bookingId,
}: {
  pujaId: string;
  poojaname: string;
  bookingId: string;
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState(initialForm(poojaname, pujaId));
  const [review, setReview] = useState<ReviewItem | null>(null);
  const [loading, setLoading] = useState(false);

  const { t } = useTranslation();

  // Modal open logic: fetch review for pujaId
  const handleOpen = async () => {
    setModalOpen(true);
    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/feedback/by-booking/${bookingId}`));
      if (res.ok) {
        const data = await res.json();
        setReview(data.data);
        // Pre-fill form with review data
        setFormData({
          ...initialForm(
            data.data.poojaname,
            data.data.pujaId,
            data.data.bookingId
          ),
          ...data.data,
        });
      } else {
        // No review yet: fill from booking/localStorage as much as possible
        setReview(null);
        const phone = getUserInfoFromLocal().phone ?? "";
        const name = getUserInfoFromLocal().name ?? "";
        setFormData({
          ...initialForm(poojaname, pujaId, bookingId),
          phone,
          name,
        });
      }
    } catch {
      message.error(t("Error loading review"));
      setReview(null);
      setFormData(initialForm(poojaname, pujaId));
    } finally {
      setLoading(false);
    }
  };

  // Reset form when closed
  useEffect(() => {
    if (!modalOpen) {
      setFormData(initialForm(poojaname, pujaId));
    }
  }, [modalOpen, poojaname, pujaId, bookingId]);

  // Handle field changes, disable if already filled
  const handleChange =
    (field: keyof typeof formData) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFormData((prev) => ({
        ...prev,
        [field]: event.target.value,
      }));
    };

  const handleCheckboxChange = (aspect: string) => () => {
    setFormData((prev) => {
      const selected = prev.appreciatedAspects.includes(aspect)
        ? prev.appreciatedAspects.filter((a: string) => a !== aspect)
        : [...prev.appreciatedAspects, aspect];
      return { ...prev, appreciatedAspects: selected };
    });
  };

  // For disabling fields already filled (from partial review)
  const disableField = (field: keyof ReviewItem) => {
    if (review?.isComplete) return true;
    if (
      field === "name" ||
      field === "phone" ||
      field === "satisfaction" ||
      field === "quality"
    ) {
      return Boolean(review && review[field]);
    }
    return false;
  };

  // Submit review: upsert API, mark isComplete if all required fields filled
  const handleSubmit = async () => {
    // Validate required fields for completion
    const missingFields: string[] = [];
    if (!formData.name.trim()) missingFields.push(t("Name"));
    if (!formData.phone.trim()) missingFields.push(t("Phone Number"));
    if (!formData.satisfaction) missingFields.push(t("Satisfaction"));
    if (!formData.quality) missingFields.push(t("Quality"));
    if (!formData.spiritualExperience?.trim())
      missingFields.push(t("Spiritual Experience"));
    if (
      (!formData.appreciatedAspects ||
        formData.appreciatedAspects.length === 0) &&
      !formData.appreciatedOther?.trim()
    )
      missingFields.push(t("Appreciated Aspects"));
    if (!formData.improvementSuggestions?.trim())
      missingFields.push(t("Improvement Suggestions"));

    if (missingFields.length) {
      message.error(
        `${t(
          "Please fill in the following required fields"
        )}: ${missingFields.join(", ")}`
      );
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(apiUrl("/feedback/upsert"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, isComplete: true, bookingId }),
      });
      if (response.ok) {
        const data = await response.json();
        message.success(t("Your review has been added successfully"));
        setReview(data.data);
        setFormData({
          ...initialForm(poojaname, pujaId),
          ...data.data,
        });
        localStorage.removeItem("bookedpujaID");
        localStorage.removeItem("bookingId");
      } else {
        const errorData = await response.json();
        message.error(errorData.message || t("Submission failed"));
      }
    } catch (error: any) {
      message.error(error.message || t("Network error. Please try again later"));
    } finally {
      setLoading(false);
    }
  };

  // View-only display for completed review
  const renderViewMode = (r: ReviewItem) => (
    <Box>
      <Box mb={2} display="flex" alignItems="center" gap={2}>
        <Box
          sx={{
            width: 42,
            height: 42,
            borderRadius: "50%",
            fontWeight: 700,
            fontSize: 16,
            bgcolor: "#f1f5f9",
            color: "#334155",
            display: "grid",
            placeItems: "center",
          }}
        >
          {(r.name || "U")
            .split(" ")
            .map((w) => w[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()}
        </Box>
        <Box>
          <Box fontWeight={700}>{r.name}</Box>
          <Box fontSize={13} color="#64748b">
            {r.poojaname} • {r.phone}
          </Box>
        </Box>
      </Box>
      <Divider />
      <Box mt={2}>
        <Chip
          icon={<StarIcon />}
          label={`Satisfaction: ${r.satisfaction}/5`}
          sx={{ mr: 1, mb: 1 }}
        />
        <Chip label={`Quality: ${r.quality}/5`} sx={{ mr: 1, mb: 1 }} />
      </Box>
      {r.spiritualExperience && (
        <Box mt={2} fontStyle="italic" color="#475569" fontSize={15}>
          “{r.spiritualExperience}”
        </Box>
      )}
      {(r.appreciatedAspects?.length || r.appreciatedOther) && (
        <Box mt={2}>
          <Box fontWeight={600} mb={1}>
            Appreciated Aspects:
          </Box>
          {r.appreciatedAspects?.map((a) => (
            <Chip key={a} label={a} sx={{ mr: 1, mb: 1 }} />
          ))}
          {r.appreciatedOther && (
            <Chip label={r.appreciatedOther} sx={{ mr: 1, mb: 1 }} />
          )}
        </Box>
      )}
      {r.improvementSuggestions && (
        <Box mt={2}>
          <Box fontWeight={600} mb={1}>
            Suggestions for Improvement:
          </Box>
          <Box color="#334155" fontSize={15}>
            {r.improvementSuggestions}
          </Box>
        </Box>
      )}
      {(typeof r.rating === "number" || !!r.review) && (
        <Box mt={2}>
          {typeof r.rating === "number" && (
            <Box display="flex" alignItems="center" mb={0.5}>
              <StarIcon fontSize="small" color="warning" />
              <span style={{ marginLeft: 4, fontWeight: 600 }}>
                User Rating:
              </span>
              <span style={{ marginLeft: 8 }}>{r.rating} / 5</span>
            </Box>
          )}
          {r.review && (
            <Box color="#334155" fontSize={15} mt={0.5}>
              <span style={{ marginLeft: 4, fontWeight: 600 }}>Feedback :</span>
              “{r.review}”
            </Box>
          )}
        </Box>
      )}
      <Box mt={2} fontSize={12} color="#94a3b8">
        {r.updatedAt
          ? "Last updated: " + new Date(r.updatedAt).toLocaleString()
          : ""}
      </Box>
    </Box>
  );

  return (
    <div style={{ display: "inline-block" }}>
      {/* Button triggers modal open — small on purpose: this sits pinned to a
          card's corner (see Chadhavabookingcard.tsx), not inline with a title. */}
      <Button
        variant="contained"
        onClick={handleOpen}
        startIcon={<StarIcon sx={{ fontSize: "14px !important" }} />}
        sx={{
          background: review?.isComplete
            ? "linear-gradient(135deg, #66BB6A, #43A047)"
            : "linear-gradient(135deg, #FFA726, #FB8C00)",
          color: "#fff",
          fontWeight: 600,
          fontSize: "11px",
          lineHeight: 1.2,
          borderRadius: "20px",
          px: 1.25,
          py: 0.4,
          minWidth: 0,
          boxShadow: "0 2px 6px rgba(0,0,0,0.18)",
          "& .MuiButton-startIcon": { mr: 0.5 },
        }}
        size="small"
      >
        {review?.isComplete ? "View" : "Review"}
      </Button>
      {/* Review Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)",
            padding: 0,
            width: "95%",
            maxWidth: "700px",
            maxHeight: "92vh",
            overflowY: "auto",
            borderRadius: "20px",
            boxShadow:
              "0 20px 60px rgba(0,0,0,0.12), 0 8px 30px rgba(0,0,0,0.08)",
          }}
        >
          {/* Header */}
          <div
            style={{
              position: "relative",
              background: "linear-gradient(135deg, #FFB347, #FF7E5F)",
              padding: "4px 10px 0 24px",
              borderTopLeftRadius: "12px",
              borderTopRightRadius: "12px",
              color: "#fff",
            }}
          >
            <IconButton
              onClick={() => setModalOpen(false)}
              sx={{ position: "absolute", top: 8, right: 8, color: "#fff" }}
            >
              <CloseIcon />
            </IconButton>
            <h2 style={{ margin: "6px 0 2px 0", fontWeight: 700, fontSize: 22 }}>
              {review?.isComplete ? "Your Review" : "Share Your Experience"}
            </h2>
            <p style={{ margin: 0, fontSize: 13, opacity: 0.95 }}>{poojaname}</p>
          </div>
          {/* Content */}
          <div style={{ padding: 18, minHeight: 320 }}>
            {loading ? (
              <Box display="flex" justifyContent="center" py={8}>
                <CircularProgress />
              </Box>
            ) : review?.isComplete ? (
              renderViewMode(review)
            ) : (
              <form
                style={{ display: "flex", flexDirection: "column", gap: 16 }}
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmit();
                }}
              >
                {/* Name, Phone */}
                <Box display="flex" gap={2}>
                  <TextField
                    required
                    label="Your Name"
                    fullWidth
                    variant="outlined"
                    value={formData.name}
                    disabled={disableField("name")}
                    onChange={handleChange("name")}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "12px",
                        backgroundColor: "#fafbfc",
                        "&:hover fieldset": { borderColor: "#667eea" },
                        "&.Mui-focused fieldset": { borderColor: "#667eea" },
                      },
                    }}
                  />
                  <TextField
                    required
                    label="Phone Number"
                    fullWidth
                    variant="outlined"
                    value={formData.phone}
                    disabled={disableField("phone")}
                    onChange={handleChange("phone")}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "12px",
                        backgroundColor: "#fafbfc",
                        "&:hover fieldset": { borderColor: "#667eea" },
                        "&.Mui-focused fieldset": { borderColor: "#667eea" },
                      },
                    }}
                  />
                </Box>
                {/* Ratings */}
                <Box
                  sx={{
                    background:
                      "linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)",
                    p: 2,
                    borderRadius: 2,
                    mb: 1,
                    border: "1px solid #e9ecef",
                  }}
                >
                  <label
                    style={{ fontSize: 16, fontWeight: 600, color: "#495057" }}
                  >
                    Overall Satisfaction
                  </label>
                  <Rating
                    value={formData.satisfaction}
                    onChange={(_, v) =>
                      !disableField("satisfaction") &&
                      setFormData((prev) => ({
                        ...prev,
                        satisfaction: v ?? 0,
                      }))
                    }
                    size="large"
                    disabled={disableField("satisfaction")}
                    sx={{
                      ml: 2,
                      "& .MuiRating-iconFilled": { color: "#ffc107" },
                      "& .MuiRating-iconHover": { color: "#ffb300" },
                    }}
                  />
                </Box>
                <Box
                  sx={{
                    background:
                      "linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)",
                    p: 2,
                    borderRadius: 2,
                    mb: 1,
                    border: "1px solid #e9ecef",
                  }}
                >
                  <label
                    style={{ fontSize: 16, fontWeight: 600, color: "#495057" }}
                  >
                    How spiritually fulfilling was your experience?
                  </label>
                  <RadioGroup
                    value={formData.spiritualExperience}
                    onChange={handleChange("spiritualExperience")}
                  >
                    {[
                      "Very Spiritually Fulfilling",
                      "Spiritually Fulfilling",
                      "Neutral",
                      "Slightly Disappointing",
                      "Not Spiritually Fulfilling",
                    ].map((label) => (
                      <FormControlLabel
                        key={label}
                        value={label}
                        control={
                          <Radio
                            sx={{
                              color: "#6c757d",
                              "&.Mui-checked": { color: "#667eea" },
                            }}
                          />
                        }
                        label={label}
                        sx={{
                          margin: 0,
                          padding: "0px 0px",
                          borderRadius: 8,
                          "&:hover": { backgroundColor: "#f8f9fa" },
                          "& .MuiFormControlLabel-label": {
                            fontSize: 14,
                            fontWeight: 500,
                          },
                        }}
                      />
                    ))}
                  </RadioGroup>
                </Box>
                <Box
                  sx={{
                    background:
                      "linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)",
                    p: 2,
                    borderRadius: 2,
                    mb: 1,
                    border: "1px solid #e9ecef",
                  }}
                >
                  <label
                    style={{ fontSize: 16, fontWeight: 600, color: "#495057" }}
                  >
                    Quality & Management of Puja
                  </label>
                  <Rating
                    value={formData.quality}
                    onChange={(_, v) =>
                      !disableField("quality") &&
                      setFormData((prev) => ({
                        ...prev,
                        quality: v ?? 0,
                      }))
                    }
                    size="large"
                    disabled={disableField("quality")}
                    sx={{
                      ml: 2,
                      "& .MuiRating-iconFilled": { color: "#ffc107" },
                      "& .MuiRating-iconHover": { color: "#ffb300" },
                    }}
                  />
                </Box>
                {/* Appreciated Aspects */}
                <Box
                  sx={{
                    background:
                      "linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)",
                    p: 2,
                    borderRadius: 2,
                    mb: 1,
                    border: "1px solid #e9ecef",
                  }}
                >
                  <label
                    style={{ fontSize: 16, fontWeight: 600, color: "#495057" }}
                  >
                    What You Appreciated Most
                  </label>
                  <FormGroup sx={{ gap: 0 }}>
                    {[
                      "Mantra chanting clarity",
                      "Ritual Authenticity",
                      "Atmosphere and Vibe",
                      "Pandits and Priests",
                      "Overall management",
                      "Other",
                    ].map((aspect) => (
                      <FormControlLabel
                        key={aspect}
                        control={
                          <Checkbox
                            checked={formData.appreciatedAspects.includes(
                              aspect
                            )}
                            onChange={handleCheckboxChange(aspect)}
                            sx={{
                              color: "#6c757d",
                              "&.Mui-checked": { color: "#667eea" },
                            }}
                            disabled={review?.isComplete}
                          />
                        }
                        label={aspect}
                        sx={{
                          margin: 0,
                          padding: "0px 0px",
                          borderRadius: 8,
                          "&:hover": { backgroundColor: "#f1f3f4" },
                          "& .MuiFormControlLabel-label": {
                            fontSize: 14,
                            fontWeight: 500,
                          },
                        }}
                      />
                    ))}
                  </FormGroup>
                  {formData.appreciatedAspects.includes("Other") && (
                    <TextField
                      label="Please specify other appreciated aspects"
                      fullWidth
                      margin="normal"
                      variant="outlined"
                      value={formData.appreciatedOther}
                      onChange={handleChange("appreciatedOther")}
                      disabled={review?.isComplete}
                      sx={{
                        mt: 1,
                        "& .MuiOutlinedInput-root": {
                          borderRadius: "12px",
                          backgroundColor: "#fafbfc",
                          "&:hover fieldset": { borderColor: "#667eea" },
                          "&.Mui-focused fieldset": { borderColor: "#667eea" },
                        },
                      }}
                    />
                  )}
                </Box>
                {/* Suggestions */}
                <Box>
                  <h3
                    style={{
                      fontSize: 18,
                      fontWeight: 600,
                      color: "#2c3e50",
                      marginBottom: 10,
                      paddingBottom: 4,
                      borderBottom: "2px solid #e8f4fd",
                    }}
                  >
                    Suggestions for Improvement
                  </h3>
                  <TextField
                    label="Share your suggestions to help us improve"
                    fullWidth
                    multiline
                    rows={4}
                    variant="outlined"
                    value={formData.improvementSuggestions}
                    onChange={handleChange("improvementSuggestions")}
                    disabled={review?.isComplete}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "12px",
                        backgroundColor: "#fafbfc",
                        "&:hover fieldset": { borderColor: "#667eea" },
                        "&.Mui-focused fieldset": { borderColor: "#667eea" },
                      },
                    }}
                  />
                </Box>
                {/* Submit */}
                <Box textAlign="center" pt={2}>
                  <Button
                    variant="contained"
                    size="large"
                    type="submit"
                    disabled={loading || review?.isComplete}
                    sx={{
                      background:
                        "linear-gradient(135deg, #FFB347 0%, #FF7E5F 100%)",
                      borderRadius: "12px",
                      px: 7,
                      fontSize: 16,
                      fontWeight: 600,
                      color: "#fff",
                      boxShadow: "0 4px 15px rgba(255, 126, 95, 0.3)",
                      transition: "all 0.3s ease",
                      "&:hover": {
                        background:
                          "linear-gradient(135deg, #ffa94d 0%, #ff6b4a 100%)",
                        boxShadow: "0 6px 20px rgba(255, 126, 95, 0.4)",
                        transform: "translateY(-1px)",
                      },
                    }}
                  >
                    Submit Feedback
                  </Button>
                </Box>
              </form>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ReviewComponent;
