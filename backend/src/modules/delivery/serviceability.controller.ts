import axios from "axios";
import type { Request, Response } from "express";
import type { Types } from "mongoose";
import { env } from "../../config/env";
import { logger } from "../../lib/logger";
import { ApiError } from "../../lib/apiError";
import Pandit from "../mandir/pandit.model";
import Mandir from "../mandir/mandir.model";

/**
 * Shiprocket integration for pooja/prasad deliveries (legacy
 * controller/delivey/poojaPrasadDelivery.ts). The ecom webhook order flow was
 * intentionally NOT ported (ecom delivery is out of scope).
 *
 * The legacy base URL default included the "/v1/external" prefix; env.shiprocket.baseUrl
 * may or may not include it, so it is normalized here.
 */
const normalizedBase = env.shiprocket.baseUrl.replace(/\/+$/, "");
const SHIPROCKET_API_BASE_URL = normalizedBase.endsWith("/v1/external")
  ? normalizedBase
  : `${normalizedBase}/v1/external`;
const SHIPROCKET_AUTH_URL = `${SHIPROCKET_API_BASE_URL}/auth/login`;
const SHIPROCKET_CREATE_ORDER_URL = `${SHIPROCKET_API_BASE_URL}/orders/create/adhoc`;
const SHIPROCKET_SERVICEABILITY_URL = `${SHIPROCKET_API_BASE_URL}/courier/serviceability`;

let authToken: string | null = null;

/** A courier company entry as returned by Shiprocket's serviceability API. */
export interface CourierCompany {
  freight_charge?: string | number;
  courier_company_id?: string | number;
  [key: string]: unknown;
}

export interface ServiceabilityParams {
  pickup_postcode: number;
  delivery_postcode: number;
  order_id?: number;
  cod?: boolean;
  weight?: number;
  length?: string;
  breadth?: string;
  height?: string;
  declared_value?: number;
  mode?: string;
  is_return?: boolean;
  couriers_type?: string;
  only_local?: boolean;
  qc_check?: boolean;
}

export interface ServiceabilityResponse {
  serviceAvailable: boolean;
  cheapestCourier?: CourierCompany;
  allCouriers?: CourierCompany[];
  message?: string;
}

interface ShiprocketOrderItem {
  name: string;
  sku: string;
  units: number;
  selling_price: string;
  discount: string;
  tax: string;
  hsn: number;
}

/** Successful order-creation response from Shiprocket. */
export interface ShiprocketOrderResult {
  order_id: string;
  shipment_id: number;
  [key: string]: unknown;
}

/** Minimal structural view of a prasad booking used to build a Shiprocket order. */
export interface PrasadShipmentInput {
  orderID: string;
  panditPincode: number;
  deliveryCharge?: number;
  address: {
    name?: string;
    address?: string;
    landmark?: string;
    city?: string;
    state?: string;
    country?: string;
    email?: string;
    number?: string;
    pinCode?: number;
  };
  prasadDeliveries?: Array<{
    mandirID: Types.ObjectId;
    packageName?: string;
    prasadPrice: number;
    prasadCount: number;
  }>;
  sangamPrasadDelivery?: Array<{
    bottleSize?: string;
    bottleId?: string;
    discountedPrice?: number;
    quantity?: number;
  }>;
}

const authenticateShiprocket = async (): Promise<void> => {
  if (authToken) return;
  try {
    const response = await axios.post<{ token?: string }>(
      SHIPROCKET_AUTH_URL,
      {
        email: env.shiprocket.email,
        password: env.shiprocket.password,
      },
      {
        headers: { "Content-Type": "application/json" },
      },
    );
    if (response.data && response.data.token) {
      authToken = response.data.token;
    } else {
      throw new Error("Shiprocket Authentication Failed: No token received.");
    }
  } catch (error) {
    logger.error(
      { err: axios.isAxiosError(error) ? error.response?.data || error.message : error },
      "Error authenticating with Shiprocket",
    );
    throw new Error("Shiprocket Authentication Failed");
  }
};

