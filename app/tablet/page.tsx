"use client";

import React, { useState } from "react";
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
  LayoutDashboard,
  Truck,
  BarChart3,
  ArrowLeft,
  ListChecks,
  Search,
  Wrench,
  LayoutGrid,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useClocking } from "@/lib/clocking-context";

const technicians = [
  { id: "tech-1", name: "Иван Иванов" },
  { id: "tech-2", name: "Петър Петров" },
  { id: "tech-3", name: "Георги Георгиев" },
  { id: "tech-4", name: "Димитър Димитров" },
];

export default function TabletSystemPage() {
  const {
    workOrders,
    clockingActivities,
    addWorkOrder,
    updateWorkOrderStatus,
  } = useClocking();

  const [activeTab, setActiveTab] = useState("mobile");
  const [searchTerm, setSearchTerm] = useState("");
  const [newOrder, setNewOrder] = useState({
    id: "",
    customer: "",
    machine: "",
    technicianId: "",
    technicianName: "",
    plannedHours: 4,
    description: "",
  });

  const saveNewOrder = () => {
    if (!newOrder.id || !newOrder.technicianId) return;
    addWorkOrder({
      id: newOrder.id,
      customer: newOrder.customer,
      machine: newOrder.machine,
      technicianId: newOrder.technicianId,
      technicianName: newOrder.technicianName,
      plannedHours: newOrder.plannedHours,
      description: newOrder.description || `${newOrder.machine} - ${newOrder.customer}`,
    });
    setNewOrder({
      id: "",
      customer: "",
      machine: "",
      technicianId: "",
      technicianName: "",
      plannedHours: 4,
      description: "",
    });
  };

  // Filtered orders for registry
  const filteredOrders = workOrders.filter(
    (o) =>
      o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.technicianName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // KPI data from work orders
  const kpiData = workOrders
    .filter((o) => o.status !== "Pending")
    .map((o) => ({
      name: o.id,
      Планирано: o.plannedHours,
      Отчетено: o.actualHours || 0,
    }));

  const hours = Array.from({ length: 11 }, (_, i) => i + 8); // 8:00 - 18:00

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4 font-sans">
      <header className="flex flex-col md:flex-row justify-between items-center bg-[#111] p-4 rounded-xl border border-gray-800 mb-6 gap-4">
        <div className="flex items-center gap-4">
          <Link href="/planning">
            <Button variant="ghost" size="sm" className="gap-2 bg-transparent text-gray-400 hover:text-white hover:bg-gray-800">
              <ArrowLeft className="h-4 w-4" />
              Към графика
            </Button>
          </Link>
          <div className="bg-emerald-500 p-2 rounded-lg text-black">
            <Wrench size={20} />
          </div>
          <h1 className="text-lg font-bold tracking-tighter">
            MEGATRON <span className="text-gray-500 text-sm font-normal">SERVICE OS</span>
          </h1>
        </div>
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full md:w-auto"
        >
          <TabsList className="grid grid-cols-4 bg-[#1a1a1a]">
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

      {/* МОБИЛЕН КЛОКИНГ */}
      {activeTab === "mobile" && (
        <div className="space-y-6">
          {/* Quick Add Card */}
          <Card className="bg-[#111] border-gray-800 border-l-4 border-l-emerald-500">
            <CardHeader>
              <CardTitle className="text-gray-300">Нова работна карта</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Input
                  placeholder="Поръчка №"
                  className="bg-[#1a1a1a] border-gray-800"
                  value={newOrder.id}
                  onChange={(e) =>
                    setNewOrder({ ...newOrder, id: e.target.value })
                  }
                />
                <Input
                  placeholder="Клиент"
                  className="bg-[#1a1a1a] border-gray-800"
                  value={newOrder.customer}
                  onChange={(e) =>
                    setNewOrder({ ...newOrder, customer: e.target.value })
                  }
                />
                <Input
                  placeholder="Машина"
                  className="bg-[#1a1a1a] border-gray-800"
                  value={newOrder.machine}
                  onChange={(e) =>
                    setNewOrder({ ...newOrder, machine: e.target.value })
                  }
                />
                <Select
                  value={newOrder.technicianId}
                  onValueChange={(val) => {
                    const tech = technicians.find((t) => t.id === val);
                    setNewOrder({
                      ...newOrder,
                      technicianId: val,
                      technicianName: tech?.name || "",
                    });
                  }}
                >
                  <SelectTrigger className="bg-[#1a1a1a] border-gray-800">
                    <SelectValue placeholder="Избери техник" />
                  </SelectTrigger>
                  <SelectContent>
                    {technicians.map((tech) => (
                      <SelectItem key={tech.id} value={tech.id}>
                        {tech.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button className="bg-emerald-500 text-black hover:bg-emerald-600" onClick={saveNewOrder}>
                <PlusCircle className="mr-2 h-4 w-4" /> Добави поръчка
              </Button>
            </CardContent>
          </Card>

          {/* Clocking Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {workOrders
              .filter((o) => o.status !== "Completed")
              .map((order) => (
                <Card
                  key={order.id}
                  className="bg-[#111] border-gray-800 border-l-4 border-l-emerald-500"
                >
                  <CardContent className="p-6 flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-bold text-emerald-400">
                        {order.id}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {order.customer} - {order.machine}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {order.technicianName}
                      </p>
                      {order.status === "In Progress" && order.startTime && (
                        <p className="text-xs text-emerald-400 mt-2 font-mono animate-pulse">
                          Активно: {((Date.now() - order.startTime) / 3600000).toFixed(2)}h
                        </p>
                      )}
                    </div>
                    <Button
                      onClick={() =>
                        updateWorkOrderStatus(
                          order.id,
                          order.status === "In Progress" ? "stop" : "start"
                        )
                      }
                      className={
                        order.status === "In Progress"
                          ? "bg-red-600 hover:bg-red-700"
                          : "bg-emerald-500 text-black hover:bg-emerald-600"
                      }
                      size="lg"
                    >
                      {order.status === "In Progress" ? (
                        <>
                          <Square className="mr-2 h-5 w-5" />
                          STOP
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-5 w-5" />
                          START
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      )}

      {/* ДИСПЕЧЕРСКИ БОРД (GANTT) */}
      {activeTab === "dispatch" && (
        <Card className="bg-[#111] border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between border-b border-gray-800">
            <CardTitle className="text-sm text-gray-400">
              График на техниците - {new Date().toLocaleDateString("bg-BG", { day: "2-digit", month: "long" })}
            </CardTitle>
            <div className="flex gap-4 text-[10px]">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-blue-600 rounded-sm" /> Planned
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-emerald-500 rounded-sm animate-pulse" /> Actual (Live)
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-orange-500 rounded-sm" /> Извън график
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="relative">
              {/* Timeline Header */}
              <div className="flex mb-6 ml-[160px] text-[10px] text-gray-600 font-mono">
                {hours.map((h) => (
                  <div key={h} className="flex-1 text-center border-l border-gray-900">
                    {h}:00
                  </div>
                ))}
              </div>

              {/* Rows by Technician */}
              <div className="space-y-8">
                {technicians.map((tech) => {
                  const techOrders = workOrders.filter(
                    (o) => o.technicianId === tech.id
                  );

                  return (
                    <div key={tech.id} className="flex items-start">
                      <div className="w-[160px] pr-4 pt-1">
                        <div className="text-xs font-bold text-gray-300">
                          {tech.name}
                        </div>
                        <div className="text-[10px] text-gray-500">
                          Сервизен техник
                        </div>
                      </div>

                      <div className="flex-1 space-y-1 relative h-14 bg-gray-900/30 rounded-lg p-1 border border-gray-800/50">
                        {techOrders.map((order) => {
                          // Calculate positions (assuming 8-hour shift, each hour = 1/11 of width)
                          const plannedStart = 8; // Default start at 8:00
                          const plannedEnd = plannedStart + order.plannedHours;
                          const startPos = ((plannedStart - 8) / 11) * 100;
                          const width = Math.min((order.plannedHours / 11) * 100, 100 - startPos);
                          
                          const actualHours =
                            order.status === "In Progress" && order.startTime
                              ? (Date.now() - order.startTime) / 3600000
                              : order.actualHours;
                          const actualWidth = Math.min(
                            (actualHours / order.plannedHours) * 100,
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
                              {/* Planned Bar (Top) */}
                              <div className="h-5 bg-blue-600/30 border border-blue-500/50 rounded-t text-[9px] px-2 flex items-center overflow-hidden">
                                <span className="truncate">
                                  {order.id} (P: {order.plannedHours}h)
                                </span>
                              </div>
                              {/* Actual Bar (Bottom) */}
                              {actualHours > 0 && (
                                <div
                                  className={`h-5 ${
                                    order.status === "In Progress"
                                      ? "bg-emerald-500 animate-pulse"
                                      : "bg-gray-600"
                                  } rounded-b border border-white/10 text-[9px] px-2 flex items-center shadow-lg`}
                                  style={{
                                    width: `${actualWidth}%`,
                                  }}
                                >
                                  {order.status === "In Progress" ? (
                                    <span className="flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                                      LIVE
                                    </span>
                                  ) : (
                                    `${actualHours.toFixed(1)}h`
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* Empty state */}
                        {techOrders.length === 0 && (
                          <div className="absolute inset-0 flex items-center justify-center text-[10px] text-gray-600">
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

      {/* РЕГИСТЪР */}
      {activeTab === "registry" && (
        <Card className="bg-[#111] border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-gray-300">
              Архив и активни поръчки
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Търсене..."
                className="pl-8 bg-[#1a1a1a] border-gray-800"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader className="bg-gray-900/50">
                <TableRow className="border-gray-800">
                  <TableHead className="text-gray-400">№</TableHead>
                  <TableHead className="text-gray-400">Клиент</TableHead>
                  <TableHead className="text-gray-400">Машина</TableHead>
                  <TableHead className="text-gray-400">Техник</TableHead>
                  <TableHead className="text-gray-400">Статус</TableHead>
                  <TableHead className="text-gray-400 text-right">Часове</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow
                    key={order.id}
                    className="border-gray-800 hover:bg-white/5 transition-colors"
                  >
                    <TableCell className="font-bold text-emerald-400">
                      {order.id}
                    </TableCell>
                    <TableCell className="text-gray-300">{order.customer}</TableCell>
                    <TableCell className="text-gray-400">{order.machine}</TableCell>
                    <TableCell className="text-gray-300">{order.technicianName}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          order.status === "Completed"
                            ? "bg-gray-700"
                            : order.status === "In Progress"
                              ? "bg-emerald-600 animate-pulse"
                              : "bg-gray-800"
                        }
                      >
                        {order.status === "Completed"
                          ? "Завършена"
                          : order.status === "In Progress"
                            ? "В процес"
                            : "Чакаща"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-gray-400">
                      {order.status === "In Progress" && order.startTime
                        ? ((Date.now() - order.startTime) / 3600000).toFixed(1)
                        : order.actualHours}
                      h / {order.plannedHours}h
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* KPI АНАЛИЗ */}
      {activeTab === "kpi" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-[#111] border-gray-800">
            <CardHeader>
              <CardTitle className="text-gray-300">Ефективност по Поръчки (Часове)</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={kpiData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Планирано" fill="#60a5fa" />
                  <Bar dataKey="Отчетено" fill="#22c55e" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-[#111] border-gray-800">
            <CardHeader>
              <CardTitle className="text-gray-300">Тренд на утилизация</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={kpiData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="Отчетено"
                    stroke="#22c55e"
                    strokeWidth={3}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Live Clocking Status */}
          <Card className="md:col-span-2 bg-[#111] border-gray-800">
            <CardHeader>
              <CardTitle className="text-gray-300">Активни клокинг сесии (Live)</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Техник</TableHead>
                    <TableHead>Поръчка</TableHead>
                    <TableHead>Описание</TableHead>
                    <TableHead>Начало</TableHead>
                    <TableHead>Край</TableHead>
                    <TableHead>Статус</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clockingActivities.map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell className="font-medium">
                        {activity.technicianName}
                      </TableCell>
                      <TableCell>{activity.orderId}</TableCell>
                      <TableCell>{activity.description}</TableCell>
                      <TableCell>
                        {activity.clockInHour
                          .toString()
                          .padStart(2, "0")}
                        :
                        {activity.clockInMinute
                          .toString()
                          .padStart(2, "0")}
                      </TableCell>
                      <TableCell>
                        {activity.clockOutHour !== null
                          ? `${activity.clockOutHour.toString().padStart(2, "0")}:${activity.clockOutMinute?.toString().padStart(2, "0")}`
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            activity.status === "active"
                              ? "bg-green-100 text-green-700 animate-pulse"
                              : activity.isScheduled
                                ? "bg-slate-100 text-slate-700"
                                : "bg-orange-100 text-orange-700"
                          }`}
                        >
                          {activity.status === "active"
                            ? "Активно"
                            : activity.isScheduled
                              ? "Завършено"
                              : "Извън график"}
                        </span>
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
