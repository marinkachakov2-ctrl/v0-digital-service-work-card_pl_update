"use server";

// ────────────────────────────── Server Actions ──────────────────────────────
// These actions run on the server and can be called from client components.
// When integrating with Supabase, replace mock data imports with database queries.

import { 
  advancedSearchMachines, 
  getMachineBySerialNo, 
  getActiveTechnicians,
  generateOrderNumber,
  generateJobCardNumber,
  getInitialData,
} from "./data";
import type { MachineSearchResult, Technician, Machine } from "./types";

/**
 * Search machines by query string across multiple fields:
 * - Brand (manufacturer)
 * - Model
 * - Serial Number
 * - Client Name (owner)
 * All searches are case-insensitive and support multiple search terms.
 */
export async function searchMachines(query: string): Promise<MachineSearchResult[]> {
  // Simulate network delay for realistic UX testing
  await new Promise((resolve) => setTimeout(resolve, 150));

  const results = advancedSearchMachines(query);

  // Map to search result format with generated order numbers
  return results.map((m) => ({
    id: m.id,
    model: m.model,
    manufacturer: m.manufacturer,
    serialNo: m.serialNo,
    engineSN: m.engineSN,
    ownerName: m.ownerName,
    location: m.location,
    engineHours: m.engineHours,
    // Pre-generate order/job card numbers for this machine
    suggestedOrderNumber: generateOrderNumber(m.id),
    suggestedJobCardNumber: generateJobCardNumber(),
  }));
}

/**
 * Get full machine details by serial number (for QR code scan)
 */
export async function getMachineBySerial(serialNo: string): Promise<Machine | null> {
  await new Promise((resolve) => setTimeout(resolve, 100));
  
  const machine = getMachineBySerialNo(serialNo);
  return machine || null;
}

/**
 * Get all active technicians for assignment dropdowns
 */
export async function fetchTechnicians(): Promise<Technician[]> {
  await new Promise((resolve) => setTimeout(resolve, 100));
  
  return getActiveTechnicians();
}

/**
 * Validate and process job card submission
 * This will be expanded to insert into database
 */
export async function submitJobCard(data: {
  orderNumber: string;
  jobCardNumber: string;
  machineId?: string;
  customerId?: string;
  technicianIds: string[];
  // ... other fields as needed
}): Promise<{ success: boolean; jobCardId?: string; error?: string }> {
  await new Promise((resolve) => setTimeout(resolve, 200));

  // Validation
  if (!data.orderNumber || !data.jobCardNumber) {
    return { success: false, error: "Missing required fields" };
  }

  if (data.technicianIds.length === 0) {
    return { success: false, error: "At least one technician must be assigned" };
  }

  // Simulate successful save
  console.log("[Server Action] Job Card submitted:", data);
  
  return { 
    success: true, 
    jobCardId: data.jobCardNumber,
  };
}
