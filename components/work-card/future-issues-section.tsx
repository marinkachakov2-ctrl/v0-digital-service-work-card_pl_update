"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Plus, Loader2, CheckCircle2, AlertTriangle, Wrench, FileText, Camera
} from "lucide-react";
import { createMachineIssue } from "@/lib/actions";
import type { FreeCheckStatus } from "./checklist-modal";

// Detected issue from FREE CHECK
export interface DetectedIssue {
  id: string;
  name: string;
  desc: string;
  status: FreeCheckStatus;
  comment?: string;
  photoUrl?: string | null;
}

interface FutureIssuesSectionProps {
  machineId: string | null;
  jobCardId: string | null;
  isReadOnly?: boolean;
  // Issues detected from FREE CHECK (items marked as "0" or "repair")
  detectedIssues?: DetectedIssue[];
  onGenerateQuote?: (issue: DetectedIssue) => void;
}

type Priority = "low" | "medium" | "high";

const priorityConfig: Record<Priority, { label: string; color: string; bgColor: string; borderColor: string }> = {
  low: {
    label: "Нисък",
    color: "text-emerald-500",
    bgColor: "bg-emerald-500",
    borderColor: "border-emerald-500",
  },
  medium: {
    label: "Среден",
    color: "text-amber-500",
    bgColor: "bg-amber-500",
    borderColor: "border-amber-500",
  },
  high: {
    label: "Висок",
    color: "text-red-500",
    bgColor: "bg-red-500",
    borderColor: "border-red-500",
  },
};

export function FutureIssuesSection({
  machineId,
  jobCardId,
  isReadOnly = false,
  detectedIssues = [],
  onGenerateQuote,
}: FutureIssuesSectionProps) {
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!machineId || !jobCardId || !description.trim()) return;

    setIsSubmitting(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    const result = await createMachineIssue(machineId, jobCardId, description.trim(), priority);

    setIsSubmitting(false);

    if (result.success) {
      setSuccessMessage("Забележката е записана успешно!");
      setDescription("");
      setPriority("medium");
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } else {
      setErrorMessage(result.error || "Грешка при записване на забележката");
    }
  };

  const isDisabled = isReadOnly || !machineId || !jobCardId;

  return (
    <Card className="border-secondary bg-card">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          Препоръки за бъдещи ремонти
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Detected Issues from FREE CHECK */}
        {detectedIssues.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium text-foreground">
                Открити проблеми от FREE CHECK
              </span>
              <Badge className="bg-red-500/15 text-red-500 border-red-500/30 text-xs">
                {detectedIssues.length}
              </Badge>
            </div>
            <div className="space-y-2">
              {detectedIssues.map((issue) => (
                <div
                  key={issue.id}
                  className={`rounded-lg border p-3 space-y-2 ${
                    issue.status === "repair"
                      ? "border-red-500/30 bg-red-500/5"
                      : "border-amber-500/30 bg-amber-500/5"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                          {issue.id}
                        </span>
                        <span className="text-sm font-medium text-foreground">
                          {issue.name}
                        </span>
                        <Badge
                          className={`text-[10px] ${
                            issue.status === "repair"
                              ? "bg-red-500/15 text-red-500 border-red-500/30"
                              : "bg-amber-500/15 text-amber-500 border-amber-500/30"
                          }`}
                        >
                          {issue.status === "repair" ? "Ремонт" : "Изтрит"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{issue.desc}</p>
                      {issue.comment && (
                        <p className="text-xs text-foreground mt-1 bg-secondary/50 rounded p-2">
                          {issue.comment}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {issue.photoUrl && (
                        <div className="h-10 w-10 rounded border border-border overflow-hidden">
                          <img
                            src={issue.photoUrl}
                            alt="Issue"
                            className="h-full w-full object-cover"
                          />
                        </div>
                      )}
                      {onGenerateQuote && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onGenerateQuote(issue)}
                          className="gap-1.5 text-xs h-8 border-primary/30 text-primary hover:bg-primary/10"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          Оферта
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-border pt-4" />
          </div>
        )}

        {/* Disabled state message */}
        {isDisabled && !isReadOnly && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
            <p className="text-xs text-amber-500 flex items-center gap-2">
              <AlertTriangle className="h-3 w-3" />
              Изберете машина и запишете Job Card, за да можете да добавяте бъдещи забележки.
            </p>
          </div>
        )}

        {/* New Issue Section Header */}
        <div className="flex items-center gap-2">
          <Plus className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Нова забележка</span>
        </div>

        {/* Description textarea */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            Описание на бъдеща забележка
          </Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Опишете проблем или препоръка за следващия техник..."
            className="min-h-24 bg-secondary text-foreground placeholder:text-muted-foreground"
            disabled={isDisabled}
          />
        </div>

        {/* Priority buttons */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            Приоритет
          </Label>
          <div className="flex gap-2">
            {(Object.keys(priorityConfig) as Priority[]).map((p) => {
              const config = priorityConfig[p];
              const isSelected = priority === p;
              return (
                <Button
                  key={p}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPriority(p)}
                  disabled={isDisabled}
                  className={`flex-1 gap-2 transition-all ${
                    isSelected
                      ? `${config.borderColor} ${config.color} border-2`
                      : "border-border text-muted-foreground hover:border-muted-foreground"
                  }`}
                >
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      isSelected ? config.bgColor : "bg-muted-foreground/30"
                    }`}
                  />
                  {config.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Submit button */}
        <Button
          onClick={handleSubmit}
          disabled={isDisabled || !description.trim() || isSubmitting}
          className="w-full gap-2 bg-primary hover:bg-primary/90"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Записване...
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              Запиши забележка
            </>
          )}
        </Button>

        {/* Success message */}
        {successMessage && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
            <p className="text-xs text-emerald-500 flex items-center gap-2">
              <CheckCircle2 className="h-3 w-3" />
              {successMessage}
            </p>
          </div>
        )}

        {/* Error message */}
        {errorMessage && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <p className="text-xs text-destructive flex items-center gap-2">
              <AlertTriangle className="h-3 w-3" />
              {errorMessage}
            </p>
          </div>
        )}

        {/* Info text */}
        <p className="text-[10px] text-muted-foreground">
          Тази забележка ще се покаже на следващия техник, когато избере същата машина.
        </p>
      </CardContent>
    </Card>
  );
}
