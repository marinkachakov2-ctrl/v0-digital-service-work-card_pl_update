"use client";

import { useState, useMemo } from "react";
import {
  Search,
  Filter,
  Link2,
  FileText,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  PenLine,
  X,
  Wrench,
  PlayCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
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

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Work In Progress</h1>
          <p className="text-sm text-muted-foreground">
            Track active job cards and technician assignments
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Jobs</p>
                <p className="text-3xl font-bold text-foreground mt-1">{stats.total}</p>
                <p className="text-xs text-muted-foreground mt-1">All work orders</p>
              </div>
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-3xl font-bold text-emerald-500 mt-1">{stats.active}</p>
                <p className="text-xs text-muted-foreground mt-1">Currently in progress</p>
              </div>
              <PlayCircle className="h-5 w-5 text-emerald-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Signed</p>
                <p className="text-3xl font-bold text-foreground mt-1">{stats.signed}</p>
                <p className="text-xs text-muted-foreground mt-1">Completed & signed</p>
              </div>
              <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-3xl font-bold text-red-500 mt-1">{stats.overdue}</p>
                <p className="text-xs text-muted-foreground mt-1">Requires attention</p>
              </div>
              <AlertCircle className="h-5 w-5 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search + Filters */}
      <Card className="border-border bg-card">
        <CardContent className="p-4">
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
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-border bg-card overflow-hidden">
        <ScrollArea className="h-[calc(100vh-26rem)]">
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
      </Card>

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

// Remove unused BG_MONTHS constant
