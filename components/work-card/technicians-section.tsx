"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Square, Crown, Users, X, Plus, ChevronDown } from "lucide-react";
import { TechnicianCombobox } from "./technician-combobox";
import { fetchTechnicians } from "@/lib/actions";

type TimerStatus = "idle" | "running" | "paused";

interface TechnicianInfo {
  id: string;
  name: string;
}

interface TechniciansSectionProps {
  assignedTechnicians: string[];
  onAssignedTechniciansChange: (techs: string[]) => void;
  leadTechnicianId: string | null;
  onLeadTechnicianIdChange: (id: string | null) => void;
  clockAtJobLevel: boolean;
  onClockAtJobLevelChange: (val: boolean) => void;
  // Timer props
  timerStatus: TimerStatus;
  elapsedTime: string;
  onTimerStart: () => void;
  onTimerPause: () => void;
  onTimerStop: () => void;
  // Control props
  isJobSelected: boolean; // True when a Job Card or Machine is selected
  isHoursValid: boolean; // True when engine hours are entered and valid
  currentOrderType: string; // Current order type for tracking
  onOrderTypeCapture?: (orderType: string) => void; // Callback when timer starts
  // Photo validation for stop button
  isPhotoValid: boolean; // True when photo uploaded OR skip reason provided
}

