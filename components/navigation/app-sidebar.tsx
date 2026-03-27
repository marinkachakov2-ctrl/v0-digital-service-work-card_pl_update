"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarRange,
  FileClock,
  ClipboardList,
  Archive,
  Wrench,
  CheckSquare,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Settings,
  User,
  Zap,
  Radar,
  Sun,
  Moon,
  MonitorPlay,
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

// Types
type UserRole = "admin" | "tech";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: string | number;
  badgeVariant?: "default" | "warning" | "success" | "destructive";
  isLive?: boolean;
  roles: UserRole[];
}

interface AppSidebarProps {
  userRole?: UserRole;
  userName?: string;
  userAvatar?: string;
  onRoleChange?: (role: UserRole) => void;
  pendingCardsCount?: number;
}

// Navigation items configuration
const primaryNavItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/app",
    icon: LayoutDashboard,
    roles: ["admin", "tech"],
  },
  {
    title: "Planning & Calendar",
    href: "/planning",
    icon: CalendarRange,
    isLive: true,
    roles: ["admin", "tech"],
  },
];

const serviceManagementItems: NavItem[] = [
  {
    title: "Fleet Intelligence",
    href: "/admin/fleet",
    icon: Radar,
    isLive: true,
    roles: ["admin"],
  },
  {
    title: "Pending Cards",
    href: "/admin/queue",
    icon: FileClock,
    badge: "1",
    badgeVariant: "warning",
    roles: ["admin"],
  },
  {
    title: "Proposals Queue",
    href: "/admin/queue/proposals",
    icon: ClipboardList,
    roles: ["admin"],
  },
];

const archiveReportsItems: NavItem[] = [
  {
    title: "Financial KPI Reports",
    href: "/admin/manager",
    icon: LayoutDashboard,
    roles: ["admin"],
  },
  {
    title: "Archive & Reports",
    href: "/admin/queue/archive",
    icon: Archive,
    roles: ["admin"],
  },
];

const technicianToolsItems: NavItem[] = [
  {
    title: "Active Work Card",
    href: "/technician",
    icon: Wrench,
    roles: ["tech", "admin"],
  },
  {
    title: "14-Point Inspection",
    href: "/technician#free-check",
    icon: CheckSquare,
    roles: ["tech"],
  },
];

