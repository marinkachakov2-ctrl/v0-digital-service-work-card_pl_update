"use client";

import React from "react"

import { useState, useRef, useCallback, useEffect } from "react";
import {
  GripVertical,
  Plus,
  X,
  ChevronRight,
  ChevronLeft,
  Clock,
  HelpCircle,
} from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// Types
interface ScheduledTask {
  id: string;
  orderId: string;
  technicianId: string;
  type: "service" | "repair" | "inspection" | "custom";
  startHour: number;
  startMinute: number;
  durationMinutes: number;
  description: string;
  color?: string;
}

interface UnassignedOrder {
  id: string;
  orderId: string;
  description: string;
  estimatedHours: number;
  type: "service" | "repair" | "inspection";
}

interface Technician {
  id: string;
  name: string;
  shiftStart: number;
  shiftEnd: number;
}

interface DragDropSchedulerProps {
  selectedDate: Date;
}

// Constants
const START_HOUR = 7;
const END_HOUR = 19;
const HOURS = Array.from(
  { length: END_HOUR - START_HOUR },
  (_, i) => START_HOUR + i
);
const CELL_WIDTH = 100;
const ROW_HEIGHT = 56;
const SIDEBAR_WIDTH = 160;
const SNAP_MINUTES = 15;

// Sample data
const technicians: Technician[] = [
  { id: "tech-1", name: "Иван Петров", shiftStart: 8, shiftEnd: 17 },
  { id: "tech-2", name: "Георги Иванов", shiftStart: 8, shiftEnd: 17 },
  { id: "tech-3", name: "Петър Стоянов", shiftStart: 7, shiftEnd: 16 },
  { id: "tech-4", name: "Стефан Георгиев", shiftStart: 8, shiftEnd: 17 },
];

const initialTasks: ScheduledTask[] = [
  {
    id: "t1",
    orderId: "#12345",
    technicianId: "tech-1",
    type: "service",
    startHour: 8,
    startMinute: 0,
    durationMinutes: 120,
    description: "Смяна на масло",
  },
  {
    id: "t2",
    orderId: "#12346",
    technicianId: "tech-1",
    type: "repair",
    startHour: 13,
    startMinute: 0,
    durationMinutes: 180,
    description: "Ремонт на двигател",
  },
  {
    id: "t3",
    orderId: "#12347",
    technicianId: "tech-2",
    type: "inspection",
    startHour: 9,
    startMinute: 30,
    durationMinutes: 90,
    description: "Годишен преглед",
  },
  {
    id: "t4",
    orderId: "#12348",
    technicianId: "tech-3",
    type: "service",
    startHour: 7,
    startMinute: 0,
    durationMinutes: 240,
    description: "Ремонт на хидравлика",
  },
  {
    id: "t5",
    orderId: "#12349",
    technicianId: "tech-4",
    type: "repair",
    startHour: 10,
    startMinute: 0,
    durationMinutes: 150,
    description: "Ремонт на трансмисия",
  },
];

const initialUnassigned: UnassignedOrder[] = [
  {
    id: "u1",
    orderId: "#999",
    description: "Смяна на масло - John Deere",
    estimatedHours: 2,
    type: "service",
  },
  {
    id: "u2",
    orderId: "#1001",
    description: "Диагностика - Claas",
    estimatedHours: 1,
    type: "inspection",
  },
  {
    id: "u3",
    orderId: "#1002",
    description: "Ремонт на спирачки - Fendt",
    estimatedHours: 3,
    type: "repair",
  },
  {
    id: "u4",
    orderId: "#1003",
    description: "Смяна на филтри - New Holland",
    estimatedHours: 1.5,
    type: "service",
  },
];

// Color utilities
const taskColors: Record<string, { bg: string; border: string; text: string }> =
  {
    service: {
      bg: "bg-blue-600",
      border: "border-blue-400",
      text: "text-white",
    },
    repair: {
      bg: "bg-green-600",
      border: "border-green-400",
      text: "text-white",
    },
    inspection: {
      bg: "bg-amber-500",
      border: "border-amber-400",
      text: "text-amber-950",
    },
    custom: {
      bg: "bg-purple-600",
      border: "border-purple-400",
      text: "text-white",
    },
  };

const customColorOptions = [
  { name: "Син", value: "#2563eb" },
  { name: "Зелен", value: "#16a34a" },
  { name: "Оранжев", value: "#ea580c" },
  { name: "Лилав", value: "#9333ea" },
  { name: "Розов", value: "#db2777" },
  { name: "Тюркоаз", value: "#0891b2" },
];

