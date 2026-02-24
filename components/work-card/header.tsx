"use client";

import { useState, useEffect, useRef } from "react";
import { Search, ScanLine, Wrench, Play, Pause, Square, CalendarDays, Plus, X, Building2, Tractor, Hash, ShieldCheck, Settings, Hammer } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TechnicianCombobox } from "./technician-combobox";
import Link from "next/link";
import type { ClientData } from "@/app/page";

// Highlight the matching substring in search results
function highlightMatch(text: string, query: string) {
  if (!query.trim()) return text;
  const idx = text.toLowerCase().indexOf(query.trim().toLowerCase());
  if (idx === -1) return text;
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + query.trim().length);
  const after = text.slice(idx + query.trim().length);
  return (
    <>
      {before}
      <span className="font-semibold text-primary">{match}</span>
      {after}
    </>
  );
}

type TimerStatus = "idle" | "running" | "paused";
type TechStatus = "green" | "yellow" | "red";

type OrderType = "warranty" | "repair" | "internal";

interface WorkCardHeaderProps {
  orderType: OrderType;
  onOrderTypeChange: (type: OrderType) => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchResults: ClientData[];
  onSelectClient: (client: ClientData) => void;
  onSimulateScan: () => void;
  technicians: string[];
  onTechniciansChange: (technicians: string[]) => void;
  workCardStatus: TechStatus;
  onWorkCardStatusChange: (status: TechStatus) => void;
  techTimers: Record<number, { status: TimerStatus; elapsed: number }>;
  formatTime: (seconds: number) => string;
  onTechTimerStart: (index: number) => void;
  onTechTimerPause: (index: number) => void;
  onTechTimerStop: (index: number) => void;
}

const trafficLightOptions: { value: TechStatus; label: string; color: string; activeRing: string; activeBg: string }[] = [
  { value: "green",  label: "Работи",   color: "bg-green-500",  activeRing: "ring-green-400/60",  activeBg: "bg-green-500"  },
  { value: "yellow", label: "Изчаква",  color: "bg-yellow-400", activeRing: "ring-yellow-400/60", activeBg: "bg-yellow-400" },
  { value: "red",    label: "Блокиран", color: "bg-red-500",    activeRing: "ring-red-400/60",    activeBg: "bg-red-500"    },
];

const orderTypeOptions: { value: OrderType; label: string; icon: typeof ShieldCheck }[] = [
  { value: "warranty", label: "Гаранция", icon: ShieldCheck },
  { value: "repair", label: "Ремонт", icon: Hammer },
  { value: "internal", label: "Вътрешен труд", icon: Settings },
];

