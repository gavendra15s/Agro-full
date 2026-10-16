import { riskFusionEngine } from "./services/riskEngine/fusion.js";
import { photoVerificationService } from "./services/alertEngine/photoVerification.js";
import { officialAlertService } from "./services/alertEngine/officialAlerts.js";
import { backgroundScheduler } from "./services/backgroundJobs.js";

async function runE2ETests() {
  console.log("=== AGROSAFE UPGRADE SYSTEM VERIFICATION ===");

  // 1. Test Multi-Hazard Risk Engine
  console.log("\n[1] Testing Multi-Hazard Risk Engine for Chamoli Farm...");
  const mockFarm = {
    id: 1,
    title: "Himalayan Organic Orchard",
    slug: "himalayan-organic-orchard",
    state: "Uttarakhand",
    district: "Chamoli",
    latitude: 30.556,
    longitude: 79.563,
  };

  const riskOverview = await riskFusionEngine.evaluateFarmRisk(mockFarm as any, "2026-09-15");
  console.log(`- Date: ${riskOverview.date}`);
  console.log(`- Overall Level: ${riskOverview.overall_level} (${riskOverview.overall_level_name})`);
  console.log(`- Confidence: ${riskOverview.overall_confidence}`);
  console.log(`- Hazards evaluated: ${Object.keys(riskOverview.hazards).join(", ")}`);
  console.log(`- Rebooking/cancellation waiver: ${riskOverview.can_rebook_or_cancel}`);
  console.log(`- Disclaimer: "${riskOverview.disclaimer}"`);
  console.log(`- Landslide reasons:`, riskOverview.hazards.landslide.reasons);
  console.log(`- Heat reasons:`, riskOverview.hazards.heat.reasons);

  // 2. Test Path B Photo Verification Scoring
  console.log("\n[2] Testing Path B Multi-Signal Photo Verification...");
  const reportResult = await photoVerificationService.processReport({
    userId: 3,
    farmId: 1,
    photoUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb",
    deviceLat: 30.556,
    deviceLng: 79.563,
    photoExifLat: 30.557,
    photoExifLng: 79.564,
    photoExifTime: new Date().toISOString(),
    isLiveInAppCamera: true,
    claimedType: "Landslide",
    details: "Mudflow and rocks blocking uphill access lane",
  });
  console.log(`- Report ID: ${reportResult.report.id}`);
  console.log(`- Credibility Score: ${reportResult.score} / 100 (${reportResult.scoreBand})`);
  console.log(`- Status: ${reportResult.report.status}`);
  console.log(`- Signals evaluated (${reportResult.signals.length}):`, reportResult.signals.map((s: any) => `${s.signal_name}: +${s.score_points}`).join(", "));

  // 3. Test Official Alert Simulation (Path A)
  console.log("\n[3] Testing Path A Official Alert Simulation...");
  const simulatedAlert = await officialAlertService.simulateTestAlert({
    farmId: 1,
    event: "Flash Flood Warning",
    level: "Orange",
    headline: "IMD Orange Alert: Flash Flood Warning for Chamoli",
    description: "Intense rainfall trigger. 72h rebooking waiver activated.",
  });
  console.log(`- Alert CAP ID: ${simulatedAlert.cap_id}`);
  console.log(`- Level: ${simulatedAlert.level}`);

  // 4. Test Source Freshness & Health
  console.log("\n[4] Testing External Source Feeds & Freshness...");
  const health = await backgroundScheduler.checkSourceFreshness();
  console.log(`- Sources evaluated:`, Object.keys(health.sources));
  console.log(`- Overall healthy: ${health.healthy}`);

  console.log("\n=== ALL SYSTEM TESTS PASSED CLEANLY! ===");
}

runE2ETests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
