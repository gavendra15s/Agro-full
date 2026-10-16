import dotenv from "dotenv";
import path from "path";

// Load from current directory and parent directory if needed
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true });
dotenv.config({ path: path.resolve(process.cwd(), "../AgroWeb/.env.local") });
dotenv.config({ path: path.resolve(process.cwd(), "../AgroWeb/.env") });

export const ENV = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 5000,
  NODE_ENV: process.env.NODE_ENV || "development",
  CLIENT_URL: process.env.CLIENT_URL || process.env.APP_URL || "http://localhost:3000",
  DB_MODE: process.env.DB_MODE || "supabase",
  SUPABASE_URL:
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    "https://placeholder-project.supabase.co",
  SUPABASE_ANON_KEY:
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_KEY ||
    "placeholder-anon-key",
  SUPABASE_SERVICE_ROLE_KEY:
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SECRET ||
    "placeholder-service-key",
  JWT_SECRET: process.env.JWT_SECRET || "super-secret-jwt-key-agrosafe-2026",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",

  // Email / SMTP Configuration
  SMTP_HOST: process.env.SMTP_HOST || "smtp.gmail.com",
  SMTP_PORT: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 465,
  SMTP_SECURE: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : true,
  SMTP_USER: process.env.SMTP_USER || "",
  SMTP_PASS: process.env.SMTP_PASS || "",
  EMAIL_FROM: process.env.EMAIL_FROM || process.env.SMTP_USER || "AgroSafe Travel <noreply@agrosafe.travel>",
  APP_URL: process.env.APP_URL || process.env.CLIENT_URL || "http://localhost:3000",

  // Admin notification recipient (payment alerts)
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || "",

  // Razorpay (test/trial mode)
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || "",
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || "",
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET || "rzp_webhook_secret_agrosafe",
};
