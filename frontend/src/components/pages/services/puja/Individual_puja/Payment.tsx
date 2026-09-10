"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Col,
  Row,
  Spin,
  Button,
  message,
} from "antd";
import { useParams, useRouter } from "next/navigation";
import Layout from "@/components/layout/Layout";
import "./Payment.css";
import * as Yup from "yup";
import {
  Formik,
  Form,
  FormikHelpers,
} from "formik";
import dayjs from "dayjs";
import { getVvUtm } from "@/lib/utm";
import confetti from "canvas-confetti";
import PhoneAutoVerification from "@/components/shared/PhoneAutoVerification";
import { api } from "@/lib/api";
import { orderRequestFields, useMoney, toInr } from "@/lib/currency";
import { extractIdFromSlug } from "@/lib/slug";
import { verifyPaymentWithRetry } from "@/lib/verify-payment";
import { PaymentIdolSection } from "./PaymentComponents/PaymentIdolSection";
import { OrderSummaryCard } from "./PaymentComponents/OrderSummaryCard";

import PaymentLoader from "@/components/pages/services/chadhava/PaymentLoader";
import { PromoCodeSection } from "./PaymentComponents/PromoCodeSection";
import { PricingBreakdown } from "./PaymentComponents/PricingBreakdown";
import { ContactAndShippingForm } from "./PaymentComponents/ContactAndShippingForm";
import { PaymentModals } from "./PaymentComponents/PaymentModals";
import { UserDetailsForm } from "./PaymentComponents/UserDetailsForm";
import { useVedicPromosQuery } from "@/hooks/queries/usePromoQueries";
import { usePoojaDetailQuery } from "@/hooks/queries/usePoojaQueries";
import { useMandirByIdQuery } from "@/hooks/useAllPoojas";

// Normalize to 10-digit Indian mobile (strip +91/91 and any non-digits)
const normalizeMobile = (mobile: string) => {
  const digits = (mobile || "").replace(/\D/g, "");
  if (digits.length <= 10) return digits;
  if (digits.startsWith("91")) return digits.slice(-10);
  return digits.slice(-10);
};

// Build a safe fallback email from mobile if user leaves email blank
const makeSafeEmail = (mobile: string, email?: string) => {
  const trimmed = (email || "").trim();
  if (trimmed) return trimmed;
  const digits = normalizeMobile(mobile);
  return digits ? `${digits}@gmail.com` : "user@gmail.com";
};

interface ClickedServices {
  brahmanbhoj: boolean;
  panditdakshina: boolean;
  donate: boolean;
}

interface AddedRow {
  description: string;
  templeName: string | undefined;
  packageName: string;
  date: string;
  time: string;
  price: number;
}

interface FormField {
  label: string;
  name: string;
  type: string;
  value?: string;
}

interface PromoCode {
  _id: string;
  promoName: string;
  discountAmount: number;
  startRange: number;
  description: string;
  startDate: string;
  expiryDate: string;
  promoType: string;
  isActive: boolean;
}

interface FormValues {
  packageName: string;
  fullName1: string;
  fullName2: string;
  fullName3: string;
  fullName4: string;
  fullName5: string;
  fullName6: string;
  gotra: string; // For non-jointFamilyPackage and non-vipPackage
  gotras?: string[]; // For jointFamilyPackage and VIP Package
  prasad: "yes" | "no";
  // shipping details fields
  firstName: string;
  lastName: string;
  address1: string;
  address2: string;
  pincode: string;
  city: string;
  state: string;
  country: string;
  email: string;
  mobile: string;

  // for jointFamilyPackage or vipPackage we store these names in an array
  bhaktaNames: string[];
}

const Payment: React.FC = () => {
  return (
    <div>
      <Layout content={<PaymentContent />} activeIndex="puja" />
    </div>
  );
};

