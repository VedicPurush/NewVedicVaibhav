/** Helper utilities for OTP generation and expiry calculation. */

/**
 * Generate a numeric OTP of the given length.
 * @param length How many digits (default = 4)
 */
export const generateOtp = (length = 4): string => {
  let otp = "";
  for (let i = 0; i < length; i++) otp += Math.floor(Math.random() * 10);
  return otp;
};

/**
 * Return a `Date` set `minutes` in the future.
 * @param minutes Minutes until expiry (default = 1)
 */
export const getExpiry = (minutes = 1): Date => new Date(Date.now() + minutes * 60 * 1000);