function getTaskStyle(task: ScheduledTask) {
  if (task.type === "custom" && task.color) {
    return {
      backgroundColor: task.color,
      borderColor: task.color,
    };
  }
  return {};
}

function getTaskClasses(task: ScheduledTask) {
  const colors = taskColors[task.type];
  if (task.type === "custom" && task.color) {
    return "border text-white";
  }
  return `${colors.bg} ${colors.border} ${colors.text}`;
}

function snapToGrid(minutes: number): number {
  return Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES;
}

function getPosition(
  startHour: number,
  startMinute: number,
  durationMinutes: number
) {
  const startOffset =
    (startHour - START_HOUR) * CELL_WIDTH + (startMinute / 60) * CELL_WIDTH;
  const width = (durationMinutes / 60) * CELL_WIDTH;
  return { left: startOffset, width: Math.max(width, 30) };
}

export function DragDropScheduler({ selectedDate }: DragDropSchedulerProps) {
  const [tasks, setTasks] = useState<ScheduledTask[]>(initialTasks);
  const [unassigned, setUnassigned] =
    useState<UnassignedOrder[]>(initialUnassigned);
  const [draggingTask, setDraggingTask] = useState<string | null>(null);
  const [draggingUnassigned, setDraggingUnassigned] = useState<string | null>(
    null
  );
  const [resizingTask, setResizingTask] = useState<{
    id: string;
    edge: "left" | "right";
  } | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    techId: string;
    hour: number;
    minute: number;
  } | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [quickCreateModal, setQuickCreateModal] = useState<{
    techId: string;
    hour: number;
    minute: number;
  } | null>(null);
  const [quickCreateDesc, setQuickCreateDesc] = useState("");
  const [quickCreateColor, setQuickCreateColor] = useState(
    customColorOptions[0].value
  );
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showHelpModal, setShowHelpModal] = useState(false);

  const gridRef = useRef<HTMLDivElement>(null);
  const resizeStartRef = useRef<{
    startX: number;
    startWidth: number;
    startLeft: number;
    startMinute: number;
  } | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
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

  // Drag handlers for tasks
  const handleTaskDragStart = useCallback(
    (e: React.DragEvent, taskId: string) => {
      setDraggingTask(taskId);
      e.dataTransfer.setData("taskId", taskId);
      e.dataTransfer.effectAllowed = "move";
    },
    []
  );

  const handleUnassignedDragStart = useCallback(
    (e: React.DragEvent, orderId: string) => {
      setDraggingUnassigned(orderId);
      e.dataTransfer.setData("unassignedId", orderId);
      e.dataTransfer.effectAllowed = "copy";
    },
    []
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, techId: string) => {
      e.preventDefault();
      e.dataTransfer.dropEffect =
        draggingTask || draggingUnassigned ? "move" : "none";

      if (gridRef.current) {
        const rect = gridRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left - SIDEBAR_WIDTH;
        const totalMinutes = (x / CELL_WIDTH) * 60 + START_HOUR * 60;
        const snappedMinutes = snapToGrid(totalMinutes);
        const hour = Math.floor(snappedMinutes / 60);
        const minute = snappedMinutes % 60;

        if (hour >= START_HOUR && hour < END_HOUR) {
          setDropTarget({ techId, hour, minute });
        }
      }
    },
    [draggingTask, draggingUnassigned]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent, techId: string) => {
      e.preventDefault();

      const taskId = e.dataTransfer.getData("taskId");
      const unassignedId = e.dataTransfer.getData("unassignedId");

      if (dropTarget) {
        if (taskId) {
          // Move existing task
          setTasks((prev) =>
            prev.map((t) =>
              t.id === taskId
                ? {
                    ...t,
                    technicianId: techId,
                    startHour: dropTarget.hour,
                    startMinute: dropTarget.minute,
                  }
                : t
            )
          );
        } else if (unassignedId) {
          // Create new task from unassigned
          const order = unassigned.find((u) => u.id === unassignedId);
          if (order) {
            const newTask: ScheduledTask = {
              id: `task-${Date.now()}`,
              orderId: order.orderId,
              technicianId: techId,
              type: order.type,
              startHour: dropTarget.hour,
              startMinute: dropTarget.minute,
              durationMinutes: order.estimatedHours * 60,
              description: order.description,
            };
            setTasks((prev) => [...prev, newTask]);
            // Keep in unassigned for multi-technician assignment
          }
        }
      }

      setDraggingTask(null);
      setDraggingUnassigned(null);
      setDropTarget(null);
    },
    [dropTarget, unassigned]
  );

  const handleDragEnd = useCallback(() => {
    setDraggingTask(null);
    setDraggingUnassigned(null);
    setDropTarget(null);
  }, []);

  // Resize handlers
  const handleResizeStart = useCallback(
    (e: React.MouseEvent, taskId: string, edge: "left" | "right") => {
      e.preventDefault();
      e.stopPropagation();

      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      const pos = getPosition(
        task.startHour,
        task.startMinute,
        task.durationMinutes
      );

      resizeStartRef.current = {
        startX: e.clientX,
        startWidth: pos.width,
        startLeft: pos.left,
        startMinute: task.startHour * 60 + task.startMinute,
      };

      setResizingTask({ id: taskId, edge });
    },
    [tasks]
  );

  useEffect(() => {
    if (!resizingTask) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeStartRef.current) return;

      const delta = e.clientX - resizeStartRef.current.startX;
      const deltaMinutes = (delta / CELL_WIDTH) * 60;

      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== resizingTask.id) return t;

          if (resizingTask.edge === "right") {
            const newDuration = snapToGrid(
              t.durationMinutes + deltaMinutes - (t.durationMinutes % 15)
            );
            return {
              ...t,
              durationMinutes: Math.max(newDuration, 15),
            };
          } else {
            const newStartMinutes = snapToGrid(
              resizeStartRef.current!.startMinute + deltaMinutes
            );
            const oldStartMinutes = t.startHour * 60 + t.startMinute;
            const diff = newStartMinutes - oldStartMinutes;

            return {
              ...t,
              startHour: Math.floor(newStartMinutes / 60),
              startMinute: newStartMinutes % 60,
              durationMinutes: Math.max(t.durationMinutes - diff, 15),
            };
          }
        })
      );
    };

    const handleMouseUp = () => {
      setResizingTask(null);
      resizeStartRef.current = null;
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [resizingTask]);

  // Double-click for quick create
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent, techId: string) => {
      if (gridRef.current) {
        const rect = gridRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left - SIDEBAR_WIDTH;
        const totalMinutes = (x / CELL_WIDTH) * 60 + START_HOUR * 60;
        const snappedMinutes = snapToGrid(totalMinutes);
        const hour = Math.floor(snappedMinutes / 60);
        const minute = snappedMinutes % 60;

        if (hour >= START_HOUR && hour < END_HOUR) {
          setQuickCreateModal({ techId, hour, minute });
          setQuickCreateDesc("");
          setQuickCreateColor(customColorOptions[0].value);
        }
      }
    },
    []
  );

  const handleQuickCreate = useCallback(() => {
    if (!quickCreateModal || !quickCreateDesc.trim()) return;

    const newTask: ScheduledTask = {
      id: `custom-${Date.now()}`,
      orderId: "Без №",
      technicianId: quickCreateModal.techId,
      type: "custom",
      startHour: quickCreateModal.hour,
      startMinute: quickCreateModal.minute,
      durationMinutes: 60,
      description: quickCreateDesc,
      color: quickCreateColor,
    };

    setTasks((prev) => [...prev, newTask]);
    setQuickCreateModal(null);
  }, [quickCreateModal, quickCreateDesc, quickCreateColor]);

  const handleDeleteTask = useCallback((taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }, []);

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Планиране на задачи
          </h2>
          <p className="text-sm capitalize text-muted-foreground">
            {dateString}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHelpModal(true)}
            className="gap-1.5 bg-transparent"
          >
            <HelpCircle className="h-4 w-4" />
            Помощ
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSidebar(!showSidebar)}
            className="gap-1.5 bg-transparent"
          >
            {showSidebar ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
            Чакащи поръчки
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-6 rounded bg-blue-600" />
          <span className="text-muted-foreground">Сервиз</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-6 rounded bg-green-600" />
          <span className="text-muted-foreground">Ремонт</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-6 rounded bg-amber-500" />
          <span className="text-muted-foreground">Инспекция</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-6 rounded bg-purple-600" />
          <span className="text-muted-foreground">Резервация</span>
        </div>
        <div className="ml-auto text-muted-foreground">
          Двоен клик за бърза резервация
        </div>
      </div>

      {/* Main Container */}
      <div className="flex flex-1 gap-4">
        {/* Scheduler Grid */}
        <div
          ref={gridRef}
          className="flex-1 overflow-hidden rounded-lg border border-border bg-card"
        >
          <div className="flex h-full">
            {/* Sidebar - Technicians */}
            <div
              className="flex-shrink-0 border-r border-border"
              style={{ width: SIDEBAR_WIDTH }}
            >
              <div className="flex h-10 items-center border-b border-border bg-secondary/50 px-3">
                <span className="text-xs font-medium text-muted-foreground">
                  Техник
                </span>
              </div>
              {technicians.map((tech) => (
                <div
                  key={tech.id}
                  className="flex items-center border-b border-border px-3"
                  style={{ height: ROW_HEIGHT }}
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {tech.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {tech.shiftStart}:00 - {tech.shiftEnd}:00
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Scrollable Grid */}
            <ScrollArea className="flex-1">
              <div
                style={{ width: HOURS.length * CELL_WIDTH, minHeight: "100%" }}
              >
                {/* Time Header */}
                <div className="sticky top-0 z-20 flex h-10 border-b border-border bg-secondary/50">
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

                {/* Technician Rows */}
                {technicians.map((tech) => {
                  const techTasks = tasks.filter(
                    (t) => t.technicianId === tech.id
                  );
                  const isDropTarget = dropTarget?.techId === tech.id;

                  return (
                    <div
                      key={tech.id}
                      className={cn(
                        "relative border-b border-border transition-colors",
                        isDropTarget && "bg-primary/10"
                      )}
                      style={{ height: ROW_HEIGHT }}
                      onDragOver={(e) => handleDragOver(e, tech.id)}
                      onDrop={(e) => handleDrop(e, tech.id)}
                      onDragLeave={() => setDropTarget(null)}
                      onDoubleClick={(e) => handleDoubleClick(e, tech.id)}
                    >
                      {/* Grid lines */}
                      <div className="absolute inset-0 flex pointer-events-none">
                        {HOURS.map((hour) => (
                          <div
                            key={hour}
                            className="flex-shrink-0 border-r border-border/30"
                            style={{ width: CELL_WIDTH }}
                          >
                            <div
                              className="h-full w-1/2 border-r border-border/15"
                              style={{ width: CELL_WIDTH / 2 }}
                            />
                          </div>
                        ))}
                      </div>

                      {/* Shift indicator */}
                      <div
                        className="absolute top-0 bottom-0 bg-secondary/30 pointer-events-none"
                        style={{
                          left: (tech.shiftStart - START_HOUR) * CELL_WIDTH,
                          width:
                            (tech.shiftEnd - tech.shiftStart) * CELL_WIDTH,
                        }}
                      />

                      {/* Drop preview */}
                      {isDropTarget && dropTarget && (
                        <div
                          className="absolute top-1 bottom-1 rounded border-2 border-dashed border-primary bg-primary/20 pointer-events-none"
                          style={{
                            left: getPosition(
                              dropTarget.hour,
                              dropTarget.minute,
                              60
                            ).left,
                            width: 60,
                          }}
                        />
                      )}

                      {/* Tasks */}
                      {techTasks.map((task) => {
                        const pos = getPosition(
                          task.startHour,
                          task.startMinute,
                          task.durationMinutes
                        );
                        const isDragging = draggingTask === task.id;
                        const isResizing = resizingTask?.id === task.id;

                        return (
                          <div
                            key={task.id}
                            className={cn(
                              "group absolute top-1 bottom-1 flex items-center rounded border shadow-sm transition-all select-none",
                              getTaskClasses(task),
                              isDragging && "opacity-50",
                              isResizing && "ring-2 ring-primary"
                            )}
                            style={{
                              left: pos.left,
                              width: pos.width,
                              cursor: isDragging ? "grabbing" : "grab",
                              ...getTaskStyle(task),
                            }}
                            draggable={!isResizing}
                            onDragStart={(e) => handleTaskDragStart(e, task.id)}
                            onDragEnd={handleDragEnd}
                          >
                            {/* Left resize handle */}
                            <div
                              className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize opacity-0 group-hover:opacity-100 hover:bg-black/20"
                              onMouseDown={(e) =>
                                handleResizeStart(e, task.id, "left")
                              }
                            />

                            {/* Content */}
                            <div className="flex flex-1 items-center gap-1 overflow-hidden px-2">
                              <GripVertical className="h-3 w-3 flex-shrink-0 opacity-50" />
                              <span className="truncate text-xs font-medium">
                                {task.orderId}
                              </span>
                              {pos.width > 100 && (
                                <span className="truncate text-xs opacity-75">
                                  - {task.description}
                                </span>
                              )}
                            </div>

                            {/* Delete button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTask(task.id);
                              }}
                              className="absolute -top-1 -right-1 hidden h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground group-hover:flex"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>

                            {/* Right resize handle */}
                            <div
                              className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize opacity-0 group-hover:opacity-100 hover:bg-black/20"
                              onMouseDown={(e) =>
                                handleResizeStart(e, task.id, "right")
                              }
                            />
                          </div>
                        );
                      })}

                      {/* Current time line */}
                      {currentTimeOffset !== null && (
                        <div
                          className="absolute top-0 bottom-0 z-10 w-0.5 bg-red-500 pointer-events-none"
                          style={{ left: currentTimeOffset }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        </div>

        {/* Unassigned Orders Sidebar */}
        {showSidebar && (
          <div className="w-72 flex-shrink-0 rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border bg-secondary/50 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                  Чакащи поръчки
                </span>
                <Badge variant="secondary" className="text-xs">
                  {unassigned.length}
                </Badge>
              </div>
            </div>
            <ScrollArea className="h-[calc(100%-52px)]">
              <div className="space-y-2 p-3">
                {unassigned.map((order) => {
                  const colors = taskColors[order.type];
                  const isDragging = draggingUnassigned === order.id;

                  return (
                    <div
                      key={order.id}
                      className={cn(
                        "rounded-lg border p-3 transition-all",
                        colors.border,
                        isDragging
                          ? "opacity-50 scale-95"
                          : "cursor-grab hover:shadow-md"
                      )}
                      draggable
                      onDragStart={(e) => handleUnassignedDragStart(e, order.id)}
                      onDragEnd={handleDragEnd}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                          <Badge
                            className={cn(
                              colors.bg,
                              colors.text,
                              "text-xs border-0"
                            )}
                          >
                            {order.orderId}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {order.estimatedHours}ч
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-foreground">
                        {order.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

      {/* Quick Create Modal */}
      <Dialog
        open={!!quickCreateModal}
        onOpenChange={() => setQuickCreateModal(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Бърза резервация</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="description">Описание</Label>
              <Input
                id="description"
                placeholder="Напр. Ремонт трактор на Иван - чакаме данни..."
                value={quickCreateDesc}
                onChange={(e) => setQuickCreateDesc(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Цвят</Label>
              <div className="flex flex-wrap gap-2">
                {customColorOptions.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className={cn(
                      "h-8 w-8 rounded-full border-2 transition-all",
                      quickCreateColor === color.value
                        ? "border-foreground scale-110"
                        : "border-transparent"
                    )}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setQuickCreateColor(color.value)}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
            {quickCreateModal && (
              <div className="text-sm text-muted-foreground">
                Техник:{" "}
                {technicians.find((t) => t.id === quickCreateModal.techId)?.name}
                <br />
                Начало: {quickCreateModal.hour}:
                {quickCreateModal.minute.toString().padStart(2, "0")}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="bg-transparent"
              onClick={() => setQuickCreateModal(null)}
            >
              Отказ
            </Button>
            <Button onClick={handleQuickCreate} disabled={!quickCreateDesc.trim()}>
              <Plus className="mr-1.5 h-4 w-4" />
              Създай
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Help Modal */}
      <Dialog open={showHelpModal} onOpenChange={setShowHelpModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              Ръководство за планиране
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-semibold text-foreground">Основни функции:</h4>
              <ul className="list-inside list-disc space-y-1.5 text-muted-foreground">
                <li>
                  <span className="text-foreground">Преглед на задачи</span> - 
                  Всички планирани задачи се показват като цветни блокове в мрежата
                </li>
                <li>
                  <span className="text-foreground">Преместване на задачи</span> - 
                  Хванете и плъзнете задача към друг техник или друг час
                </li>
                <li>
                  <span className="text-foreground">Промяна на времетраене</span> - 
                  Задръжте курсора върху края на задача и плъзнете за да промените продължителността
                </li>
                <li>
                  <span className="text-foreground">Бърза резервация</span> - 
                  Двоен клик върху празна клетка създава нова резервация
                </li>
                <li>
                  <span className="text-foreground">Изтриване</span> - 
                  Натиснете бутона X в горния ъгъл на задачата
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-foreground">Цветове на задачите:</h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-8 rounded bg-blue-600" />
                  <span className="text-muted-foreground">Сервиз</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-8 rounded bg-green-600" />
                  <span className="text-muted-foreground">Ремонт</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-8 rounded bg-amber-500" />
                  <span className="text-muted-foreground">Инспекция</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-8 rounded bg-purple-600" />
                  <span className="text-muted-foreground">Резервация</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-foreground">Панел с чакащи поръчки:</h4>
              <p className="text-muted-foreground">
                Отворете панела вдясно за да видите неразпределени поръчки. 
                Плъзнете поръчка върху техник за да я планирате.
              </p>
            </div>

            <div className="rounded-md bg-secondary/50 p-3">
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">Съвет:</strong> Червената вертикална линия показва текущото време. 
                Сивите зони са извън работното време на техника.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowHelpModal(false)}>
              Разбрах
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
