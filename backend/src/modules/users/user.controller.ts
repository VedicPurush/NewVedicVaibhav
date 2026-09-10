import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import axios from "axios";
import type { HydratedDocument, Types } from "mongoose";

import { env } from "../../config/env";
import { logger } from "../../lib/logger";
import { ApiError } from "../../lib/apiError";
import { generateOtp, getExpiry } from "../../utils/otp";
import { sendContactUsMailVedicVaibhavMain } from "../../utils/mail/contactUsSmtp";
import { User, type IUser } from "./user.model";
import { DeletionLog } from "./userDelLog.model";

const JWT_SECRET = env.jwt.secret;
const JWT_EXPIRES_IN = env.jwt.expiresIn as SignOptions["expiresIn"];

type LeanUser = IUser & { _id: Types.ObjectId };

/** Normalizers */
const normalizePhone = (raw: string | undefined | null): string | null => {
  if (!raw) return null;
  const digits = (raw.match(/\d/g) || []).join("");
  if (digits.length < 10) return null;
  const last10 = digits.slice(-10);
  return `+91 ${last10}`;
};

const normalizeEmail = (raw: string | undefined | null): string | null =>
  raw ? String(raw).trim().toLowerCase() : null;

const signUserToken = (userId: string): string =>
  jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

const stripOtpFields = (user: Record<string, unknown>): void => {
  delete user.otp;
  delete user.otpExpiry;
};

/**
 * Merge helper: moves/merges a duplicate user (duplicateId) into the primary
 * (primaryId), preferring non-empty / longer values, then removes the duplicate.
 */
async function mergeUsers(primaryId: string, duplicateId: string): Promise<LeanUser | null> {
  if (primaryId === duplicateId) {
    return User.findById(primaryId).lean<LeanUser>();
  }

  const [primaryDoc, dupDoc] = await Promise.all([User.findById(primaryId), User.findById(duplicateId)]);
  if (!dupDoc && primaryDoc) return primaryDoc.toObject() as LeanUser;
  if (!primaryDoc && dupDoc) return dupDoc.toObject() as LeanUser; // edge case: primary missing
  if (!primaryDoc || !dupDoc) return null;

  const primary = primaryDoc;
  const dup = dupDoc;

  const choose = (a: string | undefined, b: string | undefined): string | undefined => {
    if (b && !a) return b;
    if (typeof a === "string" && typeof b === "string" && b.length > a.length) return b;
    return a;
  };

  primary.name = choose(primary.name, dup.name) ?? primary.name;
  primary.email = choose(primary.email, dup.email) ?? primary.email;
  primary.phone = choose(primary.phone, dup.phone) ?? primary.phone;
  primary.given_name = choose(primary.given_name, dup.given_name) ?? primary.given_name;
  primary.family_name = choose(primary.family_name, dup.family_name) ?? primary.family_name;
  primary.picture = choose(primary.picture, dup.picture) ?? primary.picture;
  primary.email_verified = primary.email_verified || dup.email_verified;
  primary.isActive = primary.isActive || dup.isActive;

  await primary.save();
  await User.deleteOne({ _id: dup._id });

  return primary.toObject() as LeanUser;
}

