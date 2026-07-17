/**
 * Payment service — Razorpay integration for Indian market.
 *
 * Requires env vars:
 *   RAZORPAY_KEY_ID=...
 *   RAZORPAY_KEY_SECRET=...
 *
 * Install razorpay SDK when enabling:
 *   npm install razorpay
 */

export class PaymentError extends Error {
  constructor(message: string, public readonly gateway = "razorpay") {
    super(message);
    this.name = "PaymentError";
  }
}

export interface PaymentResult {
  status: "pending" | "confirmed" | "failed";
  gateway: "razorpay" | "stripe";
  orderId: string;
  gatewayOrderId?: string;
  amount: number;
  currency: string;
}

/**
 * Initiates a Razorpay order for an amount (in INR).
 * amount is in rupees — converted to paise internally.
 */
export const processPayment = async (
  orderId: string,
  amount: number,
  paymentMethod: "razorpay" | "stripe" = "razorpay"
): Promise<PaymentResult> => {
  if (paymentMethod === "razorpay") {
    // Stub: replace with real Razorpay SDK call when credentials are available
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      console.warn("[Payment] Razorpay credentials missing — returning mock result");
      return {
        status: "pending",
        gateway: "razorpay",
        orderId,
        gatewayOrderId: `rzp_mock_${Date.now()}`,
        amount,
        currency: "INR",
      };
    }

    try {
      // Dynamic import so the app doesn't crash when razorpay is not installed
      const Razorpay = (await import("razorpay" as never)).default as {
        new(opts: Record<string, string>): { orders: { create(opts: Record<string, unknown>): Promise<{ id: string }> } }
      };
      const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

      const rzpOrder = await razorpay.orders.create({
        amount: amount * 100, // rupees → paise
        currency: "INR",
        receipt: orderId,
      });

      return {
        status: "pending",
        gateway: "razorpay",
        orderId,
        gatewayOrderId: rzpOrder.id,
        amount,
        currency: "INR",
      };
    } catch (error) {
      console.error("[Payment] Razorpay order creation failed:", error);
      throw new PaymentError("Payment processing failed");
    }
  }

  throw new PaymentError(`Unsupported payment method: ${paymentMethod}`);
};

/**
 * Webhook handler — call this from your Express route:
 *   app.post("/webhooks/razorpay", handleRazorpayWebhook)
 */
export const handleRazorpayWebhook = async (
  payload: Record<string, unknown>,
  onConfirmed: (orderId: string) => Promise<void>
) => {
  const payment = (payload?.payload as Record<string, unknown>)
    ?.payment as Record<string, unknown>;
  const entity = payment?.entity as Record<string, unknown>;

  if (!entity?.receipt) {
    console.warn("[Payment Webhook] No receipt in payload");
    return;
  }

  await onConfirmed(entity.receipt as string);
  console.log(`[Payment Webhook] Order ${entity.receipt} confirmed`);
};
