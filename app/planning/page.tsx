"use client";

import { useState, Component, type ReactNode } from "react";
import { ChevronRight, ChevronLeft, Home, Calendar, Users, AlertTriangle, Columns3, Clock, CalendarDays, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ManagerLayout } from "@/components/layout/manager-layout";
import { LiveDispatcher } from "@/components/planning/live-dispatcher";
import { ServicePlanningCalendar } from "@/components/planning/service-planning-calendar";
import { KanbanBoard } from "@/components/planning/kanban-board";

// Error Boundary to catch and display errors
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-lg font-semibold text-red-600 mb-2">Грешка при зареждане</h2>
          <p className="text-sm text-muted-foreground mb-4 max-w-md">
            {this.state.error?.message || "Възникна неочаквана грешка"}
          </p>
          <button 
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
          >
            Опитай отново
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// VIEW TYPES - Matching reference structure exactly
// ─────────────────────────────────────────────────────────────────────────────

// Main category tabs
type MainCategory = "technicians" | "service" | "statuses";

// Sub-views for each category
type TechnicianSubView = "daily" | "weekly" | "monthly";
type ServiceSubView = "weekly" | "monthly";
type StatusSubView = "kanban";

interface ViewState {
  mainCategory: MainCategory;
  technicianView: TechnicianSubView;
  serviceView: ServiceSubView;
  statusView: StatusSubView;
  selectedDate: Date;
}

