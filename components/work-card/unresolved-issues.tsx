"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, AlertOctagon, ShieldAlert, CheckCircle2, Loader2 } from "lucide-react";
import type { MachineIssue } from "@/lib/actions";
import { resolveMachineIssue } from "@/lib/actions";

export interface UnresolvedIssue {
  id: string;
  description: string;
  severity: "low" | "medium" | "high";
  fromPreviousCard: boolean;
  previousCardId?: string;
}

interface UnresolvedIssuesSectionProps {
  issues: UnresolvedIssue[];
  onIssuesChange: (issues: UnresolvedIssue[]) => void;
  previousIssues: UnresolvedIssue[];
}

// Props for the dynamic alert that fetches from database
interface DynamicUnresolvedIssuesAlertProps {
  machineIssues: MachineIssue[];
  onIssueResolved: (issueId: string) => void;
  currentJobCardId: string | null;
}

const severityColors: Record<string, string> = {
  low: "bg-sky-500/15 text-sky-500 border-sky-500/30",
  medium: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  high: "bg-destructive/15 text-destructive border-destructive/30",
};

const severityLabels: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export function UnresolvedIssuesAlert({
  previousIssues,
}: {
  previousIssues: UnresolvedIssue[];
}) {
  if (previousIssues.length === 0) return null;

  return (
    <div className="rounded-lg border-2 border-destructive/50 bg-destructive/5 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-5 w-5 text-destructive" />
        <h3 className="text-sm font-semibold text-destructive">
          Unresolved Issues from Previous Job Cards
        </h3>
        <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-xs">
          {previousIssues.length}
        </Badge>
      </div>
      <div className="space-y-2">
        {previousIssues.map((issue) => (
          <div
            key={issue.id}
            className="flex items-center gap-3 rounded-md border border-destructive/20 bg-card px-3 py-2"
          >
            <Badge className={`${severityColors[issue.severity]} text-[10px] shrink-0`}>
              {severityLabels[issue.severity]}
            </Badge>
            <span className="text-sm text-foreground flex-1">
              {issue.description}
            </span>
            {issue.previousCardId && (
              <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                from {issue.previousCardId}
              </span>
            )}
          </div>
        ))}
      </div>
      <p className="text-[10px] text-destructive/80">
        These issues were noted but not resolved in previous job cards. Please review and address if applicable.
      </p>
    </div>
  );
}

/**
 * Dynamic alert component that fetches unresolved issues from the database
 * and allows technicians to mark them as resolved
 */
export function DynamicUnresolvedIssuesAlert({
  machineIssues,
  onIssueResolved,
  currentJobCardId,
}: DynamicUnresolvedIssuesAlertProps) {
  const [resolvingIds, setResolvingIds] = useState<Set<string>>(new Set());
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());

  // Don't render if no unresolved issues
  if (machineIssues.length === 0) return null;

  // Filter out already resolved issues
  const unresolvedIssues = machineIssues.filter(issue => !resolvedIds.has(issue.id));
  
  if (unresolvedIssues.length === 0) return null;

  const handleResolve = async (issueId: string) => {
    if (!currentJobCardId) return;
    
    setResolvingIds(prev => new Set(prev).add(issueId));
    
    const result = await resolveMachineIssue(issueId, currentJobCardId);
    
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

  const priorityColors: Record<string, string> = {
    low: "bg-sky-500/15 text-sky-500 border-sky-500/30",
    medium: "bg-amber-500/15 text-amber-500 border-amber-500/30",
    high: "bg-destructive/15 text-destructive border-destructive/30",
  };

  const priorityLabels: Record<string, string> = {
    low: "Нисък",
    medium: "Среден",
    high: "Висок",
  };

  return (
    <div className="rounded-lg border-2 border-destructive/50 bg-destructive/5 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-5 w-5 text-destructive" />
        <h3 className="text-sm font-semibold text-destructive">
          Нерешени проблеми от предишни Job Cards
        </h3>
        <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-xs">
          {unresolvedIssues.length}
        </Badge>
      </div>
      <div className="space-y-2">
        {unresolvedIssues.map((issue) => (
          <div
            key={issue.id}
            className="flex items-center gap-3 rounded-md border border-destructive/20 bg-card px-3 py-2"
          >
            <Badge className={`${priorityColors[issue.priority] || priorityColors.medium} text-[10px] shrink-0`}>
              {priorityLabels[issue.priority] || "Среден"}
            </Badge>
            <span className="text-sm text-foreground flex-1">
              {issue.description}
            </span>
            
            {/* Resolve checkbox/button */}
            {currentJobCardId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleResolve(issue.id)}
                disabled={resolvingIds.has(issue.id)}
                className="gap-1.5 h-7 text-xs border-emerald-500/50 text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-400"
              >
                {resolvingIds.has(issue.id) ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Запазване...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Реши сега</span>
                  </>
                )}
              </Button>
            )}
          </div>
        ))}
      </div>
      <p className="text-[10px] text-destructive/80">
        Тези проблеми са отбелязани, но не са решени в предишни job cards. Моля, прегледайте и адресирайте ако е приложимо.
      </p>
    </div>
  );
}

