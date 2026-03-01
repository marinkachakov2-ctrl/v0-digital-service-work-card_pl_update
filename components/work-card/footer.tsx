"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SignaturePad } from "@/components/ui/signature-pad";
import { Banknote, CreditCard, PenLine, CheckCircle2, AlertTriangle, Save, Loader2, Clock, FileText, Lock, Download } from "lucide-react";
import { generateJobCardPDF, type PDFJobCardData } from "@/lib/pdf-export";
import { toast } from "sonner";

interface SaveResult {
  success: boolean;
  message?: string;
  jobCardId?: string;
  pendingOrder?: boolean;
  status?: "draft" | "completed";
}

interface FooterProps {
  paymentMethod: "bank" | "cash";
  onPaymentMethodChange: (method: "bank" | "cash") => void;
  laborTotal: number;
  partsTotal: number;
  vat: number;
  grandTotal: number;
  timerStatus: "idle" | "running" | "paused";
  orderNumber: string;
  onSaveCard: (signatureData?: string | null, signerName?: string) => Promise<SaveResult>;
  onFormReset: () => void;
  isReadOnly?: boolean;
  onStatusChange?: (status: "new" | "draft" | "completed") => void;
  // PDF Export data
  pdfData?: Omit<PDFJobCardData, "partsTotal" | "laborTotal" | "vat" | "grandTotal" | "customerSignature" | "customerName">;
}

