"use client";

import React, { useState, useEffect, useCallback } from "react";
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
import { Label } from "@/components/ui/label";
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  FileText,
  Clock,
  CheckCircle2,
  PlayCircle,
  Inbox,
  User,
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

type KanbanStatus = "backlog" | "scheduled" | "in_progress" | "completed";

interface KanbanColumn {
  id: KanbanStatus;
  title: string;
  icon: React.ReactNode;
  color: string;
  dbStatuses: string[]; // Maps to database status values
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const KANBAN_COLUMNS: KanbanColumn[] = [
  {
    id: "backlog",
    title: "Backlog",
    icon: <Inbox className="h-4 w-4" />,
    color: "bg-slate-500",
    dbStatuses: ["pending", "scheduled"],
  },
  {
    id: "scheduled",
    title: "Scheduled",
    icon: <Clock className="h-4 w-4" />,
    color: "bg-amber-500",
    dbStatuses: ["assigned"],
  },
  {
    id: "in_progress",
    title: "In Progress",
    icon: <PlayCircle className="h-4 w-4" />,
    color: "bg-blue-500",
    dbStatuses: ["in_progress", "active"],
  },
  {
    id: "completed",
    title: "Completed",
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: "bg-green-500",
    dbStatuses: ["completed", "done"],
  },
];

// Priority colors
const PRIORITY_COLORS: Record<string, string> = {
  emergency: "bg-red-500 text-white",
  high: "bg-red-400 text-white",
  normal: "bg-blue-500 text-white",
  low: "bg-slate-400 text-white",
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────
function getKanbanColumn(appointment: ServiceAppointment): KanbanStatus {
  // Backlog: No technician assigned
  if (!appointment.technician_name) {
    return "backlog";
  }
  
  // Check status
  const status = appointment.status?.toLowerCase() || "";
  
  if (status === "completed" || status === "done") {
    return "completed";
  }
  
  if (status === "in_progress" || status === "active") {
    return "in_progress";
  }
  
  // Has technician but not started = scheduled
  return "scheduled";
}

function getDbStatusForColumn(column: KanbanStatus): string {
  switch (column) {
    case "backlog":
      return "scheduled";
    case "scheduled":
      return "assigned";
    case "in_progress":
      return "in_progress";
    case "completed":
      return "completed";
    default:
      return "scheduled";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DRAGGABLE CARD COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
function KanbanCard({
  appointment,
  isOverlay = false,
}: {
  appointment: ServiceAppointment;
  isOverlay?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: appointment.id,
    data: { appointment },
  });

  const isNote = appointment.task_type === "note";
  const priority = appointment.priority?.toLowerCase() || "normal";

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={!isOverlay ? setNodeRef : undefined}
      {...(!isOverlay ? { ...listeners, ...attributes } : {})}
      style={style}
      className={cn(
        "cursor-grab rounded-lg border bg-card p-3 shadow-sm transition-all hover:shadow-md",
        isDragging && !isOverlay && "opacity-50",
        isOverlay && "shadow-xl ring-2 ring-primary/50 rotate-2"
      )}
    >
      {/* Header with title and priority */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {isNote && <FileText className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />}
          <span className="text-sm font-medium truncate">
            {appointment.client_name || "Без клиент"}
          </span>
        </div>
        <Badge className={cn("text-[10px] px-1.5 py-0 shrink-0", PRIORITY_COLORS[priority])}>
          {priority === "emergency" ? "Спешно" : priority === "high" ? "Висок" : priority === "low" ? "Нисък" : "Норм."}
        </Badge>
      </div>

      {/* Machine/Description */}
      <p className="text-xs text-muted-foreground truncate mb-2">
        {isNote ? (appointment.notes || "Бележка") : (appointment.machine_model || appointment.serial_number || "Машина")}
      </p>

      {/* Footer with technician and hours */}
      <div className="flex items-center justify-between text-xs">
        {appointment.technician_name ? (
          <div className="flex items-center gap-1 text-muted-foreground">
            <User className="h-3 w-3" />
            <span className="truncate max-w-[100px]">{appointment.technician_name}</span>
          </div>
        ) : (
          <span className="text-muted-foreground italic">Неназначен</span>
        )}
        <Badge variant="outline" className="text-[10px]">
          {appointment.planned_hours || 1}ч
        </Badge>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DROPPABLE COLUMN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
function KanbanColumnComponent({
  column,
  appointments,
  isOver,
}: {
  column: KanbanColumn;
  appointments: ServiceAppointment[];
  isOver: boolean;
}) {
  const { setNodeRef } = useDroppable({
    id: column.id,
    data: { column },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col rounded-lg border bg-secondary/30 min-w-[280px] max-w-[320px] flex-1",
        isOver && "ring-2 ring-primary/50 bg-primary/5"
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between border-b bg-card/50 px-3 py-2.5 rounded-t-lg">
        <div className="flex items-center gap-2">
          <div className={cn("rounded-md p-1.5 text-white", column.color)}>
            {column.icon}
          </div>
          <span className="font-semibold text-sm">{column.title}</span>
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
            appointments.map((apt) => <KanbanCard key={apt.id} appointment={apt} />)
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
  
  // Drag state
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  
  // Technician selection dialog
  const [showTechDialog, setShowTechDialog] = useState(false);
  const [pendingMove, setPendingMove] = useState<{
    appointmentId: string;
    targetColumn: KanbanStatus;
  } | null>(null);
  const [selectedTechnician, setSelectedTechnician] = useState<string>("");

  const supabase = createClient();

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  // ─────────────────────────────────────────────────────────────────────────
  // DATA FETCHING
  // ─────────────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch all appointments (not filtered by date for Kanban view)
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from("service_appointments")
        .select("*")
        .order("created_at", { ascending: false });

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
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─────────────────────────────────────────────────────────────────────────
  // REALTIME SUBSCRIPTION
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel("kanban-appointments")
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
              return [newAppointment, ...prev];
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
    const targetColumn = over.id as KanbanStatus;

    // Validate target is a column
    if (!KANBAN_COLUMNS.some((c) => c.id === targetColumn)) return;

    const appointment = appointments.find((a) => a.id === appointmentId);
    if (!appointment) return;

    const currentColumn = getKanbanColumn(appointment);
    
    // No change needed
    if (currentColumn === targetColumn) return;

    // If moving from backlog to scheduled, need to select technician
    if (currentColumn === "backlog" && targetColumn === "scheduled") {
      setPendingMove({ appointmentId, targetColumn });
      setSelectedTechnician("");
      setShowTechDialog(true);
      return;
    }

    // Otherwise, update directly
    await updateAppointmentStatus(appointmentId, targetColumn, appointment.technician_name);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // UPDATE APPOINTMENT STATUS
  // ─────────────────────────────────────────────────────────────────────────
  const updateAppointmentStatus = async (
    appointmentId: string,
    targetColumn: KanbanStatus,
    technicianName: string | null
  ) => {
    setSaving(true);
    const newStatus = getDbStatusForColumn(targetColumn);

    // Optimistic update
    setAppointments((prev) =>
      prev.map((a) =>
        a.id === appointmentId
          ? { ...a, status: newStatus, technician_name: technicianName }
          : a
      )
    );

    try {
      const updateData: Record<string, unknown> = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      // If assigning technician
      if (technicianName) {
        updateData.technician_name = technicianName;
      }

      // If moving to backlog, remove technician
      if (targetColumn === "backlog") {
        updateData.technician_name = null;
      }

      const { error: updateError } = await supabase
        .from("service_appointments")
        .update(updateData)
        .eq("id", appointmentId);

      if (updateError) throw updateError;
    } catch (err) {
      // Revert on error
      fetchData();
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setSaving(false);
    }
  };

  // Handle technician selection confirmation
  const handleTechnicianConfirm = async () => {
    if (!pendingMove || !selectedTechnician) return;

    setShowTechDialog(false);
    await updateAppointmentStatus(
      pendingMove.appointmentId,
      pendingMove.targetColumn,
      selectedTechnician
    );
    setPendingMove(null);
    setSelectedTechnician("");
  };

  // ─────────────────────────────────────────────────────────────────────────
  // DERIVED DATA
  // ─────────────────────────────────────────────────────────────────────────
  const appointmentsByColumn = KANBAN_COLUMNS.reduce((acc, column) => {
    acc[column.id] = appointments.filter((a) => getKanbanColumn(a) === column.id);
    return acc;
  }, {} as Record<KanbanStatus, ServiceAppointment[]>);

  const activeAppointment = activeId ? appointments.find((a) => a.id === activeId) : null;

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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Kanban Board</h2>
            <p className="text-xs text-muted-foreground">
              Плъзгайте задачи между колоните за промяна на статуса
            </p>
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

        {/* Kanban Columns */}
        <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
          {KANBAN_COLUMNS.map((column) => (
            <KanbanColumnComponent
              key={column.id}
              column={column}
              appointments={appointmentsByColumn[column.id]}
              isOver={overId === column.id}
            />
          ))}
        </div>
      </div>

      {/* Technician Selection Dialog */}
      <Dialog open={showTechDialog} onOpenChange={setShowTechDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Изберете техник</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="technician">Техник</Label>
            <Select value={selectedTechnician} onValueChange={setSelectedTechnician}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Изберете техник..." />
              </SelectTrigger>
              <SelectContent>
                {technicians.map((tech) => (
                  <SelectItem key={tech.id} value={tech.name}>
                    {tech.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowTechDialog(false);
                setPendingMove(null);
              }}
            >
              Отказ
            </Button>
            <Button onClick={handleTechnicianConfirm} disabled={!selectedTechnician}>
              Потвърди
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeAppointment && (
          <div className="opacity-95">
            <KanbanCard appointment={activeAppointment} isOverlay />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
