"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Search,
  QrCode,
  Loader2,
  Wrench,
  Shield,
  FileText,
  Building2,
  ChevronRight,
  Calendar,
  User,
  Tractor,
  Hash,
} from "lucide-react";
import { searchServiceOrders, type ServiceOrderResult } from "@/lib/actions";

// Megatron Green for corporate branding
const MEGATRON_GREEN = "#007A33";

// Order types for the segmented selector
type OrderType = "client" | "warranty" | "internal" | "contract";

const ORDER_TYPES: { id: OrderType; label: string; dbValue: string }[] = [
  { id: "client", label: "Клиентска", dbValue: "repair" },
  { id: "warranty", label: "Гаранционна", dbValue: "warranty" },
  { id: "internal", label: "Вътрешна", dbValue: "internal" },
  { id: "contract", label: "По договор", dbValue: "service_contract" },
];

export default function ServiceOrdersPage() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<OrderType>("client");
  const [searchQuery, setSearchQuery] = useState("");
  const [orders, setOrders] = useState<ServiceOrderResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Get the database value for the selected type
  const selectedDbType = ORDER_TYPES.find((t) => t.id === selectedType)?.dbValue;

  // Fetch orders on mount and when filters change
  const fetchOrders = useCallback(async () => {
    setIsSearching(true);
    try {
      const results = await searchServiceOrders(searchQuery, null);
      // Filter by selected type
      const filtered = results.filter(
        (o) => o.serviceType === selectedDbType
      );
      setOrders(filtered);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setIsSearching(false);
      setIsLoading(false);
    }
  }, [searchQuery, selectedDbType]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOrders();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchOrders]);

  // Handle order selection
  const handleSelectOrder = (order: ServiceOrderResult) => {
    router.push(`/orders/${order.id}`);
  };

  // Handle scan button click
  const handleScan = () => {
    // Placeholder for QR/Barcode scanner
    alert("QR/Barcode scanner - coming soon");
  };

  // Get icon for service type
  const getServiceTypeIcon = (type: ServiceOrderResult["serviceType"]) => {
    switch (type) {
      case "warranty":
        return <Shield className="h-4 w-4" />;
      case "repair":
        return <Wrench className="h-4 w-4" />;
      case "service_contract":
        return <FileText className="h-4 w-4" />;
      case "internal":
        return <Building2 className="h-4 w-4" />;
      default:
        return <Wrench className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-700 bg-slate-800/95 backdrop-blur-sm">
        <div className="mx-auto max-w-lg px-4 py-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{ backgroundColor: MEGATRON_GREEN }}
            >
              <Wrench className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Megatron Service</h1>
              <p className="text-xs text-slate-400">Работна карта</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-lg px-4 py-6 space-y-5">
        {/* Order Type Selector - Segmented Buttons */}
        <div className="grid grid-cols-4 gap-1 rounded-xl bg-slate-800 p-1">
          {ORDER_TYPES.map((type) => {
            const isActive = selectedType === type.id;
            return (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={`
                  relative px-2 py-3 text-xs font-semibold rounded-lg transition-all duration-200
                  ${isActive 
                    ? "text-white shadow-lg" 
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
                  }
                `}
                style={isActive ? { backgroundColor: MEGATRON_GREEN } : undefined}
              >
                {type.label}
              </button>
            );
          })}
        </div>

        {/* Search Section with Scan Button */}
        <div className="flex gap-2">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="РК, Поръчка, Клиент..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-12 bg-slate-800 border-slate-700 pl-10 text-base text-white placeholder:text-slate-500 focus:border-[#007A33] focus:ring-[#007A33]"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-500" />
            )}
          </div>

          {/* Scan Button */}
          <Button
            onClick={handleScan}
            className="h-12 w-12 shrink-0 p-0"
            style={{ backgroundColor: MEGATRON_GREEN }}
          >
            <QrCode className="h-6 w-6 text-white" />
          </Button>
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-400">
            {isLoading ? "Зареждане..." : `${orders.length} резултата`}
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-xs text-slate-500 hover:text-slate-300"
            >
              Изчисти
            </button>
          )}
        </div>

        {/* Results Area */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2
                className="h-8 w-8 animate-spin"
                style={{ color: MEGATRON_GREEN }}
              />
            </div>
          ) : orders.length === 0 ? (
            <Card className="border-slate-700 bg-slate-800">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <FileText className="h-12 w-12 text-slate-600 mb-4" />
                <p className="text-slate-300 font-medium mb-1">
                  Няма намерени поръчки
                </p>
                <p className="text-sm text-slate-500">
                  Опитайте с различни критерии или тип
                </p>
              </CardContent>
            </Card>
          ) : (
            orders.map((order) => {
              const icon = getServiceTypeIcon(order.serviceType);

              return (
                <Card
                  key={order.id}
                  className="border-slate-700 bg-slate-800 hover:bg-slate-750 hover:border-slate-600 transition-all cursor-pointer group"
                  onClick={() => handleSelectOrder(order)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      {/* Left side - Main info */}
                      <div className="flex-1 min-w-0 space-y-2">
                        {/* Order Numbers Row */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge 
                            variant="outline" 
                            className="border-slate-600 bg-slate-700/50 text-white font-bold gap-1"
                          >
                            <Hash className="h-3 w-3" />
                            РК {order.jobCardNumber || "—"}
                          </Badge>
                          <span className="text-slate-500 text-sm">
                            Поръчка {order.orderNumber || "—"}
                          </span>
                        </div>

                        {/* Client */}
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                          <span className="text-slate-200 truncate font-medium">
                            {order.clientName || "Неизвестен клиент"}
                          </span>
                        </div>

                        {/* Machine */}
                        <div className="flex items-center gap-2 text-sm">
                          <Tractor className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                          <span className="text-slate-400 truncate">
                            {order.machineModel || "Неизвестна машина"}
                            {order.machineSerial && (
                              <span className="text-slate-500 ml-1">
                                ({order.machineSerial})
                              </span>
                            )}
                          </span>
                        </div>

                        {/* Date */}
                        {order.createdAt && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Calendar className="h-3 w-3" />
                            {new Date(order.createdAt).toLocaleDateString(
                              "bg-BG",
                              {
                                day: "2-digit",
                                month: "2-digit",
                                year: "2-digit",
                              }
                            )}
                          </div>
                        )}
                      </div>

                      {/* Right side - Icon and Arrow */}
                      <div className="flex flex-col items-center gap-2">
                        <div 
                          className="flex h-10 w-10 items-center justify-center rounded-lg"
                          style={{ backgroundColor: `${MEGATRON_GREEN}20` }}
                        >
                          <span style={{ color: MEGATRON_GREEN }}>{icon}</span>
                        </div>
                        <ChevronRight className="h-5 w-5 text-slate-600 group-hover:text-slate-400 transition-colors" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </main>

      {/* Fixed bottom button for new card */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-900 via-slate-900 to-transparent">
        <div className="mx-auto max-w-lg">
          <Button
            className="w-full h-14 text-base font-semibold text-white shadow-lg"
            style={{ backgroundColor: MEGATRON_GREEN }}
            onClick={() => router.push("/")}
          >
            + Нова Работна Карта
          </Button>
        </div>
      </div>

      {/* Spacer for fixed bottom button */}
      <div className="h-24" />
    </div>
  );
}
