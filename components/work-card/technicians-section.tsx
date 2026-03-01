"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Minus, Crown, Users } from "lucide-react";
import { TechnicianCombobox } from "./technician-combobox";

interface TechniciansSectionProps {
  assignedTechnicians: string[];
  onAssignedTechniciansChange: (techs: string[]) => void;
  leadTechnicianId: string | null;
  onLeadTechnicianIdChange: (id: string | null) => void;
  clockAtJobLevel: boolean;
  onClockAtJobLevelChange: (val: boolean) => void;
}

export function TechniciansSection({
  assignedTechnicians,
  onAssignedTechniciansChange,
  leadTechnicianId,
  onLeadTechnicianIdChange,
  clockAtJobLevel,
  onClockAtJobLevelChange,
}: TechniciansSectionProps) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const hasMultipleTechs = assignedTechnicians.filter(Boolean).length > 1;

  const addTechnician = () => {
    onAssignedTechniciansChange([...assignedTechnicians, ""]);
  };

  const removeTechnician = (index: number) => {
    const updated = assignedTechnicians.filter((_, i) => i !== index);
    onAssignedTechniciansChange(updated.length ? updated : [""]);
    // Clear lead if removed
    if (assignedTechnicians[index] === leadTechnicianId) {
      onLeadTechnicianIdChange(null);
    }
  };

  const updateTechnician = (index: number, value: string) => {
    const updated = [...assignedTechnicians];
    updated[index] = value;
    onAssignedTechniciansChange(updated);
  };

  if (!mounted) {
    return null;
  }

  return (
    <Card className="border-border bg-card">
      <CardContent className="pt-4 pb-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              Техници
            </Label>
            <div className="flex items-center gap-3">
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
              <Button variant="outline" size="sm" onClick={addTechnician} className="gap-1 bg-transparent">
                <Plus className="h-3.5 w-3.5" />
                Добави
              </Button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {assignedTechnicians.map((tech, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="flex-1">
                  <TechnicianCombobox
                    value={tech}
                    onChange={(val) => updateTechnician(index, val)}
                    label={`Техник ${index + 1}`}
                    placeholder="Изберете техник..."
                  />
                </div>
                {tech && (
                  <Button
                    variant={leadTechnicianId === tech ? "default" : "ghost"}
                    size="icon"
                    className={`mt-5 h-8 w-8 shrink-0 ${leadTechnicianId === tech ? "bg-amber-500 text-amber-950 hover:bg-amber-600" : "text-muted-foreground hover:text-foreground"}`}
                    onClick={() => onLeadTechnicianIdChange(tech)}
                    title="Определи като водещ техник"
                  >
                    <Crown className="h-3.5 w-3.5" />
                  </Button>
                )}
                {assignedTechnicians.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="mt-5 h-8 w-8 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => removeTechnician(index)}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
