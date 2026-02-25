"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

// ────────────────────────────── Types ──────────────────────────────

export interface ClockingActivity {
  id: string;
  technicianId: string;
  technicianName: string;
  orderId: string;
  description: string;
  clockInHour: number;
  clockInMinute: number;
  clockOutHour: number | null;
  clockOutMinute: number | null;
  isScheduled: boolean;
  status: "active" | "completed" | "break";
  machine?: string;
  customer?: string;
}

export interface WorkOrder {
  id: string;                          // Job Card Number (JCN)
  orderNumber: string;                 // Order Number (ON) — multiple JCNs per ON
  type: "warranty" | "repair" | "internal";
  machineOwner: string;
  billingEntity: string;               // defaults to machineOwner
  machine: string;
  serialNo: string;
  previousEngineHours: number | null;
  engineHours: number;
  status: "Pending" | "In Progress" | "Completed" | "Signed" | "Overdue";
  plannedHours: number;
  actualHours: number;
  startTime: number | null;
  technicianIds: string[];             // multiple technicians
  leadTechnicianId: string | null;     // lead tech can clock all
  clockAtJobLevel: boolean;            // if true, distribute time to all techs
  isSigned: boolean;                   // client signature → auto-stops clocking
  description?: string;
  // Legacy compat helpers
  technicianId: string;
  technicianName: string;
  customer: string;
}

export type StatusColor = "red" | "green" | "orange" | "gray" | "default";

export function getStatusColor(order: WorkOrder): StatusColor {
  if (order.status === "Overdue" || (order.status === "In Progress" && order.actualHours > order.plannedHours && order.plannedHours > 0)) return "red";
  if (order.status === "In Progress" && order.startTime) return "green";
  if (order.status === "Signed") return "gray";
  if (order.status === "Completed") return "gray";
  if (order.plannedHours === 0 && order.status !== "Completed" && order.status !== "Signed") return "orange";
  return "default";
}

export function getStatusBgClass(color: StatusColor): string {
  switch (color) {
    case "red": return "bg-red-500/15 border-red-500/40 dark:bg-red-500/20";
    case "green": return "bg-emerald-500/15 border-emerald-500/40 dark:bg-emerald-500/20";
    case "orange": return "bg-orange-500/15 border-orange-500/40 dark:bg-orange-500/20";
    case "gray": return "bg-muted/60 border-muted-foreground/20";
    default: return "bg-card border-border";
  }
}

export function getStatusDotClass(color: StatusColor): string {
  switch (color) {
    case "red": return "bg-red-500";
    case "green": return "bg-emerald-500 animate-pulse";
    case "orange": return "bg-orange-500";
    case "gray": return "bg-muted-foreground/50";
    default: return "bg-primary";
  }
}

// ────────────────────────────── Technician Map ──────────────────────────────

export const technicianMapping: Record<string, string> = {
  "Иван Иванов": "tech-1",
  "Петър Петров": "tech-2",
  "Георги Георгиев": "tech-3",
  "Димитър Димитров": "tech-4",
};

export const reverseTechnicianMapping: Record<string, string> = {
  "tech-1": "Иван Иванов",
  "tech-2": "Петър Петров",
  "tech-3": "Георги Георгиев",
  "tech-4": "Димитър Димитров",
};

// ────────────────────────────── Sample Data ──────────────────────────────

