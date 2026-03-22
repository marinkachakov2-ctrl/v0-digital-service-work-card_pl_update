"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  MapPin,
  User,
  Hash,
  Import,
  Loader2,
  CheckCircle2,
  Clock,
  Wrench,
  FileText,
  History,
  ChevronRight,
  Package,
  Calendar,
  ExternalLink,
  Download,
  AlertCircle,
  Info,
  ShoppingCart,
  BookOpen,
  Cpu,
  Droplets,
  Settings,
} from "lucide-react";
import {
  fetchMachinePendingRepairs,
  fetchMachineServiceHistory,
  markPendingRepairsCompleted,
  type PendingRepairItem,
  type MachineServiceHistoryItem,
  type MachineTelematics,
} from "@/lib/actions";
import { cn } from "@/lib/utils";

interface JobCardDetails {
  id: string;
  orderNo: string;
  customerName: string;
  location?: string;
  machineModel: string;
  serialNumber: string;
}

// JDLink historical event types
interface JDLinkHistoryEvent {
  id: string;
  type: "dtc" | "warning" | "maintenance" | "info";
  code?: string;
  description: string;
  date: string;
  status: "resolved" | "active";
  engineHours?: number;
}

// Technical documentation types
interface TechDocument {
  id: string;
  title: string;
  type: "manual" | "schematic" | "bulletin";
  url: string;
}

interface RecommendedPart {
  partNumber: string;
  name: string;
  reason: string;
  price?: number;
}

interface TechnicianHeaderProps {
  jobCard: JobCardDetails;
  isEnabled: boolean;
  onImportRepairs?: (repairs: PendingRepairItem[]) => void;
  // JDLink telematics data
  telematics?: MachineTelematics;
  dtcCodes?: Array<{ code: string; description: string; severity: "warning" | "critical" }>;
}

