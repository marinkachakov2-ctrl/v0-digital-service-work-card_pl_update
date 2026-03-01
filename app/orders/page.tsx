"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Search,
  ScanLine,
  Loader2,
  Wrench,
  Shield,
  FileText,
  Settings,
  ChevronRight,
  Calendar,
  User,
  Tractor,
} from "lucide-react";
import { searchServiceOrders, type ServiceOrderResult } from "@/lib/actions";

// Megatron Green for corporate branding
const MEGATRON_GREEN = "#007A33";

export default function ServiceOrdersPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterByTechnician, setFilterByTechnician] = useState(false);
  const [orders, setOrders] = useState<ServiceOrderResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Mock technician ID - in real app would come from auth
  const currentTechnicianId = filterByTechnician ? "tech-001" : null;

  // Fetch orders on mount and when filters change
  const fetchOrders = useCallback(async () => {
    setIsSearching(true);
    try {
      const results = await searchServiceOrders(
        searchQuery,
        currentTechnicianId
      );
      setOrders(results);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setIsSearching(false);
      setIsLoading(false);
    }
  }, [searchQuery, currentTechnicianId]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOrders();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchOrders]);

  // Handle order selection
  const handleSelectOrder = (order: ServiceOrderResult) => {
    // Navigate to the job card detail view with order data
    router.push(`/orders/${order.id}`);
  };

  // Get badge color and text for service type
  const getServiceTypeBadge = (type: ServiceOrderResult["serviceType"]) => {
    switch (type) {
      case "warranty":
        return {
          label: "Гаранция",
          className: "bg-blue-500/15 text-blue-600 border-blue-500/30",
        };
      case "repair":
        return {
          label: "Ремонт",
          className: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
        };
      case "service_contract":
        return {
          label: "Сервизен договор",
          className: "bg-amber-500/15 text-amber-600 border-amber-500/30",
        };
      case "internal":
        return {
          label: "Вътрешен",
          className: "bg-slate-500/15 text-slate-600 border-slate-500/30",
        };
      default:
        return {
          label: type,
          className: "bg-slate-500/15 text-slate-600 border-slate-500/30",
        };
    }
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
        return <Settings className="h-4 w-4" />;
      default:
        return <Wrench className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header
        className="sticky top-0 z-50 border-b bg-white shadow-sm"
        style={{ borderBottomColor: MEGATRON_GREEN }}
      >
        <div className="mx-auto max-w-4xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg"
                style={{ backgroundColor: MEGATRON_GREEN }}
              >
                <Wrench className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">
                  Megatron Service
                </h1>
                <p className="text-xs text-slate-500">Избор на поръчка</p>
              </div>
            </div>
            <Badge
              variant="outline"
              className="border-slate-300 bg-slate-100 text-slate-600"
            >
              {orders.length} поръчки
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-4 py-6">
        {/* Search Section */}
        <Card className="mb-6 border-slate-200 bg-white shadow-sm">
          <CardContent className="p-4">
            {/* Search Input */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <Input
                ref={searchInputRef}
                type="text"
                placeholder="Търсене по РК, Поръчка, Клиент или Машина..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-12 bg-slate-50 pl-10 pr-12 text-base placeholder:text-slate-400 focus:bg-white focus:ring-2"
                style={
                  {
                    "--tw-ring-color": MEGATRON_GREEN,
                    borderColor: "#e2e8f0",
                  } as React.CSSProperties
                }
              />
              <Button
                size="sm"
                variant="ghost"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 text-slate-400 hover:text-slate-600"
                onClick={() => {
                  // Scan functionality placeholder
                  alert("QR/Barcode scanner coming soon");
                }}
              >
                <ScanLine className="h-5 w-5" />
              </Button>
            </div>

            {/* Filter Toggle */}
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
              <Label
                htmlFor="my-orders"
                className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer"
              >
                <User className="h-4 w-4 text-slate-500" />
                Моите поръчки
              </Label>
              <Switch
                id="my-orders"
                checked={filterByTechnician}
                onCheckedChange={setFilterByTechnician}
                style={
                  {
                    "--switch-checked-bg": MEGATRON_GREEN,
                  } as React.CSSProperties
                }
                className="data-[state=checked]:bg-[var(--switch-checked-bg)]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Orders List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2
                className="h-8 w-8 animate-spin"
                style={{ color: MEGATRON_GREEN }}
              />
            </div>
          ) : orders.length === 0 ? (
            <Card className="border-slate-200 bg-white">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-12 w-12 text-slate-300 mb-3" />
                <p className="text-slate-500 font-medium">
                  Няма намерени поръчки
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  Опитайте с различни критерии за търсене
                </p>
              </CardContent>
            </Card>
          ) : (
            orders.map((order) => {
              const badge = getServiceTypeBadge(order.serviceType);
              const icon = getServiceTypeIcon(order.serviceType);

              return (
                <Card
                  key={order.id}
                  className="border-slate-200 bg-white shadow-sm hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group"
                  onClick={() => handleSelectOrder(order)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      {/* Left side - Main info */}
                      <div className="flex-1 min-w-0">
                        {/* Order Numbers */}
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className="font-bold text-slate-900">
                            РК {order.jobCardNumber || "—"}
                          </span>
                          <span className="text-slate-400">|</span>
                          <span className="font-semibold text-slate-700">
                            Поръчка {order.orderNumber || "—"}
                          </span>
                        </div>

                        {/* Client & Machine */}
                        <div className="flex items-center gap-2 text-sm text-slate-600 mb-3">
                          <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">
                            {order.clientName || "Неизвестен клиент"}
                          </span>
                          <span className="text-slate-300">•</span>
                          <Tractor className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">
                            {order.machineModel || "Неизвестна машина"}
                          </span>
                        </div>

                        {/* Service Type Badge */}
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={`gap-1.5 ${badge.className}`}
                          >
                            {icon}
                            {badge.label}
                          </Badge>
                          {order.createdAt && (
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(order.createdAt).toLocaleDateString(
                                "bg-BG",
                                {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "2-digit",
                                }
                              )}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right side - Action indicator */}
                      <div className="flex items-center">
                        <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-slate-500 transition-colors" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Search indicator */}
        {isSearching && !isLoading && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2">
            <Badge className="bg-white shadow-lg border border-slate-200 text-slate-600 gap-2 px-4 py-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Търсене...
            </Badge>
          </div>
        )}
      </main>
    </div>
  );
}
