"use client";

import { useState, useEffect } from "react";
import { GripVertical, Clock } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

// Types
interface ScheduledTask {
  id: string;
  orderId: string;
  type: "service" | "repair" | "inspection";
  startHour: number;
  startMinute: number;
  durationMinutes: number;
  description: string;
}

interface ActualTime {
  id: string;
  orderId: string;
  startHour: number;
  startMinute: number;
  durationMinutes: number;
}

interface UnassignedOrder {
  id: string;
  orderId: string;
  description: string;
  estimatedHours: number;
  type: "service" | "repair" | "inspection";
}

interface HourlyGanttProps {
  technicianId: string;
  selectedDate: Date;
}

// Sample data for technician
function getTechnicianData(technicianId: string) {
  const technicianNames: Record<string, string> = {
    "tech-1": "Иван Петров",
    "tech-2": "Георги Иванов",
    "tech-3": "Петър Стоянов",
    "tech-4": "Димитър Колев",
    "tech-5": "Николай Димов",
    "tech-6": "Стефан Георгиев",
  };

  const plannedTasks: Record<string, ScheduledTask[]> = {
    "tech-1": [
      {
        id: "p1",
        orderId: "#12345",
        type: "service",
        startHour: 8,
        startMinute: 0,
        durationMinutes: 120,
        description: "Смяна на масло",
      },
      {
        id: "p2",
        orderId: "#12350",
        type: "repair",
        startHour: 13,
        startMinute: 0,
        durationMinutes: 180,
        description: "Ремонт на двигател",
      },
    ],
    "tech-2": [
      {
        id: "p3",
        orderId: "#12346",
        type: "inspection",
        startHour: 9,
        startMinute: 30,
        durationMinutes: 90,
        description: "Годишен преглед",
      },
      {
        id: "p4",
        orderId: "#12351",
        type: "service",
        startHour: 14,
        startMinute: 0,
        durationMinutes: 120,
        description: "Смяна на филтри",
      },
    ],
    "tech-3": [
      {
        id: "p5",
        orderId: "#12347",
        type: "repair",
        startHour: 7,
        startMinute: 0,
        durationMinutes: 240,
        description: "Ремонт на хидравлика",
      },
    ],
    "tech-6": [
      {
        id: "p6",
        orderId: "#12348",
        type: "service",
        startHour: 8,
        startMinute: 30,
        durationMinutes: 90,
        description: "Диагностика",
      },
      {
        id: "p7",
        orderId: "#12352",
        type: "inspection",
        startHour: 11,
        startMinute: 0,
        durationMinutes: 60,
        description: "Проверка на спирачки",
      },
      {
        id: "p8",
        orderId: "#12355",
        type: "repair",
        startHour: 14,
        startMinute: 30,
        durationMinutes: 150,
        description: "Ремонт на трансмисия",
      },
    ],
  };

  const actualTimes: Record<string, ActualTime[]> = {
    "tech-1": [
      {
        id: "a1",
        orderId: "#12345",
        startHour: 8,
        startMinute: 15,
        durationMinutes: 135,
      },
      {
        id: "a2",
        orderId: "#12350",
        startHour: 13,
        startMinute: 0,
        durationMinutes: 90,
      },
    ],
    "tech-2": [
      {
        id: "a3",
        orderId: "#12346",
        startHour: 9,
        startMinute: 30,
        durationMinutes: 75,
      },
    ],
    "tech-3": [
      {
        id: "a5",
        orderId: "#12347",
        startHour: 7,
        startMinute: 0,
        durationMinutes: 180,
      },
    ],
    "tech-6": [
      {
        id: "a6",
        orderId: "#12348",
        startHour: 8,
        startMinute: 45,
        durationMinutes: 75,
      },
      {
        id: "a7",
        orderId: "#12352",
        startHour: 11,
        startMinute: 0,
        durationMinutes: 55,
      },
    ],
  };

  return {
    name: technicianNames[technicianId] || "Неизвестен",
    planned: plannedTasks[technicianId] || [],
    actual: actualTimes[technicianId] || [],
  };
}

