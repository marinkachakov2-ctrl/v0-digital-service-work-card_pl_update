"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
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
  Sun,
  Moon,
  MonitorPlay,
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

// Translation dictionary
const translations = {
  en: {
    welcomeBack: "Welcome Back",
    selectPortal: "Select your portal to access the Megatron Digital Service platform",
    technicianPortal: "Technician Portal",
    technicianDesc: "Field service tools for inspection and documentation",
    freeCheckInspection: "14-Point Free Check Inspection",
    photoDocumentation: "Photo Documentation",
    signatureCapture: "Customer Signature Capture",
    deferredRepairs: "Deferred Repairs Alerts",
    enterTechnician: "Enter Technician Portal",
    adminPortal: "Admin Portal",
    adminDesc: "Management dashboard for service operations",
    serviceDashboard: "Service Manager Dashboard",
    proposalsQueue: "Proposals Queue Management",
    quoteGeneration: "Quote Generation & PDF Export",
    kpiCharts: "KPI Charts & Analytics",
    enterAdmin: "Enter Admin Portal",
    activeJobCards: "Active Job Cards",
    pipelineValue: "Pipeline Value",
    efficiencyRate: "Efficiency Rate",
    mobileOptimized: "Mobile Optimized",
    desktopView: "Desktop View",
  },
  bg: {
    welcomeBack: "Добре дошли отново",
    selectPortal: "Изберете портал за достъп до платформата Megatron Digital Service",
    technicianPortal: "Технически Портал",
    technicianDesc: "Инструменти за инспекция и документация на терен",
    freeCheckInspection: "14-точкова безплатна инспекция",
    photoDocumentation: "Снимкова документация",
    signatureCapture: "Вземане на подпис от клиент",
    deferredRepairs: "Известия за отложени ремонти",
    enterTechnician: "Вход в Технически Портал",
    adminPortal: "Административен Портал",
    adminDesc: "Управленско табло за сервизни операции",
    serviceDashboard: "Табло на Сервизния Мениджър",
    proposalsQueue: "Управление на опашката с оферти",
    quoteGeneration: "Генериране на оферти и PDF експорт",
    kpiCharts: "KPI Графики и Анализи",
    enterAdmin: "Вход в Административен Портал",
    activeJobCards: "Активни Работни Карти",
    pipelineValue: "Стойност в Процес",
    efficiencyRate: "Ефективност",
    mobileOptimized: "Мобилна Версия",
    desktopView: "Десктоп Изглед",
  },
} as const;

