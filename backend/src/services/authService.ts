import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { supabase, safeInsert } from "../config/supabase.js";
import { ENV } from "../config/env.js";
import { User } from "../types/index.js";
import { sendVerificationEmail } from "./emailService.js";

export function createVerificationToken(userId: number | string, email: string): string {
  return jwt.sign(
    { userId, email, purpose: "email_verification" },
    ENV.JWT_SECRET,
    { expiresIn: "24h" }
  );
}

export const registerUser = async (data: {
  user_type: "guest" | "host";
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  phone_number?: string;
}) => {
  if ((data.user_type as string) === "admin") {
    throw new Error("Admin accounts cannot be registered publicly. System administrator access required.");
  }
  if (data.user_type !== "guest" && data.user_type !== "host") {
    throw new Error("Invalid user type. Only 'guest' and 'host' registrations are allowed.");
  }

  const lowerEmail = data.email.toLowerCase().trim();
  const password_hash = await bcrypt.hash(data.password, 10);

  const { data: createdUser, error } = await safeInsert<User>("users", {
    user_type: data.user_type,
    first_name: data.first_name.trim(),
    last_name: data.last_name.trim(),
    email: lowerEmail,
    password_hash,
    phone_number: data.phone_number?.trim() || null,
    is_verified: false,
  });

  if (error) {
    console.error("[Supabase safeInsert error in register]:", error);
    if (error.code === "23505" && String(error.message).includes("users_email")) {
      throw new Error("Email already registered");
    }
    const rawMsg = String(error.message || "");
    const cleanMsg = rawMsg.includes("<html") || rawMsg.includes("<!DOCTYPE")
      ? "Database connection failed. Please verify Supabase credentials in .env."
      : rawMsg || "Failed to register user in database";
    throw new Error(cleanMsg);
  }

  if (!createdUser) throw new Error("Could not create user account");

  // Generate Email Verification Token & Dispatch Email
  const verifyToken = createVerificationToken(createdUser.id, createdUser.email);
  try {
    await sendVerificationEmail(createdUser.email, createdUser.first_name, verifyToken);
  } catch (emailErr: any) {
    console.warn("[Auth] Could not send verification email:", emailErr.message);
  }

  // Strictly DO NOT return session token until email is verified
  return {
    user: {
      id: createdUser.id,
      email: createdUser.email,
      first_name: createdUser.first_name,
      last_name: createdUser.last_name,
      user_type: createdUser.user_type,
      phone_number: createdUser.phone_number,
      is_verified: false,
    },
    requiresVerification: true,
    verificationToken: verifyToken,
    message: "Registration successful! Please check your email to verify your account before logging in.",
  };
};

export const verifyUserEmail = async (token: string) => {
  let decoded: any;
  try {
    decoded = jwt.verify(token, ENV.JWT_SECRET);
  } catch (err: any) {
    throw new Error("Verification link is invalid or has expired.");
  }

  if (decoded.purpose !== "email_verification" || !decoded.email) {
    throw new Error("Invalid verification token.");
  }

  const lowerEmail = String(decoded.email).toLowerCase();

  const { data: updated, error } = await supabase
    .from("users")
    .update({ is_verified: true, updated_at: new Date().toISOString() })
    .eq("email", lowerEmail)
    .select("id, email, first_name, last_name, user_type, is_verified")
    .single();

  if (error || !updated) {
    throw new Error("User account not found or could not be verified.");
  }

  return {
    success: true,
    message: "Email address verified successfully! You can now log in.",
    user: updated,
  };
};

export const resendUserVerification = async (email: string) => {
  const lowerEmail = email.toLowerCase().trim();

  const { data: user } = await supabase
    .from("users")
    .select("*")
    .eq("email", lowerEmail)
    .single();

  if (!user) {
    throw new Error("No account found with this email address.");
  }

  if (user.is_verified) {
    return {
      success: true,
      alreadyVerified: true,
      message: "Your email is already verified. You can proceed to log in.",
    };
  }

  const verifyToken = createVerificationToken(user.id, user.email);
  const emailRes = await sendVerificationEmail(user.email, user.first_name, verifyToken);

  return {
    success: true,
    simulated: emailRes.simulated,
    verificationToken: verifyToken,
    verificationUrl: emailRes.verificationUrl,
    message: emailRes.simulated
      ? "Dev Mode: Verification link generated and logged to the backend console."
      : "Verification email re-sent. Please check your inbox and spam folder.",
  };
};

