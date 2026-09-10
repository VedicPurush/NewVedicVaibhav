import nodemailer from "nodemailer";
import { receiptMoney, receiptCurrencyNote } from "../../lib/receiptMoney";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import { env } from "../../config/env";
import { logger } from "../../lib/logger";
import { User } from "../../modules/users/user.model";

// SMTP transporter configuration for user-facing emails
const smtpOptions: SMTPTransport.Options = {
  host: env.smtp.host,
  port: env.smtp.port,
  secure: env.smtp.port === 465, // true for port 465, false for port 587
  auth: {
    user: env.smtp.email,
    pass: env.smtp.password,
  },
  tls: {
    rejectUnauthorized: false,
  },
};

export const transporter = nodemailer.createTransport(new SMTPTransport(smtpOptions));

transporter.verify((error) => {
  if (error) logger.error({ err: error }, "User email transporter configuration error");
});

const escapeHtml = (str?: string | number): string =>
  String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const inr = (amt?: number): string =>
  typeof amt === "number"
    ? new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(amt)
    : "";

const fmtDate = (iso?: string): string => {
  const d = iso ? new Date(iso) : undefined;
  if (!d || isNaN(d.getTime())) return "";
  try {
    return d.toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return d.toDateString();
  }
};

/** Prasad delivery line item as rendered in the confirmation mail. */
export interface PrasadDeliveryEmailItem {
  mandirName: string;
  packageName: string;
  prasadPrice: number;
  prasadCount: number;
  prasadStatus: string;
  mandirImage: string;
}

/** Sangam prasad line item as rendered in the confirmation mail. */
export interface SangamPrasadEmailItem {
  bottleSize?: string;
  description?: string;
  originalPrice?: number;
  discountedPrice?: number;
  quantity?: number;
}

