"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowLeft,
  Fuel,
  Clock,
  AlertTriangle,
  Signal,
  Thermometer,
  Gauge,
  Activity,
  MapPin,
  Radio,
  Zap,
  TrendingUp,
  Battery,
  Play,
  Square,
  Radar,
  Sun,
  Moon,
  MonitorPlay,
  Settings,
  Droplets,
  Cog,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// Theme types
type Theme = "dark" | "light" | "presentation";

// Mock tractor data with real Bulgarian coordinates
const mockTractors = [
  {
    id: "JD-8R-410",
    name: "John Deere 8R 410",
    model: "JD 8R 410",
    serialNumber: "1RW8410KVPD012847",
    owner: "Agro Farm Ltd.",
    location: "Sofia",
    position: { lat: 42.6977, lng: 23.3219 }, // Sofia
    status: "active" as const,
    telematics: {
      fuelLevel: 72,
      engineHours: 4823,
      defLevel: 68,
      engineTemp: 92,
      coolantTemp: 88,
      hydraulicTemp: 78,
      groundSpeed: 12.4,
      engineRPM: 1850,
      engineLoad: 68,
      batteryVoltage: 14.2,
      hydraulicPressure: 185,
      signalStrength: 95,
    },
    dtcCodes: [] as Array<{ code: string; severity: string; description: string }>,
    lastUpdate: new Date(Date.now() - 30000),
  },
  {
    id: "JD-7R-350",
    name: "John Deere 7R 350",
    model: "JD 7R 350",
    serialNumber: "1RW7350KMPD008912",
    owner: "Golden Fields EOOD",
    location: "Plovdiv",
    position: { lat: 42.1354, lng: 24.7453 }, // Plovdiv
    status: "warning" as const,
    telematics: {
      fuelLevel: 45,
      engineHours: 6234,
      defLevel: 52,
      engineTemp: 88,
      coolantTemp: 84,
      hydraulicTemp: 72,
      groundSpeed: 8.2,
      engineRPM: 1650,
      engineLoad: 54,
      batteryVoltage: 14.1,
      hydraulicPressure: 172,
      signalStrength: 87,
    },
    dtcCodes: [
      { code: "ECU 524287.31", severity: "warning", description: "Engine Oil Pressure Low" },
    ],
    lastUpdate: new Date(Date.now() - 45000),
  },
  {
    id: "JD-6M-195",
    name: "John Deere 6M 195",
    model: "JD 6M 195",
    serialNumber: "1RW6195VLND003421",
    owner: "Green Valley Farm",
    location: "Pleven",
    position: { lat: 43.4170, lng: 24.6167 }, // Pleven
    status: "idle" as const,
    telematics: {
      fuelLevel: 28,
      engineHours: 2156,
      defLevel: 35,
      engineTemp: 45,
      coolantTemp: 42,
      hydraulicTemp: 42,
      groundSpeed: 0,
      engineRPM: 0,
      engineLoad: 0,
      batteryVoltage: 12.8,
      hydraulicPressure: 0,
      signalStrength: 78,
    },
    dtcCodes: [] as Array<{ code: string; severity: string; description: string }>,
    lastUpdate: new Date(Date.now() - 120000),
  },
  {
    id: "JD-9RX-640",
    name: "John Deere 9RX 640",
    model: "JD 9RX 640",
    serialNumber: "1RW9640KTRD001256",
    owner: "Big Harvest Corp.",
    location: "Yambol",
    position: { lat: 42.4833, lng: 26.5000 }, // Yambol
    status: "critical" as const,
    telematics: {
      fuelLevel: 15,
      engineHours: 1847,
      defLevel: 12,
      engineTemp: 118,
      coolantTemp: 112,
      hydraulicTemp: 95,
      groundSpeed: 0,
      engineRPM: 0,
      engineLoad: 0,
      batteryVoltage: 11.2,
      hydraulicPressure: 45,
      signalStrength: 45,
    },
    dtcCodes: [
      { code: "ECU 639.14", severity: "critical", description: "Transmission Fault" },
      { code: "ECU 524287.31", severity: "critical", description: "Engine Overheating" },
      { code: "BCU 1569.0", severity: "warning", description: "Low Battery Voltage" },
    ],
    lastUpdate: new Date(Date.now() - 15000),
  },
];

