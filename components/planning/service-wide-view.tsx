"use client";

import { useState, useCallback, useMemo } from "react";
import {
  Clock,
  User,
  GripVertical,
  Plus,
  Users,
  AlertCircle,
  Play,
  CheckCircle2,
  X,
  ChevronDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface ServiceTask {
  id: string;
  orderId: string;
  orderNumber: string;
  jobCardNumber: string;
  technicianId: string | null; // null = unassigned
  type: "service" | "repair" | "inspection" | "custom";
  status: "pending" | "active" | "completed" | "overdue";
  startHour: number;
  startMinute: number;
  durationMinutes: number;
  description: string;
  dayIndex: number; // 0=Mon ... 6=Sun
  machine?: string;
  customer?: string;
}

interface Technician {
  id: string;
  name: string;
}

interface ServiceWideViewProps {
  tasks: ServiceTask[];
  onTasksChange: (tasks: ServiceTask[]) => void;
  technicians: Technician[];
  selectedDate: Date;
}

const BG_DAYS_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];
const BG_MONTHS_SHORT = ["яну", "фев", "мар", "апр", "май", "юни", "юли", "авг", "сеп", "окт", "ное", "дек"];

// Dynamic card color logic:
// RED: Unassigned (no technician)
// YELLOW: Assigned but Pending/Not Started
// GREEN: In Progress (clocked in)
// BLUE: Completed
function getTaskColor(task: ServiceTask): {
  bg: string;
  border: string;
  text: string;
  badge: string;
  label: string;
} {
  if (!task.technicianId) {
    // RED - Unassigned
    return {
      bg: "bg-red-500/15 dark:bg-red-500/20",
      border: "border-red-500/50",
      text: "text-red-900 dark:text-red-100",
      badge: "bg-red-600 text-white",
      label: "Без техник",
    };
  }
  
  if (task.status === "active") {
    // GREEN - Clocked in / In Progress
    return {
      bg: "bg-emerald-500/15 dark:bg-emerald-500/20",
      border: "border-emerald-500/50",
      text: "text-emerald-900 dark:text-emerald-100",
      badge: "bg-emerald-600 text-white",
      label: "В процес",
    };
  }
  
  if (task.status === "completed") {
    // BLUE - Completed
    return {
      bg: "bg-blue-500/10 dark:bg-blue-500/15",
      border: "border-blue-500/40",
      text: "text-blue-900 dark:text-blue-100",
      badge: "bg-blue-600 text-white",
      label: "Завършена",
    };
  }
  
  // YELLOW - Assigned but Pending/Not Started
  return {
    bg: "bg-amber-500/15 dark:bg-amber-500/20",
    border: "border-amber-500/50",
    text: "text-amber-900 dark:text-amber-100",
    badge: "bg-amber-600 text-white",
    label: "Чака",
  };
}

function getWeekDates(referenceDate: Date): Date[] {
  const d = new Date(referenceDate);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    return date;
  });
}

function isToday(date: Date): boolean {
  const now = new Date();
  return date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
}

