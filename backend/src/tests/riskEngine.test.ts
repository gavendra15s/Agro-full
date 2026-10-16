import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { evaluateLandslideRisk } from "../services/riskEngine/landslide.js";
import { evaluateFloodRisk } from "../services/riskEngine/flood.js";
import { evaluateHeatRisk, computeHeatIndexC } from "../services/riskEngine/heat.js";
import { evaluateCycloneRisk } from "../services/riskEngine/cyclone.js";
import { evaluateThunderstormRisk } from "../services/riskEngine/thunderstorm.js";
import { RiskFusionEngine } from "../services/riskEngine/fusion.js";
import { Farm, OfficialAlert } from "../types/index.js";

describe("Multi-Hazard Risk Engine Verification Suite", () => {
  const timestamp = new Date().toISOString();

  // -------------------------------------------------------------
  // MODULE 1: LANDSLIDE HAZARD MODULE
  // -------------------------------------------------------------
  describe("Module 1: Landslide Assessment Rules", () => {
    it("should classify light rainfall on dry, gentle slope as Green (Level 0)", () => {
      const result = evaluateLandslideRisk({
        rain_24h_mm: 12.0,
        is_soil_wet_recent: false,
        slope_degrees: 8.0,
        susceptibility_class: "low",
        data_time: timestamp,
      });

      assert.equal(result.level, 0, "Expected Green (0) for light rain on gentle dry slope");
      assert.equal(result.officialAlertFloorApplied, false);
      assert.ok(result.reasons.length > 0);
    });

    it("should classify heavy rain (70mm) on wet, steep slope as Orange (Level 2)", () => {
      const result = evaluateLandslideRisk({
        rain_24h_mm: 70.0, // Heavy rain category (1)
        is_soil_wet_recent: true, // +1 wet soil bonus
        slope_degrees: 28.0, // High slope susceptibility (+1)
        susceptibility_class: "high",
        data_time: timestamp,
      });

      // Computed level = 1 (heavy) + 1 (wet) + 1 (high slope) = 3 or 2
      assert.ok(result.level >= 2, "Expected Orange (2) or Red (3) for heavy rain on saturated steep slope");
      assert.ok(result.reasons.some((r) => r.includes("Prior 3-7 day rainfall has saturated")));
    });

    it("should classify extremely heavy rain (>= 204.5mm) as Red (Level 3)", () => {
      const result = evaluateLandslideRisk({
        rain_24h_mm: 215.0,
        is_soil_wet_recent: true,
        slope_degrees: 22.0,
        susceptibility_class: "high",
        data_time: timestamp,
      });

      assert.equal(result.level, 3, "Expected Red (3) for extremely heavy rainfall");
    });

    it("Invariant: Official SACHET/IMD warning MUST raise the risk floor (cannot be lowered)", () => {
      // Local physical condition: dry weather (computed = 0)
      // Official alert: NDMA SACHET Orange warning (level 2)
      const officialAlert: OfficialAlert = {
        id: 9991,
        cap_id: "CAP-TEST-001",
        source: "SACHET",
        event: "Landslide Warning",
        level: "Orange",
        level_code: 2,
        headline: "Orange Alert for Landslide Vulnerability",
        description: "Disaster management advisory active in sector.",
        effective: timestamp,
        expires: timestamp,
        status: "Actual",
      };

      const result = evaluateLandslideRisk({
        rain_24h_mm: 5.0, // Dry
        is_soil_wet_recent: false,
        slope_degrees: 8.0,
        susceptibility_class: "low",
        official_alert_level: 2,
        official_alert: officialAlert,
        data_time: timestamp,
      });

      assert.equal(result.level, 2, "Expected Orange (2) because official government alert sets the floor");
      assert.equal(result.officialAlertFloorApplied, true);
      assert.ok(result.reasons.some((r) => r.includes("raised the risk floor to Orange")));
    });
  });

  // -------------------------------------------------------------
  // MODULE 2: FLOOD & FLASH FLOOD MODULE
  // -------------------------------------------------------------
  describe("Module 2: River & Flash Flood Rules", () => {
    it("should classify standard base discharge (35th percentile) as Green (Level 0)", () => {
      const result = evaluateFloodRisk({
        river_discharge_percentile: 35,
        rain_72h_mm: 20,
        distance_to_river_km: 2.5,
        data_time: timestamp,
      });

      assert.equal(result.level, 0, "Normal discharge percentile should evaluate to Green");
    });

    it("should classify severe river discharge (96th percentile) on immediate floodplain as Red (Level 3)", () => {
      const result = evaluateFloodRisk({
        river_discharge_percentile: 96,
        rain_72h_mm: 130,
        distance_to_river_km: 0.5, // Immediate floodplain (<= 0.8 km)
        data_time: timestamp,
      });

      assert.equal(result.level, 3, "GloFAS 96th percentile on immediate floodplain triggers Red (3)");
    });

    it("should elevate risk to Orange when farm is within 1.0 km of river during high discharge", () => {
      const result = evaluateFloodRisk({
        river_discharge_percentile: 82,
        rain_72h_mm: 160,
        distance_to_river_km: 0.8,
        data_time: timestamp,
      });

      assert.ok(result.level >= 2, "Proximity < 1.0km with 82nd percentile discharge must trigger Orange or higher");
    });
  });

  // -------------------------------------------------------------
  // MODULE 3: EXTREME HEAT & ROTHFUSZ HEAT INDEX
  // -------------------------------------------------------------
  describe("Module 3: Extreme Heat & Rothfusz Equation", () => {
    it("should accurately compute the Rothfusz Heat Index formula", () => {
      // 40°C (~104°F) with 60% humidity is dangerously oppressive
      const hi = computeHeatIndexC(40, 60);
      assert.ok(hi > 48, `Expected Heat Index to exceed 48°C, got ${hi}`);
    });

    it("should trigger Red danger when Heat Index exceeds 54°C or temp exceeds 45°C", () => {
      const result = evaluateHeatRisk({
        temp_max_c: 46.0,
        humidity_percent: 55,
        data_time: timestamp,
      });

      assert.equal(result.level, 3, "Expected Red (3) for temp >= 45°C or HI >= 54°C");
      assert.ok(result.reasons.some((r) => r.includes("Extreme Heat Danger")));
    });

    it("should return Green under moderate mountain temperatures (24°C, 50% humidity)", () => {
      const result = evaluateHeatRisk({
        temp_max_c: 24.0,
        humidity_percent: 50,
        data_time: timestamp,
      });

      assert.equal(result.level, 0, "Moderate mountain conditions should evaluate to Green");
    });
  });

  // -------------------------------------------------------------
  // MODULE 4: CYCLONE & HIGH WIND RULES
  // -------------------------------------------------------------
  describe("Module 4: Cyclone & High Wind Rules", () => {
    it("should trigger Red for coastal farms (<50km) facing wind gusts >= 90 km/h", () => {
      const result = evaluateCycloneRisk({
        distance_to_coast_km: 25.0,
        wind_gust_kmh: 95.0,
        rain_24h_mm: 80.0,
        data_time: timestamp,
      });

      assert.equal(result.level, 3, "Expected Red for hurricane-force gusts on coast");
    });

    it("should not trigger coastal cyclone warnings for deep inland Himalayan farms", () => {
      const result = evaluateCycloneRisk({
        distance_to_coast_km: 450.0, // Uttarakhand / Himachal
        wind_gust_kmh: 40.0,
        rain_24h_mm: 30.0,
        data_time: timestamp,
      });

      assert.equal(result.level, 0, "Inland non-cyclonic winds should evaluate to Green");
    });
  });

  // -------------------------------------------------------------
  // MODULE 5: THUNDERSTORM NOWCAST PASSTHROUGH
  // -------------------------------------------------------------
  describe("Module 5: Thunderstorm Doppler Nowcast", () => {
    it("should flag Yellow when IMD Doppler 3-hour nowcast is active", () => {
      const result = evaluateThunderstormRisk({
        has_active_nowcast: true,
        nowcast_text: "Severe thunderstorm with lightning and gusty winds up to 50 km/h expected.",
        data_time: timestamp,
      });

      assert.equal(result.level, 1, "Active nowcast should trigger Yellow advisory");
      assert.ok(result.reasons.some((r) => r.includes("Severe thunderstorm")));
    });
  });

  // -------------------------------------------------------------
  // INTEGRATED FUSION ENGINE & HORIZON INVARIANTS
  // -------------------------------------------------------------
  describe("Risk Fusion Engine: Horizon & Invariant Rules", () => {
    const fusionEngine = new RiskFusionEngine();

    const sampleFarm: Farm = {
      id: 1,
      host_id: 1,
      title: "Pahadi Apple Orchard & Homestay",
      slug: "pahadi-apple-orchard",
      category: "Homestay",
      description: "Organic orchard farmstay in Mukteshwar",
      state: "Uttarakhand",
      district: "Nainital",
      latitude: 29.47,
      longitude: 79.65,
      nightly_rate: 3200,
      max_guests: 6,
      uses_fallback_coords: false,
      images: ["https://images.unsplash.com/photo-1544620347-c4fd4a3d5957"],
      amenities: ["WiFi", "Mountain View"],
      created_at: timestamp,
      updated_at: timestamp,
    };

    it("Invariant: Dates > 15 days out must return Historical Climatology Trend (level: -1)", async () => {
      // 40 days in future
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 40);
      const targetDateStr = futureDate.toISOString().split("T")[0];

      const riskOverview = await fusionEngine.evaluateFarmRisk(sampleFarm, targetDateStr);

      assert.equal(riskOverview.overall_level, -1, "Dates > 15 days out must return Insufficient data (-1)");
      assert.equal(riskOverview.overall_level_name, "Insufficient data");
      assert.equal(riskOverview.overall_confidence, "not_applicable");
      assert.ok(riskOverview.disclaimer.includes("Historical climatological trend only"));
      assert.ok(riskOverview.hazards.landslide.reasons[0].includes("Showing historical 10-year trend"));
    });

    it("Invariant: Forecast dates (0-3 days) must evaluate live numerical predictions with high confidence", async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const targetDateStr = tomorrow.toISOString().split("T")[0];

      const riskOverview = await fusionEngine.evaluateFarmRisk(sampleFarm, targetDateStr);

      assert.ok([0, 1, 2, 3].includes(riskOverview.overall_level), "Risk level must be in 0..3");
      assert.equal(riskOverview.overall_confidence, "high");
      assert.ok(riskOverview.hazards.landslide);
      assert.ok(riskOverview.hazards.flood);
      assert.ok(riskOverview.hazards.heat);
    });
  });
});
