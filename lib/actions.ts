"use server";

// ────────────────────────────── Server Actions ──────────────────────────────
// These actions run on the server and perform real Supabase database queries.

import { createClient } from "./supabase/server";
import { generateOrderNumber, generateJobCardNumber } from "./data";
import type { MachineSearchResult, Technician, PayerStatus, MachineWithPayerInfo } from "./types";

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
 * Fetch service history for a machine - returns last 2 job cards with pending issues
 */
export interface ServiceHistoryIssue {
  jobCardId: string;
  date: string;
  pendingIssues: string | null;
  pendingReason: string | null;
  status: string;
}

export async function fetchMachineServiceHistory(machineId: string): Promise<ServiceHistoryIssue[]> {
  if (!machineId) return [];

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("job_cards")
    .select("id, created_at, pending_issues, pending_reason, status")
    .eq("machine_id", machineId)
    .not("pending_issues", "is", null)
    .order("created_at", { ascending: false })
    .limit(2);

  if (error) {
    console.error("[Server Action] fetchMachineServiceHistory error:", error);
    return [];
  }

  return (data || []).map((jc) => ({
    jobCardId: jc.id,
    date: jc.created_at,
    pendingIssues: jc.pending_issues,
    pendingReason: jc.pending_reason,
    status: jc.status || "unknown",
  }));
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
