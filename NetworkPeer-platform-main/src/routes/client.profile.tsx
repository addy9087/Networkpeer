import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  BadgeCheck,
  CheckCircle2,
  Edit3,
  Loader2,
  Lock,
  LogOut,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  User,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";

import { PageHeader } from "@/components/shell/portal-shell";
import { Chip, SectionCard } from "@/components/marketplace/primitives";
import { api } from "@/lib/api";
import { useAuthSession, authSession } from "@/lib/auth-session";

export const Route = createFileRoute("/client/profile")({
  head: () => ({
    meta: [
      { title: "Client Profile — NetworkPeers" },
      { name: "description", content: "View and manage your verified client profile." },
    ],
  }),
  component: ClientProfilePage,
});

type ClientProfileData = {
  id: string;
  phoneNumber: string;
  fullName: string;
  email: string | null;
  role: string;
  isVerified: boolean;
};

export function ClientProfilePage() {
  const navigate = useNavigate();
  const session = useAuthSession();

  const fallbackUser = session?.user;

  const [profile, setProfile] = useState<ClientProfileData>({
    id: fallbackUser?.id || "anonymous-client",
    phoneNumber: fallbackUser?.phone || "Phone hidden in escrow",
    fullName: fallbackUser?.full_name || "Verified Client",
    email: null,
    role: "CLIENT",
    isVerified: true,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!fallbackUser) return;
    setIsLoading(true);
    try {
      const res = await api.getProfile().catch(() => null);
      if (res) {
        setProfile({
          id: res.id || fallbackUser.id,
          phoneNumber: res.phoneNumber || res.phone_number || fallbackUser.phone || "",
          fullName: res.fullName || res.full_name || fallbackUser.full_name || "Verified Client",
          email: res.email || null,
          role: res.role || "CLIENT",
          isVerified: true,
        });
        if (res.email) setEmailInput(res.email);
      }
    } catch {
      // Retain fallback session data
    } finally {
      setIsLoading(false);
    }
  }, [fallbackUser]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const handleSaveEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      await api.updateProfile({ email: emailInput.trim() || null });
      setProfile((prev) => ({ ...prev, email: emailInput.trim() || null }));
      setSuccessMsg("Email updated successfully!");
      setIsEditing(false);
      setTimeout(() => setSuccessMsg(""), 2500);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to update email. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await api.logout();
    } catch {
      authSession.clear();
    } finally {
      setIsLoggingOut(false);
      await navigate({ to: "/" });
    }
  };

  return (
    <div className="animate-rise space-y-6 max-w-3xl">
      <PageHeader
        title={isEditing ? "Edit Profile" : "Client Profile"}
        description={
          isEditing
            ? "Update your contact email. Verified identity phone and name remain cryptographically locked."
            : "Your verified client identity and workspace credentials."
        }
        action={
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="press inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-sm font-semibold text-foreground hover:bg-muted"
              >
                <Edit3 className="h-4 w-4" /> Edit details
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setEmailInput(profile.email || "");
                }}
                className="press inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              disabled={isLoggingOut}
              onClick={handleLogout}
              className="press inline-flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-2 text-sm font-semibold text-destructive hover:bg-destructive/20"
            >
              {isLoggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
              Log out
            </button>
          </div>
        }
      />

      {successMsg && (
        <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm font-medium text-destructive">
          {errorMsg}
        </div>
      )}

      {/* Main Profile Card */}
      <SectionCard title="Client Account Credentials">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pb-4 border-b border-border/60">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-2xl font-bold text-primary">
            {profile.fullName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-foreground truncate">{profile.fullName}</h2>
              <Chip tone="success" className="gap-1">
                <ShieldCheck className="h-3.5 w-3.5" /> Verified
              </Chip>
            </div>
            <p className="text-sm text-muted-foreground">ID: {profile.id}</p>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              Client Employer Account
            </p>
          </div>
        </div>

        {/* Credentials Breakdown */}
        <div className="grid gap-4 sm:grid-cols-2 pt-4">
          <div className="rounded-xl border border-border bg-card p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
              <span className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" /> Registered Phone
              </span>
              <Lock className="h-3 w-3 text-muted-foreground" />
            </div>
            <p className="text-base font-medium text-foreground">{profile.phoneNumber}</p>
            <p className="text-xs text-muted-foreground">Locked: Verified via initial signup.</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
              <span className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" /> Client Name / Org
              </span>
              <BadgeCheck className="h-3 w-3 text-primary" />
            </div>
            <p className="text-base font-medium text-foreground">{profile.fullName}</p>
            <p className="text-xs text-muted-foreground">Display name for escrow release notes.</p>
          </div>
        </div>

        {/* Contact Email Section */}
        <div className="pt-2">
          {isEditing ? (
            <form onSubmit={handleSaveEmail} className="rounded-xl border border-primary/40 bg-primary-soft/10 p-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <Mail className="h-4 w-4 text-primary" /> Notification & Invoice Email
                </label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="client@organization.com"
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground">
                  Where you receive escrow release alerts, worker evidence updates, and receipts.
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="press rounded-xl px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="press gradient-brand shadow-glow inline-flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold text-primary-foreground"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Email
                </button>
              </div>
            </form>
          ) : (
            <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> Notification & Billing Email
                </span>
                <p className="text-base font-medium text-foreground">
                  {profile.email || "No email configured (SMS/in-app only)"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="press text-xs font-semibold text-primary hover:underline"
              >
                Change
              </button>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Privacy Guarantee Card */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary-soft/30 via-background to-card p-6 space-y-2">
        <div className="flex items-center gap-2 text-primary font-semibold">
          <ShieldCheck className="h-5 w-5" />
          <span>Zero Identity Leak Guarantee</span>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          NetworkPeers protects both client and worker identities. Workers only see verified task locations and escrow milestones. Direct phone numbers and credentials are never exposed publicly.
        </p>
      </div>
    </div>
  );
}
