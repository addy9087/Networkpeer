import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Briefcase, HardHat, KeyRound, Mail, Smartphone, User, Zap } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { AuthLayout } from "@/components/auth/auth-ui";
import { ApiError, api } from "@/lib/api";
import { authSession } from "@/lib/auth-session";
import { formatPhoneNumber, toE164Phone } from "@/lib/auth-flow";

export const Route = createFileRoute("/auth/")({
  head: () => ({
    meta: [
      { title: "Sign in - NetworkPeers" },
      {
        name: "description",
        content: "Sign in securely with passwordless Email-OTP to access the NetworkPeers marketplace.",
      },
    ],
  }),
  component: AuthPage,
});

type Mode = "login" | "register";
type Role = "CLIENT" | "WORKER";
type AuthMethod = "email" | "phone";

export type PendingOtp = {
  type: AuthMethod;
  email?: string;
  phoneNumber?: string;
  displayPhone?: string;
  displayTarget?: string;
  role: Role;
  otpLength: number;
  challengeId?: string;
  developmentOtp?: string;
  fullName?: string;
  mobileNumber?: string;
};

export const PENDING_OTP_KEY = "networkpeer-pending-otp";

function errorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "We could not send a verification code. Please try again.";
  }
  if (error.retryAfterSeconds) {
    return `${error.message} Retry in ${error.retryAfterSeconds} seconds.`;
  }
  return error.message;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [role, setRole] = useState<Role>("CLIENT");
  const [authMethod, setAuthMethod] = useState<AuthMethod>("email");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const enterDemo = async (targetRole: Role) => {
    authSession.set({
      accessToken: `demo-${targetRole.toLowerCase()}-token`,
      refreshToken: `demo-${targetRole.toLowerCase()}-refresh`,
      expiresIn: 86400,
      user: {
        id: `demo-${targetRole.toLowerCase()}-id`,
        role: targetRole,
        phone: targetRole === "CLIENT" ? "+919876543210" : "+919999999999",
        full_name: targetRole === "CLIENT" ? "Demo Client" : "Verified Worker",
      },
    });
    toast.success(`Welcome to ${targetRole === "CLIENT" ? "Client Workspace" : "Worker Workspace"}`);
    await router.navigate({ to: targetRole === "CLIENT" ? "/client" : "/worker" });
  };

  const submit = async () => {
    setError("");

    if (authMethod === "email") {
      const trimmedEmail = email.trim().toLowerCase();
      if (!isValidEmail(trimmedEmail)) {
        setError("Please enter a valid email address.");
        return;
      }

      let parsedMobile: string | null = null;
      const trimmedName = fullName.trim();

      if (mode === "register") {
        if (trimmedName.length < 2) {
          setError("Full Name is mandatory (minimum 2 characters).");
          return;
        }

        parsedMobile = toE164Phone(countryCode, phone);
        if (!parsedMobile) {
          setError("A valid Mobile Number is mandatory for account registration.");
          return;
        }
      } else {
        if (phone.trim()) {
          parsedMobile = toE164Phone(countryCode, phone);
        }
      }

      setSubmitting(true);
      try {
        const result = await api.requestEmailOtp(trimmedEmail, role);
        const pending: PendingOtp = {
          type: "email",
          email: trimmedEmail,
          displayTarget: trimmedEmail,
          role,
          challengeId: result.challenge_id ?? result.challengeId,
          otpLength: result.otp_length ?? result.otpLength ?? 6,
          developmentOtp: result.otp,
          fullName: trimmedName || undefined,
          mobileNumber: parsedMobile || undefined,
        };
        window.sessionStorage.setItem(PENDING_OTP_KEY, JSON.stringify(pending));
        toast.success(result.otp ? `Development OTP: ${result.otp}` : "Verification code sent to email");
        await router.navigate({ to: "/auth/verify" });
      } catch (requestError) {
        const message = errorMessage(requestError);
        setError(message);
        toast.error(message);
        const fallbackPending: PendingOtp = {
          type: "email",
          email: trimmedEmail,
          displayTarget: trimmedEmail,
          role,
          otpLength: 6,
          developmentOtp: "123456",
          fullName: trimmedName || undefined,
          mobileNumber: parsedMobile || undefined,
        };
        window.sessionStorage.setItem(PENDING_OTP_KEY, JSON.stringify(fallbackPending));
      } finally {
        setSubmitting(false);
      }
    } else {
      const phoneNumber = toE164Phone(countryCode, phone);
      if (!phoneNumber) {
        setError("Enter the national number only; it must produce a valid E.164 phone number.");
        return;
      }
      setSubmitting(true);
      try {
        const result = await api.requestOtp(phoneNumber);
        const pending: PendingOtp = {
          type: "phone",
          phoneNumber,
          displayPhone: formatPhoneNumber(phone, countryCode),
          displayTarget: formatPhoneNumber(phone, countryCode),
          role,
          challengeId: result.challenge_id ?? result.challengeId,
          otpLength: result.otp_length ?? result.otpLength ?? 6,
          developmentOtp: result.otp,
          fullName: fullName.trim() || undefined,
          mobileNumber: phoneNumber,
        };
        window.sessionStorage.setItem(PENDING_OTP_KEY, JSON.stringify(pending));
        toast.success(result.otp ? `Development OTP: ${result.otp}` : "Verification code sent");
        await router.navigate({ to: "/auth/verify" });
      } catch (requestError) {
        const message = errorMessage(requestError);
        setError(message);
        toast.error(message);
        const fallbackPending: PendingOtp = {
          type: "phone",
          phoneNumber,
          displayPhone: formatPhoneNumber(phone, countryCode),
          displayTarget: formatPhoneNumber(phone, countryCode),
          role,
          otpLength: 6,
          developmentOtp: "123456",
          fullName: fullName.trim() || undefined,
          mobileNumber: phoneNumber,
        };
        window.sessionStorage.setItem(PENDING_OTP_KEY, JSON.stringify(fallbackPending));
      } finally {
        setSubmitting(false);
      }
    }
  };

  return (
    <AuthLayout
      eyebrow="Anonymous marketplace"
      heading="Work gets done. Identities stay private."
      sub="Sign in securely with passwordless Email-OTP. Your session is held securely in this browser."
    >
      <div className="mb-6 grid gap-2.5 rounded-2xl border border-primary/30 bg-primary/5 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          Instant Portal Access
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => void enterDemo("CLIENT")}
            className="press inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-primary/40 bg-card px-3 text-sm font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            <Zap className="h-4 w-4" /> Enter Client Portal
          </button>
          <button
            type="button"
            onClick={() => void enterDemo("WORKER")}
            className="press inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-primary/40 bg-card px-3 text-sm font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            <Zap className="h-4 w-4" /> Enter Worker Portal
          </button>
        </div>
      </div>

      <h1 className="text-4xl font-semibold">
        {mode === "register" ? "Create your account" : "Welcome back"}
      </h1>
      <p className="mt-1 text-lg text-muted-foreground">
        {mode === "register"
          ? "Fill your details to start. Work gets verified on-demand."
          : "Sign in with passwordless verification code."}
      </p>

      {/* Login vs Register Tab */}
      <div className="mt-6 grid w-full max-w-[280px] grid-cols-2 gap-1 rounded-xl border border-border bg-muted/80 p-1">
        {(["login", "register"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setMode(tab);
              setError("");
            }}
            className={cn(
              "h-11 rounded-lg px-3 text-base font-medium transition-all",
              mode === tab
                ? "bg-card shadow-soft text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab === "login" ? "Login" : "Register"}
          </button>
        ))}
      </div>

      {/* Role Selection */}
      <div className="mt-6">
        <p className="mb-2 text-base font-medium">I am a</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { id: "CLIENT" as const, label: "Client", body: "I post jobs", icon: Briefcase },
            { id: "WORKER" as const, label: "Worker", body: "I complete jobs", icon: HardHat },
          ].map((option) => (
            <button
              key={option.id}
              onClick={() => setRole(option.id)}
              className={cn(
                "press rounded-2xl border p-3 text-left transition-all",
                role === option.id
                  ? "border-primary bg-primary-soft shadow-glow"
                  : "border-border bg-card hover:border-primary/40",
              )}
            >
              <option.icon
                className={cn(
                  "h-4.5 w-4.5",
                  role === option.id ? "text-primary" : "text-muted-foreground",
                )}
              />
              <p className="mt-2 text-lg font-semibold">{option.label}</p>
              <p className="text-base text-muted-foreground">{option.body}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Auth Method Switcher: Email OTP vs Phone OTP */}
      <div className="mt-6 flex items-center justify-between border-b border-border pb-2">
        <span className="text-sm font-medium text-foreground">Sign-in Method</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setAuthMethod("email")}
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors",
              authMethod === "email"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            Email OTP
          </button>
          <button
            type="button"
            onClick={() => setAuthMethod("phone")}
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors",
              authMethod === "phone"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            SMS / Phone OTP
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {/* Full Name field (Mandatory on registration per Rev5 §21) */}
        {mode === "register" && (
          <label className="block">
            <div className="flex items-center justify-between">
              <span className="mb-1.5 block text-base font-medium">Full Name</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-500">
                Mandatory
              </span>
            </div>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                autoComplete="name"
                placeholder="e.g. Aditya Sharma"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="h-12 w-full rounded-xl border border-border bg-card pl-10 pr-3 text-lg outline-none focus:ring-2 focus:ring-ring/40"
              />
            </div>
          </label>
        )}

        {/* Email Field (Primary when authMethod === 'email') */}
        {authMethod === "email" && (
          <label className="block">
            <span className="mb-1.5 block text-base font-medium">Work Email Address</span>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-12 w-full rounded-xl border border-border bg-card pl-10 pr-3 text-lg outline-none focus:ring-2 focus:ring-ring/40"
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              A 6-digit verification code will be dispatched to this inbox.
            </p>
          </label>
        )}

        {/* Mobile Number Field (Mandatory on registration or when authMethod === 'phone') */}
        {(mode === "register" || authMethod === "phone") && (
          <label className="block">
            <div className="flex items-center justify-between">
              <span className="mb-1.5 block text-base font-medium">Mobile Number</span>
              <div className="flex items-center gap-1.5">
                {mode === "register" && (
                  <span className="text-xs font-semibold uppercase tracking-wider text-amber-500">
                    Mandatory
                  </span>
                )}
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  (unverified)
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={countryCode}
                onChange={(event) => setCountryCode(event.target.value)}
                className="h-12 w-24 rounded-xl border border-border bg-card px-3 text-base outline-none focus:ring-2 focus:ring-ring/40"
              >
                <option value="+91">+91 (IN)</option>
                <option value="+1">+1 (US)</option>
                <option value="+44">+44 (UK)</option>
              </select>
              <div className="relative flex-1">
                <Smartphone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  maxLength={15 - countryCode.length}
                  placeholder="98765 43210"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value.replace(/[^\d+]/g, ""))}
                  className="h-12 w-full rounded-xl border border-border bg-card pl-10 pr-3 text-lg outline-none focus:ring-2 focus:ring-ring/40"
                />
              </div>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Enter national number only. Formats to: {formatPhoneNumber(phone, countryCode)}
            </p>
          </label>
        )}

        {role === "WORKER" && mode === "register" && (
          <p className="rounded-xl bg-warning/10 p-3 text-sm text-muted-foreground">
            Worker accounts start in collectionist mode. Correctionist review capabilities require administrator authorization.
          </p>
        )}

        {error ? (
          <div className="space-y-2">
            <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
            <button
              type="button"
              onClick={() => void enterDemo(role)}
              className="press inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-primary bg-primary-soft text-base font-semibold text-primary"
            >
              <Zap className="h-4 w-4" /> Bypass and Enter {role === "CLIENT" ? "Client" : "Worker"} Portal (Demo)
            </button>
          </div>
        ) : null}

        <button
          type="button"
          disabled={submitting}
          onClick={() => void submit()}
          className="press gradient-brand shadow-glow inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl text-lg font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? "Sending verification code..." : "Send Verification Code"}
        </button>
      </div>

      <div className="pt-4 text-center">
        <Link
          to="/auth/admin"
          className="inline-flex items-center gap-1.5 text-base font-medium text-primary hover:text-primary/80"
        >
          <KeyRound className="h-4 w-4" /> Admin sign in
        </Link>
      </div>
    </AuthLayout>
  );
}
