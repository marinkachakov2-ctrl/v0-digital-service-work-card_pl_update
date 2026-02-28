import { NextResponse } from "next/server";

export interface JobCardPayload {
  orderNumber: string;
  jobCardNumber: string;
  jobType: "warranty" | "repair" | "internal";
  assignedTechnicians: string[];
  leadTechnicianId: string | null;
  clockAtJobLevel: boolean;
  elapsedSeconds: number;
  clientData: {
    machineOwner: string;
    billingEntity: string;
    location: string;
    machineModel: string;
    serialNo: string;
    engineSN: string;
    previousEngineHours: number | null;
  } | null;
  diagnostics: {
    reasonCode: string;
    defectCode: string;
    description: string;
    faultDate: string;
    repairStart: string;
    repairEnd: string;
    engineHours: string;
  };
  parts: Array<{
    id: string;
    partNo: string;
    description: string;
    qty: number;
    price: number;
  }>;
  laborItems: Array<{
    id: string;
    operationName: string;
    techCount: number;
    price: number;
    notes: string;
  }>;
  paymentMethod: "bank" | "cash";
  totals: {
    partsTotal: number;
    laborTotal: number;
    vat: number;
    grandTotal: number;
  };
  isSigned: boolean;
  submittedAt: string;
}

export async function POST(request: Request) {
  try {
    const data: JobCardPayload = await request.json();

    // Log the submitted data to console (for development)
    console.log("========================================");
    console.log("[v0] Job Card Submitted:");
    console.log("========================================");
    console.log("Order Number:", data.orderNumber);
    console.log("Job Card Number:", data.jobCardNumber);
    console.log("Job Type:", data.jobType);
    console.log("Technicians:", data.assignedTechnicians);
    console.log("Lead Technician:", data.leadTechnicianId);
    console.log("Elapsed Time (seconds):", data.elapsedSeconds);
    console.log("Client Data:", JSON.stringify(data.clientData, null, 2));
    console.log("Diagnostics:", JSON.stringify(data.diagnostics, null, 2));
    console.log("Parts:", JSON.stringify(data.parts, null, 2));
    console.log("Labor Items:", JSON.stringify(data.laborItems, null, 2));
    console.log("Payment Method:", data.paymentMethod);
    console.log("Totals:", JSON.stringify(data.totals, null, 2));
    console.log("Is Signed:", data.isSigned);
    console.log("Submitted At:", data.submittedAt);
    console.log("========================================");

    // In production, you would save to database here
    // await db.jobCards.create({ data });

    return NextResponse.json({
      success: true,
      message: "Job card saved successfully",
      jobCardNumber: data.jobCardNumber,
      submittedAt: data.submittedAt,
    });
  } catch (error) {
    console.error("[v0] Error saving job card:", error);
    return NextResponse.json(
      { success: false, message: "Failed to save job card" },
      { status: 500 }
    );
  }
}
