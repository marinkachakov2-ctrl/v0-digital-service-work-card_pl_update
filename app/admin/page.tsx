"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Search,
  Filter,
  Link2,
  ChevronDown,
  FileText,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  PenLine,
  X,
} from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useClocking, getStatusColor, type WorkOrder } from "@/lib/clocking-context";

const BG_MONTHS = [
  "януари", "февруари", "март", "април", "май", "юни",
  "юли", "август", "септември", "октомври", "ноември", "декември",
];

function statusBadge(order: WorkOrder) {
  const color = getStatusColor(order);
  const map: Record<string, string> = {
    red: "bg-red-600 text-white border-red-500",
    green: "bg-emerald-600 text-white border-emerald-500",
    orange: "bg-orange-500 text-white border-orange-400",
    gray: "bg-muted text-muted-foreground border-muted-foreground/30",
    default: "bg-secondary text-foreground border-border",
  };
  return (
    <Badge className={cn("text-[10px] border", map[color])}>
      {order.status}
    </Badge>
  );
}

export default function AdminDashboardPage() {
  const {
    workOrders,
    linkOrderToJobCard,
    updateWorkOrder,
  } = useClocking();

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterTech, setFilterTech] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  // Link order dialog
  const [linkingJC, setLinkingJC] = useState<WorkOrder | null>(null);
  const [linkOrderInput, setLinkOrderInput] = useState("");

  // Edit dialog
  const [editingOrder, setEditingOrder] = useState<WorkOrder | null>(null);
  const [editStatus, setEditStatus] = useState<string>("");
  const [editPlannedHours, setEditPlannedHours] = useState("");

  // Technicians from context
  const technicians = useMemo(() => {
    const techMap = new Map<string, string>();
    for (const order of workOrders) {
      if (order.technicianId && order.technicianName) {
        techMap.set(order.technicianId, order.technicianName);
      }
    }
    return Array.from(techMap.entries()).map(([id, name]) => ({ id, name }));
  }, [workOrders]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return workOrders.filter((order) => {
      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match =
          order.id.toLowerCase().includes(q) ||
          order.orderNumber.toLowerCase().includes(q) ||
          order.machineOwner.toLowerCase().includes(q) ||
          order.machine.toLowerCase().includes(q) ||
          (order.description || "").toLowerCase().includes(q);
        if (!match) return false;
      }
      // Status filter
      if (filterStatus !== "all" && order.status !== filterStatus) return false;
      // Tech filter
      if (filterTech !== "all" && order.technicianId !== filterTech) return false;
      // Type filter
      if (filterType !== "all" && order.type !== filterType) return false;
      return true;
    });
  }, [workOrders, searchQuery, filterStatus, filterTech, filterType]);

  // Stats
  const stats = useMemo(() => {
    const total = workOrders.length;
    const active = workOrders.filter((o) => o.status === "In Progress").length;
    const signed = workOrders.filter((o) => o.status === "Signed").length;
    const overdue = workOrders.filter((o) => o.status === "Overdue").length;
    return { total, active, signed, overdue };
  }, [workOrders]);

  // Existing order numbers for linking
  const existingOrderNumbers = useMemo(() => {
    const set = new Set<string>();
    for (const o of workOrders) {
      if (o.orderNumber && !o.orderNumber.startsWith("ON-UNSCH")) {
        set.add(o.orderNumber);
      }
    }
    return Array.from(set).sort();
  }, [workOrders]);

  const now = new Date();
  const dateStr = `${now.getDate()} ${BG_MONTHS[now.getMonth()]} ${now.getFullYear()}`;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="flex h-14 items-center gap-4 px-6">
          <Link href="/planning">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              Planning
            </Button>
          </Link>
          <div className="h-6 w-px bg-border" />
          <h1 className="text-lg font-semibold">Admin Dashboard</h1>
          <span className="text-sm text-muted-foreground">{dateStr}</span>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/admin/job-cards">
              <Button variant="default" size="sm" className="gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                Job Cards DB
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" size="sm" className="bg-transparent">
                Work Card
              </Button>
            </Link>
            <Link href="/tablet">
              <Button variant="outline" size="sm" className="bg-transparent">
                Tablet
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="border-b border-border bg-secondary/30 px-6 py-3">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{stats.total}</span>
            <span className="text-xs text-muted-foreground">Total</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-emerald-500" />
            <span className="text-sm font-medium">{stats.active}</span>
            <span className="text-xs text-muted-foreground">Active</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{stats.signed}</span>
            <span className="text-xs text-muted-foreground">Signed</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span className="text-sm font-medium">{stats.overdue}</span>
            <span className="text-xs text-muted-foreground">Overdue</span>
          </div>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="border-b border-border bg-card px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by JC #, Order #, client, machine..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Button
            variant={showFilters ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFilters((v) => !v)}
            className={cn(!showFilters && "bg-transparent", "gap-1.5")}
          >
            <Filter className="h-3.5 w-3.5" />
            Filters
            {(filterStatus !== "all" || filterTech !== "all" || filterType !== "all") && (
              <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                {[filterStatus !== "all", filterTech !== "all", filterType !== "all"].filter(Boolean).length}
              </span>
            )}
          </Button>
          {(filterStatus !== "all" || filterTech !== "all" || filterType !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilterStatus("all");
                setFilterTech("all");
                setFilterType("all");
              }}
              className="gap-1 text-xs text-muted-foreground"
            >
              <X className="h-3 w-3" />
              Clear
            </Button>
          )}
          <span className="ml-auto text-xs text-muted-foreground">
            {filteredOrders.length} of {workOrders.length} records
          </span>
        </div>
        {showFilters && (
          <div className="mt-3 flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-8 w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Signed">Signed</SelectItem>
                  <SelectItem value="Overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Technician</Label>
              <Select value={filterTech} onValueChange={setFilterTech}>
                <SelectTrigger className="h-8 w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Technicians</SelectItem>
                  {technicians.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Type</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="h-8 w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="service">Service</SelectItem>
                  <SelectItem value="repair">Repair</SelectItem>
                  <SelectItem value="inspection">Inspection</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <main className="flex-1 overflow-auto">
        <ScrollArea className="h-[calc(100vh-14rem)]">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-28 text-xs">Job Card #</TableHead>
                <TableHead className="w-32 text-xs">Order #</TableHead>
                <TableHead className="w-20 text-xs">Type</TableHead>
                <TableHead className="text-xs">Machine Owner</TableHead>
                <TableHead className="text-xs">Machine</TableHead>
                <TableHead className="text-xs">Technician</TableHead>
                <TableHead className="w-20 text-xs text-right">Planned</TableHead>
                <TableHead className="w-20 text-xs text-right">Actual</TableHead>
                <TableHead className="w-24 text-xs">Status</TableHead>
                <TableHead className="w-20 text-xs text-center">Signed</TableHead>
                <TableHead className="w-16 text-xs" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="h-32 text-center text-muted-foreground">
                    No job cards match the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => {
                  const isOverHours = order.actualHours > order.plannedHours && order.plannedHours > 0;
                  return (
                    <TableRow key={order.id} className="group">
                      <TableCell className="font-mono text-xs font-medium">{order.id}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs">{order.orderNumber}</span>
                          <Popover>
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                                title="Link to Order"
                              >
                                <Link2 className="h-3.5 w-3.5" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 p-3" align="start">
                              <p className="text-xs font-medium mb-2">Link to existing Order #</p>
                              <div className="space-y-2">
                                {existingOrderNumbers.slice(0, 8).map((on) => (
                                  <button
                                    key={on}
                                    type="button"
                                    className={cn(
                                      "flex w-full items-center rounded-md px-2 py-1.5 text-xs hover:bg-secondary transition-colors",
                                      order.orderNumber === on && "bg-secondary font-medium"
                                    )}
                                    onClick={() => {
                                      linkOrderToJobCard(order.id, on);
                                    }}
                                  >
                                    <span className="font-mono">{on}</span>
                                    {order.orderNumber === on && (
                                      <CheckCircle2 className="ml-auto h-3 w-3 text-emerald-500" />
                                    )}
                                  </button>
                                ))}
                                <div className="flex gap-1.5 pt-1 border-t border-border">
                                  <Input
                                    placeholder="New ON-..."
                                    className="h-7 text-xs"
                                    value={linkingJC?.id === order.id ? linkOrderInput : ""}
                                    onFocus={() => {
                                      setLinkingJC(order);
                                      setLinkOrderInput("");
                                    }}
                                    onChange={(e) => setLinkOrderInput(e.target.value)}
                                  />
                                  <Button
                                    size="sm"
                                    className="h-7 px-2 text-xs"
                                    disabled={!linkOrderInput.trim()}
                                    onClick={() => {
                                      if (linkOrderInput.trim()) {
                                        linkOrderToJobCard(order.id, linkOrderInput.trim());
                                        setLinkingJC(null);
                                        setLinkOrderInput("");
                                      }
                                    }}
                                  >
                                    Link
                                  </Button>
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px] capitalize">
                          {order.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{order.machineOwner}</TableCell>
                      <TableCell className="text-xs font-mono">{order.machine}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs">{order.technicianName}</span>
                          {order.technicianIds.length > 1 && (
                            <Badge variant="secondary" className="text-[9px]">
                              +{order.technicianIds.length - 1}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono">
                        {order.plannedHours}h
                      </TableCell>
                      <TableCell className={cn("text-right text-xs font-mono", isOverHours && "text-red-500 font-medium")}>
                        {order.actualHours.toFixed(1)}h
                      </TableCell>
                      <TableCell>{statusBadge(order)}</TableCell>
                      <TableCell className="text-center">
                        {order.isSigned ? (
                          <CheckCircle2 className="mx-auto h-4 w-4 text-emerald-500" />
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => {
                            setEditingOrder(order);
                            setEditStatus(order.status);
                            setEditPlannedHours(String(order.plannedHours));
                          }}
                        >
                          <PenLine className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </main>

      {/* Edit Order Dialog */}
      <Dialog open={!!editingOrder} onOpenChange={() => setEditingOrder(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">
              Edit {editingOrder?.id}
            </DialogTitle>
          </DialogHeader>
          {editingOrder && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Order:</span>
                <span className="font-mono font-medium">{editingOrder.orderNumber}</span>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Signed">Signed</SelectItem>
                    <SelectItem value="Overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Planned Hours</Label>
                <Input
                  type="number"
                  value={editPlannedHours}
                  onChange={(e) => setEditPlannedHours(e.target.value)}
                  step="0.5"
                  className="h-9"
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setEditingOrder(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (editingOrder) {
                  updateWorkOrder(editingOrder.id, {
                    status: editStatus as WorkOrder["status"],
                    plannedHours: Number(editPlannedHours) || editingOrder.plannedHours,
                    isSigned: editStatus === "Signed" ? true : editingOrder.isSigned,
                  });
                  setEditingOrder(null);
                }
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