export function TechnicianHeader({
  jobCard,
  isEnabled,
  onImportRepairs,
  telematics,
  dtcCodes = [],
}: TechnicianHeaderProps) {
  const [activeTab, setActiveTab] = useState("current");
  
  // Pending repairs state
  const [pendingRepairs, setPendingRepairs] = useState<PendingRepairItem[]>([]);
  const [isLoadingRepairs, setIsLoadingRepairs] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);

  // Service history state
  const [serviceHistory, setServiceHistory] = useState<MachineServiceHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Simulated JDLink history data
  const jdlinkHistory: JDLinkHistoryEvent[] = [
    {
      id: "evt-1",
      type: "dtc",
      code: "ECU 110.03",
      description: "Engine Coolant Temp High",
      date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), // 2 months ago
      status: "resolved",
      engineHours: 2056,
    },
    {
      id: "evt-2",
      type: "warning",
      description: "Critical Overheat Warning - Engine shutdown initiated",
      date: new Date(Date.now() - 62 * 24 * 60 * 60 * 1000).toISOString(),
      status: "resolved",
      engineHours: 2054,
    },
    {
      id: "evt-3",
      type: "maintenance",
      description: "500h Service Completed - Oil change, filters replaced",
      date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), // 3 months ago
      status: "resolved",
      engineHours: 2000,
    },
    {
      id: "evt-4",
      type: "info",
      description: "JDLink Remote Diagnostic Session",
      date: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
      status: "resolved",
      engineHours: 1950,
    },
    {
      id: "evt-5",
      type: "maintenance",
      description: "1000h Major Service - Hydraulic fluid change",
      date: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
      status: "resolved",
      engineHours: 1500,
    },
  ];

  // Add active DTCs to history
  const fullHistory: JDLinkHistoryEvent[] = [
    ...dtcCodes.map((dtc, idx) => ({
      id: `active-dtc-${idx}`,
      type: "dtc" as const,
      code: dtc.code,
      description: dtc.description,
      date: new Date().toISOString(),
      status: "active" as const,
      engineHours: telematics?.engineHours,
    })),
    ...jdlinkHistory,
  ];

  // Simulated technical documents based on machine model
  const techDocuments: TechDocument[] = [
    {
      id: "doc-1",
      title: `Operator Manual - ${jobCard.machineModel}`,
      type: "manual",
      url: "#",
    },
    {
      id: "doc-2",
      title: "Hydraulic System Schematic",
      type: "schematic",
      url: "#",
    },
    {
      id: "doc-3",
      title: "Engine Service Bulletin TSB-2024-015",
      type: "bulletin",
      url: "#",
    },
  ];

  // Recommended parts based on active DTCs
  const recommendedParts: RecommendedPart[] = dtcCodes.some(d => d.description.toLowerCase().includes("oil pressure"))
    ? [
        {
          partNumber: "RE520836",
          name: "Oil Pressure Sensor",
          reason: "Active DTC: Engine Oil Pressure Low",
          price: 89.50,
        },
        {
          partNumber: "RE504836",
          name: "Oil Filter Element",
          reason: "Recommended with pressure sensor replacement",
          price: 24.75,
        },
      ]
    : [];

  // Fetch pending repairs
  useEffect(() => {
    const loadPendingRepairs = async () => {
      if (!jobCard.serialNumber || !isEnabled) {
        setPendingRepairs([]);
        return;
      }

      setIsLoadingRepairs(true);
      try {
        const repairs = await fetchMachinePendingRepairs(jobCard.serialNumber);
        setPendingRepairs(repairs);
      } catch (error) {
        console.error("Failed to fetch pending repairs:", error);
        setPendingRepairs([]);
      } finally {
        setIsLoadingRepairs(false);
      }
    };

    loadPendingRepairs();
  }, [jobCard.serialNumber, isEnabled]);

  // Fetch service history when tab is activated
  useEffect(() => {
    const loadHistory = async () => {
      if (activeTab !== "history" || !jobCard.serialNumber) return;
      if (serviceHistory.length > 0) return; // Already loaded

      setIsLoadingHistory(true);
      try {
        const history = await fetchMachineServiceHistory(jobCard.serialNumber);
        setServiceHistory(history);
      } catch (error) {
        console.error("Failed to fetch service history:", error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadHistory();
  }, [activeTab, jobCard.serialNumber, serviceHistory.length]);

  // Import all pending repairs
  const handleImportAll = async () => {
    if (pendingRepairs.length === 0) return;

    setIsImporting(true);
    try {
      onImportRepairs?.(pendingRepairs);
      
      // Mark as completed
      const repairIds = pendingRepairs.map((r) => r.id);
      await markPendingRepairsCompleted(repairIds);
      
      setImportSuccess(true);
      setTimeout(() => {
        setPendingRepairs([]);
        setImportSuccess(false);
      }, 2000);
    } catch (error) {
      console.error("Failed to import repairs:", error);
    } finally {
      setIsImporting(false);
    }
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("bg-BG", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Format relative time
  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Днес";
    if (diffDays === 1) return "Вчера";
    if (diffDays < 7) return `Преди ${diffDays} дни`;
    if (diffDays < 30) return `Преди ${Math.floor(diffDays / 7)} седмици`;
    if (diffDays < 365) return `Преди ${Math.floor(diffDays / 30)} месеца`;
    return `Преди ${Math.floor(diffDays / 365)} години`;
  };

  // Get icon for event type
  const getEventIcon = (type: JDLinkHistoryEvent["type"]) => {
    switch (type) {
      case "dtc":
        return <Cpu className="h-4 w-4" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4" />;
      case "maintenance":
        return <Wrench className="h-4 w-4" />;
      case "info":
        return <Info className="h-4 w-4" />;
    }
  };

  // Get colors for event type
  const getEventColors = (type: JDLinkHistoryEvent["type"], status: "active" | "resolved") => {
    if (status === "active") {
      return {
        bg: "bg-red-500/20",
        border: "border-red-500",
        text: "text-red-400",
        icon: "text-red-400",
      };
    }
    switch (type) {
      case "dtc":
        return {
          bg: "bg-amber-500/10",
          border: "border-amber-500/30",
          text: "text-amber-400",
          icon: "text-amber-400",
        };
      case "warning":
        return {
          bg: "bg-orange-500/10",
          border: "border-orange-500/30",
          text: "text-orange-400",
          icon: "text-orange-400",
        };
      case "maintenance":
        return {
          bg: "bg-emerald-500/10",
          border: "border-emerald-500/30",
          text: "text-emerald-400",
          icon: "text-emerald-400",
        };
      case "info":
        return {
          bg: "bg-blue-500/10",
          border: "border-blue-500/30",
          text: "text-blue-400",
          icon: "text-blue-400",
        };
    }
  };

  // Get document icon
  const getDocIcon = (type: TechDocument["type"]) => {
    switch (type) {
      case "manual":
        return <BookOpen className="h-5 w-5" />;
      case "schematic":
        return <Settings className="h-5 w-5" />;
      case "bulletin":
        return <AlertCircle className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Section: Active Job Card Details - High Contrast */}
      <Card className="border-2 border-primary/50 bg-primary/5">
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            {/* Job Card ID */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-primary/20 border-2 border-primary/40 shrink-0">
                <Hash className="h-7 w-7 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Job Card
                </p>
                <p className={cn(
                    "text-xl md:text-2xl font-bold truncate",
                    (!jobCard.orderNo && (jobCard.id === "NEW" || jobCard.id === "DRAFT" || !jobCard.id))
                      ? "text-[#00FF88] animate-pulse"
                      : "text-foreground"
                  )}>
                  {jobCard.orderNo || (jobCard.id === "NEW" || jobCard.id === "DRAFT" || !jobCard.id ? "DRAFT" : jobCard.id.slice(0, 8))}
                </p>
              </div>
            </div>

            {/* Separator */}
            <div className="hidden md:block w-px h-14 bg-border" />

            {/* Customer */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-secondary shrink-0">
                <User className="h-6 w-6 text-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Клиент
                </p>
                <p className="text-lg font-semibold text-foreground truncate">
                  {jobCard.customerName || "N/A"}
                </p>
              </div>
            </div>

            {/* Location */}
            {jobCard.location && (
              <>
                <div className="hidden md:block w-px h-14 bg-border" />
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-secondary shrink-0">
                    <MapPin className="h-6 w-6 text-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Локация
                    </p>
                    <p className="text-lg font-semibold text-foreground truncate">
                      {jobCard.location}
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* Machine Badge */}
            <div className="md:ml-auto shrink-0">
              <Badge
                variant="outline"
                className={cn(
                  "h-12 px-4 text-base font-semibold border-2 bg-secondary",
                  (!jobCard.machineModel || jobCard.machineModel === "N/A")
                    ? "border-muted-foreground/30 text-muted-foreground"
                    : "border-[#007A33]/50 text-foreground"
                )}
              >
                {jobCard.machineModel && jobCard.machineModel !== "N/A" 
                  ? jobCard.machineModel 
                  : "Изберете машина"}
              </Badge>
              <p className="text-xs text-muted-foreground text-center mt-1">
                {jobCard.serialNumber 
                  ? `SN: ${jobCard.serialNumber}` 
                  : "Сканирайте QR код"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Critical Alert Banner - Deferred Repairs */}
      {pendingRepairs.length > 0 && !importSuccess && (
        <Card className="border-2 border-amber-500 bg-amber-500/10 animate-pulse-subtle">
          <CardContent className="p-4 md:p-5">
            <div className="flex flex-col md:flex-row md:items-start gap-4">
              {/* Warning Icon */}
              <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-amber-500/20 border-2 border-amber-500/50 shrink-0">
                <AlertTriangle className="h-8 w-8 text-amber-500" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg md:text-xl font-bold text-amber-500">
                    ВНИМАНИЕ!
                  </h3>
                  <Badge className="bg-amber-500 text-black font-bold text-base px-3">
                    {pendingRepairs.length}
                  </Badge>
                  <span className="text-base md:text-lg font-semibold text-foreground">
                    Отложени ремонта за този сериен номер
                  </span>
                </div>

                {/* Deferred Items List */}
                <div className="space-y-2 mt-3">
                  {pendingRepairs.slice(0, 3).map((repair) => (
                    <div
                      key={repair.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-background/60 border border-amber-500/30"
                    >
                      <Clock className="h-5 w-5 text-amber-500 shrink-0" />
                      <span className="text-base font-medium text-foreground flex-1 truncate">
                        {repair.description}
                      </span>
                      <span className="text-sm text-muted-foreground shrink-0">
                        {formatDate(repair.createdAt)}
                      </span>
                    </div>
                  ))}
                  {pendingRepairs.length > 3 && (
                    <p className="text-sm text-amber-500 font-medium pl-2">
                      + {pendingRepairs.length - 3} още...
                    </p>
                  )}
                </div>
              </div>

              {/* Import Button - Large Touch Target */}
              <Button
                onClick={handleImportAll}
                disabled={isImporting}
                className="h-16 md:h-14 px-6 gap-3 bg-amber-500 hover:bg-amber-600 text-black font-bold text-lg shrink-0 w-full md:w-auto"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin" />
                    Импортиране...
                  </>
                ) : (
                  <>
                    <Import className="h-6 w-6" />
                    Импортирай в картата
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Success Message */}
      {importSuccess && (
        <Card className="border-2 border-emerald-500 bg-emerald-500/10">
          <CardContent className="p-4 flex items-center justify-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            <span className="text-xl font-bold text-emerald-500">
              Успешно импортирани {pendingRepairs.length} записа!
            </span>
          </CardContent>
        </Card>
      )}

      {/* Tabs Section - Large Touch Targets */}
      <Card className="border-border">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full h-auto p-2 bg-secondary/50 rounded-t-lg rounded-b-none grid grid-cols-3 gap-2">
            <TabsTrigger
              value="current"
              className={cn(
                "h-14 md:h-12 text-base md:text-sm font-semibold gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
                "touch-manipulation"
              )}
            >
              <Wrench className="h-5 w-5" />
              <span className="hidden sm:inline">Текуща</span> Задача
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className={cn(
                "h-14 md:h-12 text-base md:text-sm font-semibold gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
                "touch-manipulation"
              )}
            >
              <History className="h-5 w-5" />
              <span className="hidden sm:inline">История на</span> Машината
            </TabsTrigger>
            <TabsTrigger
              value="docs"
              className={cn(
                "h-14 md:h-12 text-base md:text-sm font-semibold gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
                "touch-manipulation"
              )}
            >
              <FileText className="h-5 w-5" />
              <span className="hidden sm:inline">Техническа</span> Док.
            </TabsTrigger>
          </TabsList>

          {/* Current Task Tab - Empty, content is rendered in parent page */}
          <TabsContent value="current" className="hidden" />

          {/* Machine History Tab - Dark Timeline with JDLink Data */}
          <TabsContent value="history" className="p-0 m-0">
            <div className="bg-[#0a0f0a] rounded-b-lg">
              {/* Header */}
              <div className="p-4 border-b border-[#1a2f1a]">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#007A33] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#007A33]"></span>
                    </div>
                    <span className="text-sm font-medium text-[#007A33]">JDLink Connected</span>
                  </div>
                  <span className="text-xs text-gray-500">|</span>
                  <span className="text-sm text-gray-400">{jobCard.machineModel}</span>
                  <span className="text-xs text-gray-600 font-mono">#{jobCard.serialNumber}</span>
                </div>
              </div>

              {/* Timeline */}
              <div className="p-4">
                {isLoadingHistory ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-[#007A33]" />
                    <span className="ml-3 text-lg text-gray-400">
                      Зареждане на JDLink история...
                    </span>
                  </div>
                ) : (
                  <div className="relative">
                    {/* Timeline Line */}
                    <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#007A33] via-[#1a2f1a] to-transparent" />

                    {/* Timeline Items */}
                    <div className="space-y-4">
                      {fullHistory.map((event, index) => {
                        const colors = getEventColors(event.type, event.status);
                        return (
                          <div key={event.id} className="relative flex gap-4 pl-0">
                            {/* Timeline Dot */}
                            <div
                              className={cn(
                                "relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 shrink-0",
                                colors.bg,
                                colors.border
                              )}
                            >
                              <span className={colors.icon}>
                                {getEventIcon(event.type)}
                              </span>
                            </div>

                            {/* Content Card */}
                            <div
                              className={cn(
                                "flex-1 rounded-lg border p-3",
                                colors.bg,
                                colors.border,
                                event.status === "active" && "animate-pulse"
                              )}
                            >
                              {/* Header */}
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <div className="flex items-center gap-2">
                                  {event.code && (
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        "font-mono text-xs",
                                        colors.border,
                                        colors.text
                                      )}
                                    >
                                      {event.code}
                                    </Badge>
                                  )}
                                  {event.status === "active" ? (
                                    <Badge className="bg-red-500 text-white text-xs">
                                      АКТИВЕН
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 text-xs">
                                      Решен
                                    </Badge>
                                  )}
                                </div>
                                <span className="text-xs text-gray-500">
                                  {formatRelativeTime(event.date)}
                                </span>
                              </div>

                              {/* Description */}
                              <p className={cn("text-sm font-medium", colors.text)}>
                                {event.description}
                              </p>

                              {/* Footer */}
                              <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                <span>{formatDate(event.date)}</span>
                                {event.engineHours && (
                                  <>
                                    <span>•</span>
                                    <span>{event.engineHours.toLocaleString()}h</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Tech Docs Tab - Resource Hub */}
          <TabsContent value="docs" className="p-0 m-0">
            <div className="bg-[#0a0f0a] rounded-b-lg">
              {/* Header */}
              <div className="p-4 border-b border-[#1a2f1a]">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Техническа Документация</h3>
                    <p className="text-sm text-gray-400">{jobCard.machineModel} • SN: {jobCard.serialNumber}</p>
                  </div>
                  <Badge variant="outline" className="text-[#007A33] border-[#007A33]/30">
                    Service ADVISOR
                  </Badge>
                </div>
              </div>

              <div className="p-4 space-y-6">
                {/* Manuals Section */}
                <div>
                  <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Наръчници и Схеми
                  </h4>
                  <div className="space-y-2">
                    {techDocuments.map((doc) => (
                      <a
                        key={doc.id}
                        href={doc.url}
                        className="flex items-center gap-3 p-3 rounded-lg bg-[#1a2f1a]/50 border border-[#1a2f1a] hover:border-[#007A33]/50 hover:bg-[#1a2f1a] transition-colors group"
                      >
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#007A33]/20 text-[#007A33] group-hover:bg-[#007A33]/30">
                          {getDocIcon(doc.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{doc.title}</p>
                          <p className="text-xs text-gray-500">PDF • Изтегли</p>
                        </div>
                        <Download className="h-5 w-5 text-gray-500 group-hover:text-[#007A33]" />
                      </a>
                    ))}
                  </div>
                </div>

                {/* Recommended Parts - Based on Active DTCs */}
                {recommendedParts.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-amber-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Препоръчани Части (по активни DTC)
                    </h4>
                    <div className="space-y-2">
                      {recommendedParts.map((part) => (
                        <div
                          key={part.partNumber}
                          className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30"
                        >
                          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-500/20 text-amber-400">
                            <Droplets className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-white">{part.name}</p>
                              <Badge variant="outline" className="font-mono text-xs text-amber-400 border-amber-500/30">
                                #{part.partNumber}
                              </Badge>
                            </div>
                            <p className="text-xs text-amber-400/70">{part.reason}</p>
                          </div>
                          {part.price && (
                            <span className="text-sm font-semibold text-white">{part.price.toFixed(2)} €</span>
                          )}
                          <Button
                            size="sm"
                            className="bg-amber-500 hover:bg-amber-600 text-black font-semibold gap-1"
                          >
                            <ShoppingCart className="h-4 w-4" />
                            Заяви
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* JD Parts Link */}
                <div className="pt-4 border-t border-[#1a2f1a]">
                  <Button
                    variant="outline"
                    className="w-full h-14 gap-3 text-base font-semibold border-[#007A33] text-[#007A33] hover:bg-[#007A33]/10 hover:text-[#007A33]"
                    onClick={() => window.open("https://jdparts.deere.com", "_blank")}
                  >
                    <Package className="h-5 w-5" />
                    Отвори JD Parts Каталог
                    <ExternalLink className="h-4 w-4 ml-auto" />
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
