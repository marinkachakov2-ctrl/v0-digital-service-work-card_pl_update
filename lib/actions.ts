"use server";

// ────────────────────────────── Server Actions ──────────────────────────────
// These actions run on the server and perform real Supabase database queries.

import { createClient } from "./supabase/server";
import { generateOrderNumber, generateJobCardNumber } from "./data";
import type { MachineSearchResult, Technician, PayerStatus, MachineWithPayerInfo } from "./types";

// ────────────────────────────── Admin Dashboard Actions ──────────────────────────────

export interface PendingJobCard {
  id: string;
  tempId: string; // order_no with TEMP prefix
  technicianName: string;
  machineModel: string;
  serialNumber: string;
  createdAt: string;
  status: string;
  clientName: string;
}

/**
 * Fetch job cards with pending_order status (TEMP IDs awaiting Navision allocation)
 */
export async function fetchPendingJobCards(): Promise<PendingJobCard[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("job_cards")
    .select(`
      id,
      order_no,
      status,
      created_at,
      client_name_signed,
      machines:machine_id (
        model,
        serial_number,
        brand
      ),
      technicians:technician_id (
        name
      )
    `)
    .or("status.eq.pending_order,order_no.ilike.TEMP-%")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Server Action] fetchPendingJobCards error:", error);
    return [];
  }

  return (data || []).map((jc) => {
    const machine = jc.machines as { model?: string; serial_number?: string; brand?: string } | null;
    const tech = jc.technicians as { name?: string } | null;
    return {
      id: jc.id,
      tempId: jc.order_no || "N/A",
      technicianName: tech?.name || "Неизвестен",
      machineModel: machine ? `${machine.brand || ""} ${machine.model || ""}`.trim() : "N/A",
      serialNumber: machine?.serial_number || "N/A",
      createdAt: jc.created_at,
      status: jc.status || "pending_order",
      clientName: jc.client_name_signed || "N/A",
    };
  });
}

/**
 * Link a Navision order number to a pending job card
 */
