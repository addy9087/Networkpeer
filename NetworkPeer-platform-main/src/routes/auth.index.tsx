import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Briefcase, HardHat, KeyRound, Lock, Mail, Smartphone } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { AuthLayout, Field, SubmitButton } from "@/components/auth/auth-ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatPhoneNumber, getDemoOtp, isPhoneNumberValid } from "@/lib/auth-flow";

export const Route = createFileRoute("/auth/")({
  head: () => ({
    meta: [
      { title: "Sign in — NetworkPeers" },
      {
        name: "description",
        content:
          "Sign in or register with NetworkPeers as a verified client or verified worker. Password login and password recovery are supported.",
      },
      { property: "og:title", content: "Sign in — NetworkPeers" },
      {
        property: "og:description",
        content: "Client and worker access to the NetworkPeers marketplace.",
      },
    ],
  }),
  component: AuthPage,
});

type Mode = "login" | "register";
type Role = "client" | "worker" | "admin";

type PendingRegistration = {
  email: string;
  password: string;
  phone: string;
  countryCode: string;
  role: Exclude<Role, "admin">;
  otp: string;
};

const tabs: { id: Mode; label: string }[] = [
  { id: "login", label: "Login" },
  { id: "register", label: "Register" },
];

const PENDING_REGISTRATION_KEY = "networkpeers-pending-registration";

function PhoneField({
  value,
  countryCode,
  onValueChange,
  onCountryCodeChange,
  error,
}: {
  value: string;
  countryCode: string;
  onValueChange: (value: string) => void;
  onCountryCodeChange: (value: string) => void;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-base font-medium">Phone Number</span>
      <div className="flex gap-2">
        <select
          value={countryCode}
          onChange={(event) => onCountryCodeChange(event.target.value)}
          className="h-12 w-24 rounded-xl border border-border bg-card px-3 text-base outline-none focus:ring-2 focus:ring-ring/40"
        >
          <option value="+1">+1</option>
          <option value="+44">+44</option>
          <option value="+91">+91</option>
        </select>
        <div className="relative flex-1">
          <Smartphone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="tel"
            inputMode="numeric"
            placeholder="555 000 1234"
            value={value}
            onChange={(event) => onValueChange(event.target.value.replace(/\D/g, ""))}
            className="h-12 w-full rounded-xl border border-border bg-card pl-10 pr-3 text-lg outline-none transition-shadow placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/40"
            required
          />
        </div>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{formatPhoneNumber(value, countryCode)}</p>
      {error ? <p className="mt-1 text-sm text-destructive">{error}</p> : null}
    </label>
  );
}

