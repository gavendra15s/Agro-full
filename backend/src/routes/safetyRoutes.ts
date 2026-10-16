import { Router } from "express";
import {
  getMatrix,
  querySafetyStatus,
  getSourceHealth,
  ackAlert,
  simulateAlert,
} from "../controllers/safetyController.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { optionalAuthJwt } from "../middleware/auth.js";

const router = Router();

router.get("/matrix", asyncHandler(getMatrix));
router.get("/query", asyncHandler(querySafetyStatus));
router.get("/sources/health", asyncHandler(getSourceHealth));
router.post("/alerts/:id/ack", optionalAuthJwt, asyncHandler(ackAlert));
router.post("/simulate-alert", optionalAuthJwt, asyncHandler(simulateAlert));

export default router;

