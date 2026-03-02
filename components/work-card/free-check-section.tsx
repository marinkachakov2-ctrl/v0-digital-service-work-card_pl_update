"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Check, AlertTriangle, Camera, X, Loader2, CheckCircle2, Trash2 } from "lucide-react";
import { saveFreeCheckResult, uploadFreeCheckPhoto } from "@/lib/actions";

// John Deere Free Check 14 control points for 6030/7030 series
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

type CheckStatus = "+" | "0" | "repair" | null;

interface CheckItem {
  status: CheckStatus;
  comments: string;
  photoUrl: string | null;
}

interface FreeCheckSectionProps {
  jobCardId: string | null;
  isEnabled: boolean;
}

export function FreeCheckSection({ jobCardId, isEnabled }: FreeCheckSectionProps) {
  const [items, setItems] = useState<Record<string, CheckItem>>({});
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [uploadingIds, setUploadingIds] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const updateStatus = (id: string, status: CheckStatus) => {
    setItems((prev) => ({
      ...prev,
      [id]: { ...prev[id], status, comments: prev[id]?.comments || "", photoUrl: prev[id]?.photoUrl || null },
    }));
    // Remove from saved if status changes
    setSavedIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  };

  const updateComments = (id: string, comments: string) => {
    setItems((prev) => ({
      ...prev,
      [id]: { ...prev[id], comments },
    }));
    setSavedIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  };

  const handlePhotoCapture = async (pointId: string, file: File) => {
    if (!jobCardId) return;

    setUploadingIds((prev) => new Set(prev).add(pointId));

    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        const result = await uploadFreeCheckPhoto(jobCardId, pointId, base64);

        if (result.success && result.url) {
          setItems((prev) => ({
            ...prev,
            [pointId]: { ...prev[pointId], photoUrl: result.url! },
          }));
          setSavedIds((prev) => {
            const newSet = new Set(prev);
            newSet.delete(pointId);
            return newSet;
          });
        }
        setUploadingIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(pointId);
          return newSet;
        });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Photo upload error:", error);
      setUploadingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(pointId);
        return newSet;
      });
    }
  };

  const handleSavePoint = async (pointId: string, pointName: string) => {
    if (!jobCardId) return;

    const item = items[pointId];
    if (!item?.status) return;

    setSavingIds((prev) => new Set(prev).add(pointId));

    const result = await saveFreeCheckResult({
      jobCardId,
      controlPointNo: pointId,
      controlPointName: pointName,
      status: item.status,
      comments: item.comments || null,
      photoUrl: item.photoUrl || null,
    });

    if (result.success) {
      setSavedIds((prev) => new Set(prev).add(pointId));
    }

    setSavingIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(pointId);
      return newSet;
    });
  };

  const removePhoto = (pointId: string) => {
    setItems((prev) => ({
      ...prev,
      [pointId]: { ...prev[pointId], photoUrl: null },
    }));
    setSavedIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(pointId);
      return newSet;
    });
  };

  const completedCount = Object.values(items).filter((item) => item.status).length;
  const totalPoints = FREE_CHECK_POINTS.length;

  return (
    <Card className="border-border bg-card">
      <CardHeader className="border-b border-border pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg text-yellow-500">
              <CheckCircle2 className="h-5 w-5" />
              FREE CHECK
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Трактори 6030/7030 Premium - John Deere протокол
            </p>
          </div>
          <div className="text-right">
            <Badge
              variant="outline"
              className={`${
                completedCount === totalPoints
                  ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
                  : "bg-amber-500/15 text-amber-500 border-amber-500/30"
              }`}
            >
              {completedCount} / {totalPoints}
            </Badge>
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-yellow-500 transition-all duration-300"
            style={{ width: `${(completedCount / totalPoints) * 100}%` }}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-4">
        {FREE_CHECK_POINTS.map((point) => {
          const item = items[point.id];
          const needsDetails = item?.status === "0" || item?.status === "repair";
          const isSaving = savingIds.has(point.id);
          const isUploading = uploadingIds.has(point.id);
          const isSaved = savedIds.has(point.id);

          return (
            <div
              key={point.id}
              className={`rounded-xl border p-4 transition-all ${
                item?.status === "+"
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : item?.status === "0"
                    ? "border-amber-500/30 bg-amber-500/5"
                    : item?.status === "repair"
                      ? "border-red-500/30 bg-red-500/5"
                      : "border-border bg-secondary/30"
              }`}
            >
              {/* Header row */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-600 font-mono text-sm font-bold shrink-0">
                      {point.id}
                    </span>
                    <span className="text-base font-semibold text-foreground truncate">
                      {point.name}
                    </span>
                    {isSaved && (
                      <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 text-[10px] shrink-0">
                        Запазено
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{point.desc}</p>
                </div>

                {/* Large glove-friendly status buttons */}
                <div className="flex gap-2 shrink-0">
                  <Button
                    onClick={() => updateStatus(point.id, "+")}
                    disabled={!isEnabled}
                    className={`h-14 w-14 p-0 text-lg font-bold transition-all ${
                      item?.status === "+"
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500"
                        : "bg-secondary border-border hover:bg-emerald-600/20 text-muted-foreground"
                    }`}
                    variant="outline"
                  >
                    <Check className="h-7 w-7" />
                  </Button>
                  <Button
                    onClick={() => updateStatus(point.id, "0")}
                    disabled={!isEnabled}
                    className={`h-14 w-14 p-0 text-xl font-bold italic transition-all ${
                      item?.status === "0"
                        ? "bg-amber-500 hover:bg-amber-600 text-white border-amber-400"
                        : "bg-secondary border-border hover:bg-amber-500/20 text-muted-foreground"
                    }`}
                    variant="outline"
                  >
                    0
                  </Button>
                  <Button
                    onClick={() => updateStatus(point.id, "repair")}
                    disabled={!isEnabled}
                    className={`h-14 w-14 p-0 text-lg font-bold transition-all ${
                      item?.status === "repair"
                        ? "bg-red-600 hover:bg-red-700 text-white border-red-500"
                        : "bg-secondary border-border hover:bg-red-600/20 text-muted-foreground"
                    }`}
                    variant="outline"
                  >
                    <AlertTriangle className="h-7 w-7" />
                  </Button>
                </div>
              </div>

              {/* Expanded details for '0' or 'repair' statuses */}
              {needsDetails && (
                <div className="mt-4 space-y-3 animate-in slide-in-from-top-2 duration-300">
                  {/* Comment textarea */}
                  <Textarea
                    value={item?.comments || ""}
                    onChange={(e) => updateComments(point.id, e.target.value)}
                    placeholder="Въведете коментар за състоянието..."
                    className="min-h-24 bg-background border-border text-foreground placeholder:text-muted-foreground text-base"
                  />

                  {/* Photo section */}
                  {item?.photoUrl ? (
                    <div className="relative">
                      <div className="relative aspect-video w-full max-w-sm overflow-hidden rounded-lg border border-border bg-secondary">
                        <img
                          src={item.photoUrl}
                          alt={`Снимка за ${point.name}`}
                          className="h-full w-full object-cover"
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute right-2 top-2 h-10 w-10"
                          onClick={() => removePhoto(point.id)}
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </div>
                      <p className="mt-1 text-xs text-emerald-500 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Снимката е качена
                      </p>
                    </div>
                  ) : (
                    <>
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
                          e.target.value = "";
                        }}
                        className="hidden"
                      />
                      <Button
                        variant="secondary"
                        onClick={() => fileInputRefs.current[point.id]?.click()}
                        disabled={isUploading || !jobCardId}
                        className="w-full h-14 gap-3 bg-secondary hover:bg-secondary/80 text-foreground text-base"
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="h-6 w-6 animate-spin" />
                            Качване...
                          </>
                        ) : (
                          <>
                            <Camera className="h-6 w-6" />
                            Добави снимка на дефекта
                          </>
                        )}
                      </Button>
                    </>
                  )}

                  {/* Save button for this point */}
                  <Button
                    onClick={() => handleSavePoint(point.id, point.name)}
                    disabled={isSaving || !jobCardId || isSaved}
                    className={`w-full h-12 gap-2 text-base font-semibold ${
                      isSaved
                        ? "bg-emerald-600/20 text-emerald-500 border-emerald-500/30"
                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                    }`}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Запазване...
                      </>
                    ) : isSaved ? (
                      <>
                        <CheckCircle2 className="h-5 w-5" />
                        Запазено
                      </>
                    ) : (
                      <>
                        <Check className="h-5 w-5" />
                        Запази точка {point.id}
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Quick save for '+' status */}
              {item?.status === "+" && !isSaved && (
                <div className="mt-3">
                  <Button
                    onClick={() => handleSavePoint(point.id, point.name)}
                    disabled={isSaving || !jobCardId}
                    size="sm"
                    className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Запазване...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        Запази OK
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