const initialWorkOrders: WorkOrder[] = [
  {
    id: "JC-0012",
    orderNumber: "ON-5521",
    type: "repair",
    machineOwner: "Агроинвест",
    billingEntity: "Агроинвест",
    machine: "JD 8R",
    serialNo: "1RW8370RCLP077234",
    previousEngineHours: 4520,
    engineHours: 4680,
    status: "Completed",
    plannedHours: 5,
    actualHours: 2.2,
    startTime: null,
    technicianIds: ["tech-1"],
    leadTechnicianId: "tech-1",
    clockAtJobLevel: false,
    isSigned: true,
    technicianId: "tech-1",
    technicianName: "Иван Иванов",
    customer: "Агроинвест",
    description: "Смяна на масло",
  },
  {
    id: "JC-0013",
    orderNumber: "ON-5521",
    type: "repair",
    machineOwner: "Агроинвест",
    billingEntity: "Агроинвест",
    machine: "JD 8R",
    serialNo: "1RW8370RCLP077234",
    previousEngineHours: 4520,
    engineHours: 4680,
    status: "In Progress",
    plannedHours: 8,
    actualHours: 0,
    startTime: Date.now() - 7200000,
    technicianIds: ["tech-1", "tech-2"],
    leadTechnicianId: "tech-1",
    clockAtJobLevel: true,
    isSigned: false,
    technicianId: "tech-1",
    technicianName: "Иван Иванов",
    customer: "Агроинвест",
    description: "Ремонт на двигател",
  },
  {
    id: "JC-0014",
    orderNumber: "ON-5523",
    type: "warranty",
    machineOwner: "Зърно АД",
    billingEntity: "John Deere Financial",
    machine: "Claas Lexion",
    serialNo: "CLA58200V00012345",
    previousEngineHours: 1200,
    engineHours: 1350,
    status: "Completed",
    plannedHours: 3,
    actualHours: 1.75,
    startTime: null,
    technicianIds: ["tech-2"],
    leadTechnicianId: "tech-2",
    clockAtJobLevel: false,
    isSigned: true,
    technicianId: "tech-2",
    technicianName: "Петър Петров",
    customer: "Зърно АД",
    description: "Годишен преглед",
  },
  {
    id: "JC-0015",
    orderNumber: "ON-5524",
    type: "repair",
    machineOwner: "Ферма Плюс",
    billingEntity: "Ферма Плюс",
    machine: "Fendt 942",
    serialNo: "FEN942VARIO0087612",
    previousEngineHours: 3200,
    engineHours: 3390,
    status: "Overdue",
    plannedHours: 6,
    actualHours: 7.5,
    startTime: Date.now() - 10800000,
    technicianIds: ["tech-3", "tech-4"],
    leadTechnicianId: "tech-3",
    clockAtJobLevel: true,
    isSigned: false,
    technicianId: "tech-3",
    technicianName: "Георги Георгиев",
    customer: "Ферма Плюс",
    description: "Ремонт на хидравлика",
  },
  {
    id: "JC-0016",
    orderNumber: "ON-5525",
    type: "internal",
    machineOwner: "Агро Макс",
    billingEntity: "Агро Макс",
    machine: "New Holland T7",
    serialNo: "NHT7210S5NLE01234",
    previousEngineHours: 2800,
    engineHours: 2950,
    status: "Completed",
    plannedHours: 4,
    actualHours: 2.25,
    startTime: null,
    technicianIds: ["tech-4"],
    leadTechnicianId: "tech-4",
    clockAtJobLevel: false,
    isSigned: true,
    technicianId: "tech-4",
    technicianName: "Димитър Димитров",
    customer: "Агро Макс",
    description: "Ремонт на трансмисия",
  },
  {
    id: "UNSCH-001",
    orderNumber: "ON-UNSCH-001",
    type: "repair",
    machineOwner: "Клиент на място",
    billingEntity: "Клиент на място",
    machine: "JD 6M",
    serialNo: "-",
    previousEngineHours: null,
    engineHours: 0,
    status: "Completed",
    plannedHours: 0,
    actualHours: 1.25,
    startTime: null,
    technicianIds: ["tech-1"],
    leadTechnicianId: "tech-1",
    clockAtJobLevel: false,
    isSigned: false,
    technicianId: "tech-1",
    technicianName: "Иван Иванов",
    customer: "Клиент на място",
    description: "Спешен оглед - клиент на място",
  },
  {
    id: "UNSCH-002",
    orderNumber: "ON-UNSCH-002",
    type: "internal",
    machineOwner: "Вътрешно",
    billingEntity: "Вътрешно",
    machine: "-",
    serialNo: "-",
    previousEngineHours: null,
    engineHours: 0,
    status: "Completed",
    plannedHours: 0,
    actualHours: 1,
    startTime: null,
    technicianIds: ["tech-4"],
    leadTechnicianId: "tech-4",
    clockAtJobLevel: false,
    isSigned: false,
    technicianId: "tech-4",
    technicianName: "Димитър Димитров",
    customer: "Вътрешно",
    description: "Помощ на колега",
  },
];