export function Footer({
  paymentMethod,
  onPaymentMethodChange,
  laborTotal,
  partsTotal,
  vat,
  grandTotal,
  timerStatus,
  orderNumber,
  onSaveCard,
  onFormReset,
  isReadOnly = false,
  onStatusChange,
  pdfData,
}: FooterProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [savedResult, setSavedResult] = useState<SaveResult | null>(null);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [signerName, setSignerName] = useState<string>("");
  const hasActiveTimer = timerStatus === "running" || timerStatus === "paused";
  const hasPendingOrder = !orderNumber || orderNumber.trim() === "";

  // Export PDF handler
  const handleExportPDF = async () => {
    if (!pdfData) {
      toast.error("PDF Export Error", {
        description: "Missing job card data for PDF export.",
      });
      return;
    }

    setIsExportingPDF(true);
    try {
      const fullPdfData: PDFJobCardData = {
        ...pdfData,
        partsTotal,
        laborTotal,
        vat,
        grandTotal,
        customerSignature: signatureData,
        customerName: signerName,
      };

      await generateJobCardPDF(fullPdfData);
      
      toast.success("PDF Exported!", {
        description: "Service report has been downloaded.",
      });
    } catch (error) {
      console.error("[v0] PDF export failed:", error);
      toast.error("PDF Export Failed", {
        description: "Could not generate the PDF. Please try again.",
      });
    } finally {
      setIsExportingPDF(false);
    }
  };

  // Handle signature change from SignaturePad
  const handleSignatureChange = (signature: string | null, name?: string) => {
    setSignatureData(signature);
    if (name !== undefined) {
      setSignerName(name);
    }
  };

  // Save as draft (no signature required)
  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      const result = await onSaveCard(null, signerName); // No signature = draft
      if (result.success) {
        setSavedResult({ ...result, status: "draft" });
        onStatusChange?.("draft");
        toast.success("Картата е записана като чернова!", {
          description: "Можете да я редактирате и подпишете по-късно.",
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

  // Finalize with signature (status = completed, read-only after)
  const handleFinalizeAndSign = async () => {
    if (!signatureData) {
      toast.error("Липсва подпис", {
        description: "Моля, добавете подпис на клиента преди финализиране.",
      });
      return;
    }

    setIsSaving(true);
    try {
      const result = await onSaveCard(signatureData, signerName); // With signature = completed
      if (result.success) {
        setSavedResult({ ...result, status: "completed" });
        onStatusChange?.("completed");
        toast.success("Картата е финализирана!", {
          description: "Клиентът е подписал и картата е заключена.",
        });
      } else {
        toast.error("Грешка при финализиране", {
          description: result.message || "Моля, опитайте отново.",
        });
      }
    } catch {
      toast.error("Грешка при финализиране", {
        description: "Възникна неочаквана грешка.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-reset ONLY for completed cards (not drafts - keep form data for drafts)
  useEffect(() => {
    if (savedResult?.success && savedResult.status === "completed") {
      const timer = setTimeout(() => {
        setSavedResult(null);
        onFormReset();
      }, 4000);
      return () => clearTimeout(timer);
    }
    // For drafts, just clear the savedResult after showing confirmation briefly
    if (savedResult?.success && savedResult.status === "draft") {
      const timer = setTimeout(() => {
        setSavedResult(null);
        // Do NOT call onFormReset() - keep all data visible for draft
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [savedResult, onFormReset]);

  // Show success screen ONLY for completed cards - drafts stay on the form
  if (savedResult?.success && savedResult.status === "completed") {
    return (
      <Card className="border-emerald-500/40 bg-emerald-500/5">
        <CardContent className="flex flex-col items-center justify-center py-12 space-y-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20">
            <Lock className="h-10 w-10 text-emerald-500" />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-emerald-500">Финализирана и Заключена!</h2>
            <p className="text-muted-foreground">
              Работната карта е подписана и не може да бъде редактирана.
            </p>
          </div>
          
          {/* Job Card ID */}
          <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-6 py-4">
            <FileText className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Job Card ID (Supabase)</p>
              <p className="font-mono text-lg font-bold text-foreground">{savedResult.jobCardId}</p>
            </div>
          </div>

          {/* Status Badge */}
          <Badge 
            variant="outline" 
            className="border-emerald-500/30 bg-emerald-500/10 text-emerald-500 px-4 py-2"
          >
            <Lock className="mr-2 h-4 w-4" />
            Статус: Completed (Заключена)
          </Badge>

          {savedResult.pendingOrder && (
            <Badge variant="outline" className="border-amber-500/30 text-amber-500">
              Чака присвояване на номер на поръчка
            </Badge>
          )}

          <p className="text-xs text-muted-foreground">Формулярът ще се нулира автоматично...</p>
        </CardContent>
      </Card>
    );
  }

  // Read-only mode for completed cards
  if (isReadOnly) {
    return (
      <Card className="border-emerald-500/40 bg-emerald-500/5">
        <CardContent className="flex flex-col items-center justify-center py-8 space-y-4">
          <Lock className="h-12 w-12 text-emerald-500" />
          <p className="text-lg font-semibold text-emerald-500">Картата е заключена</p>
          <p className="text-sm text-muted-foreground text-center">
            Тази работна карта е подписана от клиента и не може да бъде редактирана.
          </p>
          {/* Export PDF button for completed cards */}
          <Button
            onClick={handleExportPDF}
            disabled={isExportingPDF}
            variant="outline"
            className="gap-2 px-6 py-5 text-base border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
          >
            {isExportingPDF ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Download className="h-5 w-5" />
            )}
            Export Service Report (PDF)
          </Button>
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
                  <Label htmlFor="bank" className="flex flex-1 cursor-pointer items-center gap-2 text-foreground">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    По банков път (Bank Transfer)
                  </Label>
                </div>
                <div className="flex items-center space-x-3 rounded-md border border-border bg-secondary p-3">
                  <RadioGroupItem value="cash" id="cash" />
                  <Label htmlFor="cash" className="flex flex-1 cursor-pointer items-center gap-2 text-foreground">
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
                  <span className="font-mono text-foreground">{(laborTotal + partsTotal).toFixed(2)} лв.</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">VAT (20%):</span>
                  <span className="font-mono text-foreground">{vat.toFixed(2)} лв.</span>
                </div>
                <Separator className="bg-border" />
                <div className="flex justify-between">
                  <span className="text-lg font-semibold text-foreground">Grand Total:</span>
                  <span className="font-mono text-xl font-bold text-primary">{grandTotal.toFixed(2)} лв.</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Client Signature Pad */}
      <SignaturePad
        onSignatureChange={handleSignatureChange}
        disabled={isReadOnly}
      />

      {/* Warning: signing auto-stops clocking */}
      {hasActiveTimer && (
        <div className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
          <p className="text-sm text-amber-500">
            Финализирането ще спре автоматично всички активни часовници за тази карта.
          </p>
        </div>
      )}

      {/* Pending Order Warning */}
      {hasPendingOrder && (
        <div className="flex items-center justify-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <Clock className="h-4 w-4 shrink-0 text-amber-500" />
          <p className="text-sm text-amber-500">
            Няма номер на поръчка. Картата ще бъде записана като &quot;Чака присвояване&quot;.
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        {/* Export PDF */}
        <Button
          onClick={handleExportPDF}
          disabled={isExportingPDF || isSaving}
          variant="outline"
          className="gap-2 px-5 py-5 text-base border-primary/30 text-primary hover:bg-primary/10"
        >
          {isExportingPDF ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Download className="h-5 w-5" />
          )}
          Export PDF
        </Button>

        {/* Save as Draft */}
        <Button
          onClick={handleSaveDraft}
          disabled={isSaving}
          variant="outline"
          className="gap-2 px-6 py-5 text-base"
        >
          {isSaving ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Save className="h-5 w-5" />
          )}
          Запази Чернова
        </Button>

        {/* Finalize & Sign */}
        <Button
          onClick={handleFinalizeAndSign}
          disabled={isSaving || !signatureData}
          className="gap-2 bg-emerald-600 px-6 py-5 text-base text-white hover:bg-emerald-700"
        >
          {isSaving ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <PenLine className="h-5 w-5" />
          )}
          Финализирай и Подпиши
        </Button>
      </div>

      {/* Status indicators */}
      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-amber-500"></span>
          Чернова = Редактируема
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
          Подписана = Заключена
        </span>
      </div>

      {/* Disclaimer */}
      <p className="text-center text-xs text-muted-foreground">
        С подписването клиентът се съгласява с общите условия на Мегатрон ЕАД.
      </p>
    </div>
  );
}
