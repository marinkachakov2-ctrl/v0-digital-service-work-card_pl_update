"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search, 
  QrCode, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle,
  Lock,
  Pencil,
  X,
  Building2,
  Tractor,
} from "lucide-react";
import { searchServiceOrders, searchClients, type ServiceOrderResult } from "@/lib/actions";
import type { PayerStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

// Order types mapping
const ORDER_TYPES = [
  { value: "repair", label: "Клиентска", dbValue: "repair" },
  { value: "warranty", label: "Гаранция", dbValue: "warranty" },
  { value: "internal", label: "Вътрешна", dbValue: "internal" },
  { value: "service_contract", label: "По договор", dbValue: "service_contract" },
] as const;

type OrderTypeValue = typeof ORDER_TYPES[number]["value"];

// Payer change reasons
const PAYER_CHANGE_REASONS = [
  { value: "different_billing", label: "Различно фактуриране" },
  { value: "subsidiary", label: "Дъщерна фирма" },
  { value: "leasing", label: "Лизингова компания" },
  { value: "insurance", label: "Застрахователна компания" },
  { value: "other", label: "Друга причина" },
];

export interface SelectedOrder {
  orderId: string;
  orderNumber: string;
  jobCardNumber: string;
  clientId: string | null;
  clientName: string;
  machineId: string | null;
  machineModel: string;
  machineSerial: string;
  serviceType: OrderTypeValue;
}

interface OrderSelectorProps {
  onOrderSelect: (order: SelectedOrder | null) => void;
  onPayerChange: (payer: PayerStatus | null, reason?: string) => void;
  onOrderTypeChange: (type: OrderTypeValue) => void;
  selectedOrder: SelectedOrder | null;
  currentPayer: PayerStatus | null;
  isPayerChanged: boolean;
  payerChangeReason?: string;
}

export function OrderSelector({
  onOrderSelect,
  onPayerChange,
  onOrderTypeChange,
  selectedOrder,
  currentPayer,
  isPayerChanged,
  payerChangeReason,
}: OrderSelectorProps) {
  // Order type selection
  const [orderType, setOrderType] = useState<OrderTypeValue>("repair");
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ServiceOrderResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Payer change modal state
  const [showPayerModal, setShowPayerModal] = useState(false);
  const [payerSearchQuery, setPayerSearchQuery] = useState("");
  const [payerSearchResults, setPayerSearchResults] = useState<PayerStatus[]>([]);
  const [isSearchingPayers, setIsSearchingPayers] = useState(false);
  const [selectedNewPayer, setSelectedNewPayer] = useState<PayerStatus | null>(null);
  const [changeReason, setChangeReason] = useState("");

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle order type change
  const handleOrderTypeChange = useCallback((type: OrderTypeValue) => {
    setOrderType(type);
    onOrderTypeChange(type);
    // Clear search when type changes
    setSearchQuery("");
    setSearchResults([]);
    setShowResults(false);
  }, [onOrderTypeChange]);

  // Debounced search for service orders
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchServiceOrders(searchQuery);
        // Filter by selected order type
        const filtered = results.filter(r => r.serviceType === orderType);
        setSearchResults(filtered);
        setShowResults(true);
      } catch (error) {
        console.error("Search error:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, orderType]);

  // Debounced payer search
  useEffect(() => {
    if (payerSearchQuery.length < 2) {
      setPayerSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingPayers(true);
      try {
        const results = await searchClients(payerSearchQuery);
        setPayerSearchResults(results);
      } catch (error) {
        console.error("Payer search error:", error);
        setPayerSearchResults([]);
      } finally {
        setIsSearchingPayers(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [payerSearchQuery]);

  // Handle order selection
  const handleSelectOrder = useCallback((order: ServiceOrderResult) => {
    const selected: SelectedOrder = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      jobCardNumber: order.jobCardNumber,
      clientId: order.clientId,
      clientName: order.clientName,
      machineId: order.machineId,
      machineModel: order.machineModel,
      machineSerial: order.machineSerial,
      serviceType: order.serviceType as OrderTypeValue,
    };
    onOrderSelect(selected);
    setSearchQuery("");
    setShowResults(false);
  }, [onOrderSelect]);

  // Handle payer change confirmation
  const handleConfirmPayerChange = useCallback(() => {
    if (selectedNewPayer && changeReason) {
      onPayerChange(selectedNewPayer, changeReason);
      setShowPayerModal(false);
      setPayerSearchQuery("");
      setPayerSearchResults([]);
      setSelectedNewPayer(null);
      setChangeReason("");
    }
  }, [selectedNewPayer, changeReason, onPayerChange]);

  // Clear selected order
  const handleClearOrder = useCallback(() => {
    onOrderSelect(null);
    onPayerChange(null);
  }, [onOrderSelect, onPayerChange]);

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardContent className="p-4 space-y-4">
        {/* Order Type Selector - Full Width Segmented Control */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-secondary/50 rounded-lg">
          {ORDER_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => handleOrderTypeChange(type.value)}
              className={cn(
                "py-2.5 px-3 rounded-md text-sm font-medium transition-all",
                orderType === type.value
                  ? "bg-[#007A33] text-white shadow-md"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              {type.label}
            </button>
          ))}
        </div>

        {/* Unified Search Bar */}
        <div className="relative" ref={searchRef}>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery.length >= 2 && setShowResults(true)}
                placeholder="Търсене по РК, Поръчка, Клиент или Машина..."
                className="pl-10 pr-4 h-12 text-base bg-background border-border/50 focus:border-[#007A33]"
                disabled={!!selectedOrder}
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            <Button
              type="button"
              className="h-12 px-4 bg-[#007A33] hover:bg-[#006228] text-white gap-2"
            >
              <QrCode className="h-5 w-5" />
              <span className="hidden sm:inline">Сканирай</span>
            </Button>
          </div>

          {/* Search Results Dropdown */}
          {showResults && searchResults.length > 0 && (
            <div className="absolute z-50 mt-2 w-full rounded-lg border border-border bg-popover shadow-xl overflow-hidden">
              <div className="max-h-80 overflow-y-auto">
                {searchResults.map((order) => (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => handleSelectOrder(order)}
                    className="w-full p-3 text-left hover:bg-accent transition-colors border-b border-border/50 last:border-0"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="outline" className="bg-[#007A33]/10 text-[#007A33] border-[#007A33]/30 font-mono">
                        РК {order.jobCardNumber}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Поръчка: {order.orderNumber}
                      </span>
                    </div>
                    <p className="font-medium text-foreground">{order.clientName || "Няма клиент"}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Tractor className="h-3 w-3" />
                      {order.machineModel} • {order.machineSerial}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {showResults && searchResults.length === 0 && !isSearching && searchQuery.length >= 2 && (
            <div className="absolute z-50 mt-2 w-full rounded-lg border border-border bg-popover p-4 shadow-xl">
              <p className="text-sm text-muted-foreground text-center">Няма намерени резултати</p>
            </div>
          )}
        </div>

        {/* Selected Order Display */}
        {selectedOrder && (
          <div className="space-y-3 pt-2 border-t border-border/50">
            {/* Locked RK # and Order # */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge className="bg-[#007A33] text-white font-mono text-sm px-3 py-1">
                  <Lock className="h-3 w-3 mr-1.5" />
                  РК {selectedOrder.jobCardNumber}
                </Badge>
                <Badge variant="outline" className="font-mono text-sm px-3 py-1">
                  <Lock className="h-3 w-3 mr-1.5" />
                  Поръчка: {selectedOrder.orderNumber}
                </Badge>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearOrder}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Client/Machine Info */}
            <div className="grid grid-cols-2 gap-3">
              {/* Owner (Read-only) */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Building2 className="h-3 w-3" />
                  Собственик
                </Label>
                <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-secondary/50 border border-border/30">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span className="text-sm font-medium truncate">{selectedOrder.clientName || "Няма"}</span>
                </div>
              </div>

              {/* Payer (Changeable) */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Building2 className="h-3 w-3" />
                  Платец
                  {isPayerChanged && (
                    <Badge variant="outline" className="ml-auto text-[10px] border-amber-500/30 text-amber-500 bg-amber-500/10">
                      Променен
                    </Badge>
                  )}
                </Label>
                <div className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md border",
                  currentPayer?.isBlocked 
                    ? "bg-red-500/10 border-red-500/30" 
                    : isPayerChanged 
                      ? "bg-amber-500/5 border-amber-500/30"
                      : "bg-secondary/50 border-border/30"
                )}>
                  {currentPayer?.isBlocked ? (
                    <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  )}
                  <span className={cn(
                    "text-sm font-medium truncate flex-1",
                    currentPayer?.isBlocked && "text-red-400"
                  )}>
                    {currentPayer?.payerName || selectedOrder.clientName || "Няма"}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPayerModal(true)}
                    className="h-7 px-2 text-xs text-[#007A33] hover:text-[#007A33] hover:bg-[#007A33]/10"
                  >
                    <Pencil className="h-3 w-3 mr-1" />
                    Смени
                  </Button>
                </div>
                {isPayerChanged && payerChangeReason && (
                  <p className="text-[10px] text-amber-500 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Причина: {PAYER_CHANGE_REASONS.find(r => r.value === payerChangeReason)?.label}
                  </p>
                )}
              </div>
            </div>

            {/* Machine Info */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-secondary/30 border border-border/20">
              <Tractor className="h-4 w-4 text-[#007A33]" />
              <span className="text-sm">
                <span className="font-medium">{selectedOrder.machineModel}</span>
                <span className="text-muted-foreground mx-2">•</span>
                <span className="font-mono text-muted-foreground">{selectedOrder.machineSerial}</span>
              </span>
            </div>
          </div>
        )}

        {/* Payer Change Modal */}
        {showPayerModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-2xl">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="font-semibold">Смяна на платец</h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowPayerModal(false);
                    setPayerSearchQuery("");
                    setPayerSearchResults([]);
                    setSelectedNewPayer(null);
                    setChangeReason("");
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="p-4 space-y-4">
                {/* Payer Search */}
                <div className="space-y-2">
                  <Label className="text-sm">Търсене на нов платец</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={payerSearchQuery}
                      onChange={(e) => setPayerSearchQuery(e.target.value)}
                      placeholder="Име на фирма..."
                      className="pl-10"
                    />
                    {isSearchingPayers && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />
                    )}
                  </div>
                  
                  {/* Payer Results */}
                  {payerSearchResults.length > 0 && (
                    <div className="max-h-40 overflow-y-auto rounded-md border border-border">
                      {payerSearchResults.map((payer) => (
                        <button
                          key={payer.payerId}
                          type="button"
                          onClick={() => {
                            setSelectedNewPayer(payer);
                            setPayerSearchQuery("");
                            setPayerSearchResults([]);
                          }}
                          className={cn(
                            "w-full p-2.5 text-left hover:bg-accent transition-colors border-b border-border/50 last:border-0",
                            payer.isBlocked && "border-l-2 border-l-red-500"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className={cn(
                              "font-medium text-sm",
                              payer.isBlocked && "text-red-400"
                            )}>
                              {payer.payerName}
                            </span>
                            {payer.isBlocked && (
                              <Badge className="text-[10px] bg-red-500/10 text-red-500 border-red-500/30">
                                БЛОКИРАН
                              </Badge>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected New Payer */}
                {selectedNewPayer && (
                  <div className={cn(
                    "p-3 rounded-md border",
                    selectedNewPayer.isBlocked 
                      ? "bg-red-500/10 border-red-500/30" 
                      : "bg-emerald-500/10 border-emerald-500/30"
                  )}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {selectedNewPayer.isBlocked ? (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        )}
                        <span className={cn(
                          "font-medium",
                          selectedNewPayer.isBlocked && "text-red-400"
                        )}>
                          {selectedNewPayer.payerName}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedNewPayer(null)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    {selectedNewPayer.isBlocked && selectedNewPayer.creditWarningMessage && (
                      <p className="text-xs text-red-400 mt-1">
                        {selectedNewPayer.creditWarningMessage}
                      </p>
                    )}
                  </div>
                )}

                {/* Change Reason - Mandatory */}
                <div className="space-y-2">
                  <Label className="text-sm">
                    Причина за смяна <span className="text-red-500">*</span>
                  </Label>
                  <Select value={changeReason} onValueChange={setChangeReason}>
                    <SelectTrigger>
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
              </div>

              <div className="flex justify-end gap-2 p-4 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowPayerModal(false);
                    setPayerSearchQuery("");
                    setPayerSearchResults([]);
                    setSelectedNewPayer(null);
                    setChangeReason("");
                  }}
                >
                  Отказ
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmPayerChange}
                  disabled={!selectedNewPayer || !changeReason}
                  className="bg-[#007A33] hover:bg-[#006228] text-white"
                >
                  Потвърди
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
