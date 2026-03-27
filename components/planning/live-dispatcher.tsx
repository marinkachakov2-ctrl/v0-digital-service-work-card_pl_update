"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
import { GripVertical, Clock, Loader2, AlertCircle, RefreshCw, User, ChevronLeft, ChevronRight, CalendarDays, Plus, FileText, FileEdit, X, ArrowRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { 
  useAppointments, 
  formatDateStr,
  getStatusColor,
  type ServiceAppointment,
  type Technician 
} from "@/lib/hooks/use-appointments";

interface LiveDispatcherProps {
  selectedDate: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS - Matching reference design layout
// ─────────────────────────────────────────────────────────────────────────────
const START_HOUR = 0;  // Extended to 00:00
const END_HOUR = 24;   // Extended to 24:00
const WORK_START_HOUR = 7;  // Visual work start
const WORK_END_HOUR = 19;   // Visual work end
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
const CELL_WIDTH = 75; // Matching reference column width
const ROW_HEIGHT = 70; // Matching reference row height (taller for 2-line content)
const SIDEBAR_WIDTH = 180; // Wider for full names like reference

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

// ──────────────────────────────────────────────────��──────────────────────────
// DRAGGABLE COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

// Waiting list draggable item - compact card with left color border (matching reference)
function WaitingJobCard({ 
  appointment, 
  onConvert,
  onToggleComplete,
}: { 
  appointment: ServiceAppointment;
  onConvert?: (apt: ServiceAppointment) => void;
  onToggleComplete?: (apt: ServiceAppointment) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: appointment.id,
    data: { appointment, type: "waiting" },
  });

  const colors = getAppointmentColor(appointment);
  const isNote = appointment.task_type === "note";
  const appointmentDate = new Date(appointment.work_date);
  const dateLabel = appointmentDate.toLocaleDateString("bg-BG", { day: "numeric", month: "short" });

  // Determine border color based on type
  const getBorderColor = () => {
    if (isNote) return "border-l-amber-400";
    const priority = appointment.priority?.toLowerCase();
    const notes = appointment.notes?.toLowerCase() || "";
    if (priority === "emergency" || priority === "urgent" || notes.includes("спешно")) return "border-l-red-500";
    if (notes.includes("ремонт") || notes.includes("repair")) return "border-l-blue-500";
    return "border-l-[#367C2B]"; // Service green
  };

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  // Note cards with checkbox style (like reference)
  if (isNote) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "flex cursor-grab items-center gap-3 rounded-md border border-l-4 border-amber-200 border-l-amber-400 bg-amber-50 p-2.5 transition-all",
          isDragging && "opacity-50 scale-105 shadow-lg"
        )}
      >
        {/* Checkbox for notes */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleComplete?.(appointment);
          }}
          className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border border-amber-400 bg-white hover:bg-amber-100 transition-colors"
        >
          {/* Empty checkbox */}
        </button>
        
        <div {...listeners} {...attributes} className="flex items-center">
          <GripVertical className="h-4 w-4 flex-shrink-0 text-amber-600 opacity-60" />
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-sm text-amber-900 truncate">
            {appointment.client_name || "Бележка"}
          </p>
          <p className="text-[10px] text-amber-700">
            {dateLabel}
          </p>
        </div>
        
        {onConvert && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onConvert(appointment);
            }}
            className="p-1 rounded hover:bg-amber-200 transition-colors flex-shrink-0"
            title="Преобразувай в поръчка"
          >
            <ArrowRight className="h-3.5 w-3.5 text-amber-700" />
          </button>
        )}
        
        {/* Checkbox style indicator */}
        <div className="w-6 h-6 rounded border border-amber-300 bg-amber-100 flex-shrink-0" />
      </div>
    );
  }

  // Service/Repair cards with colored left border and badge
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex cursor-grab items-center gap-2 rounded-md border border-l-4 bg-card p-2.5 shadow-sm transition-all",
        getBorderColor(),
        isDragging && "opacity-50 scale-105 shadow-lg"
      )}
    >
      <div {...listeners} {...attributes} className="flex items-center">
        <GripVertical className="h-4 w-4 flex-shrink-0 text-muted-foreground opacity-60" />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {appointment.client_name || "Без клиент"}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {appointment.machine_model || appointment.serial_number || "Машина"}
        </p>
      </div>
      
      {/* Hours badge on right side */}
      <Badge 
        variant="secondary" 
        className={cn(
          "text-xs font-semibold shrink-0 px-2",
          colors.bg,
          colors.text
        )}
      >
        {appointment.planned_hours || 1}ч
      </Badge>
    </div>
  );
}

