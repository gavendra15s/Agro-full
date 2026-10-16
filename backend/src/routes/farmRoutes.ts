import { Router } from "express";
import { getFarms, getFarm, createFarm, getAvailability, updateCapacity, getFarmRisk } from "../controllers/farmController.js";
import { authenticateJwt } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errorHandler.js";

const router = Router();

router.get("/", asyncHandler(getFarms));
router.get("/:slug/availability", asyncHandler(getAvailability));
router.get("/:slug/risk", asyncHandler(getFarmRisk));
router.get("/:slug", asyncHandler(getFarm));
router.post("/", authenticateJwt, asyncHandler(createFarm));
router.patch("/:slug/capacity", authenticateJwt, asyncHandler(updateCapacity));

export default router;