// ────────────────────────────── Activities Derivation ──────────────────────────────

function workOrdersToClockingActivities(orders: WorkOrder[]): ClockingActivity[] {
  const activities: ClockingActivity[] = [];
  const techTimeSlots: Record<string, number> = {};
  // Use a fixed seed offset per tech so completed entries are deterministic
  const techSeedIdx: Record<string, number> = {};

  for (const order of orders) {
    if (order.status === "Pending") continue;

    const isScheduled = !order.id.startsWith("UNSCH");
    // For each technician on the order, create an activity
    const techIds = order.technicianIds.length > 0 ? order.technicianIds : [order.technicianId];

    for (const techId of techIds) {
      const techName = reverseTechnicianMapping[techId] || order.technicianName;

      let clockInHour: number;
      let clockInMinute: number;
      let clockOutHour: number | null = null;
      let clockOutMinute: number | null = null;

      if ((order.status === "In Progress" || order.status === "Overdue") && order.startTime) {
        const startDate = new Date(order.startTime);
        clockInHour = startDate.getHours();
        clockInMinute = startDate.getMinutes();
      } else if (order.status === "Completed" || order.status === "Signed") {
        const baseHour = techTimeSlots[techId] || 8;
        const seedIdx = (techSeedIdx[techId] || 0);
        techSeedIdx[techId] = seedIdx + 1;
        clockInHour = baseHour;
        clockInMinute = (seedIdx * 17 + 3) % 30;

        const durationMinutes = order.actualHours * 60;
        const endMinutes = clockInHour * 60 + clockInMinute + durationMinutes;
        clockOutHour = Math.floor(endMinutes / 60);
        clockOutMinute = Math.round(endMinutes % 60);

        techTimeSlots[techId] = clockOutHour + 0.5;
      } else {
        continue;
      }

      activities.push({
        id: `clock-${order.id}-${techId}`,
        technicianId: techId,
        technicianName: techName,
        orderId: order.id,
        description: order.description || `${order.machine} - ${order.machineOwner}`,
        clockInHour,
        clockInMinute,
        clockOutHour,
        clockOutMinute,
        isScheduled,
        status: (order.status === "In Progress" || order.status === "Overdue") ? "active" : "completed",
        machine: order.machine,
        customer: order.machineOwner,
      });
    }
  }

  return activities;
}

// ────────────────────────────── Context ──────────────────────────────

interface ClockingContextType {
  clockingActivities: ClockingActivity[];
  workOrders: WorkOrder[];
  isAdmin: boolean;
  setIsAdmin: (v: boolean) => void;
  clockIn: (orderId: string, technicianId: string, technicianName: string, description: string, isScheduled: boolean, machine?: string, customer?: string) => void;
  clockOut: (activityId: string) => void;
  globalClockIn: (orderId: string) => void;
  globalClockOut: (orderId: string) => void;
  signJobCard: (orderId: string) => void;
  adminEditClocking: (activityId: string, updates: { clockInHour: number; clockInMinute: number; clockOutHour: number; clockOutMinute: number }) => void;
  addWorkOrder: (order: Omit<WorkOrder, "status" | "actualHours" | "startTime" | "isSigned" | "customer" | "technicianId" | "technicianName">) => void;
  updateWorkOrderStatus: (orderId: string, action: "start" | "stop") => void;
  updateWorkOrder: (orderId: string, updates: Partial<WorkOrder>) => void;
  getActivitiesForTechnician: (technicianId: string) => ClockingActivity[];
  getActiveActivity: (technicianId: string) => ClockingActivity | undefined;
  getOrderJobCards: (orderNumber: string) => WorkOrder[];
  getPreviousEngineHours: (machine: string) => number | null;
  linkOrderToJobCard: (jcId: string, orderNumber: string) => void;
  convertNoteToOrder: (note: { text: string; type?: "service" | "repair" | "inspection"; estimatedHours?: number }) => WorkOrder;
}

