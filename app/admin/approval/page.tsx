"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  TrendingUp,
  Eye,
  Check,
  X,
  Wrench,
  ChevronDown,
  ChevronRight,
  FileText,
  Loader2,
  Ban,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProposalWithDetails {
  id: string;
  job_card_id: string;
  check_item_id: string | null;
  description: string;
  part_number: string | null;
  quantity: number;
  unit_price: number;
  labor_hours: number | null;
  status: "pending" | "approved" | "rejected" | "postponed";
  admin_notes: string | null;
  created_at: string;
  // Joined data
  job_card?: {
    order_no: string;
    created_at: string;
    machine?: {
      model: string;
      serial_number: string;
      brand: string;
    };
    payer?: {
      name: string;
      credit_limit: number;
      current_balance: number;
      is_blocked: boolean;
    };
    technician?: {
      name: string;
    };
  };
  check_item?: {
    control_point_name: string;
    comments: string;
  };
}

interface GroupedProposal {
  date: string;
  customerName: string;
  technicianName: string;
  orderNo: string;
  machineModel: string;
  machineSerial: string;
  creditStatus: "ok" | "warning" | "exceeded" | "blocked";
  creditLimit: number;
  currentBalance: number;
  checkItemName: string;
  checkItemComments: string;
  itemCount: number;
  subtotal: number;
  proposals: ProposalWithDetails[];
}

