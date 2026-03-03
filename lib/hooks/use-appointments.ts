"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
export interface ServiceAppointment {
  id: string;
  client_name: string | null;
  machine_model: string | null;
  serial_number: string | null;
  technician_name: string | null;
  work_date: string;
  start_time: string | null;
  end_time: string | null;
  planned_hours: number | null;
  status: string | null;
  priority: string | null;
  notes: string | null;
  task_type: string | null;
  created_at: string;
  updated_at: string;
}

export interface Technician {
  id: string;
  name: string;
  active: boolean;
  specialization?: string | null;
}

export interface AppointmentStats {
  noTech: number;
  notes: number;
  waiting: number;
  inProgress: number;
  completed: number;
  total: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────
export function formatDateStr(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function getCardStatus(appointment: ServiceAppointment): "no_tech" | "waiting" | "in_progress" | "completed" | "note" {
  if (appointment.task_type === "note") return "note";
  if (!appointment.technician_name) return "no_tech";
  
  const status = appointment.status?.toLowerCase();
  if (status === "completed" || status === "done" || status === "завършена") return "completed";
  if (status === "in_progress" || status === "started" || status === "в процес") return "in_progress";
  return "waiting";
}

export function getStatusColor(status: ReturnType<typeof getCardStatus>) {
  switch (status) {
    case "no_tech": return { bg: "bg-red-100", border: "border-red-300", text: "text-red-700", dot: "bg-red-500" };
    case "note": return { bg: "bg-amber-100", border: "border-amber-300", text: "text-amber-700", dot: "bg-amber-400" };
    case "waiting": return { bg: "bg-slate-100", border: "border-slate-300", text: "text-slate-700", dot: "bg-slate-400" };
    case "in_progress": return { bg: "bg-green-100", border: "border-green-300", text: "text-green-700", dot: "bg-green-500" };
    case "completed": return { bg: "bg-blue-100", border: "border-blue-300", text: "text-blue-700", dot: "bg-blue-500" };
    default: return { bg: "bg-slate-100", border: "border-slate-300", text: "text-slate-700", dot: "bg-slate-400" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// UNIFIED HOOK
// ─────────────────────────────────────────────────────────────────────────────
interface UseAppointmentsOptions {
  dateRange?: { start: Date; end: Date };
  selectedDate?: Date;
}

export function useAppointments(options: UseAppointmentsOptions = {}) {
  const { dateRange, selectedDate } = options;
  
  const [allAppointments, setAllAppointments] = useState<ServiceAppointment[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  // ─────────────────────────────────────────────────────────────────────────
  // FETCH DATA
  // ─────────────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Build query for appointments
      let appointmentsQuery = supabase
        .from("service_appointments")
        .select("*")
        .order("work_date", { ascending: true })
        .order("start_time", { ascending: true });

      // Apply date range filter if provided
      if (dateRange) {
        const startStr = formatDateStr(dateRange.start);
        const endStr = formatDateStr(dateRange.end);
        appointmentsQuery = appointmentsQuery
          .gte("work_date", startStr)
          .lte("work_date", endStr);
      } else if (selectedDate) {
        const dateStr = formatDateStr(selectedDate);
        appointmentsQuery = appointmentsQuery.eq("work_date", dateStr);
      }

      const { data: appointmentsData, error: appointmentsError } = await appointmentsQuery;
      if (appointmentsError) throw appointmentsError;

      // Also fetch ALL backlog items (no technician) regardless of date
      const { data: backlogData, error: backlogError } = await supabase
        .from("service_appointments")
        .select("*")
        .is("technician_name", null)
        .order("work_date", { ascending: true });
      
      if (backlogError) throw backlogError;

      // Also fetch ALL notes regardless of date
      const { data: notesData, error: notesError } = await supabase
        .from("service_appointments")
        .select("*")
        .eq("task_type", "note")
        .order("created_at", { ascending: false });
      
      if (notesError) throw notesError;

      // Merge all data, removing duplicates by id
      const allData = [...(appointmentsData || [])];
      const seenIds = new Set(allData.map(a => a.id));
      
      for (const item of (backlogData || [])) {
        if (!seenIds.has(item.id)) {
          allData.push(item);
          seenIds.add(item.id);
        }
      }
      
      for (const item of (notesData || [])) {
        if (!seenIds.has(item.id)) {
          allData.push(item);
          seenIds.add(item.id);
        }
      }

      // Fetch technicians
      const { data: techniciansData, error: techniciansError } = await supabase
        .from("technicians")
        .select("*")
        .eq("active", true)
        .order("name");

      if (techniciansError) throw techniciansError;

      setAllAppointments(allData);
      setTechnicians(techniciansData || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [supabase, dateRange, selectedDate]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─────────────────────────────────────────────────────────────────────────
  // REALTIME SUBSCRIPTION
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel("appointments-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "service_appointments" },
        () => {
          // Refetch all data on any change for consistency
          fetchData();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "technicians" },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchData]);

  // ─────────────────────────────────────────────────────────────────────────
  // DERIVED DATA - Same filters for both Kanban and Gantt
  // ─────────────────────────────────────────────────────────────────────────
  
  // Waiting Orders: technician_name IS NULL AND task_type != 'note'
  const waitingOrders = useMemo(() => {
    return allAppointments.filter(
      (a) => !a.technician_name && a.task_type !== "note"
    );
  }, [allAppointments]);

  // Quick Notes: task_type = 'note'
  const quickNotes = useMemo(() => {
    return allAppointments.filter((a) => a.task_type === "note");
  }, [allAppointments]);

  // Assigned appointments (has technician)
  const assignedAppointments = useMemo(() => {
    return allAppointments.filter((a) => a.technician_name && a.task_type !== "note");
  }, [allAppointments]);

  // Combined backlog for sidebar (both waiting orders and notes)
  const sidebarBacklog = useMemo(() => {
    return [...waitingOrders, ...quickNotes].sort((a, b) => {
      // Notes first, then by date
      if (a.task_type === "note" && b.task_type !== "note") return 1;
      if (a.task_type !== "note" && b.task_type === "note") return -1;
      return (a.work_date || "").localeCompare(b.work_date || "");
    });
  }, [waitingOrders, quickNotes]);

  // Stats
  const stats: AppointmentStats = useMemo(() => {
    return {
      noTech: waitingOrders.length,
      notes: quickNotes.length,
      waiting: assignedAppointments.filter((a) => getCardStatus(a) === "waiting").length,
      inProgress: assignedAppointments.filter((a) => getCardStatus(a) === "in_progress").length,
      completed: assignedAppointments.filter((a) => getCardStatus(a) === "completed").length,
      total: allAppointments.length,
    };
  }, [allAppointments, waitingOrders, quickNotes, assignedAppointments]);

  // Group by date
  const appointmentsByDate = useCallback((dates: Date[]) => {
    const grouped: Record<string, ServiceAppointment[]> = {};
    dates.forEach((date) => {
      const dateStr = formatDateStr(date);
      grouped[dateStr] = assignedAppointments.filter((a) => a.work_date === dateStr);
    });
    return grouped;
  }, [assignedAppointments]);

  // Group by technician for a specific date
  const appointmentsByTechnician = useCallback((date: Date) => {
    const dateStr = formatDateStr(date);
    const grouped: Record<string, ServiceAppointment[]> = {};
    
    technicians.forEach((tech) => {
      grouped[tech.name] = assignedAppointments.filter(
        (a) => a.work_date === dateStr && a.technician_name === tech.name
      );
    });
    
    return grouped;
  }, [assignedAppointments, technicians]);

  // ─────────────────────────────────────────────────────────────────────────
  // MUTATIONS
  // ─────────────────────────────────────────────────────────────────────────
  const updateAppointment = useCallback(async (
    id: string, 
    updates: Partial<ServiceAppointment>
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error: updateError } = await supabase
        .from("service_appointments")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (updateError) throw updateError;
      
      // Optimistic update
      setAllAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
      );
      
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Update failed" };
    }
  }, [supabase]);

  const assignTechnician = useCallback(async (
    appointmentId: string,
    technicianName: string,
    workDate?: string,
    startTime?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const updates: Partial<ServiceAppointment> = {
      technician_name: technicianName,
    };
    
    if (workDate) updates.work_date = workDate;
    if (startTime) updates.start_time = startTime;
    
    return updateAppointment(appointmentId, updates);
  }, [updateAppointment]);

  const createQuickNote = useCallback(async (
    text: string,
    workDate?: string
  ): Promise<{ success: boolean; error?: string; data?: ServiceAppointment }> => {
    try {
      const { data, error: insertError } = await supabase
        .from("service_appointments")
        .insert({
          client_name: text.trim(),
          task_type: "note",
          work_date: workDate || formatDateStr(new Date()),
          planned_hours: 1,
          status: "scheduled",
          priority: "normal",
        })
        .select()
        .single();

      if (insertError) throw insertError;
      
      if (data) {
        setAllAppointments((prev) => [...prev, data]);
      }
      
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Failed to create note" };
    }
  }, [supabase]);

  const convertNoteToOrder = useCallback(async (
    id: string,
    machineModel: string,
    serialNumber?: string,
    priority?: string
  ): Promise<{ success: boolean; error?: string }> => {
    return updateAppointment(id, {
      task_type: "order",
      machine_model: machineModel,
      serial_number: serialNumber || null,
      priority: priority || "normal",
    });
  }, [updateAppointment]);

  return {
    // Data
    allAppointments,
    assignedAppointments,
    waitingOrders,
    quickNotes,
    sidebarBacklog,
    technicians,
    stats,
    
    // Computed
    appointmentsByDate,
    appointmentsByTechnician,
    
    // State
    loading,
    error,
    
    // Actions
    refetch: fetchData,
    updateAppointment,
    assignTechnician,
    createQuickNote,
    convertNoteToOrder,
  };
}