type Tractor = (typeof mockTractors)[0];

// Dynamically import the map component to avoid SSR issues
const FleetMap = dynamic(() => import("@/components/fleet/fleet-map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center rounded-xl border border-border bg-card">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-sm text-muted-foreground">Loading map...</span>
      </div>
    </div>
  ),
});

// Custom Progress Bar with gradient colors
function FuelProgressBar({ value, theme }: { value: number; theme: Theme }) {
  const getGradientColor = (level: number) => {
    if (level > 50) return "from-[#367C2B] to-[#4a9c3d]";
    if (level > 25) return "from-amber-500 to-yellow-400";
    return "from-red-600 to-red-400";
  };

  return (
    <div className={cn(
      "relative h-3 w-full rounded-full overflow-hidden",
      theme === "presentation" ? "bg-gray-300" : "bg-muted"
    )}>
      <div
        className={cn(
          "h-full rounded-full bg-gradient-to-r transition-all duration-500",
          getGradientColor(value)
        )}
        style={{ width: `${value}%` }}
      />
      {/* Glow effect for presentation mode */}
      {theme === "presentation" && value > 50 && (
        <div
          className="absolute inset-0 rounded-full bg-gradient-to-r from-[#367C2B]/30 to-transparent blur-sm"
          style={{ width: `${value}%` }}
        />
      )}
    </div>
  );
}

