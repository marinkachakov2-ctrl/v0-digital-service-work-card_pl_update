"use client";

import { useState } from "react";
import { Wrench, ChevronRight, Home, Calendar, Users, Clock, ArrowLeft, LayoutGrid, GanttChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { WorkshopDiary } from "@/components/planning/workshop-diary";
import { TechnicianRoster } from "@/components/planning/technician-roster";
import { DragDropScheduler } from "@/components/planning/drag-drop-scheduler";
import { HourlyGantt } from "@/components/planning/hourly-gantt";
import { WeeklyTaskView, type WeeklyTask, type WeeklyNote } from "@/components/planning/weekly-task-view";
import { ServiceWideView, type ServiceTask } from "@/components/planning/service-wide-view";

type ViewLevel = "diary" | "roster" | "gantt";

interface NavigationState {
  level: ViewLevel;
  selectedDate: Date | null;
  selectedTechnicianId: string | null;
  selectedTechnicianName: string | null;
}

const BG_WEEKDAYS = ["неделя","понеделник","вторник","сряда","четвъртък","петък","събота"];
const BG_MONTHS = ["януари","февруари","март","април","май","юни","юли","август","септември","октомври","ноември","декември"];

// Technician name lookup
const technicianNames: Record<string, string> = {
  "tech-1": "Иван Петров",
  "tech-2": "Георги Иванов",
  "tech-3": "Петър Стоянов",
  "tech-4": "Димитър Колев",
  "tech-5": "Николай Димов",
  "tech-6": "Стефан Георгиев",
};

// Technician list for weekly task view
const weeklyTechnicians = [
  { id: "tech-1", name: "Иван Петров" },
  { id: "tech-2", name: "Георги Иванов" },
  { id: "tech-3", name: "Петър Стоянов" },
  { id: "tech-4", name: "Стефан Георгиев" },
];

// Initial weekly tasks (synced from DragDropScheduler data)
const initialWeeklyTasks: WeeklyTask[] = [
  {
    id: "wt1", orderId: "#12345", orderNumber: "ON-5521", jobCardNumber: "JC-0012",
    technicianId: "tech-1", type: "service", status: "completed",
    startHour: 8, startMinute: 0, durationMinutes: 120,
    description: "Смяна на масло", dayIndex: 0,
  },
  {
    id: "wt2", orderId: "#12346", orderNumber: "ON-5521", jobCardNumber: "JC-0013",
    technicianId: "tech-1", type: "repair", status: "active",
    startHour: 13, startMinute: 0, durationMinutes: 180,
    description: "Ремонт на двигател", dayIndex: 0,
  },
  {
    id: "wt3", orderId: "#12347", orderNumber: "ON-5523", jobCardNumber: "JC-0014",
    technicianId: "tech-2", type: "inspection", status: "completed",
    startHour: 9, startMinute: 30, durationMinutes: 90,
    description: "Годишен преглед", dayIndex: 1,
  },
  {
    id: "wt4", orderId: "#12348", orderNumber: "ON-5524", jobCardNumber: "JC-0015",
    technicianId: "tech-3", type: "service", status: "overdue",
    startHour: 7, startMinute: 0, durationMinutes: 240,
    description: "Ремонт на хидравлика", dayIndex: 2,
  },
  {
    id: "wt5", orderId: "#12349", orderNumber: "ON-5525", jobCardNumber: "JC-0016",
    technicianId: "tech-4", type: "repair", status: "pending",
    startHour: 10, startMinute: 0, durationMinutes: 150,
    description: "Ремонт на трансмисия", dayIndex: 3,
  },
];

const initialWeeklyNotes: WeeklyNote[] = [
  { id: "wn1", text: "Обади се на Иванов за части", dayIndex: 0 },
  { id: "wn2", text: "Провери наличност на филтри", dayIndex: 2 },
];

// Service-wide tasks (all technicians view)
const initialServiceTasks: ServiceTask[] = [
  // Unassigned tasks (RED)
  {
    id: "st1", orderId: "#12350", orderNumber: "ON-5530", jobCardNumber: "JC-0020",
    technicianId: null, type: "repair", status: "pending",
    startHour: 9, startMinute: 0, durationMinutes: 180,
    description: "Ремонт на хидравлична система", dayIndex: 0,
    machine: "CAT 320D", customer: "Агро ООД",
  },
  {
    id: "st2", orderId: "#12351", orderNumber: "ON-5531", jobCardNumber: "JC-0021",
    technicianId: null, type: "service", status: "pending",
    startHour: 14, startMinute: 0, durationMinutes: 120,
    description: "Профилактика на двигател", dayIndex: 1,
    machine: "Komatsu PC200", customer: "Строй Инвест",
  },
  // Assigned but pending (YELLOW)
  {
    id: "st3", orderId: "#12352", orderNumber: "ON-5532", jobCardNumber: "JC-0022",
    technicianId: "tech-1", type: "inspection", status: "pending",
    startHour: 8, startMinute: 0, durationMinutes: 90,
    description: "Годишен технически преглед", dayIndex: 0,
    machine: "Volvo EC220", customer: "Минстрой АД",
  },
  {
    id: "st4", orderId: "#12353", orderNumber: "ON-5533", jobCardNumber: "JC-0023",
    technicianId: "tech-2", type: "repair", status: "pending",
    startHour: 10, startMinute: 30, durationMinutes: 240,
    description: "Смяна на ходова част", dayIndex: 2,
    machine: "Hitachi ZX350", customer: "Еко Транс",
  },
  // In Progress (GREEN)
  {
    id: "st5", orderId: "#12354", orderNumber: "ON-5534", jobCardNumber: "JC-0024",
    technicianId: "tech-1", type: "repair", status: "active",
    startHour: 13, startMinute: 0, durationMinutes: 180,
    description: "Ремонт на турбо", dayIndex: 0,
    machine: "CAT 966H", customer: "Агро ООД",
  },
  {
    id: "st6", orderId: "#12355", orderNumber: "ON-5535", jobCardNumber: "JC-0025",
    technicianId: "tech-3", type: "service", status: "active",
    startHour: 7, startMinute: 30, durationMinutes: 150,
    description: "Смяна на масло и филтри", dayIndex: 1,
    machine: "Liebherr R944", customer: "Строй Инвест",
  },
  // Completed (BLUE)
  {
    id: "st7", orderId: "#12356", orderNumber: "ON-5536", jobCardNumber: "JC-0026",
    technicianId: "tech-2", type: "service", status: "completed",
    startHour: 8, startMinute: 0, durationMinutes: 120,
    description: "Диагностика на електрика", dayIndex: 0,
    machine: "JCB 3CX", customer: "Минстрой АД",
  },
  // More unassigned
  {
    id: "st8", orderId: "#12357", orderNumber: "ON-5537", jobCardNumber: "JC-0027",
    technicianId: null, type: "repair", status: "pending",
    startHour: 11, startMinute: 0, durationMinutes: 300,
    description: "Основен ремонт на двигател", dayIndex: 3,
    machine: "Volvo A40", customer: "Еко Транс",
  },
  // More tasks for variety
  {
    id: "st9", orderId: "#12358", orderNumber: "ON-5538", jobCardNumber: "JC-0028",
    technicianId: "tech-4", type: "inspection", status: "pending",
    startHour: 9, startMinute: 0, durationMinutes: 60,
    description: "Проверка на спирачна система", dayIndex: 4,
    machine: "Doosan DX225", customer: "Агро ООД",
  },
  {
    id: "st10", orderId: "#12359", orderNumber: "ON-5539", jobCardNumber: "JC-0029",
    technicianId: "tech-1", type: "repair", status: "pending",
    startHour: 8, startMinute: 0, durationMinutes: 480,
    description: "Ремонт на стрела", dayIndex: 5,
    machine: "Hyundai R210", customer: "Строй Инвест",
  },
];

export default function PlanningBoardPage() {
  const [planView, setPlanView] = useState<"gantt" | "task" | "service">("gantt");
  const [weeklyTasks, setWeeklyTasks] = useState<WeeklyTask[]>(initialWeeklyTasks);
  const [weeklyNotes, setWeeklyNotes] = useState<WeeklyNote[]>(initialWeeklyNotes);
  const [serviceTasks, setServiceTasks] = useState<ServiceTask[]>(initialServiceTasks);

  const [navigation, setNavigation] = useState<NavigationState>({
    level: "diary",
    selectedDate: null,
    selectedTechnicianId: null,
    selectedTechnicianName: null,
  });

  const handleSelectDay = (date: Date) => {
    setNavigation({
      level: "roster",
      selectedDate: date,
      selectedTechnicianId: null,
      selectedTechnicianName: null,
    });
  };

  const handleSelectTechnician = (technicianId: string) => {
    setNavigation((prev) => ({
      ...prev,
      level: "gantt",
      selectedTechnicianId: technicianId,
      selectedTechnicianName: technicianNames[technicianId] || "Техник",
    }));
  };

  const navigateToDiary = () => {
    setNavigation({
      level: "diary",
      selectedDate: null,
      selectedTechnicianId: null,
      selectedTechnicianName: null,
    });
  };

  const navigateToRoster = () => {
    setNavigation((prev) => ({
      ...prev,
      level: "roster",
      selectedTechnicianId: null,
      selectedTechnicianName: null,
    }));
  };

  // Format date for breadcrumb (deterministic to avoid hydration issues)
  const formatBreadcrumbDate = (date: Date) => {
    return `${BG_WEEKDAYS[date.getDay()]}, ${date.getDate()} ${BG_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary">
              <Wrench className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-foreground">
                Megatron EAD
              </h1>
              <p className="text-xs text-muted-foreground">
                Планиране на работилница
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/admin">
              <Button variant="outline" size="sm" className="bg-transparent">
                Admin
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" size="sm" className="bg-transparent">
                Работна Карта
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Breadcrumbs */}
      <div className="border-b border-border bg-secondary/30 px-4 py-2">
        <nav className="flex items-center gap-1 text-sm">
          <button
            type="button"
            onClick={navigateToDiary}
            className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            <Home className="h-4 w-4" />
            <span>Табло</span>
          </button>

          {navigation.level !== "diary" && (
            <>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <button
                type="button"
                onClick={navigation.level === "gantt" ? navigateToRoster : undefined}
                className={`flex items-center gap-1 transition-colors ${
                  navigation.level === "roster"
                    ? "font-medium text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Calendar className="h-4 w-4" />
                <span className="capitalize">
                  {navigation.selectedDate
                    ? formatBreadcrumbDate(navigation.selectedDate)
                    : ""}
                </span>
              </button>
            </>
          )}

          {navigation.level === "gantt" && (
            <>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <span className="flex items-center gap-1 font-medium text-foreground">
                <Users className="h-4 w-4" />
                {navigation.selectedTechnicianName}
              </span>
            </>
          )}
        </nav>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4">
        {/* Level 1: Workshop Diary */}
        {navigation.level === "diary" && (
          <WorkshopDiary onSelectDay={handleSelectDay} />
        )}

        {/* Level 2: Technician Roster */}
        {navigation.level === "roster" && navigation.selectedDate && (
          <TechnicianRoster
            selectedDate={navigation.selectedDate}
            onSelectTechnician={handleSelectTechnician}
          />
        )}

        {/* Level 3: Scheduler with Gantt/Task toggle */}
        {navigation.level === "gantt" &&
          navigation.selectedDate && (
            <div className="flex h-[calc(100vh-220px)] flex-col gap-4">
              {/* Top bar: Back button + View toggle */}
              <div className="flex items-center justify-between">
                <Button
                  onClick={navigateToDiary}
                  variant="outline"
                  className="w-fit gap-2 bg-transparent"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Обратно към Дневник
                </Button>

                {/* View toggle */}
                <div className="flex items-center gap-1 rounded-lg border border-border bg-secondary/30 p-1">
                  <button
                    type="button"
                    onClick={() => setPlanView("gantt")}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                      planView === "gantt"
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <GanttChart className="h-3.5 w-3.5" />
                    Gantt
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlanView("task")}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                      planView === "task"
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    Седмица
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlanView("service")}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                      planView === "service"
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Users className="h-3.5 w-3.5" />
                    Всички техници
                  </button>
                </div>
              </div>

              {/* Gantt View */}
              {planView === "gantt" && (
                <DragDropScheduler selectedDate={navigation.selectedDate} />
              )}

              {/* Task View (Weekly Columns) */}
              {planView === "task" && (
                <WeeklyTaskView
                  tasks={weeklyTasks}
                  onTasksChange={setWeeklyTasks}
                  notes={weeklyNotes}
                  onNotesChange={setWeeklyNotes}
                  technicians={weeklyTechnicians}
                  selectedDate={navigation.selectedDate}
                />
              )}

              {/* Service-Wide View (All Technicians) */}
              {planView === "service" && (
                <ServiceWideView
                  tasks={serviceTasks}
                  onTasksChange={setServiceTasks}
                  technicians={weeklyTechnicians}
                  selectedDate={navigation.selectedDate}
                />
              )}
            </div>
          )}
      </main>

      {/* Level Indicator */}
      <footer className="border-t border-border bg-card px-4 py-2">
        <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
          <div
            className={`flex items-center gap-1.5 ${navigation.level === "diary" ? "text-primary" : ""}`}
          >
            <div
              className={`h-2 w-2 rounded-full ${navigation.level === "diary" ? "bg-primary" : "bg-muted"}`}
            />
            <span>Дневник</span>
          </div>
          <div
            className={`flex items-center gap-1.5 ${navigation.level === "roster" ? "text-primary" : ""}`}
          >
            <div
              className={`h-2 w-2 rounded-full ${navigation.level === "roster" ? "bg-primary" : "bg-muted"}`}
            />
            <span>Техници</span>
          </div>
          <div
            className={`flex items-center gap-1.5 ${navigation.level === "gantt" ? "text-primary" : ""}`}
          >
            <div
              className={`h-2 w-2 rounded-full ${navigation.level === "gantt" ? "bg-primary" : "bg-muted"}`}
            />
            <span>{navigation.level === "gantt" ? (planView === "service" ? "Всички техници" : planView === "task" ? "Седмичен план" : "Часова схема") : "Часова схема"}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