export function TechniciansSection({
  assignedTechnicians,
  onAssignedTechniciansChange,
  leadTechnicianId,
  onLeadTechnicianIdChange,
  clockAtJobLevel,
  onClockAtJobLevelChange,
  timerStatus,
  elapsedTime,
  onTimerStart,
  onTimerPause,
  onTimerStop,
  isJobSelected,
  isHoursValid,
  currentOrderType,
  onOrderTypeCapture,
  isPhotoValid,
}: TechniciansSectionProps) {
  const [mounted, setMounted] = useState(false);
  const [allTechnicians, setAllTechnicians] = useState<TechnicianInfo[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    // Load all technicians for the multi-select
    const loadTechnicians = async () => {
      try {
        const techs = await fetchTechnicians();
        setAllTechnicians(techs.map(t => ({ id: t.id, name: t.name })));
      } catch (error) {
        console.error("Error loading technicians:", error);
      }
    };
    loadTechnicians();
  }, []);

  const hasMultipleTechs = assignedTechnicians.filter(Boolean).length > 1;

  // Get technician name by ID
  const getTechName = (techId: string) => {
    const tech = allTechnicians.find(t => t.id === techId);
    return tech?.name || techId;
  };

  // Add technician to selection
  const addTechnician = (techId: string) => {
    if (!assignedTechnicians.includes(techId)) {
      const updated = [...assignedTechnicians.filter(Boolean), techId];
      onAssignedTechniciansChange(updated);
      // Auto-set first as lead if none
      if (!leadTechnicianId) {
        onLeadTechnicianIdChange(techId);
      }
    }
    setShowDropdown(false);
  };

  // Remove technician from selection
  const removeTechnician = (techId: string) => {
    const updated = assignedTechnicians.filter(t => t !== techId);
    onAssignedTechniciansChange(updated.length ? updated : []);
    // Clear lead if removed
    if (techId === leadTechnicianId) {
      onLeadTechnicianIdChange(updated[0] || null);
    }
  };

  // Toggle lead technician
  const toggleLead = (techId: string) => {
    if (leadTechnicianId === techId) {
      // If clicking current lead, do nothing (must always have a lead)
      return;
    }
    onLeadTechnicianIdChange(techId);
  };

  // Handle timer start with order type capture
  const handleTimerStart = () => {
    if (onOrderTypeCapture) {
      onOrderTypeCapture(currentOrderType);
    }
    onTimerStart();
  };

  // Available technicians (not already selected)
  const availableTechnicians = allTechnicians.filter(
    t => !assignedTechnicians.includes(t.id)
  );

  // Buttons are disabled when no job is selected OR hours not valid
  const buttonsDisabled = !isJobSelected || !isHoursValid;
  const disabledReason = !isJobSelected 
    ? "Първо изберете поръчка или машина" 
    : !isHoursValid 
      ? "Въведете валидни моточасове" 
      : "";

  if (!mounted) {
    return null;
  }

  return (
    <Card className="border-border bg-card">
      <CardContent className="pt-4 pb-4">
        <div className="space-y-4">
          {/* Header Row */}
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Техници
            </Label>
            {hasMultipleTechs && (
              <div className="flex items-center gap-2">
                <Switch
                  id="clock-job-level"
                  checked={clockAtJobLevel}
                  onCheckedChange={onClockAtJobLevelChange}
                />
                <Label htmlFor="clock-job-level" className="text-xs text-muted-foreground cursor-pointer">
                  Clock at Job Level
                </Label>
              </div>
            )}
          </div>

          {/* Multi-select with Chips */}
          <div className="space-y-2">
            {/* Selected Technicians as Chips */}
            <div className="flex flex-wrap gap-2 min-h-[40px] p-2 rounded-lg border border-border bg-background">
              {assignedTechnicians.filter(Boolean).length === 0 ? (
                <span className="text-sm text-muted-foreground py-1">Няма избрани техници</span>
              ) : (
                assignedTechnicians.filter(Boolean).map((techId) => (
                  <Badge
                    key={techId}
                    variant="secondary"
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm ${
                      leadTechnicianId === techId 
                        ? "bg-amber-500/20 text-amber-500 border border-amber-500/30" 
                        : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {leadTechnicianId === techId && (
                      <Crown className="h-3 w-3" />
                    )}
                    <span>{getTechName(techId)}</span>
                    <button
                      onClick={() => toggleLead(techId)}
                      className="ml-1 hover:text-amber-400"
                      title="Направи водещ техник"
                    >
                      {leadTechnicianId !== techId && <Crown className="h-3 w-3 opacity-40 hover:opacity-100" />}
                    </button>
                    <button
                      onClick={() => removeTechnician(techId)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))
              )}
              
              {/* Add Button */}
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="h-8 gap-1 bg-transparent border-dashed"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Добави
                  <ChevronDown className="h-3 w-3" />
                </Button>
                
                {/* Dropdown */}
                {showDropdown && availableTechnicians.length > 0 && (
                  <div className="absolute top-full left-0 mt-1 z-50 w-56 rounded-md border border-border bg-popover shadow-lg">
                    <div className="max-h-48 overflow-y-auto p-1">
                      {availableTechnicians.map((tech) => (
                        <button
                          key={tech.id}
                          onClick={() => addTechnician(tech.id)}
                          className="w-full text-left px-3 py-2 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground"
                        >
                          {tech.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Timer Buttons Row - Large and High Contrast */}
          <div className="flex items-center gap-3 pt-2 border-t border-border">
            {/* Start Button - Extra prominent when active */}
            <Button
              onClick={handleTimerStart}
              disabled={buttonsDisabled || timerStatus === "running"}
              className={`h-12 gap-2 px-6 text-base font-semibold shadow-md transition-all ${
                buttonsDisabled
                  ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                  : timerStatus === "running"
                    ? "bg-emerald-600/50 text-white cursor-not-allowed"
                    : "bg-emerald-600 hover:bg-emerald-500 text-white hover:scale-105 hover:shadow-lg"
              }`}
              title={buttonsDisabled ? disabledReason : "Старт на работа"}
            >
              <Play className="h-5 w-5" />
              Старт
            </Button>

            {/* Pause Button */}
            <Button
              onClick={onTimerPause}
              disabled={buttonsDisabled || timerStatus !== "running"}
              className={`h-12 gap-2 px-5 text-base font-semibold shadow-md ${
                buttonsDisabled || timerStatus !== "running"
                  ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                  : "bg-amber-500 hover:bg-amber-400 text-amber-950"
              }`}
            >
              <Pause className="h-5 w-5" />
              Пауза
            </Button>

            {/* Digital Timer Display */}
            <div
              className={`flex h-12 min-w-[100px] items-center justify-center rounded-lg border-2 px-4 font-mono text-lg font-bold tabular-nums ${
                timerStatus === "running"
                  ? "border-emerald-500 bg-emerald-950/50 text-emerald-400 animate-pulse"
                  : timerStatus === "paused"
                    ? "border-amber-500 bg-amber-950/50 text-amber-400"
                    : "border-border bg-secondary text-muted-foreground"
              }`}
            >
              {elapsedTime}
            </div>

            {/* Stop Button - requires photo OR skip reason */}
            <Button
              onClick={onTimerStop}
              disabled={buttonsDisabled || timerStatus === "idle" || !isPhotoValid}
              title={
                timerStatus === "idle" 
                  ? "Таймерът не е стартиран" 
                  : !isPhotoValid 
                    ? "Качете снимка на моточасовете или въведете причина за липсата" 
                    : "Край на работа"
              }
              className={`h-12 gap-2 px-5 text-base font-semibold shadow-md ${
                buttonsDisabled || timerStatus === "idle" || !isPhotoValid
                  ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                  : "bg-red-600 hover:bg-red-500 text-white"
              }`}
            >
              <Square className="h-5 w-5" />
              Край
            </Button>

            {/* Order Type Indicator */}
            {timerStatus !== "idle" && (
              <Badge variant="outline" className="ml-auto h-8 text-xs border-primary/30 text-primary">
                {currentOrderType === "warranty" && "Гаранция"}
                {currentOrderType === "repair" && "Ремонт"}
                {currentOrderType === "internal" && "Вътрешна"}
                {currentOrderType === "service_contract" && "По договор"}
              </Badge>
            )}
          </div>

          {/* Disabled state hint */}
          {buttonsDisabled && (
            <p className="text-xs text-muted-foreground text-center">
              Изберете поръчка или машина от търсенето, за да активирате бутоните
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