/** Checks serviceability from Shiprocket. Never throws — failure is reported in the payload. */
export const checkServiceability = async (
  params: ServiceabilityParams,
): Promise<ServiceabilityResponse> => {
  if (!authToken) {
    await authenticateShiprocket();
  }

  const serviceabilityParams: Record<string, unknown> = {
    pickup_postcode: params.pickup_postcode,
    delivery_postcode: params.delivery_postcode,
    cod: params.cod ? 1 : 0,
    weight: params.weight,
    declared_value: params.declared_value,
    is_return: params.is_return ? 1 : 0,
    only_local: params.only_local ? 1 : 0,
    qc_check: params.qc_check ? 1 : 0,
  };
  if (params.length) serviceabilityParams.length = params.length;
  if (params.breadth) serviceabilityParams.breadth = params.breadth;
  if (params.height) serviceabilityParams.height = params.height;
  if (params.mode) serviceabilityParams.mode = params.mode;
  if (params.couriers_type) serviceabilityParams.couriers_type = params.couriers_type;

  try {
    const response = await axios.get<{ data?: { available_courier_companies?: CourierCompany[] } }>(
      SHIPROCKET_SERVICEABILITY_URL,
      {
        params: serviceabilityParams,
        headers: { Authorization: `Bearer ${authToken}` },
      },
    );

    const availableCouriers = response.data.data?.available_courier_companies || [];
    if (availableCouriers.length > 0) {
      // Find the cheapest courier by freight charge.
      const cheapest = availableCouriers.reduce((lowest, current) => {
        const currFreight = parseFloat(String(current.freight_charge)) || Infinity;
        const lowFreight = parseFloat(String(lowest.freight_charge)) || Infinity;
        return currFreight < lowFreight ? current : lowest;
      }, availableCouriers[0]);

      return {
        serviceAvailable: true,
        cheapestCourier: cheapest,
        allCouriers: availableCouriers,
      };
    }
    return {
      serviceAvailable: false,
      message: "No courier services are available for this location.",
    };
  } catch (error) {
    logger.error(
      { err: axios.isAxiosError(error) ? error.response?.data || error.message : error },
      "Error checking serviceability",
    );
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      authToken = null; // force re-auth next time
    }
    return {
      serviceAvailable: false,
      message: "Serviceability Check Failed",
    };
  }
};

/** Creates a single Shiprocket order for the specified subset of a prasad booking. */
export const createShiprocketOrder = async (
  prasadBooking: PrasadShipmentInput,
  serviceabilityResponse: ServiceabilityResponse,
): Promise<ShiprocketOrderResult> => {
  if (!authToken) {
    await authenticateShiprocket();
  }

  const panditPincode = prasadBooking.panditPincode || 0;
  if (!panditPincode) {
    throw new Error("Pandit pincode is missing in prasadBooking.");
  }

  const pickup_location = String(panditPincode);
  const { cheapestCourier } = serviceabilityResponse;

  // Gather items from either prasadDeliveries or sangamPrasadDelivery.
  const prasadItems = prasadBooking.prasadDeliveries || [];
  const sangamItems = prasadBooking.sangamPrasadDelivery || [];

  const orderItems: ShiprocketOrderItem[] = [];
  for (const pd of prasadItems) {
    orderItems.push({
      name: pd.packageName ?? "",
      sku: pd.mandirID.toString(),
      units: Number(pd.prasadCount),
      selling_price: String(pd.prasadPrice),
      discount: "",
      tax: "",
      hsn: 0,
    });
  }
  for (const sd of sangamItems) {
    orderItems.push({
      name: sd.bottleSize || "Sangam Item",
      sku: sd.bottleId || "SANGAM_BOTTLE",
      units: sd.quantity || 1,
      selling_price: String(sd.discountedPrice || 0),
      discount: "",
      tax: "",
      hsn: 0,
    });
  }

  const subTotal = orderItems.reduce((acc, item) => {
    const priceNum = parseFloat(item.selling_price) || 0;
    const units = item.units || 1;
    return acc + priceNum * units;
  }, 0);

  const shippingCharges = prasadBooking.deliveryCharge || 0;
  const overallTotal = subTotal + shippingCharges;

  const orderData: Record<string, unknown> = {
    order_id: prasadBooking.orderID + "-" + panditPincode,
    order_date: new Date().toISOString().slice(0, 19).replace("T", " "),
    pickup_location,
    comment: "Vedic Vaibhav Orders",

    billing_customer_name: prasadBooking.address.name || "Customer",
    billing_last_name: "",
    billing_address: prasadBooking.address.address || "",
    billing_address_2: prasadBooking.address.landmark || "",
    billing_city: prasadBooking.address.city || "",
    billing_pincode: String(prasadBooking.address.pinCode) || "0",
    billing_state: prasadBooking.address.state || "",
    billing_country: "India",
    billing_email: prasadBooking.address.email || "customer@example.com",
    billing_phone: String(prasadBooking.address.number) || "0",

    shipping_is_billing: true,
    order_items: orderItems,
    payment_method: "Prepaid",
    shipping_charges: shippingCharges,
    giftwrap_charges: 0,
    transaction_charges: 0,
    total_discount: 0,
    sub_total: overallTotal,

    length: 10.0,
    breadth: 10.0,
    height: 10.0,
    weight: 0.5,
  };

  if (cheapestCourier?.courier_company_id) {
    orderData.courier_company_id = String(cheapestCourier.courier_company_id);
  }

  try {
    const response = await axios.post<Partial<ShiprocketOrderResult> & { message?: string }>(
      SHIPROCKET_CREATE_ORDER_URL,
      orderData,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
      },
    );

    if (response.data.order_id && response.data.shipment_id) {
      return response.data as ShiprocketOrderResult;
    }
    throw new Error(response.data.message || "Unknown error from Shiprocket");
  } catch (error) {
    logger.error(
      { err: axios.isAxiosError(error) ? error.response?.data || error.message : error },
      "Error creating Shiprocket Order",
    );
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      authToken = null;
    }
    throw new Error("Shiprocket Order Creation Failed");
  }
};

