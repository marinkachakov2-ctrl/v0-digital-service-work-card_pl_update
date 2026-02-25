"use client";

import { useState, useCallback } from "react";
import {
  Clock,
  User,
  GripVertical,
  Plus,
  StickyNote,
  ArrowUpRight,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  X,
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
import { cn } from "@/lib/utils";
import { useClocking } from "@/lib/clocking-context";

// Shared types - must match DragDropScheduler
export interface WeeklyTask {
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
  dayIndex?: number; // 0=Mon ... 6=Sun
}

export interface WeeklyNote {
  id: string;
  text: string;
  dayIndex: number;
}

interface Technician {
  id: string;
  name: string;
}

interface WeeklyTaskViewProps {
  tasks: WeeklyTask[];
  onTasksChange: (tasks: WeeklyTask[]) => void;
  notes: WeeklyNote[];
  onNotesChange: (notes: WeeklyNote[]) => void;
  technicians: Technician[];
  selectedDate: Date;
  onConvertNote?: (note: WeeklyNote) => void;
}

const BG_DAYS_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];
const BG_MONTHS_SHORT = ["яну", "фев", "мар", "апр", "май", "юни", "юли", "авг", "сеп", "окт", "ное", "дек"];

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  pending: { label: "Not Started", color: "bg-muted text-muted-foreground", icon: Clock },
  active: { label: "In Progress", color: "bg-emerald-600 text-white", icon: Play },
  overdue: { label: "On Hold", color: "bg-orange-500 text-white", icon: AlertTriangle },
  completed: { label: "Finished", color: "bg-blue-600 text-white", icon: CheckCircle2 },
};

