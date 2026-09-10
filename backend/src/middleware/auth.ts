import jwt from "jsonwebtoken";
import type { RequestHandler } from "express";
import { env } from "../config/env";
import { ApiError } from "../lib/apiError";

/**
 * Payload shapes signed across the legacy auth flows:
 *  - Google / email-OTP login signs `{ userId, email, name, picture }`
 *  - Phone-OTP / login-or-register signs `{ id }`
 *  - Helpers.generateToken signs `{ userId, role }`
 */
export interface AuthTokenPayload {
  userId?: string;
  id?: string;
  email?: string;
  name?: string;
  picture?: string;
  role?: string;
  iat?: number;
  exp?: number;
}

/** Verify the Bearer JWT and attach its payload as `req.user`. */
export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (!token) throw ApiError.unauthorized("Authentication token missing");

  let decoded: string | jwt.JwtPayload;
  try {
    decoded = jwt.verify(token, env.jwt.secret);
  } catch {
    throw ApiError.unauthorized("Invalid or expired token");
  }
  if (typeof decoded === "string") throw ApiError.unauthorized("Invalid token payload");

  req.user = decoded as AuthTokenPayload;
  next();
};
