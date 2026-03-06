"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DayData {
  date: Date;
  reserved: number;
  available: number;
  totalCapacity: number;
  status: "complete" | "warning" | "normal";
}

interface WorkshopDiaryProps {
  onSelectDay: (date: Date) => void;
}

// Generate sample data for a month
function generateMonthData(year: number, month: number): DayData[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const data: DayData[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dayOfWeek = date.getDay();

    // Skip weekends
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      continue;
    }

    const totalCapacity = 57.5; // Total workshop capacity in hours
    const reserved = Math.random() * 45 + 5; // Random between 5-50 hours
    const available = totalCapacity - reserved;
    const utilization = reserved / totalCapacity;

    let status: "complete" | "warning" | "normal" = "normal";
    if (utilization >= 0.9) {
      status = "complete";
    } else if (utilization >= 0.7) {
      status = "warning";
    }

    data.push({
      date,
      reserved: Math.round(reserved * 10) / 10,
      available: Math.round(available * 10) / 10,
      totalCapacity,
      status,
    });
  }

  return data;
}

export function WorkshopDiary({ onSelectDay }: WorkshopDiaryProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week">("month");

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthData = generateMonthData(year, month);

  const monthName = currentDate.toLocaleDateString("bg-BG", {
    month: "long",
    year: "numeric",
  });

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Get the first day of the month and calculate offset
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // Adjust for Monday start

  // Create calendar grid
  const calendarDays: (DayData | null)[] = [];

  // Add empty cells for days before the first day
  for (let i = 0; i < startOffset; i++) {
    calendarDays.push(null);
  }

  // Add all days of the month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dayOfWeek = date.getDay();

    // Find matching data or create empty weekend day
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      calendarDays.push(null); // Weekend
    } else {
      const dayData = monthData.find(
        (d) => d.date.getDate() === day
      );
      calendarDays.push(dayData || null);
    }
  }

  const today = new Date();
  const isToday = (date: Date) =>
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  return (
    <div className="flex flex-col gap-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="min-w-[180px] text-center text-lg font-semibold capitalize text-foreground">
            {monthName}
          </h2>
          <Button variant="outline" size="icon" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday} className="ml-2 bg-transparent">
            Днес
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "month" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("month")}
          >
            Месец
          </Button>
          <Button
            variant={viewMode === "week" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("week")}
          >
            Седмица
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-green-500" />
          <span>Висока натовареност (90%+)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-amber-500" />
          <span>Средна натовареност (70-90%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-muted" />
          <span>Ниска натовареност</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 border-b border-border bg-secondary/50">
          {["Пон", "Вто", "Сря", "Чет", "Пет", "Съб", "Нед"].map((day) => (
            <div
              key={day}
              className="px-2 py-2 text-center text-xs font-medium text-muted-foreground"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {calendarDays.map((dayData, index) => {
            const dayNumber = index - startOffset + 1;
            const isWeekend =
              dayNumber > 0 &&
              dayNumber <= daysInMonth &&
              (new Date(year, month, dayNumber).getDay() === 0 ||
                new Date(year, month, dayNumber).getDay() === 6);

            if (dayNumber < 1 || dayNumber > daysInMonth) {
              return <div key={index} className="border-b border-r border-border bg-muted/30 min-h-[120px]" />;
            }

            if (isWeekend) {
              return (
                <div
                  key={index}
                  className="border-b border-r border-border bg-muted/50 min-h-[120px] p-2"
                >
                  <span className="text-xs text-muted-foreground">{dayNumber}</span>
                </div>
              );
            }

            if (!dayData) {
              return <div key={index} className="border-b border-r border-border min-h-[120px]" />;
            }

            const utilization = dayData.reserved / dayData.totalCapacity;
            const isTodayCell = isToday(dayData.date);

            return (
              <button
                key={index}
                type="button"
                onClick={() => onSelectDay(dayData.date)}
                className={cn(
                  "group relative flex min-h-[120px] flex-col border-b border-r border-border p-2 text-left transition-colors hover:bg-amber-900/20",
                  isTodayCell && "bg-green-900/20 ring-2 ring-inset ring-green-500"
                )}
              >
                {/* Date and Status */}
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "text-sm font-medium",
                      isTodayCell ? "text-green-400" : "text-foreground"
                    )}
                  >
                    {dayNumber.toString().padStart(2, "0")}{" "}
                    <span className="text-xs text-muted-foreground">
                      {dayData.date.toLocaleDateString("bg-BG", { weekday: "short" })}
                    </span>
                  </span>
                  {dayData.status === "complete" && (
                    <Check className="h-4 w-4 text-green-500" />
                  )}
                  {dayData.status === "warning" && (
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                  )}
                </div>

                {/* Metrics */}
                <div className="mt-2 flex-1 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Резерв:</span>
                    <span className="font-medium text-foreground">{dayData.reserved} ч</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Свободно:</span>
                    <span className="font-medium text-green-400">{dayData.available} ч</span>
                  </div>
                </div>

                {/* Load Bar */}
                <div className="mt-2">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        utilization >= 0.9
                          ? "bg-green-500"
                          : utilization >= 0.7
                            ? "bg-amber-500"
                            : "bg-blue-500"
                      )}
                      style={{ width: `${Math.min(utilization * 100, 100)}%` }}
                    />
                  </div>
                  <span className="mt-0.5 block text-right text-[10px] text-muted-foreground">
                    {Math.round(utilization * 100)}%
                  </span>
                </div>

                {/* Hover indicator */}
                <div className="absolute inset-0 rounded border-2 border-transparent group-hover:border-primary/50" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
