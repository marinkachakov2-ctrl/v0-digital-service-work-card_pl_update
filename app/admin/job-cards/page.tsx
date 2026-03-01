"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Loader2,
  RefreshCw,
  Filter,
  X,
  Check,
  Edit2,
  Image as ImageIcon,
  FileText,
  ShieldCheck,
  Lock,
  ChevronLeft,
  ChevronRight,
  Search,
  ArrowLeft,
  Download,
} from "lucide-react";

// Types
interface JobCard {
  id: string;
  created_at: string;
  technician_id: string | null;
  machine_id: string | null;
  status: string;
  order_no: string | null;
  total_seconds: number;
  notes: string | null;
  photo_urls: string[] | null;
  signature_data: string | null;
  client_name_signed: string | null;
  start_time: string;
  end_time: string;
}

interface Technician {
  id: string;
  name: string;
}

interface Machine {
  id: string;
  model: string;
  brand: string;
  serial_number: string;
  client_name: string;
}

type FilterType = "all" | "completed" | "pending_order" | "draft";

const ADMIN_PIN = "1234"; // Simple PIN protection

export default function JobCardsAdminPage() {
  const [mounted, setMounted] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);

  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [technicians, setTechnicians] = useState<Map<string, Technician>>(new Map());
  const [machines, setMachines] = useState<Map<string, Machine>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Photo viewer
  const [viewingPhotos, setViewingPhotos] = useState<string[] | null>(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const auth = sessionStorage.getItem("admin_jc_authorized");
      if (auth === "true") {
        setIsAuthorized(true);
      }
    }
  }, []);

  // Fetch all data from Supabase
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const supabase = createClient();

    try {
      // Fetch job cards sorted by created_at DESC
      const { data: cardsData, error: cardsError } = await supabase
        .from("job_cards")
        .select("*")
        .order("created_at", { ascending: false });

      if (cardsError) throw cardsError;

      // Fetch technicians
      const { data: techData, error: techError } = await supabase
        .from("technicians")
        .select("id, name");

      if (techError) throw techError;

      // Fetch machines
      const { data: machData, error: machError } = await supabase
        .from("machines")
        .select("id, model, brand, serial_number, client_name");

      if (machError) throw machError;

      // Build lookup maps
      const techMap = new Map<string, Technician>();
      techData?.forEach((t) => techMap.set(t.id, t));

      const machMap = new Map<string, Machine>();
      machData?.forEach((m) => machMap.set(m.id, m));

      setJobCards(cardsData || []);
      setTechnicians(techMap);
      setMachines(machMap);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Failed to load data", {
        description: "Could not fetch job cards from database.",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthorized) {
      fetchData();
    }
  }, [isAuthorized, fetchData]);

  // Handle PIN verification
  const handlePinSubmit = () => {
    if (pinInput === ADMIN_PIN) {
      setIsAuthorized(true);
      setPinError(false);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("admin_jc_authorized", "true");
      }
    } else {
      setPinError(true);
      setPinInput("");
    }
  };

  // Filter job cards
  const filteredCards = jobCards.filter((card) => {
    if (activeFilter === "completed" && card.status !== "completed") return false;
    if (activeFilter === "draft" && card.status !== "draft") return false;
    if (activeFilter === "pending_order" && card.order_no && card.order_no.trim() !== "") return false;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const tech = card.technician_id ? technicians.get(card.technician_id) : null;
      const machine = card.machine_id ? machines.get(card.machine_id) : null;

      const searchableText = [
        card.order_no,
        tech?.name,
        machine?.model,
        machine?.brand,
        machine?.client_name,
        card.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (!searchableText.includes(query)) return false;
    }

    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredCards.length / itemsPerPage);
  const paginatedCards = filteredCards.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Inline edit handlers
  const startEditing = (card: JobCard) => {
    setEditingId(card.id);
    setEditValue(card.order_no || "");
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditValue("");
  };

  const saveOrderNo = async (cardId: string) => {
    setIsSaving(true);
    const supabase = createClient();

    try {
      const { error } = await supabase
        .from("job_cards")
        .update({ order_no: editValue.trim() || null })
        .eq("id", cardId);

      if (error) throw error;

      setJobCards((prev) =>
        prev.map((card) =>
          card.id === cardId ? { ...card, order_no: editValue.trim() || null } : card
        )
      );

      toast.success("Order number saved");
      cancelEditing();
    } catch (error) {
      console.error("Failed to save:", error);
      toast.error("Failed to save order number");
    } finally {
      setIsSaving(false);
    }
  };

  // Get status badge
  const getStatusBadge = (card: JobCard) => {
    if (card.status === "completed") {
      return (
        <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 text-[10px]">
          Completed
        </Badge>
      );
    }
    if (!card.order_no || card.order_no.trim() === "") {
      return (
        <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/30 text-[10px]">
          Pending Order
        </Badge>
      );
    }
    return (
      <Badge className="bg-zinc-500/15 text-zinc-400 border-zinc-500/30 text-[10px]">
        Draft
      </Badge>
    );
  };

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("bg-BG", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Format duration
  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hrs}h ${mins}m`;
  };

  if (!mounted) return null;

  // PIN Authorization Screen
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-sm border-primary/20">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-xl">Job Cards Admin</CardTitle>
            <p className="text-sm text-muted-foreground">
              Enter PIN to access the Supabase job cards panel
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Enter PIN"
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setPinError(false);
                }}
                onKeyDown={(e) => e.key === "Enter" && handlePinSubmit()}
                className={`text-center text-lg tracking-widest ${pinError ? "border-destructive" : ""}`}
                maxLength={6}
              />
              {pinError && (
                <p className="text-sm text-destructive text-center">
                  Invalid PIN. Please try again.
                </p>
              )}
            </div>
            <Button onClick={handlePinSubmit} className="w-full gap-2">
              <Lock className="h-4 w-4" />
              Unlock
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link href="/admin">
                <Button variant="ghost" size="sm" className="gap-1.5">
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <span className="text-primary">MEGATRON</span>
                  <span className="text-muted-foreground font-normal">Job Cards DB</span>
                </h1>
                <p className="text-sm text-muted-foreground">
                  Manage job cards from Supabase database
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
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Quick Filters & Search */}
        <Card className="border-border">
          <CardContent className="pt-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground mr-2">Quick Filter:</span>
                {[
                  { key: "all", label: "All Cards" },
                  { key: "completed", label: "Completed" },
                  { key: "pending_order", label: "Pending Order" },
                  { key: "draft", label: "Drafts" },
                ].map((filter) => (
                  <Button
                    key={filter.key}
                    variant={activeFilter === filter.key ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setActiveFilter(filter.key as FilterType);
                      setCurrentPage(1);
                    }}
                    className={`text-xs ${activeFilter !== filter.key ? "bg-transparent" : ""}`}
                  >
                    {filter.label}
                    {filter.key !== "all" && (
                      <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-background/20 text-[10px]">
                        {filter.key === "completed"
                          ? jobCards.filter((c) => c.status === "completed").length
                          : filter.key === "pending_order"
                          ? jobCards.filter((c) => !c.order_no || c.order_no.trim() === "").length
                          : jobCards.filter((c) => c.status === "draft").length}
                      </span>
                    )}
                  </Button>
                ))}
              </div>

              <div className="flex-1 lg:max-w-xs ml-auto">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search technician, machine, order..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-9 bg-transparent"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-4 pb-3">
              <p className="text-sm text-muted-foreground">Total Cards</p>
              <p className="text-2xl font-bold text-primary">{jobCards.length}</p>
            </CardContent>
          </Card>
          <Card className="border-emerald-500/20 bg-emerald-500/5">
            <CardContent className="pt-4 pb-3">
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold text-emerald-500">
                {jobCards.filter((c) => c.status === "completed").length}
              </p>
            </CardContent>
          </Card>
          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardContent className="pt-4 pb-3">
              <p className="text-sm text-muted-foreground">Pending Order</p>
              <p className="text-2xl font-bold text-amber-500">
                {jobCards.filter((c) => !c.order_no || c.order_no.trim() === "").length}
              </p>
            </CardContent>
          </Card>
          <Card className="border-zinc-500/20 bg-zinc-500/5">
            <CardContent className="pt-4 pb-3">
              <p className="text-sm text-muted-foreground">Drafts</p>
              <p className="text-2xl font-bold text-zinc-400">
                {jobCards.filter((c) => c.status === "draft").length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Data Table */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Job Cards</CardTitle>
              <p className="text-sm text-muted-foreground">
                Showing {paginatedCards.length} of {filteredCards.length} cards
              </p>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : paginatedCards.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No job cards found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[150px] text-xs">Date</TableHead>
                      <TableHead className="text-xs">Technician</TableHead>
                      <TableHead className="text-xs">Machine / Client</TableHead>
                      <TableHead className="w-[100px] text-xs">Duration</TableHead>
                      <TableHead className="w-[120px] text-xs">Status</TableHead>
                      <TableHead className="w-[180px] text-xs">Order No.</TableHead>
                      <TableHead className="w-[100px] text-xs text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedCards.map((card) => {
                      const tech = card.technician_id ? technicians.get(card.technician_id) : null;
                      const machine = card.machine_id ? machines.get(card.machine_id) : null;
                      const isEditing = editingId === card.id;
                      const hasPhotos = card.photo_urls && card.photo_urls.length > 0;
                      const hasSignature = !!card.signature_data;

                      return (
                        <TableRow key={card.id} className="group">
                          <TableCell className="font-mono text-xs">
                            {formatDate(card.created_at)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {tech?.name || <span className="text-muted-foreground italic">Unknown</span>}
                          </TableCell>
                          <TableCell>
                            {machine ? (
                              <div>
                                <p className="font-medium text-sm">{machine.brand} {machine.model}</p>
                                <p className="text-xs text-muted-foreground">{machine.client_name}</p>
                              </div>
                            ) : (
                              <span className="text-muted-foreground italic text-sm">N/A</span>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {formatDuration(card.total_seconds)}
                          </TableCell>
                          <TableCell>{getStatusBadge(card)}</TableCell>
                          <TableCell>
                            {isEditing ? (
                              <div className="flex items-center gap-1">
                                <Input
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") saveOrderNo(card.id);
                                    if (e.key === "Escape") cancelEditing();
                                  }}
                                  className="h-7 text-xs bg-transparent"
                                  placeholder="SAP Order No."
                                  autoFocus
                                />
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={() => saveOrderNo(card.id)}
                                  disabled={isSaving}
                                >
                                  {isSaving ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                                  )}
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={cancelEditing}
                                >
                                  <X className="h-3.5 w-3.5 text-destructive" />
                                </Button>
                              </div>
                            ) : (
                              <div
                                className="flex items-center gap-2 cursor-pointer group/order rounded px-2 py-1 -mx-2 hover:bg-secondary/50 transition-colors"
                                onClick={() => startEditing(card)}
                              >
                                <span className={`text-sm ${card.order_no ? "font-mono" : "text-muted-foreground italic"}`}>
                                  {card.order_no || "Click to add"}
                                </span>
                                <Edit2 className="h-3 w-3 text-muted-foreground opacity-0 group-hover/order:opacity-100 transition-opacity" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {/* View Photos */}
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className={`h-8 w-8 ${!hasPhotos ? "opacity-30" : ""}`}
                                    disabled={!hasPhotos}
                                    onClick={() => {
                                      if (hasPhotos) {
                                        setViewingPhotos(card.photo_urls);
                                        setCurrentPhotoIndex(0);
                                      }
                                    }}
                                  >
                                    <ImageIcon className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                  <DialogHeader>
                                    <DialogTitle>Photos ({card.photo_urls?.length || 0})</DialogTitle>
                                  </DialogHeader>
                                  {viewingPhotos && viewingPhotos.length > 0 && (
                                    <div className="space-y-4">
                                      <div className="relative aspect-video bg-black/50 rounded-lg overflow-hidden">
                                        <img
                                          src={viewingPhotos[currentPhotoIndex]}
                                          alt={`Photo ${currentPhotoIndex + 1}`}
                                          className="w-full h-full object-contain"
                                        />
                                        {viewingPhotos.length > 1 && (
                                          <>
                                            <Button
                                              size="icon"
                                              variant="ghost"
                                              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70"
                                              onClick={() =>
                                                setCurrentPhotoIndex((prev) =>
                                                  (prev - 1 + viewingPhotos.length) % viewingPhotos.length
                                                )
                                              }
                                            >
                                              <ChevronLeft className="h-5 w-5" />
                                            </Button>
                                            <Button
                                              size="icon"
                                              variant="ghost"
                                              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70"
                                              onClick={() =>
                                                setCurrentPhotoIndex((prev) =>
                                                  (prev + 1) % viewingPhotos.length
                                                )
                                              }
                                            >
                                              <ChevronRight className="h-5 w-5" />
                                            </Button>
                                          </>
                                        )}
                                      </div>
                                      <div className="flex gap-2 overflow-x-auto pb-2">
                                        {viewingPhotos.map((url, idx) => (
                                          <button
                                            key={idx}
                                            onClick={() => setCurrentPhotoIndex(idx)}
                                            className={`shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-colors ${
                                              idx === currentPhotoIndex ? "border-primary" : "border-transparent"
                                            }`}
                                          >
                                            <img src={url} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                                          </button>
                                        ))}
                                      </div>
                                      {/* Download button */}
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full gap-2 bg-transparent"
                                        onClick={() => {
                                          const link = document.createElement("a");
                                          link.href = viewingPhotos[currentPhotoIndex];
                                          link.download = `photo-${currentPhotoIndex + 1}.jpg`;
                                          link.click();
                                        }}
                                      >
                                        <Download className="h-4 w-4" />
                                        Download Current Photo
                                      </Button>
                                    </div>
                                  )}
                                </DialogContent>
                              </Dialog>

                              {/* View Signature */}
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className={`h-8 w-8 ${!hasSignature ? "opacity-30" : ""}`}
                                    disabled={!hasSignature}
                                  >
                                    <FileText className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Customer Signature</DialogTitle>
                                  </DialogHeader>
                                  {card.signature_data && (
                                    <div className="space-y-4">
                                      <div className="bg-white rounded-lg p-4">
                                        <img src={card.signature_data} alt="Customer Signature" className="w-full" />
                                      </div>
                                      {card.client_name_signed && (
                                        <p className="text-sm text-muted-foreground">
                                          Signed by: <strong>{card.client_name_signed}</strong>
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </DialogContent>
                              </Dialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="bg-transparent"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="bg-transparent"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
