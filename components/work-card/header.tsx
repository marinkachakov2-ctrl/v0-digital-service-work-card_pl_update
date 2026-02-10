"use client";

import { Search, ScanLine, Wrench, Play, Pause, Square, CalendarDays } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TechnicianCombobox } from "./technician-combobox";
import Link from "next/link";

type TimerStatus = "idle" | "running" | "paused";

interface WorkCardHeaderProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  onSimulateScan: () => void;
  technician1: string;
  technician2: string;
  onTechnician1Change: (value: string) => void;
  onTechnician2Change: (value: string) => void;
  timerStatus: TimerStatus;
  elapsedTime: string;
  onTimerStart: () => void;
  onTimerPause: () => void;
  onTimerStop: () => void;
}

export function WorkCardHeader({
  searchValue,
  onSearchChange,
  onSimulateScan,
  technician1,
  technician2,
  onTechnician1Change,
  onTechnician2Change,
  timerStatus,
  elapsedTime,
  onTimerStart,
  onTimerPause,
  onTimerStop,
}: WorkCardHeaderProps) {
  const currentDate = new Date().toLocaleDateString("bg-BG", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

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

        {/* Time Tracking Toolbar */}
        <div className="flex items-center gap-2">
          <Button
            onClick={onTimerStart}
            disabled={timerStatus === "running"}
            className="h-9 gap-1.5 bg-green-600 px-3 text-white shadow-sm hover:bg-green-700 disabled:opacity-50"
          >
            <Play className="h-4 w-4" />
            <span className="hidden sm:inline">Старт</span>
          </Button>
          <Button
            onClick={onTimerPause}
            disabled={timerStatus !== "running"}
            className="h-9 gap-1.5 bg-amber-500 px-3 text-amber-950 shadow-sm hover:bg-amber-600 disabled:opacity-50"
          >
            <Pause className="h-4 w-4" />
            <span className="hidden sm:inline">Пауза</span>
          </Button>

          {/* Digital Timer Display */}
          <div
            className={`flex h-9 min-w-[90px] items-center justify-center rounded-md border px-3 font-mono text-sm font-semibold tabular-nums ${
              timerStatus === "running"
                ? "border-green-500/50 bg-green-950/50 text-green-400"
                : timerStatus === "paused"
                  ? "border-amber-500/50 bg-amber-950/50 text-amber-400"
                  : "border-border bg-secondary text-muted-foreground"
            }`}
          >
            {elapsedTime}
          </div>

          <Button
            onClick={onTimerStop}
            disabled={timerStatus === "idle"}
            className="h-9 gap-1.5 bg-red-600 px-3 text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
          >
            <Square className="h-4 w-4" />
            <span className="hidden sm:inline">Край</span>
          </Button>
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

      {/* Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Order No / Serial No"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-11 bg-card pl-10 text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <Button
          onClick={onSimulateScan}
          className="h-11 gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <ScanLine className="h-4 w-4" />
          Simulate Scan
        </Button>
      </div>

      {/* Technicians Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TechnicianCombobox
          value={technician1}
          onChange={onTechnician1Change}
          label="Техник 1"
          placeholder="Изберете техник..."
        />
        <TechnicianCombobox
          value={technician2}
          onChange={onTechnician2Change}
          label="Техник 2"
          placeholder="Изберете техник..."
        />
      </div>
    </header>
  );
}
