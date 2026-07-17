import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "./errorHandler";

// Extend Express Request to carry decoded user context
export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
  userEmail?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// authenticate — verifies Bearer JWT, injects userId + userRole into req
// ─────────────────────────────────────────────────────────────────────────────
export const authenticate = (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      throw new AppError("No token provided", 401);
    }

    const token = authHeader.split(" ")[1];
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new AppError("Server misconfiguration: JWT_SECRET not set", 500, false);
    }

    const decoded = jwt.verify(token, secret) as {
      userId: string;
      role: string;
      email: string;
    };

    req.userId = decoded.userId;
    req.userRole = decoded.role;
    req.userEmail = decoded.email;

    next();
  } catch (error) {
    if (error instanceof AppError) return next(error);
    next(new AppError("Invalid or expired token", 401));
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// authorize — role-based access control middleware factory
// ─────────────────────────────────────────────────────────────────────────────
export const authorize = (allowedRoles: string[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.userRole || !allowedRoles.includes(req.userRole)) {
      return next(new AppError("Insufficient permissions", 403));
    }
    next();
  };
};

/**
 * Usage example:
 *
 * import { authenticate, authorize } from "@/lib/middleware/auth";
 *
 * router.get(
 *   "/incidents",
 *   authenticate,
 *   authorize(["staff", "admin"]),
 *   getIncidents
 * );
 */
