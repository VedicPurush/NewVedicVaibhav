import type { SendMailOptions } from "nodemailer";
import { receiptMoney } from "../../lib/receiptMoney";
import { env } from "../../config/env";
import { logger } from "../../lib/logger";
import type { PrasadDeliveryEmailItem, SangamPrasadEmailItem } from "./smtp";
import { transporter } from "./smtp";

/**
 * The legacy server used a dedicated Gmail transporter for admin mails
 * (SMTP_ADMIN_MAIL / SMTP_ADMIN_PASSWORD / SMTP_HOST_ADMIN / SMTP_PORT_ADMIN)
 * and the Hostinger account for user-facing mails. The new environment exposes
 * a single SMTP account plus the admin address (env.smtp.adminEmail), so all
 * mails are sent through the shared transporter; admin mails are addressed to
 * env.smtp.adminEmail.
 */
const adminEmail = env.smtp.adminEmail;
const transporterAdmin = transporter;
const transporterSupport = transporter;

/** Creates a base HTML email template. */
const getBaseTemplate = (title: string, bodyContent: string): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>${title}</title>
    </head>
    <body style="margin:0; padding:0; font-family: 'Poppins', 'Helvetica Neue', Arial, sans-serif;">
        <div style="background-color: #f4f4f4; padding: 20px;">
            <div style="max-width: 800px; margin: auto; background-color: #ffffff; padding: 20px; border-radius: 5px;">
                ${bodyContent}
            </div>
        </div>
    </body>
    </html>
  `;
};

export interface PrasadBookingAdminDetails {
  userID: string;
  email: string;
  mobile: string;
  prasadDeliveries: PrasadDeliveryEmailItem[];
  sangamPrasadDelivery: SangamPrasadEmailItem[];
  totalPrice: number;
  statusDate: string;
  referralCode: string;
  address: {
    email: string;
    number: string;
    address1: string;
    address2: string;
    city: string;
    state: string;
    country: string;
    pinCode: number;
    deliveryCharge: number | null;
    landmark?: string;
  };
  bookingDate: string;
  deliveryCharges: number | null;
}

/** Email to Admin — New Prasad Booking Notification. */
export const prasadBookingConfirmationToAdmin = async (details: PrasadBookingAdminDetails): Promise<void> => {
  const {
    userID,
    email,
    mobile,
    prasadDeliveries,
    sangamPrasadDelivery,
    totalPrice,
    statusDate,
    address,
    bookingDate,
    deliveryCharges,
  } = details;

  // Generate Prasad Details Table
  let prasadTable = "";
  if (prasadDeliveries && prasadDeliveries.length > 0) {
    prasadTable = `
      <h3>Prasad Details</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr>
            <th style="padding: 12px; border: 1px solid #ddd; background-color: #ff6600; color: #fff;">Prasad Name</th>
            <th style="padding: 12px; border: 1px solid #ddd; background-color: #ff6600; color: #fff;">Mandir Name</th>
            <th style="padding: 12px; border: 1px solid #ddd; background-color: #ff6600; color: #fff;">Price</th>
            <th style="padding: 12px; border: 1px solid #ddd; background-color: #ff6600; color: #fff;">Count</th>
            <th style="padding: 12px; border: 1px solid #ddd; background-color: #ff6600; color: #fff;">Total</th>
            <th style="padding: 12px; border: 1px solid #ddd; background-color: #ff6600; color: #fff;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${prasadDeliveries
            .map((d) => {
              const total = d.prasadPrice * d.prasadCount;
              return `
                <tr>
                  <td style="padding: 12px; border: 1px solid #ddd;">${d.packageName}</td>
                  <td style="padding: 12px; border: 1px solid #ddd;">${d.mandirName}</td>
                  <td style="padding: 12px; border: 1px solid #ddd;">₹${d.prasadPrice}</td>
                  <td style="padding: 12px; border: 1px solid #ddd;">${d.prasadCount}</td>
                  <td style="padding: 12px; border: 1px solid #ddd;">₹${total}</td>
                  <td style="padding: 12px; border: 1px solid #ddd;">${d.prasadStatus}</td>
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
    `;
  }

  // Generate Sangam Prasad Details Table
  let sangamTable = "";
  if (sangamPrasadDelivery && sangamPrasadDelivery.length > 0) {
    sangamTable = `
      <h3>Sangam Prasad Details</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr>
            <th style="padding: 12px; border: 1px solid #ddd; background-color: #ff6600; color: #fff;">Bottle Size</th>
            <th style="padding: 12px; border: 1px solid #ddd; background-color: #ff6600; color: #fff;">Description</th>
            <th style="padding: 12px; border: 1px solid #ddd; background-color: #ff6600; color: #fff;">Original Price</th>
            <th style="padding: 12px; border: 1px solid #ddd; background-color: #ff6600; color: #fff;">Discounted Price</th>
            <th style="padding: 12px; border: 1px solid #ddd; background-color: #ff6600; color: #fff;">Quantity</th>
            <th style="padding: 12px; border: 1px solid #ddd; background-color: #ff6600; color: #fff;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${sangamPrasadDelivery
            .map((s) => {
              const rowTotal = (s.discountedPrice || 0) * (s.quantity || 0);
              return `
                <tr>
                  <td style="padding: 12px; border: 1px solid #ddd;">${s.bottleSize || ""}</td>
                  <td style="padding: 12px; border: 1px solid #ddd;">${s.description || ""}</td>
                  <td style="padding: 12px; border: 1px solid #ddd;">₹${s.originalPrice || 0}</td>
                  <td style="padding: 12px; border: 1px solid #ddd;">₹${s.discountedPrice || 0}</td>
                  <td style="padding: 12px; border: 1px solid #ddd;">${s.quantity || 0}</td>
                  <td style="padding: 12px; border: 1px solid #ddd;">₹${rowTotal}</td>
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
    `;
  }

  // Delivery Charge Text
  const deliveryChargeText =
    deliveryCharges !== null && deliveryCharges !== undefined ? `₹${deliveryCharges}` : "Free Delivery";

  // Construct Email Body
  const bodyContent = `
    <h2 style="color: #333; text-align: center;">🙏 New Prasad Booking Received!</h2>
    <p><strong>User ID:</strong> ${userID}</p>
    <p><strong>User Email:</strong> ${email}</p>
    <p><strong>User Mobile:</strong> ${mobile}</p>
    <p><strong>Booking Date:</strong> ${new Date(bookingDate).toLocaleString()}</p>
    <p><strong>Status Date:</strong> ${new Date(statusDate).toLocaleString()}</p>
    <p><strong>Delivery Address:</strong> ${address.address1}${address.address2 ? `, ${address.address2}` : ""},
      ${address.city}, ${address.state}, ${address.country} - ${address.pinCode}
      <br/>
      <strong>Landmark:</strong> ${address.landmark || ""}
    </p>
    ${prasadTable}
    ${sangamTable}

    <h3>Summary</h3>
    <p><strong>Total Price:</strong> ₹${totalPrice}</p>
    <p><strong>Delivery Charges:</strong> ${deliveryChargeText}</p>

    <p style="margin-top: 20px;">
      Please log in to the admin panel to view more details or update the status of this booking.
    </p>
  `;

  const mailOptions: SendMailOptions = {
    from: `"Vedic Vaibhav" <${adminEmail}>`,
    to: adminEmail,
    subject: "🙏 New Prasad Booking Received!",
    html: getBaseTemplate("Prasad Booking Confirmation - Admin", bodyContent),
  };

  try {
    await transporterAdmin.sendMail(mailOptions);
  } catch (error) {
    logger.error({ err: error }, "Error sending Prasad Booking Confirmation to admin");
  }
};

// 1. Normal Pooja Booking Confirmation Email to Admin
export const normalPoojaBookingToAdmin = async (bookingDetails: {
  userID: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile: number;
  poojaName: string;
  packageName: string;
  mandirName: string;
  totalPrice: number;
  gotraNames: string[];
  bhaktaNames: string[];
  address1: string;
  address2?: string;
  city: string;
  state: string;
  country: string;
  pincode: number;
  poojaDate: string;
  poojaTime: string;
  transactionId: string;
  referralCode: string;
  idolDetails?: {
    isIdolAvailable: boolean;
    idolName?: string;
    idolPrice?: number;
    idolDescription?: string;
  };
}): Promise<void> => {
  const {
    firstName,
    lastName,
    email,
    mobile,
    poojaName,
    packageName,
    mandirName,
    totalPrice,
    bhaktaNames,
    gotraNames,
    address1,
    address2,
    city,
    state,
    country,
    pincode,
    poojaDate,
    poojaTime,
    transactionId,
    idolDetails,
  } = bookingDetails;

  // Create a table from the person names and gotras
  const participantsTable = bhaktaNames
    .map((name, index) => {
      return `
      <tr>
        <td style="padding: 12px; border: 1px solid #e0e0e0; text-align: center;">${name}</td>
        <td style="padding: 12px; border: 1px solid #e0e0e0; text-align: center;">${gotraNames[index] || ""}</td>
      </tr>
    `;
    })
    .join("");

  // If idol is available, build that row in the admin email
  let idolSection = "";
  if (idolDetails && idolDetails.isIdolAvailable) {
    idolSection = `
      <h2 style="color: #333; font-size: 22px; border-bottom: 2px solid #ff6600; margin: 30px 0 20px;">🪔 Idol Details 🪔</h2>
      <table style="width: 100%; max-width: 600px; margin: 0 auto; border-collapse: collapse;">
        <tr>
          <th style="padding: 12px; background-color: #ff6600; color: #fff; text-align: left;">Idol Name</th>
          <td style="padding: 12px; border: 1px solid #e0e0e0;">${idolDetails.idolName || ""}</td>
        </tr>
        <tr>
          <th style="padding: 12px; background-color: #ff6600; color: #fff; text-align: left;">Idol Price</th>
          <td style="padding: 12px; border: 1px solid #e0e0e0;">₹${idolDetails.idolPrice || 0}</td>
        </tr>
        ${
          idolDetails.idolDescription
            ? `<tr>
                <th style="padding: 12px; background-color: #ff6600; color: #fff; text-align: left;">Description</th>
                <td style="padding: 12px; border: 1px solid #e0e0e0;">${idolDetails.idolDescription}</td>
              </tr>`
            : ""
        }
      </table>
    `;
  }

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <style>
        body {
          font-family: 'Poppins', 'Helvetica Neue', Arial, sans-serif;
          color: #444;
          line-height: 1.6;
          padding: 20px;
          background-color: #f9f9f9;
          margin: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #fff;
          padding: 20px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1 style="color: #ff6600; text-align: center; font-size: 28px; margin-bottom: 20px;">🕉️ New Pooja Booking 🕉️</h1>
        <p style="font-size: 16px; text-align: center; margin-bottom: 30px;">
          A new pooja has been booked by <strong>${firstName} ${lastName}</strong>. Below are the details:
        </p>

        <h2 style="color: #333; font-size: 22px; border-bottom: 2px solid #ff6600; margin-bottom: 20px;">📋 User Information 📋</h2>
        <table>
          <tr>
            <th style="padding: 12px; background-color: #ff6600; color: #fff; text-align: left;">First Name</th>
            <td style="padding: 12px; border: 1px solid #e0e0e0;">${firstName}</td>
          </tr>
          <tr>
            <th style="padding: 12px; background-color: #ff6600; color: #fff; text-align: left;">Last Name</th>
            <td style="padding: 12px; border: 1px solid #e0e0e0;">${lastName}</td>
          </tr>
          <tr>
            <th style="padding: 12px; background-color: #ff6600; color: #fff; text-align: left;">Mobile</th>
            <td style="padding: 12px; border: 1px solid #e0e0e0;">${mobile}</td>
          </tr>
          <tr>
            <th style="padding: 12px; background-color: #ff6600; color: #fff; text-align: left;">Email</th>
            <td style="padding: 12px; border: 1px solid #e0e0e0;">${email}</td>
          </tr>
        </table>

        <h2 style="color: #333; font-size: 22px; border-bottom: 2px solid #ff6600; margin: 30px 0 20px;">🛕 Pooja Details 🛕</h2>
        <table>
          <tr>
            <th style="padding: 12px; background-color: #ff6600; color: #fff; text-align: left;">Pooja Name</th>
            <td style="padding: 12px; border: 1px solid #e0e0e0;">${poojaName}</td>
          </tr>
          <tr>
            <th style="padding: 12px; background-color: #ff6600; color: #fff; text-align: left;">Package</th>
            <td style="padding: 12px; border: 1px solid #e0e0e0;">${packageName}</td>
          </tr>
          <tr>
            <th style="padding: 12px; background-color: #ff6600; color: #fff; text-align: left;">Mandir Name</th>
            <td style="padding: 12px; border: 1px solid #e0e0e0;">${mandirName}</td>
          </tr>
          <tr>
            <th style="padding: 12px; background-color: #ff6600; color: #fff; text-align: left;">Total Price</th>
            <td style="padding: 12px; border: 1px solid #e0e0e0;">₹${totalPrice}</td>
          </tr>
          <tr>
            <th style="padding: 12px; background-color: #ff6600; color: #fff; text-align: left;">Pooja Date</th>
            <td style="padding: 12px; border: 1px solid #e0e0e0;">${new Date(poojaDate).toLocaleDateString()}</td>
          </tr>
          <tr>
            <th style="padding: 12px; background-color: #ff6600; color: #fff; text-align: left;">Pooja Time</th>
            <td style="padding: 12px; border: 1px solid #e0e0e0;">${poojaTime}</td>
          </tr>
          <tr>
            <th style="padding: 12px; background-color: #ff6600; color: #fff; text-align: left;">Transaction ID</th>
            <td style="padding: 12px; border: 1px solid #e0e0e0;">${transactionId}</td>
          </tr>
        </table>

        ${idolSection}

        <h2 style="color: #333; font-size: 22px; border-bottom: 2px solid #ff6600; margin: 30px 0 20px;">👥 Participants 👥</h2>
        <table>
          <thead>
            <tr>
              <th style="padding: 12px; background-color: #ff6600; color: #fff; text-align: center;">Person Name</th>
              <th style="padding: 12px; background-color: #ff6600; color: #fff; text-align: center;">Gotra</th>
            </tr>
          </thead>
          <tbody>
            ${participantsTable}
          </tbody>
        </table>

        <h2 style="color: #333; font-size: 22px; border-bottom: 2px solid #ff6600; margin: 30px 0 20px;">📦 Delivery Address 📦</h2>
        <p style="font-size: 16px;">
          ${address1}${address2 && address2 !== "x" ? `, ${address2}` : ""}, ${city}, ${state}, ${country} - ${pincode}
        </p>

        <p style="font-size: 16px; text-align: center; margin-top: 30px;">Please log in to the admin panel to manage this booking.</p>
        <div style="text-align: center; margin-top: 30px;">
          <a href="https://vedicvaibhav.com/admin" style="background-color: #ff6600; color: #fff; text-decoration: none; padding: 12px 24px; font-size: 16px; border-radius: 6px;">🔗 Go to Admin Panel 🔗</a>
        </div>
        <p style="font-size: 14px; text-align: center; margin-top: 40px; color: #888;">© ${new Date().getFullYear()} Vedic Vaibhav. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  const mailOptions: SendMailOptions = {
    from: `"Vedic Vaibhav" <${adminEmail}>`,
    to: adminEmail,
    subject: "📩 New Pooja Booking Received 📩",
    html: emailHtml,
  };

  try {
    await transporterAdmin.sendMail(mailOptions);
  } catch (error) {
    logger.error({ err: error }, "Error sending normal pooja booking email to admin");
  }
};

/** Pricing snapshot fields rendered in the jyotirlinga mails (autopay mode). */
export interface JyotirlingaPricingSnapshot {
  autopayCycleAmount?: number | string;
  autopayTotalCount?: number | string;
}

// 1.1 Jyotirlinga Subscription Booking Confirmation Email to Admin
export const jyotirlingaBookingToAdmin = async (bookingDetails: {
  orderID: string;
  name: string;
  mobile: string;
  email?: string;
  gotra: string;
  planName: string;
  paymentMode: string;
  selectedJyotirlingaCount: number;
  totalPrice: number;
  pricingSnapshot: JyotirlingaPricingSnapshot;
  familyMembers: { name: string; gotra: string }[];
  deliveryAddress?: {
    name: string;
    mobile: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pinCode: string;
  } | null;
  status: string;
  bookingDate: Date;
  jyotirlingaNames?: string[];
}): Promise<void> => {
  const {
    orderID,
    name,
    mobile,
    email,
    gotra,
    planName,
    paymentMode,
    selectedJyotirlingaCount,
    totalPrice,
    pricingSnapshot,
    familyMembers,
    deliveryAddress,
    status,
    bookingDate,
    jyotirlingaNames,
  } = bookingDetails;

  const participantsTable = familyMembers
    .map((member) => {
      return `
      <tr>
        <td style="padding: 12px; border: 1px solid #e0e0e0; text-align: center;">${member.name}</td>
        <td style="padding: 12px; border: 1px solid #e0e0e0; text-align: center;">${member.gotra}</td>
      </tr>
    `;
    })
    .join("");

  const jyotirlingasHtml =
    jyotirlingaNames && jyotirlingaNames.length > 0
      ? `<p><strong>Selected Jyotirlingas:</strong> ${jyotirlingaNames.join(", ")}</p>`
      : `<p><strong>Selected Jyotirlingas Count:</strong> ${selectedJyotirlingaCount}</p>`;

  const pricingHtml =
    paymentMode === "autopay"
      ? `
      <tr>
        <th style="padding: 12px; background-color: #ff6600; color: #fff; text-align: left;">Monthly Installment</th>
        <td style="padding: 12px; border: 1px solid #e0e0e0;">₹${pricingSnapshot.autopayCycleAmount}</td>
      </tr>
      <tr>
        <th style="padding: 12px; background-color: #ff6600; color: #fff; text-align: left;">Total Installments</th>
        <td style="padding: 12px; border: 1px solid #e0e0e0;">${pricingSnapshot.autopayTotalCount}</td>
      </tr>
    `
      : `
      <tr>
        <th style="padding: 12px; background-color: #ff6600; color: #fff; text-align: left;">Total Upfront Price</th>
        <td style="padding: 12px; border: 1px solid #e0e0e0;">₹${totalPrice}</td>
      </tr>
    `;

  const addressHtml = deliveryAddress
    ? `
      <h2 style="color: #333; font-size: 22px; border-bottom: 2px solid #ff6600; margin: 30px 0 20px;">📦 Delivery Address 📦</h2>
      <p style="font-size: 16px;">
        <strong>Recipient:</strong> ${deliveryAddress.name}<br/>
        <strong>Mobile:</strong> ${deliveryAddress.mobile}<br/>
        ${deliveryAddress.line1}${deliveryAddress.line2 ? `, ${deliveryAddress.line2}` : ""}, ${deliveryAddress.city}, ${deliveryAddress.state} - ${deliveryAddress.pinCode}
      </p>
    `
    : "";

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <style>
        body { font-family: 'Poppins', 'Helvetica Neue', Arial, sans-serif; color: #444; line-height: 1.6; padding: 20px; background-color: #f9f9f9; margin: 0; }
        .container { max-width: 600px; margin: 0 auto; background-color: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { padding: 12px; border: 1px solid #e0e0e0; }
        th { background-color: #ff6600; color: #fff; text-align: left; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1 style="color: #ff6600; text-align: center; font-size: 28px; margin-bottom: 20px;">🕉️ New Jyotirlinga Subscription 🕉️</h1>
        <p style="font-size: 16px; text-align: center; margin-bottom: 30px;">
          A new Jyotirlinga Plan has been booked by <strong>${name}</strong>. Below are the details:
        </p>

        <h2 style="color: #333; font-size: 22px; border-bottom: 2px solid #ff6600; margin-bottom: 20px;">📋 User Information 📋</h2>
        <table>
          <tr>
            <th>Name</th>
            <td>${name}</td>
          </tr>
          <tr>
            <th>Mobile</th>
            <td>${mobile}</td>
          </tr>
          <tr>
            <th>Email</th>
            <td>${email || "N/A"}</td>
          </tr>
          <tr>
            <th>Gotra</th>
            <td>${gotra}</td>
          </tr>
        </table>

        <h2 style="color: #333; font-size: 22px; border-bottom: 2px solid #ff6600; margin: 30px 0 20px;">🕉️ Subscription Details 🕉️</h2>
        <table>
          <tr>
            <th>Plan Name</th>
            <td>${planName}</td>
          </tr>
          <tr>
            <th>Payment Mode</th>
            <td style="text-transform: capitalize;">${paymentMode}</td>
          </tr>
          ${pricingHtml}
          <tr>
            <th>Booking Date</th>
            <td>${new Date(bookingDate).toLocaleString()}</td>
          </tr>
          <tr>
            <th>Order ID</th>
            <td>${orderID}</td>
          </tr>
          <tr>
            <th>Status</th>
            <td>${status}</td>
          </tr>
        </table>

        ${jyotirlingasHtml}

        <h2 style="color: #333; font-size: 22px; border-bottom: 2px solid #ff6600; margin: 30px 0 20px;">👥 Family Members 👥</h2>
        ${
          familyMembers.length > 0
            ? `
        <table>
          <thead>
            <tr>
              <th style="padding: 12px; background-color: #ff6600; color: #fff; text-align: center;">Member Name</th>
              <th style="padding: 12px; background-color: #ff6600; color: #fff; text-align: center;">Gotra</th>
            </tr>
          </thead>
          <tbody>
            ${participantsTable}
          </tbody>
        </table>
        `
            : "<p>No family members added.</p>"
        }

        ${addressHtml}

        <p style="font-size: 16px; text-align: center; margin-top: 30px;">Please log in to the admin panel to manage this subscription.</p>
        <div style="text-align: center; margin-top: 30px;">
          <a href="https://vedicvaibhav.com/admin" style="background-color: #ff6600; color: #fff; text-decoration: none; padding: 12px 24px; font-size: 16px; border-radius: 6px;">🔗 Go to Admin Panel 🔗</a>
        </div>
        <p style="font-size: 14px; text-align: center; margin-top: 40px; color: #888;">© ${new Date().getFullYear()} Vedic Vaibhav. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  const mailOptions: SendMailOptions = {
    from: `"Vedic Vaibhav" <${adminEmail}>`,
    to: adminEmail,
    subject: `📩 New Jyotirlinga Subscription Received - ${orderID} 📩`,
    html: emailHtml,
  };

  try {
    await transporterAdmin.sendMail(mailOptions);
  } catch (error) {
    logger.error({ err: error }, "Error sending Jyotirlinga subscription booking email to admin");
  }
};

// 1.2 Jyotirlinga Subscription Booking Confirmation Email to User
export const jyotirlingaBookingToUser = async (bookingDetails: {
  orderID: string;
  name: string;
  mobile: string;
  email: string;
  planName: string;
  paymentMode: string;
  selectedJyotirlingaCount: number;
  totalPrice: number;
  pricingSnapshot: JyotirlingaPricingSnapshot;
  jyotirlingaNames?: string[];
  bookingDate: Date;
}): Promise<void> => {
  const {
    orderID,
    name,
    email,
    planName,
    paymentMode,
    selectedJyotirlingaCount,
    totalPrice,
    pricingSnapshot,
    jyotirlingaNames,
    bookingDate,
  } = bookingDetails;

  if (!email || (email.includes("@gmail.com") === false && !email.includes("@"))) return;

  const jyotirlingasLine =
    jyotirlingaNames && jyotirlingaNames.length > 0
      ? jyotirlingaNames.join(", ")
      : `${selectedJyotirlingaCount} Jyotirling(s)`;

  const pricingLine =
    paymentMode === "autopay"
      ? `Monthly Installment: ₹${pricingSnapshot.autopayCycleAmount} × ${pricingSnapshot.autopayTotalCount} months`
      : `Total Amount Paid: ₹${totalPrice}`;

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <style>
        body { font-family: 'Inter', 'Segoe UI', Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #fff9f0; color: #4a4a4a; }
        .wrapper { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.05); border: 1px solid #f9e6d2; }
        .header { background: #fff2e0; padding: 45px 30px; text-align: center; border-bottom: 4px solid #ff9933; }
        .header h1 { color: #d35400; font-size: 28px; margin: 0 0 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
        .header p { color: #a0522d; font-size: 14px; margin: 0; font-weight: 500; }
        .body { padding: 40px 35px; }
        .greeting { font-size: 18px; color: #2c3e50; margin-bottom: 20px; font-weight: 600; }
        .text-main { font-size: 15px; color: #5d6d7e; margin-bottom: 30px; line-height: 1.7; }
        .info-box { background: #fffdf9; border: 1.5px solid #fae5ce; border-radius: 10px; padding: 25px; margin-bottom: 30px; }
        .info-box table { width: 100%; border-collapse: collapse; }
        .info-box td { padding: 12px 10px; border-bottom: 1px solid #fdf2e9; font-size: 14px; color: #34495e; }
        .info-box tr:last-child td { border-bottom: none; }
        .info-box td:first-child { color: #b35900; font-weight: 600; width: 40%; }
        .next-steps { background: #fffaf0; border-radius: 10px; padding: 20px; border-left: 5px solid #ff9933; margin-bottom: 30px; font-size: 14px; color: #5d6d7e; line-height: 1.6; }
        .next-steps h4 { color: #d35400; margin: 0 0 8px; font-size: 16px; font-weight: 700; }
        .footer { background: #fffcf8; padding: 25px; text-align: center; border-top: 1px solid #fae5ce; }
        .footer p { color: #7f8c8d; font-size: 13px; margin: 6px 0; }
        .footer .brand { color: #d35400; font-weight: 700; font-size: 14px; margin-bottom: 10px; display: block; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="header">
          <h1>Booking Confirmed</h1>
          <p>Your Jyotirlinga Plan is now Active</p>
        </div>
        <div class="body">
          <p class="greeting">Namaste ${name},</p>
          <p class="text-main">
            Your Jyotirlinga booking has been successfully confirmed. Our team of expert pandits will proceed with the sacred rituals according to the tradition. We are honored to be part of your spiritual journey.
          </p>

          <div class="info-box">
            <table>
              <tr><td>Order ID</td><td><strong>${orderID}</strong></td></tr>
              <tr><td>Service</td><td>Jyotirlinga Subscription</td></tr>
              <tr><td>Package Plan</td><td>${planName}</td></tr>
              <tr><td>Selections</td><td>${jyotirlingasLine}</td></tr>
              <tr><td>Payment Type</td><td style="text-transform: capitalize;">${paymentMode}</td></tr>
              <tr><td>Summary</td><td>${pricingLine}</td></tr>
              <tr><td>Booking Date</td><td>${new Date(bookingDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</td></tr>
            </table>
          </div>

          <div class="next-steps">
            <h4>Important Information</h4>
            Our representatives will coordinate the details with you via WhatsApp shortly. For plans with Prasad included, shipping will be initiated upon completion of the rituals.
          </div>

          <p style="font-size: 13px; color: #95a5a6; text-align: center; margin-top: 40px; border-top: 1px solid #eee; pt: 20px;">
            Questions? Contact us at <strong>support@vedicvaibhav.com</strong><br/>
            or call our authorized helpline number.
          </p>
        </div>
        <div class="footer">
          <span class="brand">Vedic Vaibhav</span>
          <p>The Essence of Sacred Traditions</p>
          <p>© ${new Date().getFullYear()} Vedic Vaibhav. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions: SendMailOptions = {
    from: `"Vedic Vaibhav" <support@vedicvaibhav.com>`,
    to: email,
    subject: `Your Jyotirlinga Booking is Confirmed - Order ${orderID}`,
    html: emailHtml,
    replyTo: `"Vedic Vaibhav Support" <support@vedicvaibhav.com>`,
  };

  try {
    await transporterSupport.sendMail(mailOptions);
  } catch (error) {
    logger.error({ err: error }, "Error sending Jyotirlinga booking confirmation to user");
  }
};

export const fourDhamBookingToAdmin = async (bookingDetails: {
  bookingId: string;
  poojaName: string;
  slotName: string;
  slotStartDate: Date;
  slotEndDate: Date;
  packageName: string;
  packagePrice: number;
  devoteeName: string;
  whatsapp: string;
  gotra: string;
  familyMembers: string[];
  address: string;
  city: string;
  state: string;
  pincode: string;
  transactionId: string;
  paidAt: Date;
}): Promise<void> => {
  const {
    bookingId,
    poojaName,
    slotName,
    slotStartDate,
    slotEndDate,
    packageName,
    packagePrice,
    devoteeName,
    whatsapp,
    gotra,
    familyMembers,
    address,
    city,
    state,
    pincode,
    transactionId,
    paidAt,
  } = bookingDetails;

  const participantsList =
    familyMembers.length > 0
      ? `<ul>${familyMembers.map((member) => `<li>${member}</li>`).join("")}</ul>`
      : "<p>No family members added.</p>";

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <style>
        body { font-family: 'Poppins', 'Helvetica Neue', Arial, sans-serif; color: #444; line-height: 1.6; padding: 20px; background-color: #f9f9f9; margin: 0; }
        .container { max-width: 600px; margin: 0 auto; background-color: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { padding: 12px; border: 1px solid #e0e0e0; }
        th { background-color: #ff6600; color: #fff; text-align: left; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1 style="color: #ff6600; text-align: center; font-size: 28px; margin-bottom: 20px;">🕉️ New 4 Dham Yatra Booking 🕉️</h1>
        <p style="font-size: 16px; text-align: center; margin-bottom: 30px;">
          A new 4 Dham Yatra has been booked by <strong>${devoteeName}</strong>. Below are the details:
        </p>

        <h2 style="color: #333; font-size: 22px; border-bottom: 2px solid #ff6600; margin-bottom: 20px;">📋 User Information 📋</h2>
        <table>
          <tr>
            <th>Name</th>
            <td>${devoteeName}</td>
          </tr>
          <tr>
            <th>WhatsApp</th>
            <td>${whatsapp}</td>
          </tr>
          <tr>
            <th>Gotra</th>
            <td>${gotra}</td>
          </tr>
        </table>

        <h2 style="color: #333; font-size: 22px; border-bottom: 2px solid #ff6600; margin: 30px 0 20px;">🏔️ Yatra Details 🏔️</h2>
        <table>
          <tr>
            <th>Yatra Name</th>
            <td>${poojaName}</td>
          </tr>
          <tr>
            <th>Package</th>
            <td>${packageName}</td>
          </tr>
          <tr>
            <th>Slot Name</th>
            <td>${slotName}</td>
          </tr>
          <tr>
            <th>Slot Dates</th>
            <td>${new Date(slotStartDate).toLocaleDateString()} - ${new Date(slotEndDate).toLocaleDateString()}</td>
          </tr>
          <tr>
            <th>Total Price</th>
            <td>₹${packagePrice}</td>
          </tr>
          <tr>
            <th>Paid At</th>
            <td>${new Date(paidAt).toLocaleString()}</td>
          </tr>
          <tr>
            <th>Booking ID</th>
            <td>${bookingId}</td>
          </tr>
          <tr>
            <th>Transaction ID</th>
            <td>${transactionId}</td>
          </tr>
        </table>

        <h2 style="color: #333; font-size: 22px; border-bottom: 2px solid #ff6600; margin: 30px 0 20px;">👥 Family Members 👥</h2>
        ${participantsList}

        <h2 style="color: #333; font-size: 22px; border-bottom: 2px solid #ff6600; margin: 30px 0 20px;">🏠 Address Details 🏠</h2>
        <p style="font-size: 16px;">
          ${address}<br/>
          ${city}, ${state} - ${pincode}
        </p>

        <p style="font-size: 16px; text-align: center; margin-top: 30px;">Please log in to the admin panel to manage this booking.</p>
        <div style="text-align: center; margin-top: 30px;">
          <a href="https://vedicvaibhav.com/admin" style="background-color: #ff6600; color: #fff; text-decoration: none; padding: 12px 24px; font-size: 16px; border-radius: 6px;">🔗 Go to Admin Panel 🔗</a>
        </div>
        <p style="font-size: 14px; text-align: center; margin-top: 40px; color: #888;">© ${new Date().getFullYear()} Vedic Vaibhav. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  const mailOptions: SendMailOptions = {
    from: `"Vedic Vaibhav" <${adminEmail}>`,
    to: adminEmail,
    subject: `📩 New 4 Dham Yatra Booking Received - ${bookingId} 📩`,
    html: emailHtml,
  };

  try {
    await transporterAdmin.sendMail(mailOptions);
  } catch (error) {
    logger.error({ err: error }, "Error sending 4 Dham Yatra booking email to admin");
  }
};

// 2. Personalized Pooja Booking Confirmation Email to Admin
export const personalizedPoojaBookingToAdmin = async (bookingDetails: {
  userID: string;
  firstName: string;
  lastName: string;
  fullName: string[];
  gotra: string[];
  mobile: string;
  email: string;
  poojaName: string;
  problemName: string;
  description: string;
  poojaDate: Date;
  selectedMandir: string;
  mandirName: string;
}): Promise<void> => {
  const {
    firstName,
    lastName,
    fullName,
    gotra,
    mobile,
    email,
    poojaName,
    problemName,
    description,
    poojaDate,
    mandirName,
  } = bookingDetails;

  // Create a table from the full names and gotras
  const namesGotrasTable = fullName
    .map((name, index) => {
      return `
            <tr>
              <td style="padding: 12px; border: 1px solid #e0e0e0; text-align: center;">${name}</td>
              <td style="padding: 12px; border: 1px solid #e0e0e0; text-align: center;">${gotra[index]}</td>
            </tr>
        `;
    })
    .join("");

  const mailOptions: SendMailOptions = {
    from: `"Vedic Vaibhav" <${adminEmail}>`,
    to: adminEmail,
    subject: "📩 New Personalized Pooja Booking Received 📩",
    html: `
            <div style="font-family: 'Poppins', 'Helvetica Neue', Arial, sans-serif; color: #444; line-height: 1.6; padding: 20px; background-color: #f9f9f9;">
              <h1 style="color: #ff6600; text-align: center; font-size: 28px; margin-bottom: 20px;">🕉️ New Personalized Pooja Booking 🕉️</h1>
              <p style="font-size: 16px; text-align: center; margin-bottom: 30px;">A new personalized pooja has been booked by <strong>${firstName} ${lastName}</strong> on <strong>${new Date(
                poojaDate,
              ).toLocaleDateString()}</strong>. Below are the details of the booking:</p>

              <h2 style="color: #333; font-size: 22px; border-bottom: 2px solid #ff6600; margin-bottom: 20px;">📋 User Information 📋</h2>
              <table style="width: 100%; max-width: 600px; margin: 0 auto; border-collapse: collapse;">
                  <tr>
                      <th style="padding: 12px; background-color: #ff6600; color: #fff; text-align: left;">First Name</th>
                      <td style="padding: 12px; border: 1px solid #e0e0e0;">${firstName}</td>
                  </tr>
                  <tr>
                      <th style="padding: 12px; background-color: #ff6600; color: #fff; text-align: left;">Last Name</th>
                      <td style="padding: 12px; border: 1px solid #e0e0e0;">${lastName}</td>
                  </tr>
                  <tr>
                      <th style="padding: 12px; background-color: #ff6600; color: #fff; text-align: left;">Mobile</th>
                      <td style="padding: 12px; border: 1px solid #e0e0e0;">${mobile}</td>
                  </tr>
                  <tr>
                      <th style="padding: 12px; background-color: #ff6600; color: #fff; text-align: left;">Email</th>
                      <td style="padding: 12px; border: 1px solid #e0e0e0;">${email}</td>
                  </tr>
              </table>

              <h2 style="color: #333; font-size: 22px; border-bottom: 2px solid #ff6600; margin: 30px 0 20px;">🛕 Pooja Details 🛕</h2>
              <table style="width: 100%; max-width: 600px; margin: 0 auto; border-collapse: collapse;">
                  <tr>
                      <th style="padding: 12px; background-color: #ff6600; color: #fff; text-align: left;">Pooja Name</th>
                      <td style="padding: 12px; border: 1px solid #e0e0e0;">${poojaName}</td>
                  </tr>
                  <tr>
                      <th style="padding: 12px; background-color: #ff6600; color: #fff; text-align: left;">Mandir Name</th>
                      <td style="padding: 12px; border: 1px solid #e0e0e0;">${mandirName}</td>
                  </tr>
                  <tr>
                      <th style="padding: 12px; background-color: #ff6600; color: #fff; text-align: left;">Problem Name</th>
                      <td style="padding: 12px; border: 1px solid #e0e0e0;">${problemName}</td>
                  </tr>
                  <tr>
                      <th style="padding: 12px; background-color: #ff6600; color: #fff; text-align: left;">Description</th>
                      <td style="padding: 12px; border: 1px solid #e0e0e0;">${description}</td>
                  </tr>
                  <tr>
                      <th style="padding: 12px; background-color: #ff6600; color: #fff; text-align: left;">Pooja Date</th>
                      <td style="padding: 12px; border: 1px solid #e0e0e0;">${new Date(poojaDate).toLocaleDateString(
                        "en-GB",
                      )}</td>
                  </tr>
              </table>

              <h2 style="color: #333; font-size: 22px; border-bottom: 2px solid #ff6600; margin: 30px 0 20px;">👥 Participants 👥</h2>
              <table style="width: 100%; max-width: 600px; margin: 0 auto; border-collapse: collapse;">
                  <thead>
                      <tr>
                          <th style="padding: 12px; background-color: #ff6600; color: #fff; text-align: center;">Full Name</th>
                          <th style="padding: 12px; background-color: #ff6600; color: #fff; text-align: center;">Gotra</th>
                      </tr>
                  </thead>
                  <tbody>
                      ${namesGotrasTable}
                  </tbody>
              </table>

              <p style="font-size: 16px; text-align: center; margin-top: 30px;">Please log in to the admin panel to manage this booking.</p>

              <div style="text-align: center; margin-top: 30px;">
                  <a href="https://vedicvaibhav.com/admin" style="background-color: #ff6600; color: #fff; text-decoration: none; padding: 12px 24px; font-size: 16px; border-radius: 6px;">🔗 Go to Admin Panel 🔗</a>
              </div>

              <p style="font-size: 14px; text-align: center; margin-top: 40px; color: #888;">© ${new Date().getFullYear()} Vedic Vaibhav. All rights reserved.</p>
            </div>
        `,
  };

  try {
    await transporterAdmin.sendMail(mailOptions);
  } catch (error) {
    logger.error({ err: error }, "Error sending personalized pooja booking email to admin");
  }
};

export interface PanditDetails {
  prefix: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  age: number;
  gender: string;
  dateOfBirth: string;
  city: string;
  state: string;
  country: string;
  experience: string;
  introduction: string;
  languages: string[];
  skills: string[];
  systemKnown: string[];
  pujaCategory: string[];
  pujaGods: string[];
  astroCategory: string[];
}

export const panditRegistrationToAdmin = async (pandit: PanditDetails): Promise<void> => {
  const {
    prefix,
    firstName,
    lastName,
    email,
    mobile,
    age,
    gender,
    dateOfBirth,
    city,
    state,
    country,
    experience,
    introduction,
    languages,
    skills,
    systemKnown,
    pujaCategory,
    pujaGods,
    astroCategory,
  } = pandit;

  const mailOptions: SendMailOptions = {
    from: `"Panditji At Request" <${adminEmail}>`,
    to: adminEmail,
    subject: "📩 New Pandit Registered 📩",
    html: `
      <div style="font-family: 'Poppins', 'Helvetica Neue', Arial, sans-serif; color: #444; line-height: 1.6; padding: 20px; background-color: #f9f9f9;">
        <h1 style="color: #ff6600; text-align: center; font-size: 28px; margin-bottom: 20px;">🕉️ New Pandit Registered 🕉️</h1>
        <p style="font-size: 16px; text-align: center; margin-bottom: 30px;">
          A new Pandit has registered on the platform. Below are their details:
        </p>

        <h2 style="color: #333; font-size: 22px; border-bottom: 2px solid #ff6600; margin-bottom: 20px;">📋 Pandit Information 📋</h2>
        <table style="width: 100%; max-width: 600px; margin: 0 auto; border-collapse: collapse;">
            <tr>
                <th style="padding: 12px; background-color: #ff6600; color: #fff; text-align: left;">Full Name</th>
                <td style="padding: 12px; border: 1px solid #e0e0e0;">${prefix} ${firstName} ${lastName}</td>
            </tr>
            <tr>
                <th style="padding: 12px; background-color: #ff6600; color: #fff; text-align: left;">Email</th>
                <td style="padding: 12px; border: 1px solid #e0e0e0;">${email}</td>
            </tr>
            <tr>
                <th style="padding: 12px; background-color: #ff6600; color: #fff; text-align: left;">Mobile</th>
                <td style="padding: 12px; border: 1px solid #e0e0e0;">${mobile}</td>
            </tr>
            <tr>
                <th style="padding: 12px; background-color: #ff6600; color: #fff; text-align: left;">Age</th>
                <td style="padding: 12px; border: 1px solid #e0e0e0;">${age}</td>
            </tr>
            <tr>
                <th style="padding: 12px; background-color: #ff6600; color: #fff; text-align: left;">Gender</th>
                <td style="padding: 12px; border: 1px solid #e0e0e0;">${gender}</td>
            </tr>
            <tr>
                <th style="padding: 12px; background-color: #ff6600; color: #fff; text-align: left;">Date of Birth</th>
                <td style="padding: 12px; border: 1px solid #e0e0e0;">${dateOfBirth}</td>
            </tr>
            <tr>
                <th style="padding: 12px; background-color: #ff6600; color: #fff; text-align: left;">City</th>
                <td style="padding: 12px; border: 1px solid #e0e0e0;">${city}</td>
            </tr>
            <tr>
                <th style="padding: 12px; background-color: #ff6600; color: #fff; text-align: left;">State</th>
                <td style="padding: 12px; border: 1px solid #e0e0e0;">${state}</td>
            </tr>
            <tr>
                <th style="padding: 12px; background-color: #ff6600; color: #fff; text-align: left;">Country</th>
                <td style="padding: 12px; border: 1px solid #e0e0e0;">${country}</td>
            </tr>
            <tr>
                <th style="padding: 12px; background-color: #ff6600; color: #fff; text-align: left;">Experience</th>
                <td style="padding: 12px; border: 1px solid #e0e0e0;">${experience}</td>
            </tr>
            <tr>
                <th style="padding: 12px; background-color: #ff6600; color: #fff; text-align: left;">Introduction</th>
                <td style="padding: 12px; border: 1px solid #e0e0e0;">${introduction}</td>
            </tr>
            <tr>
                <th style="padding: 12px; background-color: #ff6600; color: #fff; text-align: left;">Languages</th>
                <td style="padding: 12px; border: 1px solid #e0e0e0;">${languages.join(", ")}</td>
            </tr>
            <tr>
                <th style="padding: 12px; background-color: #ff6600; color: #fff; text-align: left;">Skills</th>
                <td style="padding: 12px; border: 1px solid #e0e0e0;">${skills.join(", ")}</td>
            </tr>
            <tr>
                <th style="padding: 12px; background-color: #ff6600; color: #fff; text-align: left;">Systems Known</th>
                <td style="padding: 12px; border: 1px solid #e0e0e0;">${systemKnown.join(", ")}</td>
            </tr>
            <tr>
                <th style="padding: 12px; background-color: #ff6600; color: #fff; text-align: left;">Puja Categories</th>
                <td style="padding: 12px; border: 1px solid #e0e0e0;">${pujaCategory.join(", ")}</td>
            </tr>
            <tr>
                <th style="padding: 12px; background-color: #ff6600; color: #fff; text-align: left;">Puja Gods</th>
                <td style="padding: 12px; border: 1px solid #e0e0e0;">${pujaGods.join(", ")}</td>
            </tr>
            <tr>
                <th style="padding: 12px; background-color: #ff6600; color: #fff; text-align: left;">Astro Categories</th>
                <td style="padding: 12px; border: 1px solid #e0e0e0;">${astroCategory.join(", ")}</td>
            </tr>
        </table>

        <p style="font-size: 14px; text-align: center; margin-top: 40px; color: #888;">
          © ${new Date().getFullYear()} Panditji At Request. All rights reserved.
        </p>
      </div>
    `,
  };

  try {
    await transporterAdmin.sendMail(mailOptions);
  } catch (error) {
    logger.error({ err: error }, "Error sending Pandit registration email");
  }
};

const formatToINR = (amount: number): string =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount);

/** Structural shape of the (legacy) chadhava booking fields rendered in the admin mail. */
export interface ChadhavaAdminEmailBooking {
  orderID: string | number;
  transactionID?: string;
  puja: { title?: string; temple?: string; date: Date | string };
  accessories: { name: string; price: number; quantity: number }[];
  prasad?: { name: string; price: number } | null;
  address?: {
    name?: string;
    address1?: string;
    address2?: string;
    city?: string;
    state?: string;
    country?: string;
    pinCode?: string | number;
    email?: string;
  } | null;
  totalPrice: number;
  familyMembers?: string[];
  gotra?: string | null;
  status?: string;
  name?: string;
  whatsapp?: string;
}

/** Any mongoose document (or plain wrapper) whose `toObject()` yields the admin email fields. */
export interface ChadhavaAdminEmailBookingDoc {
  toObject(): ChadhavaAdminEmailBooking;
}

export const sendChadhavaConfirmationToAdmin = async (bookingDoc: ChadhavaAdminEmailBookingDoc): Promise<void> => {
  const booking = bookingDoc.toObject();

  const {
    orderID,
    transactionID,
    puja,
    accessories,
    prasad,
    address,
    totalPrice,
    familyMembers,
    gotra,
    status,
    name, // Use the top-level name
    whatsapp, // Use the top-level whatsapp
  } = booking;

  const cartItemsHtml = accessories
    .map((item) => {
      return `
        <tr>
          <td style="padding: 10px; border: 1px solid #e0e0e0;">${item.name}</td>
          <td style="padding: 10px; border: 1px solid #e0e0e0; text-align: center;">${item.quantity}</td>
          <td style="padding: 10px; border: 1px solid #e0e0e0; text-align: right;">${formatToINR(item.price * item.quantity)}</td>
        </tr>
      `;
    })
    .join("");

  const prasadItemHtml = prasad
    ? `
    <tr>
      <td style="padding: 10px; border: 1px solid #e0e0e0;">${prasad.name} (Prasad)</td>
      <td style="padding: 10px; border: 1px solid #e0e0e0; text-align: center;">1</td>
      <td style="padding: 10px; border: 1px solid #e0e0e0; text-align: right;">${formatToINR(prasad.price)}</td>
    </tr>
  `
    : "";

  const familyMembersHtml =
    familyMembers && familyMembers.length > 0 ? `<strong>Family Members:</strong> ${familyMembers.join(", ")}<br>` : "";

  const mailOptions: SendMailOptions = {
    from: `"Vedic Vaibhav System" <${adminEmail}>`,
    to: adminEmail,
    subject: `🙏 New Chadhava Booking - ${orderID}`,
    html: `
      <div style="font-family: 'Poppins', Arial, sans-serif; color: #333; padding: 24px; background: #f7f7f7;">
        <h2 style="color: #ff6600; margin-bottom: 20px; text-align: center;">🙏 New Chadhava Booking Received</h2>
        <p style="text-align: center; font-size: 16px;">A new Chadhava booking has been confirmed. Below are the details:</p>

        <h3 style="color: #222; border-bottom: 2px solid #ff6600;">Order & Puja Info</h3>
        <table style="width: 100%; max-width: 600px; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <th style="text-align: left; background: #ff6600; color: #fff; padding: 10px;">Order ID</th>
            <td style="padding: 10px; border: 1px solid #e0e0e0;">${orderID}</td>
          </tr>
          <tr>
            <th style="text-align: left; background: #ff6600; color: #fff; padding: 10px;">Transaction ID</th>
            <td style="padding: 10px; border: 1px solid #e0e0e0;">${transactionID || "N/A"}</td>
          </tr>
          <tr>
            <th style="text-align: left; background: #ff6600; color: #fff; padding: 10px;">Puja Name</th>
            <td style="padding: 10px; border: 1px solid #e0e0e0;">${puja.title}</td>
          </tr>
           <tr>
            <th style="text-align: left; background: #ff6600; color: #fff; padding: 10px;">Temple</th>
            <td style="padding: 10px; border: 1px solid #e0e0e0;">${puja.temple}</td>
          </tr>
          <tr>
            <th style="text-align: left; background: #ff6600; color: #fff; padding: 10px;">Puja Date</th>
            <td style="padding: 10px; border: 1px solid #e0e0e0;">${new Date(puja.date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</td>
          </tr>
        </table>

        <h3 style="color: #222; border-bottom: 2px solid #ff6600;">Booked Items</h3>
        <table style="width: 100%; max-width: 600px; border-collapse: collapse;">
          <thead>
            <tr>
              <th style="padding: 10px; background: #ff6600; color: #fff;">Item Name</th>
              <th style="padding: 10px; background: #ff6600; color: #fff;">Quantity</th>
              <th style="padding: 10px; background: #ff6600; color: #fff; text-align: right;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${cartItemsHtml}
            ${prasadItemHtml}
          </tbody>
        </table>

        <h3 style="color: #222; border-bottom: 2px solid #ff6600; margin-top: 24px;">Devotee & Delivery Details</h3>
        <p style="margin: 0 0 12px;">
          <strong>Name:</strong> ${name || "N/A"}<br>
          <strong>WhatsApp:</strong> ${whatsapp || "N/A"}<br>
          <strong>Email:</strong> ${address?.email || "Not Provided"}<br>
          <strong>Gotra:</strong> ${gotra || "Not Provided"}<br>
          ${familyMembersHtml}
        </p>

        ${
          address
            ? `
          <h4 style="color: #444; margin-bottom: 5px;">Prasad Delivery Address:</h4>
          <p style="margin: 0 0 12px;">
            ${address.name}<br>
            ${address.address1}, ${address.address2 ? address.address2 + "," : ""}<br>
            ${address.city}, ${address.state}, ${address.pinCode}<br>
            ${address.country}
          </p>
        `
            : "<p><strong>No Prasad delivery for this order.</strong></p>"
        }


        <h3 style="color: #222; border-bottom: 2px solid #ff6600;">Payment Summary</h3>
        <table style="width: 100%; max-width: 600px; border-collapse: collapse;">
          <tr>
            <th style="text-align: left; background: #ff6600; color: #fff; padding: 10px;">Payment Status</th>
            <td style="padding: 10px; border: 1px solid #e0e0e0;">Paid (${status})</td>
          </tr>
          <tr>
            <th style="text-align: left; background: #ff6600; color: #fff; padding: 10px;">Total Amount Paid</th>
            <td style="padding: 10px; border: 1px solid #e0e0e0;"><strong>${formatToINR(totalPrice)}</strong></td>
          </tr>
        </table>

        <p style="font-size: 13px; color: #888; text-align: center; margin-top: 36px;">
          © ${new Date().getFullYear()} Vedic Vaibhav. All rights reserved.
        </p>
      </div>
    `,
  };

  try {
    await transporterAdmin.sendMail(mailOptions);
  } catch (error) {
    logger.error({ err: error }, `Error sending admin email for Chadhava order ${orderID}`);
  }
};

// USER-FACING EMAIL FUNCTIONS (via support@vedicvaibhav.com)

const SUPPORT_FROM = '"Vedic Vaibhav" <support@vedicvaibhav.com>';
const SUPPORT_REPLY_TO = '"Vedic Vaibhav Support" <support@vedicvaibhav.com>';

const getUserEmailTemplate = (title: string, headerText: string, bodyHtml: string): string => `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>
    body { font-family: 'Inter', 'Segoe UI', Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #fff9f0; color: #4a4a4a; }
    .wrapper { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.05); border: 1px solid #f9e6d2; }
    .header { background: #fff2e0; padding: 40px 30px; text-align: center; border-bottom: 4px solid #ff9933; }
    .header h1 { color: #d35400; font-size: 26px; margin: 0 0 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
    .header p { color: #a0522d; font-size: 13px; margin: 0; font-weight: 500; }
    .body { padding: 36px 32px; }
    .greeting { font-size: 18px; color: #2c3e50; margin-bottom: 16px; font-weight: 600; }
    .info-box { background: #fffdf9; border: 1.5px solid #fae5ce; border-radius: 10px; padding: 22px; margin-bottom: 24px; }
    .info-box table { width: 100%; border-collapse: collapse; }
    .info-box td { padding: 10px 8px; border-bottom: 1px solid #fdf2e9; font-size: 14px; color: #34495e; }
    .info-box tr:last-child td { border-bottom: none; }
    .info-box td:first-child { color: #b35900; font-weight: 600; width: 42%; }
    .notice { background: #fffaf0; border-radius: 10px; padding: 18px; border-left: 5px solid #ff9933; margin-bottom: 24px; font-size: 14px; color: #5d6d7e; line-height: 1.6; }
    .notice h4 { color: #d35400; margin: 0 0 6px; font-size: 15px; font-weight: 700; }
    .footer { background: #fffcf8; padding: 22px; text-align: center; border-top: 1px solid #fae5ce; }
    .footer p { color: #7f8c8d; font-size: 13px; margin: 5px 0; }
    .footer .brand { color: #d35400; font-weight: 700; font-size: 14px; display: block; margin-bottom: 8px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>${title}</h1>
      <p>${headerText}</p>
    </div>
    <div class="body">${bodyHtml}</div>
    <div class="footer">
      <span class="brand">Vedic Vaibhav</span>
      <p>The Essence of Sacred Traditions</p>
      <p>Questions? Contact us at <strong>support@vedicvaibhav.com</strong></p>
      <p>© ${new Date().getFullYear()} Vedic Vaibhav. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

export const normalPoojaBookingToUser = async (details: {
  name: string;
  email: string;
  poojaName: string;
  mandirName: string;
  packageName: string;
  poojaDate: string;
  poojaTime?: string;
  totalPrice: number;
  transactionId: string;
  bhaktaNames?: string[];
  /** Presentment fields from the booking record. A receipt must be shown in the
   *  currency the devotee ACTUALLY PAID IN — see lib/receiptMoney.ts. */
  currency?: string | null;
  chargedAmount?: number | null;
  fxRate?: number | null;
  priceMultiplier?: number | null;
}): Promise<void> => {
  const { name, email, poojaName, mandirName, packageName, poojaDate, poojaTime, totalPrice, transactionId, bhaktaNames } =
    details;
  if (!email || !email.includes("@")) return;

  // totalPrice is the INR value of the sale; `money.total()` renders it in the
  // currency the card was actually billed in, exactly as charged.
  const money = receiptMoney(details, totalPrice);

  const participantsLine = bhaktaNames && bhaktaNames.length > 0 ? bhaktaNames.join(", ") : "N/A";

  const body = `
    <p class="greeting">Namaste ${name},</p>
    <p style="font-size:15px;color:#5d6d7e;margin-bottom:24px;line-height:1.7;">
      Your Pooja booking has been successfully confirmed. Our pandit team will perform the sacred rituals on the scheduled date. We are honored to be a part of your spiritual journey. 🙏
    </p>
    <div class="info-box">
      <table>
        <tr><td>Transaction ID</td><td><strong>${transactionId}</strong></td></tr>
        <tr><td>Pooja</td><td>${poojaName}</td></tr>
        <tr><td>Package</td><td>${packageName}</td></tr>
        <tr><td>Temple</td><td>${mandirName}</td></tr>
        <tr><td>Pooja Date</td><td>${poojaDate}</td></tr>
        ${poojaTime ? `<tr><td>Time</td><td>${poojaTime}</td></tr>` : ""}
        <tr><td>Devotees</td><td>${participantsLine}</td></tr>
        <tr><td>Amount Paid</td><td>${money.total(totalPrice)}</td></tr>
      </table>
    </div>
    <div class="notice">
      <h4>What's Next?</h4>
      Our team will contact you via WhatsApp with puja video and prasad tracking details after the rituals are completed.
    </div>
  `;

  const mailOptions: SendMailOptions = {
    from: SUPPORT_FROM,
    replyTo: SUPPORT_REPLY_TO,
    to: email,
    subject: `Your Pooja Booking is Confirmed — ${poojaName}`,
    html: getUserEmailTemplate("Booking Confirmed", "Your sacred pooja is now scheduled", body),
  };

  try {
    await transporterSupport.sendMail(mailOptions);
  } catch (error) {
    logger.error({ err: error }, "[NormalPooja] Error sending user confirmation email");
  }
};

export const fourDhamBookingToUser = async (details: {
  name: string;
  email: string;
  bookingId: string;
  poojaName: string;
  packageName: string;
  slotName: string;
  slotStartDate: Date;
  slotEndDate: Date;
  packagePrice: number;
  familyMembers?: string[];
  /** Presentment fields from the booking record. A receipt must be shown in the
   *  currency the devotee ACTUALLY PAID IN — see lib/receiptMoney.ts. */
  currency?: string | null;
  chargedAmount?: number | null;
  fxRate?: number | null;
  priceMultiplier?: number | null;
}): Promise<void> => {
  const { name, email, bookingId, poojaName, packageName, slotName, slotStartDate, slotEndDate, packagePrice, familyMembers } =
    details;
  if (!email || !email.includes("@")) return;

  const money = receiptMoney(details, packagePrice);

  const dateRange = `${new Date(slotStartDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })} – ${new Date(slotEndDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`;
  const membersLine = familyMembers && familyMembers.length > 0 ? familyMembers.join(", ") : "N/A";

  const body = `
    <p class="greeting">Namaste ${name},</p>
    <p style="font-size:15px;color:#5d6d7e;margin-bottom:24px;line-height:1.7;">
      Your 4 Dham Yatra Seva booking is confirmed! Our expert pandits will perform the sacred rituals across all four dhams on your behalf. May this divine yatra bring you blessings and peace. 🕉️
    </p>
    <div class="info-box">
      <table>
        <tr><td>Booking ID</td><td><strong>${bookingId}</strong></td></tr>
        <tr><td>Yatra</td><td>${poojaName}</td></tr>
        <tr><td>Package</td><td>${packageName}</td></tr>
        <tr><td>Slot</td><td>${slotName}</td></tr>
        <tr><td>Dates</td><td>${dateRange}</td></tr>
        <tr><td>Family Members</td><td>${membersLine}</td></tr>
        <tr><td>Amount Paid</td><td>${money.total(packagePrice)}</td></tr>
      </table>
    </div>
    <div class="notice">
      <h4>What's Next?</h4>
      Our team will reach out to you via WhatsApp with yatra updates, ritual videos, and prasad dispatch tracking.
    </div>
  `;

  const mailOptions: SendMailOptions = {
    from: SUPPORT_FROM,
    replyTo: SUPPORT_REPLY_TO,
    to: email,
    subject: `Your 4 Dham Yatra Booking is Confirmed — ${bookingId}`,
    html: getUserEmailTemplate("Booking Confirmed", "Your 4 Dham Yatra Seva is now scheduled", body),
  };

  try {
    await transporterSupport.sendMail(mailOptions);
  } catch (error) {
    logger.error({ err: error }, "[4DhamYatra] Error sending user confirmation email");
  }
};

export const bbSevaBookingToAdmin = async (details: {
  orderID: string;
  name: string;
  mobile: string;
  email?: string;
  packageName: string;
  packagePrice: number;
  amount: number;
  startDate?: string;
  gotra?: string;
  sankalp?: string;
  familyMembers?: string[];
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  transactionId: string;
  bookingDate: Date;
}): Promise<void> => {
  const {
    orderID,
    name,
    mobile,
    email,
    packageName,
    packagePrice,
    amount,
    startDate,
    gotra,
    sankalp,
    familyMembers,
    address,
    city,
    state,
    pincode,
    transactionId,
    bookingDate,
  } = details;

  const membersLine = familyMembers && familyMembers.length > 0 ? familyMembers.join(", ") : "None";
  const addressLine = [address, city, state, pincode].filter(Boolean).join(", ") || "N/A";

  const emailHtml = `
    <div style="font-family:'Poppins',Arial,sans-serif;color:#333;padding:24px;background:#f7f7f7;">
      <h2 style="color:#ff6600;text-align:center;">🛕 New Banke Bihariji Seva Booking</h2>
      <p style="text-align:center;">A new BB Seva has been booked by <strong>${name}</strong>.</p>
      <table style="width:100%;max-width:600px;border-collapse:collapse;margin:20px auto;">
        <tr><th style="text-align:left;background:#ff6600;color:#fff;padding:10px;">Order ID</th><td style="padding:10px;border:1px solid #e0e0e0;">${orderID}</td></tr>
        <tr><th style="text-align:left;background:#ff6600;color:#fff;padding:10px;">Name</th><td style="padding:10px;border:1px solid #e0e0e0;">${name}</td></tr>
        <tr><th style="text-align:left;background:#ff6600;color:#fff;padding:10px;">Mobile</th><td style="padding:10px;border:1px solid #e0e0e0;">${mobile}</td></tr>
        <tr><th style="text-align:left;background:#ff6600;color:#fff;padding:10px;">Email</th><td style="padding:10px;border:1px solid #e0e0e0;">${email || "Not provided"}</td></tr>
        <tr><th style="text-align:left;background:#ff6600;color:#fff;padding:10px;">Package</th><td style="padding:10px;border:1px solid #e0e0e0;">${packageName}</td></tr>
        <tr><th style="text-align:left;background:#ff6600;color:#fff;padding:10px;">Package Price</th><td style="padding:10px;border:1px solid #e0e0e0;">₹${packagePrice}</td></tr>
        <tr><th style="text-align:left;background:#ff6600;color:#fff;padding:10px;">Amount Paid</th><td style="padding:10px;border:1px solid #e0e0e0;">₹${amount}</td></tr>
        <tr><th style="text-align:left;background:#ff6600;color:#fff;padding:10px;">Seva Start Date</th><td style="padding:10px;border:1px solid #e0e0e0;">${startDate || "N/A"}</td></tr>
        <tr><th style="text-align:left;background:#ff6600;color:#fff;padding:10px;">Gotra</th><td style="padding:10px;border:1px solid #e0e0e0;">${gotra || "N/A"}</td></tr>
        <tr><th style="text-align:left;background:#ff6600;color:#fff;padding:10px;">Sankalp</th><td style="padding:10px;border:1px solid #e0e0e0;">${sankalp || "N/A"}</td></tr>
        <tr><th style="text-align:left;background:#ff6600;color:#fff;padding:10px;">Family Members</th><td style="padding:10px;border:1px solid #e0e0e0;">${membersLine}</td></tr>
        <tr><th style="text-align:left;background:#ff6600;color:#fff;padding:10px;">Address</th><td style="padding:10px;border:1px solid #e0e0e0;">${addressLine}</td></tr>
        <tr><th style="text-align:left;background:#ff6600;color:#fff;padding:10px;">Transaction ID</th><td style="padding:10px;border:1px solid #e0e0e0;">${transactionId}</td></tr>
        <tr><th style="text-align:left;background:#ff6600;color:#fff;padding:10px;">Booking Date</th><td style="padding:10px;border:1px solid #e0e0e0;">${new Date(bookingDate).toLocaleString()}</td></tr>
      </table>
      <div style="text-align:center;margin-top:30px;">
        <a href="https://vedicvaibhav.com/admin" style="background:#ff6600;color:#fff;text-decoration:none;padding:12px 24px;font-size:16px;border-radius:6px;">Go to Admin Panel</a>
      </div>
      <p style="font-size:13px;color:#888;text-align:center;margin-top:36px;">© ${new Date().getFullYear()} Vedic Vaibhav. All rights reserved.</p>
    </div>
  `;

  const mailOptions: SendMailOptions = {
    from: `"Vedic Vaibhav" <${adminEmail}>`,
    to: adminEmail,
    subject: `🛕 New Banke Bihariji Seva Booking — ${orderID}`,
    html: emailHtml,
  };

  try {
    await transporterAdmin.sendMail(mailOptions);
  } catch (error) {
    logger.error({ err: error }, "[BBSeva] Error sending admin notification email");
  }
};

export const bbSevaBookingToUser = async (details: {
  name: string;
  email: string;
  orderID: string;
  packageName: string;
  amount: number;
  startDate?: string;
  gotra?: string;
  familyMembers?: string[];
  /** Presentment fields from the booking record. A receipt must be shown in the
   *  currency the devotee ACTUALLY PAID IN — see lib/receiptMoney.ts. */
  currency?: string | null;
  chargedAmount?: number | null;
  fxRate?: number | null;
  priceMultiplier?: number | null;
}): Promise<void> => {
  const { name, email, orderID, packageName, amount, startDate, gotra, familyMembers } = details;
  if (!email || !email.includes("@")) return;

  const money = receiptMoney(details, amount);

  const membersLine = familyMembers && familyMembers.length > 0 ? familyMembers.join(", ") : "N/A";

  const body = `
    <p class="greeting">Namaste ${name},</p>
    <p style="font-size:15px;color:#5d6d7e;margin-bottom:24px;line-height:1.7;">
      Your Shri Banke Bihari Ji Seva booking is confirmed! Our dedicated pandits at Vrindavan will perform the seva as per the sacred tradition on your behalf. 🙏
    </p>
    <div class="info-box">
      <table>
        <tr><td>Order ID</td><td><strong>${orderID}</strong></td></tr>
        <tr><td>Service</td><td>Shri Banke Bihari Ji Seva</td></tr>
        <tr><td>Package</td><td>${packageName}</td></tr>
        ${startDate ? `<tr><td>Seva Start Date</td><td>${startDate}</td></tr>` : ""}
        ${gotra ? `<tr><td>Gotra</td><td>${gotra}</td></tr>` : ""}
        <tr><td>Family Members</td><td>${membersLine}</td></tr>
        <tr><td>Amount Paid</td><td>${money.total(amount)}</td></tr>
      </table>
    </div>
    <div class="notice">
      <h4>What's Next?</h4>
      Our team will send you the seva confirmation and live darshan updates via WhatsApp. Prasad will be dispatched to your address after the seva.
    </div>
  `;

  const mailOptions: SendMailOptions = {
    from: SUPPORT_FROM,
    replyTo: SUPPORT_REPLY_TO,
    to: email,
    subject: `Your Banke Bihariji Seva is Confirmed — ${orderID}`,
    html: getUserEmailTemplate("Seva Confirmed", "Your Banke Bihari Ji Seva is now scheduled", body),
  };

  try {
    await transporterSupport.sendMail(mailOptions);
  } catch (error) {
    logger.error({ err: error }, "[BBSeva] Error sending user confirmation email");
  }
};

export const personalizedPoojaBookingToUser = async (details: {
  name: string;
  email: string;
  orderId: string;
  poojaName?: string;
  mandirName: string;
  problemName: string;
  poojaDate: Date;
  price: number;
  /** Presentment fields from the booking record. A receipt must be shown in the
   *  currency the devotee ACTUALLY PAID IN — see lib/receiptMoney.ts. */
  currency?: string | null;
  chargedAmount?: number | null;
  fxRate?: number | null;
  priceMultiplier?: number | null;
}): Promise<void> => {
  const { name, email, orderId, poojaName, mandirName, problemName, poojaDate, price } = details;
  if (!email || !email.includes("@")) return;

  const money = receiptMoney(details, price);

  const formattedDate = new Date(poojaDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  const body = `
    <p class="greeting">Namaste ${name},</p>
    <p style="font-size:15px;color:#5d6d7e;margin-bottom:24px;line-height:1.7;">
      Your Personalized Pooja request has been received and confirmed. Our expert pandit at the selected mandir will perform the sacred rituals with full devotion for you and your family. 🕉️
    </p>
    <div class="info-box">
      <table>
        <tr><td>Order ID</td><td><strong>${orderId}</strong></td></tr>
        ${poojaName ? `<tr><td>Pooja</td><td>${poojaName}</td></tr>` : ""}
        <tr><td>Mandir</td><td>${mandirName}</td></tr>
        <tr><td>Reason</td><td>${problemName}</td></tr>
        <tr><td>Pooja Date</td><td>${formattedDate}</td></tr>
        <tr><td>Amount Paid</td><td>${money.total(price)}</td></tr>
      </table>
    </div>
    <div class="notice">
      <h4>What's Next?</h4>
      Our team will review your booking. The pandit will call you before the pooja if any additional details are needed. A video of the ritual and prasad will be shared with you.
    </div>
  `;

  const mailOptions: SendMailOptions = {
    from: SUPPORT_FROM,
    replyTo: SUPPORT_REPLY_TO,
    to: email,
    subject: `Your Personalized Pooja Booking is Confirmed — ${orderId}`,
    html: getUserEmailTemplate("Booking Confirmed", "Your sacred pooja request has been received", body),
  };

  try {
    await transporterSupport.sendMail(mailOptions);
  } catch (error) {
    logger.error({ err: error }, "[PersonalizedPooja] Error sending user confirmation email");
  }
};

export interface PitruPujaAdminEmailBooking {
  orderId: string;
  poojaName: string;
  packageLabel: string;
  /** How many ancestors the package covers. */
  personCount: number;
  /** The names actually given, which may be fewer than `personCount`. */
  ancestorNames: string[];
  kartaName: string;
  kartaGotra: string;
  whatsappNumber: string;
  callingNumber?: string;
  mandirName?: string;
  mandirPlace?: string;
  poojaDate?: string;
  price: number;
  originalAmount?: number;
  promoCode?: string;
  discountAmount?: number;
  transactionId?: string;
  /** Presentment fields, so the figure matches the devotee's card statement. */
  currency?: string | null;
  chargedAmount?: number | null;
  fxRate?: number | null;
  priceMultiplier?: number | null;
}

/**
 * Tells the temple side a pitru puja has been booked.
 *
 * There is no devotee-facing counterpart: the pitru checkout never asks for an
 * email address, and inventing one from the phone number — as the pooja flow
 * does — would mail a stranger. The devotee is reached on WhatsApp and SMS
 * instead, which is what they gave us a number for.
 */
export const pitruPujaBookingToAdmin = async (booking: PitruPujaAdminEmailBooking): Promise<void> => {
  const row = (label: string, value: string) => `
    <tr>
      <th style="padding: 10px; background-color: #7A0F1F; color: #fff; text-align: left; width: 200px;">${label}</th>
      <td style="padding: 10px; border: 1px solid #e0e0e0;">${value}</td>
    </tr>`;

  const ancestors = booking.ancestorNames.length
    ? booking.ancestorNames.map((name) => `<li style="padding: 2px 0;">${name}</li>`).join("")
    : "<li style=\"padding: 2px 0;\">—</li>";

  // Worth showing plainly: the package is a ceiling, so naming fewer ancestors
  // than it covers is the devotee's choice and not a data-entry mistake the
  // temple should chase them about.
  const namedNote =
    booking.ancestorNames.length < booking.personCount
      ? ` <em style="color:#7A0F1F;">(${booking.ancestorNames.length} of ${booking.personCount} named — the devotee chose to name fewer)</em>`
      : "";

  // `price` is the INR value of the sale, already marked up for an
  // international card; `money.total()` renders it in the currency actually
  // billed. The coupon is an India-list figure, so it uses `item()`.
  const money = receiptMoney(booking, booking.price);

  const discountRow =
    booking.promoCode && booking.discountAmount
      ? row("Coupon", `${booking.promoCode} (−${money.item(booking.discountAmount)})`)
      : "";

  const poojaDate = booking.poojaDate
    ? new Date(booking.poojaDate).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Kolkata",
      })
    : "—";

  const body = `
    <h1 style="color: #7A0F1F; text-align: center; font-size: 26px; margin-bottom: 8px;">🪔 New Pitru Puja Booking 🪔</h1>
    <p style="font-size: 15px; text-align: center; color: #666; margin-top: 0;">Order <strong>${booking.orderId}</strong></p>

    <h2 style="color: #333; font-size: 19px; border-bottom: 2px solid #7A0F1F; padding-bottom: 6px;">Booking</h2>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
      ${row("Puja", booking.poojaName || "Pitru Puja")}
      ${row("Package", `${booking.packageLabel} (for ${booking.personCount} Pitru)`)}
      ${row("Mandir", `${booking.mandirName || "—"}${booking.mandirPlace ? `, ${booking.mandirPlace}` : ""}`)}
      ${row("Puja date", poojaDate)}
      ${row("Amount paid", money.total(booking.price))}
      ${discountRow}
      ${row("Transaction", booking.transactionId || "—")}
    </table>

    <h2 style="color: #333; font-size: 19px; border-bottom: 2px solid #7A0F1F; padding-bottom: 6px;">Karta</h2>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
      ${row("Name", `${booking.kartaName} and family`)}
      ${row("Gotra", booking.kartaGotra)}
      ${row("WhatsApp", booking.whatsappNumber)}
      ${booking.callingNumber ? row("Calling number", booking.callingNumber) : ""}
    </table>

    <h2 style="color: #333; font-size: 19px; border-bottom: 2px solid #7A0F1F; padding-bottom: 6px;">
      Ancestors for the Sankalp${namedNote}
    </h2>
    <ul style="font-size: 15px; padding-left: 20px; margin-bottom: 24px;">${ancestors}</ul>

    <p style="font-size: 13px; text-align: center; color: #888; margin-top: 30px;">© ${new Date().getFullYear()} Vedic Vaibhav</p>
  `;

  const mailOptions: SendMailOptions = {
    from: `"Vedic Vaibhav" <${adminEmail}>`,
    to: adminEmail,
    subject: `🪔 New Pitru Puja Booking — ${booking.orderId}`,
    html: getBaseTemplate("New Pitru Puja Booking", body),
  };

  try {
    await transporterAdmin.sendMail(mailOptions);
  } catch (error) {
    logger.error({ err: error }, "[PitruPuja] Error sending booking email to admin");
  }
};
