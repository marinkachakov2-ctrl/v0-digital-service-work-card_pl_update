"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ClipboardList,
  FileStack,
  Archive,
  Link2,
  Loader2,
  CheckCircle2,
  Clock,
  Tractor,
  Search,
  ChevronRight,
  RefreshCw,
  Menu,
  X,
  Lock,
  FileText,
} from "lucide-react";
import { linkNavisionOrder, type PendingJobCard } from "@/lib/actions";

// Sidebar navigation items
const navItems = [
  { id: "pending", label: "Pending Cards", icon: ClipboardList, href: "/admin/queue", badge: true },
  { id: "proposals", label: "Proposals Queue", icon: FileStack, href: "/admin/queue/proposals" },
  { id: "archived", label: "Archived Reports", icon: Archive, href: "/admin/queue/archived" },
];

const ADMIN_PIN = "1234";

export default function AdminQueuePage() {
  const [mounted, setMounted] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);

  // Data state
  const [pendingJobs, setPendingJobs] = useState<PendingJobCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Mobile sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Link order state
  const [orderInputs, setOrderInputs] = useState<Record<string, string>>({});
  const [linkingId, setLinkingId] = useState<string | null>(null);

  // Stats
  const [pendingCount, setPendingCount] = useState(0);

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

  // Fetch pending job cards
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const supabase = createClient();

    // Fetch job cards with pending_order status or TEMP order numbers
    const { data, error } = await supabase
      .from("job_cards")
      .select(`
        id,
        created_at,
        order_no,
        status,
        technicians (name),
        machines (model, serial_number)
      `)
      .or("status.eq.pending_order,order_no.like.TEMP-%")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch error:", error);
      toast.error("Failed to load pending job cards");
      setIsLoading(false);
      return;
    }

    // Transform data to match PendingJobCard type
    const jobs: PendingJobCard[] = (data || []).map((card) => ({
      id: card.id,
      tempId: card.order_no || `TEMP-${card.id.slice(0, 8)}`,
      technicianName: (card.technicians as { name: string } | null)?.name || "Unknown",
      machineModel: (card.machines as { model: string; serial_number: string } | null)?.model || "N/A",
      serialNumber: (card.machines as { model: string; serial_number: string } | null)?.serial_number || "N/A",
      createdAt: card.created_at,
      clientName: "N/A",
    }));

    setPendingJobs(jobs);
    setPendingCount(jobs.length);
    setIsLoading(false);
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
        sessionStorage.setItem("megatron_admin_auth", "true");
      }
    } else {
      setPinError(true);
      setPinInput("");
    }
  };

  // Filter jobs by search
  const filteredJobs = pendingJobs.filter(
    (job) =>
      job.tempId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.technicianName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.machineModel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.serialNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle order input change
  const handleOrderInputChange = (jobId: string, value: string) => {
    setOrderInputs((prev) => ({ ...prev, [jobId]: value }));
  };

  // Handle link and finalize
  const handleLinkAndFinalize = async (job: PendingJobCard) => {
    const orderNo = orderInputs[job.id]?.trim();
    if (!orderNo) {
      toast.error("Missing Order Number", {
        description: "Please enter a Navision Service Order number.",
      });
      return;
    }

    setLinkingId(job.id);
    const result = await linkNavisionOrder(job.id, orderNo);
    setLinkingId(null);

    if (result.success) {
      toast.success("Order Linked Successfully", {
        description: `${job.tempId} has been linked to ${orderNo}`,
      });
      // Remove from list
      setPendingJobs((prev) => prev.filter((j) => j.id !== job.id));
      setPendingCount((prev) => Math.max(0, prev - 1));
      // Clear input
      setOrderInputs((prev) => {
        const newInputs = { ...prev };
        delete newInputs[job.id];
        return newInputs;
      });
    } else {
      toast.error("Failed to link order", {
        description: result.message || "Please try again.",
      });
    }
  };

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("bg-BG", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // PIN Dialog
  if (mounted && !isAuthorized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Dialog open={true}>
          <DialogContent className="sm:max-w-[350px] bg-card border-border">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-foreground">
                <Lock className="h-5 w-5 text-primary" />
                Admin Access Required
              </DialogTitle>
              <DialogDescription>
                Enter the admin PIN to access the queue management.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="pin" className="text-foreground">PIN Code</Label>
                <Input
                  id="pin"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="****"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={(e) => e.key === "Enter" && handlePinSubmit()}
                  className="text-center text-2xl tracking-widest bg-secondary border-border"
                />
                {pinError && (
                  <p className="text-xs text-destructive">Incorrect PIN. Please try again.</p>
                )}
              </div>
              <Button
                onClick={handlePinSubmit}
                disabled={pinInput.length !== 4}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Lock className="h-4 w-4 mr-2" />
                Access Dashboard
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-72 border-r border-border bg-sidebar flex flex-col transform transition-transform duration-200 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center">
                <Tractor className="h-6 w-6 text-warning" />
              </div>
              <div>
                <h1 className="font-bold text-lg text-sidebar-foreground">Megatron</h1>
                <p className="text-xs text-warning">Digital Service</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 px-3">
            Queue Management
          </p>
          {navItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                item.id === "pending"
                  ? "bg-warning/10 text-warning border border-warning/20"
                  : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge && pendingCount > 0 && (
                <Badge className="bg-warning text-black h-5 min-w-5 flex items-center justify-center text-xs font-bold">
                  {pendingCount}
                </Badge>
              )}
            </Link>
          ))}
        </nav>

        {/* Back to Manager Dashboard */}
        <div className="p-4 border-t border-sidebar-border space-y-2">
          <Link href="/admin/manager">
            <Button variant="outline" className="w-full gap-2 bg-transparent border-sidebar-border hover:bg-sidebar-accent text-sm">
              <FileText className="h-4 w-4" />
              Manager Dashboard
              <ChevronRight className="h-4 w-4 ml-auto" />
            </Button>
          </Link>
          <Link href="/">
            <Button variant="ghost" className="w-full gap-2 text-muted-foreground hover:text-foreground text-sm">
              <FileText className="h-4 w-4" />
              Job Card App
            </Button>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 lg:px-6 shrink-0">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Administrative Queue: Pending Job Cards</h2>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Assign Navision order numbers to finalize job cards
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={isLoading}
            className="gap-1.5 bg-transparent border-border"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Pending Cards</p>
                    <p className="text-2xl font-bold text-warning">{pendingCount}</p>
                  </div>
                  <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-warning" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Proposals</p>
                    <p className="text-2xl font-bold text-primary">0</p>
                  </div>
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileStack className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Archived</p>
                    <p className="text-2xl font-bold text-muted-foreground">--</p>
                  </div>
                  <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center">
                    <Archive className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pending Job Cards Table */}
          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg text-foreground flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-warning" />
                    Pending Job Cards
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    Cards with TEMP IDs awaiting Navision order assignment
                  </p>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-secondary border-border"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredJobs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <CheckCircle2 className="h-12 w-12 text-primary mb-3" />
                  <p className="text-foreground font-medium">No pending job cards</p>
                  <p className="text-sm text-muted-foreground">All cards have been assigned Navision orders</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-muted-foreground whitespace-nowrap">Date</TableHead>
                        <TableHead className="text-muted-foreground whitespace-nowrap">Technician Name</TableHead>
                        <TableHead className="text-muted-foreground whitespace-nowrap">Machine Model</TableHead>
                        <TableHead className="text-muted-foreground whitespace-nowrap">Serial Number</TableHead>
                        <TableHead className="text-muted-foreground whitespace-nowrap">TEMP ID</TableHead>
                        <TableHead className="text-muted-foreground whitespace-nowrap min-w-[300px]">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredJobs.map((job) => (
                        <TableRow key={job.id} className="border-border hover:bg-secondary/50">
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {formatDate(job.createdAt)}
                          </TableCell>
                          <TableCell className="font-medium text-foreground whitespace-nowrap">
                            {job.technicianName}
                          </TableCell>
                          <TableCell className="text-foreground whitespace-nowrap">
                            {job.machineModel}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <span className="font-mono text-sm text-muted-foreground">
                              {job.serialNumber}
                            </span>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <Badge variant="outline" className="font-mono text-warning border-warning/30 bg-warning/10">
                              {job.tempId}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Input
                                placeholder="Navision Service Order #"
                                value={orderInputs[job.id] || ""}
                                onChange={(e) => handleOrderInputChange(job.id, e.target.value)}
                                className="w-48 bg-secondary border-border text-sm h-9"
                              />
                              <Button
                                size="sm"
                                onClick={() => handleLinkAndFinalize(job)}
                                disabled={linkingId === job.id || !orderInputs[job.id]?.trim()}
                                className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 whitespace-nowrap"
                              >
                                {linkingId === job.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Link2 className="h-4 w-4" />
                                )}
                                Link & Finalize
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