// Digital Readout Component
function DigitalReadout({ 
  value, 
  unit, 
  label, 
  icon: Icon, 
  theme 
}: { 
  value: string | number; 
  unit?: string; 
  label: string; 
  icon: React.ElementType;
  theme: Theme;
}) {
  return (
    <div className={cn(
      "flex flex-col gap-1 p-3 rounded-lg border",
      theme === "presentation" 
        ? "bg-white border-gray-200 shadow-lg" 
        : theme === "light"
        ? "bg-card border-border"
        : "bg-card/50 border-border"
    )}>
      <div className="flex items-center gap-1.5">
        <Icon className={cn(
          "h-3.5 w-3.5",
          theme === "presentation" ? "text-[#367C2B]" : "text-primary"
        )} />
        <span className={cn(
          "text-[10px] uppercase tracking-wider",
          theme === "presentation" ? "text-gray-600" : "text-muted-foreground"
        )}>
          {label}
        </span>
      </div>
      <div className={cn(
        "font-mono text-2xl font-bold tracking-tight",
        theme === "presentation" ? "text-gray-900" : "text-foreground"
      )}>
        {value}
        {unit && (
          <span className={cn(
            "text-sm ml-1",
            theme === "presentation" ? "text-gray-500" : "text-muted-foreground"
          )}>
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

// Widget Header Component
function WidgetHeader({ 
  title, 
  icon: Icon, 
  badge, 
  theme,
  onSettingsClick 
}: { 
  title: string; 
  icon: React.ElementType; 
  badge?: string;
  theme: Theme;
  onSettingsClick?: () => void;
}) {
  return (
    <div className={cn(
      "flex items-center justify-between px-4 py-3 border-b",
      theme === "presentation" 
        ? "border-gray-200 bg-white" 
        : "border-border"
    )}>
      <h2 className={cn(
        "text-sm font-bold uppercase tracking-wider flex items-center gap-2",
        theme === "presentation" ? "text-gray-900" : "text-foreground"
      )}>
        <Icon className={cn(
          "h-4 w-4",
          theme === "presentation" ? "text-[#367C2B]" : "text-primary"
        )} />
        {title}
      </h2>
      <div className="flex items-center gap-2">
        {badge && (
          <Badge
            variant="outline"
            className={cn(
              "text-[10px]",
              theme === "presentation"
                ? "border-[#367C2B] bg-[#367C2B]/10 text-[#367C2B]"
                : "border-primary/50 bg-primary/10 text-primary"
            )}
          >
            {badge}
          </Badge>
        )}
        <button 
          onClick={onSettingsClick}
          className={cn(
            "p-1.5 rounded-md transition-colors",
            theme === "presentation"
              ? "hover:bg-gray-100 text-gray-500"
              : "hover:bg-muted text-muted-foreground"
          )}
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function TelematicsPanel({ tractor, theme }: { tractor: Tractor; theme: Theme }) {
  const { telematics } = tractor;
  const hasErrors = tractor.dtcCodes.some((d) => d.severity === "critical");
  const totalAlerts = tractor.dtcCodes.length;

  const timeSinceUpdate = Math.floor(
    (Date.now() - tractor.lastUpdate.getTime()) / 1000
  );

  // Compact stat card component for the grid
  const CompactStat = ({ 
    icon: Icon, 
    label, 
    value, 
    unit, 
    color = "primary" 
  }: { 
    icon: React.ElementType; 
    label: string; 
    value: string | number; 
    unit?: string; 
    color?: "primary" | "cyan" | "amber" | "red" | "green";
  }) => {
    const colorClasses = {
      primary: theme === "presentation" ? "text-[#367C2B]" : "text-primary",
      cyan: "text-cyan-500",
      amber: "text-amber-500",
      red: "text-red-500",
      green: "text-emerald-500",
    };
    
    return (
      <div className={cn(
        "rounded-lg border p-3 relative overflow-hidden",
        theme === "presentation" 
          ? "bg-white border-gray-200" 
          : "bg-card/50 border-border/50 backdrop-blur-sm"
      )}>
        {/* Subtle glow effect */}
        <div className={cn(
          "absolute inset-0 opacity-5",
          color === "cyan" ? "bg-cyan-500" : 
          color === "amber" ? "bg-amber-500" : 
          color === "red" ? "bg-red-500" :
          color === "green" ? "bg-emerald-500" :
          theme === "presentation" ? "bg-[#367C2B]" : "bg-primary"
        )} />
        <div className="relative flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <Icon className={cn("h-3.5 w-3.5", colorClasses[color])} />
            <span className={cn(
              "text-[10px] uppercase tracking-wider font-medium",
              theme === "presentation" ? "text-gray-500" : "text-muted-foreground"
            )}>
              {label}
            </span>
          </div>
          <div className="flex items-baseline gap-0.5">
            <span className={cn("text-lg font-bold font-mono", colorClasses[color])}>
              {value}
            </span>
            {unit && (
              <span className={cn(
                "text-xs",
                theme === "presentation" ? "text-gray-400" : "text-muted-foreground"
              )}>
                {unit}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Machine Header - Fixed */}
      <div className="space-y-2 pb-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <h3 className={cn(
            "text-lg font-bold",
            theme === "presentation" ? "text-gray-900" : "text-foreground"
          )}>
            {tractor.name}
          </h3>
          <Badge
            variant="outline"
            className={cn(
              "text-xs uppercase tracking-wider",
              tractor.status === "active"
                ? theme === "presentation"
                  ? "border-[#367C2B] bg-[#367C2B]/10 text-[#367C2B]"
                  : "border-primary/50 bg-primary/10 text-primary"
                : theme === "presentation"
                ? "border-gray-400 bg-gray-100 text-gray-600"
                : "border-muted-foreground/50 bg-muted text-muted-foreground"
            )}
          >
            {tractor.status === "active" ? "ACTIVE" : "IDLE"}
          </Badge>
        </div>
        <div className={cn(
          "flex items-center gap-2 text-xs",
          theme === "presentation" ? "text-gray-600" : "text-muted-foreground"
        )}>
          <MapPin className="h-3 w-3" />
          <span>{tractor.owner}</span>
          <span className="text-muted-foreground/50">|</span>
          <span className="font-mono text-[10px]">S/N: {tractor.serialNumber}</span>
        </div>
        <div className="flex items-center gap-2">
          <Signal
            className={cn(
              "h-3 w-3",
              telematics.signalStrength > 80 
                ? theme === "presentation" ? "text-[#367C2B]" : "text-primary"
                : "text-amber-500"
            )}
          />
          <span className={cn(
            "text-xs",
            theme === "presentation" ? "text-gray-500" : "text-muted-foreground"
          )}>
            {telematics.signalStrength}% | {timeSinceUpdate}s ago
          </span>
        </div>
      </div>

      {/* Scrollable Stats Area */}
      <div className={cn(
        "flex-1 overflow-y-auto mt-3 pr-1 space-y-4",
        "max-h-[60vh]",
        "[&::-webkit-scrollbar]:w-1.5",
        "[&::-webkit-scrollbar-track]:bg-transparent",
        "[&::-webkit-scrollbar-thumb]:rounded-full",
        theme === "presentation" 
          ? "[&::-webkit-scrollbar-thumb]:bg-gray-300" 
          : "[&::-webkit-scrollbar-thumb]:bg-border"
      )}>
        
        {/* Active DTC Alerts */}
        {totalAlerts > 0 && (
          <Card
            className={cn(
              "border-2 shadow-lg relative overflow-hidden",
              hasErrors
                ? "border-red-500 bg-red-500/5"
                : "border-amber-500 bg-amber-500/5",
              theme === "presentation" && "shadow-xl"
            )}
          >
            {hasErrors && (
              <div className="absolute inset-0 bg-red-500/10 animate-pulse" />
            )}
            
            <CardHeader className="pb-2 pt-3 px-3 relative">
              <CardTitle className="flex items-center justify-between">
                <span className={cn(
                  "flex items-center gap-2 text-xs font-bold uppercase tracking-wider",
                  hasErrors ? "text-red-500" : "text-amber-500"
                )}>
                  <AlertTriangle className="h-4 w-4" />
                  DTC Alerts
                </span>
                <span className={cn(
                  "relative flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold text-white",
                  hasErrors ? "bg-red-500" : "bg-amber-500"
                )}>
                  <span className={cn(
                    "absolute inset-0 rounded-full animate-ping",
                    hasErrors ? "bg-red-500/75" : "bg-amber-500/75"
                  )} />
                  <span className="relative">{totalAlerts}</span>
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3 relative">
              <div className="space-y-1.5">
                {tractor.dtcCodes.map((dtc, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex items-center gap-2 rounded px-2 py-1.5 border text-xs",
                      dtc.severity === "critical"
                        ? "bg-red-500/10 border-red-500/30"
                        : "bg-amber-500/10 border-amber-500/30"
                    )}
                  >
                    <span className={cn(
                      "font-mono font-bold shrink-0",
                      dtc.severity === "critical" ? "text-red-400" : "text-amber-400"
                    )}>
                      {dtc.code}
                    </span>
                    <span className={cn(
                      "truncate",
                      theme === "presentation" ? "text-gray-700" : "text-foreground/80"
                    )}>
                      {dtc.description}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

      {/* ═══════════════════════════════════════════════════════════════════
          PRIMARY STATS: Fuel & DEF (Full Width with Progress Bars)
          ═══════════════════════════════════════════════════════════════════ */}
        <div className="space-y-2">
          <h4 className={cn(
            "text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5",
            theme === "presentation" ? "text-gray-500" : "text-muted-foreground"
          )}>
            <Radio className={cn("h-3 w-3", theme === "presentation" ? "text-[#367C2B]" : "text-primary")} />
            Live Telematics
          </h4>

          {/* Fuel Level */}
          <Card className={cn(
            "border shadow-sm",
            theme === "presentation" ? "bg-white border-gray-200" : "border-border/50"
          )}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Fuel className={cn(
                    "h-4 w-4",
                    telematics.fuelLevel > 50 
                      ? theme === "presentation" ? "text-[#367C2B]" : "text-primary"
                      : telematics.fuelLevel > 25 ? "text-amber-500" : "text-red-500"
                  )} />
                  <span className={cn("text-xs font-medium", theme === "presentation" ? "text-gray-700" : "text-foreground")}>
                    Fuel Level
                  </span>
                </div>
                <span className={cn(
                  "text-sm font-bold font-mono",
                  telematics.fuelLevel > 50 
                    ? theme === "presentation" ? "text-[#367C2B]" : "text-primary"
                    : telematics.fuelLevel > 25 ? "text-amber-500" : "text-red-500"
                )}>
                  {telematics.fuelLevel}%
                </span>
              </div>
              <FuelProgressBar value={telematics.fuelLevel} theme={theme} />
            </CardContent>
          </Card>

          {/* DEF Level */}
          <Card className={cn(
            "border shadow-sm",
            theme === "presentation" ? "bg-white border-gray-200" : "border-border/50"
          )}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Droplets className="h-4 w-4 text-cyan-500" />
                  <span className={cn("text-xs font-medium", theme === "presentation" ? "text-gray-700" : "text-foreground")}>
                    DEF Level
                  </span>
                </div>
                <span className="text-sm font-bold font-mono text-cyan-500">
                  {telematics.defLevel}%
                </span>
              </div>
              <div className={cn(
                "relative h-2 w-full rounded-full overflow-hidden",
                theme === "presentation" ? "bg-gray-200" : "bg-muted"
              )}>
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-400 transition-all duration-500"
                  style={{ width: `${telematics.defLevel}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Engine Hours - Full Width */}
          <Card className={cn(
            "border shadow-sm relative overflow-hidden",
            theme === "presentation" ? "bg-white border-gray-200" : "border-border/50"
          )}>
            <div className={cn("absolute inset-0 opacity-5", theme === "presentation" ? "bg-[#367C2B]" : "bg-primary")} />
            <CardContent className="p-3 relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Clock className={cn("h-4 w-4", theme === "presentation" ? "text-[#367C2B]" : "text-primary")} />
                  <span className={cn("text-xs font-medium", theme === "presentation" ? "text-gray-700" : "text-foreground")}>
                    Engine Hours
                  </span>
                </div>
                <span className={cn("text-lg font-bold font-mono", theme === "presentation" ? "text-[#367C2B]" : "text-primary")}>
                  {telematics.engineHours.toLocaleString()}
                  <span className={cn("text-xs ml-0.5", theme === "presentation" ? "text-gray-400" : "text-muted-foreground")}>h</span>
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
          JDLINK PERFORMANCE GRID (Compact 2-Column Layout)
          ═══════════════════════════════════════════════════════════════════ */}
        <div className="space-y-2">
          <h4 className={cn(
            "text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5",
            theme === "presentation" ? "text-gray-500" : "text-muted-foreground"
          )}>
            <Cog className={cn("h-3 w-3", theme === "presentation" ? "text-[#367C2B]" : "text-primary")} />
            JDLink Performance
          </h4>

          {/* 2-Column Compact Grid */}
          <div className="grid grid-cols-2 gap-2">
            {/* Engine Load */}
            <CompactStat
              icon={TrendingUp}
              label="Engine Load"
              value={telematics.engineLoad}
              unit="%"
              color={telematics.engineLoad > 85 ? "red" : telematics.engineLoad > 70 ? "amber" : "primary"}
            />

            {/* Coolant Temp */}
            <CompactStat
              icon={Thermometer}
              label="Coolant Temp"
              value={telematics.coolantTemp}
              unit="°C"
              color={telematics.coolantTemp > 100 ? "red" : telematics.coolantTemp > 90 ? "amber" : "primary"}
            />

            {/* Battery Voltage */}
            <CompactStat
              icon={Battery}
              label="Battery"
              value={telematics.batteryVoltage.toFixed(1)}
              unit="V"
              color={telematics.batteryVoltage > 13 ? "green" : telematics.batteryVoltage > 12 ? "amber" : "red"}
            />

            {/* Hydraulic Pressure */}
            <CompactStat
              icon={Gauge}
              label="Hydraulic"
              value={telematics.hydraulicPressure}
              unit="bar"
              color={telematics.hydraulicPressure > 200 ? "red" : telematics.hydraulicPressure > 0 ? "cyan" : "primary"}
            />

            {/* Engine RPM */}
            <CompactStat
              icon={Activity}
              label="Engine RPM"
              value={telematics.engineRPM.toLocaleString()}
              color="primary"
            />

            {/* Ground Speed */}
            <CompactStat
              icon={Gauge}
              label="Speed"
              value={telematics.groundSpeed.toFixed(1)}
              unit="km/h"
              color="primary"
            />

            {/* Engine Temp */}
            <CompactStat
              icon={Thermometer}
              label="Engine Temp"
              value={telematics.engineTemp}
              unit="°C"
              color={telematics.engineTemp > 100 ? "red" : "primary"}
            />

            {/* Hydraulic Temp */}
            <CompactStat
              icon={Thermometer}
              label="Hyd. Temp"
              value={telematics.hydraulicTemp}
              unit="°C"
              color="cyan"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Skeleton Loading Component for Telematics
function TelematicsSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="space-y-2">
        <div className="h-6 w-48 bg-muted rounded" />
        <div className="h-4 w-32 bg-muted rounded" />
        <div className="h-3 w-56 bg-muted rounded" />
      </div>
      <div className="h-24 bg-muted rounded-lg" />
      <div className="h-16 bg-muted rounded-lg" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-20 bg-muted rounded-lg" />
        <div className="h-20 bg-muted rounded-lg" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="h-12 bg-muted rounded-lg" />
        <div className="h-12 bg-muted rounded-lg" />
      </div>
      <div className="h-12 bg-muted rounded-lg" />
    </div>
  );
}

export default function FleetIntelligencePage() {
  const [selectedTractor, setSelectedTractor] = useState<Tractor | null>(mockTractors[0]);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { theme: currentTheme, setTheme: setNextTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  // Derive our custom theme type from next-themes
  const theme: Theme = currentTheme === "presentation" ? "presentation" : currentTheme === "light" ? "light" : "dark";

  // Ensure component is mounted before using theme and set initial time
  useEffect(() => {
    setMounted(true);
    setCurrentTime(new Date());
  }, []);

  // Simulate initial loading
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  // Update time every second for live feel
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);
  
  // Helper to set theme
  const setTheme = (newTheme: Theme) => {
    setNextTheme(newTheme);
  };

  const getThemeStyles = () => {
    switch (theme) {
      case "presentation":
        return {
          bg: "bg-gray-100",
          header: "bg-white border-gray-200",
          text: "text-gray-900",
          muted: "text-gray-600",
        };
      case "light":
        return {
          bg: "bg-background",
          header: "bg-background border-border",
          text: "text-foreground",
          muted: "text-muted-foreground",
        };
      default:
        return {
          bg: "bg-background",
          header: "bg-background/95 border-border",
          text: "text-foreground",
          muted: "text-muted-foreground",
        };
    }
  };

  const styles = getThemeStyles();

  return (
    <div className={cn("flex min-h-screen flex-col", styles.bg)}>
      {/* Header - Futuristic Navigation Bar */}
      <header className={cn(
        "sticky top-0 z-50 border-b backdrop-blur-sm",
        styles.header
      )}>
        <div className="flex h-16 items-center justify-between px-6">
          {/* Left: Back button and Logo */}
          <div className="flex items-center gap-6">
            <Link href="/app">
              <Button
                variant="ghost"
                size="sm"
                className={cn("gap-1.5", styles.muted)}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>

            <div className={cn(
              "h-8 w-px",
              theme === "presentation" ? "bg-gray-300" : "bg-border"
            )} />

            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg border",
                theme === "presentation"
                  ? "bg-[#367C2B]/10 border-[#367C2B]/30"
                  : "bg-primary/10 border-primary/30"
              )}>
                <Activity className={cn(
                  "h-6 w-6",
                  theme === "presentation" ? "text-[#367C2B]" : "text-primary"
                )} />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">
                  <span className={styles.text}>Megatron</span>
                  <span className={cn(
                    theme === "presentation" ? "text-[#367C2B]" : "text-primary"
                  )}>Vision</span>
                </h1>
                <p className={cn(
                  "text-[10px] uppercase tracking-widest",
                  styles.muted
                )}>
                  Fleet Intelligence System
                </p>
              </div>
            </div>
          </div>

          {/* Right: Theme switcher, Live indicator, time, and simulation button */}
          <div className="flex items-center gap-4">
            {/* Theme Switcher */}
            <div className={cn(
              "flex items-center gap-1 p-1 rounded-lg border",
              theme === "presentation" ? "bg-gray-200 border-gray-300" : "bg-muted border-border"
            )}>
              <button
                onClick={() => setTheme("light")}
                className={cn(
                  "p-2 rounded-md transition-all",
                  theme === "light" 
                    ? "bg-background shadow-sm" 
                    : "hover:bg-background/50"
                )}
                title="Light Mode"
              >
                <Sun className={cn(
                  "h-4 w-4",
                  theme === "light" ? "text-amber-500" : styles.muted
                )} />
              </button>
              <button
                onClick={() => setTheme("dark")}
                className={cn(
                  "p-2 rounded-md transition-all",
                  theme === "dark" 
                    ? "bg-background shadow-sm" 
                    : "hover:bg-background/50"
                )}
                title="Dark Mode"
              >
                <Moon className={cn(
                  "h-4 w-4",
                  theme === "dark" ? "text-primary" : styles.muted
                )} />
              </button>
              <button
                onClick={() => setTheme("presentation")}
                className={cn(
                  "p-2 rounded-md transition-all",
                  theme === "presentation" 
                    ? "bg-white shadow-sm" 
                    : "hover:bg-background/50"
                )}
                title="Presentation Mode (High Contrast)"
              >
                <MonitorPlay className={cn(
                  "h-4 w-4",
                  theme === "presentation" ? "text-[#367C2B]" : styles.muted
                )} />
              </button>
            </div>

            {/* Divider */}
            <div className={cn(
              "h-8 w-px",
              theme === "presentation" ? "bg-gray-300" : "bg-border"
            )} />

            {/* Live Indicator */}
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className={cn(
                  "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                  theme === "presentation" ? "bg-[#367C2B]" : "bg-primary"
                )} />
                <span className={cn(
                  "relative inline-flex rounded-full h-2 w-2",
                  theme === "presentation" ? "bg-[#367C2B]" : "bg-primary"
                )} />
              </span>
              <span className={cn("text-xs uppercase tracking-wider", styles.muted)}>Live</span>
            </div>

            {/* Time - Only render on client to avoid hydration mismatch */}
            {mounted && currentTime && (
              <span className={cn("text-sm font-mono", styles.text)}>
                {currentTime.toLocaleTimeString()}
              </span>
            )}

            {/* Start Live Data / Halt Simulation Button - Futuristic Style */}
            <Button
              onClick={() => setIsSimulating(!isSimulating)}
              className={cn(
                "relative overflow-hidden gap-2 px-5 py-2 font-semibold tracking-wide uppercase text-sm",
                "bg-transparent border-2 transition-all duration-300",
                isSimulating 
                  ? "border-red-500 text-red-500 hover:bg-red-500/10 hover:shadow-[0_0_20px_rgba(239,68,68,0.4)] animate-pulse"
                  : "border-[#367C2B] text-[#367C2B] hover:bg-[#367C2B]/10 hover:shadow-[0_0_20px_rgba(54,124,43,0.4)]"
              )}
            >
              {isSimulating ? (
                <Square className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {isSimulating ? "Halt Simulation" : "Start Live Data"}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content - Two Column Layout */}
      <div className="flex flex-1 gap-4 p-4 overflow-hidden">
        {/* Left Column - Map Widget (75%) */}
        <div className="w-3/4 h-[calc(100vh-8rem)]">
          <Card className={cn(
            "relative w-full h-full rounded-xl border shadow-md overflow-hidden",
            theme === "presentation" ? "bg-white border-gray-200" : "border-border"
          )}>
            {/* Widget Header */}
            <WidgetHeader
              icon={MapPin}
              title="Fleet Map"
              badge={`${mockTractors.filter((t) => t.status === "active").length}/${mockTractors.length} Active`}
              theme={theme}
              onSettingsClick={() => {}}
            />
            
            {/* Map Content */}
            <div className="h-[calc(100%-49px)]">
              <FleetMap
                tractors={mockTractors}
                selectedTractorId={selectedTractor?.id || null}
                onSelectTractor={(id) => {
                  const tractor = mockTractors.find((t) => t.id === id);
                  setSelectedTractor(tractor || null);
                }}
              />

              {/* Map overlay legend */}
              <div className={cn(
                "absolute bottom-4 left-4 z-[1000] flex items-center gap-4 text-xs px-4 py-2.5 rounded-lg border backdrop-blur",
                theme === "presentation" 
                  ? "bg-white/90 border-gray-200 text-gray-700" 
                  : "bg-background/70 border-border text-foreground"
              )}>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#367C2B]" />
                  Active
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                  Warning
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                  Critical
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-gray-500" />
                  Idle
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column - Telematics Widget (25%) */}
        <div className="w-1/4 h-[calc(100vh-8rem)]">
          <Card className={cn(
            "flex flex-col h-full rounded-xl border shadow-md overflow-hidden",
            theme === "presentation" ? "bg-gray-50 border-gray-200" : "border-border"
          )}>
            {/* Widget Header */}
            <WidgetHeader
              icon={Radio}
              title="Live Telematics"
              badge="Real-time"
              theme={theme}
              onSettingsClick={() => {}}
            />

            {/* Fleet List */}
            <div className={cn(
              "border-b",
              theme === "presentation" ? "border-gray-200" : "border-border"
            )}>
              <ScrollArea className="h-[120px]">
                <div className="p-2 space-y-1">
                  {mockTractors.map((tractor) => {
                    const hasErrors = tractor.dtcCodes.some((d) => d.severity === "critical");
                    const hasWarnings = tractor.dtcCodes.some((d) => d.severity === "warning");
                    const isSelected = selectedTractor?.id === tractor.id;

                    return (
                      <button
                        key={tractor.id}
                        onClick={() => setSelectedTractor(tractor)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all",
                          isSelected
                            ? theme === "presentation"
                              ? "bg-[#367C2B]/10 border border-[#367C2B]/50"
                              : "bg-primary/20 border border-primary/50"
                            : theme === "presentation"
                            ? "hover:bg-gray-200 border border-transparent"
                            : "hover:bg-muted/50 border border-transparent"
                        )}
                      >
                        <span
                          className={cn(
                            "h-2 w-2 rounded-full shrink-0",
                            hasErrors
                              ? "bg-red-500"
                              : hasWarnings
                              ? "bg-amber-500"
                              : tractor.status === "active"
                              ? "bg-[#367C2B]"
                              : "bg-gray-500"
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-xs font-semibold truncate",
                            theme === "presentation" ? "text-gray-900" : "text-foreground"
                          )}>
                            {tractor.id}
                          </p>
                          <p className={cn(
                            "text-[10px] truncate",
                            theme === "presentation" ? "text-gray-500" : "text-muted-foreground"
                          )}>
                            {tractor.model}
                          </p>
                        </div>
                        <span className={cn(
                          "text-[10px] font-mono",
                          theme === "presentation" ? "text-gray-500" : "text-muted-foreground"
                        )}>
                          {tractor.telematics.fuelLevel}%
                        </span>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            {/* Telematics Content */}
            <ScrollArea className="flex-1 p-4">
              {isLoading ? (
                <TelematicsSkeleton />
              ) : selectedTractor ? (
                <TelematicsPanel tractor={selectedTractor} theme={theme} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MapPin className={cn(
                    "h-12 w-12 mb-3",
                    theme === "presentation" ? "text-gray-400" : "text-muted-foreground/50"
                  )} />
                  <p className={cn(
                    "text-sm",
                    theme === "presentation" ? "text-gray-500" : "text-muted-foreground"
                  )}>
                    Select a tractor to view telematics
                  </p>
                </div>
              )}
            </ScrollArea>
          </Card>
        </div>
      </div>
    </div>
  );
}
