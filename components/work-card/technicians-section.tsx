"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Pause, Square, Users, X, Plus, ChevronDown, Check } from "lucide-react";
import { fetchTechnicians } from "@/lib/actions";
import { cn } from "@/lib/utils";

type TimerStatus = "idle" | "running" | "paused";

interface TechnicianInfo {
  id: string;
  name: string;
}

// Individual technician row state
interface TechnicianRow {
  id: string; // Unique row ID
  technicianId: string; // Selected technician ID
  technicianName: string; // Selected technician name
  timeElapsed: number; // Time in seconds
  status: TimerStatus;
}

interface TechniciansSectionProps {
  assignedTechnicians: string[];
  onAssignedTechniciansChange: (techs: string[]) => void;
  leadTechnicianId: string | null;
  onLeadTechnicianIdChange: (id: string | null) => void;
  clockAtJobLevel: boolean;
  onClockAtJobLevelChange: (val: boolean) => void;
  // Timer props (for compatibility - total time)
  timerStatus: TimerStatus;
  elapsedTime: string;
  onTimerStart: () => void;
  onTimerPause: () => void;
  onTimerStop: () => void;
  // Control props
  isJobSelected: boolean;
  isHoursValid: boolean;
  currentOrderType: string;
  onOrderTypeCapture?: (orderType: string) => void;
  isPhotoValid: boolean;
}

