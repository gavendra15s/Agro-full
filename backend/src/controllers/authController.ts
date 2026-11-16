import { Request, Response } from "express";
import {
  registerUser,
  loginUser,
  verifyUserEmail,
  resendUserVerification,
  getPlatformStats,
  listAllHosts,
  createHostAccount,
  verifyHostAccount,
} from "../services/authService.js";
import { AuthenticatedRequest } from "../middleware/auth.js";

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { user_type, first_name, last_name, email, password, phone_number } = req.body;
    if (!first_name || !last_name || !email || !password) {
      res.status(400).json({ success: false, error: "Missing required registration fields" });
      return;
    }

    if (user_type === "admin") {
      res.status(403).json({
        success: false,
        error: "Admin accounts cannot be registered publicly. System administrator access required.",
      });
      return;
    }

    if (user_type && user_type !== "guest" && user_type !== "host") {
      res.status(400).json({
        success: false,
        error: "Invalid account type. Only 'guest' or 'host' accounts can be registered.",
      });
      return;
    }

    const result = await registerUser({
      user_type: (user_type as "guest" | "host") || "guest",
      first_name,
      last_name,
      email,
      password,
      phone_number,
    });

    res.status(201).json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || "Registration failed" });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ success: false, error: "Email and password are required" });
      return;
    }

    const result = await loginUser({ email, password });
    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    res.status(401).json({ success: false, error: err.message || "Invalid email or password" });
  }
};

export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = (req.query.token as string) || req.body?.token;
    if (!token) {
      res.status(400).json({ success: false, error: "Verification token is required" });
      return;
    }

    const result = await verifyUserEmail(token);
    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || "Verification failed" });
  }
};

export const resendVerification = async (req: Request, res: Response): Promise<void> => {
  try {
    const email = req.body?.email || (req.query?.email as string);
    if (!email) {
      res.status(400).json({ success: false, error: "Email address is required" });
      return;
    }

    const result = await resendUserVerification(email);
    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || "Could not resend verification email" });
  }
};

export const me = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    res.status(200).json({ success: true, data: req.user });
  } catch (err: any) {
    res.status(401).json({ success: false, error: "Unauthorized" });
  }
};

export const getStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const stats = await getPlatformStats();
    res.status(200).json({ success: true, data: stats });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Failed to retrieve stats" });
  }
};

export const getHosts = async (_req: Request, res: Response): Promise<void> => {
  try {
    const hosts = await listAllHosts();
    res.status(200).json({ success: true, count: hosts.length, data: hosts });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Failed to retrieve hosts" });
  }
};

export const createHost = async (req: Request, res: Response): Promise<void> => {
  try {
    const { first_name, last_name, email, phone_number, password, is_verified } = req.body;
    if (!first_name || !last_name || !email) {
      res.status(400).json({ success: false, error: "First name, last name, and email are required." });
      return;
    }
    const host = await createHostAccount({
      first_name,
      last_name,
      email,
      phone_number,
      password,
      is_verified,
    });
    res.status(201).json({ success: true, data: host });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || "Failed to create farm owner" });
  }
};

export const toggleHostVerification = async (req: Request, res: Response): Promise<void> => {
  try {
    const hostId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { is_verified } = req.body;
    if (typeof is_verified !== "boolean") {
      res.status(400).json({ success: false, error: "is_verified boolean is required." });
      return;
    }
    const updated = await verifyHostAccount(hostId, is_verified);
    res.status(200).json({ success: true, data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || "Failed to update host status" });
  }
};
