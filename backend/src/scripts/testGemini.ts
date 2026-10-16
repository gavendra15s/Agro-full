import dotenv from "dotenv";
dotenv.config();

import { aiVisionService } from "../services/alertEngine/aiVision.js";

async function test() {
  console.log("Checking GEMINI_API_KEY in backend/.env...");
  const rawKey = process.env.GEMINI_API_KEY || "";
  if (!rawKey) {
    console.error("❌ GEMINI_API_KEY is not found or empty in backend/.env");
    process.exit(1);
  }

  const masked = rawKey.substring(0, 6) + "..." + rawKey.substring(rawKey.length - 4);
  console.log(`Found key: ${masked} (Length: ${rawKey.length})`);

  console.log("\nTesting Gemini 1.5 Flash Vision classification with base64 photo...");
  
  // A valid base64 encoded photo data URI
  const testBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  
  const startTime = Date.now();
  const result = await aiVisionService.classifyHazardPhoto(testBase64, "landslide");
  const elapsed = Date.now() - startTime;

  console.log(`\nExecution time: ${elapsed}ms`);
  console.log("Model Source:", result.model_source);
  console.log("Hazard Detected:", result.hazard_detected);
  console.log("Detected Hazards:", result.detected_hazards);
  console.log("Aligns with Claim:", result.aligns_with_claim);
  console.log("Confidence Score:", result.confidence_score);
  console.log("Visual Reason:", result.visual_reason);
  console.log("Is Spam / Irrelevant:", result.is_irrelevant_or_spam);

  if (result.model_source.includes("Gemini")) {
    console.log("\n✅ SUCCESS: Google Gemini 1.5 Flash Vision is active and responding!");
  } else {
    console.log("\n⚠️ NOTE: Returned fallback source:", result.model_source);
  }
}

test().catch((err) => {
  console.error("Test error:", err);
});
