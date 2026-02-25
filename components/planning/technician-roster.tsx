"use client";

import { useState, useEffect } from "react";
import { User, Clock, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TechnicianData {
  id: string;
  name: string;
  shift: string;
  hoursLoaded: number;
  totalHours: number;
  status: "active" | "leave" | "sick";
  ordersCount: number;
}

interface TechnicianRosterProps {
  selectedDate: Date;
  onSelectTechnician: (technicianId: string) => void;
}

// Sample technician data
const techniciansData: TechnicianData[] = [
  {
    id: "tech-1",
    name: "Иван Петров",
    shift: "08:00 - 17:00",
    hoursLoaded: 6,
    totalHours: 8,
    status: "active",
    ordersCount: 3,
  },
  {
    id: "tech-2",
    name: "Георги Иванов",
    shift: "08:00 - 17:00",
    hoursLoaded: 7.5,
    totalHours: 8,
    status: "active",
    ordersCount: 4,
  },
  {
    id: "tech-3",
    name: "Петър Стоянов",
    shift: "07:00 - 16:00",
    hoursLoaded: 4,
    totalHours: 8,
    status: "active",
    ordersCount: 2,
  },
  {
    id: "tech-4",
    name: "Димитър Колев",
    shift: "09:00 - 18:00",
    hoursLoaded: 0,
    totalHours: 8,
    status: "leave",
    ordersCount: 0,
  },
  {
    id: "tech-5",
    name: "Николай Димов",
    shift: "08:00 - 17:00",
    hoursLoaded: 0,
    totalHours: 8,
    status: "sick",
    ordersCount: 0,
  },
  {
    id: "tech-6",
    name: "Стефан Георгиев",
    shift: "08:00 - 17:00",
    hoursLoaded: 5.5,
    totalHours: 8,
    status: "active",
    ordersCount: 3,
  },
];

function getStatusBadge(status: TechnicianData["status"]) {
  switch (status) {
    case "active":
      return (
        <Badge className="bg-green-600 text-white hover:bg-green-700">
          Активен
        </Badge>
      );
    case "leave":
      return (
        <Badge className="bg-amber-600 text-white hover:bg-amber-700">
          Отпуск
        </Badge>
      );
    case "sick":
      return (
        <Badge className="bg-red-600 text-white hover:bg-red-700">
          Болничен
        </Badge>
      );
  }
}

const BG_MONTHS = ["януари","февруари","март","април","май","юни","юли","август","септември","октомври","ноември","декември"];
const BG_WEEKDAYS = ["неделя","понеделник","вторник","сряда","четвъртък","петък","събота"];

export function TechnicianRoster({
  selectedDate,
  onSelectTechnician,
}: TechnicianRosterProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const dateString = mounted
    ? `${BG_WEEKDAYS[selectedDate.getDay()]}, ${selectedDate.getDate()} ${BG_MONTHS[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`
    : "";

  // Calculate summary
  const activeTechnicians = techniciansData.filter(
    (t) => t.status === "active"
  );
  const totalCapacity = activeTechnicians.reduce((sum, t) => sum + t.totalHours, 0);
  const totalLoaded = activeTechnicians.reduce((sum, t) => sum + t.hoursLoaded, 0);
  const utilization = totalCapacity > 0 ? (totalLoaded / totalCapacity) * 100 : 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Наличност на техници
          </h2>
          <p className="text-sm capitalize text-muted-foreground">{dateString}</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Общо техници</p>
          <p className="mt-1 text-2xl font-bold text-foreground">
            {techniciansData.length}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Активни</p>
          <p className="mt-1 text-2xl font-bold text-green-400">
            {activeTechnicians.length}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Общ капацитет</p>
          <p className="mt-1 text-2xl font-bold text-foreground">
            {totalCapacity}ч
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Натовареност</p>
          <p
            className={cn(
              "mt-1 text-2xl font-bold",
              utilization >= 90
                ? "text-green-400"
                : utilization >= 70
                  ? "text-amber-400"
                  : "text-foreground"
            )}
          >
            {Math.round(utilization)}%
          </p>
        </div>
      </div>

      {/* Technician List */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-[2fr_1fr_1.5fr_1fr_0.5fr] gap-4 border-b border-border bg-secondary/50 px-4 py-3">
          <div className="text-xs font-medium text-muted-foreground">
            Техник
          </div>
          <div className="text-xs font-medium text-muted-foreground">Смяна</div>
          <div className="text-xs font-medium text-muted-foreground">
            Натоварване
          </div>
          <div className="text-xs font-medium text-muted-foreground">Статус</div>
          <div />
        </div>

        {/* Table Body */}
        {techniciansData.map((tech) => {
          const loadPercent =
            tech.totalHours > 0
              ? (tech.hoursLoaded / tech.totalHours) * 100
              : 0;

          return (
            <button
              key={tech.id}
              type="button"
              onClick={() => tech.status === "active" && onSelectTechnician(tech.id)}
              disabled={tech.status !== "active"}
              className={cn(
                "grid w-full grid-cols-[2fr_1fr_1.5fr_1fr_0.5fr] gap-4 border-b border-border px-4 py-3 text-left transition-colors",
                tech.status === "active"
                  ? "hover:bg-secondary/50 cursor-pointer"
                  : "opacity-60 cursor-not-allowed"
              )}
            >
              {/* Name */}
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {tech.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {tech.ordersCount} поръчки
                  </p>
                </div>
              </div>

              {/* Shift */}
              <div className="flex items-center">
                <div className="flex items-center gap-1.5 text-sm text-foreground">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  {tech.shift}
                </div>
              </div>

              {/* Load */}
              <div className="flex flex-col justify-center gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-foreground">
                    {tech.hoursLoaded}ч / {tech.totalHours}ч
                  </span>
                  <span className="text-muted-foreground">
                    {Math.round(loadPercent)}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      loadPercent >= 90
                        ? "bg-green-500"
                        : loadPercent >= 70
                          ? "bg-amber-500"
                          : "bg-blue-500"
                    )}
                    style={{ width: `${Math.min(loadPercent, 100)}%` }}
                  />
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center">{getStatusBadge(tech.status)}</div>

              {/* Arrow */}
              <div className="flex items-center justify-end">
                {tech.status === "active" && (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
