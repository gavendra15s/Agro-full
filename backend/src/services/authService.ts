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
