"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Tractor,
  FileText,
  ArrowLeft,
  Building2,
  Hash,
  Wrench,
  Package,
  StickyNote,
  Send,
  Loader2,
  Check,
  X,
  DollarSign,
} from "lucide-react";

// Sidebar navigation items
const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "/admin" },
  { id: "pending", label: "Pending Jobs (TEMP)", icon: ClipboardList, href: "/admin/pending" },
  { id: "approval", label: "Financial Approval", icon: CreditCard, href: "/admin/approval", active: true },
  { id: "history", label: "Machine History", icon: History, href: "/admin/history" },
];

// Demo proposal data
interface ProposalItem {
  id: string;
  type: "part" | "labor";
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  status: "pending" | "approved" | "rejected" | "postponed";
}

interface Proposal {
  id: string;
  jobCardId: string;
  customerName: string;
  customerId: string;
  machineSerial: string;
  machineModel: string;
  technicianName: string;
  createdAt: string;
  creditLimit: number;
  currentBalance: number;
  items: ProposalItem[];
  adminRemarks: string;
}

// Demo data
const demoProposal: Proposal = {
  id: "PROP-2026-0042",
  jobCardId: "JC-2026-0302-4521",
  customerName: "Agro Trade Ltd",
  customerId: "CLT-00142",
  machineSerial: "SN-JD6130M-2024",
  machineModel: "John Deere 6130M",
  technicianName: "Иван Петров",
  createdAt: "2026-03-02T14:30:00Z",
  creditLimit: 50000,
  currentBalance: 45000,
  items: [
    { id: "1", type: "part", description: "Маслен филтър RE509672", quantity: 2, unitPrice: 45.50, total: 91.00, status: "pending" },
    { id: "2", type: "part", description: "Въздушен филтър AL172780", quantity: 1, unitPrice: 120.00, total: 120.00, status: "pending" },
    { id: "3", type: "part", description: "Хидравлично масло Hy-Gard 20L", quantity: 2, unitPrice: 185.00, total: 370.00, status: "pending" },
    { id: "4", type: "labor", description: "Диагностика на двигател", quantity: 1, unitPrice: 80.00, total: 80.00, status: "pending" },
    { id: "5", type: "labor", description: "Смяна на филтри и масло", quantity: 2, unitPrice: 60.00, total: 120.00, status: "pending" },
    { id: "6", type: "part", description: "Ремък на вентилатор RE68336", quantity: 1, unitPrice: 95.00, total: 95.00, status: "pending" },
    { id: "7", type: "labor", description: "Регулировка на съединител", quantity: 1, unitPrice: 150.00, total: 150.00, status: "pending" },
  ],
  adminRemarks: "",
};

