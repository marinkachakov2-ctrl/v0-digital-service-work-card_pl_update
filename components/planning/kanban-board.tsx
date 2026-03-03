"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
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
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
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
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
interface ServiceAppointment {
  id: string;
  client_name: string | null;
  machine_model: string | null;
  serial_number: string | null;
  technician_name: string | null;
  work_date: string;
  start_time: string | null;
  end_time: string | null;
  planned_hours: number | null;
  status: string | null;
  priority: string | null;
  notes: string | null;
  task_type: string | null;
  created_at: string;
  updated_at: string;
}

interface Technician {
  id: string;
  name: string;
  active: boolean;
}

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
  const dayOfWeek = baseDate.getDay();
  // Adjust for Monday start (0 = Sunday in JS)
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  
  const monday = new Date(baseDate);
  monday.setDate(baseDate.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);

  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    dates.push(date);
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
  onAssignTechnician: (appointmentId: string, technicianName: string) => void;
  isOver: boolean;
  isToday: boolean;
}) {
  const dateStr = formatDateStr(date);
  const { setNodeRef } = useDroppable({
    id: dateStr,
    data: { date, dateStr },
  });

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
                onAssignTechnician={onAssignTechnician}
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
  const [appointments, setAppointments] = useState<ServiceAppointment[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Week navigation
  const [weekBaseDate, setWeekBaseDate] = useState<Date>(new Date());
  const weekDates = useMemo(() => getWeekDates(weekBaseDate), [weekBaseDate]);
  
  // Filter state
  const [filterTechnician, setFilterTechnician] = useState<string>("all");
  
  // Drag state
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const supabase = createClient();

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  // Today's date string
  const todayStr = formatDateStr(new Date());

  // ─────────────────────────────────────────────────────────────────────────
  // DATA FETCHING
  // ─────────────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const startDate = formatDateStr(weekDates[0]);
      const endDate = formatDateStr(weekDates[6]);

      // Fetch appointments for the week
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from("service_appointments")
        .select("*")
        .gte("work_date", startDate)
        .lte("work_date", endDate)
        .order("start_time", { ascending: true });

      if (appointmentsError) throw appointmentsError;

      // Fetch active technicians
      const { data: techniciansData, error: techniciansError } = await supabase
        .from("technicians")
        .select("*")
        .eq("active", true)
        .order("name");

      if (techniciansError) throw techniciansError;

      setAppointments(appointmentsData || []);
      setTechnicians(techniciansData || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [supabase, weekDates]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─────────────────────────────────────────────────────────────────────────
  // REALTIME SUBSCRIPTION
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel("kanban-week-appointments")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "service_appointments",
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newAppointment = payload.new as ServiceAppointment;
            setAppointments((prev) => {
              if (prev.some((a) => a.id === newAppointment.id)) return prev;
              return [...prev, newAppointment];
            });
          } else if (payload.eventType === "UPDATE") {
            const updatedAppointment = payload.new as ServiceAppointment;
            setAppointments((prev) =>
              prev.map((a) => (a.id === updatedAppointment.id ? updatedAppointment : a))
            );
          } else if (payload.eventType === "DELETE") {
            const deletedId = payload.old?.id;
            if (deletedId) {
              setAppointments((prev) => prev.filter((a) => a.id !== deletedId));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

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
    const targetDateStr = over.id as string;

    // Validate target is a date string
    if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDateStr)) return;

    const appointment = appointments.find((a) => a.id === appointmentId);
    if (!appointment) return;

    // No change needed
    if (appointment.work_date === targetDateStr) return;

    // Update work_date in database
    await updateAppointmentDate(appointmentId, targetDateStr);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // UPDATE FUNCTIONS
  // ─────────────────────────────────────────────────────────────────────────
  const updateAppointmentDate = async (appointmentId: string, newDate: string) => {
    setSaving(true);

    // Optimistic update
    setAppointments((prev) =>
      prev.map((a) => (a.id === appointmentId ? { ...a, work_date: newDate } : a))
    );

    try {
      const { error: updateError } = await supabase
        .from("service_appointments")
        .update({
          work_date: newDate,
          updated_at: new Date().toISOString(),
        })
        .eq("id", appointmentId);

      if (updateError) throw updateError;
    } catch (err) {
      fetchData();
      setError(err instanceof Error ? err.message : "Failed to update date");
    } finally {
      setSaving(false);
    }
  };

  const handleAssignTechnician = async (appointmentId: string, technicianName: string) => {
    setSaving(true);

    // Optimistic update
    setAppointments((prev) =>
      prev.map((a) =>
        a.id === appointmentId
          ? { ...a, technician_name: technicianName, status: "assigned" }
          : a
      )
    );

    try {
      const { error: updateError } = await supabase
        .from("service_appointments")
        .update({
          technician_name: technicianName,
          status: "assigned",
          updated_at: new Date().toISOString(),
        })
        .eq("id", appointmentId);

      if (updateError) throw updateError;
    } catch (err) {
      fetchData();
      setError(err instanceof Error ? err.message : "Failed to assign technician");
    } finally {
      setSaving(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // DERIVED DATA
  // ─────────────────────────────────────────────────────────────────────────
  const filteredAppointments = filterTechnician === "all"
    ? appointments
    : appointments.filter((a) => a.technician_name === filterTechnician);

  const appointmentsByDate = useMemo(() => {
    const grouped: Record<string, ServiceAppointment[]> = {};
    weekDates.forEach((date) => {
      const dateStr = formatDateStr(date);
      grouped[dateStr] = filteredAppointments.filter((a) => a.work_date === dateStr);
    });
    return grouped;
  }, [filteredAppointments, weekDates]);

  // Stats for header
  const stats = useMemo(() => {
    return {
      noTech: appointments.filter((a) => !a.technician_name).length,
      waiting: appointments.filter((a) => a.technician_name && getCardStatus(a) === "waiting").length,
      inProgress: appointments.filter((a) => getCardStatus(a) === "in_progress").length,
      completed: appointments.filter((a) => getCardStatus(a) === "completed").length,
    };
  }, [appointments]);

  const activeAppointment = activeId ? appointments.find((a) => a.id === activeId) : null;

  // Week display range
  const weekRangeDisplay = `${formatDateDisplay(weekDates[0])} - ${formatDateDisplay(weekDates[6])}`;

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
        <Button onClick={fetchData} variant="outline" size="sm">
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
              <span className="text-xs text-muted-foreground">Чакащи</span>
              <Badge variant="secondary" className="text-xs">{stats.waiting}</Badge>
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
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading || saving}>
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

        {/* Day Columns */}
        <div className="flex-1 flex gap-3 overflow-x-auto pb-4">
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
