"use client";

import { AlertTriangle, History, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ServiceHistoryIssue } from "@/lib/actions";

interface HistoricalIssuesBannerProps {
  issues: ServiceHistoryIssue[];
}

const reasonLabels: Record<string, string> = {
  no_parts: "Липса на части",
  customer_refused: "Отказ от клиента",
  specialized_service: "Нужда от специализиран сервиз",
  time_constraint: "Липса на време",
  other: "Друга причина",
};

export function HistoricalIssuesBanner({ issues }: HistoricalIssuesBannerProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!issues || issues.length === 0) return null;

  return (
    <div className="rounded-lg border-2 border-amber-500/50 bg-amber-500/10 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20">
            <History className="h-4 w-4 text-amber-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-amber-600 flex items-center gap-2">
              НЕОТСТРАНЕНИ ЗАБЕЛЕЖКИ ОТ ПРЕДИШНО ПОСЕЩЕНИЕ
              <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30 text-[10px]">
                {issues.length} {issues.length === 1 ? "карта" : "карти"}
              </Badge>
            </h3>
            <p className="text-[10px] text-amber-600/80">
              Моля, прегледайте и адресирайте при възможност
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-8 w-8 p-0 text-amber-600 hover:bg-amber-500/20"
        >
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Issues List */}
      {isExpanded && (
        <div className="space-y-3 pt-2">
          {issues.map((issue, index) => (
            <div
              key={issue.jobCardId}
              className="rounded-md border border-amber-500/30 bg-card p-3 space-y-2"
            >
              {/* Card header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] font-mono border-border">
                    {new Date(issue.date).toLocaleDateString("bg-BG")}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    ID: {issue.jobCardId.slice(0, 8)}...
                  </span>
                </div>
                {issue.pendingReason && (
                  <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-[10px]">
                    {reasonLabels[issue.pendingReason] || issue.pendingReason}
                  </Badge>
                )}
              </div>
              
              {/* Issue description */}
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-sm text-foreground leading-relaxed">
                  {issue.pendingIssues}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
