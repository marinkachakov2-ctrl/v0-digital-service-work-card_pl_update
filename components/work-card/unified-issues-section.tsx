"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertOctagon,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Wrench,
  FileText,
  ChevronDown,
  ChevronRight,
  Lightbulb,
  ClipboardList,
} from "lucide-react";
import type { MachineIssue } from "@/lib/actions";
import { resolveMachineIssue, createMachineIssue } from "@/lib/actions";

// Types
type Priority = "low" | "medium" | "high";

export interface DetectedIssue {
  id: string;
  name: string;
  desc: string;
  status: "+" | "0" | "repair" | null;
  comment?: string;
  photoUrl?: string | null;
}

export interface UnifiedIssuesSectionProps {
  // Machine & Job Card context
  machineId: string | null;
  jobCardId: string | null;
  isReadOnly?: boolean;
  
  // Database issues (from previous job cards)
  machineIssues: MachineIssue[];
  onIssueResolved: (issueId: string) => void;
  
  // Detected issues from FREE CHECK
  detectedIssues?: DetectedIssue[];
  onGenerateQuote?: (issue: DetectedIssue) => void;
  
  // General notes/recommendations
  generalNotes: string;
  onGeneralNotesChange: (notes: string) => void;
}

const priorityConfig: Record<Priority, { label: string; labelBg: string; color: string; bgColor: string; borderColor: string }> = {
  low: {
    label: "Нисък",
    labelBg: "bg-sky-500/15 text-sky-500 border-sky-500/30",
    color: "text-sky-500",
    bgColor: "bg-sky-500",
    borderColor: "border-sky-500",
  },
  medium: {
    label: "Среден",
    labelBg: "bg-amber-500/15 text-amber-500 border-amber-500/30",
    color: "text-amber-500",
    bgColor: "bg-amber-500",
    borderColor: "border-amber-500",
  },
  high: {
    label: "Висок",
    labelBg: "bg-red-500/15 text-red-500 border-red-500/30",
    color: "text-red-500",
    bgColor: "bg-red-500",
    borderColor: "border-red-500",
  },
};

