import { Request, Response } from "express";
import {
  listAllFarms,
  getFarmBySlug,
  createFarmListing,
  getFarmAvailability,
  updateFarmCapacity,
} from "../services/farmService.js";
import { AuthenticatedRequest } from "../middleware/auth.js";

export const getFarms = async (req: Request, res: Response): Promise<void> => {
  const { state, district, subdistrict, category, host_id } = req.query;
  const farms = await listAllFarms({
    state: state as string,
    district: district as string,
    subdistrict: subdistrict as string,
    category: category as string,
    host_id: host_id ? Number(host_id) : undefined,
  });
  res.status(200).json({ success: true, count: farms.length, data: farms });
};

export const getFarm = async (req: Request, res: Response): Promise<void> => {
  const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
  const farm = await getFarmBySlug(slug);
  res.status(200).json({ success: true, data: farm });
};

export const createFarm = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const hostId = req.user?.id || 1;
  const newFarm = await createFarmListing(hostId, req.body);
  res.status(201).json({ success: true, data: newFarm });
};

export const getAvailability = async (req: Request, res: Response): Promise<void> => {
  const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
  const checkIn = req.query.checkIn as string;
  const checkOut = req.query.checkOut as string;

  if (!checkIn || !checkOut) {
    res.status(400).json({ success: false, error: "checkIn and checkOut query params are required" });
    return;
  }

  const farm = await getFarmBySlug(slug);
  const availability = await getFarmAvailability(farm.id, checkIn, checkOut);
  res.status(200).json({ success: true, data: availability });
};

export const updateCapacity = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const hostId = req.user?.id;
  if (!hostId) {
    res.status(401).json({ success: false, error: "Access token missing or invalid" });
    return;
  }
  const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
  const updated = await updateFarmCapacity(hostId, slug, Number(req.body.max_guests));
  res.status(200).json({ success: true, data: updated });
};

export const getFarmRisk = async (req: Request, res: Response): Promise<void> => {
  const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
  const date = req.query.date as string;
  const { getFarmDetailedRisk } = await import("../services/safetyService.js");
  const risk = await getFarmDetailedRisk(slug, date);
  res.status(200).json({ success: true, data: risk });
};

