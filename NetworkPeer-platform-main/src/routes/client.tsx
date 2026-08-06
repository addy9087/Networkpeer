import { createFileRoute, Outlet, Link } from "@tanstack/react-router";
import { Bell, Briefcase, LayoutDashboard, PlusCircle, Wallet } from "lucide-react";

import { PortalShell, type NavItem } from "@/components/shell/portal-shell";

const nav: NavItem[] = [
  { label: "Dashboard", to: "/client", icon: LayoutDashboard },
  { label: "My jobs", to: "/client/jobs", icon: Briefcase, badge: "6" },
  { label: "Post a job", to: "/client/jobs/new", icon: PlusCircle },
  { label: "Wallet", to: "/client/wallet", icon: Wallet },
  { label: "Notifications", to: "/client/notifications", icon: Bell, badge: "2" },
];

export const Route = createFileRoute("/client")({
  component: ClientLayout,
});

function ClientLayout() {
  return (
    <PortalShell
      className="client-portal-root text-base"
      brand="NetworkPeers"
      brandSub="Client workspace"
      nav={nav}
      identity="Client"
      headerAction={
        <Link
          to="/client/jobs/new"
          className="press gradient-brand shadow-glow hidden items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-base font-semibold text-primary-foreground sm:inline-flex"
        >
          <PlusCircle className="h-4 w-4" /> New job
        </Link>
      }
    >
      <Outlet />
    </PortalShell>
  );
}
