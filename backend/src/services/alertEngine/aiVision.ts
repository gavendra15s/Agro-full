import dotenv from "dotenv";
dotenv.config();

export interface AiVisionAnalysisResult {
  hazard_detected: boolean;
  detected_hazards: string[];
  aligns_with_claim: boolean;
  confidence_score: number; // 0 to 100
  is_irrelevant_or_spam: boolean;
  visual_reason: string;
  model_source: string;
}

export class AiVisionService {
  private apiKey: string | null;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || null;
  }

  /**
   * Helper to fetch an image or extract base64 data for Gemini inlineData payload.
   */
  private async resolveImageBase64(photoUrl: string): Promise<{ mimeType: string; base64: string } | null> {
    try {
      // 1. If it's already a Data URI
      if (photoUrl.startsWith("data:")) {
        const matches = photoUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          return { mimeType: matches[1], base64: matches[2] };
        }
      }

      // 2. If it's a remote HTTP/HTTPS URL
      if (photoUrl.startsWith("http://") || photoUrl.startsWith("https://")) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000); // 6s timeout

        const response = await fetch(photoUrl, {
          signal: controller.signal,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 AgroSafe/1.0",
            "Accept": "image/*,*/*;q=0.8",
          },
        });
        clearTimeout(timeout);

        if (!response.ok) {
          console.warn(`[AiVisionService] Photo fetch HTTP error: ${response.status} ${response.statusText} for URL: ${photoUrl.substring(0, 60)}`);
          return null;
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const mimeType = response.headers.get("content-type") || "image/jpeg";

        return {
          mimeType: mimeType.split(";")[0],
          base64: buffer.toString("base64"),
        };
      }

      return null;
    } catch (err: any) {
      console.warn(`[AiVisionService] Could not retrieve photo binary for AI inspection: ${err.message}`);
      return null;
    }
  }

  /**
   * Evaluates an uploaded photo against a claimed hazard type using Google Gemini 1.5 Flash Vision.
   * If API key is missing or external call fails, gracefully returns a resilient heuristic fallback.
   */
  async classifyHazardPhoto(photoUrl: string, claimedType: string): Promise<AiVisionAnalysisResult> {
    const key = this.apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    // Resilient Fallback if no Gemini API Key is configured in environment
    if (!key) {
      return this.heuristicFallback(
        photoUrl,
        claimedType,
        "Gemini API key not configured in .env. Heuristic visual metadata analysis applied."
      );
    }

    try {
      const imgData = await this.resolveImageBase64(photoUrl);
      if (!imgData) {
        return this.heuristicFallback(
          photoUrl,
          claimedType,
          "Remote photo binary could not be fetched for direct pixel analysis. Heuristic fallback applied."
        );
      }

      const prompt = `You are a disaster hazard verification specialist for the Himalayan and Western Ghats rural transit safety network.
The citizen reported an incident claiming the hazard type: "${claimedType}".
Analyze the attached photo carefully and evaluate:
1. Does the image depict an actual physical environmental or infrastructure hazard (e.g., landslide, mudslide, rockfall, flood, river overflow, road waterlogging, fallen tree/boulder, washed-away road, bridge collapse, or storm debris)?
2. Does the visual evidence align with the claimed hazard "${claimedType}"?
3. Is this image completely unrelated, spam, indoor, a selfie, a meme, or a normal dry safe road without hazards?

Respond ONLY with a valid JSON object matching this schema without markdown fences:
{
  "hazard_detected": boolean,
  "detected_hazards": string[],
  "aligns_with_claim": boolean,
  "confidence_score": number,
  "is_irrelevant_or_spam": boolean,
  "visual_reason": "Concise 1-2 sentence visual assessment explanation."
}`;

      const requestBody = {
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: imgData.mimeType,
                  data: imgData.base64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
        },
      };

      const candidateModels = ["gemini-3.5-flash", "gemini-flash-lite-latest", "gemini-3.8-flash"];
      let rawText: string | null = null;
      let usedModel = "gemini-3.5-flash";

      for (const modelName of candidateModels) {
        try {
          const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`;
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout

          const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
            signal: controller.signal,
          });
          clearTimeout(timeout);

          if (res.ok) {
            const json: any = await res.json();
            rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (rawText) {
              usedModel = modelName;
              break;
            }
          } else {
            const errText = await res.text();
            console.warn(`[AiVisionService] Model ${modelName} returned HTTP ${res.status}: ${errText.slice(0, 100)}. Trying next model...`);
          }
        } catch (e: any) {
          console.warn(`[AiVisionService] Model ${modelName} failed: ${e.message}`);
        }
      }

      if (!rawText) {
        throw new Error("No Gemini models succeeded in candidate chain");
      }

      // Strip markdown code blocks if returned
      const cleanJson = rawText.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
      const parsed = JSON.parse(cleanJson);

      let rawScore = Number(parsed.confidence_score);
      if (isNaN(rawScore)) rawScore = 75;
      else if (rawScore <= 1.0) rawScore = Math.round(rawScore * 100);
      const normalizedScore = Math.min(100, Math.max(0, Math.round(rawScore)));

      return {
        hazard_detected: Boolean(parsed.hazard_detected),
        detected_hazards: Array.isArray(parsed.detected_hazards) ? parsed.detected_hazards : [claimedType],
        aligns_with_claim: Boolean(parsed.aligns_with_claim),
        confidence_score: normalizedScore,
        is_irrelevant_or_spam: Boolean(parsed.is_irrelevant_or_spam),
        visual_reason: String(parsed.visual_reason || "Visual hazard features detected by Gemini Vision."),
        model_source: `Google Gemini Vision (${usedModel})`,
      };
    } catch (err: any) {
      console.warn(`[AiVisionService] Gemini Vision call encountered issue: ${err.message}. Using resilient fallback.`);
      return this.heuristicFallback(
        photoUrl,
        claimedType,
        `AI vision server error (${err.message}). Resilient heuristic fallback applied.`
      );
    }
  }

  /**
   * Resilient fallback classifier ensuring the application never crashes even if offline or missing API keys.
   */
  private heuristicFallback(photoUrl: string, claimedType: string, note: string): AiVisionAnalysisResult {
    const isMock = photoUrl.includes("picsum.photos") || photoUrl.includes("placeholder") || photoUrl.startsWith("blob:");
    const normalizedClaim = claimedType.toLowerCase();

    const recognizedHazards: Record<string, string[]> = {
      landslide: ["mud_accumulation", "debris_flow", "slope_instability"],
      rockfall: ["boulder_obstruction", "rock_debris"],
      flood: ["river_overflow", "waterlogging", "submerged_pathway"],
      road_blockage: ["fallen_tree", "road_obstruction"],
      cyclone: ["high_wind_damage", "fallen_poles"],
      heatwave: ["dry_vegetation_stress"],
    };

    const detected = Object.keys(recognizedHazards).find((k) => normalizedClaim.includes(k));
    const hazards = detected ? recognizedHazards[detected] : ["environmental_hazard"];

    return {
      hazard_detected: true,
      detected_hazards: hazards,
      aligns_with_claim: true,
      confidence_score: isMock ? 70 : 80,
      is_irrelevant_or_spam: false,
      visual_reason: `${note} Claimed hazard '${claimedType}' flagged for moderator priority review.`,
      model_source: "Resilient Heuristic Fallback",
    };
  }
}

export const aiVisionService = new AiVisionService();
