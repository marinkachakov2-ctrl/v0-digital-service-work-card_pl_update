"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  LayoutDashboard,
  ClipboardList,
  CreditCard,
  History,
  Bell,
  User,
  Search,
  Calendar,
  AlertTriangle,
  Tractor,
  FileText,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Loader2,
  ImageIcon,
  X,
  FileCheck,
  Wrench,
  DollarSign,
  CalendarDays,
  ChevronRight,
} from "lucide-react";
import { fetchAllPendingRepairs, markPendingRepairsCompleted, type AdminPendingRepair } from "@/lib/actions";

// Sidebar navigation items
const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "/admin" },
  { id: "pending", label: "Pending Jobs (TEMP)", icon: ClipboardList, href: "/admin/pending" },
  { id: "approval", label: "Financial Approval", icon: CreditCard, href: "/admin/approval" },
  { id: "repairs", label: "Deferred Repairs", icon: Wrench, href: "/admin/repairs", active: true },
  { id: "history", label: "Machine History", icon: History, href: "/admin/history" },
];

export default function AdminPendingRepairsPage() {
  // Data state
  const [repairs, setRepairs] = useState<AdminPendingRepair[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRepair, setSelectedRepair] = useState<AdminPendingRepair | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Action state
  const [isResolving, setIsResolving] = useState<string | null>(null);
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false);
  const [quoteRepair, setQuoteRepair] = useState<AdminPendingRepair | null>(null);

  // Load repairs
  useEffect(() => {
    loadRepairs();
  }, []);

  const loadRepairs = async () => {
    setIsLoading(true);
    const data = await fetchAllPendingRepairs({
      search: searchQuery || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    });
    setRepairs(data);
    setIsLoading(false);
  };

  // Apply filters
  const handleSearch = () => {
    loadRepairs();
  };

  // Clear filters
  const clearFilters = () => {
    setSearchQuery("");
    setDateFrom("");
    setDateTo("");
    loadRepairs();
  };

  // Mark as resolved
  const handleMarkResolved = async (repairId: string) => {
    setIsResolving(repairId);
    const result = await markPendingRepairsCompleted([repairId]);
    if (result.success) {
      setRepairs((prev) => prev.filter((r) => r.id !== repairId));
      if (selectedRepair?.id === repairId) {
        setDrawerOpen(false);
        setSelectedRepair(null);
      }
    }
    setIsResolving(null);
  };

  // Open detail drawer
  const openDetail = (repair: AdminPendingRepair) => {
    setSelectedRepair(repair);
    setDrawerOpen(true);
  };

  // Create quote action
  const handleCreateQuote = (repair: AdminPendingRepair) => {
    setQuoteRepair(repair);
    setQuoteDialogOpen(true);
  };

  // Get days badge color
  const getDaysBadgeClass = (days: number) => {
    if (days > 30) return "bg-red-500/15 text-red-500 border-red-500/30";
    if (days > 15) return "bg-amber-500/15 text-amber-500 border-amber-500/30";
    return "bg-emerald-500/15 text-emerald-500 border-emerald-500/30";
  };

  // Calculate totals
  const totalValue = repairs.reduce((sum, r) => sum + r.estimatedCost, 0);
  const urgentCount = repairs.filter((r) => r.daysSinceDiscovery > 30).length;

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-card">
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-border">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center">
            <Tractor className="h-5 w-5 text-black" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-foreground">Megatron</h1>
            <p className="text-[10px] text-muted-foreground">Digital Service</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link key={item.id} href={item.href}>
              <div
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  item.active
                    ? "bg-yellow-500/15 text-yellow-500 border border-yellow-500/30"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                <span className="text-sm font-medium">{item.label}</span>
              </div>
            </Link>
          ))}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
              <User className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Admin</p>
              <p className="text-xs text-muted-foreground">Service Manager</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-border bg-card">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-bold text-foreground">Deferred Service Opportunities</h1>
              <p className="text-xs text-muted-foreground">Track and convert pending repair recommendations</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-amber-500/15 text-amber-500 border-amber-500/30 px-3 py-1">
              <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
              {repairs.length} Pending Repairs
            </Badge>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5 text-muted-foreground" />
              {urgentCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center">
                  {urgentCount}
                </span>
              )}
            </Button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6 overflow-auto">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="border-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Pending</p>
                    <p className="text-2xl font-bold text-foreground">{repairs.length}</p>
                  </div>
                  <div className="h-10 w-10 rounded-lg bg-blue-500/15 flex items-center justify-center">
                    <ClipboardList className="h-5 w-5 text-blue-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Urgent ({">"}30 days)</p>
                    <p className="text-2xl font-bold text-red-500">{urgentCount}</p>
                  </div>
                  <div className="h-10 w-10 rounded-lg bg-red-500/15 flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Est. Value</p>
                    <p className="text-2xl font-bold text-emerald-500">{totalValue.toLocaleString()} лв.</p>
                  </div>
                  <div className="h-10 w-10 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-emerald-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Unique Machines</p>
                    <p className="text-2xl font-bold text-foreground">
                      {new Set(repairs.map((r) => r.machineVin)).size}
                    </p>
                  </div>
                  <div className="h-10 w-10 rounded-lg bg-yellow-500/15 flex items-center justify-center">
                    <Tractor className="h-5 w-5 text-yellow-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filter Bar */}
          <Card className="border-border bg-card mb-6">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-end gap-4">
                <div className="flex-1 min-w-[200px]">
                  <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                    <Search className="h-3 w-3" />
                    Search
                  </Label>
                  <Input
                    placeholder="Serial No, Customer, Description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-secondary"
                  />
                </div>
                <div className="w-40">
                  <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    From Date
                  </Label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="bg-secondary"
                  />
                </div>
                <div className="w-40">
                  <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    To Date
                  </Label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="bg-secondary"
                  />
                </div>
                <Button onClick={handleSearch} className="bg-primary text-primary-foreground gap-2">
                  <Search className="h-4 w-4" />
                  Search
                </Button>
                <Button variant="outline" onClick={clearFilters} className="bg-transparent">
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Data Table */}
          <Card className="border-border bg-card">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Wrench className="h-4 w-4 text-yellow-500" />
                Deferred Repairs
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : repairs.length === 0 ? (
                <div className="text-center py-16">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-500 mb-4" />
                  <p className="text-muted-foreground">No pending repairs found</p>
                  <p className="text-xs text-muted-foreground mt-1">All deferred items have been resolved</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-muted-foreground">Machine</TableHead>
                      <TableHead className="text-muted-foreground">Deferred Item</TableHead>
                      <TableHead className="text-muted-foreground">Origin</TableHead>
                      <TableHead className="text-muted-foreground text-center">Days</TableHead>
                      <TableHead className="text-muted-foreground text-right">Est. Value</TableHead>
                      <TableHead className="text-muted-foreground text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {repairs.map((repair) => (
                      <TableRow
                        key={repair.id}
                        className="border-border cursor-pointer hover:bg-secondary/50"
                        onClick={() => openDetail(repair)}
                      >
                        <TableCell>
                          <div>
                            <p className="font-mono text-sm font-medium text-foreground">
                              {repair.machineVin || "N/A"}
                            </p>
                            <p className="text-xs text-muted-foreground">{repair.machineModel}</p>
                            <p className="text-xs text-blue-400">{repair.customerName}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-foreground max-w-[250px] truncate">{repair.description}</p>
                          <Badge
                            variant="outline"
                            className={`text-[10px] mt-1 ${
                              repair.status === "deferred"
                                ? "bg-amber-500/15 text-amber-500 border-amber-500/30"
                                : "bg-blue-500/15 text-blue-500 border-blue-500/30"
                            }`}
                          >
                            {repair.status === "deferred" ? "Отложено" : repair.status === "next_visit" ? "За следващо посещение" : repair.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="font-mono text-xs text-muted-foreground">
                              {repair.sourceOrderNo || repair.sourceJobCardId?.slice(0, 8) || "N/A"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={getDaysBadgeClass(repair.daysSinceDiscovery)}>
                            {repair.daysSinceDiscovery}d
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-semibold text-foreground">
                            {repair.estimatedCost.toLocaleString()} лв.
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="sm"
                              className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() => handleCreateQuote(repair)}
                            >
                              <FileCheck className="h-3.5 w-3.5" />
                              Create Quote
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 gap-1.5 bg-transparent border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"
                              onClick={() => handleMarkResolved(repair.id)}
                              disabled={isResolving === repair.id}
                            >
                              {isResolving === repair.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              )}
                              Resolved
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Detail Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-[450px] sm:max-w-[450px] bg-card border-l border-border overflow-y-auto">
          <SheetHeader className="border-b border-border pb-4">
            <SheetTitle className="flex items-center gap-2 text-foreground">
              <Wrench className="h-5 w-5 text-yellow-500" />
              Repair Details
            </SheetTitle>
            <SheetDescription>
              View complete information about this deferred repair
            </SheetDescription>
          </SheetHeader>

          {selectedRepair && (
            <div className="py-6 space-y-6">
              {/* Machine Info */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Tractor className="h-4 w-4 text-yellow-500" />
                  Machine
                </h3>
                <div className="rounded-lg border border-border bg-secondary/30 p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Serial No:</span>
                    <span className="font-mono text-sm text-foreground">{selectedRepair.machineVin}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Model:</span>
                    <span className="text-sm text-foreground">{selectedRepair.machineModel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Customer:</span>
                    <span className="text-sm text-blue-400">{selectedRepair.customerName}</span>
                  </div>
                </div>
              </div>

              {/* Repair Info */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-amber-500" />
                  Deferred Item
                </h3>
                <div className="rounded-lg border border-border bg-secondary/30 p-4 space-y-3">
                  <p className="text-sm text-foreground">{selectedRepair.description}</p>
                  <div className="flex items-center justify-between">
                    <Badge
                      variant="outline"
                      className={getDaysBadgeClass(selectedRepair.daysSinceDiscovery)}
                    >
                      <CalendarDays className="h-3 w-3 mr-1" />
                      {selectedRepair.daysSinceDiscovery} days ago
                    </Badge>
                    <span className="font-semibold text-emerald-500">
                      {selectedRepair.estimatedCost.toLocaleString()} лв.
                    </span>
                  </div>
                </div>
              </div>

              {/* Origin Job Card */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-500" />
                  Origin
                </h3>
                <div className="rounded-lg border border-border bg-secondary/30 p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Job Card:</span>
                    <span className="font-mono text-sm text-foreground">
                      {selectedRepair.sourceOrderNo || selectedRepair.sourceJobCardId?.slice(0, 8) || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Discovered:</span>
                    <span className="text-sm text-foreground">
                      {new Date(selectedRepair.createdAt).toLocaleDateString("bg-BG")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Photos */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-purple-500" />
                  Attached Photos
                </h3>
                {selectedRepair.photoUrls && selectedRepair.photoUrls.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {selectedRepair.photoUrls.map((url, idx) => (
                      <div
                        key={idx}
                        className="aspect-square rounded-lg border border-border overflow-hidden bg-secondary"
                      >
                        <Image
                          src={url}
                          alt={`Defect photo ${idx + 1}`}
                          width={200}
                          height={200}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-border bg-secondary/30 p-8 text-center">
                    <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-xs text-muted-foreground">No photos attached</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-border space-y-3">
                <Button
                  className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => {
                    setDrawerOpen(false);
                    handleCreateQuote(selectedRepair);
                  }}
                >
                  <FileCheck className="h-4 w-4" />
                  Create Quote
                </Button>
                <Button
                  variant="outline"
                  className="w-full gap-2 bg-transparent border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"
                  onClick={() => handleMarkResolved(selectedRepair.id)}
                  disabled={isResolving === selectedRepair.id}
                >
                  {isResolving === selectedRepair.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Mark as Resolved
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Create Quote Dialog */}
      <Dialog open={quoteDialogOpen} onOpenChange={setQuoteDialogOpen}>
        <DialogContent className="sm:max-w-md bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-emerald-500" />
              Create Quote
            </DialogTitle>
            <DialogDescription>
              Generate a quote for this deferred repair
            </DialogDescription>
          </DialogHeader>

          {quoteRepair && (
            <div className="space-y-4 py-4">
              <div className="rounded-lg border border-border bg-secondary/30 p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Machine:</span>
                  <span className="font-mono text-foreground">{quoteRepair.machineVin}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Customer:</span>
                  <span className="text-foreground">{quoteRepair.customerName}</span>
                </div>
                <div className="pt-2 border-t border-border">
                  <p className="text-sm text-foreground">{quoteRepair.description}</p>
                </div>
                <div className="flex justify-between pt-2 border-t border-border">
                  <span className="text-muted-foreground">Estimated:</span>
                  <span className="font-semibold text-emerald-500">
                    {quoteRepair.estimatedCost.toLocaleString()} лв.
                  </span>
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                <p className="text-xs text-amber-500">
                  This will create a new quote for the customer. The item will remain in the pending list until marked as resolved.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setQuoteDialogOpen(false)}
              className="bg-transparent"
            >
              Cancel
            </Button>
            <Button
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => {
                // In a real app, this would create a quote
                setQuoteDialogOpen(false);
                // Could redirect to a quote creation page
              }}
            >
              <FileCheck className="h-4 w-4" />
              Create Quote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
