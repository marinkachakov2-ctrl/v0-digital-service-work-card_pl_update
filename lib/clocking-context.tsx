"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

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
  id: string;
  customer: string;
  machine: string;
  status: "Pending" | "In Progress" | "Completed";
  plannedHours: number;
  actualHours: number;
  startTime: number | null;
  technicianId: string;
  technicianName: string;
  description?: string;
}

interface ClockingContextType {
  clockingActivities: ClockingActivity[];
  workOrders: WorkOrder[];
  clockIn: (orderId: string, technicianId: string, technicianName: string, description: string, isScheduled: boolean, machine?: string, customer?: string) => void;
  clockOut: (activityId: string) => void;
  addWorkOrder: (order: Omit<WorkOrder, "status" | "actualHours" | "startTime">) => void;
  updateWorkOrderStatus: (orderId: string, action: "start" | "stop") => void;
  getActivitiesForTechnician: (technicianId: string) => ClockingActivity[];
  getActiveActivity: (technicianId: string) => ClockingActivity | undefined;
}

const ClockingContext = createContext<ClockingContextType | undefined>(undefined);

// Map technician names to IDs for compatibility
const technicianMapping: Record<string, string> = {
  "Иван Иванов": "tech-1",
  "Петър Петров": "tech-2",
  "Георги Георгиев": "tech-3",
  "Димитър Димитров": "tech-4",
};

const reverseTechnicianMapping: Record<string, string> = {
  "tech-1": "Иван Иванов",
  "tech-2": "Петър Петров",
  "tech-3": "Георги Георгиев",
  "tech-4": "Димитър Димитров",
};

// Initial sample data
const initialWorkOrders: WorkOrder[] = [
  { 
    id: "WO-5521", 
    customer: "Агроинвест", 
    machine: "JD 8R", 
    status: "Completed",
    plannedHours: 5, 
    actualHours: 2.2, 
    startTime: null, 
    technicianId: "tech-1",
    technicianName: "Иван Иванов",
    description: "Смяна на масло"
  },
  { 
    id: "WO-5522", 
    customer: "Био Поле", 
    machine: "JD T670", 
    status: "In Progress", 
    plannedHours: 8, 
    actualHours: 0, 
    startTime: Date.now() - 7200000, // Started 2 hours ago
    technicianId: "tech-1",
    technicianName: "Иван Иванов",
    description: "Ремонт на двигател"
  },
  { 
    id: "WO-5523", 
    customer: "Зърно АД", 
    machine: "Claas Lexion", 
    status: "Completed",
    plannedHours: 3, 
    actualHours: 1.75, 
    startTime: null, 
    technicianId: "tech-2",
    technicianName: "Петър Петров",
    description: "Годишен преглед"
  },
  { 
    id: "WO-5524", 
    customer: "Ферма Плюс", 
    machine: "Fendt 942", 
    status: "In Progress", 
    plannedHours: 6, 
    actualHours: 0, 
    startTime: Date.now() - 10800000, // Started 3 hours ago
    technicianId: "tech-3",
    technicianName: "Георги Георгиев",
    description: "Ремонт на хидравлика"
  },
  { 
    id: "WO-5525", 
    customer: "Агро Макс", 
    machine: "New Holland T7", 
    status: "Completed",
    plannedHours: 4, 
    actualHours: 2.25, 
    startTime: null, 
    technicianId: "tech-4",
    technicianName: "Димитър Димитров",
    description: "Ремонт на трансмисия"
  },
  { 
    id: "UNSCH-001", 
    customer: "Клиент на място", 
    machine: "JD 6M", 
    status: "Completed",
    plannedHours: 0, 
    actualHours: 1.25, 
    startTime: null, 
    technicianId: "tech-1",
    technicianName: "Иван Иванов",
    description: "Спешен оглед - клиент на място"
  },
  { 
    id: "UNSCH-002", 
    customer: "Вътрешно", 
    machine: "-", 
    status: "Completed",
    plannedHours: 0, 
    actualHours: 1, 
    startTime: null, 
    technicianId: "tech-4",
    technicianName: "Димитър Димитров",
    description: "Помощ на колега"
  },
];