export function UnresolvedIssuesSection({
  issues,
  onIssuesChange,
  previousIssues,
}: UnresolvedIssuesSectionProps) {
  const addIssue = () => {
    const newIssue: UnresolvedIssue = {
      id: crypto.randomUUID(),
      description: "",
      severity: "medium",
      fromPreviousCard: false,
    };
    onIssuesChange([...issues, newIssue]);
  };

  const updateIssue = (
    id: string,
    field: keyof UnresolvedIssue,
    value: string | boolean
  ) => {
    onIssuesChange(
      issues.map((issue) =>
        issue.id === id ? { ...issue, [field]: value } : issue
      )
    );
  };

  const removeIssue = (id: string) => {
    onIssuesChange(issues.filter((issue) => issue.id !== id));
  };

  // Combine previous unresolved + current
  const carriedOver = previousIssues.filter((p) => p.fromPreviousCard);

  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="flex items-center gap-2 text-base text-foreground">
          <AlertOctagon className="h-4 w-4 text-amber-500" />
          Noted but Unresolved Issues
          {(issues.length > 0 || carriedOver.length > 0) && (
            <Badge variant="outline" className="text-xs">
              {issues.length + carriedOver.length}
            </Badge>
          )}
        </CardTitle>
        <Button
          onClick={addIssue}
          size="sm"
          className="gap-1 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Issue
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Carried over from previous */}
        {carriedOver.map((issue) => (
          <div
            key={issue.id}
            className="flex items-center gap-3 rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2"
          >
            <Badge className={`${severityColors[issue.severity]} text-[10px] shrink-0`}>
              {severityLabels[issue.severity]}
            </Badge>
            <span className="text-sm text-foreground flex-1">
              {issue.description}
            </span>
            <span className="text-[10px] text-muted-foreground italic shrink-0">
              carried over
            </span>
          </div>
        ))}

        {/* Current issues */}
        {issues.length === 0 && carriedOver.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No unresolved issues noted. Click &quot;Add Issue&quot; to log one.
          </p>
        )}
        {issues.map((issue) => (
          <div
            key={issue.id}
            className="flex items-center gap-3 rounded-md border border-border bg-secondary/50 px-3 py-2"
          >
            <Select
              value={issue.severity}
              onValueChange={(val) => updateIssue(issue.id, "severity", val)}
            >
              <SelectTrigger className="h-8 w-24 bg-card text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
            <Input
              value={issue.description}
              onChange={(e) =>
                updateIssue(issue.id, "description", e.target.value)
              }
              placeholder="Describe the unresolved issue..."
              className="h-8 flex-1 bg-card text-sm"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeIssue(issue.id)}
              className="h-8 w-8 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