/** UPDATE PROFILE */
export const updateUserProfile = async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.params;
  const { phone, gender, firstname, lastname, dob, birthTime, gotra, address } = req.body || {};

  const updates: Record<string, unknown> = {};

  if (typeof gender === "string" && gender.trim()) updates.gender = gender.trim();

  if (typeof firstname === "string") {
    const v = firstname.trim();
    updates.given_name = v;
    updates.firstname = v;
  }

  if (typeof lastname === "string") {
    const v = lastname.trim();
    updates.family_name = v;
    updates.lastname = v;
  }

  if (typeof phone === "string") {
    const normalized = normalizePhone(phone);
    if (!normalized) throw ApiError.badRequest("phone must contain 10 digits");

    // Check uniqueness to avoid conflicts
    const exists = await User.findOne({ phone: normalized, _id: { $ne: userId } }).lean();
    if (exists) throw ApiError.conflict("Phone already used by another account");
    updates.phone = normalized;
  }

  if (typeof dob === "string" && dob.trim()) updates.dob = dob.trim();
  if (typeof birthTime === "string" && birthTime.trim()) updates.birthTime = birthTime.trim();
  if (typeof gotra === "string" && gotra.trim()) updates.gotra = gotra.trim();
  if (typeof address === "string" && address.trim()) updates.address = address.trim();

  // Granular address fields
  const { address1, address2, city, state, country, pincode } = req.body;
  if (typeof address1 === "string") updates.address1 = address1.trim();
  if (typeof address2 === "string") updates.address2 = address2.trim();
  if (typeof city === "string") updates.city = city.trim();
  if (typeof state === "string") updates.state = state.trim();
  if (typeof country === "string") updates.country = country.trim();
  if (typeof pincode === "string") updates.pincode = pincode.trim();

  // Set isUpdated to true when profile is updated
  updates.isUpdated = true;

  const user = await User.findByIdAndUpdate(userId, { $set: updates }, { new: true }).lean();
  if (!user) throw ApiError.notFound("User not found");

  res.status(200).json({ message: "Profile updated", user });
};

/** LOOKUPS */
export const getUserByUserId = async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.params;
  if (!userId) throw ApiError.badRequest("userId is required");
  const user = await User.findById(userId).lean();
  if (!user) throw ApiError.notFound("User not found");
  res.status(200).json({ user });
};

export const getUserByEmail = async (req: Request, res: Response): Promise<void> => {
  const email = normalizeEmail(String(req.params.email ?? ""));
  if (!email) throw ApiError.badRequest("email is required");
  const user = await User.findOne({ email }).lean();
  if (!user) throw ApiError.notFound("User not found");
  res.status(200).json({ user });
};

export const getUserByPhone = async (req: Request, res: Response): Promise<void> => {
  const normalized = normalizePhone(String(req.params.phone ?? ""));
  if (!normalized) throw ApiError.badRequest("phone is required and must contain 10 digits");
  const user = await User.findOne({ phone: normalized }).lean();
  if (!user) throw ApiError.notFound("User not found");
  res.status(200).json({ user });
};

/** OTP SEND — stores the normalized phone, sends SMS to the 10-digit number. */
export const sendOtp = async (req: Request, res: Response): Promise<void> => {
  const rawPhone = String(req.body.phone || "");
  const digits = (rawPhone.match(/\d/g) || []).join("");
  if (digits.length !== 10) throw ApiError.badRequest("Invalid phone number");
  const normalized = normalizePhone(digits);

  const { isNotifyOkay } = req.body;
  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, 10);
  const otpExpiry = getExpiry(5); // minutes

  let user: HydratedDocument<IUser> | null = await User.findOne({ phone: normalized });
  if (!user) {
    user = new User({
      phone: normalized,
      isFromApp: false,
      isNotifyOkay: !!isNotifyOkay,
      name: "",
      email: undefined,
      email_verified: false,
      isActive: true,
      addedOn: new Date(),
    });
  } else {
    user.isNotifyOkay = !!isNotifyOkay;
  }

  user.otp = otpHash;
  user.otpExpiry = otpExpiry;
  await user.save();

  const url =
    `https://www.fast2sms.com/dev/bulkV2?authorization=${env.fast2sms.apiKey}` +
    `&route=dlt&sender_id=${env.fast2sms.senderId}&message=${env.fast2sms.templateId}` +
    `&variables_values=${otp}|1&flash=0&numbers=${digits}`; // send to 10-digit

  await axios.get(url);
  res.status(200).json({ message: "OTP sent successfully" });
};

