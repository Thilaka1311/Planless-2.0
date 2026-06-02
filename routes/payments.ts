import { Router } from "express";
import crypto from "crypto";

const router = Router();

// Razorpay Service configuration
const getRazorpayConfig = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  return { keyId, keySecret };
};

/**
 * POST /api/payments/create-order
 * Body parameters:
 * - amount: number (in INR, e.g. 500)
 * - receipt: string (optional)
 * - notes: object (optional)
 */
router.post("/create-order", async (req, res) => {
  try {
    const { amount, receipt, notes } = req.body;
    if (amount === undefined || typeof amount !== "number" || amount <= 0) {
      res.status(400).json({ error: "Invalid amount. Expected a positive number." });
      return;
    }

    const { keyId, keySecret } = getRazorpayConfig();

    // If keys are missing, run in sandbox/mock mode so dev flow doesn't break
    if (!keyId || !keySecret) {
      console.warn("[Razorpay] Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET. Falling back to sandbox mock order.");
      const mockOrder = {
        id: `order_mock_${Date.now()}`,
        entity: "order",
        amount: Math.round(amount * 100),
        amount_paid: 0,
        amount_due: Math.round(amount * 100),
        currency: "INR",
        receipt: receipt || `receipt_${Date.now()}`,
        status: "created",
        attempts: 0,
        notes: notes || {},
        created_at: Math.floor(Date.now() / 1000)
      };
      res.json({ success: true, order: mockOrder, sandbox: true });
      return;
    }

    const amountInPaise = Math.round(amount * 100);
    const payload = {
      amount: amountInPaise,
      currency: "INR",
      receipt: receipt || `receipt_${Date.now()}`,
      notes: notes || {}
    };

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${auth}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Razorpay] API Error creating order:", errorText);
      res.status(502).json({ error: "Error communicating with Razorpay API", details: errorText });
      return;
    }

    const orderData = await response.json();
    res.json({ success: true, order: orderData });
  } catch (error: any) {
    console.error("[Razorpay] Exception in create-order:", error);
    res.status(500).json({ error: error.message || "Failed to create Razorpay order." });
  }
});

/**
 * POST /api/payments/verify
 * Body parameters:
 * - razorpay_order_id: string
 * - razorpay_payment_id: string
 * - razorpay_signature: string
 */
router.post("/verify", (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      res.status(400).json({ error: "Missing required verification fields." });
      return;
    }

    const { keySecret } = getRazorpayConfig();

    // If signature is from mock order, auto-approve
    if (razorpay_order_id.startsWith("order_mock_")) {
      console.log("[Razorpay Verification] Sandbox mock order approved:", razorpay_order_id);
      res.json({ success: true, sandbox: true });
      return;
    }

    if (!keySecret) {
      res.status(500).json({ error: "Razorpay Key Secret is not configured. Cannot verify signature." });
      return;
    }

    const generatedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const isValid = generatedSignature === razorpay_signature;
    if (isValid) {
      console.log("[Razorpay Verification] Payment signature matches successfully.");
      res.json({ success: true });
    } else {
      console.warn("[Razorpay Verification] Signature mismatch.");
      res.status(400).json({ success: false, error: "Signature verification failed" });
    }
  } catch (error: any) {
    console.error("[Razorpay] Exception in verify payment:", error);
    res.status(500).json({ error: error.message || "Failed to verify signature." });
  }
});

export default router;
