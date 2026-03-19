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
  Radar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// Mock tractor data with real Bulgarian coordinates
const mockTractors = [
  {
    id: "JD-8R-410",
    name: "John Deere 8R 410",
    model: "8R 410",
    serialNumber: "1RW8410KVPD012847",
    owner: "Agro Farm Ltd.",
    position: { lat: 42.6977, lng: 23.3219 }, // Sofia
    status: "active",
    telematics: {
      fuelLevel: 72,
      engineHours: 4823,
      defLevel: 68,
      engineTemp: 92,
      hydraulicTemp: 78,
      groundSpeed: 12.4,
      engineRPM: 1850,
      batteryVoltage: 14.2,
      signalStrength: 95,
    },
    dtcCodes: [],
    lastUpdate: new Date(Date.now() - 30000),
  },
  {
    id: "JD-7R-350",
    name: "John Deere 7R 350",
    model: "7R 350",
    serialNumber: "1RW7350KMPD008912",
    owner: "Golden Fields EOOD",
    position: { lat: 42.1354, lng: 24.7453 }, // Plovdiv
    status: "active",
    telematics: {
      fuelLevel: 45,
      engineHours: 6234,
      defLevel: 52,
      engineTemp: 88,
      hydraulicTemp: 72,
      groundSpeed: 8.2,
      engineRPM: 1650,
      batteryVoltage: 14.1,
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
    model: "6M 195",
    serialNumber: "1RW6195VLND003421",
    owner: "Green Valley Farm",
    position: { lat: 43.4170, lng: 24.6067 }, // Pleven
    status: "idle",
    telematics: {
      fuelLevel: 28,
      engineHours: 2156,
      defLevel: 35,
      engineTemp: 45,
      hydraulicTemp: 42,
      groundSpeed: 0,
      engineRPM: 0,
      batteryVoltage: 12.8,
      signalStrength: 78,
    },
    dtcCodes: [
      { code: "ECU 639.14", severity: "critical", description: "Transmission Fault" },
      { code: "BCU 1569.0", severity: "warning", description: "Cab Air Filter Clogged" },
    ],
    lastUpdate: new Date(Date.now() - 120000),
  },
  {
    id: "JD-9RX-640",
    name: "John Deere 9RX 640",
    model: "9RX 640",
    serialNumber: "1RW9640KTRD001256",
    owner: "Big Harvest Corp.",
    position: { lat: 43.2141, lng: 27.9147 }, // Varna
    status: "active",
    telematics: {
      fuelLevel: 89,
      engineHours: 1847,
      defLevel: 82,
      engineTemp: 94,
      hydraulicTemp: 85,
      groundSpeed: 15.6,
      engineRPM: 2100,
      batteryVoltage: 14.3,
      signalStrength: 92,
    },
    dtcCodes: [],
    lastUpdate: new Date(Date.now() - 15000),
  },
];

type Tractor = (typeof mockTractors)[0];

// Dynamically import the map component to avoid SSR issues
const FleetMap = dynamic(() => import("@/components/fleet/fleet-map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center rounded-2xl border border-gray-800 bg-[#0A0A0A]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#367C2B] border-t-transparent" />
        <span className="text-sm text-gray-500">Loading map...</span>
      </div>
    </div>
  ),
});

