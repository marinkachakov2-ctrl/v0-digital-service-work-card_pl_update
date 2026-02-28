import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export interface JobCardPayload {
  orderNumber?: string;
  jobCardNumber: string;
  jobType: "warranty" | "repair" | "internal";
  assignedTechnicians: string[];
  leadTechnicianId: string | null;
  clockAtJobLevel: boolean;
  timerData?: {
    status: string;
    elapsedSeconds: number;
    startedAt: string | null;
  };
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
  machineId?: string;
  // Signature workflow
  status?: "draft" | "completed";
  signatureData?: string | null;
  signerName?: string | null;
}

export async function POST(request: Request) {
  try {
    const data: JobCardPayload = await request.json();

    // Validation
    const validTechnicians = (data.assignedTechnicians || []).filter(
      (t) => t && t.trim() !== ""
    );

    if (validTechnicians.length === 0) {
      console.error("SUPABASE ERROR: No technicians assigned");
      return NextResponse.json(
        { success: false, message: "Моля, изберете поне един техник." },
        { status: 400 }
      );
    }

    // Get Supabase client
    const supabase = await createClient();

    // Prepare data for insert - map to exact column names
    const primaryTechnicianId = validTechnicians[0];
    const hasPendingOrder = !data.orderNumber || data.orderNumber.trim() === "";
    const totalSeconds = data.timerData?.elapsedSeconds ?? 0;

    // Build notes from diagnostics and other info
    const notesArray: string[] = [];
    if (hasPendingOrder) notesArray.push("[PENDING ORDER]");
    if (data.signerName) notesArray.push(`Signed by: ${data.signerName}`);
    if (data.diagnostics?.description) notesArray.push(data.diagnostics.description);
    if (data.clientData?.machineModel) notesArray.push(`Machine: ${data.clientData.machineModel}`);
    if (data.clientData?.serialNo) notesArray.push(`Serial: ${data.clientData.serialNo}`);

    // Status: 'draft' by default, 'completed' only when signed
    const cardStatus = data.signatureData ? "completed" : "draft";

    const insertData = {
      technician_id: primaryTechnicianId, // UUID string
      machine_id: data.machineId || null, // UUID string or null
      order_no: hasPendingOrder ? null : data.orderNumber, // text or null
      start_time: data.timerData?.startedAt || new Date().toISOString(), // timestamp
      end_time: data.submittedAt || new Date().toISOString(), // timestamp
      total_seconds: Math.floor(totalSeconds), // integer
      status: cardStatus, // 'draft' or 'completed'
      notes: notesArray.join(" | ") || null, // text or null
      signature_data: data.signatureData || null, // Base64 signature or null
    };

    console.log("SUPABASE INSERT DATA:", JSON.stringify(insertData, null, 2));

    // Insert into Supabase with explicit await
    const { data: insertedData, error } = await supabase
      .from("job_cards")
      .insert(insertData)
      .select("id")
      .single();

    // Check for errors BEFORE returning success
    if (error) {
      console.error("SUPABASE ERROR:", error);
      console.error("SUPABASE ERROR MESSAGE:", error.message);
      console.error("SUPABASE ERROR DETAILS:", error.details);
      console.error("SUPABASE ERROR HINT:", error.hint);
      return NextResponse.json(
        { 
          success: false, 
          message: `Database error: ${error.message}`,
          error: error.message 
        },
        { status: 500 }
      );
    }

    // Verify we got an ID back
    if (!insertedData?.id) {
      console.error("SUPABASE ERROR: No ID returned from insert");
      return NextResponse.json(
        { success: false, message: "Insert succeeded but no ID returned" },
        { status: 500 }
      );
    }

    console.log("SUPABASE SUCCESS: Job Card saved with ID:", insertedData.id);

    return NextResponse.json({
      success: true,
      message: "Job card saved successfully",
      jobCardId: insertedData.id,
      pendingOrder: hasPendingOrder,
    });
  } catch (error) {
    console.error("SUPABASE ERROR: Unexpected error:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : "Unexpected error occurred" 
      },
      { status: 500 }
    );
  }
}
