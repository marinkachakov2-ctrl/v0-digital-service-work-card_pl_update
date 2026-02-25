"use client";

import React from "react";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  GripVertical,
  Plus,
  Minus,
  X,
  ChevronRight,
  ChevronLeft,
  Clock,
  HelpCircle,
  User,
  CalendarPlus,
  FileText,
  StickyNote,
  ArrowUpRight,
  Split,
  Trash2,
  Pencil,
  Play,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
  ContextMenuLabel,
} from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";
import { useClocking, type ClockingActivity } from "@/lib/clocking-context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

// Types
interface ScheduledTask {
  id: string;
  orderId: string;
  orderNumber: string;
  jobCardNumber: string;
  technicianId: string;
  type: "service" | "repair" | "inspection" | "custom";
  status: "active" | "overdue" | "completed" | "pending";
  startHour: number;
  startMinute: number;
  durationMinutes: number;
  description: string;
  color?: string;
  progressNotes?: string[];
}

interface UnassignedOrder {
  id: string;
  orderId: string;
  orderNumber: string;
  jobCardNumber: string;
  description: string;
  estimatedHours: number;
  type: "service" | "repair" | "inspection";
}

interface UnbilledJob {
  id: string;
  orderId: string;
  orderNumber: string;
  jobCardNumber: string;
  clientName: string;
  dateFinished: string;
  description: string;
}

interface Technician {
  id: string;
  name: string;
  shiftStart: number;
  shiftEnd: number;
}

interface NoteItem {
  id: string;
  text: string;
  createdAt: Date;
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
const ROW_HEIGHT = 90; // Increased to show both scheduled tasks and clocking activities
const TASK_HEIGHT = 36;
const CLOCKING_HEIGHT = 24;
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
    orderNumber: "ON-5521",
    jobCardNumber: "JC-0012",
    technicianId: "tech-1",
    type: "service",
    status: "completed",
    startHour: 8,
    startMinute: 0,
    durationMinutes: 120,
    description: "Смяна на масло",
  },
  {
    id: "t2",
    orderId: "#12346",
    orderNumber: "ON-5521",
    jobCardNumber: "JC-0013",
    technicianId: "tech-1",
    type: "repair",
    status: "active",
    startHour: 13,
    startMinute: 0,
    durationMinutes: 180,
    description: "Ремонт на двигател",
  },
  {
    id: "t3",
    orderId: "#12347",
    orderNumber: "ON-5523",
    jobCardNumber: "JC-0014",
    technicianId: "tech-2",
    type: "inspection",
    status: "completed",
    startHour: 9,
    startMinute: 30,
    durationMinutes: 90,
    description: "Годишен преглед",
  },
  {
    id: "t4",
    orderId: "#12348",
    orderNumber: "ON-5524",
    jobCardNumber: "JC-0015",
    technicianId: "tech-3",
    type: "service",
    status: "overdue",
    startHour: 7,
    startMinute: 0,
    durationMinutes: 240,
    description: "Ремонт на хидравлика",
  },
  {
    id: "t5",
    orderId: "#12349",
    orderNumber: "ON-5525",
    jobCardNumber: "JC-0016",
    technicianId: "tech-4",
    type: "repair",
    status: "pending",
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
    orderNumber: "ON-5530",
    jobCardNumber: "JC-0020",
    description: "Смяна на масло - John Deere",
    estimatedHours: 2,
    type: "service",
  },
  {
    id: "u2",
    orderId: "#1001",
    orderNumber: "ON-5531",
    jobCardNumber: "JC-0021",
    description: "Диагностика - Claas",
    estimatedHours: 1,
    type: "inspection",
  },
  {
    id: "u3",
    orderId: "#1002",
    orderNumber: "ON-5532",
    jobCardNumber: "JC-0022",
    description: "Ремонт на спирачки - Fendt",
    estimatedHours: 3,
    type: "repair",
  },
  {
    id: "u4",
    orderId: "#1003",
    orderNumber: "ON-5533",
    jobCardNumber: "JC-0023",
    description: "Смяна на филтри - New Holland",
    estimatedHours: 1.5,
    type: "service",
  },
];

const initialUnbilled: UnbilledJob[] = [
  {
    id: "ub1",
    orderId: "#12340",
    orderNumber: "ON-5510",
    jobCardNumber: "JC-0005",
    clientName: "Агро ООД",
    dateFinished: "28.01.2026",
    description: "Ремонт на комбайн",
  },
  {
    id: "ub2",
    orderId: "#12341",
    orderNumber: "ON-5511",
    jobCardNumber: "JC-0006",
    clientName: "Фермер ЕООД",
    dateFinished: "27.01.2026",
    description: "Смяна на хидравлика",
  },
  {
    id: "ub3",
    orderId: "#12342",
    orderNumber: "ON-5512",
    jobCardNumber: "JC-0007",
    clientName: "Зърно АД",
    dateFinished: "26.01.2026",
    description: "Годишен сервиз",
  },
];