export const verifyOtp = async (req: Request, res: Response): Promise<void> => {
  const rawPhone = String(req.body.phone || "");
  const digits = (rawPhone.match(/\d/g) || []).join("");
  if (digits.length !== 10) throw ApiError.badRequest("Phone and OTP required");

  const phone = normalizePhone(digits) as string;
  const { otp } = req.body;

  const user = await User.findOne({ phone });
  if (!user || !user.otp || !user.otpExpiry) {
    throw ApiError.badRequest("OTP not requested");
  }
  if (user.otpExpiry < new Date()) {
    throw ApiError.badRequest("OTP expired");
  }
  const isMatch = await bcrypt.compare(otp, user.otp);
  if (!isMatch) {
    throw ApiError.badRequest("Incorrect OTP");
  }

  user.otp = undefined;
  user.otpExpiry = undefined;
  await user.save();

  const token = signUserToken(user._id.toString());

  const lean = user.toObject() as unknown as Record<string, unknown>;
  stripOtpFields(lean);

  res.status(200).json({ token, user: lean });
};

/**
 * loginOrRegister (used by checkout, etc.)
 * - Normalizes phone/email
 * - Finds candidates by phone/email; merges duplicates into a single primary
 * - Upserts/refreshes the primary user
 * - Returns { token, user } with a real _id
 */
export const loginOrRegister = async (req: Request, res: Response): Promise<void> => {
  const { phone, name, email, optIn, gotra, familyMembers, address, address1, address2, city, state, country, pincode } =
    req.body as {
      phone?: string;
      name?: string;
      email?: string;
      optIn?: boolean;
      gotra?: string;
      familyMembers?: string[];
      address?: string;
      address1?: string;
      address2?: string;
      city?: string;
      state?: string;
      country?: string;
      pincode?: string;
    };

  const normalizedPhone = normalizePhone(phone || "");
  const normalizedEmail = normalizeEmail(email || "");

  if (!normalizedPhone && !normalizedEmail) {
    throw ApiError.badRequest("Phone or email is required");
  }

  try {
    // A) Locate existing accounts by phone / email
    const query: Record<string, string>[] = [];
    if (normalizedPhone) query.push({ phone: normalizedPhone });
    if (normalizedEmail) query.push({ email: normalizedEmail });

    const candidates = query.length ? await User.find({ $or: query }).lean<LeanUser[]>() : [];

    let primary: LeanUser | null =
      (normalizedPhone && candidates.find((u) => u.phone === normalizedPhone)) ||
      (normalizedEmail && candidates.find((u) => u.email === normalizedEmail)) ||
      candidates[0] ||
      null;

    // B) Merge duplicates
    if (candidates.length > 1) {
      for (const c of candidates) {
        if (!primary || String(c._id) === String(primary._id)) continue;
        primary = await mergeUsers(String(primary._id), String(c._id));
      }
    }

    const now = new Date();

    // C) Upsert the user
    const updates: Record<string, unknown> = {
      ...(optIn !== undefined ? { communicationOptIn: Boolean(optIn) } : {}),
      lastLoginAt: now,
      isActive: true,
    };

    // Split name into first and last name if provided
    if (name) {
      const parts = name.trim().split(/\s+/);
      if (parts.length > 0) {
        updates.given_name = parts[0];
        updates.family_name = parts.length > 1 ? parts.slice(1).join(" ") : "";
      }
    }

    if (gotra) updates.gotra = gotra.trim();
    if (address) updates.address = address.trim(); // Legacy full string
    if (address1) updates.address1 = address1.trim();
    if (address2) updates.address2 = address2.trim();
    if (city) updates.city = city.trim();
    if (state) updates.state = state.trim();
    if (country) updates.country = country.trim();
    if (pincode) updates.pincode = pincode.trim();
    if (Array.isArray(familyMembers)) {
      updates.familyMembers = familyMembers.filter((m) => typeof m === "string" && m.trim() !== "");
    }

    let saved: LeanUser;
    if (primary) {
      saved = (await User.findOneAndUpdate(
        { _id: primary._id },
        {
          $set: updates,
          $setOnInsert: {
            isFromApp: false,
            isNotifyOkay: false,
            email_verified: false,
            addedOn: now,
          },
        },
        { new: true, upsert: true, lean: true },
      )) as unknown as LeanUser;
    } else {
      // Create new user with all fields
      const parts = name?.trim().split(/\s+/) || [];
      const given_name = parts.length > 0 ? parts[0] : "";
      const family_name = parts.length > 1 ? parts.slice(1).join(" ") : "";

      saved = (
        await User.create({
          phone: normalizedPhone ?? undefined,
          email: normalizedEmail ?? undefined,
          name: name?.trim() || "",
          given_name,
          family_name,
          isFromApp: false,
          isNotifyOkay: false,
          email_verified: false,
          communicationOptIn: Boolean(optIn),
          isActive: true,
          addedOn: now,
          lastLoginAt: now,
          gotra: gotra?.trim() || "",
          address: address?.trim() || "",
          address1: address1?.trim() || "",
          address2: address2?.trim() || "",
          city: city?.trim() || "",
          state: state?.trim() || "",
          country: country?.trim() || "",
          pincode: pincode?.trim() || "",
          familyMembers: Array.isArray(familyMembers)
            ? familyMembers.filter((m) => typeof m === "string" && m.trim() !== "")
            : [],
        })
      ).toObject() as LeanUser;
    }

    // D) Strip sensitive fields and sign JWT
    stripOtpFields(saved as unknown as Record<string, unknown>);
    const token = signUserToken(String(saved._id));

    res.status(200).json({ token, user: saved });
  } catch (err) {
    // E) Handle duplicate-key races
    if (err && typeof err === "object" && (err as { code?: number }).code === 11000) {
      const racePhone = normalizePhone(phone);
      const raceEmail = normalizeEmail(email);
      const user = await User.findOne({
        $or: [...(racePhone ? [{ phone: racePhone }] : []), ...(raceEmail ? [{ email: raceEmail }] : [])],
      }).lean<LeanUser>();
      if (user) {
        const token = signUserToken(String(user._id));
        stripOtpFields(user as unknown as Record<string, unknown>);
        res.status(200).json({ token, user });
        return;
      }
    }
    throw err;
  }
};

