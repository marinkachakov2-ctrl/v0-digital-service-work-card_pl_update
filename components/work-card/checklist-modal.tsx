"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { ClipboardCheck, AlertTriangle, CheckCircle2, Check, Camera, Loader2, X, Wrench } from "lucide-react";
import { saveFreeCheckResult, uploadFreeCheckPhoto } from "@/lib/actions";

// FREE CHECK control points from Megatron protocol for 6030/7030 series
const FREE_CHECK_POINTS = [
  { id: "01", name: "Горивен филтър", desc: "Проверка за вода, остатъци и течове" },
  { id: "02", name: "Пистов ремък", desc: "Състояние и обтяжна шайба" },
  { id: "03", name: "Водна помпа", desc: "Проверка за теч" },
  { id: "04", name: "Маркучи на климатика", desc: "Износване и позиция на монтаж" },
  { id: "05", name: "Въздушен филтър и отдушници", desc: "Кабина и капачки на отдушници" },
  { id: "06", name: "Линии на спирачките", desc: "Корозия и повреда на задния мост" },
  { id: "07", name: "Софтуер и свързаност", desc: "Версии и JDLink статус" },
  { id: "08", name: "Пробно каране", desc: "Функционална проверка в движение" },
  { id: "09", name: "Информационен панел", desc: "Проверка на дисплеи и индикатори" },
  { id: "10", name: "Седалка и Волан", desc: "Проверка на механизми и луфтове" },
  { id: "11", name: "Турбокомпресор", desc: "Оглед на двигател и турбо" },
  { id: "12", name: "Алтернатор", desc: "Зареждане и състояние" },
  { id: "13", name: "Охладителна система", desc: "Нива и течове" },
  { id: "14", name: "MFWD и TLS окачване", desc: "Преден мост и кормилна уредба" },
];

export type FreeCheckStatus = "+" | "0" | "repair" | null;

export interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  // New fields for FREE CHECK
  status?: FreeCheckStatus;
  comment?: string;
  photoUrl?: string | null;
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
  jobCardId?: string | null;
}