const prasadBookingConfirmation = async (
  email: string,
  userID: string,
  totalPrice: number,
  bookingDate: string,
  prasadDeliveries: PrasadDeliveryEmailItem[],
  sangamPrasadDelivery: SangamPrasadEmailItem[],
  mobile: string,
  address1: string,
  address2: string | null,
  city: string,
  state: string,
  country: string,
  pinCode: number,
  deliveryCharges: number | null,
): Promise<void> => {
  // Attempt to fetch user's name
  let userName = "Valued Customer";
  try {
    const user = await User.findById(userID);
    if (user && user.name) userName = user.name;
  } catch (err) {
    logger.error({ err }, "Error fetching user details");
  }

  // Generate Prasad Details Table
  let prasadDetails = "";
  if (prasadDeliveries && prasadDeliveries.length > 0) {
    prasadDetails = `
      <h3>Prasad Details</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr>
            <th style="padding: 10px; border: 1px solid #ddd; background-color: #ff6600; color: #fff;">Prasad Name</th>
            <th style="padding: 10px; border: 1px solid #ddd; background-color: #ff6600; color: #fff;">Mandir Name</th>
            <th style="padding: 10px; border: 1px solid #ddd; background-color: #ff6600; color: #fff;">Price</th>
            <th style="padding: 10px; border: 1px solid #ddd; background-color: #ff6600; color: #fff;">Count</th>
            <th style="padding: 10px; border: 1px solid #ddd; background-color: #ff6600; color: #fff;">Total</th>
            <th style="padding: 10px; border: 1px solid #ddd; background-color: #ff6600; color: #fff;">Image</th>
            <th style="padding: 10px; border: 1px solid #ddd; background-color: #ff6600; color: #fff;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${prasadDeliveries
            .map((d) => {
              const total = d.prasadPrice * d.prasadCount;
              return `
                <tr>
                  <td style="padding: 10px; border: 1px solid #ddd;">${d.packageName}</td>
                  <td style="padding: 10px; border: 1px solid #ddd;">${d.mandirName}</td>
                  <td style="padding: 10px; border: 1px solid #ddd;">₹${d.prasadPrice}</td>
                  <td style="padding: 10px; border: 1px solid #ddd;">${d.prasadCount}</td>
                  <td style="padding: 10px; border: 1px solid #ddd;">₹${total}</td>
                  <td style="padding: 10px; border: 1px solid #ddd;">
                    <img src="${d.mandirImage}" alt="Mandir Image" style="width: 80px; height: auto;" />
                  </td>
                  <td style="padding: 10px; border: 1px solid #ddd;">${d.prasadStatus}</td>
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
    `;
  }

  // Generate Sangam Prasad Details Table
  let sangamDetails = "";
  if (sangamPrasadDelivery && sangamPrasadDelivery.length > 0) {
    sangamDetails = `
      <h3>Sangam Prasad Details</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr>
            <th style="padding: 10px; border: 1px solid #ddd; background-color: #ff6600; color: #fff;">Bottle Size</th>
            <th style="padding: 10px; border: 1px solid #ddd; background-color: #ff6600; color: #fff;">Description</th>
            <th style="padding: 10px; border: 1px solid #ddd; background-color: #ff6600; color: #fff;">Original Price</th>
            <th style="padding: 10px; border: 1px solid #ddd; background-color: #ff6600; color: #fff;">Discounted Price</th>
            <th style="padding: 10px; border: 1px solid #ddd; background-color: #ff6600; color: #fff;">Quantity</th>
            <th style="padding: 10px; border: 1px solid #ddd; background-color: #ff6600; color: #fff;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${sangamPrasadDelivery
            .map((item) => {
              const disc = item.discountedPrice || 0;
              const q = item.quantity || 0;
              return `
                <tr>
                  <td style="padding: 10px; border: 1px solid #ddd;">${item.bottleSize || ""}</td>
                  <td style="padding: 10px; border: 1px solid #ddd;">${item.description || ""}</td>
                  <td style="padding: 10px; border: 1px solid #ddd;">₹${item.originalPrice || 0}</td>
                  <td style="padding: 10px; border: 1px solid #ddd;">₹${disc}</td>
                  <td style="padding: 10px; border: 1px solid #ddd;">${q}</td>
                  <td style="padding: 10px; border: 1px solid #ddd;">₹${disc * q}</td>
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
    <!doctype html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <title>Prasad Booking Confirmation</title>
        <style>
          @media (prefers-color-scheme: dark) {
            body { background-color: #170b04 !important; color: #f8fafc !important; }
            .main-bg { background-color: #221004 !important; }
            .inner-card { background: #2c1206 !important; color: #fff !important; }
          }
        </style>
      </head>
      <body style="margin:0;padding:0;background-color:#fff7e6;">
        <!-- Preheader text (hidden in many clients) -->
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
          Your prasad booking is confirmed. May divine blessings be upon you and your family.
        </div>

        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" class="main-bg" style="background-color:#fff7e6;padding:24px 0;">
          <tr>
            <td align="center">
              <!-- Auspicious Top Banner -->
              <div style="max-width:600px;margin:0 auto 16px auto;">
                <div style="background:linear-gradient(90deg,#e88b23,#f5c54d,#e88b23);height:8px;border-radius:8px 8px 0 0;"></div>
                <div style="text-align:center;padding:12px 0 8px;">
                  <span style="font-size:20px;vertical-align:middle;">🪔</span>
                  <span style="font-family:serif;font-size:16px;color:#b45309;font-weight:700;margin-left:8px;letter-spacing:1px;">Prasad Booking Confirmed</span>
                  <span style="font-size:20px;vertical-align:middle;">🌸</span>
                </div>
                <div style="height:3px;background:repeating-linear-gradient(90deg,#facc15,#fff7e6 12px);margin:0 18% 0 18%;border-radius:2px;"></div>
              </div>

              <table role="presentation" cellpadding="0" cellspacing="0" width="600" class="inner-card"
                style="background:#fffbe8;border-radius:20px;padding:24px 0 28px 0;border:1.5px solid #e88b23;box-shadow:0 4px 24px #f59e421a;">
                <tr>
                  <td style="padding:32px 32px 12px 32px;">
                    <h2 style="margin:0 0 8px;color:#ab2208;font-family:serif;font-size:16px;font-weight:800;text-shadow:0 1px 0 #ffdca6;">
                      🙏 Namaste ${escapeHtml(userName)} ji,
                    </h2>
                    <p style="margin:0 0 16px;color:#8c4b04;line-height:1.7;font-size:14px;font-family:serif;">
                      With reverence and joy, we are honored to confirm your prasad booking with <strong style="color:#d97706;font-family:serif;">Vedic Vaibhav</strong>.<br/>
                      May the divine grace bring peace, prosperity, and auspiciousness to you and your loved ones.
                    </p>

                    <div style="margin:24px 0 8px;">
                      <h3 style="margin:0;font-size:18px;font-family:serif;color:#bb3d09;font-weight:700;display:inline-block;vertical-align:middle;">🔸 Prasad Details</h3>
                      <span style="margin-left:10px;font-size:15px;color:#ab2208;vertical-align:middle;">| प्रसाद विवरण</span>
                    </div>
                    ${prasadDetails}
                    ${sangamDetails}

                    <h3>Summary</h3>
                    <p><strong>Total Price:</strong> ₹${totalPrice}</p>
                    <p><strong>Delivery Charge:</strong> ${deliveryChargeText}</p>

                    <h3>Delivery Address</h3>
                    <p>
                      ${address1}${address2 ? `, ${address2}` : ""}, ${city}, ${state}, ${country} - ${pinCode}<br/>
                      <strong>Mobile:</strong> ${mobile}
                    </p>

                    <div style="text-align:center;margin:30px 0;">
                      <span style="font-size:22px;color:#d97706;letter-spacing:3px;">ॐ ✦ ॐ ✦ ॐ</span>
                    </div>

                    <p style="font-size:16px;color:#9a3412;line-height:1.7;font-family:serif;">
                      If you have any questions or need assistance, feel free to reach out to us.
                    </p>
                    <p style="margin:8px 0 0;color:#7c2d12;font-family:serif;">
                      Warm Regards,<br/>
                      <strong style="color:#d97706;font-family:serif;">🌿 Team Vedic Vaibhav 🌿</strong>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  const mailOptions: nodemailer.SendMailOptions = {
    from: `"Vedic Vaibhav" <${env.smtp.email}>`,
    to: email,
    subject: "🙏 Your Prasad Booking is Confirmed | Vedic Vaibhav",
    html: bodyContent,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    logger.error({ err: error }, "Error sending Prasad Booking Confirmation");
  }
};

// 1. Registration Email to User
const registerationMail = async (recipientEmail: string, userId: string): Promise<string> => {
  const bodyContent = `
    <!doctype html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <title>Welcome to Vedic Vaibhav Family</title>
        <style>
          @media (prefers-color-scheme: dark) {
            body { background-color: #170b04 !important; color: #f8fafc !important; }
            .main-bg { background-color: #221004 !important; }
            .inner-card { background: #2c1206 !important; color: #fff !important; }
          }
        </style>
      </head>
      <body style="margin:0;padding:0;background-color:#fff7e6;">
        <!-- Preheader text (hidden in many clients) -->
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
          Welcome to Vedic Vaibhav! We are excited to have you with us on your spiritual journey.
        </div>

        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" class="main-bg" style="background-color:#fff7e6;padding:24px 0;">
          <tr>
            <td align="center">
              <!-- Auspicious Top Banner -->
              <div style="max-width:600px;margin:0 auto 16px auto;">
                <div style="background:linear-gradient(90deg,#e88b23,#f5c54d,#e88b23);height:8px;border-radius:8px 8px 0 0;"></div>
                <div style="text-align:center;padding:12px 0 8px;">
                  <span style="font-size:20px;vertical-align:middle;">🎉</span>
                  <span style="font-family:serif;font-size:16px;color:#b45309;font-weight:700;margin-left:8px;letter-spacing:1px;">Welcome to Vedic Vaibhav Family!</span>
                  <span style="font-size:20px;vertical-align:middle;">🎉</span>
                </div>
                <div style="height:3px;background:repeating-linear-gradient(90deg,#facc15,#fff7e6 12px);margin:0 18% 0 18%;border-radius:2px;"></div>
              </div>

              <table role="presentation" cellpadding="0" cellspacing="0" width="600" class="inner-card"
                style="background:#fffbe8;border-radius:20px;padding:24px 0 28px 0;border:1.5px solid #e88b23;box-shadow:0 4px 24px #f59e421a;">
                <tr>
                  <td style="padding:32px 32px 12px 32px;">
                    <h2 style="margin:0 0 8px;color:#ab2208;font-family:serif;font-size:16px;font-weight:800;text-shadow:0 1px 0 #ffdca6;">
                      🙏 Namaste Dear Member,
                    </h2>
                    <p style="margin:0 0 16px;color:#8c4b04;line-height:1.7;font-size:14px;font-family:serif;">
                      We are thrilled to welcome you to the Vedic Vaibhav family. Your spiritual journey begins here, and we are honored to have you with us. Below are your account details:
                    </p>

                    <div style="margin:24px 0 8px;">
                      <h3 style="margin:0;font-size:18px;font-family:serif;color:#bb3d09;font-weight:700;display:inline-block;vertical-align:middle;">🔸 Your Account Details</h3>
                    </div>
                    <table style="width: 100%; border-collapse: collapse; background:#fff3d1;border-radius:8px;">
                      <tbody>
                        <tr>
                          <td style="padding:10px;border:1.2px solid #f5c54d;background:#fff9ed;width:40%;font-weight:600;color:#bb3d09;">User ID</td>
                          <td style="padding:10px;border:1.2px solid #f5c54d;color:#ab2208;">${userId}</td>
                        </tr>
                        <tr>
                          <td style="padding:10px;border:1.2px solid #f5c54d;background:#fff9ed;font-weight:600;color:#bb3d09;">Email</td>
                          <td style="padding:10px;border:1.2px solid #f5c54d;color:#ab2208;">${recipientEmail}</td>
                        </tr>
                      </tbody>
                    </table>

                    <h3 style="margin:24px 0 8px;font-size:16px;color:#111827;">🔸 Get Started with Us</h3>
                    <p style="margin:0 0 16px;color:#374151;line-height:1.6;font-size:14px;">
                      We offer a wide range of services to enrich your spiritual journey. Here are some of the offerings you can explore:
                    </p>
                    <ul>
                      <li>Personalized Pooja Bookings</li>
                      <li>Astrological Consultations</li>
                      <li>Prasad Deliveries</li>
                      <li>And much more!</li>
                    </ul>

                    <div style="text-align: center; margin-top: 40px;">
                      <a href="https://vedicvaibhav.com/" style="background-color: #ff6600; color: #fff; text-decoration: none; padding: 12px 24px; font-size: 16px; border-radius: 8px;">🌐 Visit Our Website 🌐</a>
                    </div>

                    <p style="font-size: 16px; text-align: center; margin-top: 30px;">
                      If you have any questions or need assistance, feel free to reach out to us. We are here to support you on your spiritual journey.
                    </p>

                    <p style="font-size: 16px; text-align: center;">
                      Warm Regards,<br/>
                      <strong>🌿 Team Vedic Vaibhav 🌿</strong>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  const mailOptions: nodemailer.SendMailOptions = {
    from: `"Vedic Vaibhav" <${env.smtp.email}>`,
    to: recipientEmail,
    subject: "🎉 Welcome to Vedic Vaibhav Family! 🎉",
    html: bodyContent,
  };

  try {
    await transporter.sendMail(mailOptions);
    return userId;
  } catch (error) {
    logger.error({ err: error }, `Error sending registration email to ${recipientEmail}`);
    throw error;
  }
};

// 2. Pooja Booking Confirmation Email
const poojaBookingConfirmation = async (
  recipientEmail: string,
  userName: string,
  totalPrice: number,
  bookingDate: string,
  packageName: string,
  mandirName: string,
  mandirImageUrl: string | undefined,
  bhaktaNames: string[] = [],
  gotraNames: string[] = [],
  mobile?: number | string,
  address1?: string,
  address2?: string,
  city?: string,
  state?: string,
  country?: string,
  pincode?: number | string,
  idolDetails?: {
    isIdolAvailable: boolean;
    idolName?: string;
    idolPrice?: number;
    idolDescription?: string;
  },
): Promise<void> => {
  const hasAddress =
    !!(address1 && address1.trim()) ||
    !!(address2 && address2.trim() && address2.trim().toLowerCase() !== "x") ||
    !!(city && city.trim()) ||
    !!(state && state.trim()) ||
    !!(country && country.trim()) ||
    (pincode !== undefined && pincode !== null && String(pincode).trim() !== "");

  const hasMobile = mobile !== undefined && mobile !== null && String(mobile).trim() !== "";
  const hasParticipants = Array.isArray(bhaktaNames) && bhaktaNames.length > 0;
  const hasImage = !!(mandirImageUrl && String(mandirImageUrl).trim());

  // Build participants rows only if we have names
  const participantsTable = hasParticipants
    ? bhaktaNames
        .map((name, index) => {
          const gotra = gotraNames?.[index] ?? "";
          return `
          <tr>
            <td style="padding:10px;border:1px solid #e5e7eb;text-align:left;">${escapeHtml(name)}</td>
            <td style="padding:10px;border:1px solid #e5e7eb;text-align:left;">${escapeHtml(gotra)}</td>
          </tr>`;
        })
        .join("")
    : "";

  // Idol section (only if available)
  const idolSection =
    idolDetails && idolDetails.isIdolAvailable
      ? `
      <h3 style="margin:24px 0 8px;font-size:16px;color:#111827;">Idol Details</h3>
      <table role="presentation" width="100%" style="border-collapse:collapse;">
        <thead>
          <tr>
            <th style="padding:10px;border:1px solid #e5e7eb;background-color:#ff6600;color:#fff;text-align:left;">Idol Name</th>
            <th style="padding:10px;border:1px solid #e5e7eb;background-color:#ff6600;color:#fff;text-align:left;">Price</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding:10px;border:1px solid #e5e7eb;">${escapeHtml(idolDetails.idolName || "")}</td>
            <td style="padding:10px;border:1px solid #e5e7eb;">${inr(idolDetails.idolPrice || 0)}</td>
          </tr>
        </tbody>
      </table>
      ${
        idolDetails.idolDescription
          ? `<p style="margin:8px 0 0;color:#374151;"><strong>Idol Description:</strong> ${escapeHtml(
              idolDetails.idolDescription,
            )}</p>`
          : ""
      }
    `
      : "";

  // Address block (only if something is present)
  const addressBlock = hasAddress
    ? (() => {
        const parts: string[] = [];
        if (address1) parts.push(escapeHtml(address1));
        if (address2 && address2.trim().toLowerCase() !== "x") parts.push(escapeHtml(address2));
        const cityLine = [city, state].filter(Boolean).map(escapeHtml).join(", ");
        if (cityLine) parts.push(cityLine);
        const countryPin = [country ? escapeHtml(country) : "", pincode ? escapeHtml(pincode) : ""]
          .filter(Boolean)
          .join(" - ");
        if (countryPin) parts.push(countryPin);
        return `
          <h3 style="margin:24px 0 8px;font-size:16px;color:#111827;">Delivery Address</h3>
          <p style="margin:0;color:#374151;line-height:1.6;">${parts.join("<br/>")}</p>
        `;
      })()
    : "";

  // Mobile (only if present)
  const mobileLine = hasMobile
    ? `<p style="margin:8px 0 0;color:#374151;"><strong>Mobile:</strong> ${escapeHtml(mobile)}</p>`
    : "";

  // Mandir image (only if provided)
  const mandirImageBlock = hasImage
    ? `
      <h3 style="margin:24px 0 8px;font-size:16px;color:#111827;">Mandir Image</h3>
      <div style="text-align:center;">
        <img src="${escapeHtml(mandirImageUrl)}" alt="${escapeHtml(
        mandirName,
      )}" style="max-width:100%;height:auto;border-radius:8px;border:1px solid #e5e7eb;" />
      </div>
    `
    : "";

  // Participants (only if present)
  const participantsBlock = hasParticipants
    ? `
      <h3 style="margin:24px 0 8px;font-size:16px;color:#111827;">Pooja Participants</h3>
      <table role="presentation" width="100%" style="border-collapse:collapse;">
        <thead>
          <tr>
            <th style="padding:10px;border:1px solid #e5e7eb;background-color:#ff6600;color:#fff;text-align:left;">Person Name(s)</th>
            <th style="padding:10px;border:1px solid #e5e7eb;background-color:#ff6600;color:#fff;text-align:left;">Gotra</th>
          </tr>
        </thead>
        <tbody>
          ${participantsTable}
        </tbody>
      </table>
    `
    : "";

  const bodyContent = `
<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <title>Pooja Booking Confirmed</title>
    <style>
      @media (prefers-color-scheme: dark) {
        body { background-color: #170b04 !important; color: #f8fafc !important; }
        .main-bg { background-color: #221004 !important; }
        .inner-card { background: #2c1206 !important; color: #fff !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background-color:#fff7e6;">
    <!-- Preheader text (hidden in many clients) -->
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      Your pooja booking is confirmed. May divine blessings be upon you and your family.
    </div>

    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" class="main-bg" style="background-color:#fff7e6;padding:24px 0;">
      <tr>
        <td align="center">

          <!-- Auspicious Top Banner -->
          <div style="max-width:600px;margin:0 auto 16px auto;">
            <div style="background:linear-gradient(90deg,#e88b23,#f5c54d,#e88b23);height:8px;border-radius:8px 8px 0 0;"></div>
            <div style="text-align:center;padding:12px 0 8px;">
              <span style="font-size:20px;vertical-align:middle;">🪔</span>
              <span style="font-family:serif;font-size:16px;color:#b45309;font-weight:700;margin-left:8px;letter-spacing:1px;">Pooja Booking Confirmed</span>
              <span style="font-size:20px;vertical-align:middle;">🌸</span>
            </div>
            <div style="height:3px;background:repeating-linear-gradient(90deg,#facc15,#fff7e6 12px);margin:0 18% 0 18%;border-radius:2px;"></div>
          </div>

          <table role="presentation" cellpadding="0" cellspacing="0" width="600" class="inner-card"
            style="background:#fffbe8;border-radius:20px;padding:24px 0 28px 0;border:1.5px solid #e88b23;box-shadow:0 4px 24px #f59e421a;">
            <tr>
              <td style="padding:32px 32px 12px 32px;">
                <h2 style="margin:0 0 8px;color:#ab2208;font-family:serif;font-size:16px;font-weight:800;text-shadow:0 1px 0 #ffdca6;">
                  🙏 Namaste ${escapeHtml(userName)} ji,
                </h2>
                <p style="margin:0 0 16px;color:#8c4b04;line-height:1.7;font-size:14px;font-family:serif;">
                  With reverence and joy, we are honored to confirm your pooja booking with <strong style="color:#d97706;font-family:serif;">Vedic Vaibhav</strong>.<br/>
                  May the divine grace bring peace, prosperity, and auspiciousness to you and your loved ones.
                </p>

                <div style="margin:24px 0 8px;">
                  <h3 style="margin:0;font-size:18px;font-family:serif;color:#bb3d09;font-weight:700;display:inline-block;vertical-align:middle;">🔸 Pooja Details</h3>
                  <span style="margin-left:10px;font-size:15px;color:#ab2208;vertical-align:middle;">| पूजा विवरण</span>
                </div>
                <table role="presentation" width="100%" style="border-collapse:collapse;background:#fff3d1;border-radius:8px;">
                  <tbody>
                    <tr>
                      <td style="padding:10px;border:1.2px solid #f5c54d;background:#fff9ed;width:40%;font-weight:600;color:#bb3d09;">Package</td>
                      <td style="padding:10px;border:1.2px solid #f5c54d;color:#ab2208;">${escapeHtml(packageName)}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px;border:1.2px solid #f5c54d;background:#fff9ed;font-weight:600;color:#bb3d09;">Mandir</td>
                      <td style="padding:10px;border:1.2px solid #f5c54d;color:#ab2208;">${escapeHtml(mandirName)}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px;border:1.2px solid #f5c54d;background:#fff9ed;font-weight:600;color:#bb3d09;">Total Offering</td>
                      <td style="padding:10px;border:1.2px solid #f5c54d;color:#b45309;font-weight:700;">${inr(totalPrice)}</td>
                    </tr>
                    ${
                      bookingDate
                        ? `
                    <tr>
                      <td style="padding:10px;border:1.2px solid #f5c54d;background:#fff9ed;font-weight:600;color:#bb3d09;">Booking Date</td>
                      <td style="padding:10px;border:1.2px solid #f5c54d;color:#ab2208;">${escapeHtml(
                        fmtDate(bookingDate),
                      )}</td>
                    </tr>`
                        : ""
                    }
                  </tbody>
                </table>

                ${mandirImageBlock}
                ${participantsBlock}
                ${idolSection}
                ${addressBlock}
                ${mobileLine}

                <!-- Decorative Divider -->
                <div style="text-align:center;margin:30px 0;">
                  <span style="font-size:22px;color:#d97706;letter-spacing:3px;">ॐ ✦ ॐ ✦ ॐ</span>
                </div>

                <p style="margin:0 0 10px 0;color:#9a3412;font-size:15px;line-height:1.7;font-family:serif;">
                  If you need any assistance or wish to share additional sankalp details, please reply to this email.
                </p>
                <p style="margin:8px 0 0;color:#7c2d12;font-family:serif;">
                  With warm regards,<br/>
                  <strong style="color:#d97706;font-family:serif;">🌿 Team Vedic Vaibhav 🌿</strong>
                </p>
              </td>
            </tr>
          </table>

          <!-- Footer Blessing -->
          <div style="max-width:600px;margin:14px auto 0;text-align:center;color:#c47f07;font-size:14px;font-family:serif;">
            <div style="margin:8px 0 5px 0;font-size:16px;letter-spacing:1px;">
              <span>✨ May Lord bless your family with health, joy &amp; abundance ✨</span>
            </div>
            <div style="font-size:12px;color:#a16207;line-height:1.6;padding:0 8px;">
              This is a confirmation for your pooja booking. If you did not initiate this, please contact our support immediately.
            </div>
            <div style="margin-top:6px;">
              <img src="https://i.imgur.com/xT6S9KJ.png" alt="Mandala Divider" width="58" height="15" style="opacity:.25;" />
            </div>
          </div>
        </td>
      </tr>
    </table>
  </body>
</html>
`;

  const mailOptions: nodemailer.SendMailOptions = {
    from: `"Vedic Vaibhav" <${env.smtp.email}>`,
    to: recipientEmail,
    subject: "🙏 Your Pooja Booking is Confirmed | Vedic Vaibhav",
    html: bodyContent,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    logger.error({ err: error }, "Error sending Pooja Booking Confirmation");
  }
};

// 7. Personalized Pooja Mail
const sendPersonalizedPoojaMail = async (
  recipientEmail: string,
  fullName: string[],
  gotra: string[],
  problemName: string,
  senderEmail: string,
  selectedMandir: string,
  price: number,
  mandirName: string,
): Promise<void> => {
  const participantsTable = fullName
    .map(
      (name, index) => `
      <tr>
          <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${name}</td>
          <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${gotra[index]}</td>
      </tr>
  `,
    )
    .join("");

  const bodyContent = `
        <h2 style="color: #333; text-align: center;">💐 Pooja Request Confirmation 💐</h2>
        <p style="font-size: 16px; text-align: center;">Dear Devotee,</p>
        <p style="font-size: 16px; text-align: center;">We have received your pooja request sent from email: <strong>${senderEmail}</strong>. We will notify you with further details soon.</p>

        <h3>🛕 Participants 🛕</h3>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
            <thead>
                <tr>
                    <th style="padding: 10px; border: 1px solid #ddd; background-color: #ff6600; color: #fff;">👤 Full Name</th>
                    <th style="padding: 10px; border: 1px solid #ddd; background-color: #ff6600; color: #fff;">🏷️ Gotra</th>
                </tr>
            </thead>
            <tbody>
                ${participantsTable}
            </tbody>
        </table>

        <p style="font-size: 16px; text-align: center; margin-top: 20px;">
            Purpose: <strong style="color: #ff6600;">${problemName}</strong>
        </p>
        <p style="font-size: 16px; text-align: center; margin-top: 20px;">
            Mandir: <strong style="color: #ff6600;">${mandirName}</strong>
        </p>
        <p style="font-size: 16px; text-align: center; margin-top: 20px;">
            Package Price: <strong style="color: #ff6600;">${price}</strong>
        </p>

        <p style="font-size: 16px; text-align: center;">
            We are honored to assist you in your spiritual journey. We will update you soon regarding your pooja booking. You can view the pooja details in your profile section on our website.
        </p>

        <div style="text-align: center; margin-top: 40px;">
            <a href="https://vedicvaibhav.com/" style="background-color: #ff6600; color: #fff; text-decoration: none; padding: 12px 24px; font-size: 16px; border-radius: 8px;">🌐 Visit Our Website 🌐</a>
        </div>

        <p style="font-size: 16px; text-align: center;">
            If you have any questions or need assistance, feel free to reach out to us. We are here to support you on your spiritual journey.
        </p>

        <p style="font-size: 16px; text-align: center;">
            Warm Regards,<br/>
            <strong>🌿 Team Vedic Vaibhav 🌿</strong>
        </p>
    `;

  const mailOptions: nodemailer.SendMailOptions = {
    from: `"Vedic Vaibhav" <${env.smtp.email}>`,
    to: recipientEmail,
    subject: "💐 Vedic Vaibhav: Pooja Request Confirmation 🌟",
    html: bodyContent,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    logger.error({ err: error }, "Error sending personalized pooja email");
  }
};

interface PanditWelcomeDetails {
  recipientEmail: string;
  prefix: string;
  firstName: string;
  lastName: string;
  mobile: string;
  city: string;
  state: string;
  country: string;
}

const sendPanditRegistrationWelcomeMail = async (details: PanditWelcomeDetails): Promise<void> => {
  const { recipientEmail, prefix, firstName, lastName, mobile, city, state, country } = details;

  const bodyContent = `
    <!doctype html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <title>Welcome to PanditjiAtRequest</title>
        <style>
          @media (prefers-color-scheme: dark) {
            body { background-color: #170b04 !important; color: #f8fafc !important; }
            .main-bg { background-color: #221004 !important; }
            .inner-card { background: #2c1206 !important; color: #fff !important; }
          }
        </style>
      </head>
      <body style="margin:0;padding:0;background-color:#fff7e6;">
        <!-- Preheader text (hidden in many clients) -->
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
          Welcome to PanditjiAtRequest! We are thrilled to have you join our family.
        </div>

        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" class="main-bg" style="background-color:#fff7e6;padding:24px 0;">
          <tr>
            <td align="center">
              <!-- Auspicious Top Banner -->
              <div style="max-width:600px;margin:0 auto 16px auto;">
                <div style="background:linear-gradient(90deg,#e88b23,#f5c54d,#e88b23);height:8px;border-radius:8px 8px 0 0;"></div>
                <div style="text-align:center;padding:12px 0 8px;">
                  <span style="font-size:20px;vertical-align:middle;">🙏</span>
                  <span style="font-family:serif;font-size:16px;color:#b45309;font-weight:700;margin-left:8px;letter-spacing:1px;">Welcome to PanditjiAtRequest!</span>
                  <span style="font-size:20px;vertical-align:middle;">🌿</span>
                </div>
                <div style="height:3px;background:repeating-linear-gradient(90deg,#facc15,#fff7e6 12px);margin:0 18% 0 18%;border-radius:2px;"></div>
              </div>

              <table role="presentation" cellpadding="0" cellspacing="0" width="600" class="inner-card"
                style="background:#fffbe8;border-radius:20px;padding:24px 0 28px 0;border:1.5px solid #e88b23;box-shadow:0 4px 24px #f59e421a;">
                <tr>
                  <td style="padding:32px 32px 12px 32px;">
                    <h2 style="margin:0 0 8px;color:#ab2208;font-family:serif;font-size:16px;font-weight:800;text-shadow:0 1px 0 #ffdca6;">
                      🙏 Namaste ${prefix} ${firstName} ${lastName},
                    </h2>
                    <p style="margin:0 0 16px;color:#8c4b04;line-height:1.7;font-size:14px;font-family:serif;">
                      Thank you for registering as a Pandit with PanditjiAtRequest! We are thrilled to have you as part of our network. Our team will reach out to you shortly to discuss the next steps and complete your profile.
                    </p>

                    <div style="margin:24px 0 8px;">
                      <h3 style="margin:0;font-size:18px;font-family:serif;color:#bb3d09;font-weight:700;display:inline-block;vertical-align:middle;">👤 Your Details</h3>
                    </div>
                    <table style="width: 100%; border-collapse: collapse; background:#fff3d1;border-radius:8px;">
                      <tbody>
                        <tr>
                          <td style="padding:10px;border:1.2px solid #f5c54d;background:#fff9ed;width:40%;font-weight:600;color:#bb3d09;">Full Name</td>
                          <td style="padding:10px;border:1.2px solid #f5c54d;color:#ab2208;">${prefix} ${firstName} ${lastName}</td>
                        </tr>
                        <tr>
                          <td style="padding:10px;border:1.2px solid #f5c54d;background:#fff9ed;font-weight:600;color:#bb3d09;">Mobile</td>
                          <td style="padding:10px;border:1.2px solid #f5c54d;color:#ab2208;">${mobile}</td>
                        </tr>
                        <tr>
                          <td style="padding:10px;border:1.2px solid #f5c54d;background:#fff9ed;font-weight:600;color:#bb3d09;">City</td>
                          <td style="padding:10px;border:1.2px solid #f5c54d;color:#ab2208;">${city}</td>
                        </tr>
                        <tr>
                          <td style="padding:10px;border:1.2px solid #f5c54d;background:#fff9ed;font-weight:600;color:#bb3d09;">State</td>
                          <td style="padding:10px;border:1.2px solid #f5c54d;color:#ab2208;">${state}</td>
                        </tr>
                        <tr>
                          <td style="padding:10px;border:1.2px solid #f5c54d;background:#fff9ed;font-weight:600;color:#bb3d09;">Country</td>
                          <td style="padding:10px;border:1.2px solid #f5c54d;color:#ab2208;">${country}</td>
                        </tr>
                      </tbody>
                    </table>

                    <p style="font-size: 16px; text-align: center; margin-top: 20px;">
                      We are honored to have you join our platform and serve devotees around the world. Our team will be in touch soon for further onboarding steps.
                    </p>

                    <p style="font-size: 16px; text-align: center; margin-top: 20px;">
                      If you have any questions or need assistance, feel free to reply to this email. We are here to support you.
                    </p>

                    <div style="text-align: center; margin-top: 40px;">
                      <a href="https://vedicvaibhav.com/" style="background-color: #ff6600; color: #fff; text-decoration: none; padding: 12px 24px; font-size: 16px; border-radius: 8px;">🌐 Visit Our Website 🌐</a>
                    </div>

                    <p style="font-size: 16px; text-align: center;">
                      Warm Regards,<br/>
                      <strong>🌿 Team PanditjiAtRequest 🌿</strong>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  const mailOptions: nodemailer.SendMailOptions = {
    from: `"PanditjiAtRequest" <${env.smtp.email}>`,
    to: recipientEmail,
    subject: "🙏 Welcome to PanditjiAtRequest!",
    html: bodyContent,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    logger.error({ err: error }, "Error sending Pandit welcome email");
  }
};

/** Structural shape of the chadhava booking fields rendered in the user confirmation mail. */
export interface ChadhavaUserEmailBooking {
  name?: string;
  paymentDetails: { orderID?: string | number; totalPrice?: number };
  /** Presentment fields from the booking record. A receipt must be shown in the
   *  currency the devotee ACTUALLY PAID IN — see lib/receiptMoney.ts. */
  currency?: string | null;
  chargedAmount?: number | null;
  fxRate?: number | null;
  priceMultiplier?: number | null;
  chadhavaDetails: { title?: string; temple?: string; date?: string };
  offerings?: { name: string; price: number; quantity: number }[];
  prasadDetails?: {
    name?: string;
    price?: number;
    whatsapp?: string | number;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      postal?: string | number;
      email?: string;
    };
  } | null;
}

/** Any mongoose document (or plain wrapper) whose `toObject()` yields the email fields. */
export interface ChadhavaUserEmailBookingDoc {
  toObject(): ChadhavaUserEmailBooking;
}

export const sendChadhavaConfirmationToUser = async (bookingDoc: ChadhavaUserEmailBookingDoc): Promise<void> => {
  const booking = bookingDoc.toObject();
  const { name, paymentDetails, chadhavaDetails, offerings, prasadDetails } = booking;

  /**
   * Offerings and prasad are stored at their INDIA LIST price, while
   * paymentDetails.totalPrice is stored already marked up. money.item() applies
   * the record's own multiplier so the rows still add up to the total the
   * devotee was charged, instead of falling short by the whole markup.
   */
  const money = receiptMoney(booking, paymentDetails?.totalPrice);

  // Offerings Table
  const offeringsRows = Array.isArray(offerings)
    ? offerings
        .map(
          (o) => `
          <tr>
            <td style="padding:10px;border:1px solid #e5e7eb;">${escapeHtml(o.name)}</td>
            <td style="padding:10px;border:1px solid #e5e7eb;text-align:center;">${escapeHtml(o.quantity)}</td>
            <td style="padding:10px;border:1px solid #e5e7eb;text-align:right;">${money.item(o.price * o.quantity)}</td>
          </tr>`,
        )
        .join("")
    : "";

  // Prasad row if present
  const prasadRow =
    prasadDetails && prasadDetails.price
      ? `<tr>
          <td style="padding:10px;border:1px solid #e5e7eb;">${escapeHtml(prasadDetails.name)}</td>
          <td style="padding:10px;border:1px solid #e5e7eb;text-align:center;">1</td>
          <td style="padding:10px;border:1px solid #e5e7eb;text-align:right;">${money.item(prasadDetails.price)}</td>
        </tr>`
      : "";

  // Address block if prasad is present and has address
  const prasadAddressBlock =
    prasadDetails && prasadDetails.address
      ? (() => {
          const ad = prasadDetails.address;
          const parts: string[] = [];
          if (ad.street) parts.push(escapeHtml(ad.street));
          if (ad.city) parts.push(escapeHtml(ad.city));
          if (ad.state) parts.push(escapeHtml(ad.state));
          if (ad.postal) parts.push(`Pin: ${escapeHtml(ad.postal)}`);
          return `
            <h3 style="margin:24px 0 8px;font-size:16px;color:#111827;">Prasad Delivery Address</h3>
            <p style="margin:0;color:#374151;line-height:1.6;">${parts.join(", ")}</p>
          `;
        })()
      : "";

  // WhatsApp block if prasadDetails.whatsapp
  const whatsappBlock =
    prasadDetails && prasadDetails.whatsapp
      ? `<p style="margin:8px 0 0;color:#374151;"><strong>WhatsApp Number:</strong> ${escapeHtml(
          prasadDetails.whatsapp,
        )}</p>`
      : "";

  const bodyContent = `
<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <title>Chadhava Booking Confirmed</title>
    <style>
      @media (prefers-color-scheme: dark) {
        body { background-color: #170b04 !important; color: #f8fafc !important; }
        .main-bg { background-color: #221004 !important; }
        .inner-card { background: #2c1206 !important; color: #fff !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background-color:#fff7e6;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      Your chadhava booking is confirmed. May divine blessings be upon you and your family.
    </div>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" class="main-bg" style="background-color:#fff7e6;padding:24px 0;">
      <tr>
        <td align="center">
          <!-- Auspicious Top Banner -->
          <div style="max-width:600px;margin:0 auto 16px auto;">
            <div style="background:linear-gradient(90deg,#e88b23,#f5c54d,#e88b23);height:8px;border-radius:8px 8px 0 0;"></div>
            <div style="text-align:center;padding:12px 0 8px;">
              <span style="font-size:18px;vertical-align:middle;">🌺</span>
              <span style="font-family:serif;font-size:26px;color:#b45309;font-weight:700;margin-left:8px;letter-spacing:1px;">Chadhava Confirmation</span>
              <span style="font-size:18px;vertical-align:middle;">🪔</span>
            </div>
            <div style="height:3px;background:repeating-linear-gradient(90deg,#facc15,#fff7e6 12px);margin:0 18% 0 18%;border-radius:2px;"></div>
          </div>
          <table role="presentation" cellpadding="0" cellspacing="0" width="600" class="inner-card"
            style="background:#fffbe8;border-radius:20px;padding:24px 0 28px 0;border:1.5px solid #e88b23;box-shadow:0 4px 24px #f59e421a;">
            <tr>
              <td style="padding:32px 32px 12px 32px;">
                <h2 style="margin:0 0 8px;color:#ab2208;font-family:serif;font-size:14px;font-weight:800;text-shadow:0 1px 0 #ffdca6;">
                  🙏 Namaste ${escapeHtml(name)} ji,
                </h2>
                <p style="margin:0 0 16px;color:#8c4b04;line-height:1.7;font-size:12px;font-family:serif;">
                  We are delighted to confirm your <strong>Chadhava</strong> for <strong style="color:#d97706;font-family:serif;">${escapeHtml(
                    chadhavaDetails.title,
                  )}</strong> at <strong>${escapeHtml(chadhavaDetails.temple)}</strong>.<br/>
                  May divine grace bring joy, prosperity, and fulfillment to your home.
                </p>

                <div style="margin:24px 0 8px;">
                  <h3 style="margin:0;font-size:18px;font-family:serif;color:#bb3d09;font-weight:700;display:inline-block;vertical-align:middle;">🔸 Chadhava Details</h3>
                  <span style="margin-left:10px;font-size:15px;color:#ab2208;vertical-align:middle;">| चढ़ावा विवरण</span>
                </div>
                <table role="presentation" width="100%" style="border-collapse:collapse;background:#fff3d1;border-radius:8px;">
                  <tbody>
                    <tr>
                      <td style="padding:10px;border:1.2px solid #f5c54d;background:#fff9ed;width:40%;font-weight:600;color:#bb3d09;">Chadhava Name</td>
                      <td style="padding:10px;border:1.2px solid #f5c54d;color:#ab2208;">${escapeHtml(
                        chadhavaDetails.title,
                      )}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px;border:1.2px solid #f5c54d;background:#fff9ed;font-weight:600;color:#bb3d09;">Temple</td>
                      <td style="padding:10px;border:1.2px solid #f5c54d;color:#ab2208;">${escapeHtml(
                        chadhavaDetails.temple,
                      )}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px;border:1.2px solid #f5c54d;background:#fff9ed;font-weight:600;color:#bb3d09;">Booking Date</td>
                      <td style="padding:10px;border:1.2px solid #f5c54d;color:#ab2208;">${escapeHtml(
                        fmtDate(chadhavaDetails.date),
                      )}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px;border:1.2px solid #f5c54d;background:#fff9ed;font-weight:600;color:#bb3d09;">Order ID</td>
                      <td style="padding:10px;border:1.2px solid #f5c54d;color:#ab2208;">${escapeHtml(
                        paymentDetails.orderID,
                      )}</td>
                    </tr>
                  </tbody>
                </table>

                <h3 style="margin:24px 0 8px;font-size:16px;color:#111827;">Offerings Details</h3>
                <table role="presentation" width="100%" style="border-collapse:collapse;">
                  <thead>
                    <tr>
                      <th style="padding:10px;border:1px solid #e5e7eb;background-color:#ff6600;color:#fff;text-align:left;">Item</th>
                      <th style="padding:10px;border:1px solid #e5e7eb;background-color:#ff6600;color:#fff;text-align:center;">Quantity</th>
                      <th style="padding:10px;border:1px solid #e5e7eb;background-color:#ff6600;color:#fff;text-align:right;">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${offeringsRows}
                    ${prasadRow}
                  </tbody>
                </table>

                <p style="margin:18px 0 0;font-size:15px;color:#ab2208;"><strong>Total Amount Paid:</strong> <span style="color:#b45309;font-weight:700;">${money.total(
                  Number(paymentDetails.totalPrice) || 0,
                )}</span></p>
                ${
                  money.isBase
                    ? ""
                    : `<p style="margin:6px 0 0;font-size:12px;color:#6b7280;">${receiptCurrencyNote(
                        booking,
                        paymentDetails?.totalPrice,
                      )}</p>`
                }

                ${prasadAddressBlock}
                ${whatsappBlock}

                <div style="text-align:center;margin:30px 0;">
                  <span style="font-size:22px;color:#d97706;letter-spacing:3px;">ॐ ✦ ॐ ✦ ॐ</span>
                </div>

                <p style="margin:0 0 10px 0;color:#9a3412;font-size:15px;line-height:1.7;font-family:serif;">
                  We will send a video of your Chadhava to your WhatsApp number. For any queries, feel free to reply to this email.
                </p>
                <p style="margin:8px 0 0;color:#7c2d12;font-family:serif;">
                  With warm regards,<br/>
                  <strong style="color:#d97706;font-family:serif;">🌿 Team Vedic Vaibhav 🌿</strong>
                </p>
              </td>
            </tr>
          </table>
          <!-- Footer Blessing -->
          <div style="max-width:600px;margin:14px auto 0;text-align:center;color:#c47f07;font-size:14px;font-family:serif;">
            <div style="margin:8px 0 5px 0;font-size:16px;letter-spacing:1px;">
              <span>✨ May Lord bless your family with health, joy &amp; abundance ✨</span>
            </div>
            <div style="font-size:12px;color:#a16207;line-height:1.6;padding:0 8px;">
              This is a confirmation for your Chadhava booking. If you did not initiate this, please contact our support immediately.
            </div>
            <div style="margin-top:6px;">
              <img src="https://i.imgur.com/xT6S9KJ.png" alt="Mandala Divider" width="58" height="15" style="opacity:.25;" />
            </div>
          </div>
        </td>
      </tr>
    </table>
  </body>
</html>
`;

  const userEmail = prasadDetails?.address?.email || env.smtp.adminEmail;

  const mailOptions: nodemailer.SendMailOptions = {
    from: `"Vedic Vaibhav" <${env.smtp.fromEmail}>`,
    to: userEmail,
    subject: `🙏 Your Chadhava Booking is Confirmed | Vedic Vaibhav`,
    html: bodyContent,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    logger.error({ err: error }, `Error sending user email for order ${paymentDetails.orderID}`);
  }
};

export interface GauSevaEmailPayload {
  devoteeName: string;
  bookingId: string;
  packageName: string;
  packagePrice: number;
  quantity: number;
  totalAmount: number;
  whatsapp: string;
  email?: string;
  gotra?: string;
  occasion?: string;
  specialMessage?: string;
  paidAt?: Date;
  /** Presentment fields from the booking record. A receipt must be shown in the
   *  currency the devotee ACTUALLY PAID IN — see lib/receiptMoney.ts. */
  currency?: string | null;
  chargedAmount?: number | null;
  fxRate?: number | null;
  priceMultiplier?: number | null;
}

export const sendGauSevaConfirmationEmail = async (payload: GauSevaEmailPayload): Promise<void> => {
  const {
    devoteeName,
    bookingId,
    packageName,
    packagePrice,
    quantity,
    totalAmount,
    whatsapp,
    email,
    gotra,
    occasion,
    specialMessage,
    paidAt,
  } = payload;

  const recipientEmail = email || env.smtp.adminEmail;
  if (!recipientEmail) return;

  const esc = escapeHtml;

  // packagePrice is the India list price per seva; totalAmount is the INR value
  // of the sale, already marked up. money.item()/money.total() present both in
  // the currency the card was actually billed in — replacing the rupee-only
  // formatter this used to carry.
  const money = receiptMoney(payload, totalAmount);

  const fmtPaidDate = (d?: Date): string => {
    if (!d) return new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
    return new Date(d).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  };

  const optionalRow = (label: string, value?: string): string =>
    value
      ? `<tr>
          <td style="padding:8px 12px;font-weight:600;color:#92400e;width:38%;border-bottom:1px solid #fde68a;">${esc(label)}</td>
          <td style="padding:8px 12px;color:#1f2937;border-bottom:1px solid #fde68a;">${esc(value)}</td>
        </tr>`
      : "";

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Gau Seva Booking Confirmed</title>
</head>
<body style="margin:0;padding:0;background-color:#fff8f0;font-family:'Segoe UI',Arial,sans-serif;">

  <!-- Preheader -->
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;">
    Your Gau Seva booking is confirmed. Gau Mata Ki Jai! 🐄🙏
  </span>

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff8f0;padding:30px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(249,115,22,0.10);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#f97316 0%,#d97706 100%);padding:36px 32px;text-align:center;">
              <div style="font-size:52px;margin-bottom:8px;">🐄</div>
              <h1 style="margin:0;font-size:26px;font-weight:800;color:#ffffff;letter-spacing:0.5px;">Gau Seva Confirmed!</h1>
              <p style="margin:8px 0 0;color:#fef3c7;font-size:15px;font-style:italic;">
                गौ माता की कृपा आप पर सदा बनी रहे 🙏
              </p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding:28px 32px 0;">
              <p style="margin:0;font-size:16px;color:#374151;line-height:1.7;">
                Dear <strong style="color:#92400e;">${esc(devoteeName)}</strong>,<br/><br/>
                Thank you for your devotion! Your <strong>${esc(packageName)}</strong> has been successfully booked.
                Our seva team will feed Gau Mata in your name and send you photo/video proof on WhatsApp within <strong>6 hours</strong>.
              </p>
            </td>
          </tr>

          <!-- Booking Details Card -->
          <tr>
            <td style="padding:24px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:12px;overflow:hidden;border:1px solid #fde68a;">
                <tr>
                  <td colspan="2" style="background:#fef3c7;padding:12px 16px;font-weight:700;font-size:13px;color:#92400e;letter-spacing:0.8px;text-transform:uppercase;">
                    📋 Booking Summary
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 12px;font-weight:600;color:#92400e;width:38%;border-bottom:1px solid #fde68a;">Booking ID</td>
                  <td style="padding:10px 12px;color:#1f2937;border-bottom:1px solid #fde68a;font-family:monospace;font-size:13px;">${esc(bookingId)}</td>
                </tr>
                <tr>
                  <td style="padding:10px 12px;font-weight:600;color:#92400e;width:38%;border-bottom:1px solid #fde68a;">Package</td>
                  <td style="padding:10px 12px;color:#1f2937;border-bottom:1px solid #fde68a;">${esc(packageName)}</td>
                </tr>
                <tr>
                  <td style="padding:10px 12px;font-weight:600;color:#92400e;width:38%;border-bottom:1px solid #fde68a;">Quantity</td>
                  <td style="padding:10px 12px;color:#1f2937;border-bottom:1px solid #fde68a;">${quantity} seva${quantity > 1 ? "s" : ""} × ${money.item(packagePrice)}</td>
                </tr>
                <tr>
                  <td style="padding:10px 12px;font-weight:600;color:#92400e;width:38%;border-bottom:1px solid #fde68a;">Amount Paid</td>
                  <td style="padding:10px 12px;font-weight:700;font-size:16px;color:#15803d;border-bottom:1px solid #fde68a;">${money.total(totalAmount)}</td>
                </tr>
                <tr>
                  <td style="padding:10px 12px;font-weight:600;color:#92400e;width:38%;border-bottom:1px solid #fde68a;">WhatsApp</td>
                  <td style="padding:10px 12px;color:#1f2937;border-bottom:1px solid #fde68a;">+91 ${esc(whatsapp)}</td>
                </tr>
                <tr>
                  <td style="padding:10px 12px;font-weight:600;color:#92400e;width:38%;border-bottom:1px solid #fde68a;">Booked On</td>
                  <td style="padding:10px 12px;color:#1f2937;border-bottom:1px solid #fde68a;">${fmtPaidDate(paidAt)}</td>
                </tr>
                ${optionalRow("Gotra", gotra)}
                ${optionalRow("Occasion", occasion)}
                ${optionalRow("Special Message", specialMessage)}
              </table>
            </td>
          </tr>

          <!-- What happens next -->
          <tr>
            <td style="padding:0 32px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-radius:12px;border:1px solid #bbf7d0;overflow:hidden;">
                <tr>
                  <td style="padding:14px 16px;font-weight:700;font-size:13px;color:#15803d;letter-spacing:0.8px;text-transform:uppercase;border-bottom:1px solid #bbf7d0;">
                    ✅ What Happens Next
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 16px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:5px 0;color:#166534;font-size:14px;">📸 &nbsp;Photo/video proof sent to your WhatsApp within <strong>6 hours</strong></td>
                      </tr>
                      <tr>
                        <td style="padding:5px 0;color:#166534;font-size:14px;">🌾 &nbsp;Our seva team feeds Gau Mata with your name on the grass bundle</td>
                      </tr>
                      <tr>
                        <td style="padding:5px 0;color:#166534;font-size:14px;">📜 &nbsp;Your e-certificate will be prepared and delivered digitally</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Support -->
          <tr>
            <td style="padding:0 32px 28px;text-align:center;">
              <p style="margin:0 0 6px;font-size:13px;color:#6b7280;">
                Need help? Reach us at
                <a href="mailto:support@vedicvaibhav.com" style="color:#d97706;font-weight:600;text-decoration:none;">support@vedicvaibhav.com</a>
              </p>
              <p style="margin:0;font-size:13px;color:#6b7280;">Or WhatsApp us directly on the same number you registered with.</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:linear-gradient(135deg,#fef3c7,#fff7e6);padding:20px 32px;text-align:center;border-top:1px solid #fde68a;">
              <p style="margin:0 0 4px;font-size:13px;color:#92400e;font-style:italic;">
                🙏 Gau Mata Ki Jai! Thank you for your seva.
              </p>
              <p style="margin:0;font-size:12px;color:#a16207;">
                With blessings, <strong>Team Vedic Vaibhav</strong> — <a href="https://vedicvaibhav.com" style="color:#d97706;text-decoration:none;">vedicvaibhav.com</a>
              </p>
              <div style="margin-top:10px;font-size:11px;color:#d1d5db;">
                This is an automated confirmation. If you did not make this booking, please contact support@vedicvaibhav.com immediately.
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const mailOptions: nodemailer.SendMailOptions = {
    from: `"Vedic Vaibhav Gaushala" <support@vedicvaibhav.com>`,
    to: recipientEmail,
    subject: `🐄 Gau Seva Confirmed — ${packageName} | Booking ${bookingId}`,
    html,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    logger.error({ err: error }, `[GauSeva] Email failed for ${bookingId}`);
  }
};

export {
  registerationMail,
  poojaBookingConfirmation,
  prasadBookingConfirmation,
  sendPersonalizedPoojaMail,
  sendPanditRegistrationWelcomeMail,
};