export function UnifiedIssuesSection({
  machineId,
  jobCardId,
  isReadOnly = false,
  machineIssues,
  onIssueResolved,
  detectedIssues = [],
  onGenerateQuote,
  generalNotes,
  onGeneralNotesChange,
}: UnifiedIssuesSectionProps) {
  // State for resolving issues
  const [resolvingIds, setResolvingIds] = useState<Set<string>>(new Set());
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());
  
  // State for adding new issues
  const [newDescription, setNewDescription] = useState("");
  const [newPriority, setNewPriority] = useState<Priority>("medium");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Section collapse states
  const [previousOpen, setPreviousOpen] = useState(true);
  const [detectedOpen, setDetectedOpen] = useState(true);
  const [newIssueOpen, setNewIssueOpen] = useState(true);

  // Filter out resolved issues
  const unresolvedIssues = machineIssues.filter(issue => !resolvedIds.has(issue.id));
  const isDisabled = isReadOnly || !machineId || !jobCardId;

  // Handle resolving a previous issue
  const handleResolve = async (issueId: string) => {
    if (!jobCardId) return;
    
    setResolvingIds(prev => new Set(prev).add(issueId));
    
    const result = await resolveMachineIssue(issueId, jobCardId);
    
    if (result.success) {
      setResolvedIds(prev => new Set(prev).add(issueId));
      onIssueResolved(issueId);
    }
    
    setResolvingIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(issueId);
      return newSet;
    });
  };

  // Handle adding a new issue
  const handleAddIssue = async () => {
    if (!machineId || !jobCardId || !newDescription.trim()) return;

    setIsSubmitting(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    const result = await createMachineIssue(machineId, jobCardId, newDescription.trim(), newPriority);

    setIsSubmitting(false);

    if (result.success) {
      setSuccessMessage("Проблемът е записан успешно!");
      setNewDescription("");
      setNewPriority("medium");
      setTimeout(() => setSuccessMessage(null), 3000);
    } else {
      setErrorMessage(result.error || "Грешка при записване");
    }
  };

  // Count totals for header badge
  const totalCount = unresolvedIssues.length + detectedIssues.length;

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-foreground">
          <ClipboardList className="h-4 w-4 text-amber-500" />
          Проблеми и препоръки
          {totalCount > 0 && (
            <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/30 text-xs">
              {totalCount}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Section 1: Previous Unresolved Issues */}
        {unresolvedIssues.length > 0 && (
          <Collapsible open={previousOpen} onOpenChange={setPreviousOpen}>
            <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/5 p-3 hover:bg-red-500/10 transition-colors">
              {previousOpen ? (
                <ChevronDown className="h-4 w-4 text-red-500" />
              ) : (
                <ChevronRight className="h-4 w-4 text-red-500" />
              )}
              <AlertOctagon className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium text-red-500 flex-1 text-left">
                Нерешени проблеми от предишни посещения
              </span>
              <Badge className="bg-red-500/15 text-red-500 border-red-500/30 text-xs">
                {unresolvedIssues.length}
              </Badge>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 space-y-2">
              {unresolvedIssues.map((issue) => (
                <div
                  key={issue.id}
                  className="flex items-center gap-3 rounded-md border border-red-500/20 bg-card px-3 py-2"
                >
                  <Badge className={`${priorityConfig[issue.priority as Priority]?.labelBg || priorityConfig.medium.labelBg} text-[10px] shrink-0`}>
                    {priorityConfig[issue.priority as Priority]?.label || "Среден"}
                  </Badge>
                  <span className="text-sm text-foreground flex-1">
                    {issue.description}
                  </span>
                  {jobCardId && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResolve(issue.id)}
                      disabled={resolvingIds.has(issue.id)}
                      className="gap-1.5 h-7 text-xs border-emerald-500/50 text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-400 shrink-0"
                    >
                      {resolvingIds.has(issue.id) ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span className="hidden sm:inline">Запазване...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3 w-3" />
                          <span className="hidden sm:inline">Решен</span>
                        </>
                      )}
                    </Button>
                  )}
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Section 2: Detected Issues from FREE CHECK */}
        {detectedIssues.length > 0 && (
          <Collapsible open={detectedOpen} onOpenChange={setDetectedOpen}>
            <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 hover:bg-amber-500/10 transition-colors">
              {detectedOpen ? (
                <ChevronDown className="h-4 w-4 text-amber-500" />
              ) : (
                <ChevronRight className="h-4 w-4 text-amber-500" />
              )}
              <Wrench className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium text-amber-500 flex-1 text-left">
                Открити от FREE CHECK
              </span>
              <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/30 text-xs">
                {detectedIssues.length}
              </Badge>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 space-y-2">
              {detectedIssues.map((issue) => (
                <div
                  key={issue.id}
                  className={`rounded-lg border p-3 ${
                    issue.status === "repair"
                      ? "border-red-500/30 bg-red-500/5"
                      : "border-amber-500/30 bg-amber-500/5"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded shrink-0">
                          {issue.id}
                        </span>
                        <span className="text-sm font-medium text-foreground truncate">
                          {issue.name}
                        </span>
                        <Badge
                          className={`text-[10px] shrink-0 ${
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
                          <span className="hidden sm:inline">Оферта</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Section 3: Add New Issue */}
        <Collapsible open={newIssueOpen} onOpenChange={setNewIssueOpen}>
          <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg border border-border bg-secondary/30 p-3 hover:bg-secondary/50 transition-colors">
            {newIssueOpen ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <Plus className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground flex-1 text-left">
              Добави нов проблем / забележка
            </span>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 space-y-3">
            {/* Disabled state message */}
            {isDisabled && !isReadOnly && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                <p className="text-xs text-amber-500 flex items-center gap-2">
                  <AlertTriangle className="h-3 w-3" />
                  Изберете машина и запишете Job Card, за да добавяте нови забележки.
                </p>
              </div>
            )}

            {/* Quick add row */}
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Опишете проблем или забележка..."
                className="flex-1 bg-secondary text-foreground"
                disabled={isDisabled}
              />
              <div className="flex gap-2">
                <Select
                  value={newPriority}
                  onValueChange={(val) => setNewPriority(val as Priority)}
                  disabled={isDisabled}
                >
                  <SelectTrigger className="w-28 bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Нисък</SelectItem>
                    <SelectItem value="medium">Среден</SelectItem>
                    <SelectItem value="high">Висок</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleAddIssue}
                  disabled={isDisabled || !newDescription.trim() || isSubmitting}
                  size="sm"
                  className="gap-1.5 bg-primary hover:bg-primary/90 shrink-0"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline">Добави</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Success/Error messages */}
            {successMessage && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2">
                <p className="text-xs text-emerald-500 flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3" />
                  {successMessage}
                </p>
              </div>
            )}
            {errorMessage && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-2">
                <p className="text-xs text-red-500 flex items-center gap-2">
                  <AlertTriangle className="h-3 w-3" />
                  {errorMessage}
                </p>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Section 4: General Notes/Recommendations */}
        <div className="space-y-2 pt-2 border-t border-border">
          <Label className="flex items-center gap-2 text-sm text-foreground">
            <Lightbulb className="h-3.5 w-3.5 text-primary" />
            Общи бележки и препоръки
          </Label>
          <Textarea
            value={generalNotes}
            onChange={(e) => onGeneralNotesChange(e.target.value)}
            placeholder="Препоръки за профилактика, подмяна на части, бъдещо обслужване..."
            className="min-h-20 bg-secondary text-foreground placeholder:text-muted-foreground"
            disabled={isReadOnly}
          />
          <p className="text-[10px] text-muted-foreground">
            Тези бележки ще бъдат видими при следващото посещение на машината.
          </p>
        </div>

        {/* Empty state */}
        {totalCount === 0 && !newDescription && !generalNotes && (
          <p className="py-2 text-center text-xs text-muted-foreground">
            Няма регистрирани проблеми. Използвайте формата по-горе за добавяне.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
