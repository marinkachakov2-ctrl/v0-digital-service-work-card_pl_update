"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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
import {
  LayoutDashboard,
  ClipboardList,
  CreditCard,
  History,
  Bell,
  User,
  Link2,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Tractor,
  Users,
  FileText,
  Search,
  ChevronRight,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";
import {
  fetchPendingJobCards,
  fetchAdminStats,
  linkNavisionOrder,
  type PendingJobCard,
} from "@/lib/actions";

// Sidebar navigation items
const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "/admin" },
  { id: "pending", label: "Pending Jobs (TEMP)", icon: ClipboardList, href: "/admin/pending", badge: true },
  { id: "financial", label: "Financial Approval", icon: CreditCard, href: "/admin/financial" },
  { id: "history", label: "Machine History", icon: History, href: "/admin/history" },
];

export default function PendingAllocationPage() {
  const [pendingJobs, setPendingJobs] = useState<PendingJobCard[]>([]);
  const [stats, setStats] = useState({ pendingCount: 0, todayCount: 0, totalPartsValue: 0, blockedClients: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Link Navision dialog state
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<PendingJobCard | null>(null);
  const [navisionOrderNo, setNavisionOrderNo] = useState("");
  const [isLinking, setIsLinking] = useState(false);
  const [linkSuccess, setLinkSuccess] = useState(false);

  // Load data
  const loadData = async () => {
    setIsLoading(true);
    const [jobs, adminStats] = await Promise.all([
      fetchPendingJobCards(),
      fetchAdminStats(),
    ]);
    setPendingJobs(jobs);
    setStats(adminStats);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter jobs by search
  const filteredJobs = pendingJobs.filter(
    (job) =>
      job.tempId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.technicianName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.machineModel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.serialNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Open link dialog
  const openLinkDialog = (job: PendingJobCard) => {
    setSelectedJob(job);
    setNavisionOrderNo("");
    setLinkSuccess(false);
    setLinkDialogOpen(true);
  };

  // Handle link Navision order
  const handleLinkOrder = async () => {
    if (!selectedJob || !navisionOrderNo.trim()) return;

    setIsLinking(true);
    const result = await linkNavisionOrder(selectedJob.id, navisionOrderNo);
    setIsLinking(false);

    if (result.success) {
      setLinkSuccess(true);
      setPendingJobs((prev) => prev.filter((j) => j.id !== selectedJob.id));
      setStats((prev) => ({ ...prev, pendingCount: Math.max(0, prev.pendingCount - 1) }));
      setTimeout(() => {
        setLinkDialogOpen(false);
        setSelectedJob(null);
      }, 1500);
    }
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

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-sidebar flex flex-col shrink-0">
        {/* Logo */}
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Tractor className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-sidebar-foreground">Megatron</h1>
              <p className="text-xs text-muted-foreground">Digital Service</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                item.id === "pending"
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge && stats.pendingCount > 0 && (
                <Badge className="bg-warning text-black h-5 min-w-5 flex items-center justify-center text-xs font-bold">
                  {stats.pendingCount}
                </Badge>
              )}
            </Link>
          ))}
        </nav>

        {/* Back to Work Card */}
        <div className="p-4 border-t border-sidebar-border">
          <Link href="/">
            <Button variant="outline" className="w-full gap-2 bg-transparent border-sidebar-border hover:bg-sidebar-accent">
              <FileText className="h-4 w-4" />
              Job Card App
              <ChevronRight className="h-4 w-4 ml-auto" />
            </Button>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="sm" className="gap-1.5">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
            <div className="h-6 w-px bg-border" />
            <div>
              <h2 className="text-lg font-semibold text-foreground">Pending Allocation</h2>
              <p className="text-xs text-muted-foreground">TEMP job cards awaiting Navision order</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading} className="gap-1.5 bg-transparent">
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            {/* Notifications */}
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5 text-muted-foreground" />
              {stats.pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground flex items-center justify-center">
                  {stats.pendingCount}
                </span>
              )}
            </Button>
            {/* User Profile */}
            <div className="flex items-center gap-3 pl-4 border-l border-border">
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">Admin User</p>
                <p className="text-xs text-muted-foreground">Administrator</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Pending Allocation</p>
                    <p className="text-2xl font-bold text-warning">{stats.pendingCount}</p>
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
                    <p className="text-xs text-muted-foreground">Today&apos;s Jobs</p>
                    <p className="text-2xl font-bold text-primary">{stats.todayCount}</p>
                  </div>
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <ClipboardList className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Blocked Clients</p>
                    <p className="text-2xl font-bold text-destructive">{stats.blockedClients}</p>
                  </div>
                  <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Active Technicians</p>
                    <p className="text-2xl font-bold text-foreground">8</p>
                  </div>
                  <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center">
                    <Users className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pending Allocation Table */}
          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg text-foreground flex items-center gap-2">
                    <Clock className="h-5 w-5 text-warning" />
                    Pending Allocation
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    Job cards with TEMP IDs awaiting Navision order number assignment
                  </p>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by ID, technician, model..."
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
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CheckCircle2 className="h-12 w-12 text-primary mb-3" />
                  <p className="text-foreground font-medium">No pending allocations</p>
                  <p className="text-sm text-muted-foreground">All job cards have been assigned Navision orders</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-muted-foreground">Temporary ID</TableHead>
                      <TableHead className="text-muted-foreground">Technician</TableHead>
                      <TableHead className="text-muted-foreground">Machine Model</TableHead>
                      <TableHead className="text-muted-foreground">Serial Number</TableHead>
                      <TableHead className="text-muted-foreground">Created</TableHead>
                      <TableHead className="text-muted-foreground">Status</TableHead>
                      <TableHead className="text-right text-muted-foreground">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredJobs.map((job) => (
                      <TableRow key={job.id} className="border-border hover:bg-secondary/50">
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-warning border-warning/30 bg-warning/10">
                            {job.tempId}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-foreground">{job.technicianName}</TableCell>
                        <TableCell className="text-foreground">{job.machineModel}</TableCell>
                        <TableCell>
                          <span className="font-mono text-sm text-muted-foreground">{job.serialNumber}</span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(job.createdAt)}</TableCell>
                        <TableCell>
                          <Badge className="bg-warning/15 text-warning border-warning/30">
                            Pending Order
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => openLinkDialog(job)}
                            className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                          >
                            <Link2 className="h-4 w-4" />
                            Link Navision
                          </Button>
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

      {/* Link Navision Order Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-primary" />
              Link Navision Order
            </DialogTitle>
            <DialogDescription>
              Assign a Navision order number to this job card
            </DialogDescription>
          </DialogHeader>

          {linkSuccess ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <p className="text-foreground font-medium">Order Linked Successfully!</p>
              <p className="text-sm text-muted-foreground">
                {selectedJob?.tempId} → {navisionOrderNo}
              </p>
            </div>
          ) : (
            <>
              {selectedJob && (
                <div className="rounded-lg border border-border bg-secondary/50 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-warning border-warning/30 bg-warning/10">
                      {selectedJob.tempId}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Technician:</span>
                      <span className="ml-2 text-foreground">{selectedJob.technicianName}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Machine:</span>
                      <span className="ml-2 text-foreground">{selectedJob.machineModel}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Serial:</span>
                      <span className="ml-2 font-mono text-foreground">{selectedJob.serialNumber}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Client:</span>
                      <span className="ml-2 text-foreground">{selectedJob.clientName}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="navision-order" className="text-foreground">
                  Navision Order Number
                </Label>
                <Input
                  id="navision-order"
                  placeholder="e.g., NAV-2026-001234"
                  value={navisionOrderNo}
                  onChange={(e) => setNavisionOrderNo(e.target.value)}
                  className="bg-secondary border-border text-foreground"
                />
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setLinkDialogOpen(false)}
                  className="bg-transparent"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleLinkOrder}
                  disabled={!navisionOrderNo.trim() || isLinking}
                  className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {isLinking ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Linking...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Confirm Allocation
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
