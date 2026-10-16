import crypto from "crypto";
import { razorpay, isRazorpayConfigured } from "../config/razorpay.js";
import { ENV } from "../config/env.js";

export const createRazorpayOrder = async (params: {
  amountInRupees: number;
  receipt: string;
  notes?: Record<string, string>;
}) => {
  if (!isRazorpayConfigured()) {
    throw new Error("Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env.");
  }

  const order = await razorpay.orders.create({
    amount: Math.round(params.amountInRupees * 100), // paise
    currency: "INR",
    receipt: params.receipt,
    notes: params.notes,
  });

  return order;
};

export const verifyRazorpaySignature = (params: {
  order_id: string;
  payment_id: string;
  signature: string;
}): boolean => {
  const expected = crypto
    .createHmac("sha256", ENV.RAZORPAY_KEY_SECRET)
    .update(`${params.order_id}|${params.payment_id}`)
    .digest("hex");

  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(params.signature);
  if (expectedBuf.length !== actualBuf.length) return false;

  return crypto.timingSafeEqual(expectedBuf, actualBuf);
};

export const verifyRazorpayWebhookSignature = (params: {
  rawBody: Buffer | string;
  signature: string;
  webhookSecret?: string;
}): boolean => {
  const secret = params.webhookSecret || ENV.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !params.signature) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(params.rawBody)
    .digest("hex");

  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(params.signature);
  if (expectedBuf.length !== actualBuf.length) return false;

  return crypto.timingSafeEqual(expectedBuf, actualBuf);
};

