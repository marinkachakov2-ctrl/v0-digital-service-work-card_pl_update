"use client";

import { useState, useEffect } from "react";
import { Wrench, Play, Pause, Square, CalendarDays, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import Link from "next/link";

type TimerStatus = "idle" | "running" | "paused";

interface WorkCardHeaderProps {
  orderNumber: string;
  jobCardNumber: string;
  clockAtJobLevel: boolean;
  hasMultipleTechs?: boolean;
  timerStatus: TimerStatus;
  elapsedTime: string;
  onTimerStart: () => void;
  onTimerPause: () => void;
  onTimerStop: () => void;
  isAdmin: boolean;
  onAdminToggle: (val: boolean) => void;
  isSigned: boolean;
  isPayerBlocked?: boolean;
}

export function WorkCardHeader({
  orderNumber,
  jobCardNumber,
  clockAtJobLevel,
  hasMultipleTechs = false,
  timerStatus,
  elapsedTime,
  onTimerStart,
  onTimerPause,
  onTimerStop,
  isAdmin,
  onAdminToggle,
  isSigned,
  isPayerBlocked = false,
}: WorkCardHeaderProps) {
  const [currentDate, setCurrentDate] = useState("--/--/----");

  useEffect(() => {
    setCurrentDate(
      new Date().toLocaleDateString("bg-BG", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    );
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
            <h1 className="text-lg font-bold tracking-tight text-foreground">Megatron EAD</h1>
            <p className="text-xs text-muted-foreground">Работна Карта</p>
          </div>
        </div>

        {/* Order / JCN Display */}
        {(orderNumber || jobCardNumber) && (
          <div className="flex items-center gap-3">
            {orderNumber && (
              <div className="text-center">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Order #</p>
                <Badge variant="outline" className="font-mono text-xs">{orderNumber}</Badge>
              </div>
            )}
            {jobCardNumber && (
              <div className="text-center">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Job Card #</p>
                <Badge variant="secondary" className="font-mono text-xs">{jobCardNumber}</Badge>
              </div>
            )}
          </div>
        )}

        {/* Time Tracking Toolbar */}
        <div className="flex items-center gap-2">
          {/* Global Clock In/Out for multi-tech */}
          {hasMultipleTechs && (
            <Badge variant="outline" className="gap-1 text-xs">
              <Users className="h-3 w-3" />
              {clockAtJobLevel ? "Job-level" : "Individual"}
            </Badge>
          )}

          <Button
            onClick={onTimerStart}
            disabled={timerStatus === "running" || isSigned || isPayerBlocked}
            className={`h-9 gap-1.5 px-3 text-white shadow-sm disabled:opacity-50 ${
              isPayerBlocked 
                ? "bg-red-600 hover:bg-red-600 cursor-not-allowed" 
                : "bg-emerald-600 hover:bg-emerald-700"
            }`}
            title={isPayerBlocked ? "Клиентът е блокиран - работата е забранена" : "Старт на работа"}
          >
            <Play className="h-4 w-4" />
            <span className="hidden sm:inline">{isPayerBlocked ? "Блокиран" : "Старт"}</span>
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
                ? "border-emerald-500/50 bg-emerald-950/50 text-emerald-400"
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

          {/* Admin Override Indicator */}
          {isAdmin && (
            <Button variant="outline" size="sm" className="h-9 gap-1 border-amber-500/30 bg-transparent text-amber-500">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span className="hidden sm:inline text-xs">Admin Edit</span>
            </Button>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Admin Toggle */}
          <div className="flex items-center gap-2">
            <Switch
              id="admin-toggle"
              checked={isAdmin}
              onCheckedChange={onAdminToggle}
              className="data-[state=checked]:bg-amber-500"
            />
            <Label htmlFor="admin-toggle" className="text-xs text-muted-foreground cursor-pointer">
              {isAdmin ? "Admin" : "Tech"}
            </Label>
          </div>

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
    </header>
  );
}
