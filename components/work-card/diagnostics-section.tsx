"use client";

import React from "react"

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Calendar, Clock, Gauge, Mic, MicOff, AlertCircle, Camera, X, ImageIcon, Upload } from "lucide-react";

// Web Speech API types are declared globally in /types/speech-recognition.d.ts

const causes = [
  { value: "A", label: "A - Слаб материал" },
  { value: "B", label: "B - Слаба заварка" },
  { value: "C", label: "C - Погрешна изработка" },
  { value: "E", label: "E - Сглобено погрешно" },
  { value: "F", label: "F - Чуждо тяло" },
  { value: "G", label: "G - Лоша отливка" },
];

const defects = [
  { value: "01", label: "01 - Напрегнал" },
  { value: "02", label: "02 - Издухан" },
  { value: "03", label: "03 - Счупен/Пукнат" },
  { value: "04", label: "04 - Изгорял" },
  { value: "05", label: "05 - Хлабав" },
  { value: "06", label: "06 - Корозия" },
  { value: "07", label: "07 - Електрическа повреда" },
  { value: "09", label: "09 - Теч" },
  { value: "13", label: "13 - Надраскан" },
  { value: "19", label: "19 - Приплъзване" },
  { value: "99", label: "99 - Други" },
];

export interface FaultPhoto {
  id: string;
  url: string;
  name: string;
  timestamp: Date;
}

interface DiagnosticsSectionProps {
  reasonCode: string;
  defectCode: string;
  description: string;
  faultDate: string;
  repairStart: string;
  repairEnd: string;
  engineHours: string;
  photos?: FaultPhoto[];
  onReasonChange: (value: string) => void;
  onDefectChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onFaultDateChange: (value: string) => void;
  onRepairStartChange: (value: string) => void;
  onRepairEndChange: (value: string) => void;
  onEngineHoursChange: (value: string) => void;
  onPhotosChange?: (photos: FaultPhoto[]) => void;
  previousEngineHours?: number | null;
  engineHoursPhoto: FaultPhoto | null;
  onEngineHoursPhotoChange: (photo: FaultPhoto | null) => void;
  engineHoursPhotoMissingReason: string;
  onEngineHoursPhotoMissingReasonChange: (reason: string) => void;
}