function TelematicsPanel({ tractor }: { tractor: Tractor }) {
  const { telematics } = tractor;
  const hasErrors = tractor.dtcCodes.some((d) => d.severity === "critical");
  const hasWarnings = tractor.dtcCodes.some((d) => d.severity === "warning");

  const getFuelColor = (level: number) => {
    if (level > 50) return "text-[#367C2B]";
    if (level > 25) return "text-amber-500";
    return "text-red-500";
  };

  const timeSinceUpdate = Math.floor(
    (Date.now() - tractor.lastUpdate.getTime()) / 1000
  );

  return (
    <div className="space-y-4">
      {/* Machine Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">{tractor.name}</h3>
          <Badge
            variant="outline"
            className={cn(
              "text-xs uppercase tracking-wider",
              tractor.status === "active"
                ? "border-[#367C2B]/50 bg-[#367C2B]/10 text-[#367C2B]"
                : "border-gray-600/50 bg-gray-700/30 text-gray-400"
            )}
          >
            {tractor.status === "active" ? "ACTIVE" : "IDLE"}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <MapPin className="h-3 w-3" />
          <span>{tractor.owner}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-600 font-mono">
          <span>S/N: {tractor.serialNumber}</span>
        </div>
        <div className="flex items-center gap-2">
          <Signal
            className={cn(
              "h-3 w-3",
              telematics.signalStrength > 80 ? "text-[#367C2B]" : "text-amber-500"
            )}
          />
          <span className="text-xs text-gray-500">
            Signal: {telematics.signalStrength}% | Updated {timeSinceUpdate}s ago
          </span>
        </div>
      </div>

      {/* DTC Error Codes */}
      {tractor.dtcCodes.length > 0 && (
        <Card
          className={cn(
            "border bg-transparent",
            hasErrors
              ? "border-red-500/50 bg-red-500/5"
              : "border-amber-500/50 bg-amber-500/5"
          )}
        >
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle
              className={cn(
                "flex items-center gap-2 text-sm font-semibold",
                hasErrors ? "text-red-400" : "text-amber-400"
              )}
            >
              <AlertTriangle className="h-4 w-4" />
              Active DTC Codes ({tractor.dtcCodes.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="space-y-2">
              {tractor.dtcCodes.map((dtc, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex items-start gap-2 rounded-md px-2 py-1.5 text-xs",
                    dtc.severity === "critical"
                      ? "bg-red-500/10 text-red-300"
                      : "bg-amber-500/10 text-amber-300"
                  )}
                >
                  <span className="font-mono font-bold shrink-0">{dtc.code}</span>
                  <span className="text-gray-400">{dtc.description}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Live Telematics */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
          <Radio className="h-3 w-3 text-[#367C2B]" />
          Live Telematics
        </h4>

        {/* Fuel & DEF */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-gray-800 bg-[#0A0A0A]">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Fuel className={cn("h-4 w-4", getFuelColor(telematics.fuelLevel))} />
                  <span className="text-xs text-gray-500">Fuel</span>
                </div>
                <span className={cn("text-sm font-bold", getFuelColor(telematics.fuelLevel))}>
                  {telematics.fuelLevel}%
                </span>
              </div>
              <Progress value={telematics.fuelLevel} className="h-1.5 bg-gray-800" />
            </CardContent>
          </Card>

          <Card className="border-gray-800 bg-[#0A0A0A]">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Battery className="h-4 w-4 text-cyan-400" />
                  <span className="text-xs text-gray-500">DEF</span>
                </div>
                <span className="text-sm font-bold text-cyan-400">
                  {telematics.defLevel}%
                </span>
              </div>
              <Progress value={telematics.defLevel} className="h-1.5 bg-gray-800" />
            </CardContent>
          </Card>
        </div>

        {/* Engine Hours */}
        <Card className="border-gray-800 bg-[#0A0A0A]">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#367C2B]" />
                <span className="text-xs text-gray-500">Engine Hours</span>
              </div>
              <span className="text-lg font-bold font-mono text-[#367C2B]">
                {telematics.engineHours.toLocaleString()}h
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-gray-800 bg-[#0A0A0A]">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center gap-1.5">
                <Gauge className="h-4 w-4 text-[#367C2B]" />
                <span className="text-xs text-gray-500">Speed</span>
              </div>
              <div className="text-xl font-bold font-mono text-white">
                {telematics.groundSpeed.toFixed(1)}
                <span className="text-xs text-gray-500 ml-1">km/h</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-800 bg-[#0A0A0A]">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-amber-400" />
                <span className="text-xs text-gray-500">RPM</span>
              </div>
              <div className="text-xl font-bold font-mono text-white">
                {telematics.engineRPM.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Temperatures */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-gray-800 bg-[#0A0A0A]">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Thermometer
                    className={cn(
                      "h-4 w-4",
                      telematics.engineTemp > 100 ? "text-red-500" : "text-[#367C2B]"
                    )}
                  />
                  <span className="text-xs text-gray-500">Engine</span>
                </div>
                <span
                  className={cn(
                    "font-bold font-mono",
                    telematics.engineTemp > 100 ? "text-red-500" : "text-white"
                  )}
                >
                  {telematics.engineTemp}°C
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-800 bg-[#0A0A0A]">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Thermometer className="h-4 w-4 text-cyan-400" />
                  <span className="text-xs text-gray-500">Hydraulic</span>
                </div>
                <span className="font-bold font-mono text-white">
                  {telematics.hydraulicTemp}°C
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Battery */}
        <Card className="border-gray-800 bg-[#0A0A0A]">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap
                  className={cn(
                    "h-4 w-4",
                    telematics.batteryVoltage > 13 ? "text-[#367C2B]" : "text-amber-500"
                  )}
                />
                <span className="text-xs text-gray-500">Battery Voltage</span>
              </div>
              <span className="font-bold font-mono text-white">
                {telematics.batteryVoltage.toFixed(1)}V
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Skeleton Loading Component for Telematics
function TelematicsSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="space-y-2">
        <div className="h-6 w-48 bg-gray-800 rounded" />
        <div className="h-4 w-32 bg-gray-800 rounded" />
        <div className="h-3 w-56 bg-gray-800 rounded" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="h-20 bg-gray-800 rounded-lg" />
        <div className="h-20 bg-gray-800 rounded-lg" />
      </div>
      <div className="h-14 bg-gray-800 rounded-lg" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-20 bg-gray-800 rounded-lg" />
        <div className="h-20 bg-gray-800 rounded-lg" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="h-12 bg-gray-800 rounded-lg" />
        <div className="h-12 bg-gray-800 rounded-lg" />
      </div>
      <div className="h-12 bg-gray-800 rounded-lg" />
    </div>
  );
}

export default function FleetIntelligencePage() {
  const [selectedTractor, setSelectedTractor] = useState<Tractor | null>(mockTractors[0]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isSimulating, setIsSimulating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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

  return (
    <div className="flex min-h-screen flex-col bg-[#0A0A0A] text-white">
      {/* Header - Futuristic Navigation Bar */}
      <header className="sticky top-0 z-50 border-b border-gray-800 bg-[#0A0A0A]/95 backdrop-blur-sm">
        <div className="flex h-16 items-center justify-between px-6">
          {/* Left: Back button and Logo */}
          <div className="flex items-center gap-6">
            <Link href="/admin/manager">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-gray-400 hover:text-white hover:bg-gray-800"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>

            <div className="h-8 w-px bg-gray-800" />

            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#367C2B]/10 border border-[#367C2B]/30">
                <Radar className="h-6 w-6 text-[#367C2B]" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">
                  <span className="text-white">Megatron</span>
                  <span className="text-[#367C2B]">Vision</span>
                </h1>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest">
                  Fleet Intelligence System
                </p>
              </div>
            </div>
          </div>

          {/* Right: Live indicator, time, and simulation button */}
          <div className="flex items-center gap-6">
            {/* Live Indicator */}
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#367C2B] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#367C2B]" />
              </span>
              <span className="text-xs text-gray-400 uppercase tracking-wider">Live</span>
            </div>

            {/* Time */}
            <span className="text-sm font-mono text-gray-300">
              {currentTime.toLocaleTimeString()}
            </span>

            {/* Start Live Simulation Button - Futuristic Style */}
            <Button
              onClick={() => setIsSimulating(!isSimulating)}
              className={cn(
                "relative overflow-hidden gap-2 px-5 py-2 font-semibold tracking-wide uppercase text-sm",
                "bg-transparent border-2 border-[#367C2B] text-[#367C2B]",
                "hover:bg-[#367C2B]/10 hover:shadow-[0_0_20px_rgba(54,124,43,0.4)]",
                "transition-all duration-300",
                isSimulating && "bg-[#367C2B]/20 shadow-[0_0_25px_rgba(54,124,43,0.5)]"
              )}
            >
              <Play
                className={cn(
                  "h-4 w-4",
                  isSimulating && "animate-pulse"
                )}
              />
              {isSimulating ? "Simulating..." : "Start Live Simulation"}
              {/* Glow effect */}
              <span className="absolute inset-0 rounded-md bg-[#367C2B]/5 blur-sm" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content - Two Column Layout */}
      <div className="flex flex-1 gap-4 p-4 overflow-hidden">
        {/* Left Column - Map (75%) */}
        <div className="w-3/4 h-[calc(100vh-8rem)]">
          <div className="relative w-full h-full rounded-2xl border border-gray-800 overflow-hidden bg-[#0A0A0A]">
            <FleetMap
              tractors={mockTractors}
              selectedTractorId={selectedTractor?.id || null}
              onSelectTractor={(id) => {
                const tractor = mockTractors.find((t) => t.id === id);
                setSelectedTractor(tractor || null);
              }}
            />

            {/* Map overlay legend */}
            <div className="absolute bottom-4 left-4 z-[1000] flex items-center gap-4 text-xs text-white bg-black/70 px-4 py-2.5 rounded-lg border border-gray-800 backdrop-blur">
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

            {/* Fleet count badge */}
            <div className="absolute top-4 left-4 z-[1000] flex items-center gap-2 px-3 py-2 rounded-lg bg-black/70 border border-gray-800 backdrop-blur">
              <TrendingUp className="h-4 w-4 text-[#367C2B]" />
              <span className="text-sm font-semibold text-white">
                {mockTractors.filter((t) => t.status === "active").length}/{mockTractors.length} Active
              </span>
            </div>
          </div>
        </div>

        {/* Right Column - Telematics Panel (25%) */}
        <div className="w-1/4 h-[calc(100vh-8rem)]">
          <div className="flex flex-col h-full rounded-2xl border border-gray-800 bg-[#161616] overflow-hidden">
            {/* Panel Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Radio className="h-4 w-4 text-[#367C2B]" />
                Live Telematics
              </h2>
              <Badge
                variant="outline"
                className="border-[#367C2B]/50 bg-[#367C2B]/10 text-[#367C2B] text-[10px]"
              >
                Real-time
              </Badge>
            </div>

            {/* Fleet List */}
            <div className="border-b border-gray-800">
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
                            ? "bg-[#367C2B]/20 border border-[#367C2B]/50"
                            : "hover:bg-gray-800/50 border border-transparent"
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
                          <p className="text-xs font-semibold text-white truncate">
                            {tractor.id}
                          </p>
                          <p className="text-[10px] text-gray-500 truncate">{tractor.model}</p>
                        </div>
                        <span className="text-[10px] text-gray-500 font-mono">
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
                <TelematicsPanel tractor={selectedTractor} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MapPin className="h-12 w-12 text-gray-700 mb-3" />
                  <p className="text-sm text-gray-500">Select a tractor to view telematics</p>
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
}