// Format seconds to HH:MM:SS
function formatTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function TechniciansSection({
  assignedTechnicians,
  onAssignedTechniciansChange,
  leadTechnicianId,
  onLeadTechnicianIdChange,
  isJobSelected,
  isHoursValid,
  currentOrderType,
  onOrderTypeCapture,
  isPhotoValid,
}: TechniciansSectionProps) {
  const [mounted, setMounted] = useState(false);
  const [allTechnicians, setAllTechnicians] = useState<TechnicianInfo[]>([]);
  const [rows, setRows] = useState<TechnicianRow[]>([]);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load technicians on mount
  useEffect(() => {
    setMounted(true);
    const loadTechnicians = async () => {
      try {
        const techs = await fetchTechnicians();
        setAllTechnicians(techs.map((t) => ({ id: t.id, name: t.name })));
      } catch (error) {
        console.error("Error loading technicians:", error);
        // Mock data for sandbox testing
        setAllTechnicians([
          { id: "1", name: "Георги Димитров" },
          { id: "2", name: "Иван Петров" },
          { id: "3", name: "Мария Иванова" },
          { id: "4", name: "Петър Георгиев" },
          { id: "5", name: "Стоян Стоянов" },
        ]);
      }
    };
    loadTechnicians();
  }, []);

  // Initialize with one empty row
  useEffect(() => {
    if (mounted && rows.length === 0) {
      addTechnicianRow();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  // Timer interval - updates only running technicians
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setRows((prevRows) =>
        prevRows.map((row) =>
          row.status === "running"
            ? { ...row, timeElapsed: row.timeElapsed + 1 }
            : row
        )
      );
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Sync assigned technicians with parent
  useEffect(() => {
    const techIds = rows
      .filter((r) => r.technicianId)
      .map((r) => r.technicianId);
    if (JSON.stringify(techIds) !== JSON.stringify(assignedTechnicians)) {
      onAssignedTechniciansChange(techIds);
    }
  }, [rows, assignedTechnicians, onAssignedTechniciansChange]);

  // Add a new technician row
  const addTechnicianRow = useCallback(() => {
    const newRow: TechnicianRow = {
      id: `row-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      technicianId: "",
      technicianName: "",
      timeElapsed: 0,
      status: "idle",
    };
    setRows((prev) => [...prev, newRow]);
  }, []);

  // Remove a technician row
  const removeRow = useCallback(
    (rowId: string) => {
      setRows((prev) => {
        const updated = prev.filter((r) => r.id !== rowId);
        // Keep at least one row
        if (updated.length === 0) {
          return [
            {
              id: `row-${Date.now()}`,
              technicianId: "",
              technicianName: "",
              timeElapsed: 0,
              status: "idle",
            },
          ];
        }
        return updated;
      });
    },
    []
  );

  // Select technician for a row
  const selectTechnician = useCallback(
    (rowId: string, tech: TechnicianInfo) => {
      setRows((prev) =>
        prev.map((row) =>
          row.id === rowId
            ? { ...row, technicianId: tech.id, technicianName: tech.name }
            : row
        )
      );
      // Set first selected as lead if none
      if (!leadTechnicianId) {
        onLeadTechnicianIdChange(tech.id);
      }
      setOpenDropdownId(null);
    },
    [leadTechnicianId, onLeadTechnicianIdChange]
  );

  // Timer controls for individual rows
  const startTimer = useCallback(
    (rowId: string) => {
      if (onOrderTypeCapture) {
        onOrderTypeCapture(currentOrderType);
      }
      setRows((prev) =>
        prev.map((row) =>
          row.id === rowId ? { ...row, status: "running" } : row
        )
      );
    },
    [currentOrderType, onOrderTypeCapture]
  );

  const pauseTimer = useCallback((rowId: string) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === rowId ? { ...row, status: "paused" } : row
      )
    );
  }, []);

  const stopTimer = useCallback((rowId: string) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === rowId ? { ...row, status: "idle", timeElapsed: 0 } : row
      )
    );
  }, []);

  // Get available technicians (not already selected in other rows)
  const getAvailableTechnicians = useCallback(
    (currentRowId: string) => {
      const selectedIds = rows
        .filter((r) => r.id !== currentRowId && r.technicianId)
        .map((r) => r.technicianId);
      return allTechnicians.filter((t) => !selectedIds.includes(t.id));
    },
    [rows, allTechnicians]
  );

  const buttonsDisabled = !isJobSelected || !isHoursValid;

  if (!mounted) {
    return null;
  }

  return (
    <Card className="border-border bg-card overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border">
          <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Техници
          </Label>
          <span className="text-xs text-muted-foreground">
            {rows.filter((r) => r.technicianId).length} избрани
          </span>
        </div>

        {/* Technician Rows */}
        <div className="divide-y divide-border">
          {rows.map((row, index) => {
            const isActive = row.status === "running";
            const isPaused = row.status === "paused";
            const hasSelection = !!row.technicianId;
            const availableTechs = getAvailableTechnicians(row.id);

            return (
              <div
                key={row.id}
                className={cn(
                  "p-4 transition-all duration-200",
                  isActive && "bg-[#367C2B]/5 border-l-4 border-l-[#367C2B]",
                  isPaused && "bg-amber-500/5 border-l-4 border-l-amber-500",
                  !isActive && !isPaused && "border-l-4 border-l-transparent"
                )}
              >
                {/* Row Header */}
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Техник {index + 1} <span className="text-destructive">*</span>
                  </Label>
                  {rows.length > 1 && (
                    <button
                      onClick={() => removeRow(row.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded hover:bg-destructive/10"
                      title="Премахни техник"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Row Content - Technician Dropdown + Timer Controls */}
                <div className="flex items-center gap-3">
                  {/* Technician Dropdown */}
                  <div className="relative flex-1">
                    <button
                      onClick={() =>
                        setOpenDropdownId(
                          openDropdownId === row.id ? null : row.id
                        )
                      }
                      className={cn(
                        "w-full h-11 px-3 flex items-center justify-between rounded-lg border text-left transition-all",
                        hasSelection && isActive
                          ? "bg-[#367C2B]/20 border-[#367C2B] text-foreground"
                          : hasSelection
                          ? "bg-card border-border text-foreground"
                          : "bg-card border-border text-muted-foreground"
                      )}
                    >
                      <span className={cn("text-sm", !hasSelection && "text-muted-foreground")}>
                        {row.technicianName || "Изберете техник..."}
                      </span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 transition-transform",
                          openDropdownId === row.id && "rotate-180"
                        )}
                      />
                    </button>

                    {/* Dropdown Menu */}
                    {openDropdownId === row.id && (
                      <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-lg border border-border bg-popover shadow-xl max-h-48 overflow-y-auto">
                        {availableTechs.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-muted-foreground">
                            Няма налични техници
                          </div>
                        ) : (
                          availableTechs.map((tech) => (
                            <button
                              key={tech.id}
                              onClick={() => selectTechnician(row.id, tech)}
                              className={cn(
                                "w-full px-3 py-2.5 text-sm text-left hover:bg-accent hover:text-accent-foreground flex items-center gap-2",
                                row.technicianId === tech.id && "bg-primary/10"
                              )}
                            >
                              {row.technicianId === tech.id && (
                                <Check className="h-4 w-4 text-primary" />
                              )}
                              <span>{tech.name}</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* Timer Controls */}
                  <div className="flex items-center gap-2">
                    {/* Play Button */}
                    <Button
                      onClick={() => startTimer(row.id)}
                      disabled={
                        buttonsDisabled || !hasSelection || row.status === "running"
                      }
                      size="icon"
                      className={cn(
                        "h-11 w-11 rounded-lg shadow-md transition-all",
                        row.status === "running"
                          ? "bg-[#367C2B]/50 text-white cursor-not-allowed"
                          : buttonsDisabled || !hasSelection
                          ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                          : "bg-[#367C2B] hover:bg-[#2d6a24] text-white hover:scale-105"
                      )}
                      title="Старт"
                    >
                      <Play className="h-5 w-5" />
                    </Button>

                    {/* Pause Button */}
                    <Button
                      onClick={() => pauseTimer(row.id)}
                      disabled={buttonsDisabled || row.status !== "running"}
                      size="icon"
                      className={cn(
                        "h-11 w-11 rounded-lg shadow-md transition-all",
                        row.status !== "running"
                          ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                          : "bg-amber-500 hover:bg-amber-400 text-amber-950"
                      )}
                      title="Пауза"
                    >
                      <Pause className="h-5 w-5" />
                    </Button>

                    {/* Digital Timer Display */}
                    <div
                      className={cn(
                        "h-11 min-w-[100px] flex items-center justify-center rounded-lg border-2 px-3 font-mono text-base font-bold tabular-nums",
                        row.status === "running"
                          ? "border-[#367C2B] bg-[#367C2B]/10 text-[#367C2B] shadow-[0_0_10px_rgba(54,124,43,0.3)]"
                          : row.status === "paused"
                          ? "border-amber-500 bg-amber-500/10 text-amber-500"
                          : "border-border bg-muted/50 text-muted-foreground"
                      )}
                    >
                      {formatTime(row.timeElapsed)}
                    </div>

                    {/* Stop Button */}
                    <Button
                      onClick={() => stopTimer(row.id)}
                      disabled={
                        buttonsDisabled ||
                        row.status === "idle" ||
                        !isPhotoValid
                      }
                      size="icon"
                      className={cn(
                        "h-11 w-11 rounded-lg shadow-md transition-all",
                        row.status === "idle" || !isPhotoValid
                          ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                          : "bg-red-600 hover:bg-red-500 text-white"
                      )}
                      title={
                        row.status === "idle"
                          ? "Таймерът не е стартиран"
                          : !isPhotoValid
                          ? "Качете снимка"
                          : "Край"
                      }
                    >
                      <Square className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Technician Button */}
        <div className="p-4 border-t border-border bg-muted/20">
          <Button
            onClick={addTechnicianRow}
            variant="outline"
            className="w-full h-10 gap-2 border-dashed border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/50"
          >
            <Plus className="h-4 w-4" />
            Добави Техник
          </Button>
        </div>

        {/* Disabled state hint */}
        {buttonsDisabled && (
          <div className="px-4 pb-4">
            <p className="text-xs text-muted-foreground text-center">
              {!isJobSelected
                ? "Изберете поръчка или машина, за да активирате таймерите"
                : "Въведете валидни моточасове, за да активирате таймерите"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
