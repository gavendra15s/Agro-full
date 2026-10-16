import nodemailer, { type Transporter } from "nodemailer";
import { ENV } from "../config/env.js";

// Initialize Transporter
let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (transporter) return transporter;

  if (!ENV.SMTP_USER || !ENV.SMTP_PASS) {
    console.warn("[Email] SMTP credentials not set in .env (SMTP_USER / SMTP_PASS). Emails will be logged to console.");
    return null;
  }

  transporter = nodemailer.createTransport({
    host: ENV.SMTP_HOST,
    port: ENV.SMTP_PORT,
    secure: ENV.SMTP_SECURE,
    auth: {
      user: ENV.SMTP_USER,
      pass: ENV.SMTP_PASS,
    },
  });

  return transporter;
}

function formatINR(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function emailShell(title: string, bodyHtml: string): string {
  return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7faf7; margin: 0; padding: 24px; color: #1c2e24; }
            .container { max-width: 520px; margin: 0 auto; background: #ffffff; border: 1px solid #e1ebe3; border-radius: 12px; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
            .logo { font-size: 20px; font-weight: 800; color: #1b633e; margin-bottom: 24px; display: inline-block; text-decoration: none; }
            h1 { font-size: 22px; font-weight: 800; color: #0d1b13; margin-top: 0; }
            p { font-size: 15px; line-height: 1.6; color: #3e5649; }
            .btn { display: inline-block; background-color: #1b633e; color: #ffffff !important; font-weight: 700; font-size: 15px; text-decoration: none; padding: 12px 28px; border-radius: 8px; margin: 20px 0; }
            .footer { margin-top: 32px; border-top: 1px solid #e1ebe3; padding-top: 16px; font-size: 12px; color: #739180; }
            .alt-link { word-break: break-all; font-size: 13px; color: #1b633e; }
            .detail-table { width: 100%; border-collapse: collapse; margin: 16px 0; }
            .detail-table td { padding: 6px 0; font-size: 14px; color: #3e5649; border-bottom: 1px solid #eef3ef; }
            .detail-table td:first-child { font-weight: 600; color: #1c2e24; width: 40%; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">AgroSafe Travel</div>
            <h1>${title}</h1>
            ${bodyHtml}
            <div class="footer">
              <p>AgroSafe Travel — Himalayan Agrotourism & Disaster Alert Escrow System.</p>
            </div>
          </div>
        </body>
      </html>
    `;
}

async function dispatchEmail(mailOptions: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<{ success: boolean; messageId?: string; simulated?: boolean }> {
  const full = { from: ENV.EMAIL_FROM, ...mailOptions };
  const client = getTransporter();

  if (!client) {
    console.log("==================================================");
    console.log("[SIMULATED EMAIL DISPATCH]");
    console.log(`To: ${full.to}`);
    console.log(`Subject: ${full.subject}`);
    console.log(full.text);
    console.log("==================================================");
    return { success: true, simulated: true };
  }

  try {
    const info = await client.sendMail(full);
    console.log(`[Email Sent] "${full.subject}" sent to ${full.to} (Message ID: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error(`[Email Error] Failed to send "${full.subject}" to ${full.to}:`, err.message);
    throw new Error(`Email delivery failed: ${err.message}`);
  }
}

export async function sendVerificationEmail(
  email: string,
  firstName: string,
  token: string
): Promise<{ success: boolean; messageId?: string; simulated?: boolean }> {
  const verifyUrl = `${ENV.APP_URL}/login?verify_token=${encodeURIComponent(token)}`;

  const text = `Hello ${firstName},\n\nPlease verify your email for AgroSafe Travel by clicking this link:\n${verifyUrl}\n\nThis link will expire in 24 hours.\n\nSafe travels,\nAgroSafe Team`;

  const html = emailShell(
    "Verify your email address",
    `
      <p>Hi ${firstName},</p>
      <p>Thank you for joining AgroSafe Travel. Click the button below to verify your email and activate your account:</p>
      <div style="text-align: center;">
        <a href="${verifyUrl}" class="btn" target="_blank">Verify My Account</a>
      </div>
      <p style="font-size: 13px; color: #5a7566;">Or copy and paste this link in your browser:</p>
      <p class="alt-link">${verifyUrl}</p>
      <p style="font-size: 13px; color: #5a7566;">This verification link will expire in 24 hours. If you did not create an account on AgroSafe Travel, please ignore this email.</p>
    `
  );

  return dispatchEmail({
    to: email,
    subject: "Verify your email — AgroSafe Travel",
    text,
    html,
  });
}

export async function sendHostBookingEmail(
  hostEmail: string,
  hostName: string,
  details: {
    guestName: string;
    farmTitle: string;
    bookingCode: string;
    stayStartDate: string;
    stayEndDate: string;
    totalGuests: number;
    stayAmount: number;
  }
): Promise<{ success: boolean; messageId?: string; simulated?: boolean }> {
  const dashboardUrl = `${ENV.APP_URL}/host`;
  const amount = formatINR(details.stayAmount);

  const text = `Hello ${hostName},\n\n${details.guestName} just booked "${details.farmTitle}" for ${details.stayStartDate} to ${details.stayEndDate} (${details.totalGuests} guest(s)).\n\nBooking Ref: ${details.bookingCode}\nStay Amount: ${amount} (held in AgroSafe Escrow until checkout)\n\nView it in your Host Dashboard:\n${dashboardUrl}\n\nSafe travels,\nAgroSafe Team`;

  const html = emailShell(
    "Your farmstay was booked",
    `
      <p>Hi ${hostName},</p>
      <p><strong>${details.guestName}</strong> just booked <strong>${details.farmTitle}</strong>. Funds are already locked in the AgroSafe Escrow Vault and will be released to you after checkout.</p>
      <table class="detail-table">
        <tr><td>Booking Ref</td><td>${details.bookingCode}</td></tr>
        <tr><td>Check-in</td><td>${details.stayStartDate}</td></tr>
        <tr><td>Check-out</td><td>${details.stayEndDate}</td></tr>
        <tr><td>Guests</td><td>${details.totalGuests}</td></tr>
        <tr><td>Stay Amount</td><td>${amount}</td></tr>
      </table>
      <div style="text-align: center;">
        <a href="${dashboardUrl}" class="btn" target="_blank">View in Host Dashboard</a>
      </div>
    `
  );

  return dispatchEmail({
    to: hostEmail,
    subject: `New Booking: ${details.farmTitle} (${details.bookingCode})`,
    text,
    html,
  });
}

export async function sendAdminPaymentEmail(details: {
  bookingCode: string;
  paymentCode: string;
  guestName: string;
  guestEmail: string;
  hostName: string;
  farmTitle: string;
  totalCharged: number;
  gatewayRef: string;
  cab?: { pickupLocation: string; pincode: string };
}): Promise<{ success: boolean; messageId?: string; simulated?: boolean } | null> {
  if (!ENV.ADMIN_EMAIL) {
    console.warn("[Email] ADMIN_EMAIL not set in .env — skipping admin payment notification.");
    return null;
  }

  const amount = formatINR(details.totalCharged);
  const escrowUrl = `${ENV.APP_URL}/escrow`;

  const cabText = details.cab
    ? `\n\nCab Requested:\nPickup Location: ${details.cab.pickupLocation}\nPIN Code: ${details.cab.pincode}`
    : "";

  const text = `Payment captured on AgroSafe Travel.\n\nBooking Ref: ${details.bookingCode}\nPayment Ref: ${details.paymentCode}\nFarm: ${details.farmTitle}\nHost: ${details.hostName}\nGuest: ${details.guestName} (${details.guestEmail})\nAmount Charged: ${amount}\nGateway Ref: ${details.gatewayRef}${cabText}\n\nFunds are held in escrow pending stay completion.\n\nEscrow Ledger:\n${escrowUrl}`;

  const cabHtml = details.cab
    ? `
      <p style="margin-top: 24px;"><strong>Cab Requested</strong></p>
      <table class="detail-table">
        <tr><td>Pickup Location</td><td>${details.cab.pickupLocation}</td></tr>
        <tr><td>PIN Code</td><td>${details.cab.pincode}</td></tr>
      </table>
    `
    : "";

  const html = emailShell(
    "Payment captured",
    `
      <p>A new payment was captured and locked in escrow.</p>
      <table class="detail-table">
        <tr><td>Booking Ref</td><td>${details.bookingCode}</td></tr>
        <tr><td>Payment Ref</td><td>${details.paymentCode}</td></tr>
        <tr><td>Farm</td><td>${details.farmTitle}</td></tr>
        <tr><td>Host</td><td>${details.hostName}</td></tr>
        <tr><td>Guest</td><td>${details.guestName} (${details.guestEmail})</td></tr>
        <tr><td>Amount Charged</td><td>${amount}</td></tr>
        <tr><td>Gateway Ref</td><td>${details.gatewayRef}</td></tr>
      </table>
      ${cabHtml}
      <div style="text-align: center;">
        <a href="${escrowUrl}" class="btn" target="_blank">Open Escrow Ledger</a>
      </div>
    `
  );

  return dispatchEmail({
    to: ENV.ADMIN_EMAIL,
    subject: `Payment Captured: ${details.bookingCode}${details.cab ? " + Cab" : ""} — ${amount}`,
    text,
    html,
  });
}
