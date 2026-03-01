"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Loader2,
  RefreshCw,
  FileText,
  DollarSign,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Lock,
  ArrowLeft,
  Send,
  Image as ImageIcon,
  PenLine,
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";

// Types for the admin view
interface AdminJobCard {
  id: string;
  created_at: string;
  status: string;
  serial_number: string | null;
  model: string | null;
  client_name: string | null;
  payer_name: string | null;
  payer_blocked: boolean | null;
  total_parts_cost: number | null;
}

// Full job card details for side panel
interface JobCardDetails {
  id: string;
  created_at: string;
  status: string;
  photo_urls: string[] | null;
  signature_data: string | null;
  client_name_signed: string | null;
  order_no: string | null;
  notes: string | null;
  pending_issues: string | null;
  recommendations: string | null;
}

const ADMIN_PIN = "1234";

export default function ServiceManagerDashboard() {
  const [mounted, setMounted] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);

  // Data state
  const [jobCards, setJobCards] = useState<AdminJobCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Stats
  const [stats, setStats] = useState({
    pendingOrders: 0,
    totalValue: 0,
    financialAlerts: 0,
  });

  // Side panel
  const [selectedCard, setSelectedCard] = useState<JobCardDetails | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Photo viewer
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  // Navision sync
  const [syncingId, setSyncingId] = useState<string | null>(null);

  // Check auth on mount
  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const auth = sessionStorage.getItem("megatron_admin_auth");
      if (auth === "true") {
        setIsAuthorized(true);
      }
    }
  }, []);

  // Fetch data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const supabase = createClient();

    // Fetch from admin_job_cards_view
    const { data, error } = await supabase
      .from("admin_job_cards_view")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Fetch error:", error);
      toast.error("Failed to load data");
      setIsLoading(false);
      return;
    }

    const cards = (data || []) as AdminJobCard[];
    setJobCards(cards);

    // Calculate stats
    const pendingOrders = cards.filter((c) => c.status === "pending_order").length;
    const totalValue = cards.reduce((sum, c) => sum + (c.total_parts_cost || 0), 0);
    const financialAlerts = cards.filter((c) => c.payer_blocked === true).length;

    setStats({
      pendingOrders,
      totalValue,
      financialAlerts,
    });

    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (isAuthorized) {
      fetchData();
    }
  }, [isAuthorized, fetchData]);

  // PIN verification
  const handlePinSubmit = () => {
    if (pinInput === ADMIN_PIN) {
      setIsAuthorized(true);
      setPinError(false);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("megatron_admin_auth", "true");
      }
    } else {
      setPinError(true);
      setPinInput("");
    }
  };

  // Fetch job card details for side panel
  const fetchCardDetails = async (id: string) => {
    setIsLoadingDetails(true);
    const supabase = createClient();

    const { data, error } = await supabase
      .from("job_cards")
      .select("id, created_at, status, photo_urls, signature_data, client_name_signed, order_no, notes, pending_issues, recommendations")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Fetch details error:", error);
      toast.error("Failed to load details");
      setIsLoadingDetails(false);
      return;
    }

    setSelectedCard(data);
    setSheetOpen(true);
    setIsLoadingDetails(false);
  };

  // Push to Navision (simulated)
  const handlePushToNavision = async (id: string) => {
    setSyncingId(id);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const supabase = createClient();

    const { error } = await supabase
      .from("job_cards")
      .update({ status: "synced" })
      .eq("id", id);

    if (error) {
      console.error("Sync error:", error);
      toast.error("Failed to sync with Navision");
      setSyncingId(null);
      return;
    }

    // Update local state
    setJobCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "synced" } : c))
    );

    // Update stats
    setStats((prev) => ({
      ...prev,
      pendingOrders: Math.max(0, prev.pendingOrders - 1),
    }));

    toast.success("Pushed to Navision", {
      description: "Job card status updated to 'synced'",
    });

    setSyncingId(null);
  };

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("bg-BG", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Status badge
  const getStatusBadge = (status: string, payerBlocked?: boolean | null) => {
    if (payerBlocked) {
      return (
        <Badge className="bg-red-500/15 text-red-500 border-red-500/30">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Blocked
        </Badge>
      );
    }

    switch (status) {
      case "synced":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            In Navision
          </Badge>
        );
      case "completed":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30">
            Completed
          </Badge>
        );
      case "pending_order":
        return (
          <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/30">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "draft":
        return (
          <Badge className="bg-muted text-muted-foreground border-border">
            Draft
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!mounted) return null;

  // PIN entry screen
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-sm border-border">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <ShieldCheck className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-xl">Service Manager Dashboard</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Enter PIN to access the dashboard
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pin">PIN Code</Label>
              <Input
                id="pin"
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="----"
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value.replace(/\D/g, ""));
                  setPinError(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && pinInput.length === 4) {
                    handlePinSubmit();
                  }
                }}
                className={`text-center text-2xl tracking-[0.5em] font-mono ${
                  pinError ? "border-destructive" : ""
                }`}
              />
              {pinError && (
                <p className="text-xs text-destructive">Incorrect PIN</p>
              )}
            </div>
            <Button
              onClick={handlePinSubmit}
              disabled={pinInput.length !== 4}
              className="w-full"
            >
              <Lock className="h-4 w-4 mr-2" />
              Access Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 md:p-6 max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="outline" size="sm" className="gap-1.5 bg-transparent border-primary/30 text-primary hover:bg-primary/10">
                <ArrowLeft className="h-4 w-4" />
                Back to Form
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <span className="text-primary">MEGATRON</span>
                <span className="text-muted-foreground font-normal">Service Manager</span>
              </h1>
              <p className="text-sm text-muted-foreground">
                Overview and Navision sync
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={isLoading}
            className="gap-2 bg-transparent"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Pending Orders */}
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Orders</p>
                  <p className="text-3xl font-bold text-amber-500">{stats.pendingOrders}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/20">
                  <Clock className="h-6 w-6 text-amber-500" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Cards awaiting Navision sync</p>
            </CardContent>
          </Card>

          {/* Total Value */}
          <Card className="border-emerald-500/30 bg-emerald-500/5">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Value</p>
                  <p className="text-3xl font-bold text-emerald-500">
                    {stats.totalValue.toLocaleString("bg-BG", { minimumFractionDigits: 2 })} лв
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20">
                  <DollarSign className="h-6 w-6 text-emerald-500" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Sum of all parts costs</p>
            </CardContent>
          </Card>

          {/* Financial Alerts */}
          <Card className={`${stats.financialAlerts > 0 ? "border-red-500/30 bg-red-500/5" : "border-border"}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Financial Alerts</p>
                  <p className={`text-3xl font-bold ${stats.financialAlerts > 0 ? "text-red-500" : "text-foreground"}`}>
                    {stats.financialAlerts}
                  </p>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-full ${stats.financialAlerts > 0 ? "bg-red-500/20" : "bg-muted"}`}>
                  <AlertTriangle className={`h-6 w-6 ${stats.financialAlerts > 0 ? "text-red-500" : "text-muted-foreground"}`} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Cards with blocked payers</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Recent Job Cards
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : jobCards.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mb-4 opacity-50" />
                <p>No job cards found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[140px]">Date</TableHead>
                      <TableHead>Serial Number</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Payer</TableHead>
                      <TableHead className="text-right">Total Cost</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobCards.map((card) => (
                      <TableRow
                        key={card.id}
                        className="cursor-pointer hover:bg-accent/50"
                        onClick={() => fetchCardDetails(card.id)}
                      >
                        <TableCell className="font-mono text-xs">
                          {formatDate(card.created_at)}
                        </TableCell>
                        <TableCell className="font-medium">
                          {card.serial_number || "-"}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm">{card.client_name || "-"}</p>
                            {card.model && (
                              <p className="text-xs text-muted-foreground">{card.model}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={card.payer_blocked ? "text-red-400" : ""}>
                              {card.payer_name || card.client_name || "-"}
                            </span>
                            {card.payer_blocked && (
                              <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {(card.total_parts_cost || 0).toLocaleString("bg-BG", {
                            minimumFractionDigits: 2,
                          })} лв
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(card.status, card.payer_blocked)}
                        </TableCell>
                        <TableCell className="text-right">
                          {card.status === "pending_order" || card.status === "completed" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5 bg-transparent border-primary/30 text-primary hover:bg-primary/10"
                              disabled={syncingId === card.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePushToNavision(card.id);
                              }}
                            >
                              {syncingId === card.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Send className="h-3.5 w-3.5" />
                              )}
                              Push to Navision
                            </Button>
                          ) : card.status === "synced" ? (
                            <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Synced
                            </Badge>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation Links */}
        <div className="flex justify-center gap-4 pt-4">
          <Link href="/admin/job-cards">
            <Button variant="outline" size="sm" className="gap-2">
              <FileText className="h-4 w-4" />
              Job Cards Admin
            </Button>
          </Link>
        </div>
      </div>

      {/* Detail Side Panel */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Job Card Details
            </SheetTitle>
          </SheetHeader>

          {isLoadingDetails ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : selectedCard ? (
            <div className="space-y-6 pt-6">
              {/* Basic Info */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  {getStatusBadge(selectedCard.status)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Date</span>
                  <span className="text-sm font-mono">{formatDate(selectedCard.created_at)}</span>
                </div>
                {selectedCard.order_no && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Order No.</span>
                    <span className="text-sm font-medium">{selectedCard.order_no}</span>
                  </div>
                )}
                {selectedCard.client_name_signed && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Signed By</span>
                    <span className="text-sm font-medium">{selectedCard.client_name_signed}</span>
                  </div>
                )}
              </div>

              {/* Photos Section */}
              {selectedCard.photo_urls && selectedCard.photo_urls.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-primary" />
                    Uploaded Photos ({selectedCard.photo_urls.length})
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedCard.photo_urls.map((url, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setViewingPhoto(url);
                          setCurrentPhotoIndex(idx);
                        }}
                        className="relative aspect-square rounded-md overflow-hidden border border-border hover:border-primary transition-colors"
                      >
                        <img
                          src={url}
                          alt={`Photo ${idx + 1}`}
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5 text-[10px] text-white text-center">
                          {idx === 0 ? "Hour Meter" : `Photo ${idx + 1}`}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Customer Signature */}
              {selectedCard.signature_data && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <PenLine className="h-4 w-4 text-primary" />
                    Customer Signature
                  </h4>
                  <div className="rounded-lg border border-border bg-white p-4">
                    <img
                      src={selectedCard.signature_data}
                      alt="Customer signature"
                      className="max-h-32 mx-auto"
                    />
                    {selectedCard.client_name_signed && (
                      <p className="text-center text-xs text-muted-foreground mt-2">
                        {selectedCard.client_name_signed}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedCard.notes && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Notes</h4>
                  <p className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3">
                    {selectedCard.notes}
                  </p>
                </div>
              )}

              {/* Pending Issues */}
              {selectedCard.pending_issues && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-amber-500">Pending Issues</h4>
                  <p className="text-sm text-muted-foreground bg-amber-500/10 border border-amber-500/30 rounded-md p-3">
                    {selectedCard.pending_issues}
                  </p>
                </div>
              )}

              {/* Recommendations */}
              {selectedCard.recommendations && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Recommendations</h4>
                  <p className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3">
                    {selectedCard.recommendations}
                  </p>
                </div>
              )}

              {/* Actions */}
              {(selectedCard.status === "pending_order" || selectedCard.status === "completed") && (
                <Button
                  className="w-full gap-2"
                  disabled={syncingId === selectedCard.id}
                  onClick={() => handlePushToNavision(selectedCard.id)}
                >
                  {syncingId === selectedCard.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Push to Navision
                </Button>
              )}
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* Photo Viewer Dialog */}
      <Dialog open={!!viewingPhoto} onOpenChange={() => setViewingPhoto(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden bg-black/95">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="text-white flex items-center justify-between">
              <span>Photo {currentPhotoIndex + 1}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewingPhoto(null)}
                className="text-white hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="relative flex items-center justify-center p-4 min-h-[400px]">
            {viewingPhoto && (
              <img
                src={viewingPhoto}
                alt="Full size"
                className="max-h-[70vh] max-w-full object-contain rounded-lg"
              />
            )}

            {/* Navigation */}
            {selectedCard?.photo_urls && selectedCard.photo_urls.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/10"
                  onClick={() => {
                    const newIdx = currentPhotoIndex === 0 ? selectedCard.photo_urls!.length - 1 : currentPhotoIndex - 1;
                    setCurrentPhotoIndex(newIdx);
                    setViewingPhoto(selectedCard.photo_urls![newIdx]);
                  }}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/10"
                  onClick={() => {
                    const newIdx = currentPhotoIndex === selectedCard.photo_urls!.length - 1 ? 0 : currentPhotoIndex + 1;
                    setCurrentPhotoIndex(newIdx);
                    setViewingPhoto(selectedCard.photo_urls![newIdx]);
                  }}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
