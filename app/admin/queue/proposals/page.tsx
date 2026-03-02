"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ClipboardList,
  FileStack,
  Archive,
  TrendingUp,
  Loader2,
  CheckCircle2,
  Clock,
  Tractor,
  Search,
  RefreshCw,
  Menu,
  X,
  Lock,
  Save,
  UserCheck,
  Wrench,
  Package,
  DollarSign,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// Sidebar navigation items
const navItems = [
  { id: "pending", label: "Pending Cards", icon: ClipboardList, href: "/admin/queue" },
  { id: "proposals", label: "Proposals Queue", icon: FileStack, href: "/admin/queue/proposals", active: true },
  { id: "archived", label: "Archived Reports", icon: Archive, href: "/admin/queue/archived" },
];

const ADMIN_PIN = "1234";

// Proposal interface
interface Proposal {
  id: string;
  job_card_id: string;
  description: string;
  part_number: string | null;
  unit_price: number | null;
  labor_hours: number | null;
  quantity: number;
  status: "pending_review" | "approved" | "rejected";
  admin_notes: string | null;
  created_at: string;
  // Joined data
  machine_serial?: string;
  machine_model?: string;
  technician_name?: string;
}

// Grouped proposals by machine
interface MachineGroup {
  serialNumber: string;
  model: string;
  proposals: Proposal[];
}