// Status icon component
function StatusIcon({ status }: { status: string | null }) {
  const s = status?.toLowerCase() || "scheduled";
  
  // Active/In Progress - green filled circle with check
  if (s === "active" || s === "in_progress" || s === "in progress") {
    return (
      <div className="flex h-4 w-4 items-center justify-center rounded-full bg-[#367C2B]">
        <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
    );
  }
  
  // Waiting/Paused/Blocked - orange circle
  if (s === "waiting" || s === "paused" || s === "blocked" || s === "on_hold") {
    return (
      <div className="h-4 w-4 rounded-full border-2 border-orange-500 bg-orange-500/20" />
    );
  }
  
  // Scheduled/Planned - grey circle outline
  return (
    <div className="h-4 w-4 rounded-full border-2 border-gray-400" />
  );
}

// Get border color based on status
function getStatusBorderColor(status: string | null): string {
  const s = status?.toLowerCase() || "scheduled";
  if (s === "active" || s === "in_progress" || s === "in progress") return "border-[#367C2B]";
  if (s === "waiting" || s === "paused" || s === "blocked" || s === "on_hold") return "border-orange-500";
  return "border-gray-600";
}

// Get progress bar color based on status
function getProgressBarColor(status: string | null): string {
  const s = status?.toLowerCase() || "scheduled";
  if (s === "active" || s === "in_progress" || s === "in progress") return "bg-[#367C2B]";
  if (s === "waiting" || s === "paused" || s === "blocked" || s === "on_hold") return "bg-orange-500";
  return "bg-gray-500";
}