/** Space-separated list of every @gmail.com user email. */
export const getAllGmailUsers = async (_req: Request, res: Response): Promise<void> => {
  const users = await User.find({}, "email");
  const gmailUsers = users
    .map((u) => u.email)
    .filter((e): e is string => !!e && e.endsWith("@gmail.com"))
    .join(" ");
  res.status(200).send(gmailUsers);
};

export const deleteAccountController = async (req: Request, res: Response): Promise<void> => {
  const { phone, reason } = req.body as { phone?: string; reason?: string };

  const normalizedPhone = normalizePhone(phone || "");
  if (!normalizedPhone) throw ApiError.badRequest("Phone number is required");
  if (!reason || typeof reason !== "string" || reason.length < 3) {
    throw ApiError.badRequest("Reason is required");
  }

  const user = await User.findOne({ phone: normalizedPhone });
  if (!user) throw ApiError.notFound("User not found");

  // Log the deletion reason before removing the account
  await DeletionLog.create({
    phone: normalizedPhone,
    userId: user._id,
    reason,
    deletedAt: new Date(),
  });

  // Delete the user (hard delete)
  await User.deleteOne({ _id: user._id });

  res.status(200).json({
    message: "Account deleted successfully",
    deletedUser: {
      phone: user.phone,
      name: user.name,
      email: user.email,
      _id: user._id,
    },
  });
};

/** Contact Us form submission (main website) with optional image uploads. */
export const sendContactUsForm = async (req: Request, res: Response): Promise<void> => {
  // req.files is an array of uploaded images (multer memory storage, upload.array)
  const images = req.files as Express.Multer.File[] | undefined;
  const { name, email, number, description } = req.body;

  if (!name || !email || !number || !description) {
    throw ApiError.badRequest("All fields are required.");
  }

  try {
    await sendContactUsMailVedicVaibhavMain({ name, email, number, description, images });
  } catch (error) {
    logger.error({ err: error }, "Error sending contact form");
    throw new ApiError(500, "Error sending message. Please try again later.");
  }
  res.status(200).json({ message: "Your message has been sent successfully." });
};
