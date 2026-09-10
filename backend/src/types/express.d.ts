import type { AuthTokenPayload } from "../middleware/auth";

declare global {
  namespace Express {
    interface Request {
      /** Set by `requireAuth` after JWT verification. */
      user?: AuthTokenPayload;
    }
  }
}

export {};
