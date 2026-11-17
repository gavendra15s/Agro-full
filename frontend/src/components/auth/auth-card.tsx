"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  CheckCircle2,
  Lock,
  Mail,
  RefreshCw,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { toast } from "@/lib/toast-context";
import { cn } from "@/lib/utils";

type Tab = "login" | "signup";
type Role = "guest" | "host" | "admin";

export function AuthCard({ initialRole = "guest" }: { initialRole?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, register, logout } = useAuth();

  // Role can come from props or search param query
  const queryRole = searchParams.get("role");
  const [role, setRole] = useState<Role>(
    queryRole === "admin" || initialRole === "admin"
      ? "admin"
      : queryRole === "host" || initialRole === "host"
      ? "host"
      : "guest"
  );
  const [tab, setTab] = useState<Tab>("login");

  // Form states
  const [form, setForm] = useState({
    name: "",
    farmName: "",
    location: "",
    phone: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [verificationPendingEmail, setVerificationPendingEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  // Sync role state if URL param changes
  useEffect(() => {
    if (queryRole === "host" || queryRole === "guest") {
      setRole(queryRole);
    }
  }, [queryRole]);

  // Handle verify_token query param if user clicked email verification link
  useEffect(() => {
    const verifyToken = searchParams.get("verify_token") || searchParams.get("token");
    if (verifyToken) {
      setLoading(true);
      api.auth
        .verifyEmail(verifyToken)
        .then((res) => {
          if (res.success) {
            toast.success(res.message || "Email verified! You can now log in.", "Email Verified");
            setTab("login");
            setVerificationPendingEmail(null);
            router.replace("/login", { scroll: false });
          } else {
            toast.error(res.error || "Email verification link is invalid or expired.", "Verification Failed");
          }
        })
        .catch((err) => {
          toast.error(err.message || "Verification failed", "Verification Error");
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [searchParams, router]);

  const handleRoleChange = (newRole: Role) => {
    setRole(newRole);
    if (newRole === "admin") {
      setTab("login");
    }
    setError("");
    setDone(false);
    setVerificationPendingEmail(null);
    router.replace(`/login?role=${newRole}`, { scroll: false });
  };

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [key]: e.target.value });

  // Never let a stale ?redirect= param send someone into a portal their account
  // doesn't belong to (e.g. a farmer bounced off /admin earlier, then logging
  // in as a host from that same tab).
  function redirectTargetFor(userType: Role | string, requested: string | null) {
    const home = userType === "admin" ? "/admin" : userType === "host" ? "/host" : "/";
    if (!requested) return home;
    if (requested.startsWith("/admin") && userType !== "admin") return home;
    if (requested.startsWith("/host") && userType !== "host") return home;
    return requested;
  }

  function roleLabel(r: string) {
    return r === "admin" ? "Admin" : r === "host" ? "Farm Host" : "Traveler";
  }

  function validate() {
    if (!form.email.trim()) {
      return "Please enter your email address.";
    }
    if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(form.email)) {
      return "Please enter a valid email address.";
    }
    if (form.password.length < 6) {
      return "Password must be at least 6 characters.";
    }
    if (tab === "signup") {
      if (!form.name.trim()) return "Please enter your full name.";
      if (role === "host" && !form.farmName.trim()) return "Please enter your farmstay / estate name.";
      if (form.password !== form.confirm) return "Passwords do not match.";
    }
    return "";
  }

  async function handleResendVerification(emailToResend: string) {
    if (!emailToResend) return;
    setResending(true);
    try {
      const res = await api.auth.resendVerification(emailToResend);
      if (res.success) {
        toast.success("Verification link re-sent! Check your inbox.", "Email Dispatched");
      } else {
        toast.error(res.error || "Failed to resend email", "Rate Limit");
      }
    } catch (err: any) {
      toast.error(err.message || "Could not resend email", "Error");
    } finally {
      setResending(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const message = validate();
    setError(message);
    if (message) {
      toast.error(message, "Validation Error");
      return;
    }

    setLoading(true);
    try {
      if (tab === "login") {
        const res = await login(form.email, form.password);
        if (!res.success) {
          const errMsg = res.error || "Invalid email or password";
          setError(errMsg);
          toast.error(errMsg, "Sign In Failed");
          return;
        }

        // Account is real, but not for the portal the user picked (Traveler/Host/Admin
        // tab). Reject at the UI boundary — don't let a guest end up inside /host, etc.
        const actualType = res.user?.user_type;
        if (actualType && actualType !== role) {
          logout();
          const errMsg = `This account is registered as ${roleLabel(actualType)}. Please use the ${roleLabel(actualType)} login section.`;
          setError(errMsg);
          toast.error(errMsg, "Wrong Login Section");
          return;
        }

        toast.success(`Welcome back, ${res.user?.first_name || "User"}!`, "Signed In");
        setDone(true);
        const target = redirectTargetFor(actualType || role, searchParams.get("redirect"));
        setTimeout(() => router.push(target), 800);
      } else {
        const parts = form.name.trim().split(" ");
        const first_name = parts[0] || "User";
        const last_name = parts.slice(1).join(" ") || "Account";
        const res = await register({
          user_type: role === "host" ? "host" : "guest",
          first_name,
          last_name,
          email: form.email,
          password: form.password,
          phone_number: form.phone || undefined,
        });

        if (!res.success) {
          const errMsg = res.error || "Registration failed";
          setError(errMsg);
          toast.error(errMsg, "Sign Up Failed");
          return;
        }

        if (res.requiresVerification) {
          setVerificationPendingEmail(form.email);
          toast.success("Account created! Verification link sent to your email.", "Check Your Inbox");
          return;
        }

        toast.success(`Account created successfully! Welcome to KhetYatra.`, "Registration Complete");
        setDone(true);
        const target = redirectTargetFor(res.user?.user_type || role, searchParams.get("redirect"));
        setTimeout(() => router.push(target), 800);
      }
    } catch (err: any) {
      const msg = err.message || "Authentication service error";
      setError(msg);
      toast.error(msg, "Authentication Error");
    } finally {
      setLoading(false);
    }
  }

  function switchTo(next: Tab) {
    setTab(next);
    setError("");
    setDone(false);
    setVerificationPendingEmail(null);
  }

  return (
    <div className="w-full max-w-xl rounded-2xl border border-line bg-surface p-6 shadow-sm sm:p-10">
      {/* Role Switcher at the top */}
      <div className="mb-8">
        <p className="mb-2.5 text-center text-xs font-bold uppercase tracking-wider text-ink-subtle">
          Select Account Type
        </p>
        <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-line bg-canvas p-1.5">
          <button
            type="button"
            onClick={() => handleRoleChange("guest")}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-lg py-2 px-2 text-xs font-bold transition-all cursor-pointer",
              role === "guest"
                ? "bg-surface text-brand-800 shadow-sm border border-brand-200"
                : "text-ink-muted hover:text-ink hover:bg-black/5"
            )}
          >
            <User size={14} className={role === "guest" ? "text-brand-700" : "text-ink-muted"} />
            <span>Traveler</span>
          </button>

          <button
            type="button"
            onClick={() => handleRoleChange("host")}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-lg py-2 px-2 text-xs font-bold transition-all cursor-pointer",
              role === "host"
                ? "bg-surface text-brand-800 shadow-sm border border-brand-200"
                : "text-ink-muted hover:text-ink hover:bg-black/5"
            )}
          >
            <Building2 size={14} className={role === "host" ? "text-brand-700" : "text-ink-muted"} />
            <span>Farm Host</span>
          </button>

          <button
            type="button"
            onClick={() => handleRoleChange("admin")}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-lg py-2 px-2 text-xs font-bold transition-all cursor-pointer",
              role === "admin"
                ? "bg-surface text-brand-800 shadow-sm border border-brand-200"
                : "text-ink-muted hover:text-ink hover:bg-black/5"
            )}
          >
            <Lock size={14} className={role === "admin" ? "text-brand-700" : "text-ink-muted"} />
            <span>Admin</span>
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          {role === "admin"
            ? "Command Portal"
            : role === "guest"
            ? tab === "login"
              ? "Welcome Back"
              : "Create Guest Account"
            : tab === "login"
            ? "Host Portal Sign In"
            : "Register as Farm Host"}
        </h1>

        <p className="mt-2 text-sm text-ink-muted">
          {role === "admin"
            ? "Central administrative access for all platform bookings, completed stays, escrow refunds, and disaster alerts."
            : role === "guest"
            ? tab === "login"
              ? "Sign in to access community alerts and travel safety resources."
              : "Join to book verified farmstays and receive regional hazard alerts."
            : tab === "login"
            ? "Sign in to manage your farm listings, bookings, and escrow payouts."
            : "List your rural farmstay, connect with eco-travelers, and receive escrow bookings."}
        </p>
      </div>

      {/* Login vs Sign Up Tabs (Only for Guest & Host, Admin is strictly Sign In) */}
      {role !== "admin" ? (
        <div className="mt-8 grid grid-cols-2 border-b border-line" role="tablist">
          {(["login", "signup"] as const).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => switchTo(t)}
              className={cn(
                "-mb-px border-b-2 pb-3 text-sm font-bold transition-colors cursor-pointer",
                tab === t
                  ? "border-brand-700 text-brand-700"
                  : "border-transparent text-ink-muted hover:text-ink"
              )}
            >
              {t === "login" ? "Login" : "Sign Up"}
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-6 flex items-center justify-center gap-2 rounded-lg bg-black/[0.03] py-2 px-3 text-xs font-semibold text-ink-muted border border-line">
          <Lock size={13} className="text-brand-700" />
          <span>Restricted Admin Portal • Authorized Sign In Only</span>
        </div>
      )}

      {/* Verification Pending Screen */}
      {verificationPendingEmail ? (
        <div className="mt-8 rounded-xl border border-brand-200 bg-brand-50 p-6 text-center space-y-4">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-brand-700 text-white">
            <Mail size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-brand-950">Verify Your Email Address</h2>
            <p className="mt-1 text-sm text-brand-800">
              We sent a verification link to <strong className="font-semibold text-brand-950">{verificationPendingEmail}</strong>.
            </p>
            <p className="mt-2 text-xs text-brand-700">
              Please click the link in your email to activate your account before logging in. (Check spam folder if not visible).
            </p>
          </div>

          <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={resending}
              onClick={() => handleResendVerification(verificationPendingEmail)}
              className="w-full sm:w-auto flex items-center gap-2"
            >
              <RefreshCw size={14} className={resending ? "animate-spin" : ""} />
              {resending ? "Sending..." : "Resend Verification Email"}
            </Button>
            <Button
              type="button"
              onClick={() => {
                setVerificationPendingEmail(null);
                setTab("login");
              }}
              className="w-full sm:w-auto"
            >
              Back to Sign In
            </Button>
          </div>
        </div>
      ) : done ? (
        /* Success State */
        <div className="mt-8 rounded-xl border border-brand-200 bg-brand-50 p-6 text-center space-y-4">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-brand-700 text-white">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-brand-950">
              {tab === "login" ? "Successfully Signed In" : "Account Created Successfully"}
            </h2>
            <p className="mt-1 text-sm text-brand-800">
              {tab === "login"
                ? `Signed in as ${form.email} (${role === "host" ? "Host" : "Guest"}).`
                : `Account created for ${form.email}.`}
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            {role === "host" ? (
              <Button
                type="button"
                onClick={() => router.push("/host")}
                className="w-full sm:w-auto"
              >
                Go to Host Dashboard
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  onClick={() => router.push("/bookings")}
                  className="w-full sm:w-auto"
                >
                  View My Bookings
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/")}
                  className="w-full sm:w-auto"
                >
                  Explore Farmstays
                </Button>
              </>
            )}
          </div>
        </div>
      ) : (
        /* Form */
        <form onSubmit={submit} noValidate className="mt-8 space-y-5">
          {tab === "signup" && (
            <>
              <Field label={role === "host" ? "Host Full Name" : "Full Name"}>
                {(id) => (
                  <Input
                    id={id}
                    autoComplete="name"
                    placeholder={role === "host" ? "e.g. Ramesh Negi" : "e.g. Anjali Sharma"}
                    value={form.name}
                    onChange={set("name")}
                  />
                )}
              </Field>

              {role === "host" && (
                <>
                  <Field label="Farmstay / Estate Name">
                    {(id) => (
                      <Input
                        id={id}
                        placeholder="e.g. Green Valley Retreat"
                        value={form.farmName}
                        onChange={set("farmName")}
                      />
                    )}
                  </Field>

                  <Field label="Farm Location / District">
                    {(id) => (
                      <Input
                        id={id}
                        placeholder="e.g. Chamoli, Uttarakhand"
                        value={form.location}
                        onChange={set("location")}
                      />
                    )}
                  </Field>
                </>
              )}
            </>
          )}

          <Field label={role === "admin" ? "Admin Email Address" : role === "host" ? "Host Email Address" : "Email Address"}>
            {(id) => (
              <Input
                id={id}
                type="email"
                autoComplete="email"
                placeholder={
                  role === "admin"
                    ? "admin@khetyatra.com"
                    : role === "host"
                    ? "host@myfarmstay.com"
                    : "user@example.com"
                }
                value={form.email}
                onChange={set("email")}
              />
            )}
          </Field>

          <Field label="Password">
            {(id) => (
              <Input
                id={id}
                type="password"
                autoComplete={tab === "login" ? "current-password" : "new-password"}
                placeholder="••••••••"
                value={form.password}
                onChange={set("password")}
              />
            )}
          </Field>

          {tab === "signup" && (
            <Field label="Confirm Password">
              {(id) => (
                <Input
                  id={id}
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={form.confirm}
                  onChange={set("confirm")}
                />
              )}
            </Field>
          )}

          {tab === "login" && (
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2.5 text-sm text-ink cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="size-4 rounded accent-brand-700"
                />
                Keep me signed in
              </label>
            </div>
          )}

          {error && (
            <div role="alert" className="rounded-lg bg-red-50 p-3.5 text-xs font-medium text-danger border border-red-200 space-y-2">
              <p>{error}</p>
              {error.toLowerCase().includes("verify your email") && form.email && (
                <button
                  type="button"
                  disabled={resending}
                  onClick={() => handleResendVerification(form.email)}
                  className="text-xs font-bold text-brand-800 underline hover:text-brand-950 cursor-pointer"
                >
                  {resending ? "Sending..." : "Click here to resend verification email →"}
                </button>
              )}
            </div>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading
              ? "Please wait..."
              : role === "admin"
              ? "Sign In to Admin Portal"
              : role === "guest"
              ? tab === "login"
                ? "Log In"
                : "Create Guest Account"
              : tab === "login"
              ? "Sign In to Host Portal"
              : "Register as Farm Host"}
          </Button>

          {tab === "login" && role !== "admin" && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => handleRoleChange(role === "guest" ? "host" : "guest")}
                className="w-full text-center text-xs text-ink-muted hover:text-brand-700 transition-colors cursor-pointer"
              >
                {role === "guest"
                  ? "Are you a farm owner? Switch to Host Sign In →"
                  : "Are you a traveler? Switch to Guest Sign In →"}
              </button>
            </div>
          )}
        </form>
      )}

      {/* Footer Security Badge */}
      <p className="mt-8 flex items-center justify-center gap-1.5 text-xs text-ink-muted border-t border-line pt-4">
        <Lock size={14} aria-hidden className="text-ink-subtle" />
        {role === "host"
          ? "Encrypted host authorization with direct escrow vault link."
          : "Secure authentication for rural and remote access."}
      </p>
    </div>
  );
}
