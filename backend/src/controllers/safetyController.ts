import { Request, Response } from "express";
import { getAnnualMatrixForDistrict, evaluateSafetyStatus } from "../services/safetyService.js";
import { backgroundScheduler } from "../services/backgroundJobs.js";
import { officialAlertService } from "../services/alertEngine/officialAlerts.js";
import { AuthenticatedRequest } from "../middleware/auth.js";

export const getMatrix = async (req: Request, res: Response): Promise<void> => {
  const { district, year } = req.query;
  if (!district) {
    res.status(400).json({ success: false, error: "district parameter is required" });
    return;
  }

  const records = await getAnnualMatrixForDistrict(
    district as string,
    year ? Number(year) : 2026
  );
  res.status(200).json({ success: true, count: records.length, data: records });
};

export const querySafetyStatus = async (req: Request, res: Response): Promise<void> => {
  const { state, district, latitude, longitude, date, farm_id } = req.query;
  if (!state || !district) {
    res.status(400).json({ success: false, error: "state and district parameters are required" });
    return;
  }

  const result = await evaluateSafetyStatus({
    state: state as string,
    district: district as string,
    latitude: latitude ? Number(latitude) : undefined,
    longitude: longitude ? Number(longitude) : undefined,
    date: date as string,
    farm_id: farm_id ? Number(farm_id) : undefined,
  });

  res.status(200).json({ success: true, data: result });
};

export const getSourceHealth = async (req: Request, res: Response): Promise<void> => {
  const health = await backgroundScheduler.checkSourceFreshness();
  res.status(200).json({ success: true, data: health });
};

export const ackAlert = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.id || 3;
  const { id } = req.params;
  const param = Array.isArray(id) ? id[0] : id;
  await officialAlertService.acknowledgeSafeStatus(param, userId);
  res.status(200).json({ success: true, message: "Safety acknowledgement received ('I am safe'). Host dashboard notified." });
};

export const simulateAlert = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { farm_id, event, level, headline, description } = req.body;
  if (!farm_id) {
    res.status(400).json({ success: false, error: "farm_id is required" });
    return;
  }

  const alert = await officialAlertService.simulateTestAlert({
    farmId: Number(farm_id),
    event,
    level,
    headline,
    description,
  });

  res.status(201).json({
    success: true,
    message: "[TEST SIMULATION] Test alert generated and dispatched to local test sandbox.",
    data: alert,
  });
};

