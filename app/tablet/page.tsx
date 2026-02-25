"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import {
  Play,
  Square,
  PlusCircle,
  LayoutGrid,
  BarChart3,
  ArrowLeft,
  ListChecks,
  Search,
  Wrench,
  Users,
  Crown,
  Shield,
  FileSignature,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  useClocking,
  getStatusColor,
  getStatusBgClass,
  getStatusDotClass,
  reverseTechnicianMapping,
} from "@/lib/clocking-context";
import { cn } from "@/lib/utils";

const BG_MONTHS = [
  "януари","февруари","март","април","май","юни",
  "юли","август","септември","октомври","ноември","декември",
];

const technicians = [
  { id: "tech-1", name: "Иван Иванов" },
  { id: "tech-2", name: "Петър Петров" },
  { id: "tech-3", name: "Георги Георгиев" },
  { id: "tech-4", name: "Димитър Димитров" },
];

function StatusDot({ order }: { order: { status: string; actualHours: number; plannedHours: number; startTime: number | null; isSigned: boolean } }) {
  const color = getStatusColor(order as any);
  return <span className={cn("inline-block h-2 w-2 rounded-full shrink-0", getStatusDotClass(color))} />;
}

function StatusBadge({ order }: { order: { status: string; actualHours: number; plannedHours: number; startTime: number | null; isSigned: boolean } }) {
  const color = getStatusColor(order as any);
  const labels: Record<string, string> = {
    red: "Закъсняла",
    green: "Активна",
    orange: "Непланирана",
    gray: "Завършена",
    default: "Чакаща",
  };
  const classes: Record<string, string> = {
    red: "bg-red-600 text-white",
    green: "bg-emerald-600 text-white animate-pulse",
    orange: "bg-orange-500 text-white",
    gray: "bg-muted text-muted-foreground",
    default: "bg-secondary text-secondary-foreground",
  };
  return <Badge className={classes[color]}>{labels[color]}</Badge>;
}