export function ServiceWideView({
  tasks,
  onTasksChange,
  technicians,
  selectedDate,
}: ServiceWideViewProps) {
  const weekDates = getWeekDates(selectedDate);

  // Drag state
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [dragOverDay, setDragOverDay] = useState<number | null>(null);

  // Edit dialog
  const [editingTask, setEditingTask] = useState<ServiceTask | null>(null);
  const [editTech, setEditTech] = useState<string>("");
  const [editStart, setEditStart] = useState("08:00");
  const [editDuration, setEditDuration] = useState("60");
  const [editStatus, setEditStatus] = useState<ServiceTask["status"]>("pending");

  // Filter state
  const [filterTech, setFilterTech] = useState<string>("all");

  // Get tasks for a specific day
  const tasksByDay = useCallback((dayIndex: number) => {
    let filtered = tasks.filter(t => t.dayIndex === dayIndex);
    if (filterTech !== "all") {
      if (filterTech === "unassigned") {
        filtered = filtered.filter(t => !t.technicianId);
      } else {
        filtered = filtered.filter(t => t.technicianId === filterTech);
      }
    }
    return filtered.sort((a, b) => {
      // Sort by: unassigned first, then by start time
      if (!a.technicianId && b.technicianId) return -1;
      if (a.technicianId && !b.technicianId) return 1;
      return a.startHour * 60 + a.startMinute - (b.startHour * 60 + b.startMinute);
    });
  }, [tasks, filterTech]);

  // Stats
  const stats = useMemo(() => {
    const unassigned = tasks.filter(t => !t.technicianId).length;
    const pending = tasks.filter(t => t.technicianId && (t.status === "pending" || t.status === "overdue")).length;
    const active = tasks.filter(t => t.status === "active").length;
    const completed = tasks.filter(t => t.status === "completed").length;
    return { unassigned, pending, active, completed, total: tasks.length };
  }, [tasks]);

  // Drag handlers
  const handleDragStart = useCallback((taskId: string) => {
    setDragTaskId(taskId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, dayIndex: number) => {
    e.preventDefault();
    setDragOverDay(dayIndex);
  }, []);

  const handleDrop = useCallback((dayIndex: number) => {
    if (dragTaskId) {
      onTasksChange(tasks.map(t =>
        t.id === dragTaskId ? { ...t, dayIndex } : t
      ));
    }
    setDragTaskId(null);
    setDragOverDay(null);
  }, [dragTaskId, tasks, onTasksChange]);

  const handleDragEnd = useCallback(() => {
    setDragTaskId(null);
    setDragOverDay(null);
  }, []);

  // Quick assign technician
  const assignTechnician = useCallback((taskId: string, techId: string) => {
    onTasksChange(tasks.map(t =>
      t.id === taskId ? { ...t, technicianId: techId } : t
    ));
  }, [tasks, onTasksChange]);

  // Edit task
  const openEdit = useCallback((task: ServiceTask) => {
    setEditingTask(task);
    setEditTech(task.technicianId || "");
    const h = String(task.startHour).padStart(2, "0");
    const m = String(task.startMinute).padStart(2, "0");
    setEditStart(`${h}:${m}`);
    setEditDuration(String(task.durationMinutes));
    setEditStatus(task.status);
  }, []);

  const saveEdit = useCallback(() => {
    if (!editingTask) return;
    const [h, m] = editStart.split(":").map(Number);
    onTasksChange(tasks.map(t =>
      t.id === editingTask.id
        ? {
            ...t,
            technicianId: editTech || null,
            startHour: h || 8,
            startMinute: m || 0,
            durationMinutes: Number(editDuration) || 60,
            status: editStatus,
          }
        : t
    ));
    setEditingTask(null);
  }, [editingTask, editTech, editStart, editDuration, editStatus, tasks, onTasksChange]);

  const deleteTask = useCallback((id: string) => {
    onTasksChange(tasks.filter(t => t.id !== id));
  }, [tasks, onTasksChange]);

  const getTechName = (techId: string | null) => {
    if (!techId) return "Без техник";
    return technicians.find(t => t.id === techId)?.name || techId;
  };

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Header with stats and filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Stats */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-red-500" />
            <span className="text-muted-foreground">Без техник:</span>
            <span className="font-semibold text-foreground">{stats.unassigned}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-amber-500" />
            <span className="text-muted-foreground">Чакащи:</span>
            <span className="font-semibold text-foreground">{stats.pending}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-emerald-500" />
            <span className="text-muted-foreground">В процес:</span>
            <span className="font-semibold text-foreground">{stats.active}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-blue-500" />
            <span className="text-muted-foreground">Завършени:</span>
            <span className="font-semibold text-foreground">{stats.completed}</span>
          </div>
        </div>

        {/* Filter by technician */}
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Филтър:</Label>
          <Select value={filterTech} onValueChange={setFilterTech}>
            <SelectTrigger className="h-8 w-[160px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Всички техници</SelectItem>
              <SelectItem value="unassigned">Без техник</SelectItem>
              {technicians.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Week columns */}
      <div className="grid flex-1 grid-cols-7 gap-2 overflow-auto">
        {weekDates.map((date, dayIndex) => {
          const dayTasks = tasksByDay(dayIndex);
          const today = isToday(date);
          const isWeekend = dayIndex >= 5;

          return (
            <div
              key={dayIndex}
              className={cn(
                "flex flex-col rounded-lg border border-border bg-card/50",
                today && "ring-2 ring-primary ring-offset-1 ring-offset-background",
                isWeekend && "opacity-70",
                dragOverDay === dayIndex && "bg-primary/5 border-primary",
              )}
              onDragOver={(e) => handleDragOver(e, dayIndex)}
              onDrop={() => handleDrop(dayIndex)}
            >
              {/* Day header */}
              <div className={cn(
                "flex items-center justify-between rounded-t-lg border-b border-border px-3 py-2",
                today ? "bg-primary/10" : "bg-secondary/30",
              )}>
                <div>
                  <p className={cn("text-xs font-semibold", today ? "text-primary" : "text-foreground")}>
                    {BG_DAYS_SHORT[dayIndex]}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {date.getDate()} {BG_MONTHS_SHORT[date.getMonth()]}
                  </p>
                </div>
                <Badge variant="secondary" className="text-[9px] h-5">
                  {dayTasks.length}
                </Badge>
              </div>

              {/* Task cards */}
              <div className="flex-1 space-y-2 overflow-y-auto p-2" style={{ minHeight: 200 }}>
                {dayTasks.map(task => {
                  const colors = getTaskColor(task);
                  const isDragging = dragTaskId === task.id;
                  const isUnassigned = !task.technicianId;

                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() => handleDragStart(task.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => openEdit(task)}
                      className={cn(
                        "group cursor-pointer rounded-lg border p-2.5 shadow-sm transition-all hover:shadow-md",
                        colors.bg,
                        colors.border,
                        isDragging && "opacity-40 scale-95",
                      )}
                    >
                      {/* Status badge + actions */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <GripVertical className="h-3 w-3 opacity-0 group-hover:opacity-60 cursor-grab" />
                          <div className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold", colors.badge)}>
                            {isUnassigned ? (
                              <AlertCircle className="h-2.5 w-2.5" />
                            ) : task.status === "active" ? (
                              <Play className="h-2.5 w-2.5" />
                            ) : task.status === "completed" ? (
                              <CheckCircle2 className="h-2.5 w-2.5" />
                            ) : (
                              <Clock className="h-2.5 w-2.5" />
                            )}
                            {colors.label}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
                          className="opacity-0 group-hover:opacity-100 hover:text-destructive transition-all"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Order info */}
                      <div className="mt-1.5">
                        <p className={cn("text-[10px] font-bold leading-tight", colors.text)}>
                          {task.orderNumber} / {task.jobCardNumber}
                        </p>
                        <p className={cn("text-[10px] truncate mt-0.5 opacity-80", colors.text)}>
                          {task.description}
                        </p>
                        {task.machine && (
                          <p className={cn("text-[9px] mt-0.5 opacity-70", colors.text)}>
                            {task.machine}
                          </p>
                        )}
                      </div>

                      {/* Technician assignment (with quick-assign for unassigned) */}
                      <div className="mt-2 flex items-center justify-between text-[9px]">
                        {isUnassigned ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1 rounded bg-red-600 px-2 py-1 text-white hover:bg-red-700 transition-colors"
                              >
                                <User className="h-3 w-3" />
                                Добави техник
                                <ChevronDown className="h-2.5 w-2.5" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-40">
                              {technicians.map(tech => (
                                <DropdownMenuItem
                                  key={tech.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    assignTechnician(task.id, tech.id);
                                  }}
                                >
                                  {tech.name}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <span className={cn("flex items-center gap-0.5 opacity-80", colors.text)}>
                            <User className="h-2.5 w-2.5" />
                            {getTechName(task.technicianId)}
                          </span>
                        )}
                        <span className={cn("flex items-center gap-0.5 opacity-70", colors.text)}>
                          <Clock className="h-2.5 w-2.5" />
                          {String(task.startHour).padStart(2, "0")}:{String(task.startMinute).padStart(2, "0")}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* Empty state */}
                {dayTasks.length === 0 && (
                  <p className="py-8 text-center text-[10px] text-muted-foreground">
                    Няма задачи
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Task Dialog */}
      <Dialog open={!!editingTask} onOpenChange={() => setEditingTask(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">
              Редактирай {editingTask?.orderNumber} / {editingTask?.jobCardNumber}
            </DialogTitle>
          </DialogHeader>
          {editingTask && (
            <div className="space-y-4 py-2">
              <p className="text-xs text-muted-foreground">{editingTask.description}</p>

              <div className="space-y-2">
                <Label className="text-xs">Техник</Label>
                <Select value={editTech} onValueChange={setEditTech}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Избери техник..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Без техник</SelectItem>
                    {technicians.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Статус</Label>
                <Select value={editStatus} onValueChange={(v) => setEditStatus(v as ServiceTask["status"])}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Чака</SelectItem>
                    <SelectItem value="active">В процес</SelectItem>
                    <SelectItem value="completed">Завършена</SelectItem>
                    <SelectItem value="overdue">Просрочена</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Начален час</Label>
                  <Input
                    type="time"
                    value={editStart}
                    onChange={e => setEditStart(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Времетраене (мин)</Label>
                  <Input
                    type="number"
                    value={editDuration}
                    onChange={e => setEditDuration(e.target.value)}
                    min="15"
                    step="15"
                    className="h-9"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setEditingTask(null)}>Отказ</Button>
            <Button onClick={saveEdit}>Запази</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
