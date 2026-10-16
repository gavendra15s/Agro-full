import { Response } from "express";
import {
  createBookingWithEscrow,
  createBookingHold,
  rescheduleBookingForWeather,
  listBookings,
} from "../services/bookingService.js";
import { AuthenticatedRequest } from "../middleware/auth.js";

export const createHold = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const guest_id = req.user?.id || 3;
  const { farm_id, stay_start_date, stay_end_date, total_guests } = req.body;

  if (!farm_id || !stay_start_date || !stay_end_date) {
    res.status(400).json({ success: false, error: "farm_id, stay_start_date, and stay_end_date are required" });
    return;
  }

  const result = await createBookingHold({
    guest_id,
    farm_id: Number(farm_id),
    stay_start_date,
    stay_end_date,
    total_guests: total_guests || 1,
  });

  res.status(201).json({
    success: true,
    message: "15-minute hold secured on dates. Complete checkout before expiration.",
    data: result,
  });
};

export const rescheduleBooking = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const param = Array.isArray(id) ? id[0] : id;
  const { new_start_date, new_end_date, reason } = req.body;

  if (!new_start_date || !new_end_date) {
    res.status(400).json({ success: false, error: "new_start_date and new_end_date are required" });
    return;
  }

  const result = await rescheduleBookingForWeather(param, new_start_date, new_end_date, reason);
  res.status(200).json({
    success: true,
    message: "Weather-aware safety reschedule confirmed. Dates shifted with zero fees.",
    data: result,
  });
};

export const createBooking = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const guest_id = req.user?.id || 3;
  const { farm_id, stay_start_date, stay_end_date, total_guests, gateway_ref, cab_pickup_location, cab_pincode } = req.body;

  if (!farm_id || !stay_start_date || !stay_end_date) {
    res.status(400).json({ success: false, error: "farm_id, stay_start_date, and stay_end_date are required" });
    return;
  }

  const result = await createBookingWithEscrow({
    guest_id,
    farm_id,
    stay_start_date,
    stay_end_date,
    total_guests: total_guests || 1,
    gateway_ref,
    cab_pickup_location,
    cab_pincode,
  });

  res.status(201).json({ success: true, data: result });
};

export const getBookings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const role = req.user?.user_type;
  const bookings = await listBookings(userId, role);
  res.status(200).json({ success: true, count: bookings.length, data: bookings });
};