export function DiagnosticsSection({
  reasonCode,
  defectCode,
  description,
  faultDate,
  repairStart,
  repairEnd,
  engineHours,
  photos = [],
  previousEngineHours,
  engineHoursPhoto,
  onEngineHoursPhotoChange,
  engineHoursPhotoMissingReason,
  onEngineHoursPhotoMissingReasonChange,
  onReasonChange,
  onDefectChange,
  onDescriptionChange,
  onFaultDateChange,
  onRepairStartChange,
  onRepairEndChange,
  onEngineHoursChange,
  onPhotosChange,
}: DiagnosticsSectionProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [showUnsupportedDialog, setShowUnsupportedDialog] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const descriptionRef = useRef(description);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const engineHoursFileRef = useRef<HTMLInputElement>(null);

  // Keep description ref updated
  useEffect(() => {
    descriptionRef.current = description;
  }, [description]);

  // Detect platform
  const isIOS = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = typeof navigator !== "undefined" && /Android/.test(navigator.userAgent);
  const isMobile = isIOS || isAndroid;

  useEffect(() => {
    // Check if Speech Recognition is supported
    const SpeechRecognitionAPI =
      typeof window !== "undefined"
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null;
    
    if (SpeechRecognitionAPI) {
      setIsSupported(true);
      const recognition = new SpeechRecognitionAPI();
      recognitionRef.current = recognition;
      
      // Configure for mobile compatibility
      // On mobile, continuous mode can be problematic, so we use single utterance mode
      recognition.continuous = !isMobile;
      recognition.interimResults = true;
      recognition.lang = "bg-BG"; // Bulgarian language
      // Set max alternatives for better accuracy
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = "";
        let interim = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interim += transcript;
          }
        }

        // Show interim results while speaking
        setInterimText(interim);

        if (finalTranscript) {
          const currentDescription = descriptionRef.current;
          onDescriptionChange(
            currentDescription + (currentDescription ? " " : "") + finalTranscript
          );
          setInterimText("");
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error("Speech recognition error:", event.error);
        
        if (event.error === "not-allowed" || event.error === "permission-denied") {
          setPermissionDenied(true);
        }
        
        setIsListening(false);
        setInterimText("");
      };

      recognition.onend = () => {
        // On mobile, if we're still supposed to be listening, restart
        if (isMobile && isListening) {
          try {
            recognition.start();
          } catch {
            setIsListening(false);
          }
        } else {
          setIsListening(false);
        }
        setInterimText("");
      };

      recognition.onspeechend = () => {
        // On mobile, stop after speech ends for better UX
        if (isMobile) {
          recognition.stop();
          setIsListening(false);
        }
      };
    } else {
      setIsSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignore errors on cleanup
        }
      }
    };
  }, [isMobile, onDescriptionChange]);

  // Request microphone permission explicitly for mobile
  const requestMicrophonePermission = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop all tracks immediately - we just needed to request permission
      stream.getTracks().forEach(track => track.stop());
      setPermissionDenied(false);
      return true;
    } catch (error) {
      console.error("Microphone permission denied:", error);
      setPermissionDenied(true);
      return false;
    }
  }, []);

  const toggleListening = useCallback(async () => {
    if (!isSupported) {
      setShowUnsupportedDialog(true);
      return;
    }

    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      setInterimText("");
    } else {
      // On mobile, request permission first
      if (isMobile) {
        const hasPermission = await requestMicrophonePermission();
        if (!hasPermission) {
          return;
        }
      }

      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        console.error("Error starting speech recognition:", error);
        // Try to recover by creating a new instance
        const SpeechRecognitionAPI =
          window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognitionAPI) {
          recognitionRef.current = new SpeechRecognitionAPI();
          recognitionRef.current.continuous = !isMobile;
          recognitionRef.current.interimResults = true;
          recognitionRef.current.lang = "bg-BG";
          try {
            recognitionRef.current.start();
            setIsListening(true);
          } catch (retryError) {
            console.error("Retry failed:", retryError);
          }
        }
      }
    }
  }, [isListening, isMobile, isSupported, requestMicrophonePermission]);

  // Handle photo capture from camera
  const handlePhotoCapture = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const newPhotos: FaultPhoto[] = [];
    
    Array.from(files).forEach((file) => {
      const url = URL.createObjectURL(file);
      newPhotos.push({
        id: `photo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        url,
        name: file.name,
        timestamp: new Date(),
      });
    });

    if (onPhotosChange) {
      onPhotosChange([...photos, ...newPhotos]);
    }

    // Reset input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [photos, onPhotosChange]);

  // Remove a photo
  const handleRemovePhoto = useCallback((photoId: string) => {
    const photoToRemove = photos.find(p => p.id === photoId);
    if (photoToRemove) {
      URL.revokeObjectURL(photoToRemove.url);
    }
    if (onPhotosChange) {
      onPhotosChange(photos.filter(p => p.id !== photoId));
    }
    setSelectedImageIndex(null);
  }, [photos, onPhotosChange]);

  // Open camera/file picker
  const openCamera = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Engine hours photo capture
  const handleEngineHoursPhoto = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;
      const file = files[0];
      const url = URL.createObjectURL(file);
      onEngineHoursPhotoChange({
        id: `ehp-${Date.now()}`,
        url,
        name: file.name,
        timestamp: new Date(),
      });
      if (engineHoursFileRef.current) {
        engineHoursFileRef.current.value = "";
      }
    },
    [onEngineHoursPhotoChange]
  );

  return (
    <>
      {/* Unsupported Browser Dialog */}
      <AlertDialog open={showUnsupportedDialog} onOpenChange={setShowUnsupportedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Гласовото въвеждане не се поддържа
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Вашият браузър не поддържа гласово въвеждане. За да използвате тази функция:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Android:</strong> Използвайте Google Chrome</li>
                <li><strong>iOS:</strong> Използвайте Safari (iOS 14.5+) или Chrome</li>
                <li><strong>Desktop:</strong> Използвайте Chrome, Edge или Safari</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Разбрах</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card className="border-border bg-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base text-foreground">
            <AlertTriangle className="h-4 w-4 text-warning" />
            Диагностика
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Dropdowns and Code Display */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Причина (Reason)
              </Label>
              <Select value={reasonCode} onValueChange={onReasonChange}>
                <SelectTrigger className="bg-secondary text-foreground">
                  <SelectValue placeholder="Изберете причина" />
                </SelectTrigger>
                <SelectContent>
                  {causes.map((cause) => (
                    <SelectItem key={cause.value} value={cause.value}>
                      {cause.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Тип Дефект (Defect Type)
              </Label>
              <Select value={defectCode} onValueChange={onDefectChange}>
                <SelectTrigger className="bg-secondary text-foreground">
                  <SelectValue placeholder="Изберете дефект" />
                </SelectTrigger>
                <SelectContent>
                  {defects.map((defect) => (
                    <SelectItem key={defect.value} value={defect.value}>
                      {defect.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Selected Codes Display */}
          <div className="flex flex-wrap gap-3">
            <div className="inline-flex items-center rounded-md border border-border bg-secondary px-3 py-1.5">
              <span className="text-xs text-muted-foreground">Code:</span>
              <span className="ml-2 font-mono text-sm font-semibold text-primary">
                {reasonCode || "—"}
              </span>
            </div>
            <div className="inline-flex items-center rounded-md border border-border bg-secondary px-3 py-1.5">
              <span className="text-xs text-muted-foreground">Type:</span>
              <span className="ml-2 font-mono text-sm font-semibold text-primary">
                {defectCode || "—"}
              </span>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs text-muted-foreground">
                Описание на повредата (Detailed description of the failure)
              </Label>
              <div className="flex items-center gap-2">
                {/* Hidden file input for camera */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  onChange={handlePhotoCapture}
                  className="hidden"
                  aria-label="Заснемане на снимка"
                />
                
                {/* Camera Button */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={openCamera}
                        className="h-8 gap-1.5 shrink-0 bg-transparent hover:bg-secondary"
                      >
                        <Camera className="h-3.5 w-3.5" />
                        <span className="text-xs">Снимка</span>
                        {photos.length > 0 && (
                          <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                            {photos.length}
                          </span>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Направете снимка на повредата</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* Speech-to-text Button */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant={isListening ? "destructive" : "outline"}
                        size="sm"
                        onClick={toggleListening}
                        className={`h-8 gap-1.5 shrink-0 ${
                          isListening
                            ? "animate-pulse"
                            : "bg-transparent hover:bg-secondary"
                        }`}
                      >
                        {isListening ? (
                          <>
                            <MicOff className="h-3.5 w-3.5" />
                            <span className="text-xs">Спри</span>
                          </>
                        ) : (
                          <>
                            <Mic className="h-3.5 w-3.5" />
                            <span className="text-xs">Диктувай</span>
                          </>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {isListening
                          ? "Натиснете за да спрете записа"
                          : "Натиснете и говорете за да опишете повредата"}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>

            {/* Permission Denied Warning */}
            {permissionDenied && (
              <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>
                  Достъпът до микрофона е отказан. Моля, разрешете достъп от настройките на браузъра.
                </span>
              </div>
            )}

            <div className="relative">
              <Textarea
                value={description + (interimText ? (description ? " " : "") + interimText : "")}
                onChange={(e) => {
                  // Only update if we're not showing interim text
                  if (!interimText) {
                    onDescriptionChange(e.target.value);
                  }
                }}
                placeholder="Въведете подробно описание на повредата или натиснете бутона за диктовка..."
                className={`min-h-24 bg-secondary text-foreground placeholder:text-muted-foreground ${
                  isListening ? "ring-2 ring-destructive ring-offset-2" : ""
                }`}
              />
              {isListening && (
                <div className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-md bg-destructive px-2 py-1 text-xs text-destructive-foreground">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive-foreground opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive-foreground" />
                  </span>
                  {interimText ? "Слуша..." : "Записва..."}
                </div>
              )}
            </div>
            
            {/* Mobile hint */}
            {isMobile && isSupported && !isListening && (
              <p className="text-xs text-muted-foreground">
                Съвет: На мобилно устройство говорете ясно и правете паузи между изреченията.
              </p>
            )}

            {/* Photo Gallery */}
            {photos.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <ImageIcon className="h-3 w-3" />
                  Снимки на повредата ({photos.length})
                </Label>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {photos.map((photo, index) => (
                    <div 
                      key={photo.id} 
                      className="group relative aspect-square rounded-md overflow-hidden border border-border bg-secondary cursor-pointer"
                      onClick={() => setSelectedImageIndex(index)}
                    >
                      <img
                        src={photo.url || "/placeholder.svg"}
                        alt={`Снимка ${index + 1}`}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemovePhoto(photo.id);
                        }}
                        className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                        aria-label="Премахни снимката"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5 text-[10px] text-white truncate">
                        {photo.timestamp.toLocaleTimeString("bg-BG", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Image Preview Modal */}
            {selectedImageIndex !== null && photos[selectedImageIndex] && (
              <AlertDialog open={selectedImageIndex !== null} onOpenChange={() => setSelectedImageIndex(null)}>
                <AlertDialogContent className="max-w-3xl p-0 overflow-hidden">
                  <div className="relative">
                    <img
                      src={photos[selectedImageIndex].url || "/placeholder.svg"}
                      alt={`Снимка ${selectedImageIndex + 1}`}
                      className="w-full h-auto max-h-[80vh] object-contain bg-black"
                    />
                    <button
                      type="button"
                      onClick={() => setSelectedImageIndex(null)}
                      className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
                      aria-label="Затвори"
                    >
                      <X className="h-5 w-5" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between bg-black/70 px-4 py-2 text-white">
                      <span className="text-sm">
                        Снимка {selectedImageIndex + 1} от {photos.length}
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedImageIndex(Math.max(0, selectedImageIndex - 1))}
                          disabled={selectedImageIndex === 0}
                          className="text-white hover:bg-white/20"
                        >
                          Предишна
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedImageIndex(Math.min(photos.length - 1, selectedImageIndex + 1))}
                          disabled={selectedImageIndex === photos.length - 1}
                          className="text-white hover:bg-white/20"
                        >
                          Следваща
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemovePhoto(photos[selectedImageIndex].id)}
                        >
                          Изтрий
                        </Button>
                      </div>
                    </div>
                  </div>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>

          {/* Dates and Engine Hours */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                Fault Date
              </Label>
              <Input
                type="date"
                value={faultDate}
                onChange={(e) => onFaultDateChange(e.target.value)}
                className="bg-secondary text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                Repair Start
              </Label>
              <Input
                type="datetime-local"
                value={repairStart}
                onChange={(e) => onRepairStartChange(e.target.value)}
                className="bg-secondary text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                Repair End
              </Label>
              <Input
                type="datetime-local"
                value={repairEnd}
                onChange={(e) => onRepairEndChange(e.target.value)}
                className="bg-secondary text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Gauge className="h-3 w-3" />
                Моточасове
              </Label>
              <Input
                type="number"
                value={engineHours}
                onChange={(e) => onEngineHoursChange(e.target.value)}
                placeholder="0"
                className="bg-secondary text-foreground placeholder:text-muted-foreground"
              />
              {previousEngineHours != null && (
                <p className="text-[10px] text-muted-foreground">
                  Previous: <span className="font-mono font-medium">{previousEngineHours.toLocaleString()} h</span>
                </p>
              )}
            </div>
          </div>

          {/* Engine Hours Photo Validation */}
          <div className="rounded-lg border border-border bg-secondary/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Camera className="h-3 w-3" />
                Photo proof of engine hours meter
                <span className="text-destructive">*</span>
              </Label>
              {engineHoursPhoto && (
                <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 text-[10px]">
                  Photo attached
                </Badge>
              )}
            </div>

            {/* Hidden file input */}
            <input
              ref={engineHoursFileRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleEngineHoursPhoto}
              className="hidden"
              aria-label="Engine hours meter photo"
            />

            {engineHoursPhoto ? (
              <div className="flex items-center gap-3">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border border-border">
                  <img
                    src={engineHoursPhoto.url || "/placeholder.svg"}
                    alt="Engine hours meter"
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      URL.revokeObjectURL(engineHoursPhoto.url);
                      onEngineHoursPhotoChange(null);
                    }}
                    className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                    aria-label="Remove photo"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <div>
                  <p className="text-xs text-foreground">{engineHoursPhoto.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {engineHoursPhoto.timestamp.toLocaleTimeString("bg-BG", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => engineHoursFileRef.current?.click()}
                  className="gap-2 bg-transparent"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Upload Photo of Engine Hours
                </Button>

                {/* Missing photo explanation */}
                {!engineHoursPhoto && (
                  <div className="space-y-1.5">
                    <Label className="text-[10px] text-amber-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      If no photo is available, provide a reason:
                    </Label>
                    <Textarea
                      value={engineHoursPhotoMissingReason}
                      onChange={(e) => onEngineHoursPhotoMissingReasonChange(e.target.value)}
                      placeholder="Explain why photo proof is missing..."
                      className="min-h-12 bg-card text-foreground text-xs"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
