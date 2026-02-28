// ────────────────────────────── Database Types ──────────────────────────────
// These interfaces are designed to be compatible with Supabase/Postgres schema

export interface Technician {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  specialization?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Machine {
  id: string;
  model: string;
  manufacturer: string;
  serialNo: string;
  engineSN?: string;
  engineHours: number;
  previousEngineHours?: number;
  ownerId: string;
  ownerName: string;
  location?: string;
  status: "active" | "maintenance" | "retired";
  lastServiceDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  vatNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export interface JobCard {
  id: string;                          // Job Card Number (JCN)
  orderNumber: string;                 // Order Number (ON)
  type: "warranty" | "repair" | "internal";
  status: "pending" | "in_progress" | "completed" | "signed" | "cancelled";
  
  // Machine info
  machineId: string;
  machineModel: string;
  serialNo: string;
  engineSN?: string;
  engineHours: number;
  previousEngineHours?: number;
  
  // Customer info
  customerId: string;
  customerName: string;
  billingEntityId?: string;
  billingEntityName?: string;
  location?: string;
  
  // Technician info
  assignedTechnicianIds: string[];
  leadTechnicianId?: string;
  clockAtJobLevel: boolean;
  
  // Diagnostics
  reasonCode?: string;
  defectCode?: string;
  description?: string;
  faultDate?: string;
  repairStartDate?: string;
  repairEndDate?: string;
  
  // Time tracking
  plannedHours: number;
  actualHours: number;
  elapsedSeconds: number;
  
  // Financial
  laborTotal: number;
  partsTotal: number;
  vat: number;
  grandTotal: number;
  paymentMethod: "bank" | "cash";
  
  // Signature
  isSigned: boolean;
  signedAt?: string;
  signatureData?: string;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
}

export interface Part {
  id: string;
  jobCardId: string;
  partNumber: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface LaborItem {
  id: string;
  jobCardId: string;
  description: string;
  technicianCount: number;
  pricePerTech: number;
  totalPrice: number;
}

// Search result type for machine search
export interface MachineSearchResult {
  id: string;
  model: string;
  manufacturer: string;
  serialNo: string;
  ownerName: string;
  location?: string;
  engineHours: number;
}
