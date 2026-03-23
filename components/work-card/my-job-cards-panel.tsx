"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  ClipboardList,
  Plus,
  ChevronRight,
  Tractor,
  User,
  Hash,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Mock data types
interface JobCardItem {
  id: string;
  jobCardNumber: string;
  machineModel: string;
  clientName: string;
  status: "draft" | "in_progress" | "assigned";
  createdAt: string;
  scheduledAt?: string; // For assigned tasks - when they are scheduled
}

// Mock data for demonstration
const mockInProgressCards: JobCardItem[] = [
  {
    id: "temp-001",
    jobCardNumber: "TEMP-2026-001",
    machineModel: "John Deere 8R 410",
    clientName: "Агро СИП ЕООД",
    status: "draft",
    createdAt: new Date().toISOString(),
  },
  {
    id: "temp-002",
    jobCardNumber: "TEMP-2026-002",
    machineModel: "John Deere S790",
    clientName: "Зърнени Култури АД",
    status: "in_progress",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "temp-003",
    jobCardNumber: "DRAFT",
    machineModel: "John Deere 6M 185",
    clientName: "Био Ферма ООД",
    status: "draft",
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
];

const mockAssignedCards: JobCardItem[] = [
  {
    id: "assigned-001",
    jobCardNumber: "JC-2026-0145",
    machineModel: "John Deere 9RX 640",
    clientName: "Мега Агро ЕООД",
    status: "assigned",
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    scheduledAt: "Утре, 08:30",
  },
  {
    id: "assigned-002",
    jobCardNumber: "JC-2026-0146",
    machineModel: "John Deere 7R 350",
    clientName: "Агрохолдинг България",
    status: "assigned",
    createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    scheduledAt: "24.03.2026, 13:00",
  },
];

interface MyJobCardsPanelProps {
  onNewJobCard: () => void;
  onSelectJobCard?: (jobCardId: string) => void;
}

export function MyJobCardsPanel({ onNewJobCard, onSelectJobCard }: MyJobCardsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  const totalPending = mockInProgressCards.length + mockAssignedCards.length;

  const handleNewJobCard = () => {
    onNewJobCard();
    setIsOpen(false);
  };

  const handleSelectCard = (jobCard: JobCardItem) => {
    onSelectJobCard?.(jobCard.id);
    setIsOpen(false);
  };

  // Format relative time
  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Сега";
    if (diffMins < 60) return `Преди ${diffMins} мин`;
    if (diffHours < 24) return `Преди ${diffHours} ч`;
    if (diffDays < 7) return `Преди ${diffDays} дни`;
    return date.toLocaleDateString("bg-BG", { month: "short", day: "numeric" });
  };

  return (
    <>
      {/* Trigger Button - Visible with outline style */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="relative h-10 gap-2 px-3 rounded-lg border-primary/50 bg-primary/5 hover:bg-primary/10 hover:border-primary active:scale-95 transition-all"
        aria-label="My Job Cards"
      >
        <ClipboardList className="h-5 w-5 text-primary" />
        <span className="text-sm font-medium text-foreground">Моите Карти</span>
        
        {/* Pending Count Badge */}
        {totalPending > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {totalPending > 9 ? "9+" : totalPending}
            </span>
          </span>
        )}
      </Button>

      {/* Sheet Panel */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
          {/* Header */}
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <ClipboardList className="h-6 w-6 text-primary" />
              </div>
              <div>
                <SheetTitle className="text-xl font-bold text-foreground">
                  Моите Карти
                </SheetTitle>
                <SheetDescription className="text-sm text-muted-foreground">
                  {totalPending} активни задачи
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {/* New Job Card Button */}
          <div className="px-4 py-4 border-b border-border/50">
            <Button
              onClick={handleNewJobCard}
              className="w-full h-14 gap-3 text-base font-bold bg-primary hover:bg-primary/90 active:scale-[0.98] transition-all"
            >
              <Plus className="h-6 w-6" />
              Нова Работна Карта
            </Button>
          </div>

          {/* Job Cards List - Scrollable container */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-6 pb-8">
              {/* In Progress / Drafts Section */}
              <section>
                <div className="flex items-center gap-2 mb-3 px-1">
                  <div className="h-2 w-2 rounded-full bg-amber-500" />
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    В процес / Чернови
                  </h3>
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {mockInProgressCards.length}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <AnimatePresence>
                    {mockInProgressCards.map((card, index) => (
                      <motion.div
                        key={card.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <JobCardListItem
                          card={card}
                          indicatorColor="amber"
                          onClick={() => handleSelectCard(card)}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </section>

              {/* Assigned Section */}
              <section>
                <div className="flex items-center gap-2 mb-3 px-1">
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Възложени
                  </h3>
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {mockAssignedCards.length}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <AnimatePresence>
                    {mockAssignedCards.map((card, index) => (
                      <motion.div
                        key={card.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 + mockInProgressCards.length * 0.05 }}
                      >
                        <JobCardListItem
                          card={card}
                          indicatorColor="blue"
                          onClick={() => handleSelectCard(card)}
                          showSchedule={true}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </section>
              </div>
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

// Individual Job Card List Item
interface JobCardListItemProps {
  card: JobCardItem;
  indicatorColor: "amber" | "blue";
  onClick: () => void;
  showSchedule?: boolean;
}

function JobCardListItem({ card, indicatorColor, onClick, showSchedule = false }: JobCardListItemProps) {
  const isDraft = card.status === "draft" || card.jobCardNumber === "DRAFT";

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-4 rounded-xl border transition-all",
        "bg-card hover:bg-accent/50 hover:border-primary/30",
        "active:scale-[0.98] cursor-pointer",
        "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Status Indicator */}
        <div className="relative mt-1">
          <div
            className={cn(
              "h-3 w-3 rounded-full",
              indicatorColor === "amber" ? "bg-amber-500" : "bg-blue-500"
            )}
          />
          {isDraft && (
            <div
              className={cn(
                "absolute inset-0 h-3 w-3 rounded-full animate-ping",
                indicatorColor === "amber" ? "bg-amber-500" : "bg-blue-500",
                "opacity-75"
              )}
            />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Job Card Number */}
          <div className="flex items-center gap-2 mb-1">
            <Hash className="h-3.5 w-3.5 text-muted-foreground" />
            <span
              className={cn(
                "font-mono text-sm font-semibold",
                isDraft ? "text-amber-500" : "text-foreground"
              )}
            >
              {card.jobCardNumber}
            </span>
            {isDraft && (
              <Badge
                variant="outline"
                className="text-[10px] h-5 border-amber-500/50 text-amber-500"
              >
                Чернова
              </Badge>
            )}
          </div>

          {/* Machine Model */}
          <div className="flex items-center gap-2 mb-1">
            <Tractor className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground truncate">
              {card.machineModel}
            </span>
          </div>

          {/* Client Name */}
          <div className="flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground truncate">
              {card.clientName}
            </span>
          </div>

          {/* Schedule Info - Only for assigned cards */}
          {showSchedule && card.scheduledAt && (
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50">
              <Calendar className="h-3.5 w-3.5 text-blue-400" />
              <span className="text-xs text-muted-foreground/80 font-medium">
                {card.scheduledAt}
              </span>
            </div>
          )}
        </div>

        {/* Chevron */}
        <ChevronRight className="h-5 w-5 text-muted-foreground mt-2" />
      </div>
    </button>
  );
}
