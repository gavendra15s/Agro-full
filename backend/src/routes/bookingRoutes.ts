import { Router } from "express";
import { createBooking, getBookings, createHold, rescheduleBooking } from "../controllers/bookingController.js";
import { authenticateJwt, optionalAuthJwt } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errorHandler.js";

const router = Router();

router.get("/", authenticateJwt, asyncHandler(getBookings));
router.post("/hold", optionalAuthJwt, asyncHandler(createHold));
router.post("/:id/reschedule", authenticateJwt, asyncHandler(rescheduleBooking));
router.post("/", optionalAuthJwt, asyncHandler(createBooking));

export default router;