export default function ProposalApprovalPage() {
  const [proposal, setProposal] = useState<Proposal>(demoProposal);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [adminRemarks, setAdminRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [bulkActionDialog, setBulkActionDialog] = useState<"approve" | "reject" | "postpone" | null>(null);

  // Calculate totals
  const subtotal = proposal.items.reduce((sum, item) => sum + item.total, 0);
  const vatRate = 0.20;
  const vatAmount = subtotal * vatRate;
  const totalWithVat = subtotal + vatAmount;

  // Credit utilization
  const creditUtilization = (proposal.currentBalance / proposal.creditLimit) * 100;
  const projectedBalance = proposal.currentBalance + totalWithVat;
  const projectedUtilization = (projectedBalance / proposal.creditLimit) * 100;
  const isOverLimit = projectedBalance > proposal.creditLimit;
  const isWarning = creditUtilization >= 80;

  // Item counts by status
  const pendingCount = proposal.items.filter((i) => i.status === "pending").length;
  const approvedCount = proposal.items.filter((i) => i.status === "approved").length;
  const rejectedCount = proposal.items.filter((i) => i.status === "rejected").length;
  const postponedCount = proposal.items.filter((i) => i.status === "postponed").length;

  // Toggle item selection
  const toggleItemSelection = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  // Select all pending items
  const selectAllPending = () => {
    const pendingIds = proposal.items.filter((i) => i.status === "pending").map((i) => i.id);
    setSelectedItems(new Set(pendingIds));
  };

  // Update item status
  const updateItemStatus = (itemId: string, status: ProposalItem["status"]) => {
    setProposal((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === itemId ? { ...item, status } : item
      ),
    }));
  };

  // Bulk update selected items
  const bulkUpdateStatus = (status: ProposalItem["status"]) => {
    setProposal((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        selectedItems.has(item.id) ? { ...item, status } : item
      ),
    }));
    setSelectedItems(new Set());
    setBulkActionDialog(null);
  };

  // Submit final approval
  const handleSubmitApproval = async () => {
    setIsSubmitting(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsSubmitting(false);
    setSubmitSuccess(true);
  };

  // Get status badge
  const getStatusBadge = (status: ProposalItem["status"]) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30">Одобрено</Badge>;
      case "rejected":
        return <Badge className="bg-red-500/15 text-red-500 border-red-500/30">Отхвърлено</Badge>;
      case "postponed":
        return <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/30">Отложено</Badge>;
      default:
        return <Badge className="bg-secondary text-muted-foreground">Чакащо</Badge>;
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center">
              <Tractor className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <h1 className="font-bold text-foreground">Megatron</h1>
              <p className="text-xs text-muted-foreground">Digital Service</p>
            </div>
          </div>
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
              </div>
            </Link>
          ))}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
              <User className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">Администратор</p>
              <p className="text-xs text-muted-foreground">admin@megatron.bg</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="sm" className="gap-1.5">
                <ArrowLeft className="h-4 w-4" />
                Назад
              </Button>
            </Link>
            <div className="h-6 w-px bg-border" />
            <div>
              <h2 className="text-lg font-semibold text-foreground">Одобрение на оферта</h2>
              <p className="text-xs text-muted-foreground">Proposal #{proposal.id}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center text-white">
                3
              </span>
            </Button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Top Section: Customer Info & Machine */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Customer Info */}
              <Card className="border-border bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    Клиент
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-lg font-semibold text-foreground">{proposal.customerName}</p>
                    <p className="text-xs text-muted-foreground">ID: {proposal.customerId}</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-3.5 w-3.5" />
                    <span>Job Card: {proposal.jobCardId}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-3.5 w-3.5" />
                    <span>Техник: {proposal.technicianName}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Machine Info */}
              <Card className="border-border bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Tractor className="h-4 w-4 text-yellow-500" />
                    Машина
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-lg font-semibold text-foreground">{proposal.machineModel}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm font-mono text-muted-foreground">{proposal.machineSerial}</span>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Създадено: {new Date(proposal.createdAt).toLocaleDateString("bg-BG", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Credit Limit Card */}
              <Card className={`border-border bg-card ${isOverLimit ? "border-red-500/50" : isWarning ? "border-amber-500/50" : ""}`}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <CreditCard className={`h-4 w-4 ${isOverLimit ? "text-red-500" : isWarning ? "text-amber-500" : "text-emerald-500"}`} />
                    Кредитен лимит
                    {isOverLimit && (
                      <Badge className="bg-red-500/15 text-red-500 border-red-500/30 text-[10px]">
                        Надвишен
                      </Badge>
                    )}
                    {!isOverLimit && isWarning && (
                      <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/30 text-[10px]">
                        Внимание
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-xs text-muted-foreground">Текущ баланс</p>
                      <p className="text-2xl font-bold text-foreground">
                        {proposal.currentBalance.toLocaleString("bg-BG")} €
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Лимит</p>
                      <p className="text-lg font-semibold text-muted-foreground">
                        {proposal.creditLimit.toLocaleString("bg-BG")} €
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Използване: {creditUtilization.toFixed(0)}%</span>
                      <span className={isWarning ? "text-amber-500" : "text-muted-foreground"}>
                        Остават: {(proposal.creditLimit - proposal.currentBalance).toLocaleString("bg-BG")} €
                      </span>
                    </div>
                    <Progress 
                      value={creditUtilization} 
                      className={`h-2 ${isOverLimit ? "[&>div]:bg-red-500" : isWarning ? "[&>div]:bg-amber-500" : "[&>div]:bg-emerald-500"}`}
                    />
                  </div>
                  {isOverLimit && (
                    <Alert className="border-red-500/30 bg-red-500/5">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      <AlertDescription className="text-red-500 text-xs">
                        Прогнозен баланс ({projectedBalance.toLocaleString("bg-BG")} €) надвишава лимита!
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Items Table - Takes 3 columns */}
              <div className="lg:col-span-3 space-y-4">
                {/* Bulk Actions Bar */}
                <Card className="border-border bg-card">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={selectAllPending}
                          className="bg-transparent text-xs"
                        >
                          Избери всички чакащи ({pendingCount})
                        </Button>
                        {selectedItems.size > 0 && (
                          <span className="text-sm text-muted-foreground">
                            {selectedItems.size} избрани
                          </span>
                        )}
                      </div>
                      {selectedItems.size > 0 && (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                            onClick={() => setBulkActionDialog("approve")}
                          >
                            <Check className="h-3.5 w-3.5" />
                            Одобри
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-500/30 text-red-500 hover:bg-red-500/10 gap-1.5"
                            onClick={() => setBulkActionDialog("reject")}
                          >
                            <X className="h-3.5 w-3.5" />
                            Отхвърли
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-amber-500/30 text-amber-500 hover:bg-amber-500/10 gap-1.5"
                            onClick={() => setBulkActionDialog("postpone")}
                          >
                            <Clock className="h-3.5 w-3.5" />
                            Отложи
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Items Table */}
                <Card className="border-border bg-card overflow-hidden">
                  <CardHeader className="border-b border-border bg-secondary/30 py-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">Позиции в офертата</CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {approvedCount} одобрени
                        </Badge>
                        <Badge variant="outline" className="text-xs text-red-500 border-red-500/30">
                          {rejectedCount} отхвърлени
                        </Badge>
                        <Badge variant="outline" className="text-xs text-amber-500 border-amber-500/30">
                          {postponedCount} отложени
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-secondary/50 hover:bg-secondary/50">
                          <TableHead className="w-10"></TableHead>
                          <TableHead className="w-20">Тип</TableHead>
                          <TableHead>Описание</TableHead>
                          <TableHead className="text-right w-20">Кол.</TableHead>
                          <TableHead className="text-right w-28">Ед. цена</TableHead>
                          <TableHead className="text-right w-28">Общо</TableHead>
                          <TableHead className="w-28">Статус</TableHead>
                          <TableHead className="w-36 text-center">Действия</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {proposal.items.map((item) => (
                          <TableRow 
                            key={item.id}
                            className={`
                              ${item.status === "approved" ? "bg-emerald-500/5" : ""}
                              ${item.status === "rejected" ? "bg-red-500/5" : ""}
                              ${item.status === "postponed" ? "bg-amber-500/5" : ""}
                            `}
                          >
                            <TableCell>
                              <Checkbox
                                checked={selectedItems.has(item.id)}
                                onCheckedChange={() => toggleItemSelection(item.id)}
                                disabled={item.status !== "pending"}
                              />
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={
                                  item.type === "part"
                                    ? "border-blue-500/30 text-blue-500 bg-blue-500/10"
                                    : "border-purple-500/30 text-purple-500 bg-purple-500/10"
                                }
                              >
                                {item.type === "part" ? (
                                  <><Package className="h-3 w-3 mr-1" />Част</>
                                ) : (
                                  <><Wrench className="h-3 w-3 mr-1" />Труд</>
                                )}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">{item.description}</TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                            <TableCell className="text-right font-mono">
                              {item.unitPrice.toFixed(2)} €
                            </TableCell>
                            <TableCell className="text-right font-mono font-semibold">
                              {item.total.toFixed(2)} €
                            </TableCell>
                            <TableCell>{getStatusBadge(item.status)}</TableCell>
                            <TableCell>
                              {item.status === "pending" ? (
                                <div className="flex items-center gap-1 justify-center">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-emerald-500 hover:bg-emerald-500/10"
                                    onClick={() => updateItemStatus(item.id, "approved")}
                                  >
                                    <CheckCircle2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-red-500 hover:bg-red-500/10"
                                    onClick={() => updateItemStatus(item.id, "rejected")}
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-amber-500 hover:bg-amber-500/10"
                                    onClick={() => updateItemStatus(item.id, "postponed")}
                                  >
                                    <Clock className="h-4 w-4" />
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs text-muted-foreground"
                                  onClick={() => updateItemStatus(item.id, "pending")}
                                >
                                  Върни
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {/* Footer Summary */}
                    <div className="border-t border-border bg-secondary/30 p-4">
                      <div className="flex justify-end">
                        <div className="w-72 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Сума без ДДС:</span>
                            <span className="font-mono">{subtotal.toFixed(2)} €</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">ДДС (20%):</span>
                            <span className="font-mono">{vatAmount.toFixed(2)} €</span>
                          </div>
                          <div className="border-t border-border pt-2 flex justify-between">
                            <span className="font-semibold">Общо с ДДС:</span>
                            <span className="text-xl font-bold text-foreground font-mono">
                              {totalWithVat.toFixed(2)} €
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar - Admin Remarks */}
              <div className="space-y-4">
                <Card className="border-border bg-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <StickyNote className="h-4 w-4 text-yellow-500" />
                      Вътрешни бележки
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Забележки за администратори (не се показват на клиента)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Textarea
                      value={adminRemarks}
                      onChange={(e) => setAdminRemarks(e.target.value)}
                      placeholder="Добавете вътрешни бележки тук..."
                      className="min-h-[120px] bg-secondary resize-none"
                    />
                    <div className="text-xs text-muted-foreground">
                      {adminRemarks.length} символа
                    </div>
                  </CardContent>
                </Card>

                {/* Status Summary */}
                <Card className="border-border bg-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Резюме</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <div className="w-2 h-2 rounded-full bg-secondary" />
                        Чакащи
                      </span>
                      <span className="font-medium">{pendingCount}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-emerald-500">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        Одобрени
                      </span>
                      <span className="font-medium">{approvedCount}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-red-500">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        Отхвърлени
                      </span>
                      <span className="font-medium">{rejectedCount}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-amber-500">
                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                        Отложени
                      </span>
                      <span className="font-medium">{postponedCount}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Submit Actions */}
                <Card className="border-border bg-card">
                  <CardContent className="py-4 space-y-3">
                    {submitSuccess ? (
                      <div className="text-center py-4">
                        <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
                        <p className="font-semibold text-emerald-500">Решението е изпратено!</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Техникът ще бъде уведомен
                        </p>
                      </div>
                    ) : (
                      <>
                        <Button
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                          disabled={pendingCount > 0 || isSubmitting}
                          onClick={handleSubmitApproval}
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Изпращане...
                            </>
                          ) : (
                            <>
                              <Send className="h-4 w-4" />
                              Изпрати решение
                            </>
                          )}
                        </Button>
                        {pendingCount > 0 && (
                          <p className="text-xs text-amber-500 text-center">
                            Има {pendingCount} чакащи позиции
                          </p>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Bulk Action Confirmation Dialog */}
      <Dialog open={bulkActionDialog !== null} onOpenChange={() => setBulkActionDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {bulkActionDialog === "approve" && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
              {bulkActionDialog === "reject" && <XCircle className="h-5 w-5 text-red-500" />}
              {bulkActionDialog === "postpone" && <Clock className="h-5 w-5 text-amber-500" />}
              {bulkActionDialog === "approve" && "Одобряване на позиции"}
              {bulkActionDialog === "reject" && "Отхвърляне на позиции"}
              {bulkActionDialog === "postpone" && "Отлагане на позиции"}
            </DialogTitle>
            <DialogDescription>
              Сигурни ли сте, че искате да {bulkActionDialog === "approve" ? "одобрите" : bulkActionDialog === "reject" ? "отхвърлите" : "отложите"} {selectedItems.size} избрани позиции?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkActionDialog(null)} className="bg-transparent">
              Отказ
            </Button>
            <Button
              onClick={() => bulkUpdateStatus(bulkActionDialog === "approve" ? "approved" : bulkActionDialog === "reject" ? "rejected" : "postponed")}
              className={
                bulkActionDialog === "approve"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : bulkActionDialog === "reject"
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "bg-amber-600 hover:bg-amber-700 text-white"
              }
            >
              Потвърди
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
