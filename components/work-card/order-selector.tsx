"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  QrCode, 
  Loader2, 
  X,
  FileText,
  Tractor,
  AlertTriangle,
} from "lucide-react";
import { masterSearch, type MasterSearchResult } from "@/lib/actions";
import { cn } from "@/lib/utils";

// Order types mapping
const ORDER_TYPES = [
  { value: "repair", label: "Клиентска", dbValue: "repair" },
  { value: "warranty", label: "Гаранция", dbValue: "warranty" },
  { value: "internal", label: "Вътрешна", dbValue: "internal" },
  { value: "service_contract", label: "По договор", dbValue: "service_contract" },
] as const;

type OrderTypeValue = typeof ORDER_TYPES[number]["value"];

export interface SelectedOrder {
  type: "order" | "machine";
  orderId?: string;
  orderNumber: string;
  jobCardNumber: string;
  clientId: string | null;
  clientName: string;
  machineId: string | null;
  machineModel: string;
  machineSerial: string;
  serviceType: OrderTypeValue;
  isBlocked?: boolean;
}

interface OrderSelectorProps {
  onOrderSelect: (order: SelectedOrder | null) => void;
  onOrderTypeChange: (type: OrderTypeValue) => void;
  selectedOrder: SelectedOrder | null;
}

export function OrderSelector({
  onOrderSelect,
  onOrderTypeChange,
  selectedOrder,
}: OrderSelectorProps) {
  // Order type selection
  const [orderType, setOrderType] = useState<OrderTypeValue>("repair");
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MasterSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

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

  // Handle order type change - does NOT reset selected machine/client
  const handleOrderTypeChange = useCallback((type: OrderTypeValue) => {
    setOrderType(type);
    onOrderTypeChange(type);
    // Only clear search query and results, NOT the selected order
    setSearchQuery("");
    setSearchResults([]);
    setShowResults(false);
  }, [onOrderTypeChange]);

  // Debounced master search - searches both orders and machines
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    console.log("[v0] OrderSelector: Starting search for:", searchQuery, "type:", orderType);

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        console.log("[v0] OrderSelector: Calling masterSearch...");
        const results = await masterSearch(searchQuery, orderType);
        console.log("[v0] OrderSelector: Got results:", results.length);
        setSearchResults(results);
        setShowResults(true);
      } catch (error) {
        console.error("[v0] OrderSelector search error:", error);
        setSearchResults([]);
        setShowResults(true); // Still show dropdown with "no results" message
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, orderType]);

  // Handle selection from search results
  const handleSelect = useCallback((result: MasterSearchResult) => {
    const selected: SelectedOrder = {
      type: result.type,
      orderId: result.type === "order" ? result.id : undefined,
      orderNumber: result.orderNumber || "",
      jobCardNumber: result.jobCardNumber || "",
      clientId: result.clientId || null,
      clientName: result.clientName,
      machineId: result.machineId || null,
      machineModel: result.machineModel,
      machineSerial: result.machineSerial,
      serviceType: result.serviceType || orderType,
      isBlocked: result.isBlocked,
    };
    onOrderSelect(selected);
    setSearchQuery("");
    setShowResults(false);
  }, [onOrderSelect, orderType]);

  // Clear selected order
  const handleClearOrder = useCallback(() => {
    onOrderSelect(null);
  }, [onOrderSelect]);

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
                placeholder="Търсене по РК, Поръчка, Сериен номер или Клиент..."
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

          {/* Search Results Dropdown with clear distinction */}
          {showResults && searchResults.length > 0 && (
            <div className="absolute z-50 mt-2 w-full rounded-lg border border-border bg-popover shadow-xl">
              <div className="max-h-80 overflow-y-auto p-2 space-y-1">
                {searchResults.map((result) => (
                  <button
                    key={result.id}
                    type="button"
                    onClick={() => handleSelect(result)}
                    className={cn(
                      "w-full rounded-lg px-3 py-3 text-left transition-colors",
                      "hover:bg-accent hover:text-accent-foreground",
                      "focus:outline-none focus:bg-accent",
                      "border border-transparent",
                      result.type === "order" 
                        ? "hover:border-blue-500/30" 
                        : "hover:border-emerald-500/30",
                      result.isBlocked && "border-l-4 border-l-red-500"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {/* Type Icon */}
                      <div className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                        result.type === "order" 
                          ? "bg-blue-500/10 text-blue-500" 
                          : "bg-emerald-500/10 text-emerald-500"
                      )}>
                        {result.type === "order" ? (
                          <FileText className="h-5 w-5" />
                        ) : (
                          <Tractor className="h-5 w-5" />
                        )}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {result.type === "order" ? (
                            <>
                              <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30 text-xs">
                                Отворена поръчка
                              </Badge>
                              <span className="font-mono font-bold text-sm text-foreground">
                                РК {result.jobCardNumber}
                              </span>
                            </>
                          ) : (
                            <>
                              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 text-xs">
                                Машина
                              </Badge>
                              <span className="font-mono font-bold text-sm text-foreground">
                                SN: {result.machineSerial}
                              </span>
                            </>
                          )}
                          {result.isBlocked && (
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                              <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                              БЛОКИРАН
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                          {result.type === "order" && result.orderNumber && (
                            <span>Поръчка: {result.orderNumber}</span>
                          )}
                          <span className="truncate">{result.machineModel}</span>
                          {result.clientName && (
                            <span className="truncate text-foreground/70">{result.clientName}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* No results message */}
          {showResults && searchResults.length === 0 && !isSearching && searchQuery.length >= 2 && (
            <div className="absolute z-50 mt-2 w-full rounded-lg border border-border bg-popover p-4 shadow-xl">
              <p className="text-sm text-muted-foreground text-center">
                Няма намерени резултати за "{searchQuery}"
              </p>
            </div>
          )}
        </div>

        {/* Selected Order Display */}
        {selectedOrder && (
          <div className={cn(
            "rounded-lg border p-4",
            selectedOrder.isBlocked 
              ? "border-red-500/50 bg-red-500/5" 
              : "border-[#007A33]/30 bg-[#007A33]/5"
          )}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                  selectedOrder.type === "order" 
                    ? "bg-blue-500/20 text-blue-500" 
                    : "bg-emerald-500/20 text-emerald-500"
                )}>
                  {selectedOrder.type === "order" ? (
                    <FileText className="h-5 w-5" />
                  ) : (
                    <Tractor className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {selectedOrder.jobCardNumber && (
                      <Badge className="bg-primary/20 text-primary border-primary/30 font-mono">
                        РК {selectedOrder.jobCardNumber}
                      </Badge>
                    )}
                    {selectedOrder.orderNumber && (
                      <Badge variant="outline" className="font-mono text-xs">
                        {selectedOrder.orderNumber}
                      </Badge>
                    )}
                    {selectedOrder.isBlocked && (
                      <Badge variant="destructive" className="text-xs">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        КЛИЕНТ БЛОКИРАН
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground space-y-0.5">
                    <p><span className="text-foreground font-medium">{selectedOrder.machineModel}</span> • SN: {selectedOrder.machineSerial}</p>
                    {selectedOrder.clientName && (
                      <p>Клиент: {selectedOrder.clientName}</p>
                    )}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={handleClearOrder}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
