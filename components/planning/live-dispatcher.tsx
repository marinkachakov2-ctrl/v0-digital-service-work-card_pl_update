"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
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
import { GripVertical, Clock, Loader2, AlertCircle, RefreshCw, User, ChevronLeft, ChevronRight, CalendarDays, Plus, FileText, ArrowRight, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
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
  task_type: string | null; // 'order' | 'note' | null
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
const START_HOUR = 0;  // Extended to 00:00
const END_HOUR = 24;   // Extended to 24:00
const WORK_START_HOUR = 7;  // Visual work start
const WORK_END_HOUR = 19;   // Visual work end
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
const CELL_WIDTH = 80; // Slightly smaller for 24 hours
const ROW_HEIGHT = 70;
const SIDEBAR_WIDTH = 160;

// Colors by type/status
const TYPE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  service: { bg: "bg-[#367C2B]", border: "border-[#367C2B]", text: "text-white" },    // Green for Service
  repair: { bg: "bg-blue-600", border: "border-blue-500", text: "text-white" },       // Blue for Repair
  inspection: { bg: "bg-orange-500", border: "border-orange-400", text: "text-white" }, // Orange for Inspection
  urgent: { bg: "bg-red-600", border: "border-red-500", text: "text-white" },         // Red for Urgent/Emergency
  overdue: { bg: "bg-red-600", border: "border-red-500", text: "text-white" },        // Red for Overdue
  default: { bg: "bg-slate-600", border: "border-slate-500", text: "text-white" },
};