const unassignedOrders: UnassignedOrder[] = [
  {
    id: "u1",
    orderId: "#999",
    description: "Смяна на масло",
    estimatedHours: 2,
    type: "service",
  },
  {
    id: "u2",
    orderId: "#1001",
    description: "Диагностика",
    estimatedHours: 1,
    type: "inspection",
  },
  {
    id: "u3",
    orderId: "#1002",
    description: "Ремонт на спирачки",
    estimatedHours: 3,
    type: "repair",
  },
];

// Constants
const START_HOUR = 7;
const END_HOUR = 20;
const HOURS = Array.from(
  { length: END_HOUR - START_HOUR },
  (_, i) => START_HOUR + i
);
const CELL_WIDTH = 80;
const SIDEBAR_WIDTH = 120;

function getTaskColor(type: "service" | "repair" | "inspection") {
  switch (type) {
    case "service":
      return "bg-blue-600 border-blue-500";
    case "repair":
      return "bg-green-600 border-green-500";
    case "inspection":
      return "bg-amber-600 border-amber-500";
  }
}

function getTaskPosition(
  startHour: number,
  startMinute: number,
  durationMinutes: number
) {
  const startOffset =
    (startHour - START_HOUR) * CELL_WIDTH + (startMinute / 60) * CELL_WIDTH;
  const width = (durationMinutes / 60) * CELL_WIDTH;
  return { left: startOffset, width };
}

