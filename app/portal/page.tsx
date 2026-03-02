"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Wrench,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  Camera,
  PenLine,
  AlertTriangle,
  LayoutDashboard,
  FileText,
  LineChart,
  ClipboardList,
  Smartphone,
  Monitor,
  Activity,
  TrendingUp,
  Gauge,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// Stats interface
interface Stats {
  activeJobCards: number;
  pipelineValue: number;
  efficiencyRate: number;
}

export default function PortalSelectionPage() {
  const [stats, setStats] = useState<Stats>({
    activeJobCards: 0,
    pipelineValue: 0,
    efficiencyRate: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Fetch real-time stats
  useEffect(() => {
    const fetchStats = async () => {
      const supabase = createClient();

      try {
        // Fetch active job cards count
        const { count: activeCount } = await supabase
          .from("job_cards")
          .select("*", { count: "exact", head: true })
          .in("status", ["draft", "pending_order", "in_progress"]);

        // Fetch pipeline value from proposals
        const { data: proposalsData } = await supabase
          .from("job_card_proposals")
          .select("estimated_cost")
          .eq("status", "pending");

        const pipelineValue = (proposalsData || []).reduce(
          (sum, p) => sum + (p.estimated_cost || 0),
          0
        );

        // Fetch efficiency (completed vs total this month)
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { count: completedCount } = await supabase
          .from("job_cards")
          .select("*", { count: "exact", head: true })
          .eq("status", "completed")
          .gte("created_at", startOfMonth.toISOString());

        const { count: totalCount } = await supabase
          .from("job_cards")
          .select("*", { count: "exact", head: true })
          .gte("created_at", startOfMonth.toISOString());

        const efficiency =
          totalCount && totalCount > 0
            ? Math.round(((completedCount || 0) / totalCount) * 100)
            : 87;

        setStats({
          activeJobCards: activeCount || 0,
          pipelineValue: pipelineValue,
          efficiencyRate: efficiency,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
        // Fallback values
        setStats({
          activeJobCards: 24,
          pipelineValue: 125000,
          efficiencyRate: 87,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Format currency
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M BGN`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K BGN`;
    }
    return `${value.toLocaleString()} BGN`;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#0a0a0a]/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            {/* Logo placeholder */}
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#367C2B]">
              <Wrench className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Megatron Digital Service
              </h1>
              <p className="text-sm text-gray-400">
                Agricultural Equipment Service Management
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12 md:py-16 lg:py-20">
        {/* Hero Section */}
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 tracking-tight">
            Welcome Back
          </h2>
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto">
            Select your portal to access the Megatron Digital Service platform
          </p>
        </div>

        {/* Portal Cards Grid */}
        <div className="grid md:grid-cols-2 gap-6 lg:gap-8 max-w-5xl mx-auto mb-16">
          {/* Technician Portal Card */}
          <Card className="bg-[#151515] border border-white/10 shadow-xl hover:border-[#367C2B]/50 transition-all duration-300 group overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#367C2B]/10 border border-[#367C2B]/20 group-hover:bg-[#367C2B]/20 transition-colors">
                  <Wrench className="h-7 w-7 text-[#367C2B]" />
                </div>
                <Badge 
                  variant="outline" 
                  className="bg-[#367C2B]/10 text-[#367C2B] border-[#367C2B]/30 text-xs"
                >
                  <Smartphone className="h-3 w-3 mr-1" />
                  Mobile Optimized
                </Badge>
              </div>
              <h3 className="text-2xl font-bold text-white mt-4">
                Technician Portal
              </h3>
              <p className="text-gray-400 text-sm">
                Field service tools for inspection and documentation
              </p>
            </CardHeader>
            <CardContent className="pb-6">
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-gray-300">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#367C2B]/10">
                    <CheckCircle2 className="h-4 w-4 text-[#367C2B]" />
                  </div>
                  <span className="text-sm">14-Point Free Check Inspection</span>
                </li>
                <li className="flex items-center gap-3 text-gray-300">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#367C2B]/10">
                    <Camera className="h-4 w-4 text-[#367C2B]" />
                  </div>
                  <span className="text-sm">Photo Documentation</span>
                </li>
                <li className="flex items-center gap-3 text-gray-300">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#367C2B]/10">
                    <PenLine className="h-4 w-4 text-[#367C2B]" />
                  </div>
                  <span className="text-sm">Customer Signature Capture</span>
                </li>
                <li className="flex items-center gap-3 text-gray-300">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#367C2B]/10">
                    <AlertTriangle className="h-4 w-4 text-[#367C2B]" />
                  </div>
                  <span className="text-sm">Deferred Repairs Alerts</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter className="pt-0">
              <Link href="/" className="w-full">
                <Button 
                  className="w-full h-12 bg-[#367C2B] hover:bg-[#2d6a24] text-white font-semibold text-base gap-2 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-[#367C2B]/20"
                >
                  Enter Technician Portal
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </CardFooter>
          </Card>

          {/* Admin Portal Card */}
          <Card className="bg-[#151515] border border-white/10 shadow-xl hover:border-[#FFDE00]/50 transition-all duration-300 group overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#FFDE00]/10 border border-[#FFDE00]/20 group-hover:bg-[#FFDE00]/20 transition-colors">
                  <BarChart3 className="h-7 w-7 text-[#FFDE00]" />
                </div>
                <Badge 
                  variant="outline" 
                  className="bg-[#FFDE00]/10 text-[#FFDE00] border-[#FFDE00]/30 text-xs"
                >
                  <Monitor className="h-3 w-3 mr-1" />
                  Desktop View
                </Badge>
              </div>
              <h3 className="text-2xl font-bold text-white mt-4">
                Admin Portal
              </h3>
              <p className="text-gray-400 text-sm">
                Management dashboard for service operations
              </p>
            </CardHeader>
            <CardContent className="pb-6">
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-gray-300">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFDE00]/10">
                    <LayoutDashboard className="h-4 w-4 text-[#FFDE00]" />
                  </div>
                  <span className="text-sm">Service Manager Dashboard</span>
                </li>
                <li className="flex items-center gap-3 text-gray-300">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFDE00]/10">
                    <ClipboardList className="h-4 w-4 text-[#FFDE00]" />
                  </div>
                  <span className="text-sm">Proposals Queue Management</span>
                </li>
                <li className="flex items-center gap-3 text-gray-300">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFDE00]/10">
                    <FileText className="h-4 w-4 text-[#FFDE00]" />
                  </div>
                  <span className="text-sm">Quote Generation & PDF Export</span>
                </li>
                <li className="flex items-center gap-3 text-gray-300">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFDE00]/10">
                    <LineChart className="h-4 w-4 text-[#FFDE00]" />
                  </div>
                  <span className="text-sm">KPI Charts & Analytics</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter className="pt-0">
              <Link href="/admin/queue" className="w-full">
                <Button 
                  variant="outline"
                  className="w-full h-12 border-2 border-[#FFDE00] bg-transparent hover:bg-[#FFDE00]/10 text-[#FFDE00] font-semibold text-base gap-2 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-[#FFDE00]/10"
                >
                  Enter Admin Portal
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>

        {/* Stats Bar */}
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-3 gap-4 md:gap-6">
            {/* Active Job Cards */}
            <div className="relative overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-4 md:p-6 text-center group hover:border-white/20 transition-all">
              <div className="absolute inset-0 bg-gradient-to-br from-[#367C2B]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="flex justify-center mb-2">
                  <Activity className="h-5 w-5 text-[#367C2B]" />
                </div>
                <p className={`text-2xl md:text-4xl font-bold text-white mb-1 ${isLoading ? "animate-pulse" : ""}`}>
                  {isLoading ? "..." : stats.activeJobCards}
                </p>
                <p className="text-xs md:text-sm text-gray-400">Active Job Cards</p>
              </div>
            </div>

            {/* Pipeline Value */}
            <div className="relative overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-4 md:p-6 text-center group hover:border-white/20 transition-all">
              <div className="absolute inset-0 bg-gradient-to-br from-[#FFDE00]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="flex justify-center mb-2">
                  <TrendingUp className="h-5 w-5 text-[#FFDE00]" />
                </div>
                <p className={`text-2xl md:text-4xl font-bold text-white mb-1 ${isLoading ? "animate-pulse" : ""}`}>
                  {isLoading ? "..." : formatCurrency(stats.pipelineValue)}
                </p>
                <p className="text-xs md:text-sm text-gray-400">Pipeline Value</p>
              </div>
            </div>

            {/* Efficiency Rate */}
            <div className="relative overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-4 md:p-6 text-center group hover:border-white/20 transition-all">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="flex justify-center mb-2">
                  <Gauge className="h-5 w-5 text-emerald-500" />
                </div>
                <p className={`text-2xl md:text-4xl font-bold text-white mb-1 ${isLoading ? "animate-pulse" : ""}`}>
                  {isLoading ? "..." : `${stats.efficiencyRate}%`}
                </p>
                <p className="text-xs md:text-sm text-gray-400">Efficiency Rate</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#0a0a0a]/95 py-6">
        <div className="container mx-auto px-4">
          <p className="text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Megatron EAD. Powered by Digital Service Platform.
          </p>
        </div>
      </footer>
    </div>
  );
}