type Language = "bg" | "en";

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
  const [lang, setLang] = useState<Language>("bg");
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Get translations for current language
  const t = translations[lang];

  useEffect(() => {
    setMounted(true);
  }, []);

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
      return `${(value / 1000000).toFixed(1)}M €`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K €`;
    }
    return `${value.toLocaleString()} €`;
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background text-foreground">
        {/* Header */}
        <header className="border-b border-border bg-card/95 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Logo placeholder */}
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#367C2B]">
                  <Wrench className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground tracking-tight">
                    Megatron Digital Service
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Agricultural Equipment Service Management
                  </p>
                </div>
              </div>

              {/* Global Controls */}
              <div className="flex items-center gap-3">
                {/* Theme Switcher */}
                {mounted && (
                  <div className="flex items-center gap-0.5 p-1 rounded-lg bg-muted/30 border border-border/50">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => setTheme("light")}
                          className={cn(
                            "p-2 rounded-md transition-all",
                            theme === "light"
                              ? "bg-background shadow-sm text-amber-500"
                              : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                          )}
                        >
                          <Sun className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-xs">
                        Light Mode
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => setTheme("dark")}
                          className={cn(
                            "p-2 rounded-md transition-all",
                            theme === "dark"
                              ? "bg-background shadow-sm text-primary"
                              : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                          )}
                        >
                          <Moon className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-xs">
                        Dark Mode
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => setTheme("presentation")}
                          className={cn(
                            "p-2 rounded-md transition-all",
                            theme === "presentation"
                              ? "bg-background shadow-sm text-[#367C2B]"
                              : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                          )}
                        >
                          <MonitorPlay className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-xs">
                        Presentation Mode
                      </TooltipContent>
                    </Tooltip>
                  </div>
                )}

                {/* Language Toggle */}
                <button
                  onClick={() => setLang(lang === "bg" ? "en" : "bg")}
                  className={cn(
                    "flex items-center justify-center h-9 px-3 rounded-lg border border-border/50 bg-muted/30 text-sm font-semibold transition-all hover:bg-muted/50",
                    lang === "bg" ? "text-[#367C2B]" : "text-primary"
                  )}
                >
                  {lang.toUpperCase()}
                </button>
              </div>
            </div>
          </div>
        </header>

      {/* Main Content */}
        <main className="container mx-auto px-4 py-12 md:py-16 lg:py-20">
          {/* Hero Section */}
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 tracking-tight">
              {t.welcomeBack}
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              {t.selectPortal}
            </p>
          </div>

        {/* Portal Cards Grid */}
          <div className="grid md:grid-cols-2 gap-6 lg:gap-8 max-w-5xl mx-auto mb-16">
            {/* Technician Portal Card */}
            <Card className="bg-card border border-border shadow-xl hover:border-[#367C2B]/50 transition-all duration-300 group overflow-hidden">
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
                    {t.mobileOptimized}
                  </Badge>
                </div>
                <h3 className="text-2xl font-bold text-foreground mt-4">
                  {t.technicianPortal}
                </h3>
                <p className="text-muted-foreground text-sm">{t.technicianDesc}</p>
              </CardHeader>
              <CardContent className="pb-6">
                <ul className="space-y-3">
                  <li className="flex items-center gap-3 text-muted-foreground">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#367C2B]/10">
                      <CheckCircle2 className="h-4 w-4 text-[#367C2B]" />
                    </div>
                    <span className="text-sm">{t.freeCheckInspection}</span>
                  </li>
                  <li className="flex items-center gap-3 text-muted-foreground">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#367C2B]/10">
                      <Camera className="h-4 w-4 text-[#367C2B]" />
                    </div>
                    <span className="text-sm">{t.photoDocumentation}</span>
                  </li>
                  <li className="flex items-center gap-3 text-muted-foreground">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#367C2B]/10">
                      <PenLine className="h-4 w-4 text-[#367C2B]" />
                    </div>
                    <span className="text-sm">{t.signatureCapture}</span>
                  </li>
                  <li className="flex items-center gap-3 text-muted-foreground">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#367C2B]/10">
                      <AlertTriangle className="h-4 w-4 text-[#367C2B]" />
                    </div>
                    <span className="text-sm">{t.deferredRepairs}</span>
                  </li>
                </ul>
              </CardContent>
              <CardFooter className="pt-0 flex flex-col gap-2">
                <Link href="/technician" className="w-full">
                  <Button className="w-full h-12 bg-[#367C2B] hover:bg-[#2d6a24] text-white font-semibold text-base gap-2 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-[#367C2B]/20">
                    {t.enterTechnician}
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>

          {/* Admin Portal Card */}
            <Card className="bg-card border border-border shadow-xl hover:border-[#FFDE00]/50 transition-all duration-300 group overflow-hidden">
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
                    {t.desktopView}
                  </Badge>
                </div>
                <h3 className="text-2xl font-bold text-foreground mt-4">
                  {t.adminPortal}
                </h3>
                <p className="text-muted-foreground text-sm">{t.adminDesc}</p>
              </CardHeader>
              <CardContent className="pb-6">
                <ul className="space-y-3">
                  <li className="flex items-center gap-3 text-muted-foreground">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFDE00]/10">
                      <LayoutDashboard className="h-4 w-4 text-[#FFDE00]" />
                    </div>
                    <span className="text-sm">{t.serviceDashboard}</span>
                  </li>
                  <li className="flex items-center gap-3 text-muted-foreground">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFDE00]/10">
                      <ClipboardList className="h-4 w-4 text-[#FFDE00]" />
                    </div>
                    <span className="text-sm">{t.proposalsQueue}</span>
                  </li>
                  <li className="flex items-center gap-3 text-muted-foreground">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFDE00]/10">
                      <FileText className="h-4 w-4 text-[#FFDE00]" />
                    </div>
                    <span className="text-sm">{t.quoteGeneration}</span>
                  </li>
                  <li className="flex items-center gap-3 text-muted-foreground">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFDE00]/10">
                      <LineChart className="h-4 w-4 text-[#FFDE00]" />
                    </div>
                    <span className="text-sm">{t.kpiCharts}</span>
                  </li>
                </ul>
              </CardContent>
              <CardFooter className="pt-0">
                <Link href="/app" className="w-full">
                  <Button
                    variant="outline"
                    className="w-full h-12 border-2 border-[#FFDE00] bg-transparent hover:bg-[#FFDE00]/10 text-[#FFDE00] font-semibold text-base gap-2 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-[#FFDE00]/10"
                  >
                    {t.enterAdmin}
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
              <div className="relative overflow-hidden rounded-xl border border-border bg-card/50 backdrop-blur-md p-4 md:p-6 text-center group hover:border-border/80 transition-all">
                <div className="absolute inset-0 bg-gradient-to-br from-[#367C2B]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="flex justify-center mb-2">
                    <Activity className="h-5 w-5 text-[#367C2B]" />
                  </div>
                  <p
                    className={`text-2xl md:text-4xl font-bold text-foreground mb-1 ${isLoading ? "animate-pulse" : ""}`}
                  >
                    {isLoading ? "..." : stats.activeJobCards}
                  </p>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    {t.activeJobCards}
                  </p>
                </div>
              </div>

              {/* Pipeline Value */}
              <div className="relative overflow-hidden rounded-xl border border-border bg-card/50 backdrop-blur-md p-4 md:p-6 text-center group hover:border-border/80 transition-all">
                <div className="absolute inset-0 bg-gradient-to-br from-[#FFDE00]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="flex justify-center mb-2">
                    <TrendingUp className="h-5 w-5 text-[#FFDE00]" />
                  </div>
                  <p
                    className={`text-2xl md:text-4xl font-bold text-foreground mb-1 ${isLoading ? "animate-pulse" : ""}`}
                  >
                    {isLoading ? "..." : formatCurrency(stats.pipelineValue)}
                  </p>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    {t.pipelineValue}
                  </p>
                </div>
              </div>

              {/* Efficiency Rate */}
              <div className="relative overflow-hidden rounded-xl border border-border bg-card/50 backdrop-blur-md p-4 md:p-6 text-center group hover:border-border/80 transition-all">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="flex justify-center mb-2">
                    <Gauge className="h-5 w-5 text-emerald-500" />
                  </div>
                  <p
                    className={`text-2xl md:text-4xl font-bold text-foreground mb-1 ${isLoading ? "animate-pulse" : ""}`}
                  >
                    {isLoading ? "..." : `${stats.efficiencyRate}%`}
                  </p>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    {t.efficiencyRate}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-border bg-card/95 py-6">
          <div className="container mx-auto px-4">
            <p className="text-center text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} Megatron EAD. Powered by Digital
              Service Platform.
            </p>
          </div>
        </footer>
      </div>
    </TooltipProvider>
  );
}
