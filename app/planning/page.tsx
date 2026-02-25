"use client";

import { useState } from "react";
import { Wrench, ChevronRight, Home, Calendar, Users, Clock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { WorkshopDiary } from "@/components/planning/workshop-diary";
import { TechnicianRoster } from "@/components/planning/technician-roster";
import { DragDropScheduler } from "@/components/planning/drag-drop-scheduler";
import { HourlyGantt } from "@/components/planning/hourly-gantt"; // Import HourlyGantt

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

export default function PlanningBoardPage() {
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

          <Link href="/">
            <Button variant="outline" size="sm" className="bg-transparent">
              Работна Карта
            </Button>
          </Link>
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

        {/* Level 3: Drag & Drop Scheduler */}
        {navigation.level === "gantt" &&
          navigation.selectedDate && (
            <div className="flex h-[calc(100vh-220px)] flex-col gap-4">
              <Button
                onClick={navigateToDiary}
                variant="outline"
                className="w-fit gap-2 bg-transparent"
              >
                <ArrowLeft className="h-4 w-4" />
                Обратно към Дневник
              </Button>
              <DragDropScheduler selectedDate={navigation.selectedDate} />
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
            <span>Часова схема</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
