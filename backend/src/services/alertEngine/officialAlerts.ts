import { supabase, safeInsert } from "../../config/supabase.js";
import { OfficialAlert, AlertDelivery } from "../../types/index.js";
import { sachetAdapter } from "../../adapters/sachetAdapter.js";
import { imdAdapter } from "../../adapters/imdAdapter.js";
import { listAllFarms } from "../farmService.js";
import { createNotification } from "../notificationService.js";

export class OfficialAlertService {
  /**
   * Matches official alerts against catalog farms and dispatches targeted alerts to affected hosts & guests.
   */
  async matchAndDispatchOfficialAlerts(): Promise<{ alertsMatched: number; deliveriesSent: number }> {
    const sachetRes = await sachetAdapter.fetch();
    const alerts = sachetRes.data || [];
    const farms = await listAllFarms({});
    let totalDeliveries = 0;

    for (const alert of alerts) {
      if (alert.status === "Cancel") continue;

      for (const farm of farms) {
        const matches = sachetAdapter.matchesFarm(
          { latitude: farm.latitude, longitude: farm.longitude, district: farm.district, state: farm.state },
          alert
        );

        if (matches) {
          // Identify audience: Farm Host + Guests with active or starting bookings within alert window
          const { data: bookings } = await supabase
            .from("bookings")
            .select("*, users(id, first_name, last_name, phone_number, email)")
            .eq("farm_id", farm.id)
            .in("current_status", ["Confirmed", "Active"]);

          // 1. Dispatch to Host
          if (farm.host_id) {
            await this.recordDelivery({
              alert_id: alert.id || 1,
              recipient_id: farm.host_id,
              recipient_name: farm.users?.first_name || "Host",
              recipient_phone: farm.users?.phone_number,
              recipient_email: farm.users?.email,
              channel: "Push",
              headline: `Alert for ${farm.title}: ${alert.event}`,
              description: alert.description,
            });
            totalDeliveries++;
          }

          // 2. Dispatch to Guests
          for (const b of bookings || []) {
            if (b.users?.id) {
              await this.recordDelivery({
                alert_id: alert.id || 1,
                recipient_id: b.users.id,
                recipient_name: `${b.users.first_name} ${b.users.last_name || ""}`.trim(),
                recipient_phone: b.users.phone_number,
                recipient_email: b.users.email,
                channel: "SMS",
                headline: `Safety Advisory for your stay at ${farm.title}`,
                description: `${alert.headline} (${alert.source}, valid until ${new Date(alert.expires).toLocaleDateString()}). Tap link in app to check in with "I'm safe".`,
              });
              totalDeliveries++;
            }
          }
        }
      }
    }

    return { alertsMatched: alerts.length, deliveriesSent: totalDeliveries };
  }

  private async recordDelivery(params: {
    alert_id: number | string;
    recipient_id: number;
    recipient_name: string;
    recipient_phone?: string;
    recipient_email?: string;
    channel: "Push" | "SMS" | "WhatsApp" | "Email";
    headline: string;
    description: string;
  }): Promise<void> {
    // Record in alert_deliveries
    await safeInsert("alert_deliveries", {
      alert_id: typeof params.alert_id === "number" ? params.alert_id : 1,
      recipient_id: params.recipient_id,
      recipient_name: params.recipient_name,
      recipient_phone: params.recipient_phone,
      recipient_email: params.recipient_email,
      channel: params.channel,
      status: "delivered",
      is_safe_acked: false,
      dispatched_at: new Date().toISOString(),
    });

    // Also trigger in-app notification
    await createNotification({
      user_id: params.recipient_id,
      notification_type: params.channel === "SMS" ? "SMS" : "Push",
      title: params.headline,
      message_content: params.description,
      severity: "warning",
    });
  }

  /**
   * "I'm safe" acknowledgement handler for guests and hosts.
   */
  async acknowledgeSafeStatus(deliveryOrAlertId: number | string, userId: number): Promise<boolean> {
    const nowIso = new Date().toISOString();
    const query = supabase
      .from("alert_deliveries")
      .update({ is_safe_acked: true, acked_at: nowIso })
      .eq("recipient_id", userId);

    if (typeof deliveryOrAlertId === "number" || /^\d+$/.test(String(deliveryOrAlertId))) {
      await query.eq("id", Number(deliveryOrAlertId));
    } else {
      await query.select();
    }
    return true;
  }

  /**
   * Safe Simulation Mode for Hackathon / Pitch demos (Section 5 of 05_alerts_and_report_verification.md).
   * Generates a realistic test alert explicitly tagged with "TEST".
   */
  async simulateTestAlert(params: {
    farmId: number;
    event?: string;
    level?: "Yellow" | "Orange" | "Red";
    headline?: string;
    description?: string;
  }): Promise<OfficialAlert> {
    const testCapId = `TEST-SACHET-${Date.now()}`;
    const level = params.level || "Orange";
    const levelCode = level === "Red" ? 3 : level === "Orange" ? 2 : 1;

    const { data: farm } = await supabase.from("farms").select("*").eq("id", params.farmId).single();
    const district = farm?.district || "Chamoli";
    const state = farm?.state || "Uttarakhand";

    const testAlert: OfficialAlert = {
      cap_id: testCapId,
      source: "SACHET",
      event: params.event || "[TEST] Extreme Rainfall & Slope Movement Simulation",
      level,
      level_code: levelCode,
      district_name: district,
      state,
      headline: params.headline || `[TEST SIMULATION] Orange Alert Issued for ${district} Sector`,
      description:
        params.description ||
        `This is a simulated disaster exercise to verify multi-channel dispatch, guest notification, and "I'm safe" response workflow. No real danger.`,
      effective: new Date().toISOString(),
      expires: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      status: "Test",
      polygon_coordinates: farm?.latitude && farm?.longitude
        ? [
            [farm.longitude - 0.1, farm.latitude - 0.1],
            [farm.longitude + 0.1, farm.latitude - 0.1],
            [farm.longitude + 0.1, farm.latitude + 0.1],
            [farm.longitude - 0.1, farm.latitude + 0.1],
            [farm.longitude - 0.1, farm.latitude - 0.1],
          ]
        : undefined,
    };

    // Save into official_alerts with Test status
    const { data: savedAlert } = await safeInsert<OfficialAlert>("official_alerts", testAlert);

    // Also mirror to active warnings with Test flag for UI demonstration
    await safeInsert("warnings", {
      warning_code: `TEST-${Math.floor(Math.random() * 9000 + 1000)}`,
      warning_source: "Simulation_Test",
      farm_id: params.farmId,
      title: testAlert.headline,
      description: testAlert.description,
      severity: level === "Red" ? "Critical" : "High",
      epicenter_lat: farm?.latitude || 30.556,
      epicenter_lng: farm?.longitude || 79.563,
      impact_radius_km: 15.0,
      issued_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      status: "Active",
    });

    return savedAlert || testAlert;
  }
}

export const officialAlertService = new OfficialAlertService();
