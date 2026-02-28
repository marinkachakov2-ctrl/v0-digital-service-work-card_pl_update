"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Banknote, CreditCard, PenLine, CheckCircle2, AlertTriangle, Save, Loader2, Clock, FileText } from "lucide-react";
import { toast } from "sonner";

interface SaveResult {
  success: boolean;
  message?: string;
  jobCardId?: string;
  pendingOrder?: boolean;
}

interface FooterProps {
  paymentMethod: "bank" | "cash";
  onPaymentMethodChange: (method: "bank" | "cash") => void;
  laborTotal: number;
  partsTotal: number;
  vat: number;
  grandTotal: number;
  isSigned: boolean;
  onSign: () => void;
  timerStatus: "idle" | "running" | "paused";
  orderNumber: string;
  onSaveCard: () => Promise<SaveResult>;
  onFormReset: () => void;
}

export function Footer({
  paymentMethod,
  onPaymentMethodChange,
  laborTotal,
  partsTotal,
  vat,
  grandTotal,
  isSigned,
  onSign,
  timerStatus,
  orderNumber,
  onSaveCard,
  onFormReset,
}: FooterProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [savedResult, setSavedResult] = useState<SaveResult | null>(null);
  const hasActiveTimer = timerStatus === "running" || timerStatus === "paused";
  const hasPendingOrder = !orderNumber || orderNumber.trim() === "";

  const handleSaveCard = async () => {
    setIsSaving(true);
    try {
      const result = await onSaveCard();
      if (result.success) {
        setSavedResult(result);
        toast.success("Картата е записана успешно!", {
          description: result.pendingOrder 
            ? "Чака присвояване на номер на поръчка."
            : "Всички данни са запазени.",
        });
      } else {
        toast.error("Грешка при запис", {
          description: result.message || "Моля, опитайте отново.",
        });
      }
    } catch {
      toast.error("Грешка при запис", {
        description: "Възникна неочаквана грешка.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Success screen after save - auto reset after 4 seconds
  useEffect(() => {
    if (savedResult?.success) {
      const timer = setTimeout(() => {
        setSavedResult(null);
        onFormReset();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [savedResult, onFormReset]);

  // Success screen after save
  if (savedResult?.success) {
    return (
      <Card className="border-emerald-500/40 bg-emerald-500/5">
        <CardContent className="flex flex-col items-center justify-center py-12 space-y-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-emerald-500">Успешно Записана!</h2>
            <p className="text-muted-foreground">Работната карта е запазена в базата данни.</p>
          </div>
          
          {/* Job Card ID */}
          <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-6 py-4">
            <FileText className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Job Card ID (Supabase)</p>
              <p className="font-mono text-lg font-bold text-foreground">{savedResult.jobCardId}</p>
            </div>
          </div>

          {/* Pending Order Badge */}
          {savedResult.pendingOrder && (
            <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-500 px-4 py-2">
              <Clock className="mr-2 h-4 w-4" />
              Чака присвояване на номер на поръчка
            </Badge>
          )}

          <p className="text-xs text-muted-foreground">Формулярът ще се нулира автоматично...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Payment & Totals */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base text-foreground">
            <CreditCard className="h-4 w-4 text-primary" />
            Плащане и Сметка
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Payment Method */}
            <div className="space-y-3">
              <Label className="text-sm text-muted-foreground">Payment Method</Label>
              <RadioGroup
                value={paymentMethod}
                onValueChange={(value) => onPaymentMethodChange(value as "bank" | "cash")}
                className="flex flex-col gap-3"
              >
                <div className="flex items-center space-x-3 rounded-md border border-border bg-secondary p-3">
                  <RadioGroupItem value="bank" id="bank" />
                  <Label
                    htmlFor="bank"
                    className="flex flex-1 cursor-pointer items-center gap-2 text-foreground"
                  >
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    По банков път (Bank Transfer)
                  </Label>
                </div>
                <div className="flex items-center space-x-3 rounded-md border border-border bg-secondary p-3">
                  <RadioGroupItem value="cash" id="cash" />
                  <Label
                    htmlFor="cash"
                    className="flex flex-1 cursor-pointer items-center gap-2 text-foreground"
                  >
                    <Banknote className="h-4 w-4 text-muted-foreground" />
                    В брой (Cash)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Totals */}
            <div className="rounded-lg border border-border bg-secondary p-4">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Service Total:</span>
                  <span className="font-mono text-foreground">{laborTotal.toFixed(2)} лв.</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Parts Total:</span>
                  <span className="font-mono text-foreground">{partsTotal.toFixed(2)} лв.</span>
                </div>
                <Separator className="bg-border" />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-mono text-foreground">
                    {(laborTotal + partsTotal).toFixed(2)} лв.
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">VAT (20%):</span>
                  <span className="font-mono text-foreground">{vat.toFixed(2)} лв.</span>
                </div>
                <Separator className="bg-border" />
                <div className="flex justify-between">
                  <span className="text-lg font-semibold text-foreground">Grand Total:</span>
                  <span className="font-mono text-xl font-bold text-primary">
                    {grandTotal.toFixed(2)} лв.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Signatures */}
      <Card className={`border-border bg-card ${isSigned ? "border-emerald-500/40" : ""}`}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base text-foreground">
            <PenLine className="h-4 w-4 text-primary" />
            Подписи (Signatures)
            {isSigned && (
              <Badge className="ml-2 bg-emerald-500/15 text-emerald-500 border-emerald-500/30">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Signed
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Technician</Label>
              <div className="flex h-24 items-center justify-center rounded-md border-2 border-dashed border-border bg-secondary">
                <span className="text-sm text-muted-foreground">Signature Area</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Client</Label>
              {isSigned ? (
                <div className="flex h-24 items-center justify-center rounded-md border-2 border-emerald-500/30 bg-emerald-500/5">
                  <div className="flex items-center gap-2 text-emerald-500">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="text-sm font-medium">Signed</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex h-24 items-center justify-center rounded-md border-2 border-dashed border-border bg-secondary">
                    <span className="text-sm text-muted-foreground">Signature Area</span>
                  </div>
                  <Button
                    onClick={onSign}
                    className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <PenLine className="h-4 w-4" />
                    Client Sign
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Warning: signing auto-stops clocking */}
          {!isSigned && hasActiveTimer && (
            <div className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
              <p className="text-xs text-amber-500">
                Signing will automatically stop all active clocking for this job card.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Order Warning */}
      {hasPendingOrder && (
        <div className="flex items-center justify-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <Clock className="h-4 w-4 shrink-0 text-amber-500" />
          <p className="text-sm text-amber-500">
            Няма номер на поръчка. Картата ще бъде записана като &quot;Чака присвояване&quot;.
          </p>
        </div>
      )}

      {/* Save Card Button */}
      <div className="flex flex-col items-center gap-3">
        <Button
          onClick={handleSaveCard}
          disabled={isSaving}
          className="gap-2 bg-primary px-8 py-6 text-lg text-primary-foreground hover:bg-primary/90"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Запазване...
            </>
          ) : (
            <>
              <Save className="h-5 w-5" />
              Запази Карта
            </>
          )}
        </Button>
        {hasPendingOrder && (
          <Badge variant="outline" className="border-amber-500/30 text-amber-500">
            Pending Order Assignment
          </Badge>
        )}
      </div>

      {/* Disclaimer */}
      <p className="text-center text-xs text-muted-foreground">
        The client agrees to the general terms of Megatron EAD.
      </p>
    </div>
  );
}
