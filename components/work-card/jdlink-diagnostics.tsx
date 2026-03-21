"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Battery,
  Fuel,
  AlertTriangle,
  Radio,
  Lock,
  Plus,
  Activity,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface JDLinkDiagnosticsProps {
  engineHours?: number;
  batteryVoltage?: number;
  fuelLevel?: number;
  dtcCodes?: Array<{
    code: string;
    description: string;
    severity: "warning" | "critical";
  }>;
  onAppendToNotes?: (text: string) => void;
  isConnected?: boolean;
}

export function JDLinkDiagnostics({
  engineHours = 2156,
  batteryVoltage = 13.8,
  fuelLevel = 28,
  dtcCodes = [
    {
      code: "ECU 524287.31",
      description: "Engine Oil Pressure Low",
      severity: "warning" as const,
    },
  ],
  onAppendToNotes,
  isConnected = true,
}: JDLinkDiagnosticsProps) {
  const [appendedCodes, setAppendedCodes] = useState<Set<string>>(new Set());

  const handleAppendDTC = (code: string, description: string) => {
    if (onAppendToNotes) {
      onAppendToNotes(`[JDLink DTC] ${code}: ${description}`);
      setAppendedCodes((prev) => new Set(prev).add(code));
    }
  };

  const batteryStatus =
    batteryVoltage >= 13.5 ? "good" : batteryVoltage >= 12.5 ? "low" : "critical";
  const fuelStatus =
    fuelLevel >= 50 ? "good" : fuelLevel >= 25 ? "low" : "critical";

  return (
    <Card
      className={cn(
        "relative overflow-hidden border-2 shadow-xl",
        "bg-gradient-to-br from-[#0a0f0a] via-[#0d1410] to-[#0a0a0a]",
        "border-[#367C2B]/40",
        // Subtle animated glow effect
        "before:absolute before:inset-0 before:rounded-lg before:p-[2px]",
        "before:bg-gradient-to-r before:from-[#367C2B]/20 before:via-[#FFDE00]/10 before:to-[#367C2B]/20",
        "before:opacity-50 before:-z-10"
      )}
    >
      {/* Animated corner accent */}
      <div className="absolute top-0 right-0 w-20 h-20 overflow-hidden">
        <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-[#367C2B] animate-pulse shadow-[0_0_10px_#367C2B]" />
      </div>

      <CardHeader className="pb-3 pt-4 px-4">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Radio className="h-5 w-5 text-[#367C2B]" />
              {isConnected && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#367C2B] animate-ping" />
              )}
            </div>
            <span className="text-sm font-bold text-white uppercase tracking-wider">
              Live JDLink Diagnostics
            </span>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] uppercase tracking-wider font-mono",
              isConnected
                ? "border-[#367C2B]/50 bg-[#367C2B]/10 text-[#367C2B]"
                : "border-red-500/50 bg-red-500/10 text-red-400"
            )}
          >
            <Activity className="h-3 w-3 mr-1" />
            {isConnected ? "STREAMING" : "OFFLINE"}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="px-4 pb-4 space-y-4">
        {/* Vitals Row - Compact Grid */}
        <div className="grid grid-cols-3 gap-3">
          {/* Engine Hours */}
          <div className="relative rounded-lg border border-[#367C2B]/30 bg-black/40 p-3 backdrop-blur-sm">
            <div className="absolute top-2 right-2">
              <Lock className="h-3 w-3 text-[#367C2B]/60" />
            </div>
            <div className="flex items-center gap-1.5 mb-1">
              <Clock className="h-3.5 w-3.5 text-[#367C2B]" />
              <span className="text-[10px] uppercase tracking-wider text-gray-400">
                Engine Hours
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold font-mono text-[#367C2B] tabular-nums">
                {engineHours.toLocaleString()}
              </span>
              <span className="text-xs text-gray-500">h</span>
            </div>
          </div>

          {/* Battery Voltage */}
          <div className="relative rounded-lg border border-[#367C2B]/30 bg-black/40 p-3 backdrop-blur-sm">
            <div className="absolute top-2 right-2">
              <Lock className="h-3 w-3 text-[#367C2B]/60" />
            </div>
            <div className="flex items-center gap-1.5 mb-1">
              <Battery
                className={cn(
                  "h-3.5 w-3.5",
                  batteryStatus === "good"
                    ? "text-[#367C2B]"
                    : batteryStatus === "low"
                    ? "text-amber-500"
                    : "text-red-500"
                )}
              />
              <span className="text-[10px] uppercase tracking-wider text-gray-400">
                Battery
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span
                className={cn(
                  "text-xl font-bold font-mono tabular-nums",
                  batteryStatus === "good"
                    ? "text-[#367C2B]"
                    : batteryStatus === "low"
                    ? "text-amber-500"
                    : "text-red-500"
                )}
              >
                {batteryVoltage.toFixed(1)}
              </span>
              <span className="text-xs text-gray-500">V</span>
            </div>
            <Badge
              className={cn(
                "mt-1.5 text-[8px] px-1.5 py-0",
                batteryStatus === "good"
                  ? "bg-[#367C2B]/20 text-[#367C2B] border-[#367C2B]/30"
                  : batteryStatus === "low"
                  ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                  : "bg-red-500/20 text-red-400 border-red-500/30"
              )}
              variant="outline"
            >
              {batteryStatus === "good"
                ? "GOOD"
                : batteryStatus === "low"
                ? "LOW"
                : "CRITICAL"}
            </Badge>
          </div>

          {/* Fuel Level */}
          <div className="relative rounded-lg border border-[#367C2B]/30 bg-black/40 p-3 backdrop-blur-sm">
            <div className="absolute top-2 right-2">
              <Lock className="h-3 w-3 text-[#367C2B]/60" />
            </div>
            <div className="flex items-center gap-1.5 mb-1">
              <Fuel
                className={cn(
                  "h-3.5 w-3.5",
                  fuelStatus === "good"
                    ? "text-[#367C2B]"
                    : fuelStatus === "low"
                    ? "text-amber-500"
                    : "text-red-500"
                )}
              />
              <span className="text-[10px] uppercase tracking-wider text-gray-400">
                Fuel
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span
                className={cn(
                  "text-xl font-bold font-mono tabular-nums",
                  fuelStatus === "good"
                    ? "text-[#367C2B]"
                    : fuelStatus === "low"
                    ? "text-amber-500"
                    : "text-red-500"
                )}
              >
                {fuelLevel}
              </span>
              <span className="text-xs text-gray-500">%</span>
            </div>
            {/* Mini progress bar */}
            <div className="mt-1.5 h-1.5 w-full rounded-full bg-gray-800 overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  fuelStatus === "good"
                    ? "bg-gradient-to-r from-[#367C2B] to-[#4a9c3d]"
                    : fuelStatus === "low"
                    ? "bg-gradient-to-r from-amber-600 to-amber-400"
                    : "bg-gradient-to-r from-red-600 to-red-400"
                )}
                style={{ width: `${fuelLevel}%` }}
              />
            </div>
          </div>
        </div>

        {/* Active DTC Alerts */}
        {dtcCodes.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-500">
                Active DTC Alerts
              </span>
              <Badge
                variant="outline"
                className="bg-amber-500/10 border-amber-500/30 text-amber-400 text-[10px] px-1.5"
              >
                {dtcCodes.length}
              </Badge>
            </div>

            <div className="space-y-2">
              {dtcCodes.map((dtc) => (
                <div
                  key={dtc.code}
                  className={cn(
                    "relative rounded-lg border p-3 backdrop-blur-sm",
                    dtc.severity === "critical"
                      ? "border-red-500/40 bg-red-950/30"
                      : "border-amber-500/40 bg-amber-950/30",
                    // Glowing border effect
                    dtc.severity === "critical"
                      ? "shadow-[inset_0_0_20px_rgba(239,68,68,0.1)]"
                      : "shadow-[inset_0_0_20px_rgba(245,158,11,0.1)]"
                  )}
                >
                  {/* Pulsing indicator */}
                  <div
                    className={cn(
                      "absolute top-3 left-3 w-2 h-2 rounded-full animate-pulse",
                      dtc.severity === "critical" ? "bg-red-500" : "bg-amber-500"
                    )}
                  />

                  <div className="flex items-start justify-between gap-3 pl-4">
                    <div className="flex-1 min-w-0">
                      <div
                        className={cn(
                          "font-mono text-sm font-bold",
                          dtc.severity === "critical"
                            ? "text-red-400"
                            : "text-amber-400"
                        )}
                      >
                        {dtc.code}
                      </div>
                      <div className="text-sm text-gray-300 mt-0.5">
                        {dtc.description}
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAppendDTC(dtc.code, dtc.description)}
                      disabled={appendedCodes.has(dtc.code)}
                      className={cn(
                        "shrink-0 text-xs h-8 gap-1.5 transition-all",
                        appendedCodes.has(dtc.code)
                          ? "border-[#367C2B]/50 bg-[#367C2B]/10 text-[#367C2B]"
                          : "border-amber-500/50 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 hover:border-amber-500"
                      )}
                    >
                      {appendedCodes.has(dtc.code) ? (
                        <>
                          <Zap className="h-3 w-3" />
                          Added
                        </>
                      ) : (
                        <>
                          <Plus className="h-3 w-3" />
                          Append to Notes
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Connection footer */}
        <div className="flex items-center justify-between pt-2 border-t border-white/5">
          <div className="flex items-center gap-2 text-[10px] text-gray-500">
            <span className="font-mono">JDLink API v3.2</span>
            <span className="text-gray-700">|</span>
            <span>Last sync: 2s ago</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#367C2B] animate-pulse" />
            <span className="text-[10px] text-[#367C2B]/80 font-mono">LIVE</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
