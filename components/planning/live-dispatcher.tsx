"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { GripVertical, Clock, Loader2, AlertCircle, RefreshCw, User } from "lucide-react";
import { cn } from "@/lib/utils";

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
  start_time: string | null; // "HH:MM:SS"
  end_time: string | null;
  planned_hours: number | null;
  status: string | null;
  priority: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface Technician {
  id: string;
  name: string;
  active: boolean;
}

interface LiveDispatcherProps {
  selectedDate: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const START_HOUR = 7;
const END_HOUR = 19;
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
const CELL_WIDTH = 100;
const ROW_HEIGHT = 70;
const SIDEBAR_WIDTH = 160;

// Colors by type/status
const TYPE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  service: { bg: "bg-[#367C2B]", border: "border-[#367C2B]", text: "text-white" },    // Green for Service
  repair: { bg: "bg-blue-600", border: "border-blue-500", text: "text-white" },       // Blue for Repair
  urgent: { bg: "bg-red-600", border: "border-red-500", text: "text-white" },         // Red for Urgent
  overdue: { bg: "bg-red-600", border: "border-red-500", text: "text-white" },        // Red for Overdue
  default: { bg: "bg-slate-600", border: "border-slate-500", text: "text-white" },
};

function getAppointmentColor(appointment: ServiceAppointment) {
  const priority = appointment.priority?.toLowerCase();
  const status = appointment.status?.toLowerCase();
  
  if (priority === "urgent" || status === "overdue") {
    return TYPE_COLORS.urgent;
  }
  if (status === "repair" || appointment.notes?.toLowerCase().includes("repair")) {
    return TYPE_COLORS.repair;
  }
  if (status === "service" || !status) {
    return TYPE_COLORS.service;
  }
  return TYPE_COLORS.default;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────
function parseTimeToHours(timeStr: string | null): number {
  if (!timeStr) return START_HOUR;
  const parts = timeStr.split(":");
  return parseInt(parts[0], 10) + parseInt(parts[1] || "0", 10) / 60;
}

function hoursToTimeStr(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:00`;
}

function getPositionFromTime(startHours: number, durationHours: number) {
  const left = (startHours - START_HOUR) * CELL_WIDTH;
  const width = Math.max(durationHours * CELL_WIDTH, 50);
  return { left, width };
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// DRAGGABLE COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

// Waiting list draggable item
function WaitingJobCard({ appointment }: { appointment: ServiceAppointment }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: appointment.id,
    data: { appointment, type: "waiting" },
  });

  const colors = getAppointmentColor(appointment);

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      className={cn(
        "flex cursor-grab items-center gap-2 rounded-md border p-2 shadow-sm transition-all",
        colors.bg,
        colors.border,
        colors.text,
        isDragging && "opacity-50 scale-105 shadow-lg"
      )}
    >
      <GripVertical className="h-4 w-4 flex-shrink-0 opacity-60" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">
          {appointment.client_name || "Без клиент"}
        </p>
        <p className="text-[10px] opacity-80 truncate">
          {appointment.machine_model || appointment.serial_number || "Машина"}
        </p>
      </div>
      <Badge variant="outline" className="text-[10px] bg-white/20 border-white/30 shrink-0">
        {appointment.planned_hours || 1}ч
      </Badge>
    </div>
  );
}

// Timeline draggable task
function TimelineTask({ appointment, isOverlay = false }: { appointment: ServiceAppointment; isOverlay?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: appointment.id,
    data: { appointment, type: "timeline" },
  });

  const startHours = parseTimeToHours(appointment.start_time);
  const durationHours = appointment.planned_hours || 1;
  const pos = getPositionFromTime(startHours, durationHours);
  const colors = getAppointmentColor(appointment);

  const style: React.CSSProperties = isOverlay
    ? { width: pos.width }
    : {
        position: "absolute",
        left: pos.left,
        width: pos.width,
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
      };

  return (
    <div
      ref={!isOverlay ? setNodeRef : undefined}
      {...(!isOverlay ? { ...listeners, ...attributes } : {})}
      style={style}
      className={cn(
        "flex h-10 cursor-grab items-center gap-1 rounded border px-2 text-xs font-medium shadow-sm",
        colors.bg,
        colors.border,
        colors.text,
        isDragging && !isOverlay && "opacity-50",
        isOverlay && "shadow-xl ring-2 ring-white/50"
      )}
      title={`${appointment.client_name} - ${appointment.machine_model}`}
    >
      <GripVertical className="h-3 w-3 flex-shrink-0 opacity-60" />
      <span className="truncate">
        {appointment.client_name?.split(" ")[0] || "?"} - {appointment.machine_model?.substring(0, 10) || "Машина"}
      </span>
    </div>
  );
}

// Droppable technician row
function TechnicianRow({
  technician,
  appointments,
  isOver,
  dropHour,
}: {
  technician: Technician;
  appointments: ServiceAppointment[];
  isOver: boolean;
  dropHour: number | null;
}) {
  const { setNodeRef } = useDroppable({
    id: `tech-${technician.id}`,
    data: { technicianName: technician.name, technicianId: technician.id },
  });

  return (
    <div className="flex" style={{ height: ROW_HEIGHT }}>
      {/* Technician name sidebar */}
      <div
        className="flex flex-shrink-0 items-center border-b border-r border-border bg-secondary/30 px-3"
        style={{ width: SIDEBAR_WIDTH }}
      >
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20">
            <User className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm font-medium text-foreground truncate">
            {technician.name}
          </span>
        </div>
      </div>

      {/* Timeline area - droppable */}
      <div
        ref={setNodeRef}
        className={cn(
          "relative flex-1 border-b border-border transition-colors",
          isOver && "bg-primary/10"
        )}
        style={{ minWidth: HOURS.length * CELL_WIDTH }}
      >
        {/* Hour grid lines */}
        <div className="absolute inset-0 flex pointer-events-none">
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="flex-shrink-0 border-r border-border/30"
              style={{ width: CELL_WIDTH }}
            />
          ))}
        </div>

        {/* Drop preview indicator */}
        {isOver && dropHour !== null && (
          <div
            className="absolute top-2 h-10 rounded border-2 border-dashed border-primary bg-primary/20 pointer-events-none"
            style={{
              left: (dropHour - START_HOUR) * CELL_WIDTH,
              width: CELL_WIDTH,
            }}
          />
        )}

        {/* Tasks */}
        <div className="relative h-full pt-2">
          {appointments.map((apt) => (
            <TimelineTask key={apt.id} appointment={apt} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export function LiveDispatcher({ selectedDate }: LiveDispatcherProps) {
  const [appointments, setAppointments] = useState<ServiceAppointment[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [dropHour, setDropHour] = useState<number | null>(null);

  const supabase = createClient();

  // Sensors for drag detection
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // ─────────────────────────────────────────────────────────────────────────
  // DATA FETCHING
  // ─────────────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const dateStr = formatDate(selectedDate);

      // Fetch appointments for selected date
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from("service_appointments")
        .select("*")
        .eq("work_date", dateStr)
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
      console.error("[v0] Error fetching data:", err);
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [selectedDate, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─────────────────────────────────────────────────────────────────────────
  // DRAG HANDLERS
  // ─────────────────────────────────────────────────────────────────────────
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over, active } = event;
    
    if (over) {
      setOverId(over.id as string);
      
      // Calculate drop hour from pointer position
      const rect = event.active.rect.current?.translated;
      if (rect) {
        // Estimate hour based on position
        const containerLeft = SIDEBAR_WIDTH;
        const relativeX = rect.left - containerLeft;
        const hour = Math.floor(relativeX / CELL_WIDTH) + START_HOUR;
        setDropHour(Math.max(START_HOUR, Math.min(END_HOUR - 1, hour)));
      }
    } else {
      setOverId(null);
      setDropHour(null);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setOverId(null);
    setDropHour(null);

    if (!over) return;

    const appointmentId = active.id as string;
    const appointment = appointments.find((a) => a.id === appointmentId);
    if (!appointment) return;

    // Extract technician info from drop target
    const overData = over.data.current as { technicianName?: string; technicianId?: string } | undefined;
    if (!overData?.technicianName) return;

    const newTechnicianName = overData.technicianName;

    // Calculate new start time from drop position
    let newStartHour = START_HOUR;
    if (dropHour !== null) {
      newStartHour = dropHour;
    }
    const newStartTime = hoursToTimeStr(newStartHour);

    // Skip if no changes
    if (appointment.technician_name === newTechnicianName && appointment.start_time === newStartTime) {
      return;
    }

    // ─────────────────────────────────────────────────────────────────────
    // DATABASE UPDATE
    // ─────────────────────────────────────────────────────────────────────
    setSaving(true);

    // Optimistic update
    setAppointments((prev) =>
      prev.map((a) =>
        a.id === appointmentId
          ? { ...a, technician_name: newTechnicianName, start_time: newStartTime }
          : a
      )
    );

    try {
      const { error: updateError } = await supabase
        .from("service_appointments")
        .update({
          technician_name: newTechnicianName,
          start_time: newStartTime,
          updated_at: new Date().toISOString(),
        })
        .eq("id", appointmentId);

      if (updateError) throw updateError;
    } catch (err) {
      console.error("[v0] Error updating appointment:", err);
      // Revert on error
      fetchData();
      setError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // DERIVED DATA
  // ─────────────────────────────────────────────────────────────────────────
  // Waiting list: appointments with no technician assigned
  const waitingAppointments = appointments.filter((a) => !a.technician_name);

  // Appointments grouped by technician
  const appointmentsByTechnician = technicians.reduce((acc, tech) => {
    acc[tech.name] = appointments.filter((a) => a.technician_name === tech.name);
    return acc;
  }, {} as Record<string, ServiceAppointment[]>);

  // Active appointment for drag overlay
  const activeAppointment = activeId ? appointments.find((a) => a.id === activeId) : null;

  // Current time line position
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimeOffset =
    currentHour >= START_HOUR && currentHour < END_HOUR
      ? (currentHour - START_HOUR) * CELL_WIDTH + (currentMinute / 60) * CELL_WIDTH
      : null;

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Зареждане...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-destructive">{error}</p>
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
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full gap-4">
        {/* Main Timeline Area */}
        <div className="flex-1 rounded-lg border border-border bg-card overflow-hidden">
          {/* Saving overlay */}
          {saving && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
              <div className="flex items-center gap-3 rounded-lg bg-card px-6 py-4 shadow-lg border">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="font-medium">Запазване...</span>
              </div>
            </div>
          )}

          <ScrollArea className="h-full">
            <div style={{ minWidth: SIDEBAR_WIDTH + HOURS.length * CELL_WIDTH }}>
              {/* Header with hours */}
              <div className="sticky top-0 z-20 flex border-b border-border bg-secondary/80 backdrop-blur">
                <div
                  className="flex-shrink-0 border-r border-border px-3 py-2"
                  style={{ width: SIDEBAR_WIDTH }}
                >
                  <span className="text-xs font-medium text-muted-foreground">Техник</span>
                </div>
                <div className="flex">
                  {HOURS.map((hour) => (
                    <div
                      key={hour}
                      className="flex flex-shrink-0 items-center justify-center border-r border-border py-2"
                      style={{ width: CELL_WIDTH }}
                    >
                      <span className="text-xs font-medium text-muted-foreground">
                        {hour.toString().padStart(2, "0")}:00
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Technician rows */}
              <div className="relative">
                {technicians.map((tech) => (
                  <TechnicianRow
                    key={tech.id}
                    technician={tech}
                    appointments={appointmentsByTechnician[tech.name] || []}
                    isOver={overId === `tech-${tech.id}`}
                    dropHour={overId === `tech-${tech.id}` ? dropHour : null}
                  />
                ))}

                {/* Current time indicator */}
                {currentTimeOffset !== null && (
                  <div
                    className="absolute top-0 z-10 w-0.5 bg-red-500 pointer-events-none"
                    style={{
                      left: SIDEBAR_WIDTH + currentTimeOffset,
                      height: technicians.length * ROW_HEIGHT,
                    }}
                  >
                    <div className="absolute -left-2 -top-5 rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {currentHour.toString().padStart(2, "0")}:{currentMinute.toString().padStart(2, "0")}
                    </div>
                  </div>
                )}
              </div>

              {/* Empty state */}
              {technicians.length === 0 && (
                <div className="flex h-48 items-center justify-center text-muted-foreground">
                  Няма активни техници
                </div>
              )}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>

        {/* Waiting List Sidebar */}
        <div className="w-72 flex-shrink-0 rounded-lg border border-border bg-card">
          <div className="border-b border-border bg-secondary/50 px-4 py-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Чакащи</h3>
              <Badge variant="secondary" className="text-xs">
                {waitingAppointments.length}
              </Badge>
            </div>
          </div>

          <ScrollArea className="h-[calc(100%-52px)]">
            <div className="space-y-2 p-3">
              {waitingAppointments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                  <Clock className="mb-2 h-8 w-8 opacity-50" />
                  <p className="text-sm">Няма чакащи задачи</p>
                </div>
              ) : (
                waitingAppointments.map((apt) => (
                  <WaitingJobCard key={apt.id} appointment={apt} />
                ))
              )}
            </div>
          </ScrollArea>

          {/* Legend */}
          <div className="border-t border-border p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Легенда:</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-6 rounded bg-[#367C2B]" />
                <span className="text-muted-foreground">Service</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-6 rounded bg-blue-600" />
                <span className="text-muted-foreground">Repair</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-6 rounded bg-red-600" />
                <span className="text-muted-foreground">Urgent</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeAppointment && (
          <div className="opacity-90">
            <TimelineTask appointment={activeAppointment} isOverlay />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