function getWeekDates(referenceDate: Date): Date[] {
  const d = new Date(referenceDate);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
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

export function WeeklyTaskView({
  tasks,
  onTasksChange,
  notes,
  onNotesChange,
  technicians,
  selectedDate,
  onConvertNote,
}: WeeklyTaskViewProps) {
  const { convertNoteToOrder } = useClocking();

  const weekDates = getWeekDates(selectedDate);

  // Drag state
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [dragNoteId, setDragNoteId] = useState<string | null>(null);
  const [dragOverDay, setDragOverDay] = useState<number | null>(null);

  // Edit dialog
  const [editingTask, setEditingTask] = useState<WeeklyTask | null>(null);
  const [editTech, setEditTech] = useState("");
  const [editStart, setEditStart] = useState("08:00");
  const [editDuration, setEditDuration] = useState("60");

  // Add note dialog
  const [addNoteDay, setAddNoteDay] = useState<number | null>(null);
  const [noteText, setNoteText] = useState("");

  // Convert note dialog
  const [convertDialog, setConvertDialog] = useState<WeeklyNote | null>(null);
  const [convertType, setConvertType] = useState<"service" | "repair" | "inspection">("repair");
  const [convertHours, setConvertHours] = useState("1");

  // Assign dayIndex to tasks that don't have one
  const getTaskDay = useCallback((task: WeeklyTask): number => {
    if (task.dayIndex !== undefined) return task.dayIndex;
    // Default: derive from the reference date (all on the selected day)
    const refDay = selectedDate.getDay();
    return refDay === 0 ? 6 : refDay - 1; // Convert Sun=0 to index 6, Mon=1 to 0
  }, [selectedDate]);

  const tasksByDay = (dayIndex: number) =>
    tasks.filter(t => getTaskDay(t) === dayIndex)
      .sort((a, b) => a.startHour * 60 + a.startMinute - (b.startHour * 60 + b.startMinute));

  const notesByDay = (dayIndex: number) => notes.filter(n => n.dayIndex === dayIndex);

  // Drag handlers
  const handleDragStart = useCallback((taskId: string) => {
    setDragTaskId(taskId);
  }, []);

  const handleNoteDragStart = useCallback((noteId: string) => {
    setDragNoteId(noteId);
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
    if (dragNoteId) {
      onNotesChange(notes.map(n =>
        n.id === dragNoteId ? { ...n, dayIndex } : n
      ));
    }
    setDragTaskId(null);
    setDragNoteId(null);
    setDragOverDay(null);
  }, [dragTaskId, dragNoteId, tasks, notes, onTasksChange, onNotesChange]);

  const handleDragEnd = useCallback(() => {
    setDragTaskId(null);
    setDragNoteId(null);
    setDragOverDay(null);
  }, []);

  // Edit task
  const openEdit = useCallback((task: WeeklyTask) => {
    setEditingTask(task);
    setEditTech(task.technicianId);
    const h = String(task.startHour).padStart(2, "0");
    const m = String(task.startMinute).padStart(2, "0");
    setEditStart(`${h}:${m}`);
    setEditDuration(String(task.durationMinutes));
  }, []);

  const saveEdit = useCallback(() => {
    if (!editingTask) return;
    const [h, m] = editStart.split(":").map(Number);
    onTasksChange(tasks.map(t =>
      t.id === editingTask.id
        ? {
            ...t,
            technicianId: editTech,
            startHour: h || 8,
            startMinute: m || 0,
            durationMinutes: Number(editDuration) || 60,
          }
        : t
    ));
    setEditingTask(null);
  }, [editingTask, editTech, editStart, editDuration, tasks, onTasksChange]);

  const deleteTask = useCallback((id: string) => {
    onTasksChange(tasks.filter(t => t.id !== id));
  }, [tasks, onTasksChange]);

  // Add note
  const addNote = useCallback(() => {
    if (addNoteDay === null || !noteText.trim()) return;
    const newNote: WeeklyNote = {
      id: `wnote-${Date.now()}`,
      text: noteText.trim(),
      dayIndex: addNoteDay,
    };
    onNotesChange([...notes, newNote]);
    setNoteText("");
    setAddNoteDay(null);
  }, [addNoteDay, noteText, notes, onNotesChange]);

  const deleteNote = useCallback((id: string) => {
    onNotesChange(notes.filter(n => n.id !== id));
  }, [notes, onNotesChange]);

  // Convert note
  const handleConvert = useCallback(() => {
    if (!convertDialog) return;
    convertNoteToOrder({
      text: convertDialog.text,
      type: convertType,
      estimatedHours: Number(convertHours) || 1,
    });
    onNotesChange(notes.filter(n => n.id !== convertDialog.id));
    setConvertDialog(null);
    if (onConvertNote) onConvertNote(convertDialog);
  }, [convertDialog, convertType, convertHours, notes, onNotesChange, convertNoteToOrder, onConvertNote]);

  const getTechName = (techId: string) =>
    technicians.find(t => t.id === techId)?.name || techId;

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {Object.entries(statusConfig).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className={cn("h-2.5 w-2.5 rounded-full", cfg.color.split(" ")[0])} />
            <span>{cfg.label}</span>
          </div>
        ))}
        <span className="ml-auto">Drag cards between days to reschedule</span>
      </div>

      {/* Week columns */}
      <div className="grid flex-1 grid-cols-7 gap-2 overflow-auto">
        {weekDates.map((date, dayIndex) => {
          const dayTasks = tasksByDay(dayIndex);
          const dayNotes = notesByDay(dayIndex);
          const today = isToday(date);
          const isWeekend = dayIndex >= 5;

          return (
            <div
              key={dayIndex}
              className={cn(
                "flex flex-col rounded-lg border border-border",
                today && "ring-2 ring-primary ring-offset-1 ring-offset-background",
                isWeekend && "opacity-60",
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
                <div className="flex items-center gap-1">
                  <Badge variant="secondary" className="text-[9px] h-5">
                    {dayTasks.length}
                  </Badge>
                  <button
                    type="button"
                    onClick={() => { setAddNoteDay(dayIndex); setNoteText(""); }}
                    className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                    title="Add Note"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Cards container */}
              <div className="flex-1 space-y-2 overflow-y-auto p-2" style={{ minHeight: 200 }}>
                {/* Task cards */}
                {dayTasks.map(task => {
                  const sc = statusConfig[task.status] || statusConfig.pending;
                  const StatusIcon = sc.icon;
                  const isDragging = dragTaskId === task.id;

                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() => handleDragStart(task.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => openEdit(task)}
                      className={cn(
                        "group cursor-pointer rounded-lg border border-border bg-card p-2.5 shadow-sm transition-all hover:shadow-md",
                        isDragging && "opacity-40 scale-95",
                      )}
                    >
                      {/* Status badge + grip */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <GripVertical className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 cursor-grab" />
                          <div className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold", sc.color)}>
                            <StatusIcon className="h-2.5 w-2.5" />
                            {sc.label}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Order info */}
                      <div className="mt-1.5">
                        <p className="text-[10px] font-bold text-foreground leading-tight">
                          {task.orderNumber} / {task.jobCardNumber}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                          {task.description}
                        </p>
                      </div>

                      {/* Technician & timing */}
                      <div className="mt-2 flex items-center gap-2 text-[9px] text-muted-foreground">
                        <span className="flex items-center gap-0.5">
                          <User className="h-2.5 w-2.5" />
                          {getTechName(task.technicianId).split(" ")[0]}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Clock className="h-2.5 w-2.5" />
                          {String(task.startHour).padStart(2, "0")}:{String(task.startMinute).padStart(2, "0")}
                          {" "}({Math.round(task.durationMinutes / 60 * 10) / 10}h)
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* Note cards */}
                {dayNotes.map(note => (
                  <div
                    key={note.id}
                    draggable
                    onDragStart={() => handleNoteDragStart(note.id)}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      "group rounded-lg border border-amber-400/50 bg-amber-50 dark:bg-amber-900/20 p-2.5 shadow-sm transition-all",
                      dragNoteId === note.id && "opacity-40 scale-95",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <GripVertical className="h-3 w-3 text-amber-600 opacity-0 group-hover:opacity-100 cursor-grab" />
                        <StickyNote className="h-3 w-3 text-amber-600" />
                        <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300">Note</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setConvertDialog(note);
                            setConvertType("repair");
                            setConvertHours("1");
                          }}
                          className="flex items-center gap-0.5 rounded bg-emerald-600/90 px-1.5 py-0.5 text-[9px] font-medium text-white hover:bg-emerald-600 transition-colors opacity-0 group-hover:opacity-100"
                          title="Convert to Order"
                        >
                          <ArrowUpRight className="h-2.5 w-2.5" />
                          Order
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteNote(note.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <p className="mt-1 text-[10px] text-amber-800 dark:text-amber-200">{note.text}</p>
                  </div>
                ))}

                {/* Empty state */}
                {dayTasks.length === 0 && dayNotes.length === 0 && (
                  <p className="py-6 text-center text-[10px] text-muted-foreground">
                    No tasks
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
              Edit Task {editingTask?.orderNumber} / {editingTask?.jobCardNumber}
            </DialogTitle>
          </DialogHeader>
          {editingTask && (
            <div className="space-y-4 py-2">
              <p className="text-xs text-muted-foreground">{editingTask.description}</p>

              <div className="space-y-2">
                <Label className="text-xs">Technician</Label>
                <Select value={editTech} onValueChange={setEditTech}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {technicians.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Start Time</Label>
                  <Input
                    type="time"
                    value={editStart}
                    onChange={e => setEditStart(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Duration (min)</Label>
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
            <Button variant="ghost" onClick={() => setEditingTask(null)}>Cancel</Button>
            <Button onClick={saveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Note Dialog */}
      <Dialog open={addNoteDay !== null} onOpenChange={() => setAddNoteDay(null)}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <StickyNote className="h-4 w-4" />
              Add Note - {addNoteDay !== null ? BG_DAYS_SHORT[addNoteDay] : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Input
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="Note text..."
              className="h-9"
              onKeyDown={e => { if (e.key === "Enter") addNote(); }}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setAddNoteDay(null)}>Cancel</Button>
            <Button onClick={addNote} disabled={!noteText.trim()}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert Note Dialog */}
      <Dialog open={!!convertDialog} onOpenChange={() => setConvertDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <ArrowUpRight className="h-4 w-4" />
              Convert Note to Order
            </DialogTitle>
          </DialogHeader>
          {convertDialog && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg bg-amber-100 dark:bg-amber-900/30 p-3 text-xs text-amber-900 dark:text-amber-100">
                {convertDialog.text}
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Type</Label>
                <Select value={convertType} onValueChange={(v: "service" | "repair" | "inspection") => setConvertType(v)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="service">Service</SelectItem>
                    <SelectItem value="repair">Repair</SelectItem>
                    <SelectItem value="inspection">Inspection</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Estimated Hours</Label>
                <Input type="number" value={convertHours} onChange={e => setConvertHours(e.target.value)} min="0.5" step="0.5" className="h-9" />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setConvertDialog(null)}>Cancel</Button>
            <Button onClick={handleConvert}>Create Order</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