export default function PlanningBoardPage() {
  const [viewState, setViewState] = useState<ViewState>({
    mainCategory: "technicians",
    technicianView: "daily",
    serviceView: "weekly",
    statusView: "kanban",
    selectedDate: new Date(),
  });

  const [searchQuery, setSearchQuery] = useState("");

  // Date navigation
  const goToPreviousDay = () => {
    setViewState(prev => ({
      ...prev,
      selectedDate: new Date(prev.selectedDate.getTime() - 24 * 60 * 60 * 1000)
    }));
  };

  const goToNextDay = () => {
    setViewState(prev => ({
      ...prev,
      selectedDate: new Date(prev.selectedDate.getTime() + 24 * 60 * 60 * 1000)
    }));
  };

  const goToToday = () => {
    setViewState(prev => ({
      ...prev,
      selectedDate: new Date()
    }));
  };

  // Format date for display (Bulgarian) - "25.03.2026 г."
  const formattedDate = viewState.selectedDate.toLocaleDateString("bg-BG", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }) + " г.";

  // Check if current date is today
  const isToday = viewState.selectedDate.toDateString() === new Date().toDateString();

  // Get current active view for rendering
  const getCurrentView = () => {
    if (viewState.mainCategory === "technicians") {
      return viewState.technicianView;
    } else if (viewState.mainCategory === "service") {
      return viewState.serviceView;
    } else {
      return viewState.statusView;
    }
  };

  return (
    <ManagerLayout userRole="admin" userName="Service Manager">
      {/* Main Tab Navigation - Matching reference exactly */}
      <div className="border-b border-border bg-card px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left side: График label + Main tabs with sub-tabs */}
          <div className="flex items-center gap-6">
            {/* График label */}
            <span className="text-sm font-medium text-muted-foreground">График</span>

            {/* Main category tabs with sub-tabs */}
            <div className="flex items-center">
              {/* ПО ТЕХНИЦИ section */}
              <div className="flex items-center border-r border-border pr-4">
                <div className="flex items-center gap-1 mr-3">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">По техници</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-7 px-3 text-xs",
                      viewState.mainCategory === "technicians" && viewState.technicianView === "daily"
                        ? "bg-foreground text-background hover:bg-foreground/90"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => setViewState(prev => ({ ...prev, mainCategory: "technicians", technicianView: "daily" }))}
                  >
                    Дневен
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-7 px-3 text-xs",
                      viewState.mainCategory === "technicians" && viewState.technicianView === "weekly"
                        ? "bg-foreground text-background hover:bg-foreground/90"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => setViewState(prev => ({ ...prev, mainCategory: "technicians", technicianView: "weekly" }))}
                  >
                    Седмичен
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-7 px-3 text-xs",
                      viewState.mainCategory === "technicians" && viewState.technicianView === "monthly"
                        ? "bg-foreground text-background hover:bg-foreground/90"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => setViewState(prev => ({ ...prev, mainCategory: "technicians", technicianView: "monthly" }))}
                  >
                    Месечен
                  </Button>
                </div>
              </div>

              {/* ПО ВРЕМЕ (СЕРВИЗ) section */}
              <div className="flex items-center border-r border-border px-4">
                <div className="flex items-center gap-1 mr-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">По време (сервиз)</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-7 px-3 text-xs",
                      viewState.mainCategory === "service" && viewState.serviceView === "weekly"
                        ? "bg-foreground text-background hover:bg-foreground/90"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => setViewState(prev => ({ ...prev, mainCategory: "service", serviceView: "weekly" }))}
                  >
                    Седмичен
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-7 px-3 text-xs",
                      viewState.mainCategory === "service" && viewState.serviceView === "monthly"
                        ? "bg-foreground text-background hover:bg-foreground/90"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => setViewState(prev => ({ ...prev, mainCategory: "service", serviceView: "monthly" }))}
                  >
                    Месечен
                  </Button>
                </div>
              </div>

              {/* СТАТУСИ section */}
              <div className="flex items-center pl-4">
                <div className="flex items-center gap-1 mr-3">
                  <Columns3 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Статуси</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-7 px-3 text-xs",
                      viewState.mainCategory === "statuses"
                        ? "bg-foreground text-background hover:bg-foreground/90"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => setViewState(prev => ({ ...prev, mainCategory: "statuses" }))}
                  >
                    Kanban
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Right side: Search bar */}
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Търси поръчка, клиент, рама..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-9 text-sm bg-secondary/50"
            />
          </div>
        </div>
      </div>

      {/* Date Navigation Row - Below tabs */}
      <div className="border-b border-border bg-card/50 px-4 py-2">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={goToPreviousDay}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground min-w-[100px]">
              {formattedDate}
            </span>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground"
          >
            <CalendarDays className="h-5 w-5" />
          </Button>

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
              className="ml-2 h-7 text-xs"
            >
              Днес
            </Button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden">
        <ErrorBoundary>
          {/* ПО ТЕХНИЦИ - Daily View (Gantt) */}
          {viewState.mainCategory === "technicians" && viewState.technicianView === "daily" && (
            <div className="h-full">
              <LiveDispatcher selectedDate={viewState.selectedDate} />
            </div>
          )}

          {/* ПО ТЕХНИЦИ - Weekly View */}
          {viewState.mainCategory === "technicians" && viewState.technicianView === "weekly" && (
            <div className="h-full p-4">
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Седмичен изглед по техници - ще бъде добавен
              </div>
            </div>
          )}

          {/* ПО ТЕХНИЦИ - Monthly View */}
          {viewState.mainCategory === "technicians" && viewState.technicianView === "monthly" && (
            <div className="h-full p-4">
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Месечен изглед по техници - ще бъде добавен
              </div>
            </div>
          )}

          {/* ПО ВРЕМЕ (СЕРВИЗ) - Weekly View */}
          {viewState.mainCategory === "service" && viewState.serviceView === "weekly" && (
            <div className="h-full">
              <ServicePlanningCalendar userRole="admin" viewMode="weekly" />
            </div>
          )}

          {/* ПО ВРЕМЕ (СЕРВИЗ) - Monthly View */}
          {viewState.mainCategory === "service" && viewState.serviceView === "monthly" && (
            <div className="h-full">
              <ServicePlanningCalendar userRole="admin" viewMode="monthly" />
            </div>
          )}

          {/* СТАТУСИ - Kanban View */}
          {viewState.mainCategory === "statuses" && (
            <div className="h-full">
              <KanbanBoard />
            </div>
          )}
        </ErrorBoundary>
      </main>
    </ManagerLayout>
  );
}