function workOrdersToClockingActivities(orders: WorkOrder[]): ClockingActivity[] {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  const activities: ClockingActivity[] = [];
  
  // Track time slots used per technician to avoid overlaps
  const techTimeSlots: Record<string, number> = {};
  
  for (const order of orders) {
    if (order.status === "Pending") continue;
    
    const isScheduled = !order.id.startsWith("UNSCH");
    const techId = order.technicianId;
    
    // Calculate clock times based on actual hours and start time
    let clockInHour: number;
    let clockInMinute: number;
    let clockOutHour: number | null = null;
    let clockOutMinute: number | null = null;
    
    if (order.status === "In Progress" && order.startTime) {
      // Active order - calculate from start time
      const startDate = new Date(order.startTime);
      clockInHour = startDate.getHours();
      clockInMinute = startDate.getMinutes();
      // No clock out - still active
    } else if (order.status === "Completed") {
      // Completed order - distribute throughout the day
      const baseHour = techTimeSlots[techId] || 8;
      clockInHour = baseHour;
      clockInMinute = Math.floor(Math.random() * 30);
      
      const durationMinutes = order.actualHours * 60;
      const endMinutes = clockInHour * 60 + clockInMinute + durationMinutes;
      clockOutHour = Math.floor(endMinutes / 60);
      clockOutMinute = Math.round(endMinutes % 60);
      
      // Update next available slot for this technician
      techTimeSlots[techId] = clockOutHour + 0.5;
    } else {
      continue;
    }
    
    activities.push({
      id: `clock-${order.id}`,
      technicianId: techId,
      technicianName: order.technicianName,
      orderId: order.id,
      description: order.description || `${order.machine} - ${order.customer}`,
      clockInHour,
      clockInMinute,
      clockOutHour,
      clockOutMinute,
      isScheduled,
      status: order.status === "In Progress" ? "active" : "completed",
      machine: order.machine,
      customer: order.customer,
    });
  }
  
  return activities;
}

export function ClockingProvider({ children }: { children: React.ReactNode }) {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(initialWorkOrders);
  const [clockingActivities, setClockingActivities] = useState<ClockingActivity[]>([]);
  
  // Sync clocking activities from work orders
  useEffect(() => {
    setClockingActivities(workOrdersToClockingActivities(workOrders));
  }, [workOrders]);
  
  // Update active orders' actual hours every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setWorkOrders(prev => prev.map(order => {
        if (order.status === "In Progress" && order.startTime) {
          const hours = (Date.now() - order.startTime) / 3600000;
          return { ...order, actualHours: Number(hours.toFixed(2)) };
        }
        return order;
      }));
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);
  
  const clockIn = useCallback((
    orderId: string, 
    technicianId: string, 
    technicianName: string, 
    description: string, 
    isScheduled: boolean,
    machine?: string,
    customer?: string
  ) => {
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
    
    // Also update or create work order
    setWorkOrders(prev => {
      const existing = prev.find(o => o.id === orderId);
      if (existing) {
        return prev.map(o => 
          o.id === orderId 
            ? { ...o, status: "In Progress" as const, startTime: Date.now() }
            : o
        );
      }
      // Create new work order for unscheduled work
      return [...prev, {
        id: orderId,
        customer: customer || "Непланирано",
        machine: machine || "-",
        status: "In Progress" as const,
        plannedHours: 0,
        actualHours: 0,
        startTime: Date.now(),
        technicianId,
        technicianName,
        description,
      }];
    });
  }, []);
  
  const clockOut = useCallback((activityId: string) => {
    const now = new Date();
    
    setClockingActivities(prev => prev.map(activity => {
      if (activity.id === activityId) {
        return {
          ...activity,
          clockOutHour: now.getHours(),
          clockOutMinute: now.getMinutes(),
          status: "completed" as const,
        };
      }
      return activity;
    }));
    
    // Also update work order
    setClockingActivities(prev => {
      const activity = prev.find(a => a.id === activityId);
      if (activity) {
        setWorkOrders(orders => orders.map(o => {
          if (o.id === activity.orderId && o.startTime) {
            const hours = (Date.now() - o.startTime) / 3600000;
            return {
              ...o,
              status: "Completed" as const,
              actualHours: Number((o.actualHours + hours).toFixed(2)),
              startTime: null,
            };
          }
          return o;
        }));
      }
      return prev;
    });
  }, []);
  
  const addWorkOrder = useCallback((order: Omit<WorkOrder, "status" | "actualHours" | "startTime">) => {
    const newOrder: WorkOrder = {
      ...order,
      status: "Pending",
      actualHours: 0,
      startTime: null,
    };
    setWorkOrders(prev => [...prev, newOrder]);
  }, []);
  
  const updateWorkOrderStatus = useCallback((orderId: string, action: "start" | "stop") => {
    setWorkOrders(prev => prev.map(order => {
      if (order.id === orderId) {
        if (action === "start") {
          return { ...order, status: "In Progress" as const, startTime: Date.now() };
        }
        if (action === "stop" && order.startTime) {
          const hours = (Date.now() - order.startTime) / 3600000;
          return { 
            ...order, 
            status: "Completed" as const, 
            actualHours: Number((order.actualHours + hours).toFixed(2)), 
            startTime: null 
          };
        }
      }
      return order;
    }));
  }, []);
  
  const getActivitiesForTechnician = useCallback((technicianId: string) => {
    return clockingActivities.filter(a => a.technicianId === technicianId);
  }, [clockingActivities]);
  
  const getActiveActivity = useCallback((technicianId: string) => {
    return clockingActivities.find(a => a.technicianId === technicianId && a.status === "active");
  }, [clockingActivities]);
  
  return (
    <ClockingContext.Provider value={{
      clockingActivities,
      workOrders,
      clockIn,
      clockOut,
      addWorkOrder,
      updateWorkOrderStatus,
      getActivitiesForTechnician,
      getActiveActivity,
    }}>
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