function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [role, setRole] = useState<Role>("client");
  const [resetOpen, setResetOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+1");
  const [registrationError, setRegistrationError] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const stored = window.sessionStorage.getItem(PENDING_REGISTRATION_KEY);
    if (!stored) {
      return;
    }

    try {
      const parsed = JSON.parse(stored) as PendingRegistration;
      setMode("register");
      setRole(parsed.role);
      setEmail(parsed.email);
      setPassword(parsed.password);
      setPhone(parsed.phone);
      setCountryCode(parsed.countryCode);
    } catch {
      window.sessionStorage.removeItem(PENDING_REGISTRATION_KEY);
    }
  }, []);

  const redirectPath = role === "client" ? "/client" : role === "worker" ? "/worker" : "/admin";

  const handleRegisterSubmit = () => {
    const normalizedEmail = email.trim();
    const normalizedPassword = password.trim();
    const normalizedPhone = phone.replace(/\D/g, "");

    if (!normalizedEmail || !normalizedPassword || !isPhoneNumberValid(normalizedPhone)) {
      setRegistrationError("Please provide a valid email, password, and phone number.");
      return;
    }

    const payload: PendingRegistration = {
      email: normalizedEmail,
      password: normalizedPassword,
      phone: normalizedPhone,
      countryCode,
      role: role === "client" || role === "worker" ? role : "client",
      otp: getDemoOtp(),
    };

    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(PENDING_REGISTRATION_KEY, JSON.stringify(payload));
    }

    setRegistrationError("");
    router.navigate({ to: "/auth/verify" });
  };

  return (
    <AuthLayout
      eyebrow="Anonymous marketplace"
      heading="Work gets done. Identities stay private."
      sub="Verified clients post. Verified workers deliver. Nobody exchanges personal details until a job is accepted."
    >
      <h1 className="text-4xl font-semibold">
        {mode === "register" ? "Create your account" : "Welcome back"}
      </h1>
      <p className="mt-1 text-lg text-muted-foreground">Choose how you want to continue.</p>

      <div className="mt-6 flex justify-center">
        <div className="grid w-full max-w-[280px] grid-cols-2 gap-1 rounded-xl border border-border bg-muted/80 p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setMode(t.id);
                setRegistrationError("");
              }}
              className={cn(
                "flex h-11 items-center justify-center rounded-lg px-3 text-base font-medium transition-all duration-200",
                mode === t.id
                  ? "bg-card shadow-soft text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <p className="mb-2 text-base font-medium">I am a</p>
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              { id: "client", label: "Client", body: "I post jobs", icon: Briefcase },
              { id: "worker", label: "Worker", body: "I complete jobs", icon: HardHat },
            ] as const
          ).map((r) => (
            <button
              key={r.id}
              onClick={() => setRole(r.id)}
              className={cn(
                "press rounded-2xl border p-3 text-left transition-all duration-200",
                role === r.id
                  ? "border-primary bg-primary-soft shadow-glow"
                  : "border-border bg-card hover:border-primary/40",
              )}
            >
              <r.icon
                className={cn(
                  "h-4.5 w-4.5",
                  role === r.id ? "text-primary" : "text-muted-foreground",
                )}
              />
              <p className="mt-2 text-lg font-semibold">{r.label}</p>
              <p className="text-base text-muted-foreground">{r.body}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {mode === "login" && (
          <>
            <Field
              label="Email"
              type="email"
              placeholder="you@company.com"
              icon={Mail}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
            />
            <Field
              label="Password"
              type="password"
              placeholder="••••••••"
              icon={Lock}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
            <div className="flex items-center justify-between text-base">
              <label className="inline-flex items-center gap-2 text-muted-foreground">
                <input type="checkbox" className="h-4 w-4 rounded border-border accent-primary" />{" "}
                Remember me
              </label>
              <button
                onClick={() => setResetOpen(true)}
                className="font-medium text-primary hover:underline"
              >
                Forgot password?
              </button>
            </div>
          </>
        )}

        {mode === "register" && (
          <>
            <Field
              label="Email"
              type="email"
              placeholder="you@company.com"
              icon={Mail}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
            <PhoneField
              value={phone}
              countryCode={countryCode}
              onValueChange={setPhone}
              onCountryCodeChange={setCountryCode}
              error={
                registrationError && !isPhoneNumberValid(phone.replace(/\D/g, ""))
                  ? "Phone number must include at least 7 digits."
                  : undefined
              }
            />
            <Field
              label="Password"
              type="password"
              placeholder="Minimum 8 characters"
              icon={Lock}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              required
            />
            {registrationError ? (
              <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {registrationError}
              </p>
            ) : null}
            <p className="rounded-xl bg-muted/60 p-3 text-base text-muted-foreground">
              Your name, photo and contact details are never shown to the other party. You will
              appear as{" "}
              <span className="font-semibold text-foreground">
                Verified {role === "client" ? "Client" : "Worker"}
              </span>
              .
            </p>
          </>
        )}

        <SubmitButton
          label={mode === "login" ? "Sign in" : "Continue to OTP"}
          onClick={() => {
            if (mode === "login") {
              router.navigate({ to: redirectPath });
              return;
            }

            handleRegisterSubmit();
          }}
        />

        <div className="pt-3 text-center">
          <Link
            to="/auth/admin"
            className="inline-flex items-center justify-center gap-1.5 text-base font-medium text-primary transition-colors hover:text-primary/80"
          >
            <KeyRound className="h-4 w-4" /> Admin sign in
          </Link>
        </div>
      </div>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset your password</DialogTitle>
            <DialogDescription>
              We will email a secure link to help you recover your account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Field
              label="Email"
              type="email"
              placeholder="you@company.com"
              icon={Mail}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
            />
            <button
              type="button"
              onClick={() => {
                setResetOpen(false);
                toast.success("Reset link prepared. Check your inbox.");
              }}
              className="press gradient-brand inline-flex h-12 w-full items-center justify-center rounded-xl text-lg font-semibold text-primary-foreground"
            >
              Send reset link
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </AuthLayout>
  );
}