const PaymentContent: React.FC = () => {
  /** Prices display in the devotee's own currency; the India list price is the
   *  input and the server owns the markup. See lib/currency.ts. */
  const { money } = useMoney();
  const { id: routeId } = useParams<{ id: string }>();
  // The route param is a "name-id" slug (see lib/slug.ts). Every usage below —
  // analytics content_ids and the poojaID/poojaId sent to the backend — needs
  // the REAL Mongo id, never the slug string, so it's recovered once here.
  const id = extractIdFromSlug(routeId);
  const router = useRouter();

  // Prasad selection persists in localStorage; hydrate it after mount so the
  // first client render matches the server HTML.
  const [savedPrasad, setSavedPrasad] = useState<"yes" | "no">("no");
  useEffect(() => {
    setSavedPrasad(localStorage.getItem("prasadSelection") === "yes" ? "yes" : "no");
  }, []);

  const pujaId = String(id || "");

  const [selectedPromo, setSelectedPromo] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPromoApplied, setIsPromoApplied] = useState(false);
  // Manual coupon input state
  const [couponCode, setCouponCode] = useState<string>("");
  const [manualCouponError, setManualCouponError] = useState<string>("");
  const [manualCouponLoading, setManualCouponLoading] =
    useState<boolean>(false);

  const {
    data: selectedPuja,
    isLoading: isPoojaLoading,
    isFetching: isPoojaFetching,
  } = usePoojaDetailQuery(pujaId);

  const mandirIdRaw = selectedPuja?.mandirLists?.[0]?.mandirId as
    | string
    | { _id?: string }
    | undefined;
  const mandirId =
    typeof mandirIdRaw === "string"
      ? mandirIdRaw
      : mandirIdRaw?._id || "";

  const {
    data: templeDetails,
    isLoading: isMandirLoading,
    isFetching: isMandirFetching,
  } = useMandirByIdQuery(mandirId);

  // show a tiny “Updating…” indicator when cached data is being refreshed
  const isUpdating =
    (!isPoojaLoading && isPoojaFetching) ||
    (!isMandirLoading && isMandirFetching);

  // Package + form fields
  const [packageName, setPackageName] = useState<string>("");
  const [formData, setFormData] = useState<FormField[]>([]);

  // States for pincode checking
  const [serviceAvailable, setServiceAvailable] = useState<boolean | null>(
    null
  );
  const [cheapestCourier, setCheapestCourier] = useState<any>(null);
  const [pincodeErrorMessage, setPincodeErrorMessage] = useState<string>("");
  const [estimatedDays, setEstimatedDays] = useState<string>("");
  // Loader specifically for pincode check
  const [pincodeLoading, setPincodeLoading] = useState<boolean>(false);

  const [verifying, setVerifying] = useState(false);

  // Payment states
  const [clickedServices, setClickedServices] = useState<ClickedServices>({
    brahmanbhoj: false,
    panditdakshina: false,
    donate: false,
  });
  const [addedRows, setAddedRows] = useState<AddedRow[]>([]);
  const [modalVisible, setModalVisible] = useState<string | null>(null);
  const [totalPrice, setTotalPrice] = useState<number>(0);
  const [discount, setDiscount] = useState(0);
  const [silveridolselected, setsilveridolselected] = useState(false);
  const [showCouponCelebration, setShowCouponCelebration] = useState(false);


  const [poojaDate, setPoojaDate] = useState<string>("");
  const [poojaDatebackend, setPoojaDatebackend] = useState<string>("");
  const [poojaTime, setPoojaTime] = useState<string>("");
  const [packagePrice, setPackagePrice] = useState(0);

  const [userLoggedIn, setUserLoggedIn] = useState(false);
  const [prasadSelected, _setPrasadSelected] = useState<"yes" | "no">("no");
  // Follow the localStorage-hydrated selection (initializer runs before it loads).
  useEffect(() => {
    _setPrasadSelected(savedPrasad);
  }, [savedPrasad]);

  const [idolquantity, setidolQuantity] = useState(1);

  const handleDecrease = () => {
    if (idolquantity > 1) {
      setidolQuantity(idolquantity - 1);
    }
  };

  const handleIncrease = () => {
    setidolQuantity(idolquantity + 1);
  };



  // Helper: Parse puja date (make sure poojaDatebackend is in a parseable format)
  const isBookingDisabled = React.useMemo(() => {
    if (!poojaDatebackend) return false;
    const pujaDate = new Date(poojaDatebackend);
    if (isNaN(pujaDate.getTime())) return false;
    const today = new Date();
    // Remove time part for date-only comparison
    pujaDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return today > pujaDate;
  }, [poojaDatebackend]);


  // Secure pricing calculation that always recalculates from scratch
  // This prevents any infinite discount bugs when overriding coupons
  useEffect(() => {
    const extraCharges = addedRows.reduce((total, row) => total + row.price, 0);
    const idolPrice = silveridolselected && selectedPuja?.idolDetails?.idolPrice
      ? selectedPuja.idolDetails.idolPrice * idolquantity
      : 0;
    const prasadPrice = prasadSelected === "yes" ? 201 : 0;

    let calculatedTotal = packagePrice + extraCharges + idolPrice + prasadPrice - discount;
    if (selectedPromo && selectedPromo.toUpperCase() === "JATIN@100") {
      calculatedTotal = 1;
    } else {
      calculatedTotal = Math.max(0, calculatedTotal);
    }
    setTotalPrice(calculatedTotal);
  }, [packagePrice, addedRows, silveridolselected, idolquantity, selectedPuja, discount, prasadSelected, selectedPromo]);

  useEffect(() => {
    const userDetails = JSON.parse(localStorage.getItem("userDetails") || "{}");
    if (userDetails?.user?._id) {
      setUserLoggedIn(true); // If user exists, no need to send OTP
    }
  }, []);

  // ViewContent — fire once when puja data is available
  useEffect(() => {
    if (!selectedPuja) return;
    window.fbq?.("track", "ViewContent", {
      content_ids: id ? [id] : [],
      content_name: selectedPuja.title || "Puja Booking",
      content_category: templeDetails?.nameEnglish || "Puja",
      content_type: "product",
      value: toInr(packagePrice || selectedPuja.price || 0),
      currency: "INR",
    });
    window.gtag?.("event", "view_item", {
      currency: "INR",
      value: toInr(packagePrice || selectedPuja.price || 0),
      items: [{
        item_id: id || "puja",
        item_name: selectedPuja.title || "Puja Booking",
        item_category: templeDetails?.nameEnglish || "Puja",
        price: packagePrice || selectedPuja.price || 0,
        quantity: 1,
      }],
    });
  }, [selectedPuja]);

  // AddToCart — fire when a package price is set (user has selected a package)
  useEffect(() => {
    if (!packagePrice || !selectedPuja) return;
    window.fbq?.("track", "AddToCart", {
      content_ids: id ? [id] : [],
      content_name: selectedPuja.title || "Puja Booking",
      content_category: templeDetails?.nameEnglish || "Puja",
      content_type: "product",
      value: toInr(packagePrice),
      currency: "INR",
      num_items: 1,
    });
    window.gtag?.("event", "add_to_cart", {
      currency: "INR",
      value: toInr(packagePrice),
      items: [{
        item_id: id || "puja",
        item_name: selectedPuja.title || "Puja Booking",
        item_category: templeDetails?.nameEnglish || "Puja",
        price: packagePrice,
        quantity: 1,
      }],
    });
  }, [packagePrice]);


  // Local Storage references
  const userDetails = useMemo(
    () =>
      typeof window !== "undefined"
        ? JSON.parse(localStorage.getItem("userDetails") || "{}")
        : {},
    [userLoggedIn]
  );
  const selectedpackage = useMemo(
    () =>
      typeof window !== "undefined"
        ? JSON.parse(localStorage.getItem("selectedPackage") || "{}")
        : {},
    []
  );

  let selectedpackagename = "";
  if (selectedpackage.packageName === "singlePackage") {
    selectedpackagename = "Single Package";
  } else if (selectedpackage.packageName === "partnerPackage") {
    selectedpackagename = "Couple Package";
  } else if (selectedpackage.packageName === "familyBhogPackage") {
    selectedpackagename = "Family Package";
  } else if (selectedpackage.packageName === "jointFamilyPackage") {
    selectedpackagename = "Joint Family Package";
  } else if (selectedpackage.packageName === "vipPackage") {
    selectedpackagename = "VIP Package";
  } else {
    selectedpackagename = "VIP Package";
  }

  // On mount or when ID changes, fetch package from localStorage
  useEffect(() => {
    const storedPackage = localStorage.getItem("selectedPackage");
    if (storedPackage) {
      const packageData = JSON.parse(storedPackage);
      if (packageData && packageData.packageName) {
        setPackageName(packageData.packageName);
        generateFormFields(packageData.packageName);
      }
    }
  }, [id, selectedpackage.packageName]);

  // Generate form fields based on package
  const generateFormFields = (selectedPkg: string) => {
    let fields: FormField[] = [];
    if (selectedPkg === "singlePackage") {
      fields = [{ label: "Bhakta Name", name: "fullName1", type: "text" }];
    } else if (selectedPkg === "partnerPackage") {
      fields = [
        { label: "First Bhakta Name", name: "fullName1", type: "text" },
        { label: "Second Bhakta Name", name: "fullName2", type: "text" },
      ];
    } else if (selectedPkg === "familyBhogPackage") {
      fields = [
        { label: "First Bhakta Name", name: "fullName1", type: "text" },
        { label: "Second Bhakta Name", name: "fullName2", type: "text" },
        { label: "Third Bhakta Name", name: "fullName3", type: "text" },
        { label: "Fourth Bhakta Name", name: "fullName4", type: "text" },
        { label: "Fifth Bhakta Name", name: "fullName5", type: "text" },
        { label: "Sixth Bhakta Name", name: "fullName6", type: "text" },
      ];
    } else if (
      selectedPkg === "jointFamilyPackage" ||
      selectedPkg === "vipPackage"
    ) {
      // Initialize with 6 Bhakta names by default OR more if family members exist
      const userDetails = JSON.parse(localStorage.getItem("userDetails") || "{}");
      const familySize = Array.isArray(userDetails?.user?.familyMembers)
        ? userDetails.user.familyMembers.length
        : 0;

      const count = Math.max(6, familySize);

      fields = Array.from({ length: count }, (_, index) => ({
        label: `Bhakta Name ${index + 1}`,
        name: `bhaktaNames[${index}]`,
        type: "text",
      }));
    }
    setFormData(fields);
  };

  // Prefill Email and Mobile if available in localStorage
  let prefillEmail = "";
  let prefillMobile = "";
  let prefillFirstName = "";
  let prefillLastName = "";
  let prefillAddress1 = "";
  let prefillAddress2 = "";
  let prefillCity = "";
  let prefillState = "";
  let prefillCountry = "";
  let prefillPincode = "";
  let prefillGotra = "";
  let prefillFamilyMembers: string[] = [];

  if (userDetails && userDetails.user) {
    const u = userDetails.user;
    if (u.email) prefillEmail = u.email;
    if (u.phone) prefillMobile = normalizeMobile(u.phone);

    prefillFirstName = u.firstname || u.firstName || u.given_name || "";
    prefillLastName = u.lastname || u.lastName || u.family_name || "";

    // Fallback: split 'name' if separate fields missing
    if (!prefillFirstName && u.name) {
      const parts = u.name.trim().split(" ");
      if (parts.length > 0) prefillFirstName = parts[0];
      if (parts.length > 1) prefillLastName = parts.slice(1).join(" ");
    }

    prefillAddress1 = u.address1 || "";
    prefillAddress2 = u.address2 || "";
    prefillCity = u.city || "";
    prefillState = u.state || "";
    prefillCountry = u.country || "";
    prefillPincode = u.pincode || "";

    // New Prefills
    prefillGotra = u.gotra || "";
    if (Array.isArray(u.familyMembers)) {
      prefillFamilyMembers = u.familyMembers;
    }
  }

  // Helper to get family member by index safely
  const getFamilyMember = (idx: number) => prefillFamilyMembers[idx] || "";

  // Initialize form values
  const initialValues: FormValues = {
    packageName: packageName,
    // Pre-fill full names from family members if available
    fullName1: getFamilyMember(0),
    fullName2: getFamilyMember(1),
    fullName3: getFamilyMember(2),
    fullName4: getFamilyMember(3),
    fullName5: getFamilyMember(4),
    fullName6: getFamilyMember(5),

    gotra: prefillGotra,

    gotras:
      packageName === "jointFamilyPackage" || packageName === "vipPackage"
        ? Array(6).fill("").map((_, i) => (i === 0 ? prefillGotra : "")) // Prefill first gotra at least?
        : undefined,
    prasad: savedPrasad,
    firstName: prefillFirstName,
    lastName: prefillLastName,
    address1: prefillAddress1,
    address2: prefillAddress2,
    pincode: prefillPincode,

    city: prefillCity,
    state: prefillState,
    country: prefillCountry,
    mobile: prefillMobile,
    email: prefillEmail,
    bhaktaNames:
      packageName === "jointFamilyPackage" || packageName === "vipPackage"
        ? (prefillFamilyMembers.length > 0
          // If family members exist, fill them in. Pad to 6 if needed, or expand.
          ? Array.from({ length: Math.max(6, prefillFamilyMembers.length) }, (_, i) => prefillFamilyMembers[i] || "")
          : Array(6).fill(""))
        : [],
  };

  // Validation schema
  const validationSchema = Yup.object().shape({
    // Full Names
    fullName1: Yup.string().when("packageName", {
      is: (val: string) => val !== "jointFamilyPackage" && val !== "vipPackage",
      then: (schema) =>
        schema.required(() => {
          return "Full Name 1 is required.";
        }),
      otherwise: (schema) => schema.notRequired(),
    }),
    fullName2: Yup.string().when("packageName", {
      is: (val: string) =>
        val === "partnerPackage" || val === "familyBhogPackage",
      then: (schema) =>
        schema.required(() => {
          return "Full Name 2 is required.";
        }),
      otherwise: (schema) => schema.notRequired(),
    }),

    fullName3: Yup.string().when("packageName", {
      is: "familyBhogPackage",
      then: (schema) => schema.notRequired(),
      otherwise: (schema) => schema.notRequired(),
    }),
    fullName4: Yup.string().when("packageName", {
      is: "familyBhogPackage",
      then: (schema) => schema.notRequired(),
      otherwise: (schema) => schema.notRequired(),
    }),
    fullName5: Yup.string().when("packageName", {
      is: "familyBhogPackage",
      then: (schema) => schema.notRequired(),
      otherwise: (schema) => schema.notRequired(),
    }),
    fullName6: Yup.string().when("packageName", {
      is: "familyBhogPackage",
      then: (schema) => schema.notRequired(),
      otherwise: (schema) => schema.notRequired(),
    }),

    // Bhakta Names
    bhaktaNames: Yup.array(
      Yup.string()
        .trim()
        .required(() => {
          return "Bhakta Name is required.";
        })
    )
      .when("packageName", {
        is: (val: string) =>
          val === "jointFamilyPackage" || val === "vipPackage",
        then: (schema) =>
          schema
            .min(1, () => {
              return "At least 1 Bhakta Name is required.";
            })
            .required(() => {
              return "At least one Bhakta Name is required.";
            }),
        otherwise: (schema) => schema.notRequired(),
      })
      .nullable(),

    // Gotra
    gotra: Yup.string().when("packageName", {
      is: (val: string) => val !== "jointFamilyPackage" && val !== "vipPackage",
      then: (schema) =>
        schema.required(() => {
          return "Gotra is required.";
        }),
      otherwise: (schema) => schema.notRequired(),
    }),

    // Gotras for jointFamilyPackage and vipPackage
    gotras: Yup.array(
      Yup.string()
        .trim()
        .required(() => {
          return "Gotra is required.";
        })
    )
      .when("packageName", {
        is: (val: string) =>
          val === "jointFamilyPackage" || val === "vipPackage",
        then: (schema) =>
          schema
            .min(1, () => {
              return "At least 1 Gotra is required.";
            })
            .required(() => {
              return "At least one Gotra is required.";
            }),
        otherwise: (schema) => schema.notRequired(),
      })
      .nullable(),

    // Prasad selection
    prasad: Yup.string()
      .oneOf(["yes", "no"], () => {
        return "Please select if you would like the Prasad box.";
      })
      .required(() => {
        return "Please select if you would like the Prasad box.";
      }),
    firstName: Yup.string().notRequired(),
    lastName: Yup.string().notRequired(),
    address1: Yup.string().when("prasad", {
      is: "yes",
      then: (schema) =>
        schema.required(() => {
          return "Address 1 is required.";
        }),
      otherwise: (schema) => schema.notRequired(),
    }),
    address2: Yup.string().notRequired(),
    pincode: Yup.string().when("prasad", {
      is: "yes",
      then: (schema) =>
        schema
          .matches(/^\d{6}$/, () => {
            return "Pincode must be exactly 6 digits.";
          })
          .required(() => {
            return "Pincode is required.";
          }),
      otherwise: (schema) => schema.notRequired(),
    }),
    city: Yup.string().when("prasad", {
      is: "yes",
      then: (schema) =>
        schema.required(() => {
          return "City is required.";
        }),
      otherwise: (schema) => schema.notRequired(),
    }),
    state: Yup.string().when("prasad", {
      is: "yes",
      then: (schema) =>
        schema.required(() => {
          return "State is required.";
        }),
      otherwise: (schema) => schema.notRequired(),
    }),
    country: Yup.string().when("prasad", {
      is: "yes",
      then: (schema) =>
        schema.required(() => {
          return "Country is required.";
        }),
      otherwise: (schema) => schema.notRequired(),
    }),

    mobile: Yup.string()
      .matches(/^\d{10}$/, () => {
        return "Mobile number must be exactly 10 digits.";
      })
      .required(() => {
        return "Mobile Number is required.";
      }),
    email: Yup.string().email("Invalid email format").notRequired(),
  });

  // Handle pincode changes + serviceability check
  const handlePincodeChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setFieldValue: (field: string, value: any) => void
  ) => {
    const newVal = e.target.value;
    setFieldValue("pincode", newVal);

    // Only proceed if length is exactly 6
    if (newVal.length === 6) {
      try {
        setPincodeLoading(true);
        setServiceAvailable(null);
        setEstimatedDays("");
        setCheapestCourier(null);
        setPincodeErrorMessage("");

        if (templeDetails && templeDetails._id) {
          const response = await api.get(
            `/serviceability/check?pincode=${newVal}&mandirId=${templeDetails._id}`
          );
          if (response.data.serviceAvailable) {
            setServiceAvailable(true);
            setCheapestCourier(response.data.cheapestCourier);

            if (response.data.cheapestCourier?.estimated_delivery_days) {
              setEstimatedDays(
                response.data.cheapestCourier.estimated_delivery_days
              );
            } else {
              setEstimatedDays("");
            }
          } else {
            setServiceAvailable(false);
            setCheapestCourier(null);
            setEstimatedDays("");
            setPincodeErrorMessage(
              response.data.message || "Delivery not available at this pincode."
            );
          }
        } else {
          setServiceAvailable(false);
          setPincodeErrorMessage(
            "Temple details not loaded yet. Cannot check serviceability."
          );
        }
      } catch (err: any) {
        setServiceAvailable(false);
        setCheapestCourier(null);
        setEstimatedDays("");
        setPincodeErrorMessage(
          err.response?.data?.message || "Error while checking serviceability."
        );
      } finally {
        setPincodeLoading(false);
      }
    } else {
      // Reset states if not exactly 6 digits
      setPincodeLoading(false);
      setServiceAvailable(null);
      setCheapestCourier(null);
      setEstimatedDays("");
      setPincodeErrorMessage("");
    }
  };

  const handleModalConfirm = (service: string, price: number) => {
    const serviceKey: keyof ClickedServices =
      service === "Dakshina to Pandit"
        ? "panditdakshina"
        : service === "Donate to Mandir"
          ? "donate"
          : "brahmanbhoj";

    setAddedRows((prev) => [
      ...prev,
      {
        description: service,
        templeName: templeDetails?.nameEnglish,
        packageName: "--",
        date: "--",
        time: "--",
        price,
      },
    ]);

    setTotalPrice((prev) => prev + price);
    setClickedServices((prevState) => ({
      ...prevState,
      [serviceKey]: true,
    }));
    setModalVisible(null);
  };

  const {
    data: allPromoCodes = [],
    isLoading: isPromoLoading,
    isFetching: isPromoFetching,
  } = useVedicPromosQuery();

  // show tiny “Updating…” indicator when promos refresh in background
  const isPromoUpdating = !isPromoLoading && isPromoFetching;

  const promoCodes = useMemo(() => {
    return allPromoCodes.filter(
      (c: PromoCode) => c.promoType && c.promoType.toLowerCase() !== "influencer-promo"
    );
  }, [allPromoCodes]);

  const handleManualApply = async () => {
    if (!couponCode.trim()) {
      message.warning({ content: "Please enter a coupon code", className: "shadow-sm rounded-xl font-medium" });
      return;
    }
    setManualCouponLoading(true);
    setManualCouponError("");
    const promo = allPromoCodes.find(
      (p: PromoCode) => p.promoName.toUpperCase() === couponCode.trim().toUpperCase()
    );
    if (!promo) {
      message.error({
        content: `Coupon "${couponCode.toUpperCase()}" is invalid or expired.`,
        className: "shadow-md rounded-xl font-medium"
      });
      setManualCouponLoading(false);
      return;
    }
    try {
      handleApplyPromo(promo);
    } catch (err) {
      // Errors handled inside handleApplyPromo
    } finally {
      setManualCouponLoading(false);
    }
  };

  const handleApplyPromo = (promo: PromoCode) => {
    // Current cart value before any discount
    const currentCartValue = packagePrice + addedRows.reduce((acc, r) => acc + r.price, 0) + (silveridolselected && selectedPuja?.idolDetails?.idolPrice ? selectedPuja.idolDetails.idolPrice * idolquantity : 0);

    // Check if the cart value meets the minimum requirement for the coupon
    if (currentCartValue < promo.startRange) {
      message.warning({
        content: `Add ${money(promo.startRange - currentCartValue)} more to your cart to use this coupon!`,
        className: "shadow-md rounded-xl font-medium"
      });
      return;
    }

    // We only set the discount amount. The useEffect handles calculations securely.
    setSelectedPromo(promo.promoName);
    setDiscount(promo.discountAmount);
    setCouponCode("");
    setIsModalOpen(false);
    setIsPromoApplied(true);

    // Trigger celebration
    fireCouponConfetti();
    setShowCouponCelebration(true);
    setTimeout(() => setShowCouponCelebration(false), 3000);

    message.success({
      content: (
        <span className="font-semibold text-emerald-800 tracking-tight">
          ✨ {promo.promoName} applied! You saved {money(promo.discountAmount)}!
        </span>
      ),
      className: "coupon-success-toast",
      style: { marginTop: '10vh' }
    });
  };

  const fireCouponConfetti = () => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(function () {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);
  };

  function formatDateToMDY(dateValue: string | number | Date) {
    const date = new Date(dateValue);
    // getMonth() is 0-based, so +1; getDate() drops leading zero
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
  }



  const initiateRazorpayPayment = async (values: FormValues) => {
    try {
      const normalizedMobile = normalizeMobile(values.mobile);
      const merchantTransactionId = `TXN${Date.now()}`;
      const referralCode = localStorage.getItem("vedicvaibhav_ref_code");

      // Sync user profile and get/create userID before booking
      const safeEmail = makeSafeEmail(normalizedMobile, values.email);

      // Prepare family members for profile update
      let profileFamilyMembers: string[] = [];
      if (values.packageName === "jointFamilyPackage" || values.packageName === "vipPackage") {
        profileFamilyMembers = (values.bhaktaNames || []).filter(name => name?.trim());
      } else {
        profileFamilyMembers = [
          values.fullName1,
          values.fullName2,
          values.fullName3,
          values.fullName4,
          values.fullName5,
          values.fullName6,
        ].filter(name => name?.trim());
      }

      const authResponse = await api.post(
        "/phone-login-or-register",
        {
          phone: normalizedMobile,
          email: safeEmail,
          firstname: values.firstName,
          lastname: values.lastName,
          gotra: values.gotra,
          address1: values.address1,
          address2: values.address2,
          city: values.city,
          state: values.state,
          pincode: values.pincode,
          country: values.country,
          familyMembers: profileFamilyMembers,
        }
      );

      const { user, token } = authResponse.data;
      localStorage.setItem("token", token);
      localStorage.setItem("userDetails", JSON.stringify({ user }));
      setUserLoggedIn(true);

      const emailToUse = (user?.email || "").trim() || safeEmail;


      // ✅ Step 1: Prepare Bhakta Names
      let finalBhaktaNames: string[] = [];
      if (
        values.packageName === "jointFamilyPackage" ||
        values.packageName === "vipPackage"
      ) {
        finalBhaktaNames = values.bhaktaNames.filter(
          (name) => name.trim() !== ""
        );
      } else {
        finalBhaktaNames = [
          values.fullName1,
          values.fullName2,
          values.fullName3,
          values.fullName4,
          values.fullName5,
          values.fullName6,
        ].filter((name) => name.trim() !== "");
      }

      // ✅ Step 2: Prepare Gotras
      let finalGotras: string[] = [];
      if (
        values.packageName === "jointFamilyPackage" ||
        values.packageName === "vipPackage"
      ) {
        finalGotras = values.gotras
          ? values.gotras.filter((g) => g.trim() !== "")
          : [];
      } else {
        if (values.gotra.trim() !== "") {
          finalGotras = [values.gotra.trim()];
        }
      }

      // ✅ Step 3: Prasad address
      const isAddressSelected = values.prasad === "yes";

      // Derive first name / last name from the first Bhakta name
      const derivedFullName = finalBhaktaNames[0] || "";
      const nameParts = derivedFullName.trim().split(/\s+/);
      const derivedFirstName = nameParts[0] || "";
      const derivedLastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

      const bookingDetails = {
        userID: userDetails.user?._id,
        mandirID: templeDetails?._id,
        poojaID: id,
        totalPrice,
        bookingDate: new Date(),
        package: selectedpackage.packageName || "family-package",
        referralCode: referralCode,
        gotra: finalGotras,
        bhaktaNames: finalBhaktaNames,
        dakshinaToPandit: clickedServices.panditdakshina ? 100 : null,
        donateToMandir: clickedServices.donate ? 200 : null,
        brahmanBhoj: clickedServices.brahmanbhoj ? 350 : null,
        poojaStatus: "booked",
        isAddressSelected,
        prasadStatus: values.prasad === "yes" ? "pending" : "pending",
        address1: values.prasad === "yes" ? values.address1 : "",
        address2: values.prasad === "yes" ? values.address2 : "",
        city: values.prasad === "yes" ? values.city : "",
        country: values.prasad === "yes" ? values.country : "",
        email: emailToUse,
        firstname: derivedFirstName,
        lastname: derivedLastName,
        mobile: normalizedMobile,
        state: values.prasad === "yes" ? values.state : "",
        pincode: values.prasad === "yes" ? parseInt(values.pincode) : 0,
        mandirimage: selectedPuja?.poojaCardImage,
        mandirname: templeDetails?.nameEnglish,
        poojaname: selectedPuja?.title,
        poojadate: formatDateToMDY(poojaDatebackend),
        poojatime: poojaTime,
        // meta / tracking
        fbp: (window as any).getCookie?.("_fbp") || document.cookie.match(/_fbp=([^;]+)/)?.[1],
        fbc: (window as any).getCookie?.("_fbc") || document.cookie.match(/_fbc=([^;]+)/)?.[1],
        eventSourceUrl: window.location.href,
        vv_utm: getVvUtm(),
      };

      // ✅ Step 3.5: Sync latest user data (address, gotra, family members) to backend
      try {
        const syncPayload = {
          phone: normalizedMobile,
          email: emailToUse,
          gotra: values.gotra || (finalGotras.length > 0 ? finalGotras[0] : ""),
          // If joint/VIP, safe to send all bhakta names as family members
          // If single/partner, we also send them to be saved in family list
          familyMembers: finalBhaktaNames,
          address1: values.address1,
          address2: values.address2,
          city: values.city,
          state: values.state,
          pincode: values.pincode,
          country: values.country,
          // Derive name from first bhakta name
          firstname: derivedFirstName,
          lastname: derivedLastName,
        };

        await api.post("/phone-login-or-register", syncPayload);
      } catch (e) {
        console.error("Background user sync failed", e);
        // We do not block payment if this fails, but it's good to log
      }

      // ✅ Step 4: Ask backend to create Razorpay order
      const response = await api.post(
        "/create-razorpay-order",
        {
          // Still the INDIA LIST TOTAL in paise, unchanged — the server checks it
          // against the catalog and only then applies any foreign markup.
          amount: totalPrice * 100, // paise
          receipt: merchantTransactionId,
          merchantTransactionId,
          bookingDetails,
          // Presentment request: which currency to bill in, and the market.
          ...orderRequestFields(),
        }
      );

      const { orderId, key, amount: orderAmount, currency: orderCurrency } = response.data;

      // ✅ Step 5: Open Razorpay popup
      const options = {
        key, // Razorpay key_id
        /**
         * ⚠️ TAKEN FROM THE CREATE-ORDER RESPONSE, never re-computed here.
         * The server may have fallen back to INR because the account is not
         * enabled for the requested currency; if the checkout opened on a
         * different currency than the order carries, the payment either fails
         * outright or verifies against the wrong expectation.
         */
        amount: orderAmount ?? totalPrice * 100,
        currency: orderCurrency || "INR",
        name: "Vedic Vaibhav",
        description: "Pooja Booking Payment",
        order_id: orderId,
        notes: {
          merchantTransactionId,
          poojaId: id,
          userId: userDetails.user?._id || "",
        },
        handler: async function (response: any) {
          // The payment is already captured by the time Razorpay calls this, so a
          // confirmation hiccup here must never be shown as a failed payment.
          // Retry through the webhook race instead (see lib/verify-payment.ts).
          setVerifying(true);
          const outcome = await verifyPaymentWithRetry<any>({
            attempt: async () =>
              (
                await api.post("/verify-razorpay-payment", {
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_signature: response.razorpay_signature,
                  merchantTransactionId,
                })
              ).data,
          });

          if (outcome.status === "declined") {
            window.fbq?.("track", "PaymentInfoFailed", {
              content_ids: id ? [id] : [],
              value: toInr(totalPrice),
              currency: "INR",
            });
            window.gtag?.("event", "payment_failed", {
              currency: "INR",
              value: toInr(totalPrice),
              items: [{ item_id: id || "puja", item_name: selectedPuja?.title || "Puja Booking" }],
            });
            message.error("Payment verification failed: " + outcome.message);
            setVerifying(false);
            return;
          }

          const verifyRes = outcome.status === "confirmed" ? { data: outcome.data } : { data: {} as any };

          if (outcome.status === "unconfirmed") {
            // Money is captured and the webhook will finalise the booking — tell
            // the user it is on its way rather than claiming it failed.
            message.success("Payment received. Your booking is being confirmed.");
          }

          const amountPaid = Number(totalPrice) || 0;

          // Meta Purchase — DISABLED: Backend CAPI (poojaBookingController) sends this event to avoid double-counting

          // GA4 Purchase — DISABLED for the same reason as the Meta event
          // above: PujaPaymentSuccessful sends it on /pujapaymentsuccess, which
          // this redirects to. Firing here as well doubled every booking, and
          // the ids differed (merchantTransactionId here vs lastPujaOrderId,
          // which prefers the backend bookingId) so GA4 saw two separate sales.


          try {
            const smsUrl = `https://www.fast2sms.com/dev/bulkV2?authorization=PEM5CjAJHkr2TXYt9p4gDyhKUcnGZoqfuNs8bFxVda7Lz1lwWvQt4HrXak09CZljyI8Bdq1KSNe562T7&route=dlt&sender_id=VVORDR&message=195395&variables_values=${encodeURIComponent(
              bookingDetails.bhaktaNames[0]
            )}%7C${encodeURIComponent(
              bookingDetails.poojaname
            )}%7C${encodeURIComponent(
              dayjs(bookingDetails.poojadate).toISOString()
            )}&flash=0&numbers=${bookingDetails.mobile}&schedule_time=`;

            await fetch(smsUrl);
          } catch (error) {
            console.error("SMS failed:", error);
          }
          localStorage.setItem("bookedpujaID", bookingDetails.poojaID ?? "");
          // bookingId is absent when the booking is still being finalised by the
          // webhook; fall back to the transaction id rather than storing "undefined".
          localStorage.setItem("bookingId", verifyRes.data.bookingId ?? merchantTransactionId);
          localStorage.setItem("merchantTransactionId", merchantTransactionId);
          localStorage.setItem("lastPujaAmount", String(amountPaid));
          localStorage.setItem("lastPujaOrderId", verifyRes.data.bookingId || merchantTransactionId);

          setVerifying(false);
          router.push("/pujapaymentsuccess");
        },
        prefill: {
          name: derivedFirstName || "User",
          email: emailToUse,
          contact: normalizedMobile,
        },
        theme: { color: "#00BD68" },
      };

      // Load Razorpay dynamically
      const loadRazorpay = () => {
        return new Promise((resolve) => {
          if ((window as any).Razorpay) return resolve(true);
          const existingScript = document.getElementById("razorpay-js");
          if (existingScript) return resolve(true);

          const script = document.createElement("script");
          script.id = "razorpay-js";
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.onload = () => resolve(true);
          script.onerror = () => resolve(false);
          document.body.appendChild(script);
        });
      };

      const loaded = await loadRazorpay();
      if (!loaded) {
        message.error("Razorpay SDK failed to load. Are you online?");
        return;
      }
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error(error);
      window.fbq?.("track", "PaymentInfoFailed", {
        content_ids: id ? [id] : [],
        value: toInr(totalPrice),
        currency: "INR",
      });
      window.gtag?.("event", "payment_failed", {
        currency: "INR",
        value: toInr(totalPrice),
        items: [{ item_id: id || "puja", item_name: selectedPuja?.title || "Puja Booking" }],
      });
      alert("Payment initiation failed");
    }
  };

  const [poojaDay, setPoojaDay] = useState<string>("");

  // Load puja + temple details once
  // ✅ Derive puja-dependent fields from cached selectedPuja
  useEffect(() => {
    if (!selectedPuja) return;

    const puja = selectedPuja;

    // --- Pick the nearest upcoming pooja date (not the farthest/latest) ---
    const poojaDates = puja?.mandirLists?.[0]?.poojaMandirDates || [];

    const parseFlexibleDate = (value: any): Date | null => {
      if (!value) return null;
      if (value instanceof Date && !isNaN(value.getTime())) return value;
      if (typeof value === "number") {
        const d = new Date(value);
        return isNaN(d.getTime()) ? null : d;
      }
      if (typeof value === "string") {
        const s = value.trim();
        if (!s) return null;

        // dd-mm-yyyy
        const m1 = s.match(/^([0-3]?\d)-([0-1]?\d)-(\d{4})$/);
        if (m1) {
          const dd = Number(m1[1]);
          const mm = Number(m1[2]);
          const yyyy = Number(m1[3]);
          const d = new Date(yyyy, mm - 1, dd, 0, 0, 0);
          return isNaN(d.getTime()) ? null : d;
        }

        // yyyy-mm-dd or ISO
        const d = new Date(s);
        return isNaN(d.getTime()) ? null : d;
      }
      return null;
    };

    // Nearest date to "now" but not in the past.
    // If all are in the past, fallback to the latest past date.
    const pickNearestUpcomingDate = (dates: any[]): any | undefined => {
      if (!Array.isArray(dates) || dates.length === 0) return undefined;

      const now = new Date();
      // compare by date only (ignore time), so today's date still counts
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);

      const normalized = dates
        .map((raw) => {
          const d = parseFlexibleDate(raw);
          if (!d) return null;
          const t = new Date(d);
          t.setHours(0, 0, 0, 0);
          return { raw, time: t.getTime(), dateObj: d };
        })
        .filter(Boolean) as { raw: any; time: number; dateObj: Date }[];

      if (normalized.length === 0) return undefined;

      const upcoming = normalized.filter((x) => x.time >= todayStart.getTime());
      if (upcoming.length > 0) {
        upcoming.sort((a, b) => a.time - b.time); // nearest upcoming
        return upcoming[0].raw;
      }

      // All past -> most recent past
      normalized.sort((a, b) => b.time - a.time);
      return normalized[0].raw;
    };

    const rawPoojaDate = pickNearestUpcomingDate(poojaDates);

    setPoojaTime(puja?.mandirLists?.[0]?.poojaMandirTime || "");
    setPoojaDatebackend(rawPoojaDate || "");

    if (rawPoojaDate) {
      const d = parseFlexibleDate(rawPoojaDate);
      if (d) {
        const monthNames = [
          "January", "February", "March", "April", "May", "June",
          "July", "August", "September", "October", "November", "December",
        ];
        const formattedDate = `${monthNames[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
        setPoojaDate(formattedDate);
      } else {
        setPoojaDate(String(rawPoojaDate));
      }
    } else {
      setPoojaDate("");
    }

    setPoojaDay(puja?.mandirLists?.[0]?.poojaMandirDays?.[0] || "");

    // ✅ Set package price from selected package
    try {
      if (selectedpackage?.packageName && puja?.mandirLists?.[0]) {
        const selPkg = puja.mandirLists[0][selectedpackage.packageName];
        if (selPkg?.price != null) {
          setPackagePrice(selPkg.price);
        }
      }
    } catch {
      // ignore
    }
  }, [selectedPuja, selectedpackage?.packageName]);

  // Recalculate total price if user adds any additional services
  // Handled reliably in the central useEffect above to prevent state desync
  const bhaktaSectionRef = React.createRef<HTMLDivElement>();

  const scrollToBhaktaSection = () => {
    if (bhaktaSectionRef.current) {
      const elementPosition = bhaktaSectionRef.current.offsetTop;
      window.scrollTo({
        top: elementPosition,
        behavior: "smooth",
      });
    }
  };

  // Common Form for Desktop
  const renderShippingDetails = () => (
    <div className="relative px-2 sm:px-4">
      {/* Show updating badge at top of payment UI */}
      {!isPoojaLoading && isUpdating && (
        <div className="mx-[6%] mt-2 mb-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/70 backdrop-blur border border-orange-200 text-orange-800 text-xs font-semibold shadow-sm">
            <span className="inline-block h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
            Updating…
          </div>
        </div>
      )}
      {/* Decorative background & header */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-gradient-to-br from-amber-200 via-orange-100 to-transparent rounded-full opacity-60" />
        <div className="absolute bottom-10 right-5 w-48 h-48 bg-gradient-to-tl from-emerald-200 via-amber-100 to-transparent rounded-full opacity-60" />
      </div>

      <div className="relative max-w-[1230px] mx-auto ">
        <Formik
          initialValues={initialValues}
          enableReinitialize
          validationSchema={validationSchema}
          onSubmit={async (
            values: FormValues,
            actions: FormikHelpers<FormValues>
          ) => {
            const normalizedMobile = normalizeMobile(values.mobile);
            const safeEmail = makeSafeEmail(normalizedMobile, values.email);
            const nextValues = { ...values, mobile: normalizedMobile, email: safeEmail };
            window.fbq?.("track", "InitiateCheckout", {
              value: toInr(totalPrice),
              currency: "INR",
              content_ids: id ? [id] : [],
              content_name: selectedPuja?.title || "Puja Booking",
              num_items: 1,
            });
            window.gtag?.("event", "begin_checkout", {
              currency: "INR",
              value: toInr(totalPrice),
              items: [{
                item_id: id || "puja",
                item_name: selectedPuja?.title || "Puja Booking",
                item_category: templeDetails?.nameEnglish || "Puja",
                price: totalPrice,
                quantity: 1,
              }],
            });
            await initiateRazorpayPayment(nextValues);
            message.success("Payment initiated successfully!");
            actions.setSubmitting(false);
          }}
          validateOnChange={false}
          validateOnBlur={true}
          validate={(values) => {
            try {
              validationSchema.validateSync(values, { abortEarly: false });
            } catch (error) {
              if (error instanceof Yup.ValidationError) {
                setTimeout(() => {
                  scrollToBhaktaSection();
                }, 0);
              }
            }
          }}
        >
          {({ values, setFieldValue, handleSubmit, isSubmitting }) => (
            <Form
              onSubmit={handleSubmit}
              className="relative bg-white/95 backdrop-blur-xl rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.06)] border border-black/[0.04] px-4 sm:px-6 md:px-8 py-0 space-y-5 mb-4 "
            >
              <input type="hidden" name="packageName" value={packageName} />

              <PhoneAutoVerification
                phone={values.mobile}
                onVerifying={() => { }}
                onUserNotFound={() => {
                  setUserLoggedIn(false);
                }}
                onUserFound={(user: any) => {
                  setUserLoggedIn(true);

                  // Map user fields to Formik values
                  const fName = user.firstname || user.firstName || "";
                  const lName = user.lastname || user.lastName || "";
                  const fullName = `${fName} ${lName}`.trim() || user.name || "";

                  if (fName) setFieldValue("firstName", fName);
                  if (lName) setFieldValue("lastName", lName);
                  if (fullName) {
                    setFieldValue("fullName1", fullName);
                    if (values.bhaktaNames) {
                      const newBhaktaNames = [...values.bhaktaNames];
                      newBhaktaNames[0] = fullName;
                      setFieldValue("bhaktaNames", newBhaktaNames);
                    }
                  }

                  // Map family members to fullName2-6 and bhaktaNames[1..]
                  if (user.familyMembers && Array.isArray(user.familyMembers)) {
                    user.familyMembers.forEach((member: string, index: number) => {
                      if (index < 5) {
                        setFieldValue(`fullName${index + 2}`, member);
                      }
                      if (values.bhaktaNames && index + 1 < values.bhaktaNames.length) {
                        setFieldValue(`bhaktaNames[${index + 1}]`, member);
                      }
                    });
                  }

                  if (user.gotra) setFieldValue("gotra", user.gotra);
                  if (user.address1) setFieldValue("address1", user.address1);
                  if (user.address2) setFieldValue("address2", user.address2);
                  if (user.pincode) {
                    setFieldValue("pincode", String(user.pincode));
                  }
                  if (user.city) setFieldValue("city", user.city);
                  if (user.state) setFieldValue("state", user.state);
                  if (user.country) setFieldValue("country", user.country);
                }}
              />

              {/* Prasad selection is now handled by the modal in Detailing.tsx */}
              {/* prasadSelected state is read from localStorage on mount */}

              <ContactAndShippingForm
                values={values}
                setFieldValue={setFieldValue}
                pincodeLoading={pincodeLoading}
                handlePincodeChange={handlePincodeChange}
                serviceAvailable={serviceAvailable}
                cheapestCourier={cheapestCourier}
                estimatedDays={estimatedDays}
                pincodeErrorMessage={pincodeErrorMessage}
                isMobile={false}
              />

              {/* Divider */}
              <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-neutral-300 to-transparent my-3" />
              <div className="flex flex-wrap justify-between items-start gap-4 w-full">
                <UserDetailsForm
                  packageName={packageName}
                  selectedPuja={selectedPuja}
                  formData={formData}
                  bhaktaSectionRef={bhaktaSectionRef}
                  isMobile={false}
                />
              </div>


              {/* Bill + coupon section */}
              <div className="flex justify-between items-center w-full">
                {/* Bill Details */}
                <PricingBreakdown
                  selectedpackagename={selectedpackagename}
                  packagePrice={packagePrice}
                  addedRows={addedRows}
                  silveridolselected={silveridolselected}
                  idolquantity={idolquantity}
                  selectedPuja={selectedPuja}
                  isPromoApplied={isPromoApplied}
                  discount={discount}
                  totalPrice={totalPrice}
                  prasadSelected={prasadSelected}
                  isMobile={false}
                />

                {/* Coupons Section */}
                <PromoCodeSection
                  isModalOpen={isModalOpen}
                  setIsModalOpen={setIsModalOpen}
                  isPromoLoading={isPromoLoading}
                  isPromoUpdating={isPromoUpdating}
                  couponCode={couponCode}
                  setCouponCode={setCouponCode}
                  manualCouponLoading={manualCouponLoading}
                  handleManualApply={handleManualApply}
                  manualCouponError={manualCouponError}
                  promoCodes={promoCodes}
                  handleApplyPromo={handleApplyPromo}
                  totalPrice={totalPrice}
                  selectedPromo={selectedPromo}
                  setSelectedPromo={setSelectedPromo}
                  setDiscount={setDiscount}
                  discount={discount}
                  setIsPromoApplied={setIsPromoApplied}
                />
              </div>

              {/* Pay Now button */}
              <div className="flex justify-center mt-2 pb-2 ">
                <div className="w-full max-w-sm">
                  <Button
                    type="primary"
                    htmlType="submit"
                    disabled={
                      pincodeLoading || isSubmitting || isBookingDisabled
                    }
                    className="w-full flex items-center justify-center rounded-xl h-12 text-base font-bold shadow-[0_8px_20px_rgba(255,90,0,0.3)] payment-pay-btn hover:scale-[1.02] active:scale-[0.98] transition-all"
                    style={{ background: 'linear-gradient(135deg, #ff5a00, #ff8a00)', borderColor: 'transparent', borderRadius: 12 }}
                  >
                    {isSubmitting ? (
                      <Spin />
                    ) : (
                      <span className="flex items-center gap-2 tracking-tight">
                        <span>Pay Now</span>
                        <span className="font-bold" translate="no">{money(totalPrice)}</span>
                      </span>
                    )}
                  </Button>
                  {isBookingDisabled && (
                    <div className="payment-booking-closed-msg">
                      Booking for this puja is closed as the puja date has
                      passed.
                    </div>
                  )}
                  <p className="text-[10px] text-center text-black/60 mt-2">
                    🔒 Secure payment powered by Razorpay. Your details are
                    protected.
                  </p>
                </div>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );


  // Mobile form
  const renderShippingDetailsMob = () => (
    <div className="relative min-h-screen bg-gradient-to-b from-amber-50 via-orange-50 to-white">
      <Formik
        initialValues={initialValues}
        enableReinitialize
        validationSchema={validationSchema}
        onSubmit={async (
          values: FormValues,
          actions: FormikHelpers<FormValues>
        ) => {
          const safeEmail = makeSafeEmail(values.mobile, values.email);
          const nextValues = { ...values, email: safeEmail };
          window?.fbq?.("track", "InitiateCheckout", {
            value: toInr(totalPrice),
            currency: "INR",
            content_ids: id ? [id] : [],
            content_name: selectedPuja?.title || "Puja Booking",
            content_type: "product",
            num_items: 1,
          });
          await initiateRazorpayPayment(nextValues);
          message.success("Payment initiated successfully!");
          actions.setSubmitting(false);
        }}
        validateOnChange={false}
        validateOnBlur={true}
        validate={(values) => {
          try {
            validationSchema.validateSync(values, { abortEarly: false });
          } catch (error) {
            if (error instanceof Yup.ValidationError) {
              setTimeout(() => {
                scrollToBhaktaSection();
              }, 0);
            }
          }
        }}
      >
        {({ values, setFieldValue, handleSubmit, isSubmitting }) => (
          <Form
            onSubmit={handleSubmit}
            className="relative px-4 pt-4 pb-2 rounded-2xl"
          >
            <PhoneAutoVerification
              phone={values.mobile}
              onVerifying={() => { }}
              onUserNotFound={() => {
                setUserLoggedIn(false);
              }}
              onUserFound={(user: any) => {
                setUserLoggedIn(true);

                const fName = user.firstname || user.firstName || "";
                const lName = user.lastname || user.lastName || "";
                const fullName = `${fName} ${lName}`.trim() || user.name || "";

                if (fName) setFieldValue("firstName", fName);
                if (lName) setFieldValue("lastName", lName);
                if (fullName) {
                  setFieldValue("fullName1", fullName);
                  if (values.bhaktaNames) {
                    const newBhaktaNames = [...values.bhaktaNames];
                    newBhaktaNames[0] = fullName;
                    setFieldValue("bhaktaNames", newBhaktaNames);
                  }
                }

                if (user.familyMembers && Array.isArray(user.familyMembers)) {
                  user.familyMembers.forEach((member: string, index: number) => {
                    if (index < 5) {
                      setFieldValue(`fullName${index + 2}`, member);
                    }
                    if (values.bhaktaNames && index + 1 < values.bhaktaNames.length) {
                      setFieldValue(`bhaktaNames[${index + 1}]`, member);
                    }
                  });
                }

                if (user.gotra) setFieldValue("gotra", user.gotra);
                if (user.address1) setFieldValue("address1", user.address1);
                if (user.address2) setFieldValue("address2", user.address2);
                if (user.pincode) {
                  setFieldValue("pincode", String(user.pincode));
                }
                if (user.city) setFieldValue("city", user.city);
                if (user.state) setFieldValue("state", user.state);
                if (user.country) setFieldValue("country", user.country);
              }}
            />
            {/* Prasad selection is now handled by the modal in Detailing.tsx */}
            {/* prasadSelected state is read from localStorage on mount */}

            <ContactAndShippingForm
              values={values}
              setFieldValue={setFieldValue}
              pincodeLoading={pincodeLoading}
              handlePincodeChange={handlePincodeChange}
              serviceAvailable={serviceAvailable}
              cheapestCourier={cheapestCourier}
              estimatedDays={estimatedDays}
              pincodeErrorMessage={pincodeErrorMessage}
              isMobile={true}
            />

            {/* Gap between contact/shipping and bhakta section */}
            <div style={{ marginTop: "20px" }} />

            <UserDetailsForm
              packageName={packageName}
              selectedPuja={selectedPuja}
              formData={formData}
              bhaktaSectionRef={bhaktaSectionRef}
              isMobile={true}
            />

            {/* Gap between bhakta section and promo codes */}
            <div style={{ marginTop: "16px" }} />

            {/* Coupons CTA (mobile) */}
            <PromoCodeSection
              isMobile={true}
              isModalOpen={isModalOpen}
              setIsModalOpen={setIsModalOpen}
              isPromoLoading={isPromoLoading}
              isPromoUpdating={isPromoUpdating}
              couponCode={couponCode}
              setCouponCode={setCouponCode}
              manualCouponLoading={manualCouponLoading}
              handleManualApply={handleManualApply}
              manualCouponError={manualCouponError}
              promoCodes={promoCodes}
              handleApplyPromo={handleApplyPromo}
              totalPrice={totalPrice}
              selectedPromo={selectedPromo}
              setSelectedPromo={setSelectedPromo}
              setDiscount={setDiscount}
              discount={discount}
              setIsPromoApplied={setIsPromoApplied}
            />

            {/* Divider */}
            <div className="h-2 my-4 w-full bg-black/10 rounded-full" />

            {/* Bill Details */}
            <PricingBreakdown
              selectedpackagename={selectedpackagename}
              packagePrice={packagePrice}
              addedRows={addedRows}
              silveridolselected={silveridolselected}
              idolquantity={idolquantity}
              selectedPuja={selectedPuja}
              isPromoApplied={isPromoApplied}
              discount={discount}
              totalPrice={totalPrice}
              prasadSelected={prasadSelected}
              isMobile={true}
            />

            {/* Spacer so content doesn't hide behind sticky bar */}
            <div className="h-4" />

            {/* Sticky Pay Now bar */}
            <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-black/[0.06] bg-white/98 backdrop-blur-lg px-4 py-3">
              <div className="max-w-md mx-auto flex flex-col gap-1.5">
                <div className="flex justify-between text-xs text-neutral-500 px-1 font-medium">
                  <span>Payable Amount</span>
                  <span className="font-bold text-[#1a1a1a]" translate="no">{money(totalPrice)}</span>
                </div>

                <Button
                  type="primary"
                  htmlType="submit"
                  disabled={pincodeLoading || isSubmitting || isBookingDisabled}
                  className="w-full flex items-center justify-center rounded-xl h-12 text-base font-bold shadow-[0_8px_20px_rgba(255,90,0,0.3)] payment-pay-btn active:scale-[0.98] transition-all"
                  style={{ background: 'linear-gradient(135deg, #ff5a00, #ff8a00)', borderColor: 'transparent', borderRadius: 12 }}
                >
                  {isSubmitting ? (
                    <Spin />
                  ) : (
                    <span className="flex items-center gap-2 tracking-tight">
                      <span>Pay Now</span>
                      <span className="font-bold" translate="no">{money(totalPrice)}</span>
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );




  if (isPoojaLoading || isMandirLoading) {
    return (
      <div className="payment-spin-container">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <>
      <Col xs={0} sm={0} md={24} lg={24} xl={24}>
        {selectedPuja && templeDetails ? (
          <div className="payment-desktop-container">
            <div className="payment-flex-col">
              {/* Header Section with Gradient */}
              <div className="payment-header-section">
                <div className="payment-header-title">
                  <span className="payment-om-icon">🕉</span>
                  Review Your Booking
                </div>
                <div className="payment-header-subtitle">
                  Please verify all details before proceeding to payment
                </div>

                {/* Enhanced Order Summary Table */}
                <OrderSummaryCard
                  selectedPuja={selectedPuja}
                  templeDetails={templeDetails}
                  selectedpackagename={selectedpackagename}
                  poojaDate={poojaDate}
                  poojaTime={poojaTime}
                  poojaDay={poojaDay}
                  packagePrice={packagePrice}
                  isMobile={false}
                  prasadSelected={prasadSelected}
                />

                <div className="payment-divider" />
              </div>

              {/* Enhanced Idol Section */}
              {selectedPuja?.idolDetails?.isIdolAvailable ? (
                <div className="payment-idol-section">
                  {/* Decorative Elements */}
                  <div className="payment-idol-decor-1" />
                  <div className="payment-idol-decor-2" />

                  <Row className="payment-idol-row">
                    <PaymentIdolSection
                      selectedPuja={selectedPuja}
                      silveridolselected={silveridolselected}
                      setsilveridolselected={setsilveridolselected}
                      idolquantity={idolquantity}
                      handleIncrease={handleIncrease}
                      handleDecrease={handleDecrease}
                      isMobile={false}
                    />
                  </Row>
                </div>
              ) : (
                <Row className="payment-empty-row"></Row>
              )}
            </div>
          </div>
        ) : (
          <div className="payment-loading-screen">
            <div className="payment-text-center">
              <div className="payment-pure-spinner"></div>
              Loading your booking details...
            </div>
          </div>
        )}
        <div className="payment-shipping-wrapper-desktop">
          {renderShippingDetails()}
        </div>
        {verifying && <PaymentLoader />}
      </Col>

      {/* Mobile View */}
      <Col xs={24} sm={24} md={0} lg={0} xl={0}>
        {selectedPuja && templeDetails ? (
          <div className="payment-mobile-container">
            {/* Enhanced Mobile Booking Card with Animated Border */}
            <OrderSummaryCard
              selectedPuja={selectedPuja}
              templeDetails={templeDetails}
              selectedpackagename={selectedpackagename}
              poojaDate={poojaDate}
              poojaTime={poojaTime}
              poojaDay={poojaDay}
              packagePrice={packagePrice}
              isMobile={true}
              prasadSelected={prasadSelected}
            />

            <div className="payment-divider-mobile"></div>

            {/* Enhanced Mobile Idol Section */}
            {selectedPuja?.idolDetails?.isIdolAvailable ? (
              <PaymentIdolSection
                selectedPuja={selectedPuja}
                silveridolselected={silveridolselected}
                setsilveridolselected={setsilveridolselected}
                idolquantity={idolquantity}
                handleIncrease={handleIncrease}
                handleDecrease={handleDecrease}
                isMobile={true}
              />
            ) : (
              <Row className="payment-empty-row"></Row>
            )}
          </div>
        ) : (
          <div className="payment-loading-container payment-loading-container-mobile">
            <div className="payment-text-center">
              <div className="payment-loading-spinner payment-loading-spinner-mobile"></div>
              Loading your booking...
            </div>
          </div>
        )}
        <div className="payment-shipping-wrapper-mobile">
          {renderShippingDetailsMob()}
        </div>
        {verifying && <PaymentLoader />}
      </Col>

      {/* Modals for Additional Offerings */}
      <PaymentModals
        modalVisible={modalVisible}
        setModalVisible={setModalVisible}
        handleModalConfirm={handleModalConfirm}
      />

      {verifying && <PaymentLoader />}

      {/* Coupon Celebration Pop-up */}
      {showCouponCelebration && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm transition-all duration-300">
          <div className="relative w-[320px] overflow-hidden rounded-[24px] bg-white p-8 text-center shadow-2xl animate-in zoom-in duration-300">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl">
              🎉
            </div>
            <h3 key={selectedPromo} className="mb-1 text-xl font-bold text-gray-900 leading-tight">
              <span translate="no">{selectedPromo}</span> Applied!
            </h3>
            <p className="text-emerald-600 font-bold text-lg mb-4">
              You saved <span translate="no">{money(discount)}</span>
            </p>

          </div>
        </div>
      )}
    </>
  );
};

export default Payment;
