"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Calendar, Clock, Gauge } from "lucide-react";

const causes = [
  { value: "A", label: "A - Слаб материал" },
  { value: "B", label: "B - Слаба заварка" },
  { value: "C", label: "C - Погрешна изработка" },
  { value: "E", label: "E - Сглобено погрешно" },
  { value: "F", label: "F - Чуждо тяло" },
  { value: "G", label: "G - Лоша отливка" },
];

const defects = [
  { value: "01", label: "01 - Напрегнал" },
  { value: "02", label: "02 - Издухан" },
  { value: "03", label: "03 - Счупен/Пукнат" },
  { value: "04", label: "04 - Изгорял" },
  { value: "05", label: "05 - Хлабав" },
  { value: "06", label: "06 - Корозия" },
  { value: "07", label: "07 - Електрическа повреда" },
  { value: "09", label: "09 - Теч" },
  { value: "13", label: "13 - Надраскан" },
  { value: "19", label: "19 - Приплъзване" },
  { value: "99", label: "99 - Други" },
];

interface DiagnosticsSectionProps {
  reasonCode: string;
  defectCode: string;
  description: string;
  faultDate: string;
  repairStart: string;
  repairEnd: string;
  engineHours: string;
  onReasonChange: (value: string) => void;
  onDefectChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onFaultDateChange: (value: string) => void;
  onRepairStartChange: (value: string) => void;
  onRepairEndChange: (value: string) => void;
  onEngineHoursChange: (value: string) => void;
}

export function DiagnosticsSection({
  reasonCode,
  defectCode,
  description,
  faultDate,
  repairStart,
  repairEnd,
  engineHours,
  onReasonChange,
  onDefectChange,
  onDescriptionChange,
  onFaultDateChange,
  onRepairStartChange,
  onRepairEndChange,
  onEngineHoursChange,
}: DiagnosticsSectionProps) {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base text-foreground">
          <AlertTriangle className="h-4 w-4 text-warning" />
          Диагностика
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Dropdowns and Code Display */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Причина (Reason)
            </Label>
            <Select value={reasonCode} onValueChange={onReasonChange}>
              <SelectTrigger className="bg-secondary text-foreground">
                <SelectValue placeholder="Изберете причина" />
              </SelectTrigger>
              <SelectContent>
                {causes.map((cause) => (
                  <SelectItem key={cause.value} value={cause.value}>
                    {cause.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Тип Дефект (Defect Type)
            </Label>
            <Select value={defectCode} onValueChange={onDefectChange}>
              <SelectTrigger className="bg-secondary text-foreground">
                <SelectValue placeholder="Изберете дефект" />
              </SelectTrigger>
              <SelectContent>
                {defects.map((defect) => (
                  <SelectItem key={defect.value} value={defect.value}>
                    {defect.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Selected Codes Display */}
        <div className="flex flex-wrap gap-3">
          <div className="inline-flex items-center rounded-md border border-border bg-secondary px-3 py-1.5">
            <span className="text-xs text-muted-foreground">Code:</span>
            <span className="ml-2 font-mono text-sm font-semibold text-primary">
              {reasonCode || "—"}
            </span>
          </div>
          <div className="inline-flex items-center rounded-md border border-border bg-secondary px-3 py-1.5">
            <span className="text-xs text-muted-foreground">Type:</span>
            <span className="ml-2 font-mono text-sm font-semibold text-primary">
              {defectCode || "—"}
            </span>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            Описание на повредата (Detailed description of the failure)
          </Label>
          <Textarea
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Въведете подробно описание на повредата..."
            className="min-h-24 bg-secondary text-foreground placeholder:text-muted-foreground"
          />
        </div>

        {/* Dates and Engine Hours */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              Fault Date
            </Label>
            <Input
              type="date"
              value={faultDate}
              onChange={(e) => onFaultDateChange(e.target.value)}
              className="bg-secondary text-foreground"
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              Repair Start
            </Label>
            <Input
              type="datetime-local"
              value={repairStart}
              onChange={(e) => onRepairStartChange(e.target.value)}
              className="bg-secondary text-foreground"
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              Repair End
            </Label>
            <Input
              type="datetime-local"
              value={repairEnd}
              onChange={(e) => onRepairEndChange(e.target.value)}
              className="bg-secondary text-foreground"
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Gauge className="h-3 w-3" />
              Моточасове
            </Label>
            <Input
              type="number"
              value={engineHours}
              onChange={(e) => onEngineHoursChange(e.target.value)}
              placeholder="0"
              className="bg-secondary text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