export const loginUser = async (data: { email: string; password: string }) => {
  const lowerEmail = data.email.toLowerCase().trim();

  const { data: user, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", lowerEmail)
    .single();

  if (error || !user) throw new Error("Invalid email or password");

  const match = await bcrypt.compare(data.password, user.password_hash);
  if (!match) throw new Error("Invalid email or password");

  // STRICT BLOCK: Unverified accounts cannot log in
  if (!user.is_verified) {
    throw new Error("Please verify your email address before logging in. Check your inbox for the verification link.");
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, user_type: user.user_type },
    ENV.JWT_SECRET,
    { expiresIn: ENV.JWT_EXPIRES_IN as any }
  );

  return {
    user: {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      user_type: user.user_type,
      phone_number: user.phone_number,
      is_verified: user.is_verified,
    },
    token,
  };
};

/** Get live platform statistics for public counter & dashboard */
export const getPlatformStats = async () => {
  const [usersRes, farmsRes, warningsRes, bookingsRes] = await Promise.all([
    supabase.from("users").select("id, user_type"),
    supabase.from("farms").select("id, district"),
    supabase.from("warnings").select("id").eq("status", "Active"),
    supabase.from("bookings").select("id"),
  ]);

  const users = usersRes.data || [];
  const totalUsers = users.length;
  const guestsCount = users.filter((u: any) => u.user_type === "guest").length;
  const hostsCount = users.filter((u: any) => u.user_type === "host").length;
  const adminsCount = users.filter((u: any) => u.user_type === "admin").length;

  const farms = farmsRes.data || [];
  const totalFarms = farms.length;

  const warnings = warningsRes.data || [];
  const activeWarnings = warnings.length;

  const bookings = bookingsRes.data || [];
  const totalBookings = bookings.length;

  // Real distinct monitored districts from actual farms in database
  const uniqueDistricts = new Set(
    farms.map((f: any) => f.district?.trim()).filter(Boolean)
  );
  const monitoredDistricts = uniqueDistricts.size;

  return {
    totalUsers,
    guestsCount,
    hostsCount,
    adminsCount,
    totalFarms,
    activeWarnings,
    totalBookings,
    monitoredDistricts,
  };
};

/** List all registered farm owners (hosts) along with their farm stays */
export const listAllHosts = async () => {
  const { data, error } = await supabase
    .from("users")
    .select(`
      id,
      first_name,
      last_name,
      email,
      phone_number,
      user_type,
      is_verified,
      created_at,
      farms (
        id,
        slug,
        title,
        category,
        state,
        district,
        subdistrict,
        nightly_rate,
        max_guests,
        images,
        created_at
      )
    `)
    .eq("user_type", "host")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[listAllHosts error]:", error);
    throw new Error(error.message);
  }

  return (data || []).map((h: any) => ({
    ...h,
    farms: Array.isArray(h.farms) ? h.farms : [],
  }));
};

/** Create a host/farm owner account directly (e.g. from admin panel) */
export const createHostAccount = async (data: {
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string;
  password?: string;
  is_verified?: boolean;
}) => {
  const lowerEmail = data.email.toLowerCase().trim();
  const rawPassword = data.password?.trim() || "HostSafe@" + Math.floor(1000 + Math.random() * 9000);
  const password_hash = await bcrypt.hash(rawPassword, 10);

  const { data: createdUser, error } = await safeInsert<User>("users", {
    user_type: "host",
    first_name: data.first_name.trim(),
    last_name: data.last_name.trim(),
    email: lowerEmail,
    password_hash,
    phone_number: data.phone_number?.trim() || null,
    is_verified: data.is_verified ?? true,
  });

  if (error) {
    if (error.code === "23505" || String(error.message).includes("users_email")) {
      throw new Error("A user with this email address already exists.");
    }
    throw new Error(error.message || "Failed to create farm owner account");
  }

  return {
    ...createdUser,
    farms: [],
    temporaryPassword: data.password ? undefined : rawPassword,
  };
};

/** Toggle or update verification status of a host account */
export const verifyHostAccount = async (hostId: number | string, is_verified: boolean) => {
  const { data: updated, error } = await supabase
    .from("users")
    .update({ is_verified, updated_at: new Date().toISOString() })
    .eq("id", Number(hostId))
    .select("id, email, first_name, last_name, user_type, is_verified, phone_number, created_at")
    .single();

  if (error || !updated) {
    throw new Error(error?.message || "Could not update host verification status.");
  }

  return updated;
};