export default function ProposalsQueuePage() {
  const [mounted, setMounted] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);

  // Data state
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Mobile sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Editing state - track changes per proposal
  const [editedProposals, setEditedProposals] = useState<Record<string, Partial<Proposal>>>({});
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [approvingIds, setApprovingIds] = useState<Set<string>>(new Set());

  // Expanded groups
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

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

  // Fetch proposals
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const supabase = createClient();

    // Fetch proposals with job card and machine data
    const { data, error } = await supabase
      .from("job_card_proposals")
      .select(`
        id,
        job_card_id,
        description,
        part_number,
        unit_price,
        labor_hours,
        quantity,
        status,
        admin_notes,
        created_at,
        job_cards (
          id,
          machines (
            serial_number,
            model,
            brand
          ),
          technicians (
            name
          )
        )
      `)
      .eq("status", "pending_review")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching proposals:", error);
      toast.error("Грешка при зареждане", {
        description: "Не могат да се заредят предложенията.",
      });
      setIsLoading(false);
      return;
    }

    // Transform data
    const transformedProposals: Proposal[] = (data || []).map((p) => {
      const jobCard = p.job_cards as { machines?: { serial_number?: string; model?: string; brand?: string }; technicians?: { name?: string } } | null;
      return {
        id: p.id,
        job_card_id: p.job_card_id,
        description: p.description || "",
        part_number: p.part_number,
        unit_price: p.unit_price,
        labor_hours: p.labor_hours,
        quantity: p.quantity || 1,
        status: p.status as Proposal["status"],
        admin_notes: p.admin_notes,
        created_at: p.created_at,
        machine_serial: jobCard?.machines?.serial_number || "Unknown",
        machine_model: jobCard?.machines?.brand && jobCard?.machines?.model 
          ? `${jobCard.machines.brand} ${jobCard.machines.model}` 
          : "Unknown",
        technician_name: jobCard?.technicians?.name || "Unknown",
      };
    });

    setProposals(transformedProposals);
    
    // Auto-expand all groups
    const serials = new Set(transformedProposals.map(p => p.machine_serial || "Unknown"));
    setExpandedGroups(serials);
    
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

  // Group proposals by machine serial
  const groupedProposals: MachineGroup[] = (() => {
    const groups: Record<string, MachineGroup> = {};
    
    const filtered = proposals.filter(p => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        p.machine_serial?.toLowerCase().includes(query) ||
        p.machine_model?.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        p.technician_name?.toLowerCase().includes(query)
      );
    });

    filtered.forEach(p => {
      const key = p.machine_serial || "Unknown";
      if (!groups[key]) {
        groups[key] = {
          serialNumber: key,
          model: p.machine_model || "Unknown",
          proposals: [],
        };
      }
      groups[key].proposals.push(p);
    });

    return Object.values(groups);
  })();

  // Calculate total estimated revenue
  const totalRevenue = proposals.reduce((sum, p) => {
    const edited = editedProposals[p.id];
    const unitPrice = edited?.unit_price ?? p.unit_price ?? 0;
    const laborHours = edited?.labor_hours ?? p.labor_hours ?? 0;
    const qty = p.quantity || 1;
    const laborRate = 50; // BGN per hour
    return sum + (unitPrice * qty) + (laborHours * laborRate);
  }, 0);

  // Handle field change
  const handleFieldChange = (proposalId: string, field: keyof Proposal, value: string | number | null) => {
    setEditedProposals(prev => ({
      ...prev,
      [proposalId]: {
        ...prev[proposalId],
        [field]: value,
      },
    }));
  };

  // Save changes
  const handleSaveChanges = async (proposalId: string) => {
    const edited = editedProposals[proposalId];
    if (!edited) {
      toast.info("Няма промени за запазване");
      return;
    }

    setSavingIds(prev => new Set(prev).add(proposalId));
    const supabase = createClient();

    const { error } = await supabase
      .from("job_card_proposals")
      .update({
        part_number: edited.part_number,
        unit_price: edited.unit_price,
        labor_hours: edited.labor_hours,
      })
      .eq("id", proposalId);

    if (error) {
      console.error("Error saving proposal:", error);
      toast.error("Грешка при запазване", {
        description: "Промените не могат да бъдат запазени.",
      });
    } else {
      toast.success("Промените са запазени", {
        description: "Данните са успешно актуализирани.",
      });
      // Update local state
      setProposals(prev => prev.map(p => 
        p.id === proposalId 
          ? { ...p, ...edited }
          : p
      ));
      // Clear edited state for this proposal
      setEditedProposals(prev => {
        const newState = { ...prev };
        delete newState[proposalId];
        return newState;
      });
    }

    setSavingIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(proposalId);
      return newSet;
    });
  };

  // Mark as approved by client
  const handleApprove = async (proposalId: string) => {
    setApprovingIds(prev => new Set(prev).add(proposalId));
    const supabase = createClient();

    const { error } = await supabase
      .from("job_card_proposals")
      .update({
        status: "approved",
      })
      .eq("id", proposalId);

    if (error) {
      console.error("Error approving proposal:", error);
      toast.error("Грешка при одобрение", {
        description: "Статусът не може да бъде променен.",
      });
    } else {
      toast.success("Одобрено от клиент", {
        description: "Предложението е маркирано като одобрено.",
      });
      // Remove from list
      setProposals(prev => prev.filter(p => p.id !== proposalId));
    }

    setApprovingIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(proposalId);
      return newSet;
    });
  };

  // Toggle group expansion
  const toggleGroup = (serial: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(serial)) {
        newSet.delete(serial);
      } else {
        newSet.add(serial);
      }
      return newSet;
    });
  };

  if (!mounted) return null;

  // PIN Dialog
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-sm border-border bg-card">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center mb-4">
              <Lock className="h-6 w-6 text-yellow-500" />
            </div>
            <CardTitle>Административен достъп</CardTitle>
            <CardDescription>Въведете PIN код за достъп</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="PIN код"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handlePinSubmit()}
                maxLength={4}
                className={`text-center text-2xl tracking-widest ${pinError ? "border-red-500" : ""}`}
              />
              {pinError && (
                <p className="text-xs text-red-500 text-center">Грешен PIN код</p>
              )}
            </div>
            <Button onClick={handlePinSubmit} className="w-full bg-primary">
              Вход
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 border-r border-border bg-card flex flex-col
        transform transition-transform duration-200 ease-in-out
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        {/* Logo */}
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center">
              <Tractor className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <h1 className="font-bold text-foreground">Megatron</h1>
              <p className="text-xs text-muted-foreground">Digital Service</p>
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

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link key={item.id} href={item.href}>
              <div
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  item.active
                    ? "bg-yellow-500/10 text-yellow-500 border border-yellow-500/30"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                <span className="text-sm font-medium">{item.label}</span>
                {item.id === "proposals" && proposals.length > 0 && (
                  <Badge className="ml-auto bg-yellow-500/20 text-yellow-500 border-yellow-500/30 text-xs">
                    {proposals.length}
                  </Badge>
                )}
              </div>
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <Link href="/admin">
            <Button variant="outline" className="w-full text-sm">
              Back to Admin Home
            </Button>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 lg:px-6 shrink-0">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Service Proposals Management</h2>
              <p className="text-xs text-muted-foreground">Pending Admin Review</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={isLoading}
              className="gap-1.5"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 p-4 lg:p-6 overflow-auto">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Total Estimated Revenue Card */}
            <Card className="border-border bg-gradient-to-r from-emerald-500/10 to-primary/10 border-emerald-500/30">
              <CardContent className="py-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                      <TrendingUp className="h-7 w-7 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Estimated Revenue</p>
                      <p className="text-3xl font-bold text-foreground">
                        {totalRevenue.toLocaleString("bg-BG", { minimumFractionDigits: 2 })} <span className="text-lg font-normal text-muted-foreground">BGN</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right hidden sm:block">
                    <p className="text-sm text-muted-foreground">Pending Proposals</p>
                    <p className="text-2xl font-semibold text-foreground">{proposals.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by serial number, model, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-card"
              />
            </div>

            {/* Loading State */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : groupedProposals.length === 0 ? (
              <Card className="border-border bg-card">
                <CardContent className="py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-secondary mx-auto flex items-center justify-center mb-4">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">No Pending Proposals</h3>
                  <p className="text-sm text-muted-foreground">All proposals have been reviewed.</p>
                </CardContent>
              </Card>
            ) : (
              /* Grouped Proposal Cards */
              <div className="space-y-4">
                {groupedProposals.map((group) => (
                  <Card key={group.serialNumber} className="border-border bg-card overflow-hidden">
                    {/* Group Header */}
                    <button
                      onClick={() => toggleGroup(group.serialNumber)}
                      className="w-full px-6 py-4 border-b border-border bg-secondary/30 flex items-center justify-between hover:bg-secondary/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center">
                          <Tractor className="h-5 w-5 text-yellow-500" />
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-foreground">{group.model}</p>
                          <p className="text-sm text-muted-foreground font-mono">SN: {group.serialNumber}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className="bg-yellow-500/15 text-yellow-500 border-yellow-500/30">
                          {group.proposals.length} Proposal{group.proposals.length !== 1 ? "s" : ""}
                        </Badge>
                        {expandedGroups.has(group.serialNumber) ? (
                          <ChevronUp className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </button>

                    {/* Proposals List */}
                    {expandedGroups.has(group.serialNumber) && (
                      <div className="divide-y divide-border">
                        {group.proposals.map((proposal) => {
                          const edited = editedProposals[proposal.id] || {};
                          const hasChanges = Object.keys(edited).length > 0;
                          const isSaving = savingIds.has(proposal.id);
                          const isApproving = approvingIds.has(proposal.id);

                          return (
                            <div key={proposal.id} className="p-6 space-y-4">
                              {/* Header Row */}
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/30">
                                      <Clock className="h-3 w-3 mr-1" />
                                      Pending Admin Review
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      by {proposal.technician_name}
                                    </span>
                                  </div>
                                  <div className="flex items-start gap-2">
                                    <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                                    <p className="text-sm text-foreground">{proposal.description}</p>
                                  </div>
                                </div>
                                <div className="text-right text-xs text-muted-foreground">
                                  {new Date(proposal.created_at).toLocaleDateString("bg-BG")}
                                </div>
                              </div>

                              {/* Editable Fields */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Package className="h-3 w-3" />
                                    Part Number
                                  </Label>
                                  <Input
                                    placeholder="Enter part number"
                                    value={edited.part_number ?? proposal.part_number ?? ""}
                                    onChange={(e) => handleFieldChange(proposal.id, "part_number", e.target.value || null)}
                                    className="bg-secondary/50"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                    <DollarSign className="h-3 w-3" />
                                    Unit Price (BGN)
                                  </Label>
                                  <Input
                                    type="number"
                                    placeholder="0.00"
                                    step="0.01"
                                    min="0"
                                    value={edited.unit_price ?? proposal.unit_price ?? ""}
                                    onChange={(e) => handleFieldChange(proposal.id, "unit_price", e.target.value ? parseFloat(e.target.value) : null)}
                                    className="bg-secondary/50"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Wrench className="h-3 w-3" />
                                    Labor Hours
                                  </Label>
                                  <Input
                                    type="number"
                                    placeholder="0"
                                    step="0.5"
                                    min="0"
                                    value={edited.labor_hours ?? proposal.labor_hours ?? ""}
                                    onChange={(e) => handleFieldChange(proposal.id, "labor_hours", e.target.value ? parseFloat(e.target.value) : null)}
                                    className="bg-secondary/50"
                                  />
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex items-center justify-between pt-2">
                                <div className="text-sm text-muted-foreground">
                                  Est. Total: <span className="font-semibold text-foreground">
                                    {(
                                      ((edited.unit_price ?? proposal.unit_price ?? 0) * (proposal.quantity || 1)) +
                                      ((edited.labor_hours ?? proposal.labor_hours ?? 0) * 50)
                                    ).toLocaleString("bg-BG", { minimumFractionDigits: 2 })} BGN
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleSaveChanges(proposal.id)}
                                    disabled={!hasChanges || isSaving}
                                    className="gap-1.5"
                                  >
                                    {isSaving ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Save className="h-4 w-4" />
                                    )}
                                    Save Changes
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => handleApprove(proposal.id)}
                                    disabled={isApproving}
                                    className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                                  >
                                    {isApproving ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <UserCheck className="h-4 w-4" />
                                    )}
                                    Mark as Approved by Client
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
