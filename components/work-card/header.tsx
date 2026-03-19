"use client";

import { useState, useEffect } from "react";
import { Wrench, CalendarDays, ShieldCheck, Sun, Moon, MonitorPlay } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface WorkCardHeaderProps {
  orderNumber: string;
  jobCardNumber: string;
  isAdmin: boolean;
  onAdminToggle: (val: boolean) => void;
}

export function WorkCardHeader({
  orderNumber,
  jobCardNumber,
  isAdmin,
  onAdminToggle,
}: WorkCardHeaderProps) {
  const [currentDate, setCurrentDate] = useState("--/--/----");
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setCurrentDate(
      new Date().toLocaleDateString("bg-BG", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    );
  }, []);

  return (
    <header className="space-y-4">
      {/* Top Bar */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary">
            <Wrench className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">Megatron EAD</h1>
            <p className="text-xs text-muted-foreground">Работна Карта</p>
          </div>
        </div>

        {/* Order / JCN Display */}
        {(orderNumber || jobCardNumber) && (
          <div className="flex items-center gap-3">
            {orderNumber && (
              <div className="text-center">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Order #</p>
                <Badge variant="outline" className="font-mono text-xs">{orderNumber}</Badge>
              </div>
            )}
            {jobCardNumber && (
              <div className="text-center">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Job Card #</p>
                <Badge variant="secondary" className="font-mono text-xs">{jobCardNumber}</Badge>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-3">
          {/* Theme Switcher */}
          {mounted && (
            <div className="flex items-center gap-0.5 p-1 rounded-lg bg-muted/30 border border-border/50">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setTheme("light")}
                    className={cn(
                      "p-1.5 rounded-md transition-all",
                      theme === "light" 
                        ? "bg-background shadow-sm text-amber-500" 
                        : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                    )}
                  >
                    <Sun className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">Light Mode</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setTheme("dark")}
                    className={cn(
                      "p-1.5 rounded-md transition-all",
                      theme === "dark" 
                        ? "bg-background shadow-sm text-primary" 
                        : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                    )}
                  >
                    <Moon className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">Dark Mode</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setTheme("presentation")}
                    className={cn(
                      "p-1.5 rounded-md transition-all",
                      theme === "presentation" 
                        ? "bg-background shadow-sm text-[#367C2B]" 
                        : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                    )}
                  >
                    <MonitorPlay className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">Presentation Mode</TooltipContent>
              </Tooltip>
            </div>
          )}

          {/* Admin Override Indicator */}
          {isAdmin && (
            <Badge variant="outline" className="gap-1 text-xs border-amber-500/30 text-amber-500">
              <ShieldCheck className="h-3 w-3" />
              Admin Edit
            </Badge>
          )}
          {/* Admin Toggle */}
          <div className="flex items-center gap-2">
            <Switch
              id="admin-toggle"
              checked={isAdmin}
              onCheckedChange={onAdminToggle}
              className="data-[state=checked]:bg-amber-500"
            />
            <Label htmlFor="admin-toggle" className="text-xs text-muted-foreground cursor-pointer">
              {isAdmin ? "Admin" : "Tech"}
            </Label>
          </div>

          {/* Notification Center */}
          <NotificationCenter />

          <Link href="/planning">
            <Button variant="outline" size="sm" className="gap-1.5 bg-transparent">
              <CalendarDays className="h-4 w-4" />
              <span className="hidden sm:inline">Планиране</span>
            </Button>
          </Link>
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-foreground">{currentDate}</p>
            <p className="text-xs text-muted-foreground">Дата</p>
          </div>
        </div>
      </div>
    </header>
  );
}