export function getDefaultChecklist(): ChecklistItem[] {
  return FREE_CHECK_POINTS.map((point) => ({
    id: point.id,
    label: point.name,
    checked: false,
    status: null,
    comment: "",
    photoUrl: null,
  }));
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
  jobCardId,
}: ChecklistModalProps) {
  const [showSkipField, setShowSkipField] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Update item status
  const updateItemStatus = (id: string, status: FreeCheckStatus) => {
    onItemsChange(
      items.map((item) =>
        item.id === id
          ? {
              ...item,
              status,
              checked: status === "+",
              // Clear comment and photo when changing to "+"
              ...(status === "+" ? { comment: "", photoUrl: null } : {}),
            }
          : item
      )
    );
  };

  // Update item comment
  const updateItemComment = (id: string, comment: string) => {
    onItemsChange(
      items.map((item) => (item.id === id ? { ...item, comment } : item))
    );
  };

  // Handle photo capture
  const handlePhotoCapture = async (id: string, file: File) => {
    if (!jobCardId) return;

    setUploadingId(id);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        const result = await uploadFreeCheckPhoto(jobCardId, id, base64);

        if (result.success && result.url) {
          onItemsChange(
            items.map((item) =>
              item.id === id ? { ...item, photoUrl: result.url } : item
            )
          );
        }
        setUploadingId(null);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Photo upload error:", err);
      setUploadingId(null);
    }
  };

  // Save individual item to database
  const saveItem = async (item: ChecklistItem) => {
    if (!jobCardId || !item.status) return;

    setSavingIds((prev) => new Set(prev).add(item.id));

    const point = FREE_CHECK_POINTS.find((p) => p.id === item.id);
    await saveFreeCheckResult({
      jobCardId,
      controlPointNo: item.id,
      controlPointName: point?.name || item.label,
      status: item.status,
      comments: item.comment || null,
      photoUrl: item.photoUrl || null,
    });

    setSavingIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(item.id);
      return newSet;
    });
  };

  const completedCount = items.filter((i) => i.status !== null).length;
  const allCompleted = completedCount === items.length;
  const canSkip = skipReason.trim().length >= 5;

  const handleComplete = async () => {
    // Save all items before completing
    for (const item of items) {
      if (item.status) {
        await saveItem(item);
      }
    }
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
      <DialogContent className="sm:max-w-2xl max-h-[95vh] overflow-y-auto bg-background">
        <DialogHeader className="border-b border-border pb-4">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-6 w-6 text-[#367C2B]" />
              <div>
                <span className="text-xl font-bold text-[#FFDE00]">FREE CHECK</span>
                <p className="text-xs text-muted-foreground font-normal">
                  Трактори 6030/7030 Premium
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-xs">
              {completedCount} / {items.length}
            </Badge>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Complete free check inspection for all control points
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="h-3 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-[#367C2B] transition-all duration-300"
                style={{
                  width: `${items.length > 0 ? (completedCount / items.length) * 100 : 0}%`,
                }}
              />
            </div>
          </div>

          {/* Control Points */}
          <div className="space-y-3">
            {FREE_CHECK_POINTS.map((point, index) => {
              const item = items[index] || {
                id: point.id,
                status: null,
                comment: "",
                photoUrl: null,
              };
              const needsDetails = item.status === "0" || item.status === "repair";

              return (
                <Card
                  key={point.id}
                  className={`border-border bg-card transition-colors ${
                    item.status === "+"
                      ? "border-emerald-500/30"
                      : item.status === "0"
                        ? "border-amber-500/30"
                        : item.status === "repair"
                          ? "border-red-500/30"
                          : ""
                  }`}
                >
                  <CardHeader className="pb-2 pt-3 px-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1">
                        <CardTitle className="text-base text-foreground flex items-center gap-2">
                          <span className="text-[#FFDE00] font-mono text-sm bg-[#367C2B]/20 px-2 py-0.5 rounded">
                            {point.id}
                          </span>
                          {point.name}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">
                          {point.desc}
                        </p>
                      </div>

                      {/* Large Status Buttons - Glove-friendly */}
                      <div className="flex gap-2">
                        {/* + Good */}
                        <Button
                          type="button"
                          onClick={() => updateItemStatus(point.id, "+")}
                          variant={item.status === "+" ? "default" : "outline"}
                          className={`w-16 h-16 sm:w-14 sm:h-14 p-0 ${
                            item.status === "+"
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600"
                              : "border-border hover:bg-emerald-500/10 hover:border-emerald-500/50"
                          }`}
                        >
                          <Check className="w-8 h-8 sm:w-7 sm:h-7" />
                        </Button>

                        {/* 0 Usable */}
                        <Button
                          type="button"
                          onClick={() => updateItemStatus(point.id, "0")}
                          variant={item.status === "0" ? "default" : "outline"}
                          className={`w-16 h-16 sm:w-14 sm:h-14 p-0 ${
                            item.status === "0"
                              ? "bg-amber-500 hover:bg-amber-600 text-white border-amber-500"
                              : "border-border hover:bg-amber-500/10 hover:border-amber-500/50"
                          }`}
                        >
                          <span className="text-2xl sm:text-xl font-bold">0</span>
                        </Button>

                        {/* Repair */}
                        <Button
                          type="button"
                          onClick={() => updateItemStatus(point.id, "repair")}
                          variant={item.status === "repair" ? "default" : "outline"}
                          className={`w-16 h-16 sm:w-14 sm:h-14 p-0 ${
                            item.status === "repair"
                              ? "bg-red-600 hover:bg-red-700 text-white border-red-600"
                              : "border-border hover:bg-red-500/10 hover:border-red-500/50"
                          }`}
                        >
                          <Wrench className="w-7 h-7 sm:w-6 sm:h-6" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  {/* Expandable Comment + Photo Section */}
                  {needsDetails && (
                    <CardContent className="pt-2 pb-4 px-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
                      <Textarea
                        value={item.comment || ""}
                        onChange={(e) => updateItemComment(point.id, e.target.value)}
                        placeholder="Въведете коментар за състоянието..."
                        className="min-h-[80px] bg-secondary text-foreground placeholder:text-muted-foreground"
                      />

                      {/* Photo Section */}
                      <div className="flex items-center gap-3">
                        <input
                          ref={(el) => {
                            fileInputRefs.current[point.id] = el;
                          }}
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handlePhotoCapture(point.id, file);
                          }}
                          className="hidden"
                        />

                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => fileInputRefs.current[point.id]?.click()}
                          disabled={uploadingId === point.id}
                          className="h-12 flex-1 gap-2 bg-secondary hover:bg-secondary/80"
                        >
                          {uploadingId === point.id ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              Качване...
                            </>
                          ) : (
                            <>
                              <Camera className="w-5 h-5" />
                              Добави снимка
                            </>
                          )}
                        </Button>

                        {item.photoUrl && (
                          <div className="relative h-12 w-12 rounded-md overflow-hidden border border-border">
                            <img
                              src={item.photoUrl}
                              alt="Preview"
                              className="h-full w-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                onItemsChange(
                                  items.map((i) =>
                                    i.id === point.id ? { ...i, photoUrl: null } : i
                                  )
                                )
                              }
                              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center rounded-full bg-destructive text-white"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>

          {/* Skip Section */}
          {!allCompleted && !showSkipField && (
            <Button
              variant="outline"
              size="lg"
              onClick={() => setShowSkipField(true)}
              className="w-full h-14 gap-2 bg-transparent text-amber-500 border-amber-500/30 hover:bg-amber-500/10 hover:text-amber-500"
            >
              <AlertTriangle className="h-5 w-5" />
              Прескочи чеклист (изисква обосновка)
            </Button>
          )}

          {showSkipField && (
            <div className="space-y-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
              <div className="flex items-center gap-2 text-amber-500">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">Причина за прескачане (мин. 5 символа)</span>
              </div>
              <Textarea
                value={skipReason}
                onChange={(e) => onSkipReasonChange(e.target.value)}
                placeholder="Обяснете защо чеклистът се прескача..."
                className="min-h-20 bg-card text-foreground"
              />
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-3 sm:flex-row border-t border-border pt-4">
          {showSkipField && (
            <Button
              variant="outline"
              size="lg"
              onClick={handleSkip}
              disabled={!canSkip}
              className="h-14 gap-2 bg-transparent text-amber-500 border-amber-500/30 hover:bg-amber-500/10 disabled:opacity-50"
            >
              <AlertTriangle className="h-5 w-5" />
              Прескочи с причина
            </Button>
          )}
          <Button
            size="lg"
            onClick={handleComplete}
            disabled={!allCompleted}
            className="h-14 gap-2 bg-[#367C2B] text-white hover:bg-[#2d6823] disabled:opacity-50"
          >
            <CheckCircle2 className="h-5 w-5" />
            Завърши FREE CHECK
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
          ? "border-[#367C2B]/50"
          : skipped
            ? "border-amber-500/30"
            : "border-[#FFDE00]/30"
      }`}
      onClick={onOpen}
    >
      <CardHeader className="py-4 px-4">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#367C2B]/10">
              <ClipboardCheck
                className={`h-5 w-5 ${
                  completed
                    ? "text-[#367C2B]"
                    : skipped
                      ? "text-amber-500"
                      : "text-[#367C2B]"
                }`}
              />
            </div>
            <div>
              <span className="text-[#FFDE00] font-bold">FREE CHECK</span>
              <p className="text-xs text-muted-foreground font-normal">
                Трактори 6030/7030 Premium
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {completed && (
              <Badge className="bg-[#367C2B]/15 text-[#367C2B] border-[#367C2B]/30">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Завършен
              </Badge>
            )}
            {skipped && !completed && (
              <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/30">
                <AlertTriangle className="mr-1 h-3 w-3" />
                Прескочен
              </Badge>
            )}
            {!completed && !skipped && (
              <Badge variant="outline" className="text-muted-foreground border-[#FFDE00]/30">
                Задължителен
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
    </Card>
  );
}
