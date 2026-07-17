import type { Request, Response, NextFunction } from "express";

// ─────────────────────────────────────────────────────────────────────────────
// AppError — operational errors with HTTP status codes
// ─────────────────────────────────────────────────────────────────────────────
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// asyncHandler — wraps async route handlers to forward errors to next()
// ─────────────────────────────────────────────────────────────────────────────
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

// ─────────────────────────────────────────────────────────────────────────────
// errorHandler — global Express error middleware
// Register LAST: app.use(errorHandler)
// ─────────────────────────────────────────────────────────────────────────────
export const errorHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: "error",
      message: err.message,
    });
  }

  // Unexpected / programming error — log it, don't leak details
  console.error("[ErrorHandler] Unexpected error:", err);

  return res.status(500).json({
    status: "error",
    message: "Internal server error",
  });
};

/**
 * Usage example:
 *
 * import { asyncHandler, AppError } from "@/lib/middleware/errorHandler";
 *
 * router.get("/matches/:id", asyncHandler(async (req, res) => {
 *   const match = await getMatch(req.params.id);
 *   if (!match) throw new AppError("Match not found", 404);
 *   res.json(match);
 * }));
 */