const initialNotes: NoteItem[] = [
  {
    id: "note1",
    text: "Обади се на Иванов за части",
    createdAt: new Date(),
  },
  {
    id: "note2",
    text: "Провери наличност на филтри",
    createdAt: new Date(),
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

// Quick reservation color markers
const reservationColors = [
  { name: "Планиране", value: "#3b82f6", status: "planning" },    // Blue
  { name: "Чакане", value: "#f97316", status: "waiting" },         // Orange
  { name: "Спешно", value: "#ef4444", status: "urgent" },          // Red
  { name: "Готово", value: "#22c55e", status: "ready" },           // Green
  { name: "Вътрешно", value: "#6b7280", status: "internal" },      // Grey
];

const customColorOptions = [
  { name: "Син", value: "#3b82f6" },
  { name: "Зелен", value: "#22c55e" },
  { name: "Жълт", value: "#f97316" },
  { name: "Червен", value: "#ef4444" },
  { name: "Лилав", value: "#6b7280" },
];

// Status-based color coding: RED=overdue, GREEN=active, ORANGE=unscheduled, GRAY=completed
const statusColors: Record<ScheduledTask["status"], { bg: string; border: string; text: string }> = {
  overdue: { bg: "bg-red-600", border: "border-red-400", text: "text-white" },
  active: { bg: "bg-emerald-600", border: "border-emerald-400", text: "text-white" },
  completed: { bg: "bg-muted", border: "border-muted-foreground/30", text: "text-muted-foreground" },
  pending: { bg: "bg-orange-500", border: "border-orange-400", text: "text-white" },
};

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
  if (task.type === "custom" && task.color) {
    return "border text-white";
  }
  const sc = statusColors[task.status];
  return `${sc.bg} ${sc.border} ${sc.text}`;
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

function getClockingPosition(
  clockInHour: number,
  clockInMinute: number,
  clockOutHour: number | null,
  clockOutMinute: number | null,
  currentHour: number,
  currentMinute: number
) {
  const startOffset =
    (clockInHour - START_HOUR) * CELL_WIDTH + (clockInMinute / 60) * CELL_WIDTH;
  
  // If still active (no clock out), use current time
  let endMinutes: number;
  if (clockOutHour === null || clockOutMinute === null) {
    endMinutes = currentHour * 60 + currentMinute;
  } else {
    endMinutes = clockOutHour * 60 + clockOutMinute;
  }
  
  const startMinutes = clockInHour * 60 + clockInMinute;
  const durationMinutes = Math.max(endMinutes - startMinutes, 15);
  const width = (durationMinutes / 60) * CELL_WIDTH;
  
  return { left: startOffset, width: Math.max(width, 20) };
}

export function DragDropScheduler({ selectedDate }: DragDropSchedulerProps) {
  const [tasks, setTasks] = useState<ScheduledTask[]>(initialTasks);
  const [unassigned, setUnassigned] =
    useState<UnassignedOrder[]>(initialUnassigned);
  const [unbilled, setUnbilled] = useState<UnbilledJob[]>(initialUnbilled);
  const [notes, setNotes] = useState<NoteItem[]>(initialNotes);
  // Get clocking activities and admin state from shared context
  const { clockingActivities, isAdmin, convertNoteToOrder } = useClocking();
  const [newNoteText, setNewNoteText] = useState("");
  const [draggingTask, setDraggingTask] = useState<string | null>(null);
  const [draggingUnassigned, setDraggingUnassigned] = useState<string | null>(
    null
  );
  const [draggingNote, setDraggingNote] = useState<string | null>(null);
  const [draggingUnbilled, setDraggingUnbilled] = useState<string | null>(null);
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
    reservationColors[0].value
  );
  const [quickCreateDuration, setQuickCreateDuration] = useState(60); // Default 1 hour
  const descInputRef = useRef<HTMLInputElement>(null);
  const editDescInputRef = useRef<HTMLInputElement>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showHelpModal, setShowHelpModal] = useState(false);
  
  // Edit task state
  const [editingTask, setEditingTask] = useState<ScheduledTask | null>(null);
  const [editTaskDesc, setEditTaskDesc] = useState("");
  const [editTaskColor, setEditTaskColor] = useState("");
  const [editTaskDuration, setEditTaskDuration] = useState(60);
  const [editTaskStartHour, setEditTaskStartHour] = useState(8);
  const [editTaskStartMinute, setEditTaskStartMinute] = useState(0);

  // Split reservation state (admin only)
  const [splitDialogOpen, setSplitDialogOpen] = useState(false);
  const [splitMode, setSplitMode] = useState<"days" | "technicians">("technicians");
  const [splitTargetTech, setSplitTargetTech] = useState("");
  const [splitDays, setSplitDays] = useState(2);

  // Note-to-order conversion state
  const [convertNoteDialog, setConvertNoteDialog] = useState<NoteItem | null>(null);
  const [convertType, setConvertType] = useState<"service" | "repair" | "inspection">("repair");
  const [convertHours, setConvertHours] = useState("1");

  // Progress note state (technician view)
  const [progressNoteInput, setProgressNoteInput] = useState<Record<string, string>>({});

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
        draggingTask || draggingUnassigned || draggingNote || draggingUnbilled ? "move" : "none";

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
    [draggingTask, draggingUnassigned, draggingNote, draggingUnbilled]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent, techId: string) => {
      e.preventDefault();

      const taskId = e.dataTransfer.getData("taskId");
      const unassignedId = e.dataTransfer.getData("unassignedId");
      const noteId = e.dataTransfer.getData("noteId");
      const unbilledId = e.dataTransfer.getData("unbilledId");

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
  orderNumber: order.orderNumber,
  jobCardNumber: order.jobCardNumber,
  technicianId: techId,
  type: order.type,
  status: "pending",
  startHour: dropTarget.hour,
  startMinute: dropTarget.minute,
  durationMinutes: order.estimatedHours * 60,
  description: order.description,
  };
  setTasks((prev) => [...prev, newTask]);
  setUnassigned((prev) => prev.filter((u) => u.id !== unassignedId));
          }
        } else if (noteId) {
          // Create new task from sticky note
          const note = notes.find((n) => n.id === noteId);
          if (note) {
            const newTask: ScheduledTask = {
  id: `task-${Date.now()}`,
  orderId: "Бележка",
  orderNumber: "-",
  jobCardNumber: "-",
  technicianId: techId,
  type: "custom",
  status: "pending",
  startHour: dropTarget.hour,
  startMinute: dropTarget.minute,
  durationMinutes: 60,
  description: note.text,
  color: "#fbbf24",
  };
            setTasks((prev) => [...prev, newTask]);
            // Remove from notes after assignment
            setNotes((prev) => prev.filter((n) => n.id !== noteId));
          }
        } else if (unbilledId) {
          // Create new task from unbilled job
          const job = unbilled.find((j) => j.id === unbilledId);
          if (job) {
            const newTask: ScheduledTask = {
  id: `task-${Date.now()}`,
  orderId: job.orderId,
  orderNumber: job.orderNumber,
  jobCardNumber: job.jobCardNumber,
  technicianId: techId,
  type: "custom",
  status: "pending",
  startHour: dropTarget.hour,
  startMinute: dropTarget.minute,
  durationMinutes: 60,
  description: `${job.clientName} - ${job.description}`,
  color: "#22c55e",
  };
            setTasks((prev) => [...prev, newTask]);
            // Remove from unbilled after assignment
            setUnbilled((prev) => prev.filter((j) => j.id !== unbilledId));
          }
        }
      }

      setDraggingTask(null);
      setDraggingUnassigned(null);
      setDraggingNote(null);
      setDraggingUnbilled(null);
      setDropTarget(null);
    },
    [dropTarget, unassigned, notes, unbilled]
  );

  const handleDragEnd = useCallback(() => {
    setDraggingTask(null);
    setDraggingUnassigned(null);
    setDraggingNote(null);
    setDraggingUnbilled(null);
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
      if (!isAdmin) return; // Read-only for non-admin
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
          setQuickCreateColor(reservationColors[0].value);
          setQuickCreateDuration(60); // Reset to 1 hour
          // Auto-focus the input after modal opens
          setTimeout(() => descInputRef.current?.focus(), 100);
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
  orderNumber: "-",
  jobCardNumber: "-",
  technicianId: quickCreateModal.techId,
  type: "custom",
  status: "pending",
  startHour: quickCreateModal.hour,
  startMinute: quickCreateModal.minute,
  durationMinutes: quickCreateDuration,
  description: quickCreateDesc,
  color: quickCreateColor,
  };

    setTasks((prev) => [...prev, newTask]);
    setQuickCreateModal(null);
  }, [quickCreateModal, quickCreateDesc, quickCreateColor, quickCreateDuration]);

  // Duration adjustment handlers
  const increaseDuration = useCallback(() => {
    setQuickCreateDuration((prev) => Math.min(prev + 30, 480)); // Max 8 hours
  }, []);

  const decreaseDuration = useCallback(() => {
    setQuickCreateDuration((prev) => Math.max(prev - 30, 30)); // Min 30 minutes
  }, []);

  // Format duration for display
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}мин`;
    if (mins === 0) return `${hours}ч`;
    return `${hours}ч ${mins}мин`;
  };

  const handleDeleteTask = useCallback((taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }, []);

  // Open task for editing
  const handleOpenTaskEdit = useCallback((task: ScheduledTask) => {
    setEditingTask(task);
    setEditTaskDesc(task.description);
    setEditTaskColor(task.color || reservationColors[0].value);
    setEditTaskDuration(task.durationMinutes);
    setEditTaskStartHour(task.startHour);
    setEditTaskStartMinute(task.startMinute);
    setTimeout(() => editDescInputRef.current?.focus(), 100);
  }, []);

  // Save task edits
  const handleSaveTaskEdit = useCallback(() => {
    if (!editingTask || !editTaskDesc.trim()) return;

    setTasks((prev) =>
      prev.map((t) =>
        t.id === editingTask.id
          ? {
              ...t,
              description: editTaskDesc,
              color: editTaskColor,
              durationMinutes: editTaskDuration,
              startHour: editTaskStartHour,
              startMinute: editTaskStartMinute,
            }
          : t
      )
    );
    setEditingTask(null);
  }, [editingTask, editTaskDesc, editTaskColor, editTaskDuration, editTaskStartHour, editTaskStartMinute]);

  // Edit duration handlers
  const increaseEditDuration = useCallback(() => {
    setEditTaskDuration((prev) => Math.min(prev + 30, 480));
  }, []);

  const decreaseEditDuration = useCallback(() => {
    setEditTaskDuration((prev) => Math.max(prev - 30, 30));
  }, []);

  // Edit time handlers
  const adjustEditStartTime = useCallback((deltaMinutes: number) => {
    const currentMinutes = editTaskStartHour * 60 + editTaskStartMinute;
    const newMinutes = Math.max(
      START_HOUR * 60,
      Math.min(currentMinutes + deltaMinutes, (END_HOUR - 1) * 60 + 45)
    );
    setEditTaskStartHour(Math.floor(newMinutes / 60));
    setEditTaskStartMinute(newMinutes % 60);
  }, [editTaskStartHour, editTaskStartMinute]);

  // Split reservation handler (admin only)
  const handleSplitTask = useCallback(() => {
    if (!editingTask || !isAdmin) return;
    if (splitMode === "technicians" && splitTargetTech) {
      const halfDuration = Math.max(30, Math.floor(editingTask.durationMinutes / 2));
      // Shorten original
      setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...t, durationMinutes: halfDuration } : t));
      // Create second half for target tech
      const newTask: ScheduledTask = {
        ...editingTask,
        id: `split-${Date.now()}`,
        technicianId: splitTargetTech,
        durationMinutes: editingTask.durationMinutes - halfDuration,
        progressNotes: [],
      };
      setTasks(prev => [...prev, newTask]);
    } else if (splitMode === "days") {
      const perDay = Math.max(30, Math.floor(editingTask.durationMinutes / splitDays));
      setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...t, durationMinutes: perDay } : t));
      for (let i = 1; i < splitDays; i++) {
        const newTask: ScheduledTask = {
          ...editingTask,
          id: `split-day-${Date.now()}-${i}`,
          durationMinutes: perDay,
          description: `${editingTask.description} (Ден ${i + 1})`,
          progressNotes: [],
        };
        setTasks(prev => [...prev, newTask]);
      }
    }
    setSplitDialogOpen(false);
    setEditingTask(null);
  }, [editingTask, isAdmin, splitMode, splitTargetTech, splitDays]);

  // Convert note to work order
  const handleConvertNote = useCallback(() => {
    if (!convertNoteDialog) return;
    convertNoteToOrder({
      text: convertNoteDialog.text,
      type: convertType,
      estimatedHours: Number(convertHours) || 1,
    });
    // Add to unassigned list as well
    const newUnassigned: UnassignedOrder = {
      id: `conv-${Date.now()}`,
      orderId: `#${Date.now()}`,
      orderNumber: `ON-UNSCH-${Date.now()}`,
      jobCardNumber: `JC-NEW`,
      description: convertNoteDialog.text,
      estimatedHours: Number(convertHours) || 1,
      type: convertType,
    };
    setUnassigned(prev => [...prev, newUnassigned]);
    // Remove note
    setNotes(prev => prev.filter(n => n.id !== convertNoteDialog.id));
    setConvertNoteDialog(null);
  }, [convertNoteDialog, convertType, convertHours, convertNoteToOrder]);

  // Add progress note to a task
  const handleAddProgressNote = useCallback((taskId: string) => {
    const text = progressNoteInput[taskId]?.trim();
    if (!text) return;
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, progressNotes: [...(t.progressNotes || []), text] } : t
    ));
    setProgressNoteInput(prev => ({ ...prev, [taskId]: "" }));
  }, [progressNoteInput]);

  // Note drag handlers
  const handleNoteDragStart = useCallback(
    (e: React.DragEvent, noteId: string) => {
      setDraggingNote(noteId);
      e.dataTransfer.setData("noteId", noteId);
      e.dataTransfer.effectAllowed = "copy";
    },
    []
  );

  // Unbilled drag handlers
  const handleUnbilledDragStart = useCallback(
    (e: React.DragEvent, jobId: string) => {
      setDraggingUnbilled(jobId);
      e.dataTransfer.setData("unbilledId", jobId);
      e.dataTransfer.effectAllowed = "copy";
    },
    []
  );

  // Assign unbilled to technician
  const handleAssignUnbilledToTechnician = useCallback(
    (jobId: string, technicianId: string) => {
      const job = unbilled.find((j) => j.id === jobId);
      if (!job) return;

      const tech = technicians.find((t) => t.id === technicianId);
      if (!tech) return;

      // Find the first available slot
      const techTasks = tasks.filter((t) => t.technicianId === technicianId);
      let startHour = tech.shiftStart;
      let startMinute = 0;

      if (techTasks.length > 0) {
        const sortedTasks = [...techTasks].sort((a, b) => {
          const aEnd = a.startHour * 60 + a.startMinute + a.durationMinutes;
          const bEnd = b.startHour * 60 + b.startMinute + b.durationMinutes;
          return bEnd - aEnd;
        });
        const lastTask = sortedTasks[0];
        const endMinutes =
          lastTask.startHour * 60 + lastTask.startMinute + lastTask.durationMinutes;
        startHour = Math.floor(endMinutes / 60);
        startMinute = endMinutes % 60;
      }

      // Create as custom reservation
      const newTask: ScheduledTask = {
        id: `task-${Date.now()}`,
        orderId: job.orderId,
        orderNumber: job.orderNumber,
        jobCardNumber: job.jobCardNumber,
        technicianId: technicianId,
        type: "custom",
        status: "pending",
        startHour,
        startMinute,
        durationMinutes: 60,
        description: `${job.clientName} - ${job.description}`,
        color: "#22c55e",
      };

      setTasks((prev) => [...prev, newTask]);
      setUnbilled((prev) => prev.filter((j) => j.id !== jobId));
    },
    [unbilled, tasks]
  );

  // Add new note
  const handleAddNote = useCallback(() => {
    if (!newNoteText.trim()) return;
    const newNote: NoteItem = {
      id: `note-${Date.now()}`,
      text: newNoteText.trim(),
      createdAt: new Date(),
    };
    setNotes((prev) => [newNote, ...prev]);
    setNewNoteText("");
  }, [newNoteText]);

  // Delete note
  const handleDeleteNote = useCallback((noteId: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
  }, []);

  // Assign note to technician
  const handleAssignNoteToTechnician = useCallback(
    (noteId: string, technicianId: string) => {
      const note = notes.find((n) => n.id === noteId);
      if (!note) return;

      const tech = technicians.find((t) => t.id === technicianId);
      if (!tech) return;

      // Find the first available slot
      const techTasks = tasks.filter((t) => t.technicianId === technicianId);
      let startHour = tech.shiftStart;
      let startMinute = 0;

      if (techTasks.length > 0) {
        const sortedTasks = [...techTasks].sort((a, b) => {
          const aEnd = a.startHour * 60 + a.startMinute + a.durationMinutes;
          const bEnd = b.startHour * 60 + b.startMinute + b.durationMinutes;
          return bEnd - aEnd;
        });
        const lastTask = sortedTasks[0];
        const endMinutes =
          lastTask.startHour * 60 + lastTask.startMinute + lastTask.durationMinutes;
        startHour = Math.floor(endMinutes / 60);
        startMinute = endMinutes % 60;
      }

      // Create as custom reservation
      const newTask: ScheduledTask = {
        id: `task-${Date.now()}`,
        orderId: "Бележка",
        technicianId: technicianId,
        type: "custom",
        startHour,
        startMinute,
        durationMinutes: 60, // Default 1 hour
        description: note.text,
        color: "#fbbf24", // Yellow for notes
      };

      setTasks((prev) => [...prev, newTask]);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    },
    [notes, tasks]
  );

  // Assign unassigned order to technician via context menu
  const handleAssignToTechnician = useCallback(
    (orderId: string, technicianId: string) => {
      const order = unassigned.find((u) => u.id === orderId);
      if (!order) return;

      // Find the technician's shift start time
      const tech = technicians.find((t) => t.id === technicianId);
      if (!tech) return;

      // Find the first available slot for this technician
      const techTasks = tasks.filter((t) => t.technicianId === technicianId);
      let startHour = tech.shiftStart;
      let startMinute = 0;

      // Simple logic: find the end of the last task or use shift start
      if (techTasks.length > 0) {
        const sortedTasks = [...techTasks].sort((a, b) => {
          const aEnd = a.startHour * 60 + a.startMinute + a.durationMinutes;
          const bEnd = b.startHour * 60 + b.startMinute + b.durationMinutes;
          return bEnd - aEnd;
        });
        const lastTask = sortedTasks[0];
        const endMinutes =
          lastTask.startHour * 60 + lastTask.startMinute + lastTask.durationMinutes;
        startHour = Math.floor(endMinutes / 60);
        startMinute = endMinutes % 60;
      }

      // Create the new scheduled task
      const newTask: ScheduledTask = {
        id: `task-${Date.now()}`,
        orderId: order.orderId,
        orderNumber: order.orderNumber,
        jobCardNumber: order.jobCardNumber,
        technicianId: technicianId,
        type: order.type,
        status: "pending",
        startHour,
        startMinute,
        durationMinutes: order.estimatedHours * 60,
        description: order.description,
      };

      setTasks((prev) => [...prev, newTask]);
      // Remove from unassigned
      setUnassigned((prev) => prev.filter((u) => u.id !== orderId));
    },
    [unassigned, tasks]
  );

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
          <a href="/tablet">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 bg-transparent"
            >
              <Play className="h-4 w-4" />
              Таблет / Клокинг
            </Button>
          </a>
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
            Диспечерски панел
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5 border-r border-border pr-4">
          <span className="text-muted-foreground font-medium">Планирани:</span>
        </div>
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
        <div className="flex items-center gap-1.5 border-l border-border pl-4">
          <span className="text-muted-foreground font-medium">Клокване:</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-6 rounded bg-emerald-500 animate-pulse" />
          <span className="text-muted-foreground">Активно</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-6 rounded bg-slate-400" />
          <span className="text-muted-foreground">Завършено</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-6 rounded bg-orange-400" />
          <span className="text-muted-foreground">Извън график</span>
        </div>
        <div className="ml-auto flex items-center gap-2 text-muted-foreground">
          {isAdmin ? (
            <span>Двоен клик за бърза резервация</span>
          ) : (
            <Badge variant="secondary" className="text-[10px]">Read-only</Badge>
          )}
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
              {technicians.map((tech) => {
                const isDropTargetRow = dropTarget?.techId === tech.id;
                const isDraggingFromPanel = draggingUnassigned || draggingNote || draggingUnbilled;
                
                return (
                  <div
                    key={tech.id}
                    className={cn(
                      "flex items-center border-b border-border px-3 transition-colors",
                      isDropTargetRow && isDraggingFromPanel && "bg-primary/20"
                    )}
                    style={{ height: ROW_HEIGHT }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (isDraggingFromPanel) {
                        e.dataTransfer.dropEffect = "copy";
                        setDropTarget({
                          techId: tech.id,
                          hour: tech.shiftStart,
                          minute: 0,
                        });
                      }
                    }}
                    onDragLeave={() => setDropTarget(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      const unassignedId = e.dataTransfer.getData("unassignedId");
                      const noteId = e.dataTransfer.getData("noteId");
                      const unbilledId = e.dataTransfer.getData("unbilledId");

                      if (unassignedId) {
                        handleAssignToTechnician(unassignedId, tech.id);
                      } else if (noteId) {
                        handleAssignNoteToTechnician(noteId, tech.id);
                      } else if (unbilledId) {
                        handleAssignUnbilledToTechnician(unbilledId, tech.id);
                      }

                      setDraggingUnassigned(null);
                      setDraggingNote(null);
                      setDraggingUnbilled(null);
                      setDropTarget(null);
                    }}
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {tech.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {tech.shiftStart}:00 - {tech.shiftEnd}:00
                      </p>
                    </div>
                    {isDropTargetRow && isDraggingFromPanel && (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Plus className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                );
              })}
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
                          className="absolute rounded border-2 border-dashed border-primary bg-primary/20 pointer-events-none"
                          style={{
                            top: 2,
                            height: TASK_HEIGHT,
                            left: getPosition(
                              dropTarget.hour,
                              dropTarget.minute,
                              60
                            ).left,
                            width: 60,
                          }}
                        />
                      )}

                      {/* Scheduled Tasks Row */}
                      <div className="absolute left-0 right-0" style={{ top: 2, height: TASK_HEIGHT }}>
                        {/* Row label */}
                        <div className="absolute -left-4 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground/50 font-medium -rotate-90 whitespace-nowrap">
                          ПЛАН
                        </div>
                        
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
                                "group absolute top-0 flex items-center rounded border shadow-sm transition-all select-none",
                                getTaskClasses(task),
                                isDragging && "opacity-50",
                                isResizing && "ring-2 ring-primary"
                              )}
                              style={{
                                left: pos.left,
                                width: pos.width,
                                height: TASK_HEIGHT,
                                cursor: isDragging ? "grabbing" : "grab",
                                ...getTaskStyle(task),
                              }}
                              draggable={!isResizing}
                              onDragStart={(e) => handleTaskDragStart(e, task.id)}
                              onDragEnd={handleDragEnd}
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                handleOpenTaskEdit(task);
                              }}
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
                                {task.status === "active" && (
                                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white animate-pulse" />
                                )}
                                <span className="truncate text-[10px] font-medium">
                                  {task.orderNumber}
                                </span>
                                <span className="truncate text-[10px] opacity-70">
                                  / {task.jobCardNumber}
                                </span>
                                {pos.width > 140 && (
                                  <span className="truncate text-[10px] opacity-60">
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
                      </div>

                      {/* Clocking Activities Row */}
                      <div 
                        className="absolute left-0 right-0 border-t border-dashed border-border/50" 
                        style={{ top: TASK_HEIGHT + 6, height: CLOCKING_HEIGHT + 8 }}
                      >
                        {/* Row label */}
                        <div className="absolute -left-4 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground/50 font-medium -rotate-90 whitespace-nowrap">
                          ФАКТ
                        </div>
                        
                        {clockingActivities
                          .filter((c) => c.technicianId === tech.id)
                          .map((activity) => {
                            const pos = getClockingPosition(
                              activity.clockInHour,
                              activity.clockInMinute,
                              activity.clockOutHour,
                              activity.clockOutMinute,
                              currentHour,
                              currentMinute
                            );

                            return (
                              <div
                                key={activity.id}
                                className={cn(
                                  "absolute flex items-center gap-1 rounded-sm px-1.5 text-[10px] font-medium transition-all",
                                  activity.status === "active" && "bg-emerald-500 text-white animate-pulse",
                                  activity.status === "completed" && activity.isScheduled && "bg-slate-400/80 text-white",
                                  activity.status === "completed" && !activity.isScheduled && "bg-orange-400 text-white",
                                  activity.status === "break" && "bg-gray-300 text-gray-700"
                                )}
                                style={{
                                  left: pos.left,
                                  width: pos.width,
                                  height: CLOCKING_HEIGHT,
                                  top: 4,
                                }}
                                title={`${activity.orderId}: ${activity.description}${!activity.isScheduled ? " (извън график)" : ""}`}
                              >
                                {activity.status === "active" && (
                                  <Play className="h-2.5 w-2.5 flex-shrink-0" />
                                )}
                                {activity.status === "completed" && activity.isScheduled && (
                                  <CheckCircle2 className="h-2.5 w-2.5 flex-shrink-0" />
                                )}
                                {activity.status === "completed" && !activity.isScheduled && (
                                  <AlertTriangle className="h-2.5 w-2.5 flex-shrink-0" />
                                )}
                                <span className="truncate">
                                  {activity.orderId}
                                </span>
                              </div>
                            );
                          })}
                      </div>

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

        {/* Dispatcher Hub Sidebar */}
        {showSidebar && (
          <div className="w-80 flex-shrink-0 rounded-lg border border-border bg-card flex flex-col">
            <Tabs defaultValue="waiting" className="flex flex-col h-full">
              <TabsList className="w-full justify-start rounded-none border-b border-border bg-secondary/50 p-0 h-auto">
                <TabsTrigger 
                  value="waiting" 
                  className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 text-xs gap-1.5"
                >
                  <Clock className="h-3.5 w-3.5" />
                  Чакащи
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                    {unassigned.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger 
                  value="unbilled" 
                  className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 text-xs gap-1.5"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Нефактурирани
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                    {unbilled.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger 
                  value="notes" 
                  className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 text-xs gap-1.5"
                >
                  <StickyNote className="h-3.5 w-3.5" />
                  Бележки
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                    {notes.length}
                  </Badge>
                </TabsTrigger>
              </TabsList>

              {/* Tab 1: Waiting Orders */}
              <TabsContent value="waiting" className="flex-1 m-0 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="space-y-2 p-3">
                    {unassigned.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                        <Clock className="h-8 w-8 mb-2 opacity-50" />
                        <p className="text-sm">Няма чакащи поръчки</p>
                      </div>
                    ) : (
                      unassigned.map((order) => {
                        const colors = taskColors[order.type];
                        const isDragging = draggingUnassigned === order.id;

                        return (
                          <ContextMenu key={order.id}>
                            <ContextMenuTrigger asChild>
                              <div
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
                                  {order.orderNumber} / {order.jobCardNumber}
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
                            </ContextMenuTrigger>
                            <ContextMenuContent className="w-56">
                              <ContextMenuLabel className="flex items-center gap-2">
                                <CalendarPlus className="h-4 w-4" />
                                Добави към график
                              </ContextMenuLabel>
                              <ContextMenuSeparator />
                              {technicians.map((tech) => (
                                <ContextMenuItem
                                  key={tech.id}
                                  onClick={() => handleAssignToTechnician(order.id, tech.id)}
                                  className="flex items-center gap-2"
                                >
                                  <User className="h-4 w-4 text-muted-foreground" />
                                  <span>{tech.name}</span>
                                  <span className="ml-auto text-xs text-muted-foreground">
                                    {tech.shiftStart}:00-{tech.shiftEnd}:00
                                  </span>
                                </ContextMenuItem>
                              ))}
                            </ContextMenuContent>
                          </ContextMenu>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Tab 2: Unbilled Jobs */}
              <TabsContent value="unbilled" className="flex-1 m-0 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="space-y-2 p-3">
                    {unbilled.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                        <FileText className="h-8 w-8 mb-2 opacity-50" />
                        <p className="text-sm">Няма нефактурирани поръчки</p>
                      </div>
                    ) : (
                      unbilled.map((job) => {
                        const isDragging = draggingUnbilled === job.id;

                        return (
                          <ContextMenu key={job.id}>
                            <ContextMenuTrigger asChild>
                              <div
                                className={cn(
                                  "rounded-lg border border-green-400 bg-green-500/10 p-3 transition-all",
                                  isDragging
                                    ? "opacity-50 scale-95"
                                    : "cursor-grab hover:shadow-md"
                                )}
                                draggable
                                onDragStart={(e) => handleUnbilledDragStart(e, job.id)}
                                onDragEnd={handleDragEnd}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <GripVertical className="h-4 w-4 text-green-600" />
  <Badge className="bg-green-600 text-white text-xs border-0">
  {job.orderNumber} / {job.jobCardNumber}
  </Badge>
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    {job.dateFinished}
                                  </span>
                                </div>
                                <p className="mt-2 text-xs font-medium text-foreground">
                                  {job.clientName}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {job.description}
                                </p>
                              </div>
                            </ContextMenuTrigger>
                            <ContextMenuContent className="w-56">
                              <ContextMenuLabel className="flex items-center gap-2">
                                <CalendarPlus className="h-4 w-4" />
                                Добави към график
                              </ContextMenuLabel>
                              <ContextMenuSeparator />
                              {technicians.map((tech) => (
                                <ContextMenuItem
                                  key={tech.id}
                                  onClick={() => handleAssignUnbilledToTechnician(job.id, tech.id)}
                                  className="flex items-center gap-2"
                                >
                                  <User className="h-4 w-4 text-muted-foreground" />
                                  <span>{tech.name}</span>
                                  <span className="ml-auto text-xs text-muted-foreground">
                                    {tech.shiftStart}:00-{tech.shiftEnd}:00
                                  </span>
                                </ContextMenuItem>
                              ))}
                            </ContextMenuContent>
                          </ContextMenu>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Tab 3: Notes / Staging Area */}
              <TabsContent value="notes" className="flex-1 m-0 overflow-hidden flex flex-col">
                {/* Add Note Input */}
                <div className="p-3 border-b border-border">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Нова бележка..."
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddNote();
                      }}
                      className="h-9 text-sm"
                    />
                    <Button
                      size="sm"
                      onClick={handleAddNote}
                      disabled={!newNoteText.trim()}
                      className="h-9 px-3"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <ScrollArea className="flex-1">
                  <div className="space-y-2 p-3">
                    {notes.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                        <StickyNote className="h-8 w-8 mb-2 opacity-50" />
                        <p className="text-sm">Няма бележки</p>
                        <p className="text-xs mt-1">Добавете бележка с полето по-горе</p>
                      </div>
                    ) : (
                      notes.map((note) => {
                        const isDragging = draggingNote === note.id;

                        return (
                          <ContextMenu key={note.id}>
                            <ContextMenuTrigger asChild>
                              <div
                                className={cn(
                                  "rounded-lg border border-amber-300 bg-amber-100 dark:bg-amber-900/30 dark:border-amber-700 p-3 transition-all",
                                  isDragging
                                    ? "opacity-50 scale-95"
                                    : "cursor-grab hover:shadow-md"
                                )}
                                draggable
                                onDragStart={(e) => handleNoteDragStart(e, note.id)}
                                onDragEnd={handleDragEnd}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <GripVertical className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                    <StickyNote className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                  </div>
                                  <div className="flex items-center gap-1">
                                    {isAdmin && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setConvertNoteDialog(note);
                                          setConvertType("repair");
                                          setConvertHours("1");
                                        }}
                                        className="text-amber-700 dark:text-amber-300 hover:text-foreground transition-colors"
                                        title="Convert to Work Order"
                                      >
                                        <ArrowUpRight className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteNote(note.id)}
                                      className="text-muted-foreground hover:text-destructive transition-colors"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                                <p className="mt-2 text-xs text-amber-900 dark:text-amber-100">
                                  {note.text}
                                </p>
                                <p className="mt-1.5 text-[10px] text-amber-600/70 dark:text-amber-400/70">
                                  {note.createdAt.toLocaleTimeString("bg-BG", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                              </div>
                            </ContextMenuTrigger>
                            <ContextMenuContent className="w-56">
                              <ContextMenuLabel className="flex items-center gap-2">
                                <CalendarPlus className="h-4 w-4" />
                                Добави към график
                              </ContextMenuLabel>
                              <ContextMenuSeparator />
                              {technicians.map((tech) => (
                                <ContextMenuItem
                                  key={tech.id}
                                  onClick={() => handleAssignNoteToTechnician(note.id, tech.id)}
                                  className="flex items-center gap-2"
                                >
                                  <User className="h-4 w-4 text-muted-foreground" />
                                  <span>{tech.name}</span>
                                  <span className="ml-auto text-xs text-muted-foreground">
                                    {tech.shiftStart}:00-{tech.shiftEnd}:00
                                  </span>
                                </ContextMenuItem>
                              ))}
                            </ContextMenuContent>
                          </ContextMenu>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>

      {/* Quick Reservation Modal */}
      <Dialog
        open={!!quickCreateModal}
        onOpenChange={() => setQuickCreateModal(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Нова Резервация</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-5 py-2">
            {/* Description Input */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm text-muted-foreground">
                Описание (Свободен текст)
              </Label>
              <Input
                ref={descInputRef}
                id="description"
                placeholder="Напр. Оглед, Чака части, Спешен ремонт..."
                value={quickCreateDesc}
                onChange={(e) => setQuickCreateDesc(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && quickCreateDesc.trim()) {
                    handleQuickCreate();
                  }
                }}
                className="h-11"
              />
            </div>

            {/* Color Picker */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Маркер</Label>
              <div className="flex items-center gap-3">
                {reservationColors.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className={cn(
                      "h-7 w-7 rounded-full transition-all duration-150",
                      quickCreateColor === color.value
                        ? "ring-2 ring-offset-2 ring-offset-background ring-foreground scale-110"
                        : "hover:scale-105"
                    )}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setQuickCreateColor(color.value)}
                    title={color.name}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground/70">
                {reservationColors.find((c) => c.value === quickCreateColor)?.name}
              </p>
            </div>

            {/* Time Context */}
            {quickCreateModal && (
              <div className="flex items-center justify-between rounded-lg bg-secondary/50 px-4 py-3">
                <div className="text-sm">
                  <span className="text-muted-foreground">Час: </span>
                  <span className="font-medium text-foreground">
                    {quickCreateModal.hour.toString().padStart(2, "0")}:
                    {quickCreateModal.minute.toString().padStart(2, "0")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Продължителност:</span>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 bg-transparent"
                      onClick={decreaseDuration}
                      disabled={quickCreateDuration <= 30}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-16 text-center text-sm font-medium text-foreground">
                      {formatDuration(quickCreateDuration)}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 bg-transparent"
                      onClick={increaseDuration}
                      disabled={quickCreateDuration >= 480}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => setQuickCreateModal(null)}
            >
              Откажи
            </Button>
            <Button 
              onClick={handleQuickCreate} 
              disabled={!quickCreateDesc.trim()}
              className="bg-foreground text-background hover:bg-foreground/90"
            >
              Създай
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Task Modal */}
      <Dialog
        open={!!editingTask}
        onOpenChange={() => setEditingTask(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
              <Pencil className="h-5 w-5" />
              Редактиране на задача
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-5 py-2">
            {/* Order ID (read-only) */}
            {editingTask && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Поръчка:</span>
                <Badge variant="secondary">{editingTask.orderId}</Badge>
                <span className="text-muted-foreground ml-2">Техник:</span>
                <span className="font-medium">
                  {technicians.find((t) => t.id === editingTask.technicianId)?.name}
                </span>
              </div>
            )}

            {/* Description Input */}
            <div className="space-y-2">
              <Label htmlFor="edit-description" className="text-sm text-muted-foreground">
                Описание
              </Label>
              <Input
                ref={editDescInputRef}
                id="edit-description"
                placeholder="Описание на задачата..."
                value={editTaskDesc}
                onChange={(e) => setEditTaskDesc(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && editTaskDesc.trim()) {
                    handleSaveTaskEdit();
                  }
                }}
                className="h-11"
              />
            </div>

            {/* Color Picker */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Маркер / Статус</Label>
              <div className="flex items-center gap-3">
                {reservationColors.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className={cn(
                      "h-7 w-7 rounded-full transition-all duration-150",
                      editTaskColor === color.value
                        ? "ring-2 ring-offset-2 ring-offset-background ring-foreground scale-110"
                        : "hover:scale-105"
                    )}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setEditTaskColor(color.value)}
                    title={color.name}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground/70">
                {reservationColors.find((c) => c.value === editTaskColor)?.name || "Персонализиран"}
              </p>
            </div>

            {/* Time and Duration Controls */}
            <div className="space-y-3 rounded-lg bg-secondary/50 px-4 py-3">
              {/* Start Time */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Начало:</span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 bg-transparent"
                    onClick={() => adjustEditStartTime(-15)}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-16 text-center text-sm font-medium text-foreground">
                    {editTaskStartHour.toString().padStart(2, "0")}:
                    {editTaskStartMinute.toString().padStart(2, "0")}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 bg-transparent"
                    onClick={() => adjustEditStartTime(15)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* Duration */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Продължителност:</span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 bg-transparent"
                    onClick={decreaseEditDuration}
                    disabled={editTaskDuration <= 30}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-16 text-center text-sm font-medium text-foreground">
                    {formatDuration(editTaskDuration)}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 bg-transparent"
                    onClick={increaseEditDuration}
                    disabled={editTaskDuration >= 480}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* End Time (calculated) */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Край:</span>
                <span>
                  {Math.floor((editTaskStartHour * 60 + editTaskStartMinute + editTaskDuration) / 60)
                    .toString()
                    .padStart(2, "0")}
                  :
                  {((editTaskStartHour * 60 + editTaskStartMinute + editTaskDuration) % 60)
                    .toString()
                    .padStart(2, "0")}
                </span>
              </div>
            </div>

            {/* Admin-only: Split Reservation */}
            {isAdmin && editingTask && (
              <div className="space-y-3 rounded-lg border border-border p-3">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 text-sm font-medium text-foreground"
                  onClick={() => setSplitDialogOpen(prev => !prev)}
                >
                  <Split className="h-4 w-4" />
                  Split Reservation
                  <ChevronDown className={cn("ml-auto h-4 w-4 transition-transform", splitDialogOpen && "rotate-180")} />
                </button>
                {splitDialogOpen && (
                  <div className="space-y-3 pt-2">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={splitMode === "technicians" ? "default" : "outline"}
                        onClick={() => setSplitMode("technicians")}
                        className={splitMode !== "technicians" ? "bg-transparent" : ""}
                      >
                        Across Technicians
                      </Button>
                      <Button
                        size="sm"
                        variant={splitMode === "days" ? "default" : "outline"}
                        onClick={() => setSplitMode("days")}
                        className={splitMode !== "days" ? "bg-transparent" : ""}
                      >
                        Across Days
                      </Button>
                    </div>
                    {splitMode === "technicians" ? (
                      <Select value={splitTargetTech} onValueChange={setSplitTargetTech}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select second technician..." />
                        </SelectTrigger>
                        <SelectContent>
                          {technicians
                            .filter(t => t.id !== editingTask.technicianId)
                            .map(t => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground">Days:</Label>
                        <Button size="sm" variant="outline" className="h-7 w-7 bg-transparent" onClick={() => setSplitDays(d => Math.max(2, d - 1))}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-sm font-medium">{splitDays}</span>
                        <Button size="sm" variant="outline" className="h-7 w-7 bg-transparent" onClick={() => setSplitDays(d => Math.min(5, d + 1))}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    <Button
                      size="sm"
                      onClick={handleSplitTask}
                      disabled={splitMode === "technicians" && !splitTargetTech}
                      className="w-full"
                    >
                      <Split className="mr-1.5 h-3.5 w-3.5" />
                      Split
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="destructive"
              onClick={() => {
                if (editingTask) {
                  handleDeleteTask(editingTask.id);
                  setEditingTask(null);
                }
              }}
              className="mr-auto"
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              Изтрий
            </Button>
            <Button
              variant="ghost"
              onClick={() => setEditingTask(null)}
            >
              Откажи
            </Button>
            <Button 
              onClick={handleSaveTaskEdit} 
              disabled={!editTaskDesc.trim()}
              className="bg-foreground text-background hover:bg-foreground/90"
            >
              Запази
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Convert Note to Work Order Dialog */}
      <Dialog
        open={!!convertNoteDialog}
        onOpenChange={() => setConvertNoteDialog(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <ArrowUpRight className="h-5 w-5" />
              Convert Note to Work Order
            </DialogTitle>
          </DialogHeader>
          {convertNoteDialog && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg bg-amber-100 dark:bg-amber-900/30 p-3 text-xs text-amber-900 dark:text-amber-100">
                {convertNoteDialog.text}
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Type</Label>
                <Select value={convertType} onValueChange={(v: "service" | "repair" | "inspection") => setConvertType(v)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="service">Service</SelectItem>
                    <SelectItem value="repair">Repair</SelectItem>
                    <SelectItem value="inspection">Inspection</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Estimated Hours</Label>
                <Input
                  type="number"
                  value={convertHours}
                  onChange={(e) => setConvertHours(e.target.value)}
                  min="0.5"
                  step="0.5"
                  className="h-9"
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setConvertNoteDialog(null)}>
              Cancel
            </Button>
            <Button onClick={handleConvertNote}>
              Create Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
