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
import { masterSearch, type MasterSearchResult, type MachineTelematics } from "@/lib/actions";
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
  clientLocation?: string;
  machineId: string | null;
  machineModel: string;
  machineSerial: string;
  engineSerial?: string;
  serviceType: OrderTypeValue;
  isBlocked?: boolean;
  // Navision description - pre-populated from service order
  navisionDescription?: string;
  // JDLink telematics data
  telematics?: MachineTelematics;
  // Active DTC codes
  dtcCodes?: Array<{ code: string; description: string; severity: "warning" | "critical" }>;
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

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await masterSearch(searchQuery, orderType);
        setSearchResults(results);
        setShowResults(true);
      } catch (error) {
        console.error("OrderSelector search error:", error);
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
      clientLocation: result.clientLocation,
      machineId: result.machineId || null,
      machineModel: result.machineModel,
      machineSerial: result.machineSerial,
      engineSerial: result.engineSerial,
      serviceType: result.serviceType || orderType,
      isBlocked: result.isBlocked,
      // Pass Navision description from service order
      navisionDescription: result.navisionDescription,
      // Pass JDLink telematics data
      telematics: result.telematics,
      dtcCodes: result.dtcCodes,
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

          {/* Search Results Dropdown - Dark themed with prominent client names */}
          {showResults && searchResults.length > 0 && (
            <div className="absolute z-50 mt-2 w-full rounded-xl border border-[#007A33]/30 bg-[#0a0f0a] shadow-2xl shadow-black/50">
              <div className="max-h-80 overflow-y-auto p-2 space-y-1">
                {searchResults.map((result) => (
                  <button
                    key={result.id}
                    type="button"
                    onClick={() => handleSelect(result)}
                    className={cn(
                      "w-full rounded-lg px-3 py-3 text-left transition-all duration-200",
                      "hover:bg-[#007A33]/10 hover:border-[#007A33]/50",
                      "focus:outline-none focus:bg-[#007A33]/10",
                      "border border-transparent",
                      result.isBlocked && "border-l-4 border-l-red-500"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {/* Green Tractor Icon */}
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#007A33]/20">
                        <Tractor className="h-5 w-5 text-[#007A33]" />
                      </div>
                      
                      {/* Content - Client prominent, machine details below */}
                      <div className="flex-1 min-w-0">
                        {/* Client Name - Prominent white text */}
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-white truncate">
                            {result.clientName || "Unknown Client"}
                          </span>
                          {result.isBlocked && (
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0 shrink-0">
                              <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                              БЛОКИРАН
                            </Badge>
                          )}
                          {result.telematics && (
                            <span className="ml-auto flex items-center gap-1 text-[10px] text-[#007A33]">
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#007A33] opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#007A33]"></span>
                              </span>
                              JDLink
                            </span>
                          )}
                        </div>
                        
                        {/* Model + Serial - Smaller gray text */}
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                          <span className="truncate">{result.machineModel}</span>
                          <span className="text-gray-600">•</span>
                          <span className="font-mono text-gray-500">#{result.machineSerial}</span>
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
