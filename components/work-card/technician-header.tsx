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
} from "lucide-react";
import {
  fetchMachinePendingRepairs,
  fetchMachineServiceHistory,
  markPendingRepairsCompleted,
  type PendingRepairItem,
  type MachineServiceHistoryItem,
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

interface TechnicianHeaderProps {
  jobCard: JobCardDetails;
  isEnabled: boolean;
  onImportRepairs?: (repairs: PendingRepairItem[]) => void;
}

export function TechnicianHeader({
  jobCard,
  isEnabled,
  onImportRepairs,
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
                <p className="text-xl md:text-2xl font-bold text-foreground truncate">
                  {jobCard.orderNo || jobCard.id.slice(0, 8)}
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
                className="h-12 px-4 text-base font-semibold border-2 border-foreground/30 bg-secondary"
              >
                {jobCard.machineModel}
              </Badge>
              <p className="text-xs text-muted-foreground text-center mt-1">
                SN: {jobCard.serialNumber}
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

          {/* Current Task Tab */}
          <TabsContent value="current" className="p-4 m-0">
            <div className="text-center py-8 text-muted-foreground">
              <Wrench className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium">Работна зона</p>
              <p className="text-sm">
                Продължете с попълването на работната карта по-долу
              </p>
            </div>
          </TabsContent>

          {/* Machine History Tab - Vertical Timeline */}
          <TabsContent value="history" className="p-4 m-0">
            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-3 text-lg text-muted-foreground">
                  Зареждане на история...
                </span>
              </div>
            ) : serviceHistory.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-lg font-medium">Няма история за тази машина</p>
                <p className="text-sm">
                  Това може да е първото обслужване
                </p>
              </div>
            ) : (
              <div className="relative">
                {/* Timeline Line */}
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

                {/* Timeline Items */}
                <div className="space-y-6">
                  {serviceHistory.map((item, index) => (
                    <div key={item.id} className="relative flex gap-4 pl-2">
                      {/* Timeline Dot */}
                      <div
                        className={cn(
                          "relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 shrink-0",
                          index === 0
                            ? "bg-primary border-primary text-primary-foreground"
                            : "bg-background border-border"
                        )}
                      >
                        <Calendar className="h-5 w-5" />
                      </div>

                      {/* Content Card */}
                      <Card
                        className={cn(
                          "flex-1 border",
                          index === 0 ? "border-primary/50 bg-primary/5" : ""
                        )}
                      >
                        <CardContent className="p-4">
                          {/* Header */}
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <Badge
                              variant={index === 0 ? "default" : "secondary"}
                              className="text-sm font-semibold"
                            >
                              {formatDate(item.serviceDate)}
                            </Badge>
                            {item.orderNo && (
                              <Badge variant="outline" className="text-xs">
                                {item.orderNo}
                              </Badge>
                            )}
                            <span className="text-sm text-muted-foreground">
                              <User className="h-3.5 w-3.5 inline mr-1" />
                              {item.technicianName}
                            </span>
                          </div>

                          {/* Description */}
                          <p className="text-base font-medium text-foreground mb-3">
                            {item.description}
                          </p>

                          {/* Parts Replaced */}
                          {item.partsReplaced.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-border">
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                                <Package className="h-3.5 w-3.5" />
                                Сменени части
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {item.partsReplaced.slice(0, 3).map((part, i) => (
                                  <Badge
                                    key={i}
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {part}
                                  </Badge>
                                ))}
                                {item.partsReplaced.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{item.partsReplaced.length - 3} още
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Hours Recorded */}
                          {item.hoursRecorded > 0 && (
                            <div className="mt-2 text-sm text-muted-foreground">
                              Моточасове: {item.hoursRecorded.toLocaleString()}h
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Arrow */}
                      <ChevronRight className="h-5 w-5 text-muted-foreground self-center shrink-0 hidden md:block" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Tech Docs Tab */}
          <TabsContent value="docs" className="p-4 m-0">
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium">Техническа документация</p>
              <p className="text-sm mb-4">
                Схеми, наръчници и указания за {jobCard.machineModel}
              </p>
              <Button variant="outline" className="gap-2 h-12 px-6 text-base">
                <FileText className="h-5 w-5" />
                Отвори JD Parts
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
