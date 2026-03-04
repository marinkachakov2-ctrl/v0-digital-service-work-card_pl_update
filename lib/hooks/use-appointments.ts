"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES - Single source of truth
// ─────────────────────────────────────────────────────────────────────────────
export interface ServiceAppointment {
  id: string;
  client_name: string | null;
  machine_model: string | null;
  serial_number: string | null;
  technician_name: string | null; // <-- THIS is the column we use, NOT technician_id
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
// HELPER FUNCTIONS - Exported for use in components
// ─────────────────────────────────────────────────────────────────────────────
export function formatDateStr(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function getCardStatus(apt: ServiceAppointment): "no_tech" | "note" | "waiting" | "in_progress" | "completed" {
  if (apt.task_type === "note") return "note";
  if (!apt.technician_name) return "no_tech";
  const s = apt.status?.toLowerCase() || "";
  if (s === "completed" || s === "done" || s === "завършена") return "completed";
  if (s === "in_progress" || s === "started" || s === "в процес") return "in_progress";
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
// UNIFIED APPOINTMENTS HOOK
// Both Kanban and Gantt use this SINGLE hook for data consistency
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
  // SINGLE FETCH FUNCTION - Fetches ALL data needed
  // ─────────────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch ALL technicians from database
      const { data: techData, error: techError } = await supabase
        .from("technicians")
        .select("id, name, active")
        .eq("active", true)
        .order("name");

      if (techError) throw techError;

      // 2. Fetch appointments with optional date filtering
      let query = supabase
        .from("service_appointments")
        .select("*")
        .order("work_date", { ascending: true })
        .order("start_time", { ascending: true });

      if (dateRange) {
        query = query
          .gte("work_date", formatDateStr(dateRange.start))
          .lte("work_date", formatDateStr(dateRange.end));
      } else if (selectedDate) {
        query = query.eq("work_date", formatDateStr(selectedDate));
      }

      const { data: dateAppointments, error: aptError } = await query;
      if (aptError) throw aptError;

      // 3. ALWAYS fetch global backlog (unassigned tasks, any date)
      const { data: backlogData, error: backlogError } = await supabase
        .from("service_appointments")
        .select("*")
        .is("technician_name", null)
        .order("work_date", { ascending: true });

      if (backlogError) throw backlogError;

      // 4. ALWAYS fetch all notes (task_type = 'note')
      const { data: notesData, error: notesError } = await supabase
        .from("service_appointments")
        .select("*")
        .eq("task_type", "note")
        .order("created_at", { ascending: false });

      if (notesError) throw notesError;

      // 5. Merge all appointments, removing duplicates
      const merged: ServiceAppointment[] = [];
      const seenIds = new Set<string>();

      const addUnique = (items: ServiceAppointment[] | null) => {
        (items || []).forEach((item) => {
          if (!seenIds.has(item.id)) {
            merged.push(item);
            seenIds.add(item.id);
          }
        });
      };

      addUnique(dateAppointments);
      addUnique(backlogData);
      addUnique(notesData);

      setTechnicians(techData || []);
      setAllAppointments(merged);
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
  // REALTIME - Force complete refresh on ANY change
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel("schema-db-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "service_appointments" },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "technicians" },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchData]);

  // ─────────────────────────────────────────────────────────────────────────
  // DERIVED DATA - IDENTICAL filters for Kanban and Gantt
  // ─────────────────────────────────────────────────────────────────────────

  // Waiting Orders: no technician AND not a note
  const waitingOrders = useMemo(() => {
    return allAppointments.filter((a) => !a.technician_name && a.task_type !== "note");
  }, [allAppointments]);

  // Quick Notes: task_type = 'note'
  const quickNotes = useMemo(() => {
    return allAppointments.filter((a) => a.task_type === "note");
  }, [allAppointments]);

  // Assigned: has technician_name AND not a note
  const assignedAppointments = useMemo(() => {
    return allAppointments.filter((a) => !!a.technician_name && a.task_type !== "note");
  }, [allAppointments]);

  // Sidebar backlog = waiting orders + notes (for Gantt sidebar)
  const sidebarBacklog = useMemo(() => {
    return [...waitingOrders, ...quickNotes];
  }, [waitingOrders, quickNotes]);

  // Stats - same for both views
  const stats: AppointmentStats = useMemo(() => ({
    noTech: waitingOrders.length,
    notes: quickNotes.length,
    waiting: assignedAppointments.filter((a) => getCardStatus(a) === "waiting").length,
    inProgress: assignedAppointments.filter((a) => getCardStatus(a) === "in_progress").length,
    completed: assignedAppointments.filter((a) => getCardStatus(a) === "completed").length,
    total: allAppointments.length,
  }), [allAppointments, waitingOrders, quickNotes, assignedAppointments]);

  // Group by technician for a specific date (Gantt rows)
  const appointmentsByTechnician = useCallback((date: Date): Record<string, ServiceAppointment[]> => {
    const dateStr = formatDateStr(date);
    const result: Record<string, ServiceAppointment[]> = {};
    
    // Create an entry for EVERY technician from DB
    technicians.forEach((tech) => {
      result[tech.name] = assignedAppointments.filter(
        (a) => a.work_date === dateStr && a.technician_name === tech.name
      );
    });
    
    return result;
  }, [technicians, assignedAppointments]);

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
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (updateError) throw updateError;
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Update failed" };
    }
  }, [supabase]);

  const assignTechnician = useCallback(async (
    id: string,
    technicianName: string,
    workDate?: string,
    startTime?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const updates: Partial<ServiceAppointment> = { technician_name: technicianName };
    if (workDate) updates.work_date = workDate;
    if (startTime) updates.start_time = startTime;
    return updateAppointment(id, updates);
  }, [updateAppointment]);

  const createQuickNote = useCallback(async (
    text: string,
    workDate?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error: insertError } = await supabase
        .from("service_appointments")
        .insert({
          client_name: text.trim(),
          task_type: "note",
          work_date: workDate || formatDateStr(new Date()),
          planned_hours: 1,
          status: "scheduled",
          priority: "normal",
        });

      if (insertError) throw insertError;
      return { success: true };
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
    
    // Computed functions
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
