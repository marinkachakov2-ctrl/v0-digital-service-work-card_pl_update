"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  Wrench,
  Clock,
  Settings,
  Home,
  Smartphone,
  RefreshCw,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badgeKey?: string;
}

const managerItems: NavItem[] = [
  { label: "Analytics Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
];

const operationsItems: NavItem[] = [
  { label: "Proposals Queue", href: "/admin/approval", icon: ClipboardList, badgeKey: "pendingProposals" },
  { label: "Work In Progress", href: "/admin", icon: Wrench },
  { label: "Job History", href: "/admin/job-cards", icon: Clock },
];

const systemItems: NavItem[] = [
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [badgeCounts, setBadgeCounts] = useState<Record<string, number>>({});
  const supabase = createClient();

  // Fetch pending proposals count
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const { count } = await supabase
          .from("job_card_proposals")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending");
        
        setBadgeCounts({ pendingProposals: count || 0 });
      } catch (err) {
        console.error("[v0] Error fetching badge counts:", err);
      }
    };

    fetchCounts();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const { count } = await supabase
        .from("job_card_proposals")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      
      setBadgeCounts({ pendingProposals: count || 0 });
      setLastSync(new Date());
    } catch (err) {
      console.error("[v0] Error refreshing:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatSyncTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins === 1) return "1 min ago";
    return `${diffMins} min ago`;
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setLastSync((prev) => prev); // Force re-render for time display
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const NavSection = ({ title, items }: { title: string; items: NavItem[] }) => (
    <div className="mb-6">
      <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      <nav className="space-y-1">
        {items.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
              {item.badgeKey && badgeCounts[item.badgeKey] > 0 && (
                <Badge className="ml-auto bg-red-600 text-white text-[10px] px-1.5 py-0 h-5 hover:bg-red-600">
                  {badgeCounts[item.badgeKey]}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 flex h-screen w-60 flex-col border-r border-border bg-sidebar">
        {/* Logo */}
        <div className="flex h-14 items-center gap-3 border-b border-border px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">
            M
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Megatron</p>
            <p className="text-[10px] text-muted-foreground">Admin Portal</p>
          </div>
        </div>

        {/* Manager Mode Banner */}
        <div className="border-b border-border px-4 py-2">
          <p className="text-[10px] font-semibold text-primary uppercase tracking-wide">
            Manager Mode - Analytics Only
          </p>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-2 py-4">
          <NavSection title="" items={managerItems} />
          <NavSection title="Operations" items={operationsItems} />
          <NavSection title="System" items={systemItems} />
        </div>

        {/* Bottom Links */}
        <div className="border-t border-border p-2">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <Home className="h-4 w-4" />
            <span>Portal Selection</span>
          </Link>
          <Link
            href="/technician"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <Smartphone className="h-4 w-4" />
            <span>Technician Portal</span>
          </Link>
        </div>

        {/* User Section */}
        <div className="border-t border-border p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-xs font-medium">
              AD
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">Admin User</p>
              <p className="text-[10px] text-muted-foreground truncate">admin@megatron.co.za</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="ml-60 flex-1">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-border bg-card px-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Smartphone className="h-4 w-4" />
            <span className="font-medium text-foreground">Megatron Admin Portal</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Last sync: {formatSyncTime(lastSync)}</span>
              <div className="h-2 w-2 rounded-full bg-primary" />
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Home className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <main>{children}</main>
      </div>
    </div>
  );
}
