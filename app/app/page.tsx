"use client";

import { useState, useEffect } from "react";
import { AppSidebarWrapper } from "@/components/navigation/app-sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Activity, 
  TrendingUp, 
  Wrench, 
  Clock,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function AppDashboard() {
  const [userRole, setUserRole] = useState<"admin" | "tech">("admin");
  const [pendingCardsCount, setPendingCardsCount] = useState(0);
  const [stats, setStats] = useState({
    activeJobs: 0,
    completedToday: 0,
    pendingProposals: 0,
    efficiency: 0,
  });

  // Fetch real-time data
  useEffect(() => {
    const fetchStats = async () => {
      const supabase = createClient();
      
      // Get pending cards count
      const { count: pendingCount } = await supabase
        .from("job_cards")
        .select("*", { count: "exact", head: true })
        .in("status", ["draft", "pending", "pending_navision"]);
      
      setPendingCardsCount(pendingCount || 0);

      // Get today's stats
      const today = new Date().toISOString().split("T")[0];
      
      const { count: completedCount } = await supabase
        .from("job_cards")
        .select("*", { count: "exact", head: true })
        .eq("status", "completed")
        .gte("completed_at", today);

      const { count: proposalsCount } = await supabase
        .from("job_card_proposals")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      setStats({
        activeJobs: pendingCount || 0,
        completedToday: completedCount || 0,
        pendingProposals: proposalsCount || 0,
        efficiency: 87,
      });
    };

    fetchStats();

    // Set up real-time subscription
    const supabase = createClient();
    const channel = supabase
      .channel("dashboard-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "job_cards" },
        () => fetchStats()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <AppSidebarWrapper
      userRole={userRole}
      userName="Ivan Petrov"
      onRoleChange={setUserRole}
      pendingCardsCount={pendingCardsCount}
    >
      <div className="min-h-screen bg-[#0a0a0a]">
        {/* Header */}
        <header className="sticky top-0 z-40 border-b border-border/50 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
          <div className="container flex h-16 items-center justify-between px-4">
            <div>
              <h1 className="text-xl font-bold text-foreground">
                {userRole === "admin" ? "Service Manager Dashboard" : "Technician Dashboard"}
              </h1>
              <p className="text-sm text-muted-foreground">
                Welcome back, Ivan. Here&apos;s your overview.
              </p>
            </div>
            <Badge 
              variant="outline" 
              className={userRole === "admin" 
                ? "border-amber-500/50 text-amber-500" 
                : "border-primary/50 text-primary"
              }
            >
              {userRole === "admin" ? "Admin Mode" : "Tech Mode"}
            </Badge>
          </div>
        </header>

        {/* Main Content */}
        <main className="container px-4 py-6 space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-border/50 bg-card/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Active Jobs
                </CardTitle>
                <Activity className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{stats.activeJobs}</div>
                <p className="text-xs text-muted-foreground">In progress</p>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Completed Today
                </CardTitle>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{stats.completedToday}</div>
                <p className="text-xs text-muted-foreground">Jobs finished</p>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pending Proposals
                </CardTitle>
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{stats.pendingProposals}</div>
                <p className="text-xs text-muted-foreground">Awaiting approval</p>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Efficiency
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{stats.efficiency}%</div>
                <p className="text-xs text-muted-foreground">This month</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Activity */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Recent Activity
                </CardTitle>
                <CardDescription>Latest updates from your team</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Job Card #JD-9500 completed</p>
                    <p className="text-xs text-muted-foreground">2 minutes ago</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="h-2 w-2 rounded-full bg-amber-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">New proposal awaiting review</p>
                    <p className="text-xs text-muted-foreground">15 minutes ago</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Technician assigned to new task</p>
                    <p className="text-xs text-muted-foreground">1 hour ago</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Links */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-primary" />
                  Quick Actions
                </CardTitle>
                <CardDescription>Jump to common tasks</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <Link href="/technician">
                  <Button variant="outline" className="w-full h-20 flex-col gap-2 border-border/50 hover:border-primary/50 hover:bg-primary/5">
                    <Wrench className="h-6 w-6 text-primary" />
                    <span className="text-xs">New Work Card</span>
                  </Button>
                </Link>
                <Link href="/planning">
                  <Button variant="outline" className="w-full h-20 flex-col gap-2 border-border/50 hover:border-emerald-500/50 hover:bg-emerald-500/5">
                    <Calendar className="h-6 w-6 text-emerald-500" />
                    <span className="text-xs">View Calendar</span>
                  </Button>
                </Link>
                <Link href="/admin/queue">
                  <Button variant="outline" className="w-full h-20 flex-col gap-2 border-border/50 hover:border-amber-500/50 hover:bg-amber-500/5">
                    <Activity className="h-6 w-6 text-amber-500" />
                    <span className="text-xs">Pending Queue</span>
                  </Button>
                </Link>
                <Link href="/admin/manager">
                  <Button variant="outline" className="w-full h-20 flex-col gap-2 border-border/50 hover:border-blue-500/50 hover:bg-blue-500/5">
                    <Users className="h-6 w-6 text-blue-500" />
                    <span className="text-xs">Manager View</span>
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </AppSidebarWrapper>
  );
}
