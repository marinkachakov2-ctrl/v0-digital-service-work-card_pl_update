"use client";

import { useState, useEffect } from "react";
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
  ChevronRight,
  Radio,
  Zap,
  TrendingUp,
  Battery,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// Mock tractor data with telematics
const mockTractors = [
  {
    id: "JD-8R-410",
    name: "John Deere 8R 410",
    model: "8R 410",
    serialNumber: "1RW8410KVPD012847",
    owner: "Agro Farm Ltd.",
    position: { lat: 42.6977, lng: 23.3219 }, // Sofia area
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
    position: { lat: 42.7105, lng: 23.2915 },
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
    position: { lat: 42.6850, lng: 23.3450 },
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
    position: { lat: 42.7200, lng: 23.2700 },
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

type Tractor = typeof mockTractors[0];

// Tractor icon positions on SVG map (percentages)
const tractorPositions = [
  { x: 35, y: 40 },
  { x: 55, y: 30 },
  { x: 25, y: 60 },
  { x: 70, y: 55 },
];

function TractorMarker({ 
  tractor, 
  position, 
  isSelected, 
  onClick 
}: { 
  tractor: Tractor; 
  position: { x: number; y: number }; 
  isSelected: boolean; 
  onClick: () => void;
}) {
  const hasErrors = tractor.dtcCodes.some(d => d.severity === "critical");
  const hasWarnings = tractor.dtcCodes.some(d => d.severity === "warning");
  
  return (
    <g
      className="cursor-pointer transition-transform hover:scale-110"
      style={{ transform: `translate(${position.x}%, ${position.y}%)` }}
      onClick={onClick}
    >
      {/* Pulse ring for active/selected */}
      {(tractor.status === "active" || isSelected) && (
        <>
          <circle
            cx="0"
            cy="0"
            r={isSelected ? "18" : "14"}
            className={cn(
              "animate-ping opacity-30",
              hasErrors ? "fill-red-500" : hasWarnings ? "fill-amber-500" : "fill-emerald-500"
            )}
          />
          <circle
            cx="0"
            cy="0"
            r={isSelected ? "14" : "10"}
            className={cn(
              "opacity-50",
              hasErrors ? "fill-red-500" : hasWarnings ? "fill-amber-500" : "fill-emerald-500"
            )}
          />
        </>
      )}
      
      {/* Main marker */}
      <circle
        cx="0"
        cy="0"
        r={isSelected ? "12" : "8"}
        className={cn(
          "stroke-2 transition-all",
          isSelected ? "stroke-white" : "stroke-background",
          hasErrors 
            ? "fill-red-500" 
            : hasWarnings 
              ? "fill-amber-500" 
              : tractor.status === "active" 
                ? "fill-emerald-500" 
                : "fill-muted-foreground"
        )}
      />
      
      {/* Tractor icon */}
      <text
        x="0"
        y="1"
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-white text-[6px] font-bold pointer-events-none"
      >
        JD
      </text>
      
      {/* Label */}
      {isSelected && (
        <g>
          <rect
            x="-35"
            y="18"
            width="70"
            height="20"
            rx="4"
            className="fill-background/95 stroke-border"
          />
          <text
            x="0"
            y="30"
            textAnchor="middle"
            className="fill-foreground text-[8px] font-medium"
          >
            {tractor.id}
          </text>
        </g>
      )}
    </g>
  );
}

function TelematicsPanel({ tractor }: { tractor: Tractor }) {
  const { telematics } = tractor;
  const hasErrors = tractor.dtcCodes.some(d => d.severity === "critical");
  const hasWarnings = tractor.dtcCodes.some(d => d.severity === "warning");
  
  const getFuelColor = (level: number) => {
    if (level > 50) return "text-emerald-500";
    if (level > 25) return "text-amber-500";
    return "text-red-500";
  };
  
  const timeSinceUpdate = Math.floor((Date.now() - tractor.lastUpdate.getTime()) / 1000);
  
  return (
    <div className="space-y-4">
      {/* Machine Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">{tractor.name}</h3>
          <Badge 
            variant="outline" 
            className={cn(
              "text-xs",
              tractor.status === "active" 
                ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                : "border-muted-foreground/50 bg-muted/30 text-muted-foreground"
            )}
          >
            {tractor.status === "active" ? "ACTIVE" : "IDLE"}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span>{tractor.owner}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
          <span>S/N: {tractor.serialNumber}</span>
        </div>
        <div className="flex items-center gap-2">
          <Signal className={cn("h-3 w-3", telematics.signalStrength > 80 ? "text-emerald-500" : "text-amber-500")} />
          <span className="text-xs text-muted-foreground">
            Signal: {telematics.signalStrength}% | Updated {timeSinceUpdate}s ago
          </span>
        </div>
      </div>

      {/* DTC Error Codes */}
      {tractor.dtcCodes.length > 0 && (
        <Card className={cn(
          "border",
          hasErrors 
            ? "border-red-500/50 bg-red-500/5" 
            : "border-amber-500/50 bg-amber-500/5"
        )}>
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className={cn(
              "flex items-center gap-2 text-sm font-semibold",
              hasErrors ? "text-red-400" : "text-amber-400"
            )}>
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
                  <span className="text-muted-foreground">{dtc.description}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Live Telematics */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Radio className="h-3 w-3 text-emerald-500" />
          Live Telematics
        </h4>
        
        {/* Fuel & DEF */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Fuel className={cn("h-4 w-4", getFuelColor(telematics.fuelLevel))} />
                  <span className="text-xs text-muted-foreground">Fuel</span>
                </div>
                <span className={cn("text-sm font-bold", getFuelColor(telematics.fuelLevel))}>
                  {telematics.fuelLevel}%
                </span>
              </div>
              <Progress 
                value={telematics.fuelLevel} 
                className="h-1.5"
              />
            </CardContent>
          </Card>
          
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Battery className="h-4 w-4 text-cyan-400" />
                  <span className="text-xs text-muted-foreground">DEF</span>
                </div>
                <span className="text-sm font-bold text-cyan-400">
                  {telematics.defLevel}%
                </span>
              </div>
              <Progress 
                value={telematics.defLevel} 
                className="h-1.5"
              />
            </CardContent>
          </Card>
        </div>

        {/* Engine Hours */}
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Engine Hours</span>
              </div>
              <span className="text-lg font-bold font-mono text-primary">
                {telematics.engineHours.toLocaleString()}h
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center gap-1.5">
                <Gauge className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Speed</span>
              </div>
              <div className="text-xl font-bold font-mono">
                {telematics.groundSpeed.toFixed(1)}
                <span className="text-xs text-muted-foreground ml-1">km/h</span>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-amber-400" />
                <span className="text-xs text-muted-foreground">RPM</span>
              </div>
              <div className="text-xl font-bold font-mono">
                {telematics.engineRPM.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Temperatures */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Thermometer className={cn(
                    "h-4 w-4",
                    telematics.engineTemp > 100 ? "text-red-500" : "text-emerald-500"
                  )} />
                  <span className="text-xs text-muted-foreground">Engine</span>
                </div>
                <span className={cn(
                  "font-bold font-mono",
                  telematics.engineTemp > 100 ? "text-red-500" : "text-foreground"
                )}>
                  {telematics.engineTemp}°C
                </span>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Thermometer className="h-4 w-4 text-cyan-400" />
                  <span className="text-xs text-muted-foreground">Hydraulic</span>
                </div>
                <span className="font-bold font-mono">
                  {telematics.hydraulicTemp}°C
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Battery */}
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className={cn(
                  "h-4 w-4",
                  telematics.batteryVoltage > 13 ? "text-emerald-500" : "text-amber-500"
                )} />
                <span className="text-xs text-muted-foreground">Battery Voltage</span>
              </div>
              <span className="font-bold font-mono">
                {telematics.batteryVoltage.toFixed(1)}V
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function FleetSummaryCard({ tractors }: { tractors: Tractor[] }) {
  const active = tractors.filter(t => t.status === "active").length;
  const withErrors = tractors.filter(t => t.dtcCodes.some(d => d.severity === "critical")).length;
  const withWarnings = tractors.filter(t => t.dtcCodes.some(d => d.severity === "warning") && !t.dtcCodes.some(d => d.severity === "critical")).length;
  const avgFuel = Math.round(tractors.reduce((sum, t) => sum + t.telematics.fuelLevel, 0) / tractors.length);
  
  return (
    <div className="grid grid-cols-4 gap-4">
      <Card className="border-border/50 bg-card/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{active}/{tractors.length}</p>
              <p className="text-xs text-muted-foreground">Active Units</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="border-border/50 bg-card/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{withErrors}</p>
              <p className="text-xs text-muted-foreground">Critical Faults</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="border-border/50 bg-card/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{withWarnings}</p>
              <p className="text-xs text-muted-foreground">Warnings</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="border-border/50 bg-card/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Fuel className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{avgFuel}%</p>
              <p className="text-xs text-muted-foreground">Avg Fuel Level</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function FleetIntelligencePage() {
  const [selectedTractor, setSelectedTractor] = useState<Tractor | null>(mockTractors[0]);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every second for live feel
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="flex h-14 items-center gap-4 px-6">
          <Link href="/admin/manager">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Button>
          </Link>
          <div className="h-6 w-px bg-border" />
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Fleet Intelligence</h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Megatron Vision</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-xs text-muted-foreground">LIVE</span>
            </div>
            <span className="text-sm font-mono text-foreground">
              {currentTime.toLocaleTimeString()}
            </span>
          </div>
        </div>
      </header>

      {/* Fleet Summary */}
      <div className="border-b border-border bg-secondary/20 px-6 py-4">
        <FleetSummaryCard tractors={mockTractors} />
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Map Area */}
        <div className="flex-1 relative bg-[#0a0f14]">
          {/* Dark styled map background */}
          <svg
            viewBox="0 0 100 100"
            className="w-full h-full"
            preserveAspectRatio="xMidYMid slice"
          >
            {/* Background gradient */}
            <defs>
              <linearGradient id="mapGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0a0f14" />
                <stop offset="50%" stopColor="#0d1318" />
                <stop offset="100%" stopColor="#0a0f14" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="0.5" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            
            <rect width="100" height="100" fill="url(#mapGradient)" />
            
            {/* Grid lines */}
            {Array.from({ length: 10 }).map((_, i) => (
              <g key={i}>
                <line
                  x1={i * 10}
                  y1="0"
                  x2={i * 10}
                  y2="100"
                  stroke="#1a2530"
                  strokeWidth="0.2"
                />
                <line
                  x1="0"
                  y1={i * 10}
                  x2="100"
                  y2={i * 10}
                  stroke="#1a2530"
                  strokeWidth="0.2"
                />
              </g>
            ))}
            
            {/* Stylized roads */}
            <path
              d="M 10,50 Q 30,45 50,50 T 90,50"
              fill="none"
              stroke="#1e3a4c"
              strokeWidth="1.5"
              filter="url(#glow)"
            />
            <path
              d="M 50,10 Q 55,30 50,50 T 50,90"
              fill="none"
              stroke="#1e3a4c"
              strokeWidth="1.5"
              filter="url(#glow)"
            />
            <path
              d="M 20,20 Q 40,35 60,40 T 85,70"
              fill="none"
              stroke="#152530"
              strokeWidth="0.8"
            />
            
            {/* Field boundaries */}
            <rect x="15" y="25" width="25" height="20" fill="none" stroke="#1a4530" strokeWidth="0.3" rx="1" />
            <rect x="45" y="35" width="30" height="25" fill="none" stroke="#1a4530" strokeWidth="0.3" rx="1" />
            <rect x="20" y="55" width="20" height="18" fill="none" stroke="#1a4530" strokeWidth="0.3" rx="1" />
            <rect x="60" y="20" width="22" height="15" fill="none" stroke="#1a4530" strokeWidth="0.3" rx="1" />
            
            {/* Tractor markers */}
            {mockTractors.map((tractor, i) => (
              <TractorMarker
                key={tractor.id}
                tractor={tractor}
                position={tractorPositions[i]}
                isSelected={selectedTractor?.id === tractor.id}
                onClick={() => setSelectedTractor(tractor)}
              />
            ))}
          </svg>
          
          {/* Map overlay info */}
          <div className="absolute bottom-4 left-4 flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-emerald-500" />
              Active
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-amber-500" />
              Warning
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-red-500" />
              Critical
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-muted-foreground" />
              Idle
            </div>
          </div>
          
          {/* Megatron branding */}
          <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background/80 border border-border/50 backdrop-blur">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-xs font-bold tracking-wider">MEGATRON VISION</span>
          </div>
        </div>

        {/* Telematics Sidebar */}
        <div className="w-[380px] border-l border-border bg-card/50 flex flex-col">
          {/* Fleet List */}
          <div className="border-b border-border">
            <div className="px-4 py-3">
              <h2 className="text-sm font-semibold text-foreground">Connected Fleet</h2>
              <p className="text-xs text-muted-foreground">{mockTractors.length} units tracked</p>
            </div>
            <div className="px-2 pb-2">
              {mockTractors.map((tractor) => {
                const hasErrors = tractor.dtcCodes.some(d => d.severity === "critical");
                const hasWarnings = tractor.dtcCodes.some(d => d.severity === "warning");
                return (
                  <button
                    key={tractor.id}
                    type="button"
                    onClick={() => setSelectedTractor(tractor)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all",
                      selectedTractor?.id === tractor.id
                        ? "bg-primary/10 border border-primary/30"
                        : "hover:bg-muted/50 border border-transparent"
                    )}
                  >
                    <div className={cn(
                      "h-3 w-3 rounded-full shrink-0",
                      hasErrors 
                        ? "bg-red-500" 
                        : hasWarnings 
                          ? "bg-amber-500" 
                          : tractor.status === "active" 
                            ? "bg-emerald-500" 
                            : "bg-muted-foreground"
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{tractor.id}</p>
                      <p className="text-xs text-muted-foreground truncate">{tractor.model}</p>
                    </div>
                    {tractor.dtcCodes.length > 0 && (
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-[10px]",
                          hasErrors 
                            ? "border-red-500/50 text-red-400" 
                            : "border-amber-500/50 text-amber-400"
                        )}
                      >
                        {tractor.dtcCodes.length} DTC
                      </Badge>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Tractor Details */}
          <ScrollArea className="flex-1">
            <div className="p-4">
              {selectedTractor ? (
                <TelematicsPanel tractor={selectedTractor} />
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <MapPin className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Select a tractor to view telematics
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