export default function ProposalsQueuePage() {
  const [proposals, setProposals] = useState<ProposalWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedProposal, setSelectedProposal] = useState<ProposalWithDetails | null>(null);
  const [actionDialog, setActionDialog] = useState<{
    type: "approve" | "reject" | "postpone";
    proposal: ProposalWithDetails;
  } | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchProposals();
  }, []);

  const fetchProposals = async () => {
    setLoading(true);
    try {
      // Fetch proposals with related data
      const { data, error } = await supabase
        .from("job_card_proposals")
        .select(`
          *,
          job_card:job_cards (
            order_no,
            created_at,
            machine:machines (
              model,
              serial_number,
              brand
            ),
            payer:clients!job_cards_payer_id_fkey (
              name,
              credit_limit,
              current_balance,
              is_blocked
            ),
            technician:technicians (
              name
            )
          ),
          check_item:free_check_results (
            control_point_name,
            comments
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProposals(data || []);
    } catch (err) {
      console.error("[v0] Error fetching proposals:", err);
    } finally {
      setLoading(false);
    }
  };

  // Group proposals by check item for display
  const groupedProposals = useMemo(() => {
    const groups: Record<string, GroupedProposal> = {};

    for (const proposal of proposals) {
      const key = `${proposal.job_card_id}-${proposal.check_item_id || "no-check"}`;
      
      if (!groups[key]) {
        const creditLimit = proposal.job_card?.payer?.credit_limit || 0;
        const currentBalance = proposal.job_card?.payer?.current_balance || 0;
        const isBlocked = proposal.job_card?.payer?.is_blocked || false;
        
        let creditStatus: GroupedProposal["creditStatus"] = "ok";
        if (isBlocked) {
          creditStatus = "blocked";
        } else if (currentBalance > creditLimit) {
          creditStatus = "exceeded";
        } else if (currentBalance > creditLimit * 0.8) {
          creditStatus = "warning";
        }

        groups[key] = {
          date: proposal.created_at.split("T")[0],
          customerName: proposal.job_card?.payer?.name || "Unknown",
          technicianName: proposal.job_card?.technician?.name || "Unknown",
          orderNo: proposal.job_card?.order_no || "N/A",
          machineModel: `${proposal.job_card?.machine?.brand || ""} ${proposal.job_card?.machine?.model || ""}`.trim() || "Unknown",
          machineSerial: proposal.job_card?.machine?.serial_number || "N/A",
          creditStatus,
          creditLimit,
          currentBalance,
          checkItemName: proposal.check_item?.control_point_name || proposal.description,
          checkItemComments: proposal.check_item?.comments || "",
          itemCount: 0,
          subtotal: 0,
          proposals: [],
        };
      }

      groups[key].proposals.push(proposal);
      groups[key].itemCount = groups[key].proposals.filter(p => p.status === "pending").length;
      groups[key].subtotal = groups[key].proposals
        .filter(p => p.status === "pending")
        .reduce((sum, p) => sum + (p.quantity * p.unit_price), 0);
    }

    return Object.values(groups).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [proposals]);

  // Stats
  const stats = useMemo(() => {
    const pending = proposals.filter(p => p.status === "pending").length;
    const approvedToday = proposals.filter(p => {
      const today = new Date().toISOString().split("T")[0];
      return p.status === "approved" && p.created_at.startsWith(today);
    }).length;
    const postponed = proposals.filter(p => p.status === "postponed").length;
    const approvedValue = proposals
      .filter(p => p.status === "approved")
      .reduce((sum, p) => sum + (p.quantity * p.unit_price), 0);

    return { pending, approvedToday, postponed, approvedValue };
  }, [proposals]);

  const toggleRow = (key: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleAction = async (type: "approve" | "reject" | "postpone", proposal: ProposalWithDetails) => {
    setIsSubmitting(true);
    try {
      const statusMap = {
        approve: "approved",
        reject: "rejected",
        postpone: "postponed",
      };

      const { error } = await supabase
        .from("job_card_proposals")
        .update({
          status: statusMap[type],
          admin_notes: adminNotes || null,
        })
        .eq("id", proposal.id);

      if (error) throw error;

      // Refresh data
      await fetchProposals();
      setActionDialog(null);
      setAdminNotes("");
    } catch (err) {
      console.error("[v0] Error updating proposal:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCreditBadge = (status: GroupedProposal["creditStatus"], limit: number, balance: number) => {
    if (status === "blocked") {
      return (
        <Badge className="bg-red-600 text-white border-0 text-[10px]">
          <Ban className="h-3 w-3 mr-1" />
          Blocked
        </Badge>
      );
    }
    if (status === "exceeded") {
      return (
        <Badge className="bg-red-500/20 text-red-400 border border-red-500/30 text-[10px]">
          Limit Exceeded (R{(balance - limit).toLocaleString()})
        </Badge>
      );
    }
    if (status === "warning") {
      return (
        <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px]">
          Credit Warning
        </Badge>
      );
    }
    return (
      <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px]">
        Credit OK
      </Badge>
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toISOString().split("T")[0];
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-3rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Proposals Queue</h1>
          <p className="text-sm text-muted-foreground">
            Review and approve repair proposals from technicians
          </p>
        </div>
        <div className="flex items-center gap-3">
          {stats.pending > 0 && (
            <Badge className="bg-red-600 text-white border-0 px-3 py-1 text-sm">
              {stats.pending} Pending
            </Badge>
          )}
          <Button variant="outline" className="gap-2 bg-transparent border-primary text-primary hover:bg-primary/10">
            <FileText className="h-4 w-4" />
            Generate PDF Quote
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Review</p>
                <p className="text-3xl font-bold text-foreground mt-1">{stats.pending}</p>
                <p className="text-xs text-muted-foreground mt-1">Awaiting admin action</p>
              </div>
              <ClipboardList className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Approved Today</p>
                <p className="text-3xl font-bold text-emerald-500 mt-1">{stats.approvedToday}</p>
                <p className="text-xs text-muted-foreground mt-1">Sent for quotation</p>
              </div>
              <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Postponed</p>
                <p className="text-3xl font-bold text-amber-500 mt-1">{stats.postponed}</p>
                <p className="text-xs text-muted-foreground mt-1">Deferred to history</p>
              </div>
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Approved Value</p>
                <p className="text-3xl font-bold text-foreground mt-1">
                  R {stats.approvedValue.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Today's quote value</p>
              </div>
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Repair Proposals Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Wrench className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Repair Proposals</h2>
          <span className="text-sm text-muted-foreground">
            Items marked as 'Repair' during technician inspections
          </span>
        </div>

        <Card className="border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/30 hover:bg-secondary/30 border-b border-border">
                <TableHead className="w-10"></TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">Date</TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">Customer / Technician</TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">Machine</TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">Item Description</TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium text-center">Subtotal</TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupedProposals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    No repair proposals found
                  </TableCell>
                </TableRow>
              ) : (
                groupedProposals.map((group, idx) => {
                  const key = `${group.orderNo}-${idx}`;
                  const isExpanded = expandedRows.has(key);
                  const pendingItems = group.proposals.filter(p => p.status === "pending");

                  return (
                    <React.Fragment key={key}>
                      <TableRow
                        className={cn(
                          "cursor-pointer transition-colors hover:bg-secondary/50",
                          isExpanded && "bg-secondary/30"
                        )}
                        onClick={() => toggleRow(key)}
                      >
                        <TableCell className="w-10">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-foreground">
                          {formatDate(group.date)}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-foreground">
                                {group.customerName}
                              </span>
                              {getCreditBadge(group.creditStatus, group.creditLimit, group.currentBalance)}
                            </div>
                            <p className="text-xs text-muted-foreground font-mono">
                              {group.orderNo}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm text-foreground">{group.machineModel}</p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {group.machineSerial}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {group.checkItemName}
                            </p>
                            {group.checkItemComments && (
                              <p className="text-xs text-muted-foreground truncate max-w-xs">
                                {group.checkItemComments}
                              </p>
                            )}
                          </div>
                          {pendingItems.length > 0 && (
                            <Badge variant="outline" className="mt-1 text-[10px]">
                              {pendingItems.length} items
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center text-sm font-mono">
                          {group.subtotal > 0 ? `R ${group.subtotal.toLocaleString()}` : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => setSelectedProposal(pendingItems[0])}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                              disabled={pendingItems.length === 0}
                              onClick={() => pendingItems[0] && setActionDialog({ type: "approve", proposal: pendingItems[0] })}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                              disabled={pendingItems.length === 0}
                              onClick={() => pendingItems[0] && setActionDialog({ type: "reject", proposal: pendingItems[0] })}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Expanded Row - Show individual items */}
                      {isExpanded && group.proposals.length > 0 && (
                        <TableRow className="bg-secondary/10 hover:bg-secondary/10">
                          <TableCell colSpan={7} className="p-0">
                            <div className="px-8 py-3 border-t border-border">
                              <Table>
                                <TableHeader>
                                  <TableRow className="hover:bg-transparent">
                                    <TableHead className="text-[10px] text-muted-foreground w-32">Part Number</TableHead>
                                    <TableHead className="text-[10px] text-muted-foreground">Description</TableHead>
                                    <TableHead className="text-[10px] text-muted-foreground w-16 text-center">Qty</TableHead>
                                    <TableHead className="text-[10px] text-muted-foreground w-24 text-right">Unit Price</TableHead>
                                    <TableHead className="text-[10px] text-muted-foreground w-24 text-right">Total</TableHead>
                                    <TableHead className="text-[10px] text-muted-foreground w-24 text-center">Status</TableHead>
                                    <TableHead className="text-[10px] text-muted-foreground w-28 text-center">Actions</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {group.proposals.map((item) => (
                                    <TableRow key={item.id} className="hover:bg-secondary/30">
                                      <TableCell className="text-xs font-mono text-muted-foreground">
                                        {item.part_number || "-"}
                                      </TableCell>
                                      <TableCell className="text-xs">{item.description}</TableCell>
                                      <TableCell className="text-xs text-center">{item.quantity}</TableCell>
                                      <TableCell className="text-xs text-right font-mono">
                                        R {item.unit_price.toLocaleString()}
                                      </TableCell>
                                      <TableCell className="text-xs text-right font-mono">
                                        R {(item.quantity * item.unit_price).toLocaleString()}
                                      </TableCell>
                                      <TableCell className="text-center">
                                        {item.status === "approved" && (
                                          <Badge className="bg-emerald-500/20 text-emerald-400 border-0 text-[10px]">
                                            Approved
                                          </Badge>
                                        )}
                                        {item.status === "rejected" && (
                                          <Badge className="bg-red-500/20 text-red-400 border-0 text-[10px]">
                                            Rejected
                                          </Badge>
                                        )}
                                        {item.status === "postponed" && (
                                          <Badge className="bg-amber-500/20 text-amber-400 border-0 text-[10px]">
                                            Postponed
                                          </Badge>
                                        )}
                                        {item.status === "pending" && (
                                          <Badge className="bg-secondary text-muted-foreground border-0 text-[10px]">
                                            Pending
                                          </Badge>
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex items-center justify-center gap-1">
                                          {item.status === "pending" && (
                                            <>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                                                onClick={() => setActionDialog({ type: "approve", proposal: item })}
                                              >
                                                <Check className="h-3 w-3" />
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                                                onClick={() => setActionDialog({ type: "reject", proposal: item })}
                                              >
                                                <X className="h-3 w-3" />
                                              </Button>
                                            </>
                                          )}
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Action Dialog */}
      <Dialog open={!!actionDialog} onOpenChange={() => setActionDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {actionDialog?.type === "approve" && "Approve Proposal"}
              {actionDialog?.type === "reject" && "Reject Proposal"}
              {actionDialog?.type === "postpone" && "Postpone Proposal"}
            </DialogTitle>
            <DialogDescription>
              {actionDialog?.proposal.description}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Quantity</p>
                <p className="font-medium">{actionDialog?.proposal.quantity}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Value</p>
                <p className="font-medium font-mono">
                  R {((actionDialog?.proposal.quantity || 0) * (actionDialog?.proposal.unit_price || 0)).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Admin Notes (Optional)</Label>
              <Textarea
                placeholder="Add notes for this decision..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActionDialog(null)}
              className="bg-transparent"
            >
              Cancel
            </Button>
            <Button
              onClick={() => actionDialog && handleAction(actionDialog.type, actionDialog.proposal)}
              disabled={isSubmitting}
              className={cn(
                actionDialog?.type === "approve" && "bg-emerald-600 hover:bg-emerald-700",
                actionDialog?.type === "reject" && "bg-red-600 hover:bg-red-700",
                actionDialog?.type === "postpone" && "bg-amber-600 hover:bg-amber-700"
              )}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {actionDialog?.type === "approve" && "Approve"}
              {actionDialog?.type === "reject" && "Reject"}
              {actionDialog?.type === "postpone" && "Postpone"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