export function WorkCardHeader({
  orderType,
  onOrderTypeChange,
  searchValue,
  onSearchChange,
  searchResults,
  onSelectClient,
  onSimulateScan,
  technicians,
  onTechniciansChange,
  workCardStatus,
  onWorkCardStatusChange,
  techTimers,
  formatTime,
  onTechTimerStart,
  onTechTimerPause,
  onTechTimerStop,
}: WorkCardHeaderProps) {
  const [currentDate, setCurrentDate] = useState("");
  const [showResults, setShowResults] = useState(false);
  const searchWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentDate(
      new Date().toLocaleDateString("bg-BG", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    );
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="space-y-4">
      {/* Top Bar */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary">
            <Wrench className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              Megatron EAD
            </h1>
            <p className="text-xs text-muted-foreground">Работна Карта</p>
          </div>
        </div>

        {/* Work card traffic light */}
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-3 py-1.5"
            role="radiogroup"
            aria-label="Статус на работна карта"
          >
            {trafficLightOptions.map((opt) => {
              const isActive = workCardStatus === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  aria-label={opt.label}
                  title={opt.label}
                  onClick={() => onWorkCardStatusChange(opt.value)}
                  className={`h-6 w-6 rounded-full transition-all ${
                    isActive
                      ? `${opt.activeBg} ring-[3px] ${opt.activeRing} scale-110`
                      : `${opt.color} opacity-25 border-transparent hover:opacity-50`
                  }`}
                />
              );
            })}
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            {workCardStatus === "green"
              ? "Работим"
              : workCardStatus === "yellow"
                ? "Изчакваме"
                : "Блокирана"}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/planning">
            <Button variant="outline" size="sm" className="gap-1.5 bg-transparent">
              <CalendarDays className="h-4 w-4" />
              <span className="hidden sm:inline">Планиране</span>
            </Button>
          </Link>
          <div className="text-right">
            <p className="text-sm font-medium text-foreground">{currentDate}</p>
            <p className="text-xs text-muted-foreground">Дата</p>
          </div>
        </div>
      </div>

      {/* Order Type Selection */}
      <div className="flex items-center gap-2">
        <span className="mr-1 text-xs font-medium text-muted-foreground">Вид:</span>
        {orderTypeOptions.map((opt) => {
          const Icon = opt.icon;
          const isActive = orderType === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onOrderTypeChange(opt.value)}
              className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Search Bar with dropdown */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1" ref={searchWrapperRef}>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Търсене по клиент, машина, сериен номер, VIN..."
            value={searchValue}
            onChange={(e) => {
              onSearchChange(e.target.value);
              setShowResults(true);
            }}
            onFocus={() => setShowResults(true)}
            className="h-11 bg-card pl-10 text-foreground placeholder:text-muted-foreground"
          />

          {/* Search results dropdown */}
          {showResults && searchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
              {searchResults.map((client, i) => (
                <button
                  key={`${client.serialNo}-${i}`}
                  type="button"
                  className="flex w-full flex-col gap-0.5 px-4 py-3 text-left transition-colors hover:bg-accent first:rounded-t-lg last:rounded-b-lg"
                  onClick={() => {
                    onSelectClient(client);
                    setShowResults(false);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span className="text-sm font-medium text-foreground">
                      {highlightMatch(client.clientName, searchValue)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 pl-[22px]">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Tractor className="h-3 w-3" />
                      {highlightMatch(client.machineModel, searchValue)}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Hash className="h-3 w-3" />
                      {highlightMatch(client.serialNo, searchValue)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {highlightMatch(client.location, searchValue)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {showResults && searchValue.trim().length >= 2 && searchResults.length === 0 && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-lg">
              Няма намерени резултати
            </div>
          )}
        </div>
        <Button
          onClick={onSimulateScan}
          className="h-11 gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <ScanLine className="h-4 w-4" />
          Сканирай
        </Button>
      </div>

      {/* Technicians with individual clocking */}
      <div className="space-y-2">
        {technicians.map((tech, index) => {
          const timer = techTimers[index] ?? { status: "idle" as const, elapsed: 0 };
          const isRunning = timer.status === "running";
          const isPaused = timer.status === "paused";
          const isIdle = timer.status === "idle";

          const rowStyle = isRunning
            ? "border-green-500/40 bg-green-950/20"
            : isPaused
              ? "border-amber-500/40 bg-amber-950/20"
              : "border-border bg-card";

          return (
            <div
              key={index}
              className={`flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2 transition-colors ${rowStyle}`}
            >
              {/* Technician selector */}
              <div className="flex-1 min-w-[220px]">
                <TechnicianCombobox
                  value={tech}
                  onChange={(val) => {
                    const next = [...technicians];
                    next[index] = val;
                    onTechniciansChange(next);
                  }}
                  label={`Техник ${index + 1}`}
                  placeholder="Изберете техник..."
                />
              </div>

              {/* Timer controls */}
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  onClick={() => onTechTimerStart(index)}
                  disabled={isRunning || !tech}
                  size="icon"
                  className="h-9 w-9 bg-green-600 text-white shadow-sm hover:bg-green-700 disabled:opacity-40"
                  aria-label={`Старт Техник ${index + 1}`}
                >
                  <Play className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  onClick={() => onTechTimerPause(index)}
                  disabled={!isRunning}
                  size="icon"
                  className="h-9 w-9 bg-amber-500 text-amber-950 shadow-sm hover:bg-amber-600 disabled:opacity-40"
                  aria-label={`Пауза Техник ${index + 1}`}
                >
                  <Pause className="h-4 w-4" />
                </Button>

                {/* Digital timer display */}
                <div
                  className={`flex h-9 min-w-[82px] items-center justify-center rounded-md border px-2.5 font-mono text-sm font-semibold tabular-nums ${
                    isRunning
                      ? "border-green-500/50 bg-green-950/50 text-green-400"
                      : isPaused
                        ? "border-amber-500/50 bg-amber-950/50 text-amber-400"
                        : "border-border bg-secondary text-muted-foreground"
                  }`}
                >
                  {formatTime(timer.elapsed)}
                </div>

                <Button
                  type="button"
                  onClick={() => onTechTimerStop(index)}
                  disabled={isIdle}
                  size="icon"
                  className="h-9 w-9 bg-red-600 text-white shadow-sm hover:bg-red-700 disabled:opacity-40"
                  aria-label={`Стоп Техник ${index + 1}`}
                >
                  <Square className="h-4 w-4" />
                </Button>
              </div>

              {/* Remove technician */}
              {technicians.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    const next = technicians.filter((_, i) => i !== index);
                    onTechniciansChange(next);
                  }}
                  aria-label={`Премахни Техник ${index + 1}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          );
        })}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-1 gap-1.5 bg-transparent"
          onClick={() => onTechniciansChange([...technicians, ""])}
        >
          <Plus className="h-4 w-4" />
          Добави Техник
        </Button>
      </div>
    </header>
  );
}