export function HourlyGantt({ technicianId, selectedDate }: HourlyGanttProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const techData = getTechnicianData(technicianId);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();
  const currentTimeOffset =
    currentHour >= START_HOUR && currentHour < END_HOUR
      ? (currentHour - START_HOUR) * CELL_WIDTH +
        (currentMinute / 60) * CELL_WIDTH
      : null;

  const dateString = selectedDate.toLocaleDateString("bg-BG", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  // Calculate totals
  const plannedMinutes = techData.planned.reduce(
    (sum, t) => sum + t.durationMinutes,
    0
  );
  const actualMinutes = techData.actual.reduce(
    (sum, t) => sum + t.durationMinutes,
    0
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {techData.name}
          </h2>
          <p className="text-sm capitalize text-muted-foreground">{dateString}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Планирано</p>
            <p className="text-sm font-medium text-foreground">
              {Math.floor(plannedMinutes / 60)}ч {plannedMinutes % 60}мин
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Отчетено</p>
            <p className="text-sm font-medium text-red-400">
              {Math.floor(actualMinutes / 60)}ч {actualMinutes % 60}мин
            </p>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-6 rounded bg-blue-600" />
          <span className="text-muted-foreground">Сервиз</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-6 rounded bg-green-600" />
          <span className="text-muted-foreground">Ремонт</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-6 rounded bg-amber-600" />
          <span className="text-muted-foreground">Инспекция</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-6 rounded bg-red-900" />
          <span className="text-muted-foreground">Отчетено</span>
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="flex">
          {/* Sidebar */}
          <div
            className="flex-shrink-0 border-r border-border"
            style={{ width: SIDEBAR_WIDTH }}
          >
            <div className="flex h-10 items-center border-b border-border bg-secondary/50 px-3">
              <span className="text-xs font-medium text-muted-foreground">
                Тип
              </span>
            </div>
            <div className="flex h-10 items-center border-b border-border px-3">
              <span className="text-xs text-foreground">Планирано</span>
            </div>
            <div className="flex h-10 items-center px-3">
              <span className="text-xs text-foreground">Отчетено</span>
            </div>
          </div>

          {/* Scrollable Grid */}
          <ScrollArea className="flex-1">
            <div style={{ width: HOURS.length * CELL_WIDTH }}>
              {/* Time Header */}
              <div className="flex h-10 border-b border-border bg-secondary/50">
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="flex flex-shrink-0 items-center justify-center border-r border-border"
                    style={{ width: CELL_WIDTH }}
                  >
                    <span className="text-xs font-medium text-muted-foreground">
                      {hour.toString().padStart(2, "0")}:00
                    </span>
                  </div>
                ))}
              </div>

              {/* Planned Row */}
              <div className="relative h-10 border-b border-border">
                {/* Grid lines */}
                <div className="absolute inset-0 flex">
                  {HOURS.map((hour) => (
                    <div
                      key={hour}
                      className="flex-shrink-0 border-r border-border/30"
                      style={{ width: CELL_WIDTH }}
                    />
                  ))}
                </div>

                {/* Tasks */}
                {techData.planned.map((task) => {
                  const pos = getTaskPosition(
                    task.startHour,
                    task.startMinute,
                    task.durationMinutes
                  );
                  return (
                    <div
                      key={task.id}
                      className={`absolute top-1 flex h-8 cursor-grab items-center gap-1 rounded border px-2 text-xs font-medium text-white shadow-sm ${getTaskColor(task.type)}`}
                      style={{ left: pos.left, width: pos.width }}
                      title={`${task.description} (${task.durationMinutes} мин.)`}
                    >
                      <GripVertical className="h-3 w-3 flex-shrink-0 opacity-60" />
                      <span className="truncate">{task.orderId}</span>
                    </div>
                  );
                })}
              </div>

              {/* Actual Row */}
              <div className="relative h-10">
                {/* Grid lines */}
                <div className="absolute inset-0 flex">
                  {HOURS.map((hour) => (
                    <div
                      key={hour}
                      className="flex-shrink-0 border-r border-border/30"
                      style={{ width: CELL_WIDTH }}
                    />
                  ))}
                </div>

                {/* Actual times */}
                {techData.actual.map((actual) => {
                  const pos = getTaskPosition(
                    actual.startHour,
                    actual.startMinute,
                    actual.durationMinutes
                  );
                  return (
                    <div
                      key={actual.id}
                      className="absolute top-1 flex h-8 items-center rounded bg-red-900/80 px-2 text-xs font-medium text-red-200"
                      style={{ left: pos.left, width: pos.width }}
                      title={`Отчетено: ${actual.durationMinutes} мин.`}
                    >
                      <Clock className="mr-1 h-3 w-3" />
                      <span className="truncate">{actual.orderId}</span>
                    </div>
                  );
                })}

                {/* Current Time Line */}
                {currentTimeOffset !== null && (
                  <div
                    className="pointer-events-none absolute -top-10 z-30 h-20 w-0.5 bg-red-500"
                    style={{ left: currentTimeOffset }}
                  >
                    <div className="absolute -left-2 top-0 rounded bg-red-500 px-1 py-0.5 text-[10px] font-bold text-white">
                      {currentHour.toString().padStart(2, "0")}:
                      {currentMinute.toString().padStart(2, "0")}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      </div>

      {/* Task Details */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">
          Детайли по задачи
        </h3>
        <div className="space-y-2">
          {techData.planned.map((task) => {
            const actual = techData.actual.find(
              (a) => a.orderId === task.orderId
            );
            const variance = actual
              ? task.durationMinutes - actual.durationMinutes
              : null;

            return (
              <div
                key={task.id}
                className="flex items-center justify-between rounded-md border border-border bg-secondary/30 px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <Badge
                    className={`${getTaskColor(task.type)} border-0 text-white`}
                  >
                    {task.orderId}
                  </Badge>
                  <span className="text-sm text-foreground">
                    {task.description}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div>
                    <span className="text-muted-foreground">План: </span>
                    <span className="text-foreground">
                      {task.durationMinutes} мин.
                    </span>
                  </div>
                  {actual && (
                    <>
                      <div>
                        <span className="text-muted-foreground">Факт: </span>
                        <span className="text-red-400">
                          {actual.durationMinutes} мин.
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Разлика: </span>
                        <span
                          className={
                            variance && variance > 0
                              ? "text-green-400"
                              : "text-red-400"
                          }
                        >
                          {variance && variance > 0 ? "+" : ""}
                          {variance} мин.
                        </span>
                      </div>
                    </>
                  )}
                  {!actual && (
                    <span className="text-muted-foreground">В изпълнение</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Unassigned Orders */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-muted text-xs">
            {unassignedOrders.length}
          </span>
          Неразпределени поръчки
        </h3>
        <div className="flex flex-wrap gap-2">
          {unassignedOrders.map((order) => (
            <div
              key={order.id}
              className={`flex cursor-grab items-center gap-2 rounded-md border px-3 py-2 shadow-sm transition-colors hover:bg-secondary/50 ${getTaskColor(order.type)} bg-opacity-20`}
              draggable
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
              <Badge variant="outline" className="text-xs">
                {order.orderId}
              </Badge>
              <span className="text-sm text-foreground">{order.description}</span>
              <span className="text-xs text-muted-foreground">
                ({order.estimatedHours}ч)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
