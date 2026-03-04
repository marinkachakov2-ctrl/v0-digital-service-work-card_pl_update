"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eraser, Check, PenLine, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

interface TechnicianSignaturePadProps {
  onSignatureChange: (signatureData: string | null, technicianName?: string) => void;
  disabled?: boolean;
  initialSignature?: string | null;
  initialTechnicianName?: string;
  leadTechnician?: string;
}

export function TechnicianSignaturePad({ 
  onSignatureChange, 
  disabled = false, 
  initialSignature = null,
  initialTechnicianName = "",
  leadTechnician = ""
}: TechnicianSignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(!!initialSignature);
  const [technicianName, setTechnicianName] = useState(initialTechnicianName || leadTechnician);

  // Update name when leadTechnician changes
  useEffect(() => {
    if (leadTechnician && !technicianName) {
      setTechnicianName(leadTechnician);
    }
  }, [leadTechnician, technicianName]);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Style - use a blue color for technician to differentiate
    ctx.strokeStyle = "#3b82f6"; // blue-500
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Load initial signature if exists
    if (initialSignature) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
      };
      img.src = initialSignature;
    }
  }, [initialSignature]);

  const getCoordinates = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    
    if ("touches" in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  }, [disabled, getCoordinates]);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || disabled) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  }, [isDrawing, disabled, getCoordinates]);

  const stopDrawing = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);

    // Save signature as base64
    const canvas = canvasRef.current;
    if (canvas && hasSignature) {
      const signatureData = canvas.toDataURL("image/png");
      onSignatureChange(signatureData, technicianName);
    }
  }, [isDrawing, hasSignature, onSignatureChange, technicianName]);

  const clearSignature = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    onSignatureChange(null, technicianName);
  }, [onSignatureChange, technicianName]);

  // Update parent when technician name changes
  const handleNameChange = useCallback((name: string) => {
    setTechnicianName(name);
    if (hasSignature) {
      const canvas = canvasRef.current;
      if (canvas) {
        const signatureData = canvas.toDataURL("image/png");
        onSignatureChange(signatureData, name);
      }
    }
  }, [hasSignature, onSignatureChange]);

  return (
    <Card className={cn("border-primary/30 bg-primary/5", disabled && "opacity-60")}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Wrench className="h-4 w-4 text-primary" />
          Подпис на Техника
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Technician Name Input */}
        <div className="space-y-2">
          <Label htmlFor="tech-name" className="flex items-center gap-2 text-sm text-muted-foreground">
            <PenLine className="h-3 w-3" />
            Име на техника
          </Label>
          <Input
            id="tech-name"
            value={technicianName}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Въведете име и фамилия..."
            disabled={disabled}
            className="bg-card text-foreground border-border"
          />
        </div>

        {/* Signature Canvas */}
        <div 
          className={cn(
            "relative rounded-lg border-2 border-dashed bg-card/50",
            disabled ? "border-muted cursor-not-allowed" : "border-primary/40 cursor-crosshair",
            hasSignature && "border-primary/70"
          )}
        >
          <canvas
            ref={canvasRef}
            className="h-36 w-full touch-none"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
          {!hasSignature && !disabled && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">Подпишете тук (техник)</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {hasSignature ? (
              <span className="flex items-center gap-1 text-xs text-primary">
                <Check className="h-3 w-3" />
                Техникът е подписал
              </span>
            ) : (
              <span className="text-xs text-amber-500">Изисква се подпис на техника</span>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearSignature}
            disabled={disabled || !hasSignature}
            className="gap-1 text-xs"
          >
            <Eraser className="h-3 w-3" />
            Изчисти
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