export default function TabletSystemPage() {
  const {
    workOrders,
    clockingActivities,
    isAdmin,
    setIsAdmin,
    addWorkOrder,
    updateWorkOrderStatus,
    globalClockIn,
    globalClockOut,
    signJobCard,
  } = useClocking();

  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("mobile");
  const [searchTerm, setSearchTerm] = useState("");
  const [newOrder, setNewOrder] = useState({
    orderNumber: "",
    machineOwner: "",
    machine: "",
    serialNo: "",
    technicianIds: [] as string[],
    leadTechnicianId: "",
    plannedHours: 4,
    description: "",
    type: "repair" as "warranty" | "repair" | "internal",
  });

  useEffect(() => { setMounted(true); }, []);

  const saveNewOrder = () => {
    if (!newOrder.orderNumber || newOrder.technicianIds.length === 0) return;
    addWorkOrder({
      id: "", // will be generated
      orderNumber: newOrder.orderNumber,
      type: newOrder.type,
      machineOwner: newOrder.machineOwner,
      billingEntity: newOrder.machineOwner,
      machine: newOrder.machine,
      serialNo: newOrder.serialNo || "-",
      previousEngineHours: null,
      engineHours: 0,
      plannedHours: newOrder.plannedHours,
      technicianIds: newOrder.technicianIds,
      leadTechnicianId: newOrder.leadTechnicianId || newOrder.technicianIds[0],
      clockAtJobLevel: newOrder.technicianIds.length > 1,
      description: newOrder.description || `${newOrder.machine} - ${newOrder.machineOwner}`,
    });
    setNewOrder({
      orderNumber: "",
      machineOwner: "",
      machine: "",
      serialNo: "",
      technicianIds: [],
      leadTechnicianId: "",
      plannedHours: 4,
      description: "",
      type: "repair",
    });
  };

  const filteredOrders = workOrders.filter(
    (o) =>
      o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.machineOwner.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.technicianName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const kpiData = workOrders
    .filter((o) => o.status !== "Pending")
    .map((o) => ({
      name: `${o.orderNumber}/${o.id}`,
      Планирано: o.plannedHours,
      Отчетено: o.actualHours || 0,
    }));

  const hours = Array.from({ length: 11 }, (_, i) => i + 8);

  const dateLabel = mounted
    ? `${new Date().getDate()} ${BG_MONTHS[new Date().getMonth()]}`
    : "";

  return (
    <div className="min-h-screen bg-background text-foreground p-4 font-sans">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-center bg-card p-4 rounded-xl border border-border mb-6 gap-4">
        <div className="flex items-center gap-4">
          <Link href="/planning">
            <Button variant="ghost" size="sm" className="gap-2 bg-transparent text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              Към графика
            </Button>
          </Link>
          <Link href="/admin">
            <Button variant="ghost" size="sm" className="bg-transparent text-muted-foreground hover:text-foreground text-xs">
              Admin
            </Button>
          </Link>
          <div className="bg-emerald-500 p-2 rounded-lg text-black">
            <Wrench size={20} />
          </div>
          <h1 className="text-lg font-bold tracking-tighter text-foreground">
            MEGATRON <span className="text-muted-foreground text-sm font-normal">SERVICE OS</span>
          </h1>
          {/* Admin Toggle */}
          <Button
            variant={isAdmin ? "default" : "outline"}
            size="sm"
            className={cn("gap-1 text-xs", isAdmin && "bg-red-600 hover:bg-red-700 text-white")}
            onClick={() => setIsAdmin(!isAdmin)}
          >
            <Shield className="h-3.5 w-3.5" />
            {isAdmin ? "Admin ON" : "Admin"}
          </Button>
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
          <TabsList className="grid grid-cols-4 bg-secondary">
            <TabsTrigger value="dispatch" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-black">
              <LayoutGrid size={16} className="mr-2" />
              Борд
            </TabsTrigger>
            <TabsTrigger value="mobile" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-black">
              <Play size={16} className="mr-2" />
              Клокинг
            </TabsTrigger>
            <TabsTrigger value="registry" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-black">
              <ListChecks size={16} className="mr-2" />
              Регистър
            </TabsTrigger>
            <TabsTrigger value="kpi" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-black">
              <BarChart3 size={16} className="mr-2" />
              KPI
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </header>

      {/* CLOCKING TAB */}
      {activeTab === "mobile" && (
        <div className="space-y-6">
          {/* Quick Add Card */}
          <Card className="bg-card border-border border-l-4 border-l-emerald-500">
            <CardHeader>
              <CardTitle className="text-foreground">Нова работна карта</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Input
                  placeholder="Order Number (ON)"
                  className="bg-secondary border-border"
                  value={newOrder.orderNumber}
                  onChange={(e) => setNewOrder({ ...newOrder, orderNumber: e.target.value })}
                />
                <Input
                  placeholder="Собственик на машина"
                  className="bg-secondary border-border"
                  value={newOrder.machineOwner}
                  onChange={(e) => setNewOrder({ ...newOrder, machineOwner: e.target.value })}
                />
                <Input
                  placeholder="Машина"
                  className="bg-secondary border-border"
                  value={newOrder.machine}
                  onChange={(e) => setNewOrder({ ...newOrder, machine: e.target.value })}
                />
                <Select
                  value={newOrder.type}
                  onValueChange={(val: "warranty" | "repair" | "internal") =>
                    setNewOrder({ ...newOrder, type: val })
                  }
                >
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue placeholder="Тип" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="repair">Ремонт</SelectItem>
                    <SelectItem value="warranty">Гаранция</SelectItem>
                    <SelectItem value="internal">Вътрешно</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Select
                  value={newOrder.leadTechnicianId}
                  onValueChange={(val) =>
                    setNewOrder({
                      ...newOrder,
                      leadTechnicianId: val,
                      technicianIds: newOrder.technicianIds.includes(val)
                        ? newOrder.technicianIds
                        : [...newOrder.technicianIds, val],
                    })
                  }
                >
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue placeholder="Водещ техник" />
                  </SelectTrigger>
                  <SelectContent>
                    {technicians.map((tech) => (
                      <SelectItem key={tech.id} value={tech.id}>
                        {tech.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Описание"
                  className="bg-secondary border-border md:col-span-2"
                  value={newOrder.description}
                  onChange={(e) => setNewOrder({ ...newOrder, description: e.target.value })}
                />
                <Input
                  type="number"
                  placeholder="Планирани часове"
                  className="bg-secondary border-border"
                  value={newOrder.plannedHours}
                  onChange={(e) => setNewOrder({ ...newOrder, plannedHours: Number(e.target.value) || 0 })}
                />
              </div>
              {/* Selected techs */}
              {newOrder.technicianIds.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">Екип:</span>
                  {newOrder.technicianIds.map((tid) => {
                    const t = technicians.find((tt) => tt.id === tid);
                    return (
                      <Badge
                        key={tid}
                        variant="secondary"
                        className="gap-1 cursor-pointer"
                        onClick={() => setNewOrder({
                          ...newOrder,
                          technicianIds: newOrder.technicianIds.filter((id) => id !== tid),
                          leadTechnicianId: newOrder.leadTechnicianId === tid ? "" : newOrder.leadTechnicianId,
                        })}
                      >
                        {tid === newOrder.leadTechnicianId && <Crown className="h-3 w-3 text-amber-500" />}
                        {t?.name || tid}
                        <span className="text-muted-foreground ml-1">x</span>
                      </Badge>
                    );
                  })}
                  {/* Add more techs */}
                  {technicians
                    .filter((t) => !newOrder.technicianIds.includes(t.id))
                    .map((t) => (
                      <Button
                        key={t.id}
                        variant="outline"
                        size="sm"
                        className="h-6 text-xs bg-transparent"
                        onClick={() => setNewOrder({
                          ...newOrder,
                          technicianIds: [...newOrder.technicianIds, t.id],
                        })}
                      >
                        + {t.name}
                      </Button>
                    ))}
                </div>
              )}
              <Button className="bg-emerald-500 text-black hover:bg-emerald-600" onClick={saveNewOrder}>
                <PlusCircle className="mr-2 h-4 w-4" /> Добави поръчка
              </Button>
            </CardContent>
          </Card>

          {/* Clocking Cards -- status color coded */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {workOrders
              .filter((o) => o.status !== "Completed" || (!o.isSigned && o.actualHours > 0))
              .filter((o) => o.status !== "Completed")
              .map((order) => {
                const sc = getStatusColor(order);
                const borderColor: Record<string, string> = {
                  red: "border-l-red-500",
                  green: "border-l-emerald-500",
                  orange: "border-l-orange-500",
                  gray: "border-l-muted-foreground/30",
                  default: "border-l-border",
                };
                const isActive = order.status === "In Progress" || order.status === "Overdue";

                return (
                  <Card
                    key={order.id}
                    className={cn("bg-card border border-border border-l-4", borderColor[sc], getStatusBgClass(sc))}
                  >
                    <CardContent className="p-5 space-y-3">
                      {/* Top: ON / JCN / Type */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <StatusDot order={order} />
                          <span className="text-sm font-bold text-foreground">{order.orderNumber}</span>
                          <span className="text-xs text-muted-foreground">/</span>
                          <span className="text-sm font-medium text-muted-foreground">{order.id}</span>
                        </div>
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {order.type}
                        </Badge>
                      </div>

                      {/* Middle: Machine / Owner */}
                      <div>
                        <p className="text-sm text-foreground">{order.machine} - {order.machineOwner}</p>
                        {order.billingEntity !== order.machineOwner && (
                          <p className="text-[10px] text-muted-foreground">Фактуриране: {order.billingEntity}</p>
                        )}
                      </div>

                      {/* Technicians */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        {order.technicianIds.map((tid) => (
                          <Badge key={tid} variant="secondary" className="text-[10px] gap-0.5">
                            {tid === order.leadTechnicianId && <Crown className="h-2.5 w-2.5 text-amber-500" />}
                            {reverseTechnicianMapping[tid] || tid}
                          </Badge>
                        ))}
                        {order.clockAtJobLevel && (
                          <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-500">
                            Job-level clock
                          </Badge>
                        )}
                      </div>

                      {/* Active timer */}
                      {isActive && order.startTime && mounted && (
                        <p className="text-xs font-mono animate-pulse" style={{ color: sc === "red" ? "#ef4444" : "#10b981" }}>
                          Активно: {((Date.now() - order.startTime) / 3600000).toFixed(2)}h / {order.plannedHours}h
                        </p>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-1">
                        {order.clockAtJobLevel ? (
                          <>
                            <Button
                              onClick={() => isActive ? globalClockOut(order.id) : globalClockIn(order.id)}
                              className={cn(
                                "flex-1",
                                isActive
                                  ? "bg-red-600 hover:bg-red-700 text-white"
                                  : "bg-emerald-500 text-black hover:bg-emerald-600"
                              )}
                              size="sm"
                            >
                              {isActive ? (
                                <><Square className="mr-1.5 h-4 w-4" /> STOP ALL</>
                              ) : (
                                <><Play className="mr-1.5 h-4 w-4" /> START ALL</>
                              )}
                            </Button>
                          </>
                        ) : (
                          <Button
                            onClick={() =>
                              updateWorkOrderStatus(
                                order.id,
                                isActive ? "stop" : "start"
                              )
                            }
                            className={cn(
                              "flex-1",
                              isActive
                                ? "bg-red-600 hover:bg-red-700 text-white"
                                : "bg-emerald-500 text-black hover:bg-emerald-600"
                            )}
                            size="sm"
                          >
                            {isActive ? (
                              <><Square className="mr-1.5 h-4 w-4" /> STOP</>
                            ) : (
                              <><Play className="mr-1.5 h-4 w-4" /> START</>
                            )}
                          </Button>
                        )}
                        {isActive && !order.isSigned && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 bg-transparent"
                            onClick={() => signJobCard(order.id)}
                          >
                            <FileSignature className="h-4 w-4" />
                            Подпис
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        </div>
      )}

      {/* DISPATCH BOARD (GANTT) */}
      {activeTab === "dispatch" && (
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border">
            <CardTitle className="text-sm text-muted-foreground">
              {"График на техниците"}{dateLabel ? ` - ${dateLabel}` : ""}
            </CardTitle>
            <div className="flex gap-4 text-[10px]">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-emerald-500 rounded-sm animate-pulse" /> Активно
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-red-600 rounded-sm" /> Закъсняло
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-orange-500 rounded-sm" /> Непланирано
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-muted-foreground/50 rounded-sm" /> Завършено
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="relative">
              {/* Timeline Header */}
              <div className="flex mb-6 ml-[180px] text-[10px] text-muted-foreground font-mono">
                {hours.map((h) => (
                  <div key={h} className="flex-1 text-center border-l border-border/40">
                    {h}:00
                  </div>
                ))}
              </div>

              {/* Rows by Technician */}
              <div className="space-y-8">
                {technicians.map((tech) => {
                  const techOrders = workOrders.filter(
                    (o) => o.technicianIds.includes(tech.id) || o.technicianId === tech.id
                  );

                  return (
                    <div key={tech.id} className="flex items-start">
                      <div className="w-[180px] pr-4 pt-1">
                        <div className="text-xs font-bold text-foreground">{tech.name}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {techOrders.filter((o) => o.status !== "Completed").length} активни
                        </div>
                      </div>

                      <div className="flex-1 space-y-1 relative h-14 bg-secondary/30 rounded-lg p-1 border border-border/50">
                        {techOrders.map((order, idx) => {
                          const plannedStart = 8 + idx * 2;
                          const startPos = ((plannedStart - 8) / 11) * 100;
                          const width = Math.min((order.plannedHours / 11) * 100, 100 - startPos);
                          const sc = getStatusColor(order);

                          const barBg: Record<string, string> = {
                            red: "bg-red-600/80 border-red-400/60",
                            green: "bg-emerald-600/80 border-emerald-400/60",
                            orange: "bg-orange-500/80 border-orange-400/60",
                            gray: "bg-muted border-muted-foreground/20",
                            default: "bg-primary/30 border-primary/50",
                          };

                          const actualHours =
                            (order.status === "In Progress" || order.status === "Overdue") && order.startTime && mounted
                              ? (Date.now() - order.startTime) / 3600000
                              : order.actualHours;
                          const actualWidth = Math.min(
                            (actualHours / Math.max(order.plannedHours, 1)) * 100,
                            100
                          );

                          return (
                            <div
                              key={order.id}
                              className="absolute inset-y-1"
                              style={{
                                left: `${startPos}%`,
                                width: `${width}%`,
                              }}
                            >
                              {/* Planned Bar */}
                              <div className={cn("h-5 border rounded-t text-[9px] px-2 flex items-center overflow-hidden", barBg[sc])}>
                                <span className="truncate font-medium" style={{ color: sc === "gray" ? undefined : "white" }}>
                                  {order.orderNumber} / {order.id}
                                </span>
                              </div>
                              {/* Actual Bar */}
                              {actualHours > 0 && (
                                <div
                                  className={cn(
                                    "h-5 rounded-b border border-white/10 text-[9px] px-2 flex items-center",
                                    (order.status === "In Progress" || order.status === "Overdue")
                                      ? "bg-emerald-500 animate-pulse"
                                      : "bg-muted-foreground/40"
                                  )}
                                  style={{ width: `${actualWidth}%` }}
                                >
                                  {(order.status === "In Progress" || order.status === "Overdue") ? (
                                    <span className="flex items-center gap-1 text-white font-medium">
                                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                                      LIVE
                                    </span>
                                  ) : (
                                    <span className="text-foreground">{actualHours.toFixed(1)}h</span>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {techOrders.length === 0 && (
                          <div className="absolute inset-0 flex items-center justify-center text-[10px] text-muted-foreground">
                            Няма планирани задачи
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* REGISTRY TAB */}
      {activeTab === "registry" && (
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-foreground">Архив и активни поръчки</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Търсене по ON, JCN, клиент..."
                className="pl-8 bg-secondary border-border"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader className="bg-secondary/50">
                <TableRow className="border-border">
                  <TableHead className="text-muted-foreground">ON</TableHead>
                  <TableHead className="text-muted-foreground">JCN</TableHead>
                  <TableHead className="text-muted-foreground">Тип</TableHead>
                  <TableHead className="text-muted-foreground">Собственик</TableHead>
                  <TableHead className="text-muted-foreground">Машина</TableHead>
                  <TableHead className="text-muted-foreground">Екип</TableHead>
                  <TableHead className="text-muted-foreground">Статус</TableHead>
                  <TableHead className="text-muted-foreground text-right">Часове</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id} className="border-border hover:bg-secondary/30 transition-colors">
                    <TableCell className="font-bold text-emerald-500">{order.orderNumber}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{order.id}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] uppercase">{order.type}</Badge>
                    </TableCell>
                    <TableCell className="text-foreground">{order.machineOwner}</TableCell>
                    <TableCell className="text-muted-foreground">{order.machine}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 flex-wrap">
                        {order.technicianIds.map((tid) => (
                          <span key={tid} className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            {tid === order.leadTechnicianId && <Crown className="h-2.5 w-2.5 text-amber-500" />}
                            {reverseTechnicianMapping[tid] || tid}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell><StatusBadge order={order} /></TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                      {(order.status === "In Progress" || order.status === "Overdue") && order.startTime && mounted
                        ? ((Date.now() - order.startTime) / 3600000).toFixed(1)
                        : order.actualHours}
                      h / {order.plannedHours}h
                      {order.isSigned && (
                        <FileSignature className="inline-block ml-1.5 h-3.5 w-3.5 text-emerald-500" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* KPI TAB */}
      {activeTab === "kpi" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Ефективност по Поръчки (Часове)</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={kpiData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Планирано" fill="#60a5fa" />
                  <Bar dataKey="Отчетено" fill="#22c55e" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Тренд на утилизация</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={kpiData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="Отчетено" stroke="#22c55e" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Live Clocking Status */}
          <Card className="md:col-span-2 bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Активни клокинг сесии</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="text-muted-foreground">Техник</TableHead>
                    <TableHead className="text-muted-foreground">JCN</TableHead>
                    <TableHead className="text-muted-foreground">Описание</TableHead>
                    <TableHead className="text-muted-foreground">Начало</TableHead>
                    <TableHead className="text-muted-foreground">Край</TableHead>
                    <TableHead className="text-muted-foreground">Статус</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clockingActivities.map((activity) => (
                    <TableRow key={activity.id} className="border-border">
                      <TableCell className="font-medium text-foreground">
                        {activity.technicianName}
                      </TableCell>
                      <TableCell className="text-foreground">{activity.orderId}</TableCell>
                      <TableCell className="text-muted-foreground">{activity.description}</TableCell>
                      <TableCell className="font-mono text-foreground">
                        {activity.clockInHour.toString().padStart(2, "0")}:
                        {activity.clockInMinute.toString().padStart(2, "0")}
                      </TableCell>
                      <TableCell className="font-mono text-foreground">
                        {activity.clockOutHour !== null
                          ? `${activity.clockOutHour.toString().padStart(2, "0")}:${activity.clockOutMinute?.toString().padStart(2, "0")}`
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            activity.status === "active"
                              ? "bg-emerald-600 text-white animate-pulse"
                              : activity.isScheduled
                                ? "bg-muted text-muted-foreground"
                                : "bg-orange-500 text-white"
                          )}
                        >
                          {activity.status === "active"
                            ? "Активно"
                            : activity.isScheduled
                              ? "Завършено"
                              : "Извън график"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
