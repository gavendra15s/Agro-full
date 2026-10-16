import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { PhotoVerificationService } from "../services/alertEngine/photoVerification.js";

describe("Path B: 7-Factor Photo Verification Suite", () => {
  const service = new PhotoVerificationService();

  // A valid small base64 test image
  const testPhotoDataUri =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

  describe("Credibility Scoring & Signal Aggregation", () => {
    it("should compute high credibility for verified user with matching GPS & live hardware camera", async () => {
      const result = await service.processReport({
        userId: 1, // Admin / verified host
        farmId: 1,
        photoUrl: testPhotoDataUri,
        deviceLat: 30.556,
        deviceLng: 79.563,
        photoExifLat: 30.557, // Delta < 200m -> GPS match
        photoExifLng: 79.564,
        claimedType: "landslide",
        details: "Mud and gravel blocking the farm entry road.",
        locationName: "Mukteshwar Hill Sector",
        isLiveInAppCamera: true, // +10 pts
      });

      assert.ok(result.report, "Incident report must be generated");
      assert.ok(result.score >= 50, `Expected score >= 50, got ${result.score}`);
      assert.ok(["medium", "high"].includes(result.scoreBand));
      assert.ok(result.signals.length >= 7, "All 7 verification signals must be populated");

      // Verify specific signals exist
      const reporterSignal = result.signals.find((s: any) => (s.signal_name || s.name) === "reporter_verification");
      const gpsSignal = result.signals.find((s: any) => (s.signal_name || s.name) === "gps_spatial_match");
      const cameraSignal = result.signals.find((s: any) => (s.signal_name || s.name) === "in_app_camera_capture");
      const visionSignal = result.signals.find((s: any) => (s.signal_name || s.name) === "ai_vision_hazard_classification");

      assert.ok(reporterSignal, "Reporter verification signal must be present");
      assert.ok(gpsSignal, "GPS match signal must be present");
      assert.ok(cameraSignal, "Camera lock signal must be present");
      assert.ok(visionSignal, "AI Vision signal must be present");

      assert.equal(gpsSignal?.score_points ?? (gpsSignal as any)?.points, 20, "Matching GPS must award 20 pts");
      assert.equal(cameraSignal?.score_points ?? (cameraSignal as any)?.points, 10, "Live in-app camera must award 10 pts");
    });

    it("should penalize severe GPS mismatch and gallery file uploads", async () => {
      const result = await service.processReport({
        userId: 999, // Unverified stranger
        photoUrl: testPhotoDataUri,
        deviceLat: 30.556,
        deviceLng: 79.563,
        photoExifLat: 28.613, // Delhi GPS vs Mukteshwar phone (> 250km apart!)
        photoExifLng: 77.209,
        claimedType: "flash_flood",
        isLiveInAppCamera: false, // Gallery upload (0 pts)
      });

      const gpsSignal = result.signals.find((s: any) => (s.signal_name || s.name) === "gps_spatial_match");
      const cameraSignal = result.signals.find((s: any) => (s.signal_name || s.name) === "in_app_camera_capture");

      assert.equal(gpsSignal?.score_points ?? (gpsSignal as any)?.points, 0, "GPS mismatch (> 1.5 km) must award 0 points");
      assert.equal(cameraSignal?.score_points ?? (cameraSignal as any)?.points, 0, "Gallery upload must award 0 points");
      assert.ok(result.score < 60, "Severe discrepancies must lower credibility score");
    });

    it("Invariant: Total score must never exceed 100 points", async () => {
      const result = await service.processReport({
        userId: 1,
        farmId: 1,
        photoUrl: testPhotoDataUri,
        deviceLat: 29.47,
        deviceLng: 79.65,
        photoExifLat: 29.47,
        photoExifLng: 79.65,
        claimedType: "landslide",
        isLiveInAppCamera: true,
      });

      assert.ok(result.score <= 100, "Credibility score must never exceed 100");
      assert.ok(result.score >= 0, "Credibility score must be non-negative");
    });
  });
});
