"use client";

import { useState, useEffect, useRef } from "react";
import type { ClientData } from "@/app/page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, MapPin, Tractor, Hash, Cpu, Clock, Loader2, CheckCircle2, AlertTriangle, Pencil, X } from "lucide-react";
import { searchClients } from "@/lib/actions";
import type { PayerStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

// Payer change reasons
const PAYER_CHANGE_REASONS = [
  { value: "different_billing", label: "Различно фактуриране" },
  { value: "subsidiary", label: "Дъщерна фирма" },
  { value: "leasing", label: "Лизингова компания" },
  { value: "insurance", label: "Застрахователна компания" },
  { value: "other", label: "Друга причина" },
];

interface ClientSectionProps {
  clientData: ClientData | null;
  isScanned: boolean;
  onBillingEntityChange: (value: string) => void;
  onPayerStatusChange?: (status: PayerStatus | null) => void;
  // Payer change handling
  currentPayer: PayerStatus | null;
  originalOwner: string | null;
  onPayerChange?: (payer: PayerStatus | null, reason?: string) => void;
  isPayerChanged?: boolean;
  payerChangeReason?: string;
}

export function ClientSection({
  clientData,
  isScanned,
  onBillingEntityChange,
  onPayerStatusChange,
  currentPayer,
  originalOwner,
  onPayerChange,
  isPayerChanged = false,
  payerChangeReason,
}: ClientSectionProps) {
  // Payer editing state
  const [isEditingPayer, setIsEditingPayer] = useState(false);
  const [payerSearchQuery, setPayerSearchQuery] = useState("");
  const [payerSearchResults, setPayerSearchResults] = useState<PayerStatus[]>([]);
  const [isSearchingPayers, setIsSearchingPayers] = useState(false);
  const [showPayerResults, setShowPayerResults] = useState(false);
  const [selectedNewPayer, setSelectedNewPayer] = useState<PayerStatus | null>(null);
  const [changeReason, setChangeReason] = useState("");
  const payerSearchRef = useRef<HTMLDivElement>(null);

  // Close payer dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (payerSearchRef.current && !payerSearchRef.current.contains(event.target as Node)) {
        setShowPayerResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced payer search
  useEffect(() => {
    if (payerSearchQuery.length < 2) {
      setPayerSearchResults([]);
      setShowPayerResults(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingPayers(true);
      try {
        const results = await searchClients(payerSearchQuery);
        setPayerSearchResults(results);
        setShowPayerResults(true);
      } catch (error) {
        console.error("Payer search error:", error);
        setPayerSearchResults([]);
      } finally {
        setIsSearchingPayers(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [payerSearchQuery]);

  // Handle selecting a new payer from search
  const handleSelectNewPayer = (payer: PayerStatus) => {
    setSelectedNewPayer(payer);
    setShowPayerResults(false);
    setPayerSearchQuery(payer.payerName);
  };

  // Confirm payer change
  const handleConfirmPayerChange = () => {
    if (selectedNewPayer && changeReason) {
      onPayerChange?.(selectedNewPayer, changeReason);
      onPayerStatusChange?.(selectedNewPayer);
      setIsEditingPayer(false);
      setPayerSearchQuery("");
      setSelectedNewPayer(null);
      setChangeReason("");
    }
  };

  // Cancel payer change
  const handleCancelPayerChange = () => {
    setIsEditingPayer(false);
    setPayerSearchQuery("");
    setSelectedNewPayer(null);
    setChangeReason("");
    setShowPayerResults(false);
  };

  // Check if payer is different from owner (needs reason)
  const needsChangeReason = selectedNewPayer && originalOwner && selectedNewPayer.payerName !== originalOwner;

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Building2 className="h-5 w-5 text-primary" />
          Клиент и Машина
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        {/* Machine Owner - Read Only */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Building2 className="h-3 w-3" />
            Собственик на машината
          </Label>
          <Input
            readOnly
            value={clientData?.machineOwner || originalOwner || ""}
            placeholder="--"
            className="bg-secondary text-foreground"
          />
        </div>

        {/* Payer / Billing Entity - Editable */}
        <div className="space-y-2" ref={payerSearchRef}>
          <Label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Building2 className="h-3 w-3" />
            Платец (Фактуриране)
            {isPayerChanged && (
              <span className="ml-auto text-[10px] font-semibold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">
                ПРОМЕНЕН
              </span>
            )}
          </Label>
          
          {!isEditingPayer ? (
            // Display mode
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={currentPayer?.payerName || clientData?.billingEntity || ""}
                placeholder="--"
                className={cn(
                  "flex-1 bg-secondary text-foreground",
                  currentPayer?.isBlocked && "border-red-500/50 text-red-400"
                )}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 gap-1.5 text-xs"
                onClick={() => setIsEditingPayer(true)}
                disabled={!isScanned}
              >
                <Pencil className="h-3 w-3" />
                Смени
              </Button>
            </div>
          ) : (
            // Edit mode - Autocomplete search
            <div className="space-y-3">
              <div className="relative">
                <Input
                  value={payerSearchQuery}
                  onChange={(e) => setPayerSearchQuery(e.target.value)}
                  onFocus={() => payerSearchQuery.length >= 2 && setShowPayerResults(true)}
                  placeholder="Търсене на платец..."
                  className="bg-background border-primary/50 focus:border-primary pr-10"
                  autoFocus
                />
                {isSearchingPayers && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
                
                {/* Payer search results dropdown */}
                {showPayerResults && payerSearchResults.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover shadow-lg" style={{ top: "100%" }}>
                    <div className="max-h-64 overflow-y-auto p-1">
                      {payerSearchResults.map((payer) => (
                        <button
                          key={payer.payerId}
                          type="button"
                          onClick={() => handleSelectNewPayer(payer)}
                          className={cn(
                            "w-full rounded-md px-3 py-2 text-left transition-colors",
                            "hover:bg-accent hover:text-accent-foreground",
                            "focus:outline-none focus:bg-accent",
                            payer.isBlocked && "border-l-2 border-red-500"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className={cn(
                              "font-medium text-sm",
                              payer.isBlocked ? "text-red-400" : "text-foreground"
                            )}>
                              {payer.payerName}
                            </span>
                            {payer.isBlocked && (
                              <span className="text-[10px] uppercase font-semibold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded">
                                БЛОКИРАН
                              </span>
                            )}
                          </div>
                          {payer.isBlocked && payer.creditWarningMessage && (
                            <p className="text-[10px] text-red-400 mt-0.5 truncate">
                              {payer.creditWarningMessage}
                            </p>
                          )}
                          {!payer.isBlocked && payer.creditLimit > 0 && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              Лимит: {payer.creditLimit.toLocaleString()} лв | Баланс: {payer.currentBalance.toLocaleString()} лв
                            </p>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Selected payer preview */}
              {selectedNewPayer && (
                <div className={cn(
                  "rounded-md border px-3 py-2",
                  selectedNewPayer.isBlocked 
                    ? "border-red-500/50 bg-red-500/5" 
                    : "border-emerald-500/50 bg-emerald-500/5"
                )}>
                  <div className="flex items-center gap-2">
                    {selectedNewPayer.isBlocked ? (
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    )}
                    <span className={cn(
                      "font-medium text-sm",
                      selectedNewPayer.isBlocked ? "text-red-400" : "text-foreground"
                    )}>
                      {selectedNewPayer.payerName}
                    </span>
                  </div>
                </div>
              )}

              {/* Reason dropdown - only if payer different from owner */}
              {needsChangeReason && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-amber-500">
                    Причина за смяна на платец *
                  </Label>
                  <Select value={changeReason} onValueChange={setChangeReason}>
                    <SelectTrigger className="bg-background border-amber-500/50">
                      <SelectValue placeholder="Изберете причина..." />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYER_CHANGE_REASONS.map((reason) => (
                        <SelectItem key={reason.value} value={reason.value}>
                          {reason.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={handleCancelPayerChange}
                >
                  <X className="h-3 w-3 mr-1" />
                  Отказ
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="flex-1 bg-[#007A33] hover:bg-[#006228] text-white"
                  onClick={handleConfirmPayerChange}
                  disabled={!selectedNewPayer || (needsChangeReason && !changeReason)}
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Потвърди
                </Button>
              </div>
            </div>
          )}
          
          {/* Warning if payer is blocked */}
          {currentPayer?.isBlocked && !isEditingPayer && (
            <p className="text-[10px] text-red-500 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              ВНИМАНИЕ: Този платец е блокиран!
            </p>
          )}
          
          {/* Show change reason if payer was changed */}
          {isPayerChanged && payerChangeReason && !isEditingPayer && (
            <p className="text-[10px] text-amber-500">
              Причина: {PAYER_CHANGE_REASONS.find(r => r.value === payerChangeReason)?.label || payerChangeReason}
            </p>
          )}
        </div>

        {/* Location */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            Локация
          </Label>
          <Input
            readOnly
            value={clientData?.location || ""}
            placeholder="--"
            className="bg-secondary text-foreground"
          />
        </div>

        {/* Machine Model */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Tractor className="h-3 w-3" />
            Модел Машина
          </Label>
          <Input
            readOnly
            value={clientData?.machineModel || ""}
            placeholder="--"
            className="bg-secondary text-foreground"
          />
        </div>

        {/* Serial Number - Read Only (comes from top search) */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Hash className="h-3 w-3" />
            Сериен No
          </Label>
          <Input
            readOnly
            value={clientData?.serialNo || ""}
            placeholder="--"
            className="bg-secondary text-foreground"
          />
        </div>

        {/* Engine SN */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Cpu className="h-3 w-3" />
            Engine SN
          </Label>
          <Input
            readOnly
            value={clientData?.engineSN || ""}
            placeholder="--"
            className="bg-secondary text-foreground"
          />
        </div>

        {/* Previous Engine Hours — read-only reference */}
        {clientData?.previousEngineHours != null && (
          <div className="sm:col-span-2 flex items-center gap-3 rounded-md border border-border bg-secondary/50 px-4 py-2.5">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Previous Engine Hours (last completed JC)</p>
              <p className="font-mono text-sm font-semibold text-foreground">{clientData.previousEngineHours.toLocaleString()} h</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
