"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  Loader2,
  Search,
  ArrowLeft,
  ExternalLink,
  FileSearch,
  Calendar,
  User,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Archive,
  Filter,
  X,
} from "lucide-react";

// Types
interface ArchiveRecord {
  id: string;
  created_at: string;
  navision_order_no: string | null;
  machine_model: string | null;
  serial_number: string | null;
  technician_name: string | null;
  total_invoice_amount: number | null;
  status: string | null;
}

interface Technician {
  id: string;
  name: string;
}

// Date range presets
const DATE_RANGES = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "week", label: "Last 7 Days" },
  { value: "month", label: "Last 30 Days" },
  { value: "quarter", label: "Last 90 Days" },
  { value: "year", label: "This Year" },
];

export default function ServiceHistoryArchivePage() {
  // Data state
  const [records, setRecords] = useState<ArchiveRecord[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [technicianFilter, setTechnicianFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("all");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Fetch data from Supabase
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const supabase = createClient();

    try {
      // Fetch completed job cards (archive-worthy records)
      let query = supabase
        .from("job_cards")
        .select(`
          id,
          created_at,
          navision_order_no,
          machine_model,
          serial_number,
          technician_name,
          status
        `)
        .eq("status", "completed")
        .order("created_at", { ascending: false });

      // Apply date range filter
      if (dateRange !== "all") {
        const now = new Date();
        let startDate: Date;

        switch (dateRange) {
          case "today":
            startDate = new Date(now.setHours(0, 0, 0, 0));
            break;
          case "week":
            startDate = new Date(now.setDate(now.getDate() - 7));
            break;
          case "month":
            startDate = new Date(now.setDate(now.getDate() - 30));
            break;
          case "quarter":
            startDate = new Date(now.setDate(now.getDate() - 90));
            break;
          case "year":
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
          default:
            startDate = new Date(0);
        }

        query = query.gte("created_at", startDate.toISOString());
      }

      const { data: cardsData, error: cardsError } = await query;

      if (cardsError) throw cardsError;

      // Fetch parts totals for each job card
      const cardIds = cardsData?.map(c => c.id) || [];
      let partsMap = new Map<string, number>();

      if (cardIds.length > 0) {
        const { data: partsData } = await supabase
          .from("job_card_parts")
          .select("job_card_id, quantity, price_at_submission")
          .in("job_card_id", cardIds);

        if (partsData) {
          partsData.forEach((p) => {
            const total = (p.quantity || 0) * (p.price_at_submission || 0);
            partsMap.set(p.job_card_id, (partsMap.get(p.job_card_id) || 0) + total);
          });
        }
      }

      // Fetch labor totals
      let laborMap = new Map<string, number>();
      if (cardIds.length > 0) {
        const { data: laborData } = await supabase
          .from("job_card_labor")
          .select("job_card_id, actual_hours")
          .in("job_card_id", cardIds);

        if (laborData) {
          laborData.forEach((l) => {
            const total = (l.actual_hours || 0) * 50; // 50 BGN/hour
            laborMap.set(l.job_card_id, (laborMap.get(l.job_card_id) || 0) + total);
          });
        }
      }

      // Combine totals
      const recordsWithTotals: ArchiveRecord[] = (cardsData || []).map(card => ({
        ...card,
        total_invoice_amount: (partsMap.get(card.id) || 0) + (laborMap.get(card.id) || 0),
      }));

      setRecords(recordsWithTotals);

      // Fetch technicians for filter
      const { data: techData } = await supabase
        .from("technicians")
        .select("id, name")
        .eq("active", true)
        .order("name");

      setTechnicians(techData || []);
    } catch (error) {
      console.error("Error fetching archive data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter records
  const filteredRecords = records.filter((record) => {
    // Search filter
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      record.serial_number?.toLowerCase().includes(searchLower) ||
      record.navision_order_no?.toLowerCase().includes(searchLower) ||
      record.machine_model?.toLowerCase().includes(searchLower);

    // Technician filter
    const matchesTechnician =
      technicianFilter === "all" ||
      record.technician_name === technicianFilter;

    return matchesSearch && matchesTechnician;
  });

  // Pagination
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, technicianFilter, dateRange]);

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("bg-BG", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Format currency
  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === 0) return "—";
    return `${amount.toLocaleString("bg-BG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} BGN`;
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("");
    setTechnicianFilter("all");
    setDateRange("all");
  };

  const hasActiveFilters = searchQuery || technicianFilter !== "all" || dateRange !== "all";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link href="/admin/queue">
              <Button variant="ghost" size="icon" className="hover:bg-muted">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Archive className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground tracking-tight">Service History Archive</h1>
                <p className="text-xs text-muted-foreground">Megatron Digital Service</p>
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={fetchData}
            disabled={isLoading}
            className="gap-2 border-border/50 hover:border-primary/50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </header>

      <main className="container px-4 py-6 space-y-6">
        {/* Search Bar */}
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by Serial Number or Navision ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 text-base bg-background border-border/50 focus:border-primary/50 focus:ring-primary/20"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Technician Filter */}
          <div className="flex items-center gap-2 flex-1 sm:flex-none">
            <User className="h-4 w-4 text-muted-foreground" />
            <Select value={technicianFilter} onValueChange={setTechnicianFilter}>
              <SelectTrigger className="w-full sm:w-[200px] border-border/50">
                <SelectValue placeholder="All Technicians" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Technicians</SelectItem>
                {technicians.map((tech) => (
                  <SelectItem key={tech.id} value={tech.name}>
                    {tech.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Range Filter */}
          <div className="flex items-center gap-2 flex-1 sm:flex-none">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-full sm:w-[180px] border-border/50">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                {DATE_RANGES.map((range) => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              onClick={clearFilters}
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <Filter className="h-4 w-4" />
              Clear Filters
            </Button>
          )}

          {/* Results Count */}
          <div className="flex items-center ml-auto">
            <Badge variant="outline" className="border-border/50 text-muted-foreground">
              {filteredRecords.length} record{filteredRecords.length !== 1 ? "s" : ""} found
            </Badge>
          </div>
        </div>

        {/* Results Table */}
        <Card className="border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="text-muted-foreground font-semibold">Date</TableHead>
                  <TableHead className="text-muted-foreground font-semibold">Navision #</TableHead>
                  <TableHead className="text-muted-foreground font-semibold">Machine Model & SN</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-right">Total Amount</TableHead>
                  <TableHead className="text-muted-foreground font-semibold">Technician</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-64">
                      <div className="flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : paginatedRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-64">
                      {/* Empty State */}
                      <div className="flex flex-col items-center justify-center text-center py-12">
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted/50 mb-4">
                          <FileSearch className="h-10 w-10 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground mb-1">No records found</h3>
                        <p className="text-sm text-muted-foreground max-w-sm">
                          {hasActiveFilters
                            ? "Try adjusting your search or filters to find what you're looking for."
                            : "There are no completed service records in the archive yet."}
                        </p>
                        {hasActiveFilters && (
                          <Button
                            variant="outline"
                            onClick={clearFilters}
                            className="mt-4 gap-2"
                          >
                            <X className="h-4 w-4" />
                            Clear all filters
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedRecords.map((record) => (
                    <TableRow
                      key={record.id}
                      className="border-border/30 transition-colors hover:bg-primary/5 group"
                    >
                      {/* Date */}
                      <TableCell className="text-muted-foreground">
                        {formatDate(record.created_at)}
                      </TableCell>

                      {/* Navision # */}
                      <TableCell>
                        <span className="font-bold text-foreground">
                          {record.navision_order_no || (
                            <span className="text-muted-foreground font-normal">—</span>
                          )}
                        </span>
                      </TableCell>

                      {/* Machine Model & SN */}
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">
                            {record.machine_model || "Unknown Model"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            SN: {record.serial_number || "N/A"}
                          </span>
                        </div>
                      </TableCell>

                      {/* Total Amount */}
                      <TableCell className="text-right">
                        <span className="font-semibold text-emerald-500">
                          {formatCurrency(record.total_invoice_amount)}
                        </span>
                      </TableCell>

                      {/* Technician Name */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                            {record.technician_name?.split(" ").map(n => n[0]).join("") || "?"}
                          </div>
                          <span className="text-foreground">
                            {record.technician_name || "Unknown"}
                          </span>
                        </div>
                      </TableCell>

                      {/* Action */}
                      <TableCell className="text-center">
                        <Link href={`/admin/report/${record.id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2 border-primary/30 text-primary hover:bg-primary/10 hover:border-primary group-hover:border-primary"
                          >
                            <ExternalLink className="h-4 w-4" />
                            <span className="hidden sm:inline">View Report</span>
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border/30">
              <p className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="border-border/50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="border-border/50"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