// Timeline draggable task with resize handles - matching reference design exactly
function TimelineTask({ 
  appointment, 
  isOverlay = false,
  onConvert,
  onResize,
}: { 
  appointment: ServiceAppointment; 
  isOverlay?: boolean;
  onConvert?: (apt: ServiceAppointment) => void;
  onResize?: (appointmentId: string, newDuration: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: appointment.id,
    data: { appointment, type: "timeline" },
  });

  const [isResizing, setIsResizing] = useState(false);
  const [resizeWidth, setResizeWidth] = useState<number | null>(null);
  const resizeStartRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const startHours = parseTimeToHours(appointment.start_time);
  const durationHours = appointment.planned_hours || 1;
  const pos = getPositionFromTime(startHours, durationHours);
  const isNote = appointment.task_type === "note";
  
  // Calculate progress (mock - would come from actual tracking)
  const progress = appointment.status === "active" || appointment.status === "in_progress" ? 65 : 
                   appointment.status === "completed" ? 100 : 30;

  // Handle resize start
  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    resizeStartRef.current = {
      startX: e.clientX,
      startWidth: resizeWidth || pos.width,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!resizeStartRef.current) return;
      const deltaX = moveEvent.clientX - resizeStartRef.current.startX;
      const newWidth = Math.max(CELL_WIDTH * 0.5, resizeStartRef.current.startWidth + deltaX);
      // Snap to 30-minute increments
      const snappedWidth = Math.round(newWidth / (CELL_WIDTH * 0.5)) * (CELL_WIDTH * 0.5);
      setResizeWidth(snappedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      if (resizeWidth && onResize) {
        // Convert width to hours
        const newDuration = Math.max(0.5, resizeWidth / CELL_WIDTH);
        onResize(appointment.id, newDuration);
      }
      setResizeWidth(null);
      resizeStartRef.current = null;
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const currentWidth = resizeWidth || Math.max(pos.width, 150);

  const style: React.CSSProperties = isOverlay
    ? { width: currentWidth }
    : {
        position: "absolute",
        left: pos.left,
        width: currentWidth,
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        zIndex: isDragging || isResizing ? 50 : 1,
      };

  // Note cards
  if (isNote) {
    return (
      <div
        ref={!isOverlay ? setNodeRef : undefined}
        {...(!isOverlay ? { ...listeners, ...attributes } : {})}
        style={style}
        className={cn(
          "flex h-14 cursor-grab flex-col justify-center rounded border border-amber-400 bg-amber-50 px-3 text-amber-900 shadow-sm",
          isDragging && !isOverlay && "opacity-50",
          isOverlay && "shadow-xl ring-2 ring-amber-300"
        )}
      >
        <div className="flex items-center gap-2">
          <FileText className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="text-xs font-medium truncate">{appointment.client_name || "Бележка"}</span>
          {onConvert && !isOverlay && (
            <button
              onClick={(e) => { e.stopPropagation(); onConvert(appointment); }}
              className="ml-auto p-0.5 rounded hover:bg-amber-200"
            >
              <FileEdit className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Service/Repair appointment cards - matching reference exactly with resize handle
  return (
    <div
      ref={!isOverlay ? setNodeRef : undefined}
      style={style}
      className={cn(
        "group relative flex cursor-grab flex-col rounded border-2 bg-card shadow-sm overflow-hidden",
        getStatusBorderColor(appointment.status),
        isDragging && !isOverlay && "opacity-50",
        isOverlay && "shadow-xl ring-2 ring-white/50",
        isResizing && "ring-2 ring-primary"
      )}
    >
      {/* Drag handle area - the main content is draggable */}
      <div {...(!isOverlay ? { ...listeners, ...attributes } : {})} className="flex-1">
        {/* Main content */}
        <div className="px-2.5 py-1.5">
          {/* Top row: status icon + order number + edit icon + task name */}
          <div className="flex items-center gap-1.5">
            <StatusIcon status={appointment.status} />
            <span className="text-[11px] text-muted-foreground font-medium">
              ON-{appointment.id.toString().slice(-4)}
            </span>
            <FileEdit className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs font-semibold text-foreground truncate">
              {appointment.notes?.split(" ").slice(0, 2).join(" ") || "Сервиз"}
            </span>
          </div>
          
          {/* Bottom row: client + machine */}
          <p className="text-[11px] text-muted-foreground truncate mt-0.5">
            {appointment.client_name || "Клиент"} ({appointment.machine_model || appointment.serial_number || "Машина"})
          </p>
        </div>
      </div>
      
      {/* Progress bar at bottom */}
      <div className="h-1.5 w-full bg-muted">
        <div 
          className={cn("h-full transition-all", getProgressBarColor(appointment.status))}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Resize handle on right edge */}
      {!isOverlay && onResize && (
        <div
          onMouseDown={handleResizeStart}
          className={cn(
            "absolute right-0 top-0 h-full w-2 cursor-ew-resize",
            "bg-transparent hover:bg-primary/30 transition-colors",
            "opacity-0 group-hover:opacity-100",
            isResizing && "opacity-100 bg-primary/40"
          )}
        >
          <div className="absolute right-0.5 top-1/2 -translate-y-1/2 h-6 w-0.5 rounded-full bg-muted-foreground/50" />
        </div>
      )}
      
      {/* Duration indicator during resize */}
      {isResizing && resizeWidth && (
        <div className="absolute -top-6 right-0 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded shadow">
          {(resizeWidth / CELL_WIDTH).toFixed(1)}ч
        </div>
      )}
    </div>
  );
}

// Get initials from name (e.g., "Георги Петров" -> "ГП")
function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");
}

// Technician avatar colors - matching reference (blue, green, orange variants)
const TECH_COLORS = [
  { bg: "bg-blue-500", text: "text-white" },
  { bg: "bg-emerald-500", text: "text-white" },
  { bg: "bg-orange-500", text: "text-white" },
  { bg: "bg-purple-500", text: "text-white" },
  { bg: "bg-cyan-500", text: "text-white" },
];

function getTechColor(index: number) {
  return TECH_COLORS[index % TECH_COLORS.length];
}

// Calculate technician utilization
function calculateUtilization(appointments: ServiceAppointment[], maxHours = 8) {
  const totalHours = appointments.reduce((sum, apt) => sum + (apt.planned_hours || 1), 0);
  const percentage = Math.round((totalHours / maxHours) * 100);
  const isOverbooked = totalHours > maxHours;
  return { totalHours, maxHours, percentage, isOverbooked };
}

// Droppable technician row - matching reference design exactly
function TechnicianRow({
  technician,
  appointments,
  isOver,
  dropHour,
  onConvertNote,
  onResize,
  techIndex = 0,
}: {
  technician: Technician;
  appointments: ServiceAppointment[];
  isOver: boolean;
  dropHour: number | null;
  onConvertNote?: (apt: ServiceAppointment) => void;
  onResize?: (appointmentId: string, newDuration: number) => void;
  techIndex?: number;
}) {
  const { setNodeRef } = useDroppable({
    id: `tech-${technician.id}`,
    data: { technicianName: technician.name, technicianId: technician.id },
  });

  const initials = getInitials(technician.name);
  const techColor = getTechColor(techIndex);
  const utilization = calculateUtilization(appointments);

  // Progress bar color based on utilization
  const getProgressColor = () => {
    if (utilization.isOverbooked) return "bg-red-500";
    if (utilization.percentage >= 75) return "bg-[#367C2B]"; // Green
    if (utilization.percentage >= 50) return "bg-amber-500";
    return "bg-gray-400";
  };

  return (
    <div className="flex" style={{ height: ROW_HEIGHT + 20 }}>
      {/* Technician sidebar - matching reference with avatar, name, utilization, progress bar */}
      <div
        className="flex flex-shrink-0 flex-col justify-center gap-1 border-b border-r border-border bg-card px-3 py-2"
        style={{ width: SIDEBAR_WIDTH + 40 }}
      >
        <div className="flex items-center gap-3">
          {/* Colored initials avatar */}
          <div className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold",
            techColor.bg,
            techColor.text
          )}>
            {initials}
          </div>
          
          {/* Name and utilization */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {technician.name}
            </p>
            <p className={cn(
              "text-xs",
              utilization.isOverbooked ? "text-red-500 font-medium" : "text-muted-foreground"
            )}>
              {utilization.totalHours} / {utilization.maxHours} часа 
              {utilization.isOverbooked 
                ? " (Overbooked)" 
                : ` (${utilization.percentage}%)`
              }
            </p>
          </div>
        </div>
        
        {/* Utilization progress bar */}
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div 
            className={cn("h-full rounded-full transition-all", getProgressColor())}
            style={{ width: `${Math.min(utilization.percentage, 100)}%` }}
          />
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

        {/* Drop preview indicator - shows where appointment will land */}
        {isOver && dropHour !== null && (
          <div
            className="absolute top-2 h-14 rounded border-2 border-dashed border-primary bg-primary/20 pointer-events-none flex items-center justify-center"
            style={{
              left: (dropHour - START_HOUR) * CELL_WIDTH,
              width: CELL_WIDTH * 2, // Default 2 hour width preview
            }}
          >
            <span className="text-xs font-medium text-primary">
              {dropHour.toString().padStart(2, "0")}:00
            </span>
          </div>
        )}

        {/* Tasks */}
        <div className="relative h-full pt-2">
          {appointments.map((apt) => (
            <TimelineTask 
              key={apt.id} 
              appointment={apt} 
              onConvert={onConvertNote}
              onResize={onResize}
            />
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
  
  // Use shared hook for data - synced with Kanban
  const {
    assignedAppointments,
    sidebarBacklog,
    technicians,
    stats,
    loading,
    error,
    refetch,
    assignTechnician: assignTechnicianFromHook,
    createQuickNote,
    convertNoteToOrder,
    appointmentsByTechnician,
  } = useAppointments({ selectedDate: currentDate });

  // Get appointments grouped by technician for current date
  const techAppointments = appointmentsByTechnician(currentDate);

  const [saving, setSaving] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [dropHour, setDropHour] = useState<number | null>(null);
  const [dropWarning, setDropWarning] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  
  // Demo jobs from MegatronVision localStorage integration
  const [demoJobs, setDemoJobs] = useState<ServiceAppointment[]>([]);
  
  // Quick notes state
  const [quickNoteText, setQuickNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  
  // Conversion modal state
  const [convertingNote, setConvertingNote] = useState<ServiceAppointment | null>(null);
  const [convertMachineModel, setConvertMachineModel] = useState("");
  const [convertSerialNumber, setConvertSerialNumber] = useState("");
  const [convertPriority, setConvertPriority] = useState<string>("normal");
  
  const scrollRef = useRef<HTMLDivElement>(null);
  
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

  // Format date for display (Bulgarian locale) - matching reference "27 март 2026 г."
  const formattedDisplayDate = currentDate.toLocaleDateString("bg-BG", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Sofia",
  }) + " г.";

  // Sensors for drag detection
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

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
  // LOAD DEMO JOBS FROM LOCALSTORAGE (MegatronVision Hero Flow)
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const loadDemoJobs = () => {
      try {
        const stored = localStorage.getItem("pendingDemoJobs");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            // Transform demo jobs to ServiceAppointment format
            const transformed: ServiceAppointment[] = parsed.map((job: Record<string, unknown>, index: number) => ({
              id: `demo-${Date.now()}-${index}`,
              client_name: (job.clientName as string) || (job.client_name as string) || "Demo Client",
              machine_model: (job.machineModel as string) || (job.machine_model as string) || "Demo Machine",
              serial_number: (job.serialNumber as string) || (job.serial_number as string) || null,
              technician_name: null, // Unassigned - will appear in Чакащи
              work_date: (job.workDate as string) || (job.work_date as string) || formatDate(new Date()),
              start_time: null,
              end_time: null,
              planned_hours: (job.estimatedHours as number) || (job.planned_hours as number) || 2,
              status: "scheduled",
              priority: (job.priority as string) || "normal",
              notes: (job.description as string) || (job.notes as string) || "Demo job from MegatronVision",
              task_type: "demo",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }));
            setDemoJobs(transformed);
          }
        }
      } catch (e) {
        console.error("[v0] Error loading pendingDemoJobs from localStorage:", e);
      }
    };

    // Load on mount
    loadDemoJobs();

    // Also listen for storage events (in case another tab updates it)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "pendingDemoJobs") {
        loadDemoJobs();
      }
    };
    window.addEventListener("storage", handleStorageChange);
    
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // AUTO-SCROLL TO CURRENT HOUR ON TODAY
  // ─────────────────────��───────────────────────────────────────────────────
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
  // QUICK NOTE CREATION (using shared hook)
  // ─────────────────────────────────────────────────────────────────────────
  const handleAddQuickNote = async () => {
    if (!quickNoteText.trim()) return;
    
    setAddingNote(true);
    const result = await createQuickNote(quickNoteText.trim(), formatDate(currentDate));
    if (result.success) {
      setQuickNoteText("");
    }
    setAddingNote(false);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // NOTE TO ORDER CONVERSION (using shared hook)
  // ─────────────────────────────────────────────────────────────────────────
  const handleConvertNoteToOrder = async () => {
    if (!convertingNote || !convertMachineModel.trim()) return;
    
    setSaving(true);
    const result = await convertNoteToOrder(
      convertingNote.id,
      convertMachineModel.trim(),
      convertSerialNumber.trim() || undefined,
      convertPriority
    );
    
    if (result.success) {
      // Reset modal
      setConvertingNote(null);
      setConvertMachineModel("");
      setConvertSerialNumber("");
      setConvertPriority("normal");
    }
    setSaving(false);
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
    // Check assignedAppointments (timeline), sidebarBacklog (waiting list + notes), and demo jobs
    const appointment = assignedAppointments.find((a) => a.id === appointmentId) || sidebarBacklog.find((a) => a.id === appointmentId) || demoJobs.find((a) => a.id === appointmentId);
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

    // ──────────��────���───────���─────────────────────────────────────────────
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
    // DATABASE UPDATE using shared hook
    // ─────────────────────────────────────────────────────────────────────
    setSaving(true);

    const result = await assignTechnicianFromHook(
      appointmentId,
      newTechnicianName,
      newWorkDate,
      newStartTime
    );

    if (!result.success) {
      refetch();
    }
    setSaving(false);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RESIZE HANDLER - Update appointment duration
  // ─────────────────────────────────────────────────────────────────────────
  const handleResize = useCallback(async (appointmentId: string, newDuration: number) => {
    // Find the appointment
    const appointment = assignedAppointments.find((a) => a.id === appointmentId);
    if (!appointment) return;

    // Round to nearest 0.5 hours
    const roundedDuration = Math.round(newDuration * 2) / 2;
    
    // Don't update if duration hasn't really changed
    if (Math.abs((appointment.planned_hours || 1) - roundedDuration) < 0.1) return;

    setSaving(true);
    
    // Update via the hook (reusing assignTechnician since it updates the appointment)
    const result = await assignTechnicianFromHook(
      appointmentId,
      appointment.technician_name || "",
      appointment.work_date,
      appointment.start_time || hoursToTimeStr(WORK_START_HOUR),
      roundedDuration // Pass new duration
    );

    if (!result.success) {
      refetch();
    }
    setSaving(false);
  }, [assignedAppointments, assignTechnicianFromHook, refetch]);

  // ─────────────────────────────────────────────────────────────────────────
  // DERIVED DATA
  // ─────────────────────────────────────────────────────────────────────────
  // Waiting list: combined waiting orders + notes from shared hook + demo jobs from localStorage
  const waitingAppointments = useMemo(() => {
    // Prepend demo jobs to the beginning of the list (Hero Flow requirement)
    return [...demoJobs, ...sidebarBacklog];
  }, [demoJobs, sidebarBacklog]);

  // Active appointment for drag overlay (check all lists including demo jobs)
  const activeAppointment = activeId
    ? (assignedAppointments.find((a) => a.id === activeId) || waitingAppointments.find((a) => a.id === activeId))
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
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="relative flex h-full flex-col gap-4">
        {/* Date Navigation Header - matching reference design */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={goToPreviousDay}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground"
          >
            <CalendarDays className="h-5 w-5" />
          </Button>
          
          <span className="text-base font-semibold text-foreground min-w-[180px]">
            {formattedDisplayDate}
          </span>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={goToNextDay}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
          
          {!isToday && (
            <Button
              variant="outline"
              size="sm"
              onClick={goToToday}
              className="ml-2 gap-1.5"
            >
              <Clock className="h-3.5 w-3.5" />
              Днес
            </Button>
          )}
          
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={refetch} 
            disabled={loading}
            className="h-8 w-8 ml-auto text-muted-foreground"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
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
            <div style={{ minWidth: (SIDEBAR_WIDTH + 40) + HOURS.length * CELL_WIDTH }}>
              {/* Header with hours - matching reference "ТЕХНИК" */}
              <div className="sticky top-0 z-20 flex border-b border-border bg-card">
                <div
                  className="flex-shrink-0 border-r border-border px-3 py-3 flex items-center"
                  style={{ width: SIDEBAR_WIDTH + 40 }}
                >
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">ТЕХНИК</span>
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
                {technicians.map((tech, index) => (
                  <TechnicianRow
                    key={tech.id}
                    technician={tech}
                    techIndex={index}
                    appointments={techAppointments[tech.name] || []}
                    isOver={overId === `tech-${tech.id}`}
                    dropHour={overId === `tech-${tech.id}` ? dropHour : null}
                    onConvertNote={(apt) => {
                      setConvertingNote(apt);
                      setConvertMachineModel("");
                      setConvertSerialNumber("");
                      setConvertPriority("normal");
                    }}
                    onResize={handleResize}
                  />
                ))}

                {/* Current time indicator */}
                {currentTimeOffset !== null && (
                  <div
                    className="absolute top-0 z-10 w-0.5 bg-red-500 pointer-events-none"
                    style={{
                      left: (SIDEBAR_WIDTH + 40) + currentTimeOffset,
                      height: technicians.length * (ROW_HEIGHT + 20),
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

          {/* Waiting List Sidebar - matching reference design */}
        <div className="w-72 flex-shrink-0 rounded-lg border border-border bg-card flex flex-col">
          {/* Header with title and count badge */}
          <div className="border-b border-border px-4 py-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Чакащи (Всички)</h3>
              <Badge className="bg-amber-500 text-white hover:bg-amber-500 text-xs px-2">
                {waitingAppointments.length}
              </Badge>
            </div>
          </div>

          {/* Quick Note Input - matching reference */}
          <div className="border-b border-border px-4 py-3">
            <div className="flex gap-2">
              <Input
                placeholder="Добави бърза бележка..."
                value={quickNoteText}
                onChange={(e) => setQuickNoteText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddQuickNote()}
                disabled={addingNote}
                className="h-9 text-sm bg-secondary/50 border-border"
              />
              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9 flex-shrink-0 text-muted-foreground hover:text-foreground"
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
                      setConvertPriority("normal");
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
              <DialogDescription className="sr-only">Convert appointment to service order</DialogDescription>
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
            <div className="space-y-2">
              <Label htmlFor="priority">Приоритет</Label>
              <Select value={convertPriority} onValueChange={setConvertPriority}>
                <SelectTrigger>
                  <SelectValue placeholder="Изберете приоритет" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Нисък</SelectItem>
                  <SelectItem value="normal">Нормален</SelectItem>
                  <SelectItem value="high">Висок</SelectItem>
                  <SelectItem value="emergency">Спешен</SelectItem>
                </SelectContent>
              </Select>
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
