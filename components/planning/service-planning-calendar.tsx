"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  CalendarDays,
  Clock,
  Users,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Radio,
  GripVertical,
  ExternalLink,
  X,
  User,
  Building,
  Hash,
  FileText,
  Gauge,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

// Types
interface PlanningTask {
  id: string;
  title: string;
  description: string;
  job_card_id: string | null;
  technician_id: string;
  technician_name?: string;
  start_time: string;
  end_time: string;
  status: "pending" | "in_progress" | "completed" | "overdue";
  priority: "low" | "normal" | "high" | "emergency";
  // Joined from job_cards
  machine_model?: string;
  serial_number?: string;
  client_name?: string;
}

interface Technician {
  id: string;
  name: string;
  active: boolean;
}

interface ServicePlanningCalendarProps {
  userRole?: "technician" | "admin";
  currentTechnicianId?: string;
  viewMode?: "monthly" | "weekly";
}

// Constants
const BG_MONTHS = [
  "Януари", "Февруари", "Март", "Април", "Май", "Юни",
  "Юли", "Август", "Септември", "Октомври", "Ноември", "Декември",
];
const BG_WEEKDAYS = ["Нд", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
const BG_WEEKDAYS_FULL = ["Неделя", "Понеделник", "Вторник", "Сряда", "Четвъртък", "Петък", "Събота"];
const HOURS = Array.from({ length: 12 }, (_, i) => 7 + i); // 7:00 - 18:00
const WORKING_HOURS_PER_DAY = 8;

// Helper functions
function getStatusColor(status: string, priority?: string) {
  if (priority === "emergency") return "bg-red-500/90 border-red-400";
  switch (status) {
    case "completed": return "bg-emerald-500/80 border-emerald-400";
    case "in_progress": return "bg-primary/80 border-primary";
    case "overdue": return "bg-red-500/80 border-red-400";
    default: return "bg-amber-500/80 border-amber-400";
  }
}

function getStatusBadge(status: string, priority?: string) {
  if (priority === "emergency") {
    return <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Emergency</Badge>;
  }
  switch (status) {
    case "completed":
      return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] px-1.5 py-0">Completed</Badge>;
    case "in_progress":
      return <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] px-1.5 py-0">In Progress</Badge>;
    case "overdue":
      return <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Overdue</Badge>;
    default:
      return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px] px-1.5 py-0">Pending</Badge>;
  }
}

function calculateCapacity(tasks: PlanningTask[], technicianId: string, date: Date): number {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const techTasks = tasks.filter(t => {
    const taskDate = new Date(t.start_time);
    return t.technician_id === technicianId && 
           taskDate >= dayStart && 
           taskDate <= dayEnd;
  });

  const totalHours = techTasks.reduce((sum, task) => {
    const start = new Date(task.start_time);
    const end = new Date(task.end_time);
    return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  }, 0);

  return Math.min(100, (totalHours / WORKING_HOURS_PER_DAY) * 100);
}

function getCapacityColor(percentage: number): string {
  if (percentage >= 90) return "text-red-500";
  if (percentage >= 70) return "text-amber-500";
  return "text-emerald-500";
}

function getCapacityBgColor(percentage: number): string {
  if (percentage >= 90) return "bg-red-500";
  if (percentage >= 70) return "bg-amber-500";
  return "bg-emerald-500";
}

