"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertTriangle,
  History,
  Import,
  Loader2,
  CheckCircle2,
  Clock,
  FileText,
} from "lucide-react";
import {
  fetchMachinePendingRepairs,
  markPendingRepairsCompleted,
  type PendingRepairItem,
} from "@/lib/actions";

interface PendingRepairsBannerProps {
  machineSerialNumber: string | null;
  isEnabled: boolean;
  onImportRepairs?: (repairs: PendingRepairItem[]) => void;
}

export function PendingRepairsBanner({
  machineSerialNumber,
  isEnabled,
  onImportRepairs,
}: PendingRepairsBannerProps) {
  const [pendingRepairs, setPendingRepairs] = useState<PendingRepairItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRepairs, setSelectedRepairs] = useState<Set<string>>(new Set());
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);

  // Fetch pending repairs when machine serial number changes
  useEffect(() => {
    const loadPendingRepairs = async () => {
      if (!machineSerialNumber || !isEnabled) {
        setPendingRepairs([]);
        return;
      }

      setIsLoading(true);
      try {
        const repairs = await fetchMachinePendingRepairs(machineSerialNumber);
        setPendingRepairs(repairs);
      } catch (error) {
        console.error("[v0] Failed to fetch pending repairs:", error);
        setPendingRepairs([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadPendingRepairs();
  }, [machineSerialNumber, isEnabled]);

  const toggleRepairSelection = (id: string) => {
    const newSelected = new Set(selectedRepairs);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRepairs(newSelected);
  };

  const selectAll = () => {
    if (selectedRepairs.size === pendingRepairs.length) {
      setSelectedRepairs(new Set());
    } else {
      setSelectedRepairs(new Set(pendingRepairs.map((r) => r.id)));
    }
  };

  const handleImport = async () => {
    if (selectedRepairs.size === 0) return;

    setIsImporting(true);
    try {
      const repairsToImport = pendingRepairs.filter((r) =>
        selectedRepairs.has(r.id)
      );

      // Notify parent to add these to the current quote
      onImportRepairs?.(repairsToImport);

      // Mark as completed (they will be re-added if deferred again)
      await markPendingRepairsCompleted(Array.from(selectedRepairs));

      setImportSuccess(true);
      setTimeout(() => {
        setDialogOpen(false);
        setImportSuccess(false);
        setSelectedRepairs(new Set());
        // Remove imported repairs from the list
        setPendingRepairs((prev) =>
          prev.filter((r) => !selectedRepairs.has(r.id))
        );
      }, 1500);
    } catch (error) {
      console.error("[v0] Failed to import repairs:", error);
    } finally {
      setIsImporting(false);
    }
  };

  // Don't show anything if no pending repairs
  if (!machineSerialNumber || pendingRepairs.length === 0) {
    return null;
  }

  const totalEstimatedCost = pendingRepairs.reduce(
    (sum, r) => sum + r.estimatedCost,
    0
  );

  return (
    <>
      {/* Banner */}
      <Card className="border-amber-500/50 bg-amber-500/10 animate-in slide-in-from-top duration-300">
        <CardContent className="py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30">
                <History className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <h3 className="font-semibold text-amber-500 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Налични предписания за тази машина
                </h3>
                <p className="text-sm text-amber-400/80 mt-0.5">
                  {pendingRepairs.length} отложени ремонта от предишни посещения
                  {totalEstimatedCost > 0 && (
                    <span className="ml-2">
                      (прибл. {totalEstimatedCost.toFixed(2)} €)
                    </span>
                  )}
                </p>
              </div>
            </div>
            <Button
              onClick={() => setDialogOpen(true)}
              className="h-12 px-6 gap-2 bg-amber-500 hover:bg-amber-600 text-black font-semibold"
            >
              <Import className="h-5 w-5" />
              Виж и импортирай
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Import Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-amber-500" />
              Отложени ремонти за {machineSerialNumber}
            </DialogTitle>
            <DialogDescription>
              Изберете предписанията, които искате да импортирате в текущата
              оферта. Няма нужда от нов Free Check за тези позиции.
            </DialogDescription>
          </DialogHeader>

          {importSuccess ? (
            <div className="py-12 text-center">
              <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
              <p className="text-lg font-semibold text-emerald-500">
                Успешно импортирани {selectedRepairs.size} предписания!
              </p>
            </div>
          ) : (
            <>
              {/* Select All */}
              <div className="flex items-center justify-between py-2 border-b border-border">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={selectedRepairs.size === pendingRepairs.length}
                    onCheckedChange={selectAll}
                  />
                  <span className="text-sm font-medium">
                    Избери всички ({pendingRepairs.length})
                  </span>
                </label>
                <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/30">
                  {selectedRepairs.size} избрани
                </Badge>
              </div>

              {/* Repairs List */}
              <div className="space-y-3 py-4 max-h-[400px] overflow-y-auto">
                {pendingRepairs.map((repair) => (
                  <div
                    key={repair.id}
                    onClick={() => toggleRepairSelection(repair.id)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      selectedRepairs.has(repair.id)
                        ? "border-amber-500 bg-amber-500/10"
                        : "border-border bg-secondary/50 hover:bg-secondary"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedRepairs.has(repair.id)}
                        onCheckedChange={() => toggleRepairSelection(repair.id)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="font-medium text-foreground truncate">
                            {repair.description}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(repair.createdAt).toLocaleDateString(
                              "bg-BG"
                            )}
                          </span>
                          {repair.estimatedCost > 0 && (
                            <span className="text-amber-500">
                              ~{repair.estimatedCost.toFixed(2)} €
                            </span>
                          )}
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              repair.status === "deferred"
                                ? "border-amber-500/30 text-amber-500"
                                : "border-blue-500/30 text-blue-500"
                            }`}
                          >
                            {repair.status === "deferred"
                              ? "Отложено"
                              : repair.status === "next_visit"
                                ? "За ново посещение"
                                : repair.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <DialogFooter className="border-t border-border pt-4">
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  className="bg-transparent"
                >
                  Отказ
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={selectedRepairs.size === 0 || isImporting}
                  className="gap-2 bg-amber-500 hover:bg-amber-600 text-black"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Импортиране...
                    </>
                  ) : (
                    <>
                      <Import className="h-4 w-4" />
                      Импортирай {selectedRepairs.size} предписания
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
