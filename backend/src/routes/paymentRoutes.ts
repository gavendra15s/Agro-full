import { Router } from "express";
import { createOrder, verifyAndCreateBooking, handleRazorpayWebhook } from "../controllers/paymentController.js";
import { authenticateJwt } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { paymentRateLimiter } from "../middleware/rateLimiter.js";

const router = Router();

router.post("/razorpay/order", authenticateJwt, paymentRateLimiter, asyncHandler(createOrder));
router.post("/razorpay/verify", authenticateJwt, paymentRateLimiter, asyncHandler(verifyAndCreateBooking));
router.post("/webhook", asyncHandler(handleRazorpayWebhook));

export default router;