export function ServicePlanningCalendar({
  userRole = "admin",
  currentTechnicianId,
  viewMode: initialViewMode = "monthly",
}: ServicePlanningCalendarProps) {
  // State
  const [viewMode, setViewMode] = useState<"monthly" | "weekly">(initialViewMode);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<PlanningTask[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLive, setIsLive] = useState(true);
  const [selectedTask, setSelectedTask] = useState<PlanningTask | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [draggedTask, setDraggedTask] = useState<PlanningTask | null>(null);
  const [lastSync, setLastSync] = useState<Date>(new Date());

  // Refs
  const subscriptionRef = useRef<ReturnType<typeof createClient>["channel"] | null>(null);

  // Fetch data
  const fetchData = useCallback(async () => {
    const supabase = createClient();

    try {
      // Fetch technicians
      const { data: techData } = await supabase
        .from("technicians")
        .select("*")
        .eq("active", true)
        .order("name");

      if (techData) {
        setTechnicians(techData);
      }

      // Fetch planning tasks with job card info
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);

      const { data: planningData } = await supabase
        .from("service_planning")
        .select(`
          *,
          job_cards (
            machine_model,
            serial_number,
            client_name
          ),
          technicians (
            name
          )
        `)
        .gte("start_time", startOfMonth.toISOString())
        .lte("start_time", endOfMonth.toISOString())
        .order("start_time");

      if (planningData) {
        const formattedTasks: PlanningTask[] = planningData.map((item: Record<string, unknown>) => ({
          id: item.id as string,
          title: item.title as string || "Service Task",
          description: item.description as string || "",
          job_card_id: item.job_card_id as string | null,
          technician_id: item.technician_id as string,
          technician_name: (item.technicians as { name?: string } | null)?.name || "Unassigned",
          start_time: item.start_time as string,
          end_time: item.end_time as string,
          status: (item.status as PlanningTask["status"]) || "pending",
          priority: (item.priority as PlanningTask["priority"]) || "normal",
          machine_model: (item.job_cards as { machine_model?: string } | null)?.machine_model,
          serial_number: (item.job_cards as { serial_number?: string } | null)?.serial_number,
          client_name: (item.job_cards as { client_name?: string } | null)?.client_name,
        }));
        setTasks(formattedTasks);
      }

      setLastSync(new Date());
    } catch (error) {
      console.error("Error fetching planning data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentDate]);

  // Set up real-time subscription
  useEffect(() => {
    fetchData();

    const supabase = createClient();
    
    // Subscribe to changes
    const channel = supabase
      .channel("planning-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "service_planning" },
        () => {
          fetchData();
        }
      )
      .subscribe((status) => {
        setIsLive(status === "SUBSCRIBED");
      });

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [fetchData]);

  // Navigation handlers
  const goToPrevious = () => {
    if (viewMode === "monthly") {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() - 7);
      setCurrentDate(newDate);
    }
  };

  const goToNext = () => {
    if (viewMode === "monthly") {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() + 7);
      setCurrentDate(newDate);
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Task click handler
  const handleTaskClick = (task: PlanningTask) => {
    setSelectedTask(task);
    setIsPanelOpen(true);
  };

  // Drag & Drop handlers (admin only)
  const handleDragStart = (e: React.DragEvent, task: PlanningTask) => {
    if (userRole !== "admin") return;
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (userRole !== "admin" || !draggedTask) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, targetTechId: string, targetDate: Date, targetHour: number) => {
    if (userRole !== "admin" || !draggedTask) return;
    e.preventDefault();

    const supabase = createClient();
    
    // Calculate new start/end times
    const newStart = new Date(targetDate);
    newStart.setHours(targetHour, 0, 0, 0);
    
    const duration = new Date(draggedTask.end_time).getTime() - new Date(draggedTask.start_time).getTime();
    const newEnd = new Date(newStart.getTime() + duration);

    try {
      await supabase
        .from("service_planning")
        .update({
          technician_id: targetTechId,
          start_time: newStart.toISOString(),
          end_time: newEnd.toISOString(),
        })
        .eq("id", draggedTask.id);

      // Optimistic update
      setTasks(prev => prev.map(t => 
        t.id === draggedTask.id
          ? { ...t, technician_id: targetTechId, start_time: newStart.toISOString(), end_time: newEnd.toISOString() }
          : t
      ));
    } catch (error) {
      console.error("Error updating task:", error);
    }

    setDraggedTask(null);
  };

  // Generate month grid
  const generateMonthGrid = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const days: (Date | null)[] = [];
    
    // Padding for days before month starts
    for (let i = 0; i < startPadding; i++) {
      days.push(null);
    }
    
    // Actual days
    for (let d = 1; d <= totalDays; d++) {
      days.push(new Date(year, month, d));
    }

    return days;
  };

  // Get tasks for a specific day
  const getTasksForDay = (date: Date) => {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    return tasks.filter(task => {
      const taskDate = new Date(task.start_time);
      const matchesDay = taskDate >= dayStart && taskDate <= dayEnd;
      
      if (userRole === "technician" && currentTechnicianId) {
        return matchesDay && task.technician_id === currentTechnicianId;
      }
      return matchesDay;
    });
  };

  // Get week dates
  const getWeekDates = () => {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - day + 1); // Monday
    
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(d.getDate() + i);
      dates.push(d);
    }
    return dates;
  };

  // Get overall capacity for today
  const getTechnicianCapacityToday = (techId: string) => {
    return calculateCapacity(tasks, techId, new Date());
  };

  // Render Monthly View
  const renderMonthlyView = () => {
    const monthGrid = generateMonthGrid();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (
      <div className="grid grid-cols-7 gap-1">
        {/* Weekday headers */}
        {BG_WEEKDAYS.map((day, i) => (
          <div
            key={day}
            className={cn(
              "text-center text-xs font-medium py-2",
              i === 0 || i === 6 ? "text-muted-foreground/50" : "text-muted-foreground"
            )}
          >
            {day}
          </div>
        ))}

        {/* Day cells */}
        {monthGrid.map((date, index) => {
          if (!date) {
            return <div key={`empty-${index}`} className="aspect-square" />;
          }

          const dayTasks = getTasksForDay(date);
          const isToday = date.getTime() === today.getTime();
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;
          
          // Calculate day load
          const dayLoad = dayTasks.length > 0 
            ? Math.min(100, (dayTasks.length / 5) * 100) 
            : 0;

          const hasOverdue = dayTasks.some(t => t.status === "overdue");
          const hasEmergency = dayTasks.some(t => t.priority === "emergency");

          return (
            <div
              key={date.toISOString()}
              className={cn(
                "relative aspect-square rounded-lg border border-border/50 p-1 transition-all cursor-pointer hover:border-primary/50 hover:bg-card/50",
                isToday && "ring-2 ring-primary ring-offset-1 ring-offset-background",
                isWeekend && "bg-muted/20 opacity-60",
                hasEmergency && "border-red-500/50",
                hasOverdue && !hasEmergency && "border-amber-500/50"
              )}
              onClick={() => {
                if (dayTasks.length > 0) {
                  setViewMode("weekly");
                  setCurrentDate(date);
                }
              }}
            >
              {/* Day number */}
              <div className={cn(
                "text-xs font-medium",
                isToday ? "text-primary" : "text-foreground"
              )}>
                {date.getDate()}
              </div>

              {/* Load indicator */}
              {dayTasks.length > 0 && (
                <div className="absolute bottom-1 left-1 right-1">
                  <div className="h-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full transition-all",
                        dayLoad >= 90 ? "bg-red-500" : dayLoad >= 70 ? "bg-amber-500" : "bg-emerald-500"
                      )}
                      style={{ width: `${dayLoad}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-[9px] text-muted-foreground">
                      {dayTasks.length} task{dayTasks.length !== 1 ? "s" : ""}
                    </span>
                    {hasEmergency && (
                      <AlertTriangle className="h-2.5 w-2.5 text-red-500" />
                    )}
                  </div>
                </div>
              )}

              {/* Mini task indicators */}
              {dayTasks.length > 0 && dayTasks.length <= 3 && (
                <div className="flex flex-wrap gap-0.5 mt-0.5">
                  {dayTasks.slice(0, 3).map(task => (
                    <div
                      key={task.id}
                      className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        getStatusColor(task.status, task.priority).split(" ")[0]
                      )}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Render Weekly Timeline View
  const renderWeeklyView = () => {
    const weekDates = getWeekDates();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Filter technicians for tech view
    const displayTechnicians = userRole === "technician" && currentTechnicianId
      ? technicians.filter(t => t.id === currentTechnicianId)
      : technicians;

    return (
      <div className="flex flex-col h-full">
        {/* Capacity bars for admin view */}
        {userRole === "admin" && (
          <div className="flex gap-2 mb-4 flex-wrap">
            {technicians.map(tech => {
              const capacity = getTechnicianCapacityToday(tech.id);
              return (
                <Card key={tech.id} className="flex-1 min-w-[150px] border-border/50">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium truncate">{tech.name}</span>
                      <span className={cn("text-xs font-bold", getCapacityColor(capacity))}>
                        {Math.round(capacity)}%
                      </span>
                    </div>
                    <Progress 
                      value={capacity} 
                      className="h-1.5"
                      indicatorClassName={getCapacityBgColor(capacity)}
                    />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Technician capacity for tech view */}
        {userRole === "technician" && currentTechnicianId && (
          <Card className="mb-4 border-border/50 bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Your Schedule</p>
                    <p className="text-xs text-muted-foreground">
                      {getTasksForDay(new Date()).length} tasks today
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Gauge className="h-5 w-5 text-muted-foreground" />
                  <div className="text-right">
                    <p className={cn("text-2xl font-bold", getCapacityColor(getTechnicianCapacityToday(currentTechnicianId)))}>
                      {Math.round(getTechnicianCapacityToday(currentTechnicianId))}%
                    </p>
                    <p className="text-xs text-muted-foreground">Booked</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Timeline grid */}
        <ScrollArea className="flex-1">
          <div className="min-w-[900px]">
            {/* Header row with days */}
            <div className="flex border-b border-border/50 sticky top-0 bg-background z-10">
              <div className="w-32 shrink-0 p-2 border-r border-border/50" />
              {weekDates.map((date, i) => {
                const isToday = date.toDateString() === today.toDateString();
                const isWeekend = i === 5 || i === 6;
                return (
                  <div
                    key={date.toISOString()}
                    className={cn(
                      "flex-1 min-w-[100px] p-2 text-center border-r border-border/50",
                      isToday && "bg-primary/10",
                      isWeekend && "bg-muted/30"
                    )}
                  >
                    <div className="text-xs text-muted-foreground">{BG_WEEKDAYS_FULL[date.getDay()]}</div>
                    <div className={cn(
                      "text-lg font-bold",
                      isToday ? "text-primary" : "text-foreground"
                    )}>
                      {date.getDate()}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Technician rows */}
            {displayTechnicians.map(tech => (
              <div key={tech.id} className="flex border-b border-border/30 min-h-[80px]">
                {/* Technician name */}
                <div className="w-32 shrink-0 p-2 border-r border-border/50 flex items-center gap-2 bg-card/30">
                  <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium">
                    {tech.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <span className="text-sm font-medium truncate">{tech.name}</span>
                </div>

                {/* Day columns */}
                {weekDates.map((date, i) => {
                  const dayTasks = tasks.filter(t => {
                    const taskDate = new Date(t.start_time);
                    return t.technician_id === tech.id &&
                           taskDate.toDateString() === date.toDateString();
                  });
                  const isToday = date.toDateString() === today.toDateString();
                  const isWeekend = i === 5 || i === 6;

                  return (
                    <div
                      key={date.toISOString()}
                      className={cn(
                        "flex-1 min-w-[100px] p-1 border-r border-border/30 relative",
                        isToday && "bg-primary/5",
                        isWeekend && "bg-muted/20"
                      )}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, tech.id, date, 8)}
                    >
                      {/* Tasks */}
                      <div className="flex flex-col gap-1">
                        {dayTasks.map(task => {
                          const startTime = new Date(task.start_time);
                          const endTime = new Date(task.end_time);
                          const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
                          const isHighlighted = userRole === "technician" && task.technician_id === currentTechnicianId;

                          return (
                            <div
                              key={task.id}
                              draggable={userRole === "admin"}
                              onDragStart={(e) => handleDragStart(e, task)}
                              onClick={() => handleTaskClick(task)}
                              className={cn(
                                "rounded-md px-2 py-1 text-[10px] cursor-pointer transition-all border",
                                getStatusColor(task.status, task.priority),
                                isHighlighted && "ring-2 ring-primary ring-offset-1 ring-offset-background",
                                userRole === "admin" && "cursor-grab active:cursor-grabbing",
                                draggedTask?.id === task.id && "opacity-50"
                              )}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-medium truncate text-white">
                                  {task.title}
                                </span>
                                {userRole === "admin" && (
                                  <GripVertical className="h-3 w-3 opacity-50" />
                                )}
                              </div>
                              <div className="flex items-center gap-1 text-white/80">
                                <Clock className="h-2.5 w-2.5" />
                                <span>
                                  {startTime.getHours()}:00 - {duration}h
                                </span>
                              </div>
                            </div>
                          );
                        })}

                        {/* Empty slot indicator for admin */}
                        {dayTasks.length === 0 && userRole === "admin" && !isWeekend && (
                          <div className="h-12 rounded border-2 border-dashed border-border/30 flex items-center justify-center text-xs text-muted-foreground">
                            Available
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/50">
        <div className="flex items-center gap-4">
          {/* View mode toggle */}
          <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
            <button
              onClick={() => setViewMode("monthly")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                viewMode === "monthly"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Monthly</span>
            </button>
            <button
              onClick={() => setViewMode("weekly")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                viewMode === "weekly"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <CalendarDays className="h-4 w-4" />
              <span className="hidden sm:inline">Weekly</span>
            </button>
          </div>

          {/* Month/Week navigation */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={goToPrevious} className="h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-[140px] text-center">
              <span className="font-semibold">
                {viewMode === "monthly" 
                  ? `${BG_MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`
                  : `Week of ${currentDate.getDate()} ${BG_MONTHS[currentDate.getMonth()]}`
                }
              </span>
            </div>
            <Button variant="outline" size="icon" onClick={goToNext} className="h-8 w-8">
              <ChevronRight className="h-4 w-4" />
            </Button>
<Button variant="outline" size="sm" onClick={goToToday} className="hidden sm:flex">
                Днес
              </Button>
          </div>
        </div>

        {/* Live sync indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className={cn(
              "h-2 w-2 rounded-full",
              isLive ? "bg-emerald-500 animate-pulse" : "bg-muted"
            )} />
            <span className="text-xs text-muted-foreground">
              {isLive ? "Live Sync" : "Offline"}
            </span>
            {isLive && (
              <Radio className="h-3 w-3 text-emerald-500" />
            )}
          </div>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            Last: {lastSync.toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 pt-4 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : viewMode === "monthly" ? (
          renderMonthlyView()
        ) : (
          renderWeeklyView()
        )}
      </div>

      {/* Task Detail Side Panel */}
      <AnimatePresence>
        {isPanelOpen && selectedTask && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setIsPanelOpen(false)}
            />

            {/* Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 w-full sm:w-96 bg-card border-l border-border z-50 overflow-y-auto"
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-foreground">{selectedTask.title}</h2>
                    {getStatusBadge(selectedTask.status, selectedTask.priority)}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsPanelOpen(false)}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                {/* Details */}
                <div className="space-y-4">
                  {/* Machine Info */}
                  <Card className="border-border/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Wrench className="h-4 w-4 text-primary" />
                        Machine Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Hash className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Model:</span>
                        <span className="font-medium">{selectedTask.machine_model || "N/A"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Serial:</span>
                        <span className="font-medium">{selectedTask.serial_number || "N/A"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Client:</span>
                        <span className="font-medium">{selectedTask.client_name || "N/A"}</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Schedule Info */}
                  <Card className="border-border/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Clock className="h-4 w-4 text-primary" />
                        Schedule
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Date:</span>
                        <span className="font-medium">
                          {new Date(selectedTask.start_time).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Time:</span>
                        <span className="font-medium">
                          {new Date(selectedTask.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {" - "}
                          {new Date(selectedTask.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Technician:</span>
                        <span className="font-medium">{selectedTask.technician_name}</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Description */}
                  {selectedTask.description && (
                    <Card className="border-border/50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          Description
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          {selectedTask.description}
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Action Button */}
                  {selectedTask.job_card_id && (
                    <Link href={`/technician?editId=${selectedTask.job_card_id}`} className="block">
                      <Button className="w-full gap-2 bg-primary hover:bg-primary/90">
                        <ExternalLink className="h-4 w-4" />
                        Open Job Card
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