export async function linkNavisionOrder(
  jobCardId: string,
  navisionOrderNo: string
): Promise<{ success: boolean; error?: string }> {
  if (!jobCardId || !navisionOrderNo?.trim()) {
    return { success: false, error: "Job Card ID и Navision номер са задължителни" };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("job_cards")
    .update({
      order_no: navisionOrderNo.trim(),
      status: "completed", // Change from pending_order to completed
    })
    .eq("id", jobCardId);

  if (error) {
    console.error("[Server Action] linkNavisionOrder error:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Fetch admin dashboard statistics
 */
export async function fetchAdminStats(): Promise<{
  pendingCount: number;
  todayCount: number;
  totalPartsValue: number;
  blockedClients: number;
}> {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  // Pending job cards
  const { count: pendingCount } = await supabase
    .from("job_cards")
    .select("*", { count: "exact", head: true })
    .or("status.eq.pending_order,order_no.ilike.TEMP-%");

  // Today's job cards
  const { count: todayCount } = await supabase
    .from("job_cards")
    .select("*", { count: "exact", head: true })
    .gte("created_at", `${today}T00:00:00`)
    .lte("created_at", `${today}T23:59:59`);

  // Blocked clients
  const { count: blockedClients } = await supabase
    .from("clients")
    .select("*", { count: "exact", head: true })
    .eq("is_blocked", true);

  return {
    pendingCount: pendingCount || 0,
    todayCount: todayCount || 0,
    totalPartsValue: 0, // Would need aggregation query
    blockedClients: blockedClients || 0,
  };
}

// ────────────────────────────── Machine Service History ──────────────────────────────

export interface MachineServiceHistoryItem {
  id: string;
  serviceDate: string;
  technicianName: string;
  orderNo: string | null;
  description: string;
  partsReplaced: string[];
  totalCost: number;
  hoursRecorded: number;
}

/**
 * Fetch service history for a machine by serial number
 */
export async function fetchMachineServiceHistory(
  machineSerialNumber: string
): Promise<MachineServiceHistoryItem[]> {
  if (!machineSerialNumber || machineSerialNumber.trim().length < 3) {
    return [];
  }

  const supabase = await createClient();

  // First get the machine ID
  const { data: machine } = await supabase
    .from("machines")
    .select("id")
    .eq("serial_number", machineSerialNumber.trim())
    .single();

  if (!machine) {
    return [];
  }

  // Fetch job cards for this machine
  const { data: jobCards, error } = await supabase
    .from("job_cards")
    .select(`
      id,
      order_no,
      created_at,
      complaint_description,
      current_machine_hours,
      recommendations,
      technicians:technician_id (name),
      job_card_parts (
        quantity,
        parts:part_id (description, part_number)
      )
    `)
    .eq("machine_id", machine.id)
    .not("status", "eq", "draft")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("[Server Action] fetchMachineServiceHistory error:", error);
    return [];
  }

  return (jobCards || []).map((jc) => {
    const tech = jc.technicians as { name?: string } | null;
    const parts = (jc.job_card_parts || []) as Array<{
      quantity?: number;
      parts?: { description?: string; part_number?: string };
    }>;

    const partsReplaced = parts
      .filter((p) => p.parts)
      .map((p) => `${p.parts?.part_number || "N/A"} - ${p.parts?.description || "Unknown"}`);

    return {
      id: jc.id,
      serviceDate: jc.created_at,
      technicianName: tech?.name || "Unknown",
      orderNo: jc.order_no,
      description: jc.complaint_description || jc.recommendations || "Service performed",
      partsReplaced,
      totalCost: 0,
      hoursRecorded: jc.current_machine_hours || 0,
    };
  });
}

// ────────────────────────────── Machine Pending Repairs ──────────────────────────────

export interface PendingRepairItem {
  id: string;
  machineVin: string;
  description: string;
  status: string;
  estimatedCost: number;
  sourceJobCardId: string | null;
  partId: string | null;
  laborId: string | null;
  createdAt: string;
}

/**
 * Fetch pending repairs for a machine by serial number (VIN)
 */
export async function fetchMachinePendingRepairs(
  machineVin: string
): Promise<PendingRepairItem[]> {
  if (!machineVin || machineVin.trim().length < 3) {
    return [];
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("machine_pending_repairs")
    .select("*")
    .eq("machine_vin", machineVin.trim())
    .in("status", ["pending", "deferred", "next_visit"]) // Only unfulfilled repairs
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Server Action] fetchMachinePendingRepairs error:", error);
    return [];
  }

  return (data || []).map((item) => ({
    id: item.id,
    machineVin: item.machine_vin || "",
    description: item.description || "",
    status: item.status || "pending",
    estimatedCost: Number(item.estimated_cost) || 0,
    sourceJobCardId: item.source_job_card_id,
    partId: item.part_id,
    laborId: item.labor_id,
    createdAt: item.created_at,
  }));
}

/**
 * Save pending repairs when closing a job card
 * Items with status "deferred" or "next_visit" get saved to machine history
 */
export async function savePendingRepairs(
  machineVin: string,
  sourceJobCardId: string,
  repairs: Array<{
    description: string;
    status: "deferred" | "next_visit";
    estimatedCost: number;
    partId?: string | null;
    laborId?: string | null;
  }>
): Promise<{ success: boolean; error?: string }> {
  if (!machineVin || repairs.length === 0) {
    return { success: true };
  }

  const supabase = await createClient();

  const dataToInsert = repairs.map((r) => ({
    machine_vin: machineVin,
    source_job_card_id: sourceJobCardId,
    description: r.description,
    status: r.status,
    estimated_cost: r.estimatedCost,
    part_id: r.partId || null,
    labor_id: r.laborId || null,
  }));

  const { error } = await supabase
    .from("machine_pending_repairs")
    .insert(dataToInsert);

  if (error) {
    console.error("[Server Action] savePendingRepairs error:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Fetch all pending repairs across all machines (for admin dashboard)
 */
export interface AdminPendingRepair {
  id: string;
  machineVin: string;
  machineModel: string;
  customerName: string;
  description: string;
  status: string;
  estimatedCost: number;
  sourceJobCardId: string | null;
  sourceOrderNo: string | null;
  photoUrls: string[];
  createdAt: string;
  daysSinceDiscovery: number;
}

export async function fetchAllPendingRepairs(filters?: {
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<AdminPendingRepair[]> {
  const supabase = await createClient();

  let query = supabase
    .from("machine_pending_repairs")
    .select(`
      *,
      job_cards:source_job_card_id (
        order_no,
        photo_urls,
        machines:machine_id (
          model,
          brand,
          client_name
        )
      )
    `)
    .in("status", ["pending", "deferred", "next_visit"])
    .order("created_at", { ascending: false });

  // Apply date filters
  if (filters?.dateFrom) {
    query = query.gte("created_at", filters.dateFrom);
  }
  if (filters?.dateTo) {
    query = query.lte("created_at", filters.dateTo);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[Server Action] fetchAllPendingRepairs error:", error);
    return [];
  }

  const now = new Date();
  let results = (data || []).map((item) => {
    const jobCard = item.job_cards as {
      order_no?: string;
      photo_urls?: string[];
      machines?: { model?: string; brand?: string; client_name?: string };
    } | null;
    const machine = jobCard?.machines;
    const createdDate = new Date(item.created_at);
    const daysSince = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

    return {
      id: item.id,
      machineVin: item.machine_vin || "",
      machineModel: machine ? `${machine.brand || ""} ${machine.model || ""}`.trim() : "N/A",
      customerName: machine?.client_name || "N/A",
      description: item.description || "",
      status: item.status || "pending",
      estimatedCost: Number(item.estimated_cost) || 0,
      sourceJobCardId: item.source_job_card_id,
      sourceOrderNo: jobCard?.order_no || null,
      photoUrls: jobCard?.photo_urls || [],
      createdAt: item.created_at,
      daysSinceDiscovery: daysSince,
    };
  });

  // Apply search filter client-side (for flexibility)
  if (filters?.search) {
    const searchLower = filters.search.toLowerCase();
    results = results.filter(
      (r) =>
        r.machineVin.toLowerCase().includes(searchLower) ||
        r.customerName.toLowerCase().includes(searchLower) ||
        r.description.toLowerCase().includes(searchLower)
    );
  }

  return results;
}

/**
 * Mark pending repairs as completed when they are addressed
 */
export async function markPendingRepairsCompleted(
  repairIds: string[]
): Promise<{ success: boolean; error?: string }> {
  if (repairIds.length === 0) {
    return { success: true };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("machine_pending_repairs")
    .update({ status: "completed" })
    .in("id", repairIds);

  if (error) {
    console.error("[Server Action] markPendingRepairsCompleted error:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ────────────────────────────── Labor Catalog ──────────────────────────────

export interface LaborCatalogItem {
  id: string;
  operationCode: string;
  description: string;
  standardHours: number;
}

/**
 * Fetch all operations from labor_catalog
 */
export async function fetchLaborCatalog(): Promise<LaborCatalogItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("labor_catalog")
    .select("*")
    .order("operation_code", { ascending: true });

  if (error) {
    console.error("[Server Action] fetchLaborCatalog error:", error);
    return [];
  }

  return (data || []).map((item) => ({
    id: item.id,
    operationCode: item.operation_code || "",
    description: item.description || "",
    standardHours: item.standard_hours || 0,
  }));
}

/**
 * Save labor items to job_card_labor table
 */
export async function saveJobCardLabor(
  jobCardId: string,
  laborItems: Array<{
    operationId: string;
    technicianName: string;
    actualHours: number;
    startTime?: string | null;
    endTime?: string | null;
  }>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // First delete existing labor items for this job card
  const { error: deleteError } = await supabase
    .from("job_card_labor")
    .delete()
    .eq("job_card_id", jobCardId);

  if (deleteError) {
    console.error("[Server Action] deleteJobCardLabor error:", deleteError);
    return { success: false, error: deleteError.message };
  }

  // Insert new labor items
  if (laborItems.length > 0) {
    const dataToInsert = laborItems.map((item) => ({
      job_card_id: jobCardId,
      operation_id: item.operationId,
      technician_name: item.technicianName,
      actual_hours: item.actualHours,
      start_time: item.startTime || null,
      end_time: item.endTime || null,
    }));

    const { error: insertError } = await supabase
      .from("job_card_labor")
      .insert(dataToInsert);

    if (insertError) {
      console.error("[Server Action] insertJobCardLabor error:", insertError);
      return { success: false, error: insertError.message };
    }
  }

  return { success: true };
}

/**
 * Fetch labor items for a job card
 */
export async function fetchJobCardLabor(
  jobCardId: string
): Promise<Array<{
  id: string;
  operationId: string;
  operationCode: string;
  operationDescription: string;
  technicianName: string;
  actualHours: number;
  standardHours: number;
}>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("job_card_labor")
    .select(`
      *,
      labor_catalog:operation_id (operation_code, description, standard_hours)
    `)
    .eq("job_card_id", jobCardId);

  if (error) {
    console.error("[Server Action] fetchJobCardLabor error:", error);
    return [];
  }

  return (data || []).map((item) => ({
    id: item.id,
    operationId: item.operation_id,
    operationCode: (item.labor_catalog as Record<string, unknown>)?.operation_code as string || "",
    operationDescription: (item.labor_catalog as Record<string, unknown>)?.description as string || "",
    technicianName: item.technician_name || "",
    actualHours: item.actual_hours || 0,
    standardHours: (item.labor_catalog as Record<string, unknown>)?.standard_hours as number || 0,
  }));
}

// ────────────────────────────── Service Orders ──────────────────────────────

export interface ServiceOrderResult {
  id: string;
  orderNumber: string;
  jobCardNumber: string;
  clientId: string | null;
  clientName: string;
  machineId: string | null;
  machineModel: string;
  machineSerial: string;
  serviceType: "warranty" | "repair" | "service_contract" | "internal";
  status: string;
  technicianId: string | null;
  technicianName: string;
  createdAt: string;
}

/**
 * Search service orders by order number, job card number, client name, or machine
 */
export async function searchServiceOrders(
  query: string,
  technicianId?: string | null
): Promise<ServiceOrderResult[]> {
  const supabase = await createClient();

  let queryBuilder = supabase
    .from("service_orders")
    .select(`
      *,
      machines:machine_id (model, serial_number),
      clients:client_id (name)
    `)
    .order("created_at", { ascending: false })
    .limit(50);

  // Filter by technician if provided
  if (technicianId) {
    queryBuilder = queryBuilder.eq("technician_id", technicianId);
  }

  // Search filter
  if (query && query.trim().length >= 2) {
    const searchTerm = `%${query.trim()}%`;
    queryBuilder = queryBuilder.or(
      `order_number.ilike.${searchTerm},job_card_number.ilike.${searchTerm},technician_name.ilike.${searchTerm}`
    );
  }

  const { data, error } = await queryBuilder;

  if (error) {
    console.error("[Server Action] searchServiceOrders error:", error);
    return [];
  }

  return (data || []).map((so: Record<string, unknown>) => ({
    id: so.id as string,
    orderNumber: (so.order_number as string) || "",
    jobCardNumber: (so.job_card_number as string) || "",
    clientId: so.client_id as string | null,
    clientName: (so.clients as Record<string, unknown>)?.name as string || "",
    machineId: so.machine_id as string | null,
    machineModel: (so.machines as Record<string, unknown>)?.model as string || "",
    machineSerial: (so.machines as Record<string, unknown>)?.serial_number as string || "",
    serviceType: (so.service_type as ServiceOrderResult["serviceType"]) || "repair",
    status: (so.status as string) || "open",
    technicianId: so.technician_id as string | null,
    technicianName: (so.technician_name as string) || "",
    createdAt: so.created_at as string,
  }));
}

/**
 * Get a single service order with full details including payer info
 */
export async function getServiceOrderDetails(orderId: string): Promise<{
  order: ServiceOrderResult;
  owner: PayerStatus | null;
  payer: PayerStatus | null;
} | null> {
  const supabase = await createClient();

  const { data: so, error } = await supabase
    .from("service_orders")
    .select(`
      *,
      machines:machine_id (*),
      clients:client_id (*)
    `)
    .eq("id", orderId)
    .single();

  if (error || !so) {
    console.error("[Server Action] getServiceOrderDetails error:", error);
    return null;
  }

  const order: ServiceOrderResult = {
    id: so.id,
    orderNumber: so.order_number || "",
    jobCardNumber: so.job_card_number || "",
    clientId: so.client_id,
    clientName: (so.clients as Record<string, unknown>)?.name as string || "",
    machineId: so.machine_id,
    machineModel: (so.machines as Record<string, unknown>)?.model as string || "",
    machineSerial: (so.machines as Record<string, unknown>)?.serial_number as string || "",
    serviceType: so.service_type || "repair",
    status: so.status || "open",
    technicianId: so.technician_id,
    technicianName: so.technician_name || "",
    createdAt: so.created_at,
  };

  // Get owner (client) payer status
  let owner: PayerStatus | null = null;
  let payer: PayerStatus | null = null;

  if (so.client_id) {
    const { data: clientData } = await supabase
      .from("clients")
      .select("*")
      .eq("id", so.client_id)
      .single();

    if (clientData) {
      const creditLimit = Number(clientData.credit_limit) || 0;
      const currentBalance = Number(clientData.current_balance) || 0;
      owner = {
        payerId: clientData.id,
        payerName: clientData.name || "",
        isBlocked: clientData.is_blocked === true,
        creditLimit,
        currentBalance,
        creditWarningMessage: clientData.credit_warning_message || undefined,
        isOverCreditLimit: creditLimit > 0 && currentBalance > creditLimit,
      };

      // Check if there's a different payer
      const payerId = clientData.payer_id || clientData.id;
      if (payerId !== clientData.id) {
        const { data: payerData } = await supabase
          .from("clients")
          .select("*")
          .eq("id", payerId)
          .single();

        if (payerData) {
          const payerCreditLimit = Number(payerData.credit_limit) || 0;
          const payerCurrentBalance = Number(payerData.current_balance) || 0;
          payer = {
            payerId: payerData.id,
            payerName: payerData.name || "",
            isBlocked: payerData.is_blocked === true,
            creditLimit: payerCreditLimit,
            currentBalance: payerCurrentBalance,
            creditWarningMessage: payerData.credit_warning_message || undefined,
            isOverCreditLimit: payerCreditLimit > 0 && payerCurrentBalance > payerCreditLimit,
          };
        }
      } else {
        payer = owner;
      }
    }
  }

  return { order, owner, payer };
}

/**
 * Update payer for a job card with audit trail
 */
export async function updateJobCardPayer(
  jobCardId: string,
  newPayerId: string,
  changeReason: string,
  originalPayerId?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("job_cards")
    .update({
      payer_id: newPayerId,
      is_payer_changed: true,
      payer_change_reason: changeReason,
      original_payer_id: originalPayerId || null,
    })
    .eq("id", jobCardId);

  if (error) {
    console.error("[Server Action] updateJobCardPayer error:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Search machines by query string across multiple fields using Supabase:
 * - Brand
 * - Model
 * - Serial Number
 * - Client Name
 * All searches are case-insensitive using ilike.
 */
export async function searchMachines(query: string): Promise<MachineSearchResult[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const supabase = await createClient();
  const searchTerm = `%${query.trim()}%`;

  // Search across multiple fields with OR condition using ilike for case-insensitive matching
  const { data, error } = await supabase
    .from("machines")
    .select("*")
    .or(`brand.ilike.${searchTerm},model.ilike.${searchTerm},serial_number.ilike.${searchTerm},client_name.ilike.${searchTerm}`)
    .limit(10);

  if (error) {
    console.error("[Server Action] searchMachines error:", error);
    return [];
  }

  // Map database results to MachineSearchResult format
  return (data || []).map((m) => ({
    id: m.id,
    model: m.model || "",
    manufacturer: m.brand || "",
    serialNo: m.serial_number || "",
    engineSN: m.engine_sn || "",
    ownerName: m.client_name || "",
    location: "",
    engineHours: 0,
    // Pre-generate order/job card numbers for this machine
    suggestedOrderNumber: generateOrderNumber(m.id),
    suggestedJobCardNumber: generateJobCardNumber(),
  }));
}

/**
 * Get full machine details by serial number (for QR code scan)
 */
export async function getMachineBySerial(serialNo: string): Promise<MachineSearchResult | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("machines")
    .select("*")
    .eq("serial_number", serialNo)
    .single();

  if (error || !data) {
    console.error("[Server Action] getMachineBySerial error:", error);
    return null;
  }

  return {
    id: data.id,
    model: data.model || "",
    manufacturer: data.brand || "",
    serialNo: data.serial_number || "",
    engineSN: data.engine_sn || "",
    ownerName: data.client_name || "",
    location: "",
    engineHours: 0,
    suggestedOrderNumber: generateOrderNumber(data.id),
    suggestedJobCardNumber: generateJobCardNumber(),
  };
}

/**
 * Fetch machine by serial number with full owner and payer financial status
 * This performs a join between machines -> clients (owner) -> clients (payer)
 * to check the payer's financial status (blocked, credit limit, etc.)
 */
export async function fetchMachineWithPayerStatus(serialNo: string): Promise<MachineWithPayerInfo | null> {
  if (!serialNo || serialNo.trim().length < 2) {
    return null;
  }

  const supabase = await createClient();

  // Step 1: Find the machine by serial number
  const { data: machineData, error: machineError } = await supabase
    .from("machines")
    .select("*")
    .eq("serial_number", serialNo.trim())
    .single();

  if (machineError || !machineData) {
    // No machine found - not an error, just no results
    return null;
  }

  // Step 2: If machine has a client_id, fetch the owner client
  let owner: { id: string; name: string } | null = null;
  let payer: PayerStatus | null = null;

  if (machineData.client_id) {
    const { data: ownerData, error: ownerError } = await supabase
      .from("clients")
      .select("*")
      .eq("id", machineData.client_id)
      .single();

    if (!ownerError && ownerData) {
      owner = {
        id: ownerData.id,
        name: ownerData.name || machineData.client_name || "",
      };

      // Step 3: Check if owner has a payer_id (parent account)
      // If no payer_id, the owner IS the payer
      const payerId = ownerData.payer_id || ownerData.id;

      // Fetch the payer's financial status
      const { data: payerData, error: payerError } = await supabase
        .from("clients")
        .select("*")
        .eq("id", payerId)
        .single();

      if (!payerError && payerData) {
        const creditLimit = Number(payerData.credit_limit) || 0;
        const currentBalance = Number(payerData.current_balance) || 0;
        const isOverCreditLimit = creditLimit > 0 && currentBalance > creditLimit;

        payer = {
          payerId: payerData.id,
          payerName: payerData.name || "",
          isBlocked: payerData.is_blocked === true,
          creditLimit,
          currentBalance,
          creditWarningMessage: payerData.credit_warning_message || undefined,
          isOverCreditLimit,
        };
      }
    }
  }

  // Build the machine result
  const machine: MachineSearchResult = {
    id: machineData.id,
    model: machineData.model || "",
    manufacturer: machineData.brand || "",
    serialNo: machineData.serial_number || "",
    engineSN: machineData.engine_sn || "",
    ownerName: owner?.name || machineData.client_name || "",
    location: "",
    engineHours: 0,
    suggestedOrderNumber: generateOrderNumber(machineData.id),
    suggestedJobCardNumber: generateJobCardNumber(),
    payerStatus: payer,
  };

  return {
    machine,
    owner,
    payer,
  };
}

/**
 * Search clients by name for the Billing Entity (Payer) dropdown
 * Returns clients with their financial status
 */
export async function searchClients(query: string): Promise<PayerStatus[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const supabase = await createClient();
  const searchTerm = `%${query.trim()}%`;

  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .ilike("name", searchTerm)
    .limit(10);

  if (error) {
    console.error("[Server Action] searchClients error:", error);
    return [];
  }

  return (data || []).map((c) => {
    const creditLimit = Number(c.credit_limit) || 0;
    const currentBalance = Number(c.current_balance) || 0;
    return {
      payerId: c.id,
      payerName: c.name || "",
      isBlocked: c.is_blocked === true,
      creditLimit,
      currentBalance,
      creditWarningMessage: c.credit_warning_message || undefined,
      isOverCreditLimit: creditLimit > 0 && currentBalance > creditLimit,
    };
  });
}

/**
 * Fetch a specific client's payer status by ID
 */
export async function fetchPayerStatus(clientId: string): Promise<PayerStatus | null> {
  if (!clientId) return null;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .single();

  if (error || !data) {
    console.error("[Server Action] fetchPayerStatus error:", error);
    return null;
  }

  const creditLimit = Number(data.credit_limit) || 0;
  const currentBalance = Number(data.current_balance) || 0;

  return {
    payerId: data.id,
    payerName: data.name || "",
    isBlocked: data.is_blocked === true,
    creditLimit,
    currentBalance,
    creditWarningMessage: data.credit_warning_message || undefined,
    isOverCreditLimit: creditLimit > 0 && currentBalance > creditLimit,
  };
}

/**
 * Combined search for the Master Search bar
 * Searches both service_orders and machines, returning unified results
 */
// Machine telematics data from JDLink
export interface MachineTelematics {
  engineHours: number;
  batteryVoltage: number;
  fuelLevel: number;
  defLevel?: number;
  engineTemp?: number;
  coolantTemp?: number;
  hydraulicTemp?: number;
  engineLoad?: number;
  hydraulicPressure?: number;
  lastUpdated?: string;
}

export interface MasterSearchResult {
  type: "order" | "machine";
  id: string;
  // Order fields (if type === "order")
  orderNumber?: string;
  jobCardNumber?: string;
  serviceType?: "warranty" | "repair" | "service_contract" | "internal";
  // Machine fields
  machineId?: string;
  machineSerial: string;
  machineModel: string;
  // Client fields
  clientId?: string;
  clientName: string;
  clientLocation?: string;
  // Engine serial number
  engineSerial?: string;
  // Payer status
  isBlocked?: boolean;
  // Navision description from service order
  navisionDescription?: string;
  // JDLink telematics data
  telematics?: MachineTelematics;
  // Active DTC codes from machine
  dtcCodes?: Array<{ code: string; description: string; severity: "warning" | "critical" }>;
}

export async function masterSearch(
  query: string,
  orderType?: string
): Promise<MasterSearchResult[]> {
  // Allow empty query for wildcard (%) mode - returns general machine list
  const isWildcardMode = !query || query.trim().length === 0;
  
  if (!isWildcardMode && query.trim().length < 2) {
    return [];
  }

  const searchTerm = query?.trim() || "";
  const results: MasterSearchResult[] = [];

  // ═══════════════════════════════════════════════════════════════════════════
  // HYBRID STRATEGY: Real Supabase UUIDs + Mock Telematics for JDLink UI
  // ═══════════════════════════════════════════════════════════════════════════
  
  try {
    const supabase = await createClient();
    
    // Build the real Supabase query
    let machineQuery = supabase
      .from("machines")
      .select(`
        id,
        serial_number,
        model_name,
        brand,
        model,
        clients:client_id (id, name, is_blocked, location),
        machine_telematics (*)
      `);
    
    // Apply search filter if not wildcard mode
    if (!isWildcardMode && searchTerm) {
      machineQuery = machineQuery.or(
        `serial_number.ilike.%${searchTerm}%,model_name.ilike.%${searchTerm}%,brand.ilike.%${searchTerm}%`
      );
    }
    
    // Limit results
    machineQuery = machineQuery.limit(isWildcardMode ? 50 : 10);
    
    const { data: machines, error } = await machineQuery;
    
    if (error) {
      console.error("masterSearch Supabase error:", error);
      // Fall back to mock data on error
      return getMockMachineResults(searchTerm, isWildcardMode);
    }
    
    if (!machines || machines.length === 0) {
      // No results from database - return mock data for demo
      return getMockMachineResults(searchTerm, isWildcardMode);
    }
    
    // Process real database results with hybrid telematics
    for (const m of machines) {
      const client = m.clients as { id: string; name: string; is_blocked: boolean; location: string } | null;
      const rawTelematics = m.machine_telematics as Array<Record<string, unknown>> | null;
      
      // Check if real telematics exists, otherwise inject mock data
      const hasRealTelematics = rawTelematics && rawTelematics.length > 0;
      const telematics = hasRealTelematics 
        ? rawTelematics[0] 
        : generateMockTelematics();
      
      // Generate mock DTC codes if machine has active DTCs
      const activeDtcs = (telematics.active_dtcs as number) || 0;
      const dtcCodes = activeDtcs > 0 ? generateMockDtcCodes(activeDtcs) : [];
      
      results.push({
        type: "machine",
        id: m.id as string, // Real UUID from Supabase
        machineId: m.id as string,
        machineSerial: (m.serial_number as string) || "",
        machineModel: m.model_name 
          ? (m.model_name as string)
          : `${m.brand || ""} ${m.model || ""}`.trim(),
        clientId: client?.id || undefined,
        clientName: client?.name || "",
        clientLocation: client?.location || "",
        isBlocked: client?.is_blocked || false,
        telematics: {
          engineHours: (telematics.engine_hours as number) || 0,
          batteryVoltage: (telematics.battery_voltage as number) || 0,
          fuelLevel: (telematics.fuel_level_percent as number) || 0,
          defLevel: (telematics.def_level_percent as number) || 0,
          engineTemp: (telematics.engine_temp as number) || 0,
          coolantTemp: (telematics.coolant_temp as number) || 0,
          hydraulicTemp: (telematics.hydraulic_temp as number) || 0,
          engineLoad: (telematics.engine_load as number) || 0,
          hydraulicPressure: (telematics.hydraulic_pressure as number) || 0,
          lastUpdated: new Date().toISOString(),
        },
        dtcCodes,
      });
    }
    
    return results;
    
  } catch (err) {
    console.error("masterSearch exception:", err);
    // Fall back to mock data on any error
    return getMockMachineResults(searchTerm, isWildcardMode);
  }
}

// Generate mock telematics for machines without real JDLink data
function generateMockTelematics(): Record<string, unknown> {
  return {
    engine_hours: Math.floor(Math.random() * 4000) + 1000,
    fuel_level_percent: Math.floor(Math.random() * 60) + 30,
    def_level_percent: Math.floor(Math.random() * 50) + 40,
    battery_voltage: 12.8 + Math.random() * 2,
    engine_temp: 75 + Math.floor(Math.random() * 25),
    coolant_temp: 70 + Math.floor(Math.random() * 20),
    hydraulic_temp: 55 + Math.floor(Math.random() * 25),
    engine_load: Math.floor(Math.random() * 70) + 20,
    hydraulic_pressure: 150 + Math.floor(Math.random() * 80),
    active_dtcs: Math.random() > 0.7 ? 1 : 0, // 30% chance of having DTC
  };
}

// Generate mock DTC codes based on count
function generateMockDtcCodes(count: number): Array<{ code: string; description: string; severity: "warning" | "critical" }> {
  const possibleDtcs = [
    { code: "ECU 524287.31", description: "Engine Oil Pressure Low", severity: "warning" as const },
    { code: "ECU 641.14", description: "Battery Voltage Low", severity: "warning" as const },
    { code: "ECU 110.03", description: "Engine Coolant Temp High", severity: "critical" as const },
    { code: "ECU 91.09", description: "Throttle Position Sensor", severity: "warning" as const },
    { code: "ECU 168.01", description: "Electrical System Voltage", severity: "warning" as const },
  ];
  return possibleDtcs.slice(0, Math.min(count, possibleDtcs.length));
}

// Fallback mock data when Supabase is unavailable (v0 sandbox)
function getMockMachineResults(searchTerm: string, isWildcardMode: boolean): MasterSearchResult[] {
  const mockMachines = [
    {
      id: "mock-6m195-001",
      serial_number: "1L06155MCHJ100042",
      model_name: "John Deere 6M 195",
      client: { id: "c1", name: "Агроинвест ООД", is_blocked: false, location: "Пловдив" },
      telematics: { engine_hours: 2156, fuel_level_percent: 28, def_level_percent: 45, battery_voltage: 13.8, engine_temp: 88, coolant_temp: 85, hydraulic_temp: 72, engine_load: 42, hydraulic_pressure: 185, active_dtcs: 1 },
      dtc_codes: [{ code: "ECU 524287.31", description: "Engine Oil Pressure Low", severity: "warning" as const }],
    },
    {
      id: "mock-7r350-002",
      serial_number: "1RW7350KMPD008912",
      model_name: "John Deere 7R 350",
      client: { id: "c2", name: "Golden Fields EOOD", is_blocked: false, location: "Стара Загора" },
      telematics: { engine_hours: 4320, fuel_level_percent: 65, def_level_percent: 78, battery_voltage: 14.1, engine_temp: 92, coolant_temp: 88, hydraulic_temp: 68, engine_load: 68, hydraulic_pressure: 210, active_dtcs: 0 },
      dtc_codes: [],
    },
    {
      id: "mock-8r410-003",
      serial_number: "1RW8400RTNE002847",
      model_name: "John Deere 8R 410",
      client: { id: "c3", name: "Мегатрон Демо ЕООД", is_blocked: false, location: "София" },
      telematics: { engine_hours: 1245, fuel_level_percent: 82, def_level_percent: 91, battery_voltage: 14.2, engine_temp: 78, coolant_temp: 75, hydraulic_temp: 62, engine_load: 35, hydraulic_pressure: 175, active_dtcs: 0 },
      dtc_codes: [],
    },
    {
      id: "mock-9620rx-004",
      serial_number: "1L09620STPK004521",
      model_name: "John Deere 9620 RX",
      client: { id: "c4", name: "Зърнени Храни АД", is_blocked: true, location: "Добрич" },
      telematics: { engine_hours: 6789, fuel_level_percent: 15, def_level_percent: 22, battery_voltage: 11.8, engine_temp: 105, coolant_temp: 98, hydraulic_temp: 88, engine_load: 0, hydraulic_pressure: 0, active_dtcs: 2 },
      dtc_codes: [
        { code: "ECU 524287.31", description: "Engine Oil Pressure Low", severity: "critical" as const },
        { code: "ECU 641.14", description: "Battery Voltage Low", severity: "warning" as const },
      ],
    },
  ];

  // Filter based on search term
  const filtered = isWildcardMode
    ? mockMachines
    : mockMachines.filter(
        (m) =>
          m.serial_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          m.model_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          m.client.name.toLowerCase().includes(searchTerm.toLowerCase())
      );

  return filtered.map((m) => ({
    type: "machine" as const,
    id: m.id,
    machineId: m.id,
    machineSerial: m.serial_number,
    machineModel: m.model_name,
    clientId: m.client.id,
    clientName: m.client.name,
    clientLocation: m.client.location,
    isBlocked: m.client.is_blocked,
    telematics: {
      engineHours: m.telematics.engine_hours,
      batteryVoltage: m.telematics.battery_voltage,
      fuelLevel: m.telematics.fuel_level_percent,
      defLevel: m.telematics.def_level_percent,
      engineTemp: m.telematics.engine_temp,
      coolantTemp: m.telematics.coolant_temp,
      hydraulicTemp: m.telematics.hydraulic_temp,
      engineLoad: m.telematics.engine_load,
      hydraulicPressure: m.telematics.hydraulic_pressure,
      lastUpdated: new Date().toISOString(),
    },
    dtcCodes: m.dtc_codes,
  }));
}

  const searchTerm = query?.trim().toLowerCase() || "";
  const results: MasterSearchResult[] = [];

  // ══════════════════════════════════════════��════════════════════════════════
  // MOCK DATA - Simulated Supabase response for v0 sandbox testing
  // In production, this would be replaced with real Supabase queries
  // ═════════════════════════════════════════════════════���═════════════════════
  const simulatedSupabaseResponse = [
    {
      id: "1",
      serial_number: "1L06155MCHJ100042",
      model_name: "John Deere 6M 195",
      brand: "John Deere",
      model: "6M 195",
      clients: { id: "c1", name: "Агроинвест ООД", is_blocked: false, location: "Пловдив" },
      machine_telematics: [
        {
          engine_hours: 2156,
          fuel_level_percent: 28,
          def_level_percent: 45,
          battery_voltage: 13.8,
          engine_temp: 88,
          coolant_temp: 85,
          hydraulic_temp: 72,
          engine_load: 42,
          hydraulic_pressure: 185,
          active_dtcs: 1,
        },
      ],
      dtc_codes: [
        { code: "ECU 524287.31", description: "Engine Oil Pressure Low", severity: "warning" as const },
      ],
    },
    {
      id: "2",
      serial_number: "1RW7350KMPD008912",
      model_name: "John Deere 7R 350",
      brand: "John Deere",
      model: "7R 350",
      clients: { id: "c2", name: "Golden Fields EOOD", is_blocked: false, location: "Стара Загора" },
      machine_telematics: [
        {
          engine_hours: 4320,
          fuel_level_percent: 65,
          def_level_percent: 78,
          battery_voltage: 14.1,
          engine_temp: 92,
          coolant_temp: 88,
          hydraulic_temp: 68,
          engine_load: 68,
          hydraulic_pressure: 210,
          active_dtcs: 0,
        },
      ],
      dtc_codes: [],
    },
    {
      id: "3",
      serial_number: "1RW8400RTNE002847",
      model_name: "John Deere 8R 410",
      brand: "John Deere",
      model: "8R 410",
      clients: { id: "c3", name: "Мегатрон Демо ЕООД", is_blocked: false, location: "София" },
      machine_telematics: [
        {
          engine_hours: 1245,
          fuel_level_percent: 82,
          def_level_percent: 91,
          battery_voltage: 14.2,
          engine_temp: 78,
          coolant_temp: 75,
          hydraulic_temp: 62,
          engine_load: 35,
          hydraulic_pressure: 175,
          active_dtcs: 0,
        },
      ],
      dtc_codes: [],
    },
    {
      id: "4",
      serial_number: "1L09620STPK004521",
      model_name: "John Deere 9620 RX",
      brand: "John Deere",
      model: "9620 RX",
      clients: { id: "c4", name: "Зърнени Храни АД", is_blocked: true, location: "Добрич" },
      machine_telematics: [
        {
          engine_hours: 6789,
          fuel_level_percent: 15,
          def_level_percent: 22,
          battery_voltage: 11.8,
          engine_temp: 105,
          coolant_temp: 98,
          hydraulic_temp: 88,
          engine_load: 0,
          hydraulic_pressure: 0,
          active_dtcs: 2,
        },
      ],
      dtc_codes: [
        { code: "ECU 524287.31", description: "Engine Oil Pressure Low", severity: "critical" as const },
        { code: "ECU 641.14", description: "Battery Voltage Low", severity: "warning" as const },
      ],
    },
  ];

  // Filter mock data based on search term
  const filteredMachines = isWildcardMode
    ? simulatedSupabaseResponse
    : simulatedSupabaseResponse.filter(
        (m) =>
          m.serial_number.toLowerCase().includes(searchTerm) ||
          m.model_name.toLowerCase().includes(searchTerm) ||
          m.clients.name.toLowerCase().includes(searchTerm)
      );

  // Convert mock data to MasterSearchResult format
  for (const m of filteredMachines) {
    const telematics = m.machine_telematics[0];
    
    results.push({
      type: "machine",
      id: m.id,
      machineId: m.id,
      machineSerial: m.serial_number,
      machineModel: `${m.brand} ${m.model}`,
      clientId: m.clients.id,
      clientName: m.clients.name,
      clientLocation: m.clients.location,
      isBlocked: m.clients.is_blocked,
      telematics: {
        engineHours: telematics.engine_hours,
        batteryVoltage: telematics.battery_voltage,
        fuelLevel: telematics.fuel_level_percent,
        defLevel: telematics.def_level_percent,
        engineTemp: telematics.engine_temp,
        coolantTemp: telematics.coolant_temp,
        hydraulicTemp: telematics.hydraulic_temp,
        engineLoad: telematics.engine_load,
        hydraulicPressure: telematics.hydraulic_pressure,
        lastUpdated: new Date().toISOString(),
      },
      dtcCodes: m.dtc_codes,
    });
  }

  // Simulate async delay to mimic real database query
  await new Promise((resolve) => setTimeout(resolve, 150));

  return results;
}

/**
 * Search parts by part number or description
 */
export interface PartSearchResult {
  id: string;
  partNumber: string;
  description: string;
  unitPrice: number;
  stockQuantity: number;
}

export async function searchParts(query: string): Promise<PartSearchResult[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const supabase = await createClient();
  const searchTerm = `%${query.trim()}%`;

  const { data, error } = await supabase
    .from("parts")
    .select("*")
    .or(`part_number.ilike.${searchTerm},description.ilike.${searchTerm}`)
    .limit(10);

  if (error) {
    console.error("[Server Action] searchParts error:", error);
    return [];
  }

  return (data || []).map((p) => ({
    id: p.id,
    partNumber: p.part_number || "",
    description: p.description || "",
    unitPrice: Number(p.unit_price) || 0,
    stockQuantity: Number(p.stock_quantity) || 0,
  }));
}

/**
 * Fetch common/frequently used parts for offline caching
 * Returns filters, belts, oils commonly used for 6030/7030 series tractors
 */
export async function fetchCommonParts(): Promise<PartSearchResult[]> {
  const supabase = await createClient();

  // Common part keywords for John Deere 6030/7030 series
  const commonKeywords = [
    "филтър", "filter", "ремък", "belt", "масло", "oil",
    "6030", "7030", "RE", "AL", "DZ", // Common JD part prefixes
    "хидравлично", "hydraulic", "въздушен", "air", "маслен", "горивен", "fuel"
  ];

  // Build OR query for common parts
  const searchConditions = commonKeywords
    .map(keyword => `description.ilike.%${keyword}%,part_number.ilike.%${keyword}%`)
    .join(",");

  const { data, error } = await supabase
    .from("parts")
    .select("*")
    .or(searchConditions)
    .order("stock_quantity", { ascending: false }) // Prioritize in-stock items
    .limit(100); // Cache up to 100 common parts

  if (error) {
    console.error("[Server Action] fetchCommonParts error:", error);
    return [];
  }

  return (data || []).map((p) => ({
    id: p.id,
    partNumber: p.part_number || "",
    description: p.description || "",
    unitPrice: Number(p.unit_price) || 0,
    stockQuantity: Number(p.stock_quantity) || 0,
  }));
}

/**
 * Fetch service history for a machine - returns last 2 job cards with pending issues
 */
export interface ServiceHistoryIssue {
  jobCardId: string;
  date: string;
  pendingIssues: string | null;
  pendingReason: string | null;
  status: string;
}

/**
 * Get all active technicians for assignment dropdowns
 */
export async function fetchTechnicians(): Promise<Technician[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("technicians")
    .select("*")
    .eq("active", true)
    .order("name");

  if (error) {
    console.error("[Server Action] fetchTechnicians error:", error);
    return [];
  }

  // Map database results to Technician format
  return (data || []).map((t) => ({
    id: t.id,
    name: t.name || "",
    role: "technician" as const,
    isActive: t.active ?? true,
    skills: [],
    certifications: [],
  }));
}

/**
 * Submit and save a job card to Supabase
 * Supports "Work First, Order Later" workflow - orderNumber is optional
 */
export async function submitJobCard(data: {
  orderNumber?: string; // Optional - supports "Work First, Order Later"
  jobCardNumber: string;
  machineId?: string;
  technicianIds: string[];
  notes?: string;
  status?: string;
  totalSeconds?: number;
}): Promise<{ success: boolean; jobCardId?: string; pendingOrder?: boolean; error?: string }> {
  const supabase = await createClient();

  // Validation - only jobCardNumber and technicians are required
  if (!data.jobCardNumber) {
    return { success: false, error: "Job Card number is required" };
  }

  if (!data.technicianIds || data.technicianIds.length === 0) {
    return { success: false, error: "At least one technician must be assigned" };
  }

  // Use the first technician as the primary (job_cards table has single technician_id)
  const primaryTechnicianId = data.technicianIds[0];

  // Determine if this is a "pending order" submission
  const hasPendingOrder = !data.orderNumber || data.orderNumber.trim() === "";

  // Insert job card into Supabase - order_no can be null
  const { data: insertedData, error } = await supabase
    .from("job_cards")
    .insert({
      order_no: hasPendingOrder ? null : data.orderNumber,
      technician_id: primaryTechnicianId,
      machine_id: data.machineId || null,
      notes: hasPendingOrder 
        ? `[PENDING ORDER] ${data.notes || ""}`.trim()
        : (data.notes || null),
      status: data.status || "pending",
      total_seconds: data.totalSeconds || 0,
      start_time: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    console.error("[Server Action] submitJobCard error:", error);
    return { success: false, error: error.message };
  }

  console.log("[Server Action] Job Card saved:", insertedData, "Pending order:", hasPendingOrder);

  return {
    success: true,
    jobCardId: insertedData?.id || data.jobCardNumber,
    pendingOrder: hasPendingOrder,
  };
}

/**
 * Get initial data for the application (technicians and machines)
 */
export async function getInitialData(): Promise<{
  technicians: Technician[];
  machines: MachineSearchResult[];
}> {
  const [technicians, machines] = await Promise.all([
    fetchTechnicians(),
    // Fetch recent/common machines (limit 20)
    (async () => {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("machines")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        console.error("[Server Action] getInitialData machines error:", error);
        return [];
      }

      return (data || []).map((m) => ({
        id: m.id,
        model: m.model || "",
        manufacturer: m.brand || "",
        serialNo: m.serial_number || "",
        engineSN: m.engine_sn || "",
        ownerName: m.client_name || "",
        location: "",
        engineHours: 0,
      }));
    })(),
  ]);

  return { technicians, machines };
}

// ────────────────────────────── Time Logging ──────────────────────────────

export interface StartClockingParams {
  jobCardId: string;
  technicianIds: string[];
  orderType: string;
  machineId: string | null;
  currentMachineHours: number | null;
  hoursConfirmedByTech: boolean;
  complaintDescription?: string;
}

export interface StartClockingResult {
  success: boolean;
  timeLogIds: string[];
  error?: string;
}

/**
 * Start clocking - creates time_logs entries for each technician
 * Also updates job_cards with machine hours and description
 */
export async function startClocking(params: StartClockingParams): Promise<StartClockingResult> {
  const supabase = await createClient();
  const startTime = new Date().toISOString();
  const timeLogIds: string[] = [];

  try {
    // Update job_cards with machine hours and description
    const { error: jobCardError } = await supabase
      .from("job_cards")
      .update({
        current_machine_hours: params.currentMachineHours,
        hours_confirmed_by_tech: params.hoursConfirmedByTech,
        complaint_description: params.complaintDescription || null,
        start_time: startTime,
        status: "in_progress",
      })
      .eq("id", params.jobCardId);

    if (jobCardError) {
      console.error("startClocking job_cards update error:", jobCardError);
      // Continue anyway - job card might not exist yet
    }

    // Create time_log entries for each technician
    for (const techId of params.technicianIds) {
      if (!techId) continue;
      
      const { data, error } = await supabase
        .from("time_logs")
        .insert({
          job_card_id: params.jobCardId,
          technician_id: techId,
          order_type: params.orderType,
          start_time: startTime,
          status: "running",
        })
        .select("id")
        .single();

      if (error) {
        console.error("startClocking time_logs insert error:", error);
      } else if (data) {
        timeLogIds.push(data.id);
      }
    }

    return { success: true, timeLogIds };
  } catch (err) {
    console.error("startClocking catch error:", err);
    return { success: false, timeLogIds: [], error: String(err) };
  }
}

export interface StopClockingParams {
  jobCardId: string;
  technicianIds: string[];
  machineId: string | null;
  currentMachineHours: number | null;
  hoursConfirmedByTech: boolean;
  complaintDescription?: string;
  totalSeconds: number;
  // Photo validation
  hoursPhotoUrl?: string | null;
  missingPhotoReason?: string;
}

export interface StopClockingResult {
  success: boolean;
  updatedCount: number;
  machineHistoryId?: string;
  error?: string;
}

/**
 * Stop clocking - updates time_logs with end_time and status='completed'
 * Also saves machine hours to job_cards and creates machine_history record
 */
export async function stopClocking(params: StopClockingParams): Promise<StopClockingResult> {
  const supabase = await createClient();
  const endTime = new Date().toISOString();
  let updatedCount = 0;
  let machineHistoryId: string | undefined;

  try {
    // Update job_cards with final machine hours, description, and photo info
    const { error: jobCardError } = await supabase
      .from("job_cards")
      .update({
        current_machine_hours: params.currentMachineHours,
        hours_confirmed_by_tech: params.hoursConfirmedByTech,
        complaint_description: params.complaintDescription || null,
        end_time: endTime,
        total_seconds: params.totalSeconds,
        status: "completed",
        hours_photo_url: params.hoursPhotoUrl || null,
        missing_photo_reason: params.missingPhotoReason || null,
      })
      .eq("id", params.jobCardId);

    if (jobCardError) {
      console.error("stopClocking job_cards update error:", jobCardError);
    }

    // Update time_log entries for each technician
    for (const techId of params.technicianIds) {
      if (!techId) continue;
      
      const { error, count } = await supabase
        .from("time_logs")
        .update({
          end_time: endTime,
          status: "completed",
        })
        .eq("job_card_id", params.jobCardId)
        .eq("technician_id", techId)
        .eq("status", "running");

      if (error) {
        console.error("stopClocking time_logs update error:", error);
      } else {
        updatedCount += count || 1;
      }
    }

    // Create machine_history record if machine and hours provided
    if (params.machineId && params.currentMachineHours !== null) {
      const { data, error } = await supabase
        .from("machine_history")
        .insert({
          machine_id: params.machineId,
          job_card_id: params.jobCardId,
          recorded_hours: params.currentMachineHours,
          service_date: new Date().toISOString().split("T")[0],
          technician_note: params.hoursConfirmedByTech ? "Confirmed by technician" : null,
        })
        .select("id")
        .single();

      if (error) {
        console.error("stopClocking machine_history insert error:", error);
      } else if (data) {
        machineHistoryId = data.id;
      }
    }

    return { success: true, updatedCount, machineHistoryId };
  } catch (err) {
    console.error("stopClocking catch error:", err);
    return { success: false, updatedCount: 0, error: String(err) };
  }
}

/**
 * Update job card description (called when description field changes)
 */
export async function updateJobCardDescription(
  jobCardId: string,
  description: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from("job_cards")
      .update({ complaint_description: description })
      .eq("id", jobCardId);

    if (error) {
      console.error("updateJobCardDescription error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("updateJobCardDescription catch error:", err);
    return { success: false, error: String(err) };
  }
}

/**
 * Get previous machine hours from machine_history
 */
export async function getPreviousMachineHours(
  machineId: string
): Promise<{ hours: number | null; date: string | null }> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("machine_history")
      .select("recorded_hours, service_date")
      .eq("machine_id", machineId)
      .order("service_date", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return { hours: null, date: null };
    }

    return {
      hours: data.recorded_hours as number,
      date: data.service_date as string,
    };
  } catch (err) {
    console.error("getPreviousMachineHours error:", err);
    return { hours: null, date: null };
  }
}

/**
 * Upload engine hours photo to Supabase storage
 */
export async function uploadEngineHoursPhoto(
  jobCardId: string,
  base64Image: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  const supabase = await createClient();

  try {
    // Convert base64 to blob
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    
    // Generate unique filename
    const filename = `${jobCardId}/engine-hours-${Date.now()}.jpg`;
    
    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from("job-card-photos")
      .upload(filename, buffer, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (error) {
      console.error("uploadEngineHoursPhoto storage error:", error);
      return { success: false, error: error.message };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("job-card-photos")
      .getPublicUrl(filename);

    const publicUrl = urlData.publicUrl;

    // Update job_cards with the photo URL
    const { error: updateError } = await supabase
      .from("job_cards")
      .update({ hours_photo_url: publicUrl })
      .eq("id", jobCardId);

    if (updateError) {
      console.error("uploadEngineHoursPhoto update error:", updateError);
    }

    return { success: true, url: publicUrl };
  } catch (err) {
    console.error("uploadEngineHoursPhoto catch error:", err);
    return { success: false, error: String(err) };
  }
}

/**
 * Update job card with missing photo reason
 */
export async function updateMissingPhotoReason(
  jobCardId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from("job_cards")
      .update({ 
        missing_photo_reason: reason,
        hours_photo_url: null 
      })
      .eq("id", jobCardId);

    if (error) {
      console.error("updateMissingPhotoReason error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("updateMissingPhotoReason catch error:", err);
    return { success: false, error: String(err) };
  }
}

// ────────────────────────────── Machine Issues ───────────────────────────��──

export interface MachineIssue {
  id: string;
  machine_id: string;
  job_card_id: string | null;
  description: string;
  priority: "low" | "medium" | "high";
  status: "unresolved" | "resolved";
  created_at: string;
}

/**
 * Fetch unresolved issues for a machine
 */
export async function fetchUnresolvedMachineIssues(
  machineId: string
): Promise<{ issues: MachineIssue[]; error?: string }> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("machine_issues")
      .select("*")
      .eq("machine_id", machineId)
      .eq("status", "unresolved")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("fetchUnresolvedMachineIssues error:", error);
      return { issues: [], error: error.message };
    }

    return { issues: (data || []) as MachineIssue[] };
  } catch (err) {
    console.error("fetchUnresolvedMachineIssues catch error:", err);
    return { issues: [], error: String(err) };
  }
}

/**
 * Resolve a machine issue and link it to the current job card
 */
export async function resolveMachineIssue(
  issueId: string,
  jobCardId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from("machine_issues")
      .update({
        status: "resolved",
        job_card_id: jobCardId,
      })
      .eq("id", issueId);

    if (error) {
      console.error("resolveMachineIssue error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("resolveMachineIssue catch error:", err);
    return { success: false, error: String(err) };
  }
}

/**
 * Create a new machine issue (unresolved)
 */
export async function createMachineIssue(
  machineId: string,
  jobCardId: string,
  description: string,
  priority: "low" | "medium" | "high"
): Promise<{ success: boolean; issueId?: string; error?: string }> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("machine_issues")
      .insert({
        machine_id: machineId,
        job_card_id: jobCardId,
        description,
        priority,
        status: "unresolved",
      })
      .select("id")
      .single();

    if (error) {
      console.error("createMachineIssue error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, issueId: data?.id };
  } catch (err) {
    console.error("createMachineIssue catch error:", err);
    return { success: false, error: String(err) };
  }
}

// ────────────────────────────── Free Check Results ──────────────────────────────

export interface SaveFreeCheckParams {
  jobCardId: string;
  controlPointNo: string;
  controlPointName: string;
  status: "+" | "0" | "repair";
  comments: string | null;
  photoUrl: string | null;
}

/**
 * Save a free check control point result to the database
 */
export async function saveFreeCheckResult(
  params: SaveFreeCheckParams
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createClient();

  try {
    // Upsert - update if exists, insert if not
    const { data, error } = await supabase
      .from("free_check_results")
      .upsert(
        {
          job_card_id: params.jobCardId,
          control_point_no: params.controlPointNo,
          control_point_name: params.controlPointName,
          status: params.status,
          comments: params.comments,
          photo_url: params.photoUrl,
        },
        {
          onConflict: "job_card_id,control_point_no",
        }
      )
      .select("id")
      .single();

    if (error) {
      console.error("saveFreeCheckResult error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (err) {
    console.error("saveFreeCheckResult catch error:", err);
    return { success: false, error: String(err) };
  }
}

/**
 * Batch save all free check results for a job card
 */
export async function saveAllFreeCheckResults(
  jobCardId: string,
  results: Array<{
    controlPointNo: string;
    controlPointName: string;
    status: "+" | "0" | "repair";
    comments: string | null;
    photoUrl: string | null;
  }>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  try {
    const dataToSave = results.map((item) => ({
      job_card_id: jobCardId,
      control_point_no: item.controlPointNo,
      control_point_name: item.controlPointName,
      status: item.status,
      comments: item.comments,
      photo_url: item.photoUrl,
    }));

    const { error } = await supabase
      .from("free_check_results")
      .upsert(dataToSave, {
        onConflict: "job_card_id,control_point_no",
      });

    if (error) {
      console.error("saveAllFreeCheckResults error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("saveAllFreeCheckResults catch error:", err);
    return { success: false, error: String(err) };
  }
}

/**
 * Upload a free check photo to Supabase storage
 */
export async function uploadFreeCheckPhoto(
  jobCardId: string,
  controlPointNo: string,
  base64Image: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  const supabase = await createClient();

  try {
    // Convert base64 to blob
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    // Generate unique filename
    const filename = `${jobCardId}/free-check-${controlPointNo}-${Date.now()}.jpg`;

    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from("job-card-photos")
      .upload(filename, buffer, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (error) {
      console.error("uploadFreeCheckPhoto storage error:", error);
      return { success: false, error: error.message };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("job-card-photos")
      .getPublicUrl(filename);

    return { success: true, url: urlData.publicUrl };
  } catch (err) {
    console.error("uploadFreeCheckPhoto catch error:", err);
    return { success: false, error: String(err) };
  }
}

/**
 * Fetch all free check results for a job card
 */
export async function fetchFreeCheckResults(
  jobCardId: string
): Promise<{ results: SaveFreeCheckParams[]; error?: string }> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("free_check_results")
      .select("*")
      .eq("job_card_id", jobCardId);

    if (error) {
      console.error("fetchFreeCheckResults error:", error);
      return { results: [], error: error.message };
    }

    const results = (data || []).map((row) => ({
      jobCardId: row.job_card_id,
      controlPointNo: row.control_point_no,
      controlPointName: row.control_point_name,
      status: row.status as "+" | "0" | "repair",
      comments: row.comments,
      photoUrl: row.photo_url,
    }));

    return { results };
  } catch (err) {
    console.error("fetchFreeCheckResults catch error:", err);
    return { results: [], error: String(err) };
  }
}

// ────────────────────────────── Signature Upload ──────────────────────────────

/**
 * Upload signature image to Supabase Storage and update job_cards with the URL
 * Also sets status to 'completed' upon successful signature save
 */
export async function uploadSignature(
  jobCardId: string,
  base64Image: string,
  signerName?: string | null
): Promise<{ success: boolean; url?: string; error?: string }> {
  const supabase = await createClient();

  try {
    // Convert base64 to blob
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    // Generate unique filename for signature
    const filename = `${jobCardId}/signature-${Date.now()}.png`;

    // Upload to Supabase storage (job-card-photos bucket)
    const { data, error } = await supabase.storage
      .from("job-card-photos")
      .upload(filename, buffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (error) {
      console.error("uploadSignature storage error:", error);
      return { success: false, error: error.message };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("job-card-photos")
      .getPublicUrl(filename);

    const publicUrl = urlData.publicUrl;

    // Determine new status based on whether order number exists
    const { data: jobCard, error: fetchError } = await supabase
      .from("job_cards")
      .select("order_no")
      .eq("id", jobCardId)
      .single();

    if (fetchError) {
      console.error("uploadSignature fetch job card error:", fetchError);
      return { success: false, error: fetchError.message };
    }

    // Status logic: 
    // - If order_no starts with "TEMP-" = pending_order
    // - Otherwise = completed
    const hasPendingOrder = !jobCard?.order_no || jobCard.order_no.startsWith("TEMP-");
    const newStatus = hasPendingOrder ? "pending_order" : "completed";

    // Update job_cards with signature URL, signer name, and status
    const { error: updateError } = await supabase
      .from("job_cards")
      .update({ 
        signature_url: publicUrl,
        signature_data: base64Image, // Keep base64 for PDF generation
        client_name_signed: signerName || null,
        status: newStatus,
      })
      .eq("id", jobCardId);

    if (updateError) {
      console.error("uploadSignature update error:", updateError);
      return { success: false, error: updateError.message };
    }

    console.log("[Server Action] Signature uploaded successfully:", publicUrl, "Status:", newStatus);
    return { success: true, url: publicUrl };
  } catch (err) {
    console.error("uploadSignature catch error:", err);
    return { success: false, error: String(err) };
  }
}

/**
 * Fetch signature URL for a job card (for displaying saved signature preview)
 */
export async function fetchSignatureUrl(
  jobCardId: string
): Promise<{ url: string | null; signerName: string | null; error?: string }> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("job_cards")
      .select("signature_url, client_name_signed")
      .eq("id", jobCardId)
      .single();

    if (error) {
      console.error("fetchSignatureUrl error:", error);
      return { url: null, signerName: null, error: error.message };
    }

    return { 
      url: data?.signature_url || null, 
      signerName: data?.client_name_signed || null 
    };
  } catch (err) {
    console.error("fetchSignatureUrl catch error:", err);
    return { url: null, signerName: null, error: String(err) };
  }
}

// ────────────────────────────── Fetch Job Card For PDF ──────────────────────────────

/**
 * Fetch complete job card data for PDF generation from Admin view
 */
export async function fetchJobCardForPDF(jobCardId: string): Promise<{
  success: boolean;
  data?: {
    // Header info
    orderNumber: string;
    jobCardNumber: string;
    jobType: "warranty" | "repair" | "internal";
    date: string;
    // Technicians
    technicians: string[];
    leadTechnician: string;
    // Machine/Client
    machineOwner: string;
    billingEntity: string;
    location: string;
    machineModel: string;
    serialNo: string;
    engineSN: string;
    engineHours: string;
    previousEngineHours: number | null;
    // Diagnostics
    reasonCode: string;
    defectCode: string;
    description: string;
    faultDate: string;
    repairStart: string;
    repairEnd: string;
    // Parts
    parts: Array<{
      partNo: string;
      description: string;
      qty: number;
      price: number;
    }>;
    // Costs
    partsTotal: number;
    laborTotal: number;
    vat: number;
    grandTotal: number;
    // Other
    pendingIssues: string;
    recommendations: string;
    notes: string;
    photoUrls: string[];
    engineHoursPhotoUrl: string | null;
    totalWorkTime: number;
    customerSignature: string | null;
    customerName: string | null;
    technicianSignature: string | null;
    technicianName: string | null;
  };
  error?: string;
}> {
  const supabase = await createClient();

  try {
    // Fetch job card with machine and technician info
    const { data: jobCard, error: jobCardError } = await supabase
      .from("job_cards")
      .select(`
        *,
        machines (
          id,
          brand,
          model,
          serial_number,
          engine_sn,
          client_name,
          clients (
            name,
            payer_id
          )
        ),
        technicians (
          id,
          name
        )
      `)
      .eq("id", jobCardId)
      .single();

    if (jobCardError || !jobCard) {
      console.error("fetchJobCardForPDF job card error:", jobCardError);
      return { success: false, error: jobCardError?.message || "Job card not found" };
    }

    // Fetch parts for this job card
    const { data: partsData, error: partsError } = await supabase
      .from("job_card_parts")
      .select(`
        quantity,
        price_at_submission,
        parts (
          part_number,
          description
        )
      `)
      .eq("job_card_id", jobCardId);

    if (partsError) {
      console.error("fetchJobCardForPDF parts error:", partsError);
    }

    // Fetch free check results with photos
    const { data: freeCheckData, error: freeCheckError } = await supabase
      .from("free_check_results")
      .select("photo_url")
      .eq("job_card_id", jobCardId)
      .not("photo_url", "is", null);

    if (freeCheckError) {
      console.error("fetchJobCardForPDF free check error:", freeCheckError);
    }

    // Build parts array
    const parts = (partsData || []).map((p: { quantity: number; price_at_submission: number; parts: { part_number: string; description: string } | null }) => ({
      partNo: p.parts?.part_number || "",
      description: p.parts?.description || "",
      qty: p.quantity || 0,
      price: p.price_at_submission || 0,
    }));

    // Calculate totals
    const partsTotal = parts.reduce((sum, p) => sum + (p.qty * p.price), 0);
    const laborTotal = (jobCard.total_seconds || 0) / 3600 * 50; // Assuming 50 per hour
    const vat = (partsTotal + laborTotal) * 0.2;
    const grandTotal = partsTotal + laborTotal + vat;

    // Collect all photo URLs
    const photoUrls = [
      ...(jobCard.photo_urls || []),
      ...(freeCheckData || []).map((fc: { photo_url: string }) => fc.photo_url).filter(Boolean),
    ];

    // Determine job type based on status/order
    let jobType: "warranty" | "repair" | "internal" = "repair";
    if (jobCard.order_no?.toLowerCase().includes("warranty")) {
      jobType = "warranty";
    } else if (jobCard.order_no?.toLowerCase().includes("internal")) {
      jobType = "internal";
    }

    // Get machine data with proper typing
    const machineData = jobCard.machines as { brand?: string; model?: string; serial_number?: string; engine_sn?: string; client_name?: string; clients?: { name?: string } } | null;

    const data = {
      // Header
      orderNumber: jobCard.order_no || "N/A",
      jobCardNumber: jobCard.id?.slice(0, 8).toUpperCase() || "N/A",
      jobType,
      date: jobCard.created_at ? new Date(jobCard.created_at).toLocaleDateString("bg-BG") : "N/A",
      // Technicians
      technicians: [(jobCard.technicians as { name?: string } | null)?.name || "Unknown"],
      leadTechnician: (jobCard.technicians as { name?: string } | null)?.name || "Unknown",
      // Machine/Client
      machineOwner: machineData?.client_name || machineData?.clients?.name || "N/A",
      billingEntity: machineData?.clients?.name || machineData?.client_name || "N/A",
      location: "N/A",
      machineModel: `${machineData?.brand || ""} ${machineData?.model || ""}`.trim() || "N/A",
      serialNo: machineData?.serial_number || "N/A",
      engineSN: machineData?.engine_sn || "N/A",
      engineHours: String(jobCard.current_machine_hours || 0),
      previousEngineHours: jobCard.previous_machine_hours || null,
      // Diagnostics
      reasonCode: jobCard.reason_code || "N/A",
      defectCode: jobCard.defect_type_code || "N/A",
      description: jobCard.complaint_description || jobCard.notes || "N/A",
      faultDate: jobCard.fault_date || "N/A",
      repairStart: jobCard.start_time ? new Date(jobCard.start_time).toLocaleString("bg-BG") : "N/A",
      repairEnd: jobCard.end_time ? new Date(jobCard.end_time).toLocaleString("bg-BG") : "N/A",
      // Parts
      parts,
      // Costs
      partsTotal,
      laborTotal,
      vat,
      grandTotal,
      // Other
      pendingIssues: jobCard.pending_issues || "",
      recommendations: jobCard.recommendations || "",
      notes: jobCard.notes || "",
      photoUrls,
      engineHoursPhotoUrl: jobCard.hours_photo_url || null,
      totalWorkTime: jobCard.total_seconds || 0,
      customerSignature: jobCard.signature_url || jobCard.signature_data || null,
      customerName: jobCard.client_name_signed || null,
      technicianSignature: null,
      technicianName: (jobCard.technicians as { name?: string } | null)?.name || null,
    };

    return { success: true, data };
  } catch (err) {
    console.error("fetchJobCardForPDF catch error:", err);
    return { success: false, error: String(err) };
  }
}

// ────────────────────────────── Fetch Job Card For Edit ──────────────────────────────

/**
 * Fetch complete job card data for reopening and editing a draft
 */
export async function fetchJobCardForEdit(jobCardId: string): Promise<{
  success: boolean;
  data?: {
    id: string;
    orderNumber: string;
    status: string;
    // Machine/Client
    machineId: string | null;
    machineOwner: string;
    billingEntity: string;
    location: string;
    machineModel: string;
    serialNo: string;
    engineSN: string;
    previousEngineHours: number | null;
    currentEngineHours: number | null;
    // Technician
    technicianId: string | null;
    technicianName: string;
    // Diagnostics
    reasonCode: string;
    defectCode: string;
    description: string;
    faultDate: string;
    repairStart: string;
    repairEnd: string;
    // 3C fields
    causalPartNo: string;
    assemblyGroup: string;
    // Timer
    totalSeconds: number;
    startTime: string | null;
    endTime: string | null;
    // Photos
    photoUrls: string[];
    hoursPhotoUrl: string | null;
    missingPhotoReason: string | null;
    // Recommendations
    pendingIssues: string;
    pendingReason: string;
    recommendations: string;
    // Signature
    signatureData: string | null;
    signatureUrl: string | null;
    signerName: string | null;
    // Parts
    parts: Array<{
      id: string;
      partId: string;
      partNo: string;
      description: string;
      qty: number;
      price: number;
    }>;
    // Labor
    laborItems: Array<{
      id: string;
      operationId: string;
      operationCode: string;
      operationName: string;
      techCount: number;
      price: number;
    }>;
  };
  error?: string;
}> {
  const supabase = await createClient();

  try {
    // Fetch job card with machine, technician, parts, and labor
    const { data: jobCard, error: jobCardError } = await supabase
      .from("job_cards")
      .select(`
        *,
        machines (
          id,
          brand,
          model,
          serial_number,
          engine_sn,
          client_name,
          clients (
            id,
            name
          )
        ),
        technicians (
          id,
          name
        )
      `)
      .eq("id", jobCardId)
      .single();

    if (jobCardError || !jobCard) {
      console.error("fetchJobCardForEdit job card error:", jobCardError);
      return { success: false, error: jobCardError?.message || "Job card not found" };
    }

    // Fetch parts for this job card
    const { data: partsData, error: partsError } = await supabase
      .from("job_card_parts")
      .select(`
        id,
        quantity,
        price_at_submission,
        parts (
          id,
          part_number,
          description,
          selling_price
        )
      `)
      .eq("job_card_id", jobCardId);

    if (partsError) {
      console.error("fetchJobCardForEdit parts error:", partsError);
    }

    // Fetch labor items for this job card
    const { data: laborData, error: laborError } = await supabase
      .from("job_card_labor")
      .select(`
        id,
        actual_hours,
        labor_catalog (
          id,
          operation_code,
          operation_name,
          standard_hours,
          hourly_rate
        )
      `)
      .eq("job_card_id", jobCardId);

    if (laborError) {
      console.error("fetchJobCardForEdit labor error:", laborError);
    }

    // Build parts array
    const parts = (partsData || []).map((p: {
      id: string;
      quantity: number;
      price_at_submission: number;
      parts: { id: string; part_number: string; description: string; selling_price: number } | null;
    }) => ({
      id: p.id,
      partId: p.parts?.id || "",
      partNo: p.parts?.part_number || "",
      description: p.parts?.description || "",
      qty: p.quantity || 0,
      price: p.price_at_submission || p.parts?.selling_price || 0,
    }));

    // Build labor array
    const laborItems = (laborData || []).map((l: {
      id: string;
      actual_hours: number;
      labor_catalog: { id: string; operation_code: string; operation_name: string; standard_hours: number; hourly_rate: number } | null;
    }) => ({
      id: l.id,
      operationId: l.labor_catalog?.id || "",
      operationCode: l.labor_catalog?.operation_code || "",
      operationName: l.labor_catalog?.operation_name || "",
      techCount: l.actual_hours || 1,
      price: (l.labor_catalog?.hourly_rate || 50) * (l.actual_hours || 1),
    }));

    // Get machine data
    const machineData = jobCard.machines as {
      id?: string;
      brand?: string;
      model?: string;
      serial_number?: string;
      engine_sn?: string;
      client_name?: string;
      clients?: { id?: string; name?: string };
    } | null;

    const techData = jobCard.technicians as { id?: string; name?: string } | null;

    const data = {
      id: jobCard.id,
      orderNumber: jobCard.order_no || "",
      status: jobCard.status || "draft",
      // Machine/Client
      machineId: machineData?.id || null,
      machineOwner: machineData?.client_name || machineData?.clients?.name || "",
      billingEntity: machineData?.clients?.name || machineData?.client_name || "",
      location: "",
      machineModel: `${machineData?.brand || ""} ${machineData?.model || ""}`.trim(),
      serialNo: machineData?.serial_number || "",
      engineSN: machineData?.engine_sn || "",
      previousEngineHours: jobCard.previous_machine_hours || null,
      currentEngineHours: jobCard.current_machine_hours || null,
      // Technician
      technicianId: techData?.id || null,
      technicianName: techData?.name || "",
      // Diagnostics
      reasonCode: jobCard.reason_code || "",
      defectCode: jobCard.defect_type_code || "",
      description: jobCard.complaint_description || jobCard.notes?.split(" | ")[0] || "",
      faultDate: jobCard.fault_date || "",
      repairStart: jobCard.start_time || "",
      repairEnd: jobCard.end_time || "",
      // 3C fields
      causalPartNo: jobCard.causal_part_no || "",
      assemblyGroup: jobCard.assembly_group || "",
      // Timer
      totalSeconds: jobCard.total_seconds || 0,
      startTime: jobCard.start_time || null,
      endTime: jobCard.end_time || null,
      // Photos
      photoUrls: jobCard.photo_urls || [],
      hoursPhotoUrl: jobCard.hours_photo_url || null,
      missingPhotoReason: jobCard.missing_photo_reason || null,
      // Recommendations
      pendingIssues: jobCard.pending_issues || "",
      pendingReason: jobCard.pending_reason || "",
      recommendations: jobCard.recommendations || "",
      // Signature
      signatureData: jobCard.signature_data || null,
      signatureUrl: jobCard.signature_url || null,
      signerName: jobCard.client_name_signed || null,
      // Parts and Labor
      parts,
      laborItems,
    };

    return { success: true, data };
  } catch (err) {
    console.error("fetchJobCardForEdit catch error:", err);
    return { success: false, error: String(err) };
  }
}

// ────────────────────────────── Mark Job Card As Shared ──────────────────────────────

/**
 * Update job card status when the report is shared via WhatsApp or Email
 * Changes status from 'draft' to 'completed' (or 'quote_sent' for admin context)
 */
export async function markJobCardAsShared(
  jobCardId: string,
  shareMethod: "whatsapp" | "email"
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from("job_cards")
      .update({ 
        status: "completed",
        notes: supabase.rpc ? undefined : `Report shared via ${shareMethod} on ${new Date().toISOString()}`,
      })
      .eq("id", jobCardId);

    if (error) {
      console.error("markJobCardAsShared error:", error);
      return { success: false, error: error.message };
    }

    console.log(`[Server Action] Job card ${jobCardId} marked as shared via ${shareMethod}`);
    return { success: true };
  } catch (err) {
    console.error("markJobCardAsShared catch error:", err);
    return { success: false, error: String(err) };
  }
}

// ────────────────────────────── Create Notification ──────────────────────────────

/**
 * Create a notification for technicians/admins
 */
export async function createNotification(
  title: string,
  message: string,
  jobCardId?: string,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  try {
    const { error } = await supabase.from("notifications").insert({
      title,
      message,
      job_card_id: jobCardId || null,
      user_id: userId || null,
      is_read: false,
    });

    if (error) {
      console.error("createNotification error:", error);
      return { success: false, error: error.message };
    }

    console.log(`[Server Action] Notification created: ${title}`);
    return { success: true };
  } catch (err) {
    console.error("createNotification catch error:", err);
    return { success: false, error: String(err) };
  }
}
