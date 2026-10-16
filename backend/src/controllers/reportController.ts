import { Request, Response } from "express";
import { photoVerificationService } from "../services/alertEngine/photoVerification.js";
import { AuthenticatedRequest } from "../middleware/auth.js";
import { supabase } from "../config/supabase.js";

export const getReports = async (req: Request, res: Response): Promise<void> => {
  const status = (req.query.status as string) || "pending_moderation";
  if (status === "all") {
    const { data } = await supabase.from("incident_reports").select("*, report_signals(*)").order("reported_at", { ascending: false });
    res.status(200).json({ success: true, count: data?.length || 0, data: data || [] });
    return;
  }
  const reports = await photoVerificationService.listModeratorQueue(status);
  res.status(200).json({ success: true, count: reports.length, data: reports });
};

export const getReportById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const param = Array.isArray(id) ? id[0] : id;
  const { data, error } = await supabase
    .from("incident_reports")
    .select("*, report_signals(*), users(first_name, last_name, email)")
    .or(`id.eq.${param},report_code.eq.${param}`)
    .single();

  if (error || !data) {
    res.status(404).json({ success: false, error: "Report not found" });
    return;
  }
  res.status(200).json({ success: true, data });
};

export const uploadReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.id || 3; // Default authenticated Arjun if demo
  const {
    image_s3_url,
    photo_url,
    latitude,
    longitude,
    photo_exif_lat,
    photo_exif_lng,
    photo_exif_time,
    location_name,
    details,
    farm_id,
    claimed_type,
    is_live_camera,
  } = req.body;

  const resolvedPhoto = photo_url || image_s3_url;
  if (!resolvedPhoto || latitude === undefined || longitude === undefined) {
    res.status(400).json({ success: false, error: "photo_url, latitude, and longitude are required" });
    return;
  }

  const result = await photoVerificationService.processReport({
    userId,
    farmId: farm_id ? Number(farm_id) : undefined,
    photoUrl: resolvedPhoto,
    deviceLat: Number(latitude),
    deviceLng: Number(longitude),
    photoExifLat: photo_exif_lat ? Number(photo_exif_lat) : undefined,
    photoExifLng: photo_exif_lng ? Number(photo_exif_lng) : undefined,
    photoExifTime: photo_exif_time,
    claimedType: claimed_type || "landslide",
    locationName: location_name,
    details,
    isLiveInAppCamera: is_live_camera !== false,
  });

  res.status(201).json({
    success: true,
    message:
      result.scoreBand === "high"
        ? `High credibility report (${result.score}/100) routed to priority human moderator queue.`
        : `Report received (${result.score}/100 credibility) and placed in moderator review queue.`,
    data: result,
  });
};

export const submitDecision = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const moderatorId = req.user?.id || 1;
  const { id } = req.params;
  const param = Array.isArray(id) ? id[0] : id;
  const { decision, reason } = req.body;

  if (!decision || !["confirm", "reject", "request_info"].includes(decision)) {
    res.status(400).json({ success: false, error: "decision must be one of: confirm, reject, request_info" });
    return;
  }

  const result = await photoVerificationService.submitModeratorDecision(
    Number(param),
    moderatorId,
    decision,
    reason || "Moderation review completed."
  );

  res.status(200).json({
    success: true,
    message: `Moderation decision '${decision}' executed successfully.`,
    data: result,
  });
};

