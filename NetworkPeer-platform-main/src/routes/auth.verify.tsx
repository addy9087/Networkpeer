import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, Loader2, Smartphone } from "lucide-react";
import { toast } from "sonner";

import { AuthLayout } from "@/components/auth/auth-ui";
import { isOtpCodeValid } from "@/lib/auth-flow";

export const Route = createFileRoute("/auth/verify")({
  component: VerifyOtpPage,
});

type PendingRegistration = {
  email: string;
  password: string;
  phone: string;
  countryCode: string;
  role: "client" | "worker";
  otp: string;
};

const PENDING_REGISTRATION_KEY = "networkpeers-pending-registration";
const RESEND_SECONDS = 30;

function VerifyOtpPage() {
  const router = useRouter();
  const [pending, setPending] = useState<PendingRegistration | null>(null);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const [countdown, setCountdown] = useState(RESEND_SECONDS);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const stored = window.sessionStorage.getItem(PENDING_REGISTRATION_KEY);
    if (!stored) {
      router.navigate({ to: "/auth" });
      return;
    }

    try {
      const parsed = JSON.parse(stored) as PendingRegistration;
      setPending(parsed);
    } catch {
      window.sessionStorage.removeItem(PENDING_REGISTRATION_KEY);
      router.navigate({ to: "/auth" });
    }
  }, [router]);

  useEffect(() => {
    if (countdown <= 0) {
      return;
    }

    const timer = window.setTimeout(() => setCountdown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown]);

  const handleOtpChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 6);
    setOtp(digits);
    setError("");
  };

  const handleResend = () => {
    if (!pending) {
      return;
    }

    setCountdown(RESEND_SECONDS);
    setOtp("");
    setError("");
    toast.success(`A fresh verification code was sent to ${pending.countryCode}${pending.phone}.`);
  };

  const handleVerify = () => {
    if (!pending) {
      setError("No pending registration found. Please restart the sign-up process.");
      return;
    }

    if (!isOtpCodeValid(otp)) {
      setError("Enter the 6-digit verification code.");
      return;
    }

    if (otp !== pending.otp) {
      setError("The verification code is invalid or expired. Please request a new code.");
      return;
    }

    setStatus("loading");

    window.setTimeout(() => {
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(PENDING_REGISTRATION_KEY);
      }
      setStatus("success");
      toast.success("Phone verified. Your account is ready.");
      router.navigate({ to: pending.role === "client" ? "/client" : "/worker" });
    }, 700);
  };

  return (
    <AuthLayout
      eyebrow="Secure sign-up"
      heading="Verify your number"
      sub="We send a one-time passcode to your phone to protect your account."
    >
      <div className="w-full rounded-3xl border border-border bg-card/80 p-6 shadow-lift">
        <Link
          to="/auth"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to registration
        </Link>

        <div className="mt-5 flex items-center gap-3 rounded-2xl border border-border bg-muted/70 p-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary-soft text-primary">
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Code sent to</p>
            <p className="text-sm text-muted-foreground">
              {pending ? `${pending.countryCode} ${pending.phone}` : "your phone number"}
            </p>
          </div>
        </div>

        <div className="mt-6">
          <label className="text-sm font-medium text-foreground">Enter 6-digit code</label>
          <div className="mt-3 flex gap-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <input
                key={index}
                ref={(element) => {
                  inputRefs.current[index] = element;
                }}
                inputMode="numeric"
                autoFocus={index === 0}
                value={otp[index] ?? ""}
                onChange={(event) => {
                  const next = event.target.value.replace(/\D/g, "");
                  const nextOtp = otp.split("");
                  nextOtp[index] = next.slice(-1);
                  const updated = nextOtp.join("");
                  handleOtpChange(updated);
                  if (next && index < 5) {
                    inputRefs.current[index + 1]?.focus();
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === "Backspace" && !otp[index] && index > 0) {
                    const previousOtp = otp.split("");
                    previousOtp[index - 1] = "";
                    const updated = previousOtp.join("");
                    handleOtpChange(updated);
                    inputRefs.current[index - 1]?.focus();
                  }
                }}
                className="h-12 w-full rounded-xl border border-border bg-background text-center text-lg font-semibold outline-none focus:ring-2 focus:ring-ring/40"
              />
            ))}
          </div>
          {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        </div>

        <button
          type="button"
          onClick={handleVerify}
          disabled={status === "loading"}
          className="mt-5 flex h-12 w-full items-center justify-center rounded-xl bg-primary px-4 text-base font-semibold text-primary-foreground disabled:opacity-80"
        >
          {status === "loading" ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" /> Verify OTP
            </>
          )}
        </button>

        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <button
            type="button"
            onClick={() => router.navigate({ to: "/auth" })}
            className="font-medium text-primary hover:underline"
          >
            Edit phone number
          </button>
          <button
            type="button"
            onClick={handleResend}
            disabled={countdown > 0}
            className="font-medium text-primary hover:underline disabled:text-muted-foreground"
          >
            {countdown > 0 ? `Resend code in ${countdown}s` : "Send OTP / Resend code"}
          </button>
        </div>
      </div>
    </AuthLayout>
  );
}
