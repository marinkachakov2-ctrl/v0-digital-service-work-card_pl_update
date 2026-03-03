"use client";

import React, { useState, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { 
  useAppointments, 
  formatDateStr, 
  getCardStatus, 
  getStatusColor,
  type ServiceAppointment,
  type Technician 
} from "@/lib/hooks/use-appointments";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  FileText,
  Clock,
  User,
  UserPlus,
  ChevronDown,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const DAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];

// Status badge colors matching the design
const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  no_tech: { label: "Без техник", className: "bg-red-500 text-white" },
  waiting: { label: "Чака", className: "bg-amber-400 text-amber-900" },
  in_progress: { label: "В процес", className: "bg-green-500 text-white" },
  completed: { label: "Завършена", className: "bg-blue-500 text-white" },
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────
function getWeekDates(baseDate: Date): Date[] {
  const dates: Date[] = [];
  const start = new Date(baseDate);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);

  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function formatDateDisplay(date: Date): string {
  return date.toLocaleDateString("bg-BG", { day: "2-digit", month: "short" });
}

function getDayLabel(date: Date, index: number): { short: string; full: string } {
  return {
    short: DAY_LABELS[index],
    full: date.toLocaleDateString("bg-BG", { day: "numeric", month: "long" }),
  };
}
  return dates;
}

function formatDateStr(date: Date): string {
  return date.toISOString().split("T")[0];
}

function formatDateDisplay(date: Date): string {
  return date.toLocaleDateString("bg-BG", { day: "2-digit", month: "short" });
}

function getCardStatus(appointment: ServiceAppointment): string {
  if (!appointment.technician_name) return "no_tech";
  const status = appointment.status?.toLowerCase() || "";
  if (status === "completed" || status === "done") return "completed";
  if (status === "in_progress" || status === "active") return "in_progress";
  return "waiting";
}

