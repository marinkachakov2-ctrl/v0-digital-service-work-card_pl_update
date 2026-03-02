"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Loader2,
  RefreshCw,
  Activity,
  DollarSign,
  Wrench,
  CheckCircle,
  Lock,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Users,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// Types
interface KPIData {
  wip: number;
  potentialRevenue: number;
  completedJobs: number;
  efficiency: number;
}

interface TechnicianRevenue {
  name: string;
  labor: number;
  parts: number;
}

interface StatusDistribution {
  name: string;
  value: number;
  color: string;
}

const ADMIN_PIN = "1234";

// Chart colors - Professional palette
const CHART_COLORS = {
  emerald: "#10b981",
  amber: "#f59e0b",
  slate: "#64748b",
  red: "#ef4444",
  blue: "#3b82f6",
};

const STATUS_COLORS = [
  CHART_COLORS.amber,    // Draft
  CHART_COLORS.blue,     // Pending Navision
  CHART_COLORS.emerald,  // Completed
  CHART_COLORS.slate,    // Other
];

export default function ManagerDashboard() {
  const [mounted, setMounted] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // KPI Data
  const [kpiData, setKpiData] = useState<KPIData>({
    wip: 0,
    potentialRevenue: 0,
    completedJobs: 0,
    efficiency: 0,
  });

  // Chart Data
  const [technicianRevenue, setTechnicianRevenue] = useState<TechnicianRevenue[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<StatusDistribution[]>([]);

  // Check auth on mount
  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const auth = sessionStorage.getItem("megatron_admin_auth");
      if (auth === "true") {
        setIsAuthorized(true);
      }
    }
  }, []);

  // Fetch dashboard data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const supabase = createClient();

    try {
      // Fetch job cards for KPIs and status distribution
      const { data: jobCards, error: jobCardsError } = await supabase
        .from("job_cards")
        .select(`
          id,
          status,
          created_at,
          technician_id,
          technicians (name)
        `);

      if (jobCardsError) {
        console.error("Job cards fetch error:", jobCardsError);
        toast.error("Failed to load job cards data");
      }

      // Fetch proposals for potential revenue
      const { data: proposals, error: proposalsError } = await supabase
        .from("job_card_proposals")
        .select("estimated_price, status, unit_price, labor_hours, quantity");

      if (proposalsError) {
        console.error("Proposals fetch error:", proposalsError);
      }

      // Fetch parts and labor for technician revenue
      const { data: partsData, error: partsError } = await supabase
        .from("job_card_parts")
        .select(`
          price_at_submission,
          quantity,
          job_card_id,
          job_cards!inner (
            technician_id,
            technicians (name)
          )
        `);

      if (partsError) {
        console.error("Parts fetch error:", partsError);
      }

      const { data: laborData, error: laborError } = await supabase
        .from("job_card_labor")
        .select(`
          actual_hours,
          technician_name,
          job_card_id
        `);

      if (laborError) {
        console.error("Labor fetch error:", laborError);
      }

      // Calculate KPIs
      const cards = jobCards || [];
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      const wipCount = cards.filter(c => 
        c.status === "draft" || c.status === "pending_order"
      ).length;

      const completedThisMonth = cards.filter(c => {
        if (c.status !== "completed") return false;
        const createdDate = new Date(c.created_at);
        return createdDate.getMonth() === currentMonth && 
               createdDate.getFullYear() === currentYear;
      }).length;

      // Calculate potential revenue from proposals
      const pendingProposals = (proposals || []).filter(p => p.status === "pending");
      const potentialRevenue = pendingProposals.reduce((sum, p) => {
        const partsCost = (p.unit_price || 0) * (p.quantity || 1);
        const laborCost = (p.labor_hours || 0) * 50; // 50 BGN/hour
        return sum + partsCost + laborCost + (p.estimated_price || 0);
      }, 0);

      // Calculate efficiency (approved / total proposals)
      const allProposals = proposals || [];
      const approvedProposals = allProposals.filter(p => p.status === "approved").length;
      const efficiency = allProposals.length > 0 
        ? Math.round((approvedProposals / allProposals.length) * 100)
        : 0;

      setKpiData({
        wip: wipCount,
        potentialRevenue,
        completedJobs: completedThisMonth,
        efficiency,
      });

      // Calculate status distribution
      const statusCounts: Record<string, number> = {};
      cards.forEach(c => {
        const status = c.status || "other";
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });

      const statusData: StatusDistribution[] = [
        { name: "Draft", value: statusCounts["draft"] || 0, color: CHART_COLORS.amber },
        { name: "Pending Navision", value: statusCounts["pending_order"] || 0, color: CHART_COLORS.blue },
        { name: "Completed", value: statusCounts["completed"] || 0, color: CHART_COLORS.emerald },
      ];
      setStatusDistribution(statusData.filter(s => s.value > 0));

      // Calculate revenue by technician
      const techRevenueMap: Record<string, { labor: number; parts: number }> = {};

      // Add parts revenue
      (partsData || []).forEach((part: any) => {
        const techName = part.job_cards?.technicians?.name || "Unknown";
        if (!techRevenueMap[techName]) {
          techRevenueMap[techName] = { labor: 0, parts: 0 };
        }
        techRevenueMap[techName].parts += (part.price_at_submission || 0) * (part.quantity || 1);
      });

      // Add labor revenue (assuming 50 BGN/hour)
      (laborData || []).forEach((labor: any) => {
        const techName = labor.technician_name || "Unknown";
        if (!techRevenueMap[techName]) {
          techRevenueMap[techName] = { labor: 0, parts: 0 };
        }
        techRevenueMap[techName].labor += (labor.actual_hours || 0) * 50;
      });

      const techRevenueData: TechnicianRevenue[] = Object.entries(techRevenueMap)
        .map(([name, data]) => ({
          name: name.split(" ")[0], // First name only for chart
          labor: Math.round(data.labor),
          parts: Math.round(data.parts),
        }))
        .filter(t => t.labor > 0 || t.parts > 0)
        .sort((a, b) => (b.labor + b.parts) - (a.labor + a.parts))
        .slice(0, 6); // Top 6 technicians

      setTechnicianRevenue(techRevenueData);

    } catch (error) {
      console.error("Dashboard data fetch error:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthorized) {
      fetchData();
    }
  }, [isAuthorized, fetchData]);

  // PIN verification
  const handlePinSubmit = () => {
    if (pinInput === ADMIN_PIN) {
      setIsAuthorized(true);
      setPinError(false);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("megatron_admin_auth", "true");
      }
    } else {
      setPinError(true);
      setPinInput("");
    }
  };

  if (!mounted) return null;

  // PIN Dialog
  if (!isAuthorized) {
    return (
      <Dialog open={true}>
        <DialogContent className="sm:max-w-[360px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Lock className="h-5 w-5 text-primary" />
              Manager Dashboard Access
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Enter your admin PIN to access the manager dashboard.
            </p>
            <div className="space-y-2">
              <Label htmlFor="pin">PIN Code</Label>
              <Input
                id="pin"
                type="password"
                maxLength={4}
                placeholder="----"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && handlePinSubmit()}
                className="text-center text-2xl tracking-[1em] font-mono"
              />
              {pinError && (
                <p className="text-xs text-destructive">Incorrect PIN. Please try again.</p>
              )}
            </div>
            <Button
              onClick={handlePinSubmit}
              disabled={pinInput.length !== 4}
              className="w-full"
            >
              <Lock className="h-4 w-4 mr-2" />
              Access Dashboard
            </Button>
            <div className="pt-2">
              <Link href="/">
                <Button variant="ghost" className="w-full gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Home
                </Button>
              </Link>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link href="/admin/queue">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-foreground">Manager Dashboard</h1>
              <p className="text-xs text-muted-foreground">Megatron Digital Service</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </header>

      <main className="container px-4 py-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* WIP Card */}
          <Card className="border-l-4 border-l-amber-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                WIP (Work In Progress)
              </CardTitle>
              <Activity className="h-5 w-5 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {isLoading ? <Loader2 className="h-8 w-8 animate-spin" /> : kpiData.wip}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Pending job cards
              </p>
            </CardContent>
          </Card>

          {/* Potential Revenue Card */}
          <Card className="border-l-4 border-l-emerald-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Potential Revenue
              </CardTitle>
              <DollarSign className="h-5 w-5 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {isLoading ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : (
                  `${kpiData.potentialRevenue.toLocaleString()} BGN`
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                From pending proposals
              </p>
            </CardContent>
          </Card>

          {/* Completed Jobs Card */}
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Completed Jobs
              </CardTitle>
              <CheckCircle className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {isLoading ? <Loader2 className="h-8 w-8 animate-spin" /> : kpiData.completedJobs}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                This month
              </p>
            </CardContent>
          </Card>

          {/* Efficiency Card */}
          <Card className="border-l-4 border-l-slate-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Efficiency
              </CardTitle>
              {kpiData.efficiency >= 50 ? (
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-500" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {isLoading ? <Loader2 className="h-8 w-8 animate-spin" /> : `${kpiData.efficiency}%`}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Proposals approved by clients
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar Chart - Revenue by Technician */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <CardTitle>Revenue by Technician</CardTitle>
              </div>
              <CardDescription>Comparing labor vs parts revenue (BGN)</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[300px] flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : technicianRevenue.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No technician revenue data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={technicianRevenue} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                      axisLine={{ stroke: "hsl(var(--border))" }}
                    />
                    <YAxis 
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                      axisLine={{ stroke: "hsl(var(--border))" }}
                      tickFormatter={(value) => `${value}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        color: "hsl(var(--foreground))",
                      }}
                      formatter={(value: number) => [`${value.toLocaleString()} BGN`]}
                    />
                    <Legend 
                      wrapperStyle={{ color: "hsl(var(--foreground))" }}
                    />
                    <Bar 
                      dataKey="labor" 
                      name="Labor" 
                      fill={CHART_COLORS.emerald} 
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar 
                      dataKey="parts" 
                      name="Parts" 
                      fill={CHART_COLORS.amber} 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Pie Chart - Job Status Distribution */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-primary" />
                <CardTitle>Job Status Distribution</CardTitle>
              </div>
              <CardDescription>Current status of all job cards</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[300px] flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : statusDistribution.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No job status data available
                </div>
              ) : (
                <div className="flex flex-col lg:flex-row items-center justify-center gap-4">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={statusDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={4}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={{ stroke: "hsl(var(--muted-foreground))" }}
                      >
                        {statusDistribution.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.color}
                            stroke="hsl(var(--background))"
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          color: "hsl(var(--foreground))",
                        }}
                        formatter={(value: number, name: string) => [`${value} jobs`, name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  
                  {/* Legend */}
                  <div className="flex flex-row lg:flex-col gap-3 flex-wrap justify-center">
                    {statusDistribution.map((entry, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-sm text-muted-foreground">
                          {entry.name}: <span className="font-medium text-foreground">{entry.value}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Link href="/admin/queue">
                <Button variant="outline" className="gap-2">
                  <Activity className="h-4 w-4" />
                  Pending Queue
                </Button>
              </Link>
              <Link href="/admin/queue/proposals">
                <Button variant="outline" className="gap-2">
                  <DollarSign className="h-4 w-4" />
                  Proposals
                </Button>
              </Link>
              <Link href="/admin/job-cards">
                <Button variant="outline" className="gap-2">
                  <Wrench className="h-4 w-4" />
                  All Job Cards
                </Button>
              </Link>
              <Link href="/admin/dashboard">
                <Button variant="outline" className="gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Service Dashboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