// ── Route handlers ────────────────────────────────────────────────────────────

/** GET /serviceability/check?pincode=XXXXXX&mandirId=YYYY */
export const serviceabilityCheck = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pincode, mandirId } = req.query;

    if (!pincode || !mandirId) {
      throw ApiError.badRequest("Pincode and Mandir ID are required.");
    }
    if (typeof pincode !== "string" || !/^\d{6}$/.test(pincode)) {
      throw ApiError.badRequest("Pincode must be exactly 6 digits.");
    }
    if (typeof mandirId !== "string" || !/^[0-9a-fA-F]{24}$/.test(mandirId)) {
      throw ApiError.badRequest("Invalid Mandir ID format.");
    }

    // The pickup pincode comes from the pandit assigned to this mandir.
    const pandits = await Pandit.find({ mandirId });
    if (!pandits || pandits.length === 0) {
      throw ApiError.notFound("No Pandits found for the provided Mandir ID.");
    }

    const pickup_pincode = pandits[0].pincode || 0;

    const serviceabilityParams: ServiceabilityParams = {
      pickup_postcode: pickup_pincode,
      delivery_postcode: parseInt(pincode, 10),
      cod: false,
      weight: 1,
      declared_value: 100,
      is_return: false,
      only_local: false,
      qc_check: false,
    };

    const serviceabilityResponse = await checkServiceability(serviceabilityParams);
    res.status(200).json(serviceabilityResponse);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error({ err: error }, "Error in /serviceability/check route");
    throw new ApiError(500, error instanceof Error ? error.message : "Internal Server Error");
  }
};

/** GET /serviceability/by-mandir/:mandirId */
export const serviceabilityByMandir = async (
  req: Request<{ mandirId: string }>,
  res: Response,
): Promise<void> => {
  try {
    const { mandirId } = req.params;

    if (!mandirId || !/^[0-9a-fA-F]{24}$/.test(mandirId)) {
      throw ApiError.badRequest("Invalid Mandir ID format.");
    }

    // Legacy quirk preserved: this queries the Mandir collection by a `mandirId`
    // field (which mandir documents do not have), exactly as the old server did.
    const pandits = await Mandir.find({ mandirId });
    if (!pandits || pandits.length === 0) {
      throw ApiError.notFound("No Pandits found for the provided Mandir ID.");
    }

    const pickup_pincode = pandits[0].pincode;

    res.status(200).json({ pandits, pickup_pincode });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error({ err: error }, "Error fetching Pandits by Mandir ID");
    throw new ApiError(500, "Internal Server Error");
  }
};