function formatTime(timeStr: string | null): string {
  if (!timeStr) return "";
  const [hours, minutes] = timeStr.split(":");
  return `${hours}:${minutes}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// DRAGGABLE CARD COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
function KanbanCard({
  appointment,
  technicians,
  onAssignTechnician,
  isOverlay = false,
}: {
  appointment: ServiceAppointment;
  technicians: Technician[];
  onAssignTechnician: (appointmentId: string, technicianName: string) => void;
  isOverlay?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: appointment.id,
    data: { appointment },
  });

  const isNote = appointment.task_type === "note";
  const cardStatus = getCardStatus(appointment);
  const statusBadge = STATUS_BADGES[cardStatus];

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  // Generate order IDs from the appointment id
  const orderId = `ON-${appointment.id.substring(0, 4).toUpperCase()}`;
  const jcId = `JC-${appointment.id.substring(4, 8).toUpperCase()}`;

  return (
    <div
      ref={!isOverlay ? setNodeRef : undefined}
      {...(!isOverlay ? { ...listeners, ...attributes } : {})}
      style={style}
      className={cn(
        "cursor-grab rounded-lg border bg-card p-3 shadow-sm transition-all hover:shadow-md",
        isDragging && !isOverlay && "opacity-50",
        isOverlay && "shadow-xl ring-2 ring-primary/50 rotate-1"
      )}
    >
      {/* Header with IDs and Status Badge */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className="font-mono">{orderId}</span>
          <span>/</span>
          <span className="font-mono">{jcId}</span>
        </div>
        <Badge className={cn("text-[10px] px-1.5 py-0 shrink-0", statusBadge.className)}>
          {statusBadge.label}
        </Badge>
      </div>

      {/* Title */}
      <div className="flex items-center gap-1.5 mb-1">
        {isNote && <FileText className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />}
        <p className="text-sm font-medium truncate">
          {appointment.client_name || "Без заглавие"}
        </p>
      </div>

      {/* Machine Model */}
      <p className="text-xs text-muted-foreground truncate mb-2">
        {appointment.machine_model || appointment.notes || "—"}
      </p>

      {/* Footer with Technician and Time */}
      <div className="flex items-center justify-between text-xs">
        {appointment.technician_name ? (
          <div className="flex items-center gap-1 text-muted-foreground">
            <User className="h-3 w-3" />
            <span className="truncate max-w-[100px]">{appointment.technician_name}</span>
          </div>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-[10px] gap-1 px-2"
                onPointerDown={(e) => e.stopPropagation()}
              >
                <UserPlus className="h-3 w-3" />
                Добави техник
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {technicians.map((tech) => (
                <DropdownMenuItem
                  key={tech.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAssignTechnician(appointment.id, tech.name);
                  }}
                >
                  {tech.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        
        {appointment.start_time && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{formatTime(appointment.start_time)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DROPPABLE DAY COLUMN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
function DayColumn({
  date,
  dayIndex,
  appointments,
  technicians,
  onAssignTechnician,
  isOver,
  isToday,
}: {
  date: Date;
  dayIndex: number;
  appointments: ServiceAppointment[];
  technicians: Technician[];
  onAssignTechnician: (appointmentId: string, technicianName: string, workDate?: string) => void;
  isOver: boolean;
  isToday: boolean;
}) {
  const dateStr = formatDateStr(date);
  const { setNodeRef } = useDroppable({
    id: dateStr,
    data: { date, dateStr },
  });

  // Wrap handler to include the date
  const handleAssign = (appointmentId: string, technicianName: string) => {
    onAssignTechnician(appointmentId, technicianName, dateStr);
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col rounded-lg border bg-secondary/30 min-w-[200px] flex-1",
        isOver && "ring-2 ring-primary/50 bg-primary/5",
        isToday && "border-primary/50"
      )}
    >
      {/* Column Header */}
      <div className={cn(
        "flex items-center justify-between border-b px-3 py-2.5 rounded-t-lg",
        isToday ? "bg-primary/10" : "bg-card/50"
      )}>
        <div className="flex flex-col">
          <span className={cn(
            "font-semibold text-sm",
            isToday && "text-primary"
          )}>
            {DAY_LABELS[dayIndex]}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {formatDateDisplay(date)}
          </span>
        </div>
        <Badge variant="secondary" className="text-xs">
          {appointments.length}
        </Badge>
      </div>

      {/* Cards */}
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-2">
          {appointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
              <p className="text-xs">Няма задачи</p>
            </div>
          ) : (
            appointments.map((apt) => (
              <KanbanCard
                key={apt.id}
                appointment={apt}
                technicians={technicians}
                onAssignTechnician={handleAssign}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN KANBAN BOARD COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export function KanbanBoard() {
  // Week navigation
  const [weekBaseDate, setWeekBaseDate] = useState<Date>(new Date());
  const weekDates = useMemo(() => getWeekDates(weekBaseDate).slice(0, 5), [weekBaseDate]); // Only Mon-Fri
  
  console.log("[v0] KanbanBoard weekDates:", weekDates?.length, weekDates?.[0], weekDates?.[4]);
  
  // Use shared hook for data - only create dateRange if weekDates is valid
  const dateRange = useMemo(() => {
    if (!weekDates || weekDates.length < 5) {
      console.log("[v0] KanbanBoard: weekDates not ready");
      return undefined;
    }
    return {
      start: weekDates[0],
      end: weekDates[4],
    };
  }, [weekDates]);
  
  const hookResult = useAppointments({ dateRange });
  
  console.log("[v0] KanbanBoard useAppointments result:", {
    loading: hookResult.loading,
    error: hookResult.error,
    techniciansCount: hookResult.technicians?.length,
  });
  
  const {
    assignedAppointments,
    waitingOrders,
    quickNotes,
    technicians,
    stats,
    loading,
    error,
    refetch,
    assignTechnician,
    updateAppointment,
  } = hookResult;

  const [saving, setSaving] = useState(false);
  
  // Filter state
  const [filterTechnician, setFilterTechnician] = useState<string>("all");
  
  // Drag state
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  // Today's date string
  const todayStr = formatDateStr(new Date());

  // ─────────────────────────────────────────────────────────────────────────
  // WEEK NAVIGATION
  // ─────────────────────────────────────────────────────────────────────────
  const goToPreviousWeek = () => {
    setWeekBaseDate((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() - 7);
      return newDate;
    });
  };

  const goToNextWeek = () => {
    setWeekBaseDate((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() + 7);
      return newDate;
    });
  };

  const goToCurrentWeek = () => {
    setWeekBaseDate(new Date());
  };

  // ─────────────────────────────────────────────────────────────────────────
  // DRAG HANDLERS
  // ─────────────────────────────────────────────────────────────────────────
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const overId = event.over?.id as string | undefined;
    setOverId(overId || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setOverId(null);

    if (!over) return;

    const appointmentId = active.id as string;
    const targetId = over.id as string;

    // Find appointment in any list
    const appointment = 
      assignedAppointments.find((a) => a.id === appointmentId) ||
      waitingOrders.find((a) => a.id === appointmentId) ||
      quickNotes.find((a) => a.id === appointmentId);
    
    if (!appointment) return;

    // Check if target is a day column (date string)
    if (/^\d{4}-\d{2}-\d{2}$/.test(targetId)) {
      // Moving to a day - update work_date
      if (appointment.work_date === targetId && appointment.technician_name) return;
      await updateAppointmentDate(appointmentId, targetId);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // UPDATE FUNCTIONS (using shared hook)
  // ───────────────────────────────────────────────────────────────��─────────
  const updateAppointmentDate = async (appointmentId: string, newDate: string) => {
    setSaving(true);
    const result = await updateAppointment(appointmentId, { work_date: newDate });
    if (!result.success) {
      refetch();
    }
    setSaving(false);
  };

  const handleAssignTechnician = async (appointmentId: string, technicianName: string, workDate?: string) => {
    setSaving(true);
    // Default to today's date if not specified (e.g., from dropdown in special columns)
    const targetDate = workDate || formatDateStr(new Date());
    const result = await assignTechnician(appointmentId, technicianName, targetDate);
    if (!result.success) {
      refetch();
    }
    setSaving(false);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // DERIVED DATA
  // ─────────────────────────────────────────────────────────────────────────
  const filteredAppointments = filterTechnician === "all"
    ? assignedAppointments
    : assignedAppointments.filter((a) => a.technician_name === filterTechnician);

  const appointmentsByDate = useMemo(() => {
    const grouped: Record<string, ServiceAppointment[]> = {};
    weekDates.forEach((date) => {
      const dateStr = formatDateStr(date);
      grouped[dateStr] = filteredAppointments.filter((a) => a.work_date === dateStr);
    });
    return grouped;
  }, [filteredAppointments, weekDates]);

  const activeAppointment = activeId 
    ? (assignedAppointments.find((a) => a.id === activeId) || 
       waitingOrders.find((a) => a.id === activeId) || 
       quickNotes.find((a) => a.id === activeId))
    : null;

  // Week display range (Mon-Fri)
  const weekRangeDisplay = `${formatDateDisplay(weekDates[0])} - ${formatDateDisplay(weekDates[4])}`;

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button onClick={refetch} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Опитай отново
        </Button>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="relative h-full flex flex-col gap-4">
        {/* Stats Header */}
        <div className="flex items-center justify-between gap-4 rounded-lg border bg-card p-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-red-500" />
              <span className="text-xs text-muted-foreground">Без техник</span>
              <Badge variant="secondary" className="text-xs">{stats.noTech}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-amber-400" />
              <span className="text-xs text-muted-foreground">Бележки</span>
              <Badge variant="secondary" className="text-xs">{stats.notes}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <span className="text-xs text-muted-foreground">В процес</span>
              <Badge variant="secondary" className="text-xs">{stats.inProgress}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-blue-500" />
              <span className="text-xs text-muted-foreground">Завършени</span>
              <Badge variant="secondary" className="text-xs">{stats.completed}</Badge>
            </div>
          </div>

          {/* Filter */}
          <Select value={filterTechnician} onValueChange={setFilterTechnician}>
            <SelectTrigger className="w-[200px] h-8">
              <Filter className="h-3.5 w-3.5 mr-2" />
              <SelectValue placeholder="Филтър по техник" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Всички техници</SelectItem>
              {technicians.map((tech) => (
                <SelectItem key={tech.id} value={tech.name}>
                  {tech.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Week Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={goToPreviousWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-sm font-medium min-w-[180px] text-center">
              {weekRangeDisplay}
            </div>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={goToNextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="ml-2" onClick={goToCurrentWeek}>
              Тази седмица
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={refetch} disabled={loading || saving}>
            <RefreshCw className={cn("h-4 w-4 mr-1.5", (loading || saving) && "animate-spin")} />
            Обнови
          </Button>
        </div>

        {/* Saving overlay */}
        {saving && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
            <div className="flex items-center gap-3 rounded-lg bg-card px-6 py-4 shadow-lg border">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="font-medium">Запазване...</span>
            </div>
          </div>
        )}

        {/* Columns */}
        <div className="flex-1 flex gap-3 overflow-x-auto pb-4">
          {/* Mon-Fri Day Columns */}
          {weekDates.map((date, index) => {
            const dateStr = formatDateStr(date);
            return (
              <DayColumn
                key={dateStr}
                date={date}
                dayIndex={index}
                appointments={appointmentsByDate[dateStr] || []}
                technicians={technicians}
                onAssignTechnician={handleAssignTechnician}
                isOver={overId === dateStr}
                isToday={dateStr === todayStr}
              />
            );
          })}
          
          {/* Special Column: Чакащи поръчки */}
          <div className="flex flex-col rounded-lg border bg-red-50 dark:bg-red-950/20 min-w-[200px] flex-1 border-red-200 dark:border-red-900">
            <div className="flex items-center justify-between border-b border-red-200 dark:border-red-900 px-3 py-2.5 rounded-t-lg bg-red-100 dark:bg-red-950/40">
              <div className="flex flex-col">
                <span className="font-semibold text-sm text-red-700 dark:text-red-400">Чакащи поръчки</span>
                <span className="text-[10px] text-red-600/70 dark:text-red-400/70">Без техник</span>
              </div>
              <Badge variant="secondary" className="text-xs bg-red-200 text-red-800">
                {waitingOrders.length}
              </Badge>
            </div>
            <ScrollArea className="flex-1 p-2">
              <div className="space-y-2">
                {waitingOrders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center text-red-400">
                    <p className="text-xs">Няма чакащи</p>
                  </div>
                ) : (
                  waitingOrders.map((apt) => (
                    <KanbanCard
                      key={apt.id}
                      appointment={apt}
                      technicians={technicians}
                      onAssignTechnician={handleAssignTechnician}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Special Column: Бързи бележки */}
          <div className="flex flex-col rounded-lg border bg-amber-50 dark:bg-amber-950/20 min-w-[200px] flex-1 border-amber-200 dark:border-amber-900">
            <div className="flex items-center justify-between border-b border-amber-200 dark:border-amber-900 px-3 py-2.5 rounded-t-lg bg-amber-100 dark:bg-amber-950/40">
              <div className="flex flex-col">
                <span className="font-semibold text-sm text-amber-700 dark:text-amber-400">Бързи бележки</span>
                <span className="text-[10px] text-amber-600/70 dark:text-amber-400/70">Notes</span>
              </div>
              <Badge variant="secondary" className="text-xs bg-amber-200 text-amber-800">
                {quickNotes.length}
              </Badge>
            </div>
            <ScrollArea className="flex-1 p-2">
              <div className="space-y-2">
                {quickNotes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center text-amber-400">
                    <FileText className="h-6 w-6 mb-1 opacity-50" />
                    <p className="text-xs">Няма бележки</p>
                  </div>
                ) : (
                  quickNotes.map((apt) => (
                    <KanbanCard
                      key={apt.id}
                      appointment={apt}
                      technicians={technicians}
                      onAssignTechnician={handleAssignTechnician}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeAppointment && (
          <div className="opacity-95">
            <KanbanCard
              appointment={activeAppointment}
              technicians={technicians}
              onAssignTechnician={() => {}}
              isOverlay
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
