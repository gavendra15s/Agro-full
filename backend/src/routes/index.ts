import { Router } from "express";
import authRoutes from "./authRoutes.js";
import farmRoutes from "./farmRoutes.js";
import bookingRoutes from "./bookingRoutes.js";
import escrowRoutes from "./escrowRoutes.js";
import paymentRoutes from "./paymentRoutes.js";
import reportRoutes from "./reportRoutes.js";
import warningRoutes from "./warningRoutes.js";
import safetyRoutes from "./safetyRoutes.js";
import notificationRoutes from "./notificationRoutes.js";
import { getStats } from "../controllers/authController.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { isLiveSupabaseConfigured } from "../config/supabase.js";

const apiRouter = Router();

// Ping endpoint
apiRouter.get("/ping", (req, res) => {
  res.status(200).json({
    message: "pong",
    timestamp: new Date().toISOString(),
    status: "online",
    service: "agrosafe-backend",
    database: isLiveSupabaseConfigured() ? "connected" : "misconfigured",
  });
});

// Platform stats endpoint
apiRouter.get("/stats", asyncHandler(getStats));

apiRouter.use("/auth", authRoutes);
apiRouter.use("/farms", farmRoutes);
apiRouter.use("/bookings", bookingRoutes);
apiRouter.use("/escrow", escrowRoutes);
apiRouter.use("/payments", paymentRoutes);
apiRouter.use("/reports", reportRoutes);
apiRouter.use("/warnings", warningRoutes);
apiRouter.use("/safety", safetyRoutes);
apiRouter.use("/notifications", notificationRoutes);

export default apiRouter;