// Sidebar content component
function SidebarNavContent({
  userRole,
  userName,
  userAvatar,
  onRoleChange,
  pendingCardsCount,
}: AppSidebarProps) {
  const pathname = usePathname();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Filter nav items based on role
  const filterByRole = (items: NavItem[]) =>
    items.filter((item) => item.roles.includes(userRole || "tech"));

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  // Render nav item
  const renderNavItem = (item: NavItem) => {
    const active = isActive(item.href);
    const actualBadge = item.title === "Pending Cards" && pendingCardsCount !== undefined 
      ? pendingCardsCount 
      : item.badge;

    return (
      <SidebarMenuItem key={item.href}>
        <Tooltip>
          <TooltipTrigger asChild>
            <SidebarMenuButton
              asChild
              isActive={active}
              className={cn(
                "relative group transition-all duration-200",
                active && "bg-primary/10 text-primary border-l-2 border-primary shadow-[inset_0_0_12px_rgba(34,197,94,0.1)]",
                !active && "hover:bg-muted/50"
              )}
            >
              <Link href={item.href} className="flex items-center gap-3">
                <item.icon className={cn(
                  "h-5 w-5 shrink-0",
                  active ? "text-primary" : "text-muted-foreground"
                )} />
                {!isCollapsed && (
                  <>
                    <span className={cn(
                      "flex-1 truncate",
                      active && "font-medium text-primary"
                    )}>
                      {item.title}
                    </span>
                    
                    {/* Live indicator */}
                    {item.isLive && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </span>
                    )}
                    
                    {/* Badge */}
                    {actualBadge && (
                      <Badge
                        variant="outline"
                        className={cn(
                          "ml-auto h-5 min-w-[20px] justify-center text-xs font-medium",
                          item.badgeVariant === "warning" && "border-amber-500/50 bg-amber-500/10 text-amber-500",
                          item.badgeVariant === "success" && "border-emerald-500/50 bg-emerald-500/10 text-emerald-500",
                          item.badgeVariant === "destructive" && "border-red-500/50 bg-red-500/10 text-red-500"
                        )}
                      >
                        {actualBadge}
                      </Badge>
                    )}
                  </>
                )}
              </Link>
            </SidebarMenuButton>
          </TooltipTrigger>
          {isCollapsed && (
            <TooltipContent side="right" className="flex items-center gap-2">
              {item.title}
              {item.isLive && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
              )}
              {actualBadge && (
                <Badge variant="outline" className="text-xs">
                  {actualBadge}
                </Badge>
              )}
            </TooltipContent>
          )}
        </Tooltip>
      </SidebarMenuItem>
    );
  };

  return (
    <>
      {/* Header */}
      <SidebarHeader className="border-b border-border/50 px-4 py-4">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
            <Zap className="h-6 w-6 text-primary" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-foreground tracking-tight">Megatron</span>
              <span className="text-xs text-muted-foreground">Digital Service</span>
            </div>
          )}
        </div>

        {/* Role Switcher */}
        {!isCollapsed && (
          <div className="mt-4">
            <button
              onClick={() => onRoleChange?.(userRole === "admin" ? "tech" : "admin")}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-colors",
                userRole === "admin" 
                  ? "border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10" 
                  : "border-primary/30 bg-primary/5 hover:bg-primary/10"
              )}
            >
              <span className="text-xs text-muted-foreground">Mode:</span>
              <Badge 
                variant="outline" 
                className={cn(
                  "text-xs font-semibold",
                  userRole === "admin" 
                    ? "border-amber-500/50 text-amber-500" 
                    : "border-primary/50 text-primary"
                )}
              >
                {userRole === "admin" ? "Admin" : "Technician"}
              </Badge>
            </button>
          </div>
        )}

        {/* Theme Switcher */}
        {!isCollapsed && mounted && (
          <div className="mt-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs text-muted-foreground">Theme:</span>
              <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/30 border border-border/50">
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
            </div>
          </div>
        )}
      </SidebarHeader>

      {/* Content */}
      <SidebarContent className="px-2 py-4">
        {/* Primary Navigation */}
        <SidebarGroup>
          {!isCollapsed && (
            <SidebarGroupLabel className="text-xs text-muted-foreground px-2 mb-2">
              Navigation
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {filterByRole(primaryNavItems).map(renderNavItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

{/* Service Management (Admin) */}
  {userRole === "admin" && (
  <>
  <Separator className="my-4 bg-border/50" />
  <SidebarGroup>
  {!isCollapsed && (
  <SidebarGroupLabel className="text-xs text-muted-foreground px-2 mb-2">
  Service Management
  </SidebarGroupLabel>
  )}
  <SidebarGroupContent>
  <SidebarMenu>
  {filterByRole(serviceManagementItems).map(renderNavItem)}
  </SidebarMenu>
  </SidebarGroupContent>
  </SidebarGroup>
  </>
  )}

  {/* Archive & Reports (Admin) */}
  {userRole === "admin" && (
  <>
  <Separator className="my-4 bg-border/50" />
  <SidebarGroup>
  {!isCollapsed && (
  <SidebarGroupLabel className="text-xs text-muted-foreground px-2 mb-2">
  Archive & Reports
  </SidebarGroupLabel>
  )}
  <SidebarGroupContent>
  <SidebarMenu>
  {filterByRole(archiveReportsItems).map(renderNavItem)}
  </SidebarMenu>
  </SidebarGroupContent>
  </SidebarGroup>
  </>
  )}
  
  {/* Technician Tools */}
        <Separator className="my-4 bg-border/50" />
        <SidebarGroup>
          {!isCollapsed && (
            <SidebarGroupLabel className="text-xs text-muted-foreground px-2 mb-2">
              Technician Tools
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {filterByRole(technicianToolsItems).map(renderNavItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="border-t border-border/50 p-4">
        {!isCollapsed ? (
          <div className="space-y-3">
            {/* User Profile */}
            <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-muted/30">
              <Avatar className="h-9 w-9 border border-border/50">
                <AvatarImage src={userAvatar} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                  {userName?.slice(0, 2).toUpperCase() || "MT"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {userName || "Megatron Tech"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {userRole === "admin" ? "Service Manager" : "Field Technician"}
                </p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                <Settings className="h-4 w-4" />
              </Button>
            </div>

            {/* Logout Button */}
            <Button
              variant="outline"
              className="w-full gap-2 border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/50"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>

            {/* Collapse Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSidebar}
              className="w-full gap-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
              Collapse Sidebar
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Avatar className="h-9 w-9 border border-border/50 cursor-pointer">
                  <AvatarImage src={userAvatar} />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                    {userName?.slice(0, 2).toUpperCase() || "MT"}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent side="right">
                {userName || "Megatron Tech"}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleSidebar}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Expand Sidebar</TooltipContent>
            </Tooltip>
          </div>
        )}
      </SidebarFooter>
    </>
  );
}

// Mobile Bottom Navigation
function MobileBottomNav({ userRole, pendingCardsCount }: { userRole: UserRole; pendingCardsCount?: number }) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

// Mobile nav items (limited set)
  const mobileNavItems: Array<{ title: string; href: string; icon: React.ElementType; isLive?: boolean; badge?: number }> = [
  { title: "Dashboard", href: "/app", icon: LayoutDashboard },
    { title: "Planning", href: "/planning", icon: CalendarRange, isLive: true },
    ...(userRole === "admin" ? [{ title: "Fleet", href: "/admin/fleet", icon: Radar, isLive: true }] : []),
    { title: "Work Card", href: "/technician", icon: Wrench },
    { title: "Profile", href: "#", icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-border/50 bg-card/95 backdrop-blur-lg safe-area-inset-bottom">
      <div className="flex items-center justify-around px-2 py-2">
        {mobileNavItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors relative",
                active 
                  ? "text-primary bg-primary/10" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <div className="relative">
                <item.icon className="h-5 w-5" />
                {item.isLive && (
                  <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                )}
                {"badge" in item && item.badge && (
                  <span className="absolute -top-1 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-black">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{item.title}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// Main App Sidebar Component
export function AppSidebar({
  userRole = "tech",
  userName = "Megatron Tech",
  userAvatar,
  onRoleChange,
  pendingCardsCount = 1,
}: AppSidebarProps) {
  return (
    <TooltipProvider delayDuration={0}>
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar 
          collapsible="icon"
          className="border-r border-border/50 bg-[#0a0a0a]"
        >
          <SidebarNavContent
            userRole={userRole}
            userName={userName}
            userAvatar={userAvatar}
            onRoleChange={onRoleChange}
            pendingCardsCount={pendingCardsCount}
          />
        </Sidebar>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav userRole={userRole} pendingCardsCount={pendingCardsCount} />
    </TooltipProvider>
  );
}

// Wrapper component with SidebarProvider
export function AppSidebarWrapper({
  children,
  userRole = "tech",
  userName,
  userAvatar,
  onRoleChange,
  pendingCardsCount,
}: AppSidebarProps & { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full">
        <AppSidebar
          userRole={userRole}
          userName={userName}
          userAvatar={userAvatar}
          onRoleChange={onRoleChange}
          pendingCardsCount={pendingCardsCount}
        />
        <main className="flex-1 overflow-auto pb-16 md:pb-0">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}

// Export trigger for external use
export { SidebarTrigger };
