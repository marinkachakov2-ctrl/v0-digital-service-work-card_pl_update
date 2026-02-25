"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { ClipboardCheck, AlertTriangle, CheckCircle2 } from "lucide-react";

export interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

interface ChecklistModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: ChecklistItem[];
  onItemsChange: (items: ChecklistItem[]) => void;
  completed: boolean;
  onComplete: () => void;
  skipReason: string;
  onSkipReasonChange: (reason: string) => void;
  onSkip: () => void;
  skipped: boolean;
}

const DEFAULT_CHECKLIST: Omit<ChecklistItem, "checked">[] = [
  { id: "c1", label: "Визуална инспекция на машината извършена" },
  { id: "c2", label: "Проверка на ниво на масло" },
  { id: "c3", label: "Проверка на охладителна течност" },
  { id: "c4", label: "Проверка на хидравлични маркучи" },
  { id: "c5", label: "Проверка на състояние на филтри" },
  { id: "c6", label: "Проверка на електрически връзки" },
  { id: "c7", label: "Проверка на гуми / вериги" },
  { id: "c8", label: "Проверка на светлини и сигнализация" },
  { id: "c9", label: "Проверка за течове (масло, гориво, охладител)" },
  { id: "c10", label: "Записани всички установени повреди" },
];

export function getDefaultChecklist(): ChecklistItem[] {
  return DEFAULT_CHECKLIST.map((item) => ({ ...item, checked: false }));
}

export function ChecklistModal({
  open,
  onOpenChange,
  items,
  onItemsChange,
  completed,
  onComplete,
  skipReason,
  onSkipReasonChange,
  onSkip,
  skipped,
}: ChecklistModalProps) {
  const [showSkipField, setShowSkipField] = useState(false);

  const toggleItem = (id: string) => {
    onItemsChange(
      items.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const checkedCount = items.filter((i) => i.checked).length;
  const allChecked = checkedCount === items.length;
  const canSkip = skipReason.trim().length >= 5;

  const handleComplete = () => {
    onComplete();
    onOpenChange(false);
    setShowSkipField(false);
  };

  const handleSkip = () => {
    if (canSkip) {
      onSkip();
      onOpenChange(false);
      setShowSkipField(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            Чеклист (Pre-Diagnostics Checklist)
          </DialogTitle>
          <DialogDescription>
            Complete all items or provide a reason for skipping.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {checkedCount} / {items.length} completed
              </span>
              {allChecked && (
                <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 text-[10px]">
                  All done
                </Badge>
              )}
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${items.length > 0 ? (checkedCount / items.length) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Checklist Items */}
          <div className="space-y-2">
            {items.map((item) => (
              <label
                key={item.id}
                className="flex cursor-pointer items-center gap-3 rounded-md border border-border bg-secondary/50 px-3 py-2.5 transition-colors hover:bg-secondary"
              >
                <Checkbox
                  checked={item.checked}
                  onCheckedChange={() => toggleItem(item.id)}
                />
                <span
                  className={`text-sm ${
                    item.checked
                      ? "text-muted-foreground line-through"
                      : "text-foreground"
                  }`}
                >
                  {item.label}
                </span>
              </label>
            ))}
          </div>

          {/* Skip Section */}
          {!allChecked && !showSkipField && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSkipField(true)}
              className="w-full gap-2 bg-transparent text-amber-500 border-amber-500/30 hover:bg-amber-500/10 hover:text-amber-500"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Skip Checklist (requires justification)
            </Button>
          )}

          {showSkipField && (
            <div className="space-y-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
              <Label className="text-xs text-amber-500 flex items-center gap-1.5">
                <AlertTriangle className="h-3 w-3" />
                Reason for Skipping (min. 5 characters)
              </Label>
              <Textarea
                value={skipReason}
                onChange={(e) => onSkipReasonChange(e.target.value)}
                placeholder="Explain why the checklist is being skipped..."
                className="min-h-16 bg-card text-foreground"
              />
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          {showSkipField && (
            <Button
              variant="outline"
              onClick={handleSkip}
              disabled={!canSkip}
              className="gap-1.5 bg-transparent text-amber-500 border-amber-500/30 hover:bg-amber-500/10 disabled:opacity-50"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Skip with Reason
            </Button>
          )}
          <Button
            onClick={handleComplete}
            disabled={!allChecked}
            className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" />
            Complete Checklist
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** The button that sits between Client section and Diagnostics section */
interface ChecklistButtonProps {
  completed: boolean;
  skipped: boolean;
  onOpen: () => void;
}

export function ChecklistButton({ completed, skipped, onOpen }: ChecklistButtonProps) {
  return (
    <Card
      className={`border-border bg-card cursor-pointer transition-colors hover:bg-secondary/50 ${
        completed
          ? "border-emerald-500/30"
          : skipped
            ? "border-amber-500/30"
            : "border-primary/30"
      }`}
      onClick={onOpen}
    >
      <CardHeader className="py-3 px-4">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <ClipboardCheck
              className={`h-4 w-4 ${
                completed
                  ? "text-emerald-500"
                  : skipped
                    ? "text-amber-500"
                    : "text-primary"
              }`}
            />
            <span className="text-foreground">Чеклист (Pre-Diagnostics)</span>
          </div>
          <div className="flex items-center gap-2">
            {completed && (
              <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Completed
              </Badge>
            )}
            {skipped && !completed && (
              <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/30">
                <AlertTriangle className="mr-1 h-3 w-3" />
                Skipped
              </Badge>
            )}
            {!completed && !skipped && (
              <Badge variant="outline" className="text-muted-foreground">
                Mandatory
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
    </Card>
  );
}
