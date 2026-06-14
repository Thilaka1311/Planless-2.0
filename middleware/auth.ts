import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not configured");
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
  };
}

/**
 * Generate a signed session token for a given user UUID.
 * Format: userId.expiry.signature
 */
export function generateToken(userId: string): string {
  const expiry = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
  const data = `${userId}.${expiry}`;
  const signature = crypto.createHmac("sha256", JWT_SECRET).update(data).digest("hex");
  return `${data}.${signature}`;
}

/**
 * Verify a signed session token. Returns user ID if valid, null otherwise.
 */
export function verifyToken(token: string): string | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [userId, expiry, signature] = parts;
    
    // Check expiration
    if (Date.now() > parseInt(expiry, 10)) {
      return null;
    }
    
    const data = `${userId}.${expiry}`;
    const expectedSignature = crypto.createHmac("sha256", JWT_SECRET).update(data).digest("hex");
    if (signature === expectedSignature) {
      return userId;
    }
  } catch (e) {
    return null;
  }
  return null;
}

/**
 * Express middleware to authenticate calls using signed tokens.
 */
export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required. Missing token." });
    return;
  }

  const token = authHeader.split(" ")[1];
  const userId = verifyToken(token);
  if (!userId) {
    res.status(401).json({ error: "Invalid or expired authentication token." });
    return;
  }

  req.user = { id: userId };
  next();
}
