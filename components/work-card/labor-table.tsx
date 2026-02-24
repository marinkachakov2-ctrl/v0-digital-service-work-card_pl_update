"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { LaborItem } from "@/app/page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Wrench, Mic, MicOff } from "lucide-react";

interface LaborTableProps {
  laborItems: LaborItem[];
  onLaborItemsChange: (items: LaborItem[]) => void;
  workNotes: string;
  onWorkNotesChange: (notes: string) => void;
}

export function LaborTable({ laborItems, onLaborItemsChange, workNotes, onWorkNotesChange }: LaborTableProps) {
  // Voice dictation state
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const workNotesRef = useRef(workNotes);

  useEffect(() => {
    workNotesRef.current = workNotes;
  }, [workNotes]);

  useEffect(() => {
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroidDevice = /Android/.test(navigator.userAgent);
    setIsMobile(isIOSDevice || isAndroidDevice);
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognitionAPI =
      typeof window !== "undefined"
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null;

    if (SpeechRecognitionAPI) {
      setIsSupported(true);
      const recognition = new SpeechRecognitionAPI();
      recognitionRef.current = recognition;

      recognition.continuous = !isMobile;
      recognition.interimResults = true;
      recognition.lang = "bg-BG";
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

        if (finalTranscript) {
          const current = workNotesRef.current;
          const separator = current && !current.endsWith("\n") && !current.endsWith(" ") ? " " : "";
          onWorkNotesChange(current + separator + finalTranscript);
          setInterimText("");
        } else {
          setInterimText(interim);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error === "not-allowed" || event.error === "permission-denied") {
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        if (isMobile && isListening) {
          try {
            recognition.start();
          } catch (_e) {
            setIsListening(false);
          }
        } else {
          setIsListening(false);
        }
        setInterimText("");
      };

      recognition.onspeechend = () => {
        if (isMobile) {
          recognition.stop();
          setIsListening(false);
        }
      };
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_e) {
          // Ignore errors on cleanup
        }
      }
    };
  }, [isMobile, isListening, onWorkNotesChange]);

  const toggleListening = useCallback(() => {
    if (!isSupported || !recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      setInterimText("");
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (_e) {
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
          } catch (_e2) {
            setIsListening(false);
          }
        }
      }
    }
  }, [isListening, isMobile, isSupported]);
  const addLaborItem = () => {
    const newItem: LaborItem = {
      id: crypto.randomUUID(),
      operationName: "",
      techCount: 1,
      price: 0,
    };
    onLaborItemsChange([...laborItems, newItem]);
  };

  const updateLaborItem = (id: string, field: keyof LaborItem, value: string | number) => {
    onLaborItemsChange(
      laborItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const removeLaborItem = (id: string) => {
    onLaborItemsChange(laborItems.filter((item) => item.id !== id));
  };

  const subtotal = laborItems.reduce((sum, item) => sum + item.techCount * item.price, 0);

  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="flex items-center gap-2 text-base text-foreground">
          <Wrench className="h-4 w-4 text-primary" />
          Труд
        </CardTitle>
        <Button
          onClick={addLaborItem}
          size="sm"
          className="gap-1 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Добави операция
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Операция</TableHead>
                <TableHead className="text-right text-muted-foreground">Бр. техници</TableHead>
                <TableHead className="text-right text-muted-foreground">Цена (лв.)</TableHead>
                <TableHead className="text-right text-muted-foreground">Общо</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {laborItems.length === 0 ? (
                <TableRow className="border-border hover:bg-transparent">
                  <TableCell
                    colSpan={5}
                    className="h-24 text-center text-muted-foreground"
                  >
                    {'Няма добавени операции. Натиснете „Добави операция" за нов ред.'}
                  </TableCell>
                </TableRow>
              ) : (
                laborItems.map((item) => (
                  <TableRow key={item.id} className="border-border">
                    <TableCell>
                      <Input
                        value={item.operationName}
                        onChange={(e) => updateLaborItem(item.id, "operationName", e.target.value)}
                        placeholder="Наименование на ��перация"
                        className="h-9 bg-secondary text-foreground"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="1"
                        value={item.techCount}
                        onChange={(e) => updateLaborItem(item.id, "techCount", parseInt(e.target.value) || 1)}
                        className="h-9 w-20 bg-secondary text-right text-foreground"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.price}
                        onChange={(e) => updateLaborItem(item.id, "price", parseFloat(e.target.value) || 0)}
                        className="h-9 w-24 bg-secondary text-right text-foreground"
                      />
                    </TableCell>
                    <TableCell className="text-right font-mono text-foreground">
                      {(item.techCount * item.price).toFixed(2)} лв.
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeLaborItem(item.id)}
                        className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Subtotal */}
        <div className="mt-4 flex justify-end border-t border-border pt-4">
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Общо труд:</span>
            <span className="font-mono text-lg font-semibold text-foreground">
              {subtotal.toFixed(2)} лв.
            </span>
          </div>
        </div>

        {/* Voice dictation work notes */}
        <div className="mt-6 space-y-2 border-t border-border pt-4">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Mic className="h-4 w-4 text-primary" />
              Описание на свършена работа
            </Label>
            {isSupported && (
              <Button
                type="button"
                variant={isListening ? "destructive" : "outline"}
                size="sm"
                onClick={toggleListening}
                className={`h-8 gap-1.5 shrink-0 ${
                  isListening ? "animate-pulse" : "bg-transparent hover:bg-secondary"
                }`}
              >
                {isListening ? (
                  <>
                    <MicOff className="h-3.5 w-3.5" />
                    Спри
                  </>
                ) : (
                  <>
                    <Mic className="h-3.5 w-3.5" />
                    Диктувай
                  </>
                )}
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Използвайте микрофона за да диктувате свършената работа. Операторът може да коригира отделните редове по-късно.
          </p>
          <div className="relative">
            <Textarea
              value={workNotes}
              onChange={(e) => onWorkNotesChange(e.target.value)}
              placeholder={'Натиснете "Диктувай" и опишете свършената работа с глас\u2026'}
              className="min-h-[120px] resize-y bg-secondary text-foreground placeholder:text-muted-foreground"
              rows={5}
            />
            {interimText && (
              <div className="mt-1 rounded-md border border-amber-500/30 bg-amber-950/20 px-3 py-2 text-sm italic text-amber-300/80">
                {interimText}{'\u2026'}
              </div>
            )}
            {isListening && (
              <div className="absolute right-3 top-3 flex items-center gap-1.5">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
                </span>
                <span className="text-xs font-medium text-red-400">REC</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
