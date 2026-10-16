import { Router } from "express";
import { uploadReport, getReports, getReportById, submitDecision } from "../controllers/reportController.js";
import { optionalAuthJwt, authenticateJwt } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errorHandler.js";

const router = Router();

router.get("/", asyncHandler(getReports));
router.get("/:id", asyncHandler(getReportById));
router.post("/", optionalAuthJwt, asyncHandler(uploadReport));
router.post("/:id/decision", authenticateJwt, asyncHandler(submitDecision));

export default router;