function getAppointmentColor(appointment: ServiceAppointment) {
  const priority = appointment.priority?.toLowerCase();
  const status = appointment.status?.toLowerCase();
  const notes = appointment.notes?.toLowerCase() || "";
  
  // Emergency/Urgent/Overdue - Red (highest priority check first)
  if (priority === "emergency" || priority === "urgent" || priority === "high" || status === "overdue" || notes.includes("спешно") || notes.includes("emergency")) {
    return TYPE_COLORS.urgent;
  }
  // Inspection - Orange (check Bulgarian "проверка" and English "inspection")
  if (notes.includes("проверка") || notes.includes("inspection") || status === "inspection") {
    return TYPE_COLORS.inspection;
  }
  // Repair - Blue (check Bulgarian "ремонт" and English "repair")
  if (notes.includes("ремонт") || notes.includes("repair") || status === "repair") {
    return TYPE_COLORS.repair;
  }
  // Service - Green (default for scheduled work, check "сервиз" and "service")
  if (notes.includes("сервиз") || notes.includes("service") || status === "service" || status === "scheduled") {
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

// Bulgaria timezone helpers (EET/EEST - Europe/Sofia)
function getBulgariaTimeNow(): Date {
  // Get current time formatted for Bulgaria timezone
  const now = new Date();
  return new Date(now.toLocaleString("en-US", { timeZone: "Europe/Sofia" }));
}

function formatTimeForDisplay(timeStr: string | null): string {
  if (!timeStr) return "";
  // Convert HH:MM:SS to HH:MM format
  const [hours, minutes] = timeStr.split(":");
  return `${hours}:${minutes}`;
}

function isAppointmentInFuture(appointment: ServiceAppointment): boolean {
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  
  // If work_date is in the future
  if (appointment.work_date > today) {
    return true;
  }
  
  // If work_date is today, check if start_time is in the future
  if (appointment.work_date === today && appointment.start_time) {
    const [hours, minutes] = appointment.start_time.split(":").map(Number);
    const scheduledTime = new Date(now);
    scheduledTime.setHours(hours, minutes, 0, 0);
    return scheduledTime.getTime() > now.getTime();
  }
  
  return false;
}

// Convert local time to UTC for Supabase storage
function toUTCTimestamp(): string {
  return new Date().toISOString();
}

// ─────────────────────────────────────────────────────────────────────────────
// DRAGGABLE COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

// Waiting list draggable item
function WaitingJobCard({ 
  appointment, 
  onConvert 
}: { 
  appointment: ServiceAppointment;
  onConvert?: (apt: ServiceAppointment) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: appointment.id,
    data: { appointment, type: "waiting" },
  });

  const colors = getAppointmentColor(appointment);
  const isNote = appointment.task_type === "note";
  const appointmentDate = new Date(appointment.work_date);
  const dateLabel = appointmentDate.toLocaleDateString("bg-BG", { day: "2-digit", month: "short" });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex cursor-grab items-center gap-2 rounded-md border p-2 shadow-sm transition-all",
        isNote ? "bg-amber-100 border-amber-300 text-amber-900" : colors.bg,
        !isNote && colors.border,
        !isNote && colors.text,
        isDragging && "opacity-50 scale-105 shadow-lg"
      )}
    >
      <div {...listeners} {...attributes} className="flex items-center">
        <GripVertical className="h-4 w-4 flex-shrink-0 opacity-60" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          {isNote && <FileText className="h-3 w-3 flex-shrink-0" />}
          <p className="text-xs font-medium truncate">
            {appointment.client_name || "Без клиент"}
          </p>
        </div>
        <p className="text-[10px] opacity-80 truncate">
          {isNote ? dateLabel : (appointment.machine_model || appointment.serial_number || "Машина")}
        </p>
      </div>
      <div className="flex items-center gap-1">
        {isNote && onConvert && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onConvert(appointment);
            }}
            className="p-1 rounded hover:bg-amber-200 transition-colors"
            title="Преобразувай в поръчка"
          >
            <ArrowRight className="h-3 w-3" />
          </button>
        )}
        <Badge variant="outline" className={cn(
          "text-[10px] shrink-0",
          isNote ? "bg-amber-200/50 border-amber-400" : "bg-white/20 border-white/30"
        )}>
          {appointment.planned_hours || 1}ч
        </Badge>
      </div>
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
export function LiveDispatcher({ selectedDate: initialDate }: LiveDispatcherProps) {
  const [currentDate, setCurrentDate] = useState<Date>(initialDate);
  const [appointments, setAppointments] = useState<ServiceAppointment[]>([]);
  const [backlog, setBacklog] = useState<ServiceAppointment[]>([]); // Global backlog (no date filter)
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [dropHour, setDropHour] = useState<number | null>(null);
  const [dropWarning, setDropWarning] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  
  // Quick notes state
  const [quickNoteText, setQuickNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  
  // Conversion modal state
  const [convertingNote, setConvertingNote] = useState<ServiceAppointment | null>(null);
  const [convertMachineModel, setConvertMachineModel] = useState("");
  const [convertSerialNumber, setConvertSerialNumber] = useState("");
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();
  
  // Check if selected date is today
  const isToday = formatDate(currentDate) === formatDate(new Date());

  // ─────────────────────────────────────────────────────────────────────────
  // DATE NAVIGATION
  // ─────────────────────────────────────────────────────────────────────────
  const goToPreviousDay = useCallback(() => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() - 1);
      return newDate;
    });
  }, []);

  const goToNextDay = useCallback(() => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + 1);
      return newDate;
    });
  }, []);

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  // Format date for display (Bulgarian locale)
  const formattedDisplayDate = currentDate.toLocaleDateString("bg-BG", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Sofia",
  });

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
      const dateStr = formatDate(currentDate);

      // Fetch appointments for selected date (assigned to timeline)
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from("service_appointments")
        .select("*")
        .eq("work_date", dateStr)
        .not("technician_name", "is", null)
        .order("start_time", { ascending: true });

      if (appointmentsError) throw appointmentsError;

      // Fetch GLOBAL backlog - ALL unassigned tasks regardless of date
      const { data: backlogData, error: backlogError } = await supabase
        .from("service_appointments")
        .select("*")
        .is("technician_name", null)
        .order("work_date", { ascending: true });

      if (backlogError) throw backlogError;

      // Fetch active technicians
      const { data: techniciansData, error: techniciansError } = await supabase
        .from("technicians")
        .select("*")
        .eq("active", true)
        .order("name");

      if (techniciansError) throw techniciansError;

      setAppointments(appointmentsData || []);
      setBacklog(backlogData || []);
      setTechnicians(techniciansData || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [currentDate, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─────────────────────────────────────────────────────────────────────────
  // REALTIME SUBSCRIPTION - Live updates from other users
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const dateStr = formatDate(currentDate);
    
    const channel = supabase
      .channel(`appointments-${dateStr}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "service_appointments",
          filter: `work_date=eq.${dateStr}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newAppointment = payload.new as ServiceAppointment;
            setAppointments((prev) => {
              // Avoid duplicates
              if (prev.some((a) => a.id === newAppointment.id)) return prev;
              return [...prev, newAppointment].sort((a, b) => 
                (a.start_time || "").localeCompare(b.start_time || "")
              );
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
  }, [currentDate, supabase]);

  // ─────────────────────────────────────────────────────────────────────────
  // CURRENT TIME UPDATES (every minute)
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // AUTO-SCROLL TO CURRENT HOUR ON TODAY
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isToday && scrollRef.current && !loading) {
      const now = new Date();
      const currentHour = now.getHours();
      
      if (currentHour >= START_HOUR && currentHour < END_HOUR) {
        const scrollPosition = (currentHour - START_HOUR - 1) * CELL_WIDTH;
        scrollRef.current.scrollTo({ left: Math.max(0, scrollPosition), behavior: "smooth" });
      }
    }
  }, [isToday, loading]);

  // ─────────────────────────────────────────────────────────────────────────
  // QUICK NOTE CREATION
  // ─────────────────────────────────────────────────────────────────────────
  const handleAddQuickNote = async () => {
    if (!quickNoteText.trim()) return;
    
    setAddingNote(true);
    try {
      const { data, error: insertError } = await supabase
        .from("service_appointments")
        .insert({
          client_name: quickNoteText.trim(),
          task_type: "note",
          work_date: formatDate(currentDate),
          planned_hours: 1,
          status: "scheduled",
          priority: "normal",
        })
        .select()
        .single();

      if (insertError) throw insertError;
      
      // Add to backlog immediately
      if (data) {
        setBacklog((prev) => [...prev, data]);
      }
      setQuickNoteText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add note");
    } finally {
      setAddingNote(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // NOTE TO ORDER CONVERSION
  // ─────────────────────────────────────────────────────────────────────────
  const handleConvertNoteToOrder = async () => {
    if (!convertingNote || !convertMachineModel.trim()) return;
    
    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from("service_appointments")
        .update({
          task_type: "order",
          machine_model: convertMachineModel.trim(),
          serial_number: convertSerialNumber.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", convertingNote.id);

      if (updateError) throw updateError;
      
      // Update local state
      const updateFn = (a: ServiceAppointment) => 
        a.id === convertingNote.id
          ? { ...a, task_type: "order", machine_model: convertMachineModel.trim(), serial_number: convertSerialNumber.trim() || null }
          : a;
      
      setAppointments((prev) => prev.map(updateFn));
      setBacklog((prev) => prev.map(updateFn));
      
      // Reset modal
      setConvertingNote(null);
      setConvertMachineModel("");
      setConvertSerialNumber("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to convert note");
    } finally {
      setSaving(false);
    }
  };

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
    setDropWarning(null);

    if (!over) return;

    const appointmentId = active.id as string;
    // Check both appointments (timeline) and backlog (waiting list)
    const appointment = appointments.find((a) => a.id === appointmentId) || backlog.find((a) => a.id === appointmentId);
    if (!appointment) return;

    // Extract technician info from drop target
    const overData = over.data.current as { technicianName?: string; technicianId?: string } | undefined;
    if (!overData?.technicianName) return;

    const newTechnicianName = overData.technicianName;
    const newWorkDate = formatDate(currentDate); // Update work_date to currently viewed date

    // Calculate new start time from drop position (default to 8:00 for better UX)
    let newStartHour = WORK_START_HOUR;
    if (dropHour !== null) {
      newStartHour = dropHour;
    }
    const newStartTime = hoursToTimeStr(newStartHour);

    // ─────────────────────────────────────────────────────────────────────
    // PAST TIME VALIDATION
    // ─────────────────────────────────────────────────────────────────────
    const now = new Date();
    const todayStr = formatDate(now);
    const selectedDateStr = formatDate(currentDate);
    
    // Check if dropping to a past date
    if (selectedDateStr < todayStr) {
      setDropWarning("Не можете да планирате задачи в миналото");
      setTimeout(() => setDropWarning(null), 3000);
      return;
    }
    
    // Check if dropping to a past time on today
    if (selectedDateStr === todayStr) {
      const currentHourNow = now.getHours() + now.getMinutes() / 60;
      if (newStartHour < currentHourNow) {
        setDropWarning("Не можете да планирате задачи в минало време");
        setTimeout(() => setDropWarning(null), 3000);
        return;
      }
    }

    // Check if nothing changed
    const noChanges = 
      appointment.technician_name === newTechnicianName && 
      appointment.start_time === newStartTime &&
      appointment.work_date === newWorkDate;
    
    if (noChanges) return;

    // ─────────────────────────────────────────────────────────────────────
    // DATABASE UPDATE (including work_date for future planning)
    // ─────────────────────────────────────────────────────────────────────
    setSaving(true);

    // If from backlog, remove from backlog and add to appointments
    const isFromBacklog = backlog.some((a) => a.id === appointmentId);
    const updatedAppointment = { 
      ...appointment, 
      technician_name: newTechnicianName, 
      start_time: newStartTime,
      work_date: newWorkDate,
    };

    if (isFromBacklog) {
      setBacklog((prev) => prev.filter((a) => a.id !== appointmentId));
      setAppointments((prev) => [...prev, updatedAppointment]);
    } else {
      setAppointments((prev) =>
        prev.map((a) => a.id === appointmentId ? updatedAppointment : a)
      );
    }

    try {
      const { error: updateError } = await supabase
        .from("service_appointments")
        .update({
          technician_name: newTechnicianName,
          start_time: newStartTime,
          work_date: newWorkDate,
          updated_at: new Date().toISOString(),
        })
        .eq("id", appointmentId);

      if (updateError) throw updateError;
    } catch (err) {
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
  // Waiting list: global backlog (all unassigned tasks regardless of date)
  const waitingAppointments = backlog;

  // Appointments grouped by technician (only assigned tasks for current date)
  const appointmentsByTechnician = technicians.reduce((acc, tech) => {
    acc[tech.name] = appointments.filter((a) => a.technician_name === tech.name);
    return acc;
  }, {} as Record<string, ServiceAppointment[]>);

  // Active appointment for drag overlay (check both lists)
  const activeAppointment = activeId 
    ? (appointments.find((a) => a.id === activeId) || backlog.find((a) => a.id === activeId)) 
    : null;

  // Current time line position (only show on today)
  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();
  const currentTimeOffset = isToday && currentHour >= START_HOUR && currentHour < END_HOUR
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
      <div className="relative flex h-full flex-col gap-4">
        {/* Date Navigation Header */}
        <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={goToPreviousDay}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center gap-2 px-3">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold min-w-[180px] text-center">
                {formattedDisplayDate}
              </span>
            </div>
            
            <Button
              variant="outline"
              size="icon"
              onClick={goToNextDay}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {!isToday && (
              <Button
                variant="default"
                size="sm"
                onClick={goToToday}
                className="gap-1.5"
              >
                <Clock className="h-3.5 w-3.5" />
                Днес
              </Button>
            )}
            
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </div>
        </div>

        {/* Warning Toast */}
        {dropWarning && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-lg bg-destructive px-4 py-2 text-destructive-foreground shadow-lg animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-medium">{dropWarning}</span>
          </div>
        )}

        <div className="relative flex flex-1 gap-4 min-h-0">
          {/* Saving overlay - positioned over entire dispatcher */}
          {saving && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
              <div className="flex items-center gap-3 rounded-lg bg-card px-6 py-4 shadow-lg border">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="font-medium">Запазване...</span>
              </div>
            </div>
          )}

          {/* Main Timeline Area */}
          <div className="flex-1 rounded-lg border border-border bg-card overflow-hidden">
            <ScrollArea className="h-full" ref={scrollRef}>
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
        <div className="w-72 flex-shrink-0 rounded-lg border border-border bg-card flex flex-col">
          <div className="border-b border-border bg-secondary/50 px-4 py-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Чакащи (Всички)</h3>
              <Badge variant="secondary" className="text-xs">
                {waitingAppointments.length}
              </Badge>
            </div>
          </div>

          {/* Quick Note Input */}
          <div className="border-b border-border p-3">
            <div className="flex gap-2">
              <Input
                placeholder="Добави бърза бележка..."
                value={quickNoteText}
                onChange={(e) => setQuickNoteText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddQuickNote()}
                disabled={addingNote}
                className="h-8 text-xs"
              />
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8 flex-shrink-0"
                onClick={handleAddQuickNote}
                disabled={addingNote || !quickNoteText.trim()}
              >
                {addingNote ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="space-y-2 p-3">
              {waitingAppointments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                  <Clock className="mb-2 h-8 w-8 opacity-50" />
                  <p className="text-sm">Няма чакащи задачи</p>
                </div>
              ) : (
                waitingAppointments.map((apt) => (
                  <WaitingJobCard 
                    key={apt.id} 
                    appointment={apt} 
                    onConvert={(a) => {
                      setConvertingNote(a);
                      setConvertMachineModel("");
                      setConvertSerialNumber("");
                    }}
                  />
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
                <div className="h-3 w-6 rounded bg-amber-100 border border-amber-300" />
                <span className="text-muted-foreground">Note</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-6 rounded bg-red-600" />
                <span className="text-muted-foreground">Emergency</span>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Note to Order Conversion Modal */}
      <Dialog open={!!convertingNote} onOpenChange={(open) => !open && setConvertingNote(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Преобразувай в поръчка</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="machine">Модел машина *</Label>
              <Input
                id="machine"
                placeholder="напр. John Deere 7R 350"
                value={convertMachineModel}
                onChange={(e) => setConvertMachineModel(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="serial">Сериен номер</Label>
              <Input
                id="serial"
                placeholder="напр. JD7R-2024-033"
                value={convertSerialNumber}
                onChange={(e) => setConvertSerialNumber(e.target.value)}
              />
            </div>
            {convertingNote && (
              <div className="rounded-lg bg-muted p-3">
                <p className="text-xs text-muted-foreground">Бележка:</p>
                <p className="text-sm font-medium">{convertingNote.client_name}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertingNote(null)}>
              Отказ
            </Button>
            <Button 
              onClick={handleConvertNoteToOrder}
              disabled={!convertMachineModel.trim() || saving}
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Запази като поръчка
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
