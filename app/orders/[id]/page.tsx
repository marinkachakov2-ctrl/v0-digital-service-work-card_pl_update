"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Loader2,
  Lock,
  User,
  Building2,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import {
  getServiceOrderDetails,
  searchClients,
  updateJobCardPayer,
  type ServiceOrderResult,
} from "@/lib/actions";
import type { PayerStatus } from "@/lib/types";

// Megatron Green for corporate branding
const MEGATRON_GREEN = "#007A33";

// Payer change reasons
const PAYER_CHANGE_REASONS = [
  { value: "client_request", label: "Искане на клиента" },
  { value: "order_error", label: "Грешка в поръчката" },
  { value: "leasing_insurance", label: "Лизинг/Застраховка" },
  { value: "other", label: "Друго" },
];

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [order, setOrder] = useState<ServiceOrderResult | null>(null);
  const [owner, setOwner] = useState<PayerStatus | null>(null);
  const [payer, setPayer] = useState<PayerStatus | null>(null);
  const [originalPayer, setOriginalPayer] = useState<PayerStatus | null>(null);
  const [isPayerChanged, setIsPayerChanged] = useState(false);
  const [payerChangeReason, setPayerChangeReason] = useState("");

  // Change payer modal state
  const [showPayerModal, setShowPayerModal] = useState(false);
  const [payerSearchQuery, setPayerSearchQuery] = useState("");
  const [payerSearchResults, setPayerSearchResults] = useState<PayerStatus[]>(
    []
  );
  const [isSearchingPayers, setIsSearchingPayers] = useState(false);
  const [selectedNewPayer, setSelectedNewPayer] = useState<PayerStatus | null>(
    null
  );
  const [newPayerReason, setNewPayerReason] = useState("");

  // Fetch order details
  useEffect(() => {
    async function loadOrder() {
      if (!orderId) return;

      setIsLoading(true);
      try {
        const result = await getServiceOrderDetails(orderId);
        if (result) {
          setOrder(result.order);
          setOwner(result.owner);
          setPayer(result.payer);
          setOriginalPayer(result.payer);
        }
      } catch (error) {
        console.error("Error loading order:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadOrder();
  }, [orderId]);

  // Search payers in modal
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
        console.error("Error searching clients:", error);
      } finally {
        setIsSearchingPayers(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [payerSearchQuery]);

  // Handle payer selection from modal
  const handleSelectNewPayer = (newPayer: PayerStatus) => {
    setSelectedNewPayer(newPayer);
  };

  // Confirm payer change
  const handleConfirmPayerChange = useCallback(async () => {
    if (!selectedNewPayer || !newPayerReason) return;

    // Update local state
    setPayer(selectedNewPayer);
    setIsPayerChanged(true);
    setPayerChangeReason(
      PAYER_CHANGE_REASONS.find((r) => r.value === newPayerReason)?.label ||
        newPayerReason
    );

    // Close modal and reset
    setShowPayerModal(false);
    setPayerSearchQuery("");
    setPayerSearchResults([]);
    setSelectedNewPayer(null);
    setNewPayerReason("");
  }, [selectedNewPayer, newPayerReason]);

  // Reset payer to original
  const handleResetPayer = useCallback(() => {
    setPayer(originalPayer);
    setIsPayerChanged(false);
    setPayerChangeReason("");
  }, [originalPayer]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2
            className="h-10 w-10 animate-spin"
            style={{ color: MEGATRON_GREEN }}
          />
          <p className="text-slate-500">Зареждане...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="max-w-sm">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-3" />
            <p className="font-medium text-slate-700">Поръчката не е намерена</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.push("/orders")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад към списъка
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header with locked Order/RK numbers */}
      <header
        className="sticky top-0 z-50 border-b bg-white shadow-sm"
        style={{ borderBottomColor: MEGATRON_GREEN }}
      >
        <div className="mx-auto max-w-4xl px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0"
              onClick={() => router.push("/orders")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>

            {/* Locked Order Numbers */}
            <div className="flex items-center gap-3 flex-1">
              <Badge
                variant="outline"
                className="gap-1.5 bg-slate-100 border-slate-300 text-slate-700 px-3 py-1.5"
              >
                <Lock className="h-3 w-3" />
                РК {order.jobCardNumber || "—"}
              </Badge>
              <Badge
                variant="outline"
                className="gap-1.5 bg-slate-100 border-slate-300 text-slate-700 px-3 py-1.5"
              >
                <Lock className="h-3 w-3" />
                Поръчка {order.orderNumber || "—"}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-4 py-6 space-y-4">
        {/* Credit Warning Banner */}
        {payer?.isBlocked && (
          <Card className="border-red-500/50 bg-red-500/5">
            <CardContent className="flex items-center gap-3 p-4">
              <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-red-600">
                  КРИТИЧНО: КЛИЕНТ БЛОКИРАН
                </p>
                <p className="text-sm text-red-500">
                  {payer.creditWarningMessage ||
                    "Платецът е блокиран. Работата е забранена!"}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Owner Section (Read-only) */}
        <Card className="border-slate-200 bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <User className="h-4 w-4" />
              Собственик на машината
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-4 py-3">
              <Lock className="h-4 w-4 text-slate-400" />
              <span className="font-medium text-slate-700">
                {owner?.payerName || order.clientName || "Неизвестен"}
              </span>
              {owner && !owner.isBlocked && (
                <CheckCircle2 className="h-4 w-4 text-emerald-500 ml-auto" />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Payer Section (Editable) */}
        <Card
          className={`border-slate-200 bg-white ${isPayerChanged ? "ring-2 ring-amber-500/30" : ""}`}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Платец (Billing Entity)
              {isPayerChanged && (
                <Badge
                  variant="outline"
                  className="ml-auto gap-1 border-amber-500/30 bg-amber-500/10 text-amber-600"
                >
                  <AlertTriangle className="h-3 w-3" />
                  Променен на полето
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {/* Current Payer Display */}
            <div
              className={`flex items-center gap-3 rounded-lg px-4 py-3 ${
                payer?.isBlocked
                  ? "bg-red-500/5 border border-red-500/30"
                  : isPayerChanged
                    ? "bg-amber-500/5 border border-amber-500/30"
                    : "bg-slate-50"
              }`}
            >
              {payer?.isBlocked ? (
                <AlertTriangle className="h-4 w-4 text-red-500" />
              ) : isPayerChanged ? (
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              )}
              <span
                className={`font-medium ${payer?.isBlocked ? "text-red-600" : "text-slate-700"}`}
              >
                {payer?.payerName || "Неизвестен"}
              </span>

              {/* Change Button */}
              <Button
                variant="outline"
                size="sm"
                className="ml-auto gap-1.5"
                style={{
                  borderColor: MEGATRON_GREEN,
                  color: MEGATRON_GREEN,
                }}
                onClick={() => setShowPayerModal(true)}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Смени
              </Button>
            </div>

            {/* Change Reason (shown if payer changed) */}
            {isPayerChanged && payerChangeReason && (
              <div className="flex items-center justify-between text-sm px-1">
                <span className="text-amber-600">
                  Причина: {payerChangeReason}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-slate-500 hover:text-slate-700 h-7 px-2"
                  onClick={handleResetPayer}
                >
                  Върни оригинален
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Machine Info */}
        <Card className="border-slate-200 bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-500">
              Информация за машината
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-slate-400">Модел</Label>
                <p className="font-medium text-slate-700">
                  {order.machineModel || "—"}
                </p>
              </div>
              <div>
                <Label className="text-xs text-slate-400">Сериен номер</Label>
                <p className="font-medium text-slate-700">
                  {order.machineSerial || "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Continue to Work Card Button */}
        <Button
          className="w-full h-12 text-base font-semibold gap-2"
          style={{ backgroundColor: MEGATRON_GREEN }}
          disabled={payer?.isBlocked}
          onClick={() => {
            // Navigate to main work card with pre-filled data
            router.push(
              `/?orderId=${order.id}&orderNo=${order.orderNumber}&jobCardNo=${order.jobCardNumber}&payerId=${payer?.payerId || ""}&isPayerChanged=${isPayerChanged}&payerChangeReason=${encodeURIComponent(payerChangeReason)}`
            );
          }}
        >
          {payer?.isBlocked ? (
            <>
              <Lock className="h-5 w-5" />
              Работата е забранена
            </>
          ) : (
            <>
              Продължи към Работна Карта
              <ArrowLeft className="h-5 w-5 rotate-180" />
            </>
          )}
        </Button>
      </main>

      {/* Change Payer Modal */}
      <Dialog open={showPayerModal} onOpenChange={setShowPayerModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Смяна на платец</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Търсене на клиент..."
                value={payerSearchQuery}
                onChange={(e) => setPayerSearchQuery(e.target.value)}
                className="pl-10"
              />
              {isSearchingPayers && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />
              )}
            </div>

            {/* Search Results */}
            {payerSearchResults.length > 0 && (
              <div className="max-h-48 overflow-y-auto rounded-lg border">
                {payerSearchResults.map((client) => (
                  <button
                    key={client.payerId}
                    type="button"
                    onClick={() => handleSelectNewPayer(client)}
                    className={`w-full px-3 py-2.5 text-left hover:bg-slate-50 flex items-center justify-between transition-colors ${
                      selectedNewPayer?.payerId === client.payerId
                        ? "bg-slate-100"
                        : ""
                    }`}
                  >
                    <div>
                      <p
                        className={`font-medium ${client.isBlocked ? "text-red-600" : "text-slate-700"}`}
                      >
                        {client.payerName}
                      </p>
                      {client.isBlocked && (
                        <p className="text-xs text-red-500">БЛОКИРАН</p>
                      )}
                    </div>
                    {selectedNewPayer?.payerId === client.payerId && (
                      <CheckCircle2
                        className="h-4 w-4"
                        style={{ color: MEGATRON_GREEN }}
                      />
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Selected Payer */}
            {selectedNewPayer && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-500">Избран платец:</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => setSelectedNewPayer(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <p
                  className={`font-semibold ${selectedNewPayer.isBlocked ? "text-red-600" : "text-slate-700"}`}
                >
                  {selectedNewPayer.payerName}
                </p>
              </div>
            )}

            {/* Change Reason (Required) */}
            {selectedNewPayer && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Причина за смяна <span className="text-red-500">*</span>
                </Label>
                <Select value={newPayerReason} onValueChange={setNewPayerReason}>
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
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowPayerModal(false);
                setSelectedNewPayer(null);
                setNewPayerReason("");
                setPayerSearchQuery("");
              }}
            >
              Отказ
            </Button>
            <Button
              style={{ backgroundColor: MEGATRON_GREEN }}
              disabled={!selectedNewPayer || !newPayerReason}
              onClick={handleConfirmPayerChange}
            >
              Потвърди смяната
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