const ClockingContext = createContext<ClockingContextType | undefined>(undefined);

let jcCounter = 17; // start after initial sample data

export function ClockingProvider({ children }: { children: React.ReactNode }) {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(initialWorkOrders);
  const [clockingActivities, setClockingActivities] = useState<ClockingActivity[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  // Sync clocking activities from work orders
  useEffect(() => {
    setClockingActivities(workOrdersToClockingActivities(workOrders));
  }, [workOrders]);

  // Update active orders' actual hours every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setWorkOrders(prev =>
        prev.map(order => {
          if ((order.status === "In Progress" || order.status === "Overdue") && order.startTime) {
            const hours = (Date.now() - order.startTime) / 3600000;
            const newActual = Number(hours.toFixed(2));
            const newStatus: WorkOrder["status"] =
              order.plannedHours > 0 && newActual > order.plannedHours ? "Overdue" : order.status === "Overdue" ? "Overdue" : "In Progress";
            return { ...order, actualHours: newActual, status: newStatus };
          }
          return order;
        })
      );
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const clockIn = useCallback(
    (orderId: string, technicianId: string, technicianName: string, description: string, isScheduled: boolean, machine?: string, customer?: string) => {
      const now = new Date();
      const newActivity: ClockingActivity = {
        id: `clock-${Date.now()}`,
        technicianId,
        technicianName,
        orderId,
        description,
        clockInHour: now.getHours(),
        clockInMinute: now.getMinutes(),
        clockOutHour: null,
        clockOutMinute: null,
        isScheduled,
        status: "active",
        machine,
        customer,
      };

      setClockingActivities(prev => [...prev, newActivity]);

      setWorkOrders(prev => {
        const existing = prev.find(o => o.id === orderId);
        if (existing) {
          return prev.map(o =>
            o.id === orderId ? { ...o, status: "In Progress" as const, startTime: o.startTime || Date.now() } : o
          );
        }
        return [
          ...prev,
          {
            id: orderId,
            orderNumber: `ON-${orderId}`,
            type: "repair" as const,
            machineOwner: customer || "Непланирано",
            billingEntity: customer || "Непланирано",
            machine: machine || "-",
            serialNo: "-",
            previousEngineHours: null,
            engineHours: 0,
            status: "In Progress" as const,
            plannedHours: 0,
            actualHours: 0,
            startTime: Date.now(),
            technicianIds: [technicianId],
            leadTechnicianId: technicianId,
            clockAtJobLevel: false,
            isSigned: false,
            technicianId,
            technicianName,
            customer: customer || "Непланирано",
            description,
          },
        ];
      });
    },
    []
  );

  const clockOut = useCallback((activityId: string) => {
    const now = new Date();

    setClockingActivities(prev => {
      const activity = prev.find(a => a.id === activityId);
      if (activity) {
        setWorkOrders(orders =>
          orders.map(o => {
            if (o.id === activity.orderId && o.startTime) {
              // Only mark completed if all activities for this order are done
              const otherActive = prev.filter(a => a.orderId === o.id && a.id !== activityId && a.status === "active");
              if (otherActive.length === 0) {
                const hours = (Date.now() - o.startTime) / 3600000;
                return {
                  ...o,
                  status: "Completed" as const,
                  actualHours: Number(hours.toFixed(2)),
                  startTime: null,
                };
              }
            }
            return o;
          })
        );
      }
      return prev.map(a => {
        if (a.id === activityId) {
          return { ...a, clockOutHour: now.getHours(), clockOutMinute: now.getMinutes(), status: "completed" as const };
        }
        return a;
      });
    });
  }, []);

  const globalClockIn = useCallback((orderId: string) => {
    const order = workOrders.find(o => o.id === orderId);
    if (!order) return;

    const now = new Date();
    const newActivities: ClockingActivity[] = order.technicianIds
      .filter(techId => !clockingActivities.find(a => a.orderId === orderId && a.technicianId === techId && a.status === "active"))
      .map(techId => ({
        id: `clock-${Date.now()}-${techId}`,
        technicianId: techId,
        technicianName: reverseTechnicianMapping[techId] || techId,
        orderId,
        description: order.description || `${order.machine} - ${order.machineOwner}`,
        clockInHour: now.getHours(),
        clockInMinute: now.getMinutes(),
        clockOutHour: null,
        clockOutMinute: null,
        isScheduled: !orderId.startsWith("UNSCH"),
        status: "active" as const,
        machine: order.machine,
        customer: order.machineOwner,
      }));

    if (newActivities.length > 0) {
      setClockingActivities(prev => [...prev, ...newActivities]);
      setWorkOrders(prev =>
        prev.map(o => (o.id === orderId ? { ...o, status: "In Progress" as const, startTime: o.startTime || Date.now() } : o))
      );
    }
  }, [workOrders, clockingActivities]);

  const globalClockOut = useCallback((orderId: string) => {
    const now = new Date();

    setClockingActivities(prev => {
      const updated = prev.map(a => {
        if (a.orderId === orderId && a.status === "active") {
          return { ...a, clockOutHour: now.getHours(), clockOutMinute: now.getMinutes(), status: "completed" as const };
        }
        return a;
      });
      return updated;
    });

    setWorkOrders(prev =>
      prev.map(o => {
        if (o.id === orderId && o.startTime) {
          const hours = (Date.now() - o.startTime) / 3600000;
          return { ...o, status: "Completed" as const, actualHours: Number(hours.toFixed(2)), startTime: null };
        }
        return o;
      })
    );
  }, []);

  const signJobCard = useCallback((orderId: string) => {
    // Sign and auto-stop all clocking
    const now = new Date();

    setClockingActivities(prev =>
      prev.map(a => {
        if (a.orderId === orderId && a.status === "active") {
          return { ...a, clockOutHour: now.getHours(), clockOutMinute: now.getMinutes(), status: "completed" as const };
        }
        return a;
      })
    );

    setWorkOrders(prev =>
      prev.map(o => {
        if (o.id === orderId) {
          const actualHours = o.startTime ? Number(((Date.now() - o.startTime) / 3600000).toFixed(2)) : o.actualHours;
          return { ...o, isSigned: true, status: "Signed" as const, actualHours, startTime: null };
        }
        return o;
      })
    );
  }, []);

  const adminEditClocking = useCallback(
    (activityId: string, updates: { clockInHour: number; clockInMinute: number; clockOutHour: number; clockOutMinute: number }) => {
      if (!isAdmin) return;
      setClockingActivities(prev =>
        prev.map(a => {
          if (a.id === activityId) {
            return { ...a, ...updates, status: "completed" as const };
          }
          return a;
        })
      );
    },
    [isAdmin]
  );

  const addWorkOrder = useCallback(
    (order: Omit<WorkOrder, "status" | "actualHours" | "startTime" | "isSigned" | "customer" | "technicianId" | "technicianName">) => {
      const newId = `JC-${String(jcCounter++).padStart(4, "0")}`;
      const leadId = order.leadTechnicianId || order.technicianIds[0] || "tech-1";
      const newOrder: WorkOrder = {
        ...order,
        id: newId,
        status: "Pending",
        actualHours: 0,
        startTime: null,
        isSigned: false,
        customer: order.machineOwner,
        technicianId: leadId,
        technicianName: reverseTechnicianMapping[leadId] || leadId,
      };
      setWorkOrders(prev => [...prev, newOrder]);
    },
    []
  );

  const updateWorkOrderStatus = useCallback((orderId: string, action: "start" | "stop") => {
    setWorkOrders(prev =>
      prev.map(order => {
        if (order.id === orderId) {
          if (action === "start") {
            return { ...order, status: "In Progress" as const, startTime: Date.now() };
          }
          if (action === "stop" && order.startTime) {
            const hours = (Date.now() - order.startTime) / 3600000;
            return { ...order, status: "Completed" as const, actualHours: Number((order.actualHours + hours).toFixed(2)), startTime: null };
          }
        }
        return order;
      })
    );
  }, []);

  const updateWorkOrder = useCallback((orderId: string, updates: Partial<WorkOrder>) => {
    setWorkOrders(prev => prev.map(o => (o.id === orderId ? { ...o, ...updates } : o)));
  }, []);

  const getActivitiesForTechnician = useCallback(
    (technicianId: string) => {
      return clockingActivities.filter(a => a.technicianId === technicianId);
    },
    [clockingActivities]
  );

  const getActiveActivity = useCallback(
    (technicianId: string) => {
      return clockingActivities.find(a => a.technicianId === technicianId && a.status === "active");
    },
    [clockingActivities]
  );

  const getOrderJobCards = useCallback(
    (orderNumber: string) => {
      return workOrders.filter(o => o.orderNumber === orderNumber);
    },
    [workOrders]
  );

  const getPreviousEngineHours = useCallback(
    (machine: string) => {
      const completed = workOrders
        .filter(o => o.machine === machine && (o.status === "Completed" || o.status === "Signed" || o.isSigned) && o.previousEngineHours != null)
        .sort((a, b) => (b.engineHours || 0) - (a.engineHours || 0));
      return completed.length > 0 ? completed[0].engineHours : null;
    },
    [workOrders]
  );

  const linkOrderToJobCard = useCallback((jcId: string, orderNumber: string) => {
    setWorkOrders(prev => prev.map(o => (o.id === jcId ? { ...o, orderNumber } : o)));
  }, []);

  const convertNoteToOrder = useCallback((note: { text: string; type?: "service" | "repair" | "inspection"; estimatedHours?: number }): WorkOrder => {
    const newId = `JC-${String(jcCounter++).padStart(4, "0")}`;
    const newOrder: WorkOrder = {
      id: newId,
      orderNumber: `ON-UNSCH-${newId}`,
      type: note.type || "repair",
      machineOwner: "Непланирано",
      billingEntity: "Непланирано",
      machine: "-",
      serialNo: "-",
      previousEngineHours: null,
      engineHours: 0,
      status: "Pending",
      plannedHours: note.estimatedHours || 1,
      actualHours: 0,
      startTime: null,
      technicianIds: [],
      leadTechnicianId: null,
      clockAtJobLevel: false,
      isSigned: false,
      technicianId: "tech-1",
      technicianName: "Иван Иванов",
      customer: "Непланирано",
      description: note.text,
    };
    setWorkOrders(prev => [...prev, newOrder]);
    return newOrder;
  }, []);

  return (
    <ClockingContext.Provider
      value={{
        clockingActivities,
        workOrders,
        isAdmin,
        setIsAdmin,
        clockIn,
        clockOut,
        globalClockIn,
        globalClockOut,
        signJobCard,
        adminEditClocking,
        addWorkOrder,
        updateWorkOrderStatus,
        updateWorkOrder,
        getActivitiesForTechnician,
        getActiveActivity,
        getOrderJobCards,
        getPreviousEngineHours,
        linkOrderToJobCard,
        convertNoteToOrder,
      }}
    >
      {children}
    </ClockingContext.Provider>
  );
}

export function useClocking() {
  const context = useContext(ClockingContext);
  if (!context) {
    throw new Error("useClocking must be used within a ClockingProvider");
  }
  return context;
}
