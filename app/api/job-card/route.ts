import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export interface JobCardPayload {
  existingJobCardId?: string; // If provided, UPDATE instead of INSERT
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
    // 3C fields
    causalPartNo?: string | null;
    assemblyGroup?: string | null;
    correction?: string | null;
    workDone?: string | null;
    // Photo URLs from Supabase Storage
    photo_urls?: string[];
    hour_meter_photo?: string | null;
    engine_hours_photo_missing_reason?: string | null;
  };
  parts: Array<{
    id: string;
    partId?: string; // UUID from parts table
    partNo: string;
    description: string;
    qty: number;
    price: number;
    stockQuantity?: number;
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
  payerId?: string;
  // Recommendations and pending issues
  pendingIssues?: string | null;
  pendingReason?: string | null;
  recommendations?: string | null;
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

    // ═══════════════════════════════════════════════════════════════════════════
    // SANDBOX SIMULATION: Check for mock IDs before attempting database operations
    // This allows testing the UI in v0 sandbox without valid Supabase UUIDs
    // ═══════════════════════════════════════════════════════════════════════════
    const isMockId = (id: string | undefined | null): boolean => {
      if (!id) return false;
      if (id.startsWith("mock-")) return true;
      // Check for valid UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return !uuidRegex.test(id);
    };

    const primaryTechnicianId = validTechnicians[0];
    const hasMockData = isMockId(data.machineId) || isMockId(primaryTechnicianId) || isMockId(data.payerId);

    if (hasMockData) {
      console.log("[Sandbox] Mock data detected - simulating save");
      console.log("[Sandbox] Payload:", JSON.stringify({
        machineId: data.machineId,
        technicianId: primaryTechnicianId,
        payerId: data.payerId,
        orderNumber: data.orderNumber,
        jobType: data.jobType,
        status: data.status,
      }, null, 2));

      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Generate mock job card ID
      const mockJobCardId = `JC-${Date.now().toString(36).toUpperCase()}`;

      console.log("[Sandbox] Simulated save successful. Mock Job Card ID:", mockJobCardId);

      return NextResponse.json({
        success: true,
        jobCardId: mockJobCardId,
        pendingOrder: !data.orderNumber || data.orderNumber.trim() === "",
        message: "[Sandbox] Job card saved successfully (simulated)",
      });
    }

    // Get Supabase client (only for real UUID data)
    const supabase = await createClient();

    // Prepare data for insert - map to exact column names
    const hasPendingOrder = !data.orderNumber || data.orderNumber.trim() === "";
    const totalSeconds = data.timerData?.elapsedSeconds ?? 0;

    // Generate temporary internal order number if none provided
    // Format: TEMP-YYYY-XXXX where XXXX is random 4-digit number
    let orderNoToSave = data.orderNumber?.trim() || null;
    if (hasPendingOrder) {
      const year = new Date().getFullYear();
      const randomSuffix = Math.floor(1000 + Math.random() * 9000); // 1000-9999
      orderNoToSave = `TEMP-${year}-${randomSuffix}`;
    }

    // Build notes from diagnostics and other info
    const notesArray: string[] = [];
    if (hasPendingOrder) notesArray.push("[PENDING ORDER]");
    if (data.signerName) notesArray.push(`Signed by: ${data.signerName}`);
    if (data.diagnostics?.description) notesArray.push(data.diagnostics.description);
    if (data.clientData?.machineModel) notesArray.push(`Machine: ${data.clientData.machineModel}`);
    if (data.clientData?.serialNo) notesArray.push(`Serial: ${data.clientData.serialNo}`);

    // Status logic:
    // - 'draft' = Not signed yet
    // - 'pending_order' = Signed but no order number
    // - 'completed' = Signed and has order number
    let cardStatus: "draft" | "pending_order" | "completed" = "draft";
    if (data.signatureData) {
      cardStatus = hasPendingOrder ? "pending_order" : "completed";
    }

    // Collect all photo URLs: diagnostic photos + engine hours photo
    const allPhotoUrls: string[] = [];
    if (data.diagnostics?.photo_urls?.length) {
      allPhotoUrls.push(...data.diagnostics.photo_urls);
    }
    if (data.diagnostics?.hour_meter_photo) {
      allPhotoUrls.push(data.diagnostics.hour_meter_photo);
    }

    // Add engine hours photo missing reason to notes if provided
    if (data.diagnostics?.engine_hours_photo_missing_reason) {
      notesArray.push(`Engine hours photo missing: ${data.diagnostics.engine_hours_photo_missing_reason}`);
    }

    const insertData = {
      technician_id: primaryTechnicianId, // UUID string
      machine_id: data.machineId || null, // UUID string or null
      order_no: orderNoToSave, // text - either real order number or TEMP-YYYY-XXXX
      start_time: data.timerData?.startedAt || new Date().toISOString(), // timestamp
      end_time: data.submittedAt || new Date().toISOString(), // timestamp
      total_seconds: Math.floor(totalSeconds), // integer
      status: cardStatus, // 'draft' or 'completed'
      notes: notesArray.join(" | ") || null, // text or null
      signature_data: data.signatureData || null, // Base64 signature or null
      photo_urls: allPhotoUrls.length > 0 ? allPhotoUrls : null, // text[] array of Supabase Storage URLs
      payer_id: data.payerId || null, // UUID of the billing entity (payer)
      client_name_signed: data.signerName || null, // Name of person who signed
      // Recommendations and pending issues
      pending_issues: data.pendingIssues || null, // text - issues not resolved
      pending_reason: data.pendingReason || null, // text - reason for not resolving
      recommendations: data.recommendations || null, // text - general recommendations
      // 3C fields - warranty specific
      causal_part_no: data.diagnostics?.causalPartNo || null, // text - catalog number of causal part
      assembly_group: data.diagnostics?.assemblyGroup || null, // text - assembly group of failure
      // Reason and defect codes
      reason_code: data.diagnostics?.reasonCode || null,
      defect_type_code: data.diagnostics?.defectCode || null,
      // Complaint description (C1)
      complaint_description: data.diagnostics?.description || null,
      // Fault date
      fault_date: data.diagnostics?.faultDate || null,
      // Hours photo
      hours_photo_url: data.diagnostics?.hour_meter_photo || null,
      missing_photo_reason: data.diagnostics?.engine_hours_photo_missing_reason || null,
    };

    // Determine if this is an UPDATE or INSERT operation
    const isUpdate = !!data.existingJobCardId;
    
    console.log(isUpdate ? "SUPABASE UPDATE DATA:" : "SUPABASE INSERT DATA:", JSON.stringify(insertData, null, 2));

    let resultId: string;

    if (isUpdate) {
      // UPDATE existing job card
      console.log("SUPABASE: Updating existing job card:", data.existingJobCardId);
      
      const { data: updatedData, error } = await supabase
        .from("job_cards")
        .update(insertData)
        .eq("id", data.existingJobCardId)
        .select("id")
        .single();

      if (error) {
        console.error("SUPABASE UPDATE ERROR:", error);
        return NextResponse.json(
          { success: false, message: `Database error: ${error.message}` },
          { status: 500 }
        );
      }

      if (!updatedData?.id) {
        console.error("SUPABASE ERROR: No ID returned from update");
        return NextResponse.json(
          { success: false, message: "Update succeeded but no ID returned" },
          { status: 500 }
        );
      }

      resultId = updatedData.id;
      console.log("SUPABASE SUCCESS: Job Card updated with ID:", resultId);
    } else {
      // INSERT new job card
      const { data: insertedData, error } = await supabase
        .from("job_cards")
        .insert(insertData)
        .select("id")
        .single();

      if (error) {
        console.error("SUPABASE INSERT ERROR:", error);
        console.error("SUPABASE ERROR MESSAGE:", error.message);
        console.error("SUPABASE ERROR DETAILS:", error.details);
        console.error("SUPABASE ERROR HINT:", error.hint);
        return NextResponse.json(
          { success: false, message: `Database error: ${error.message}` },
          { status: 500 }
        );
      }

      if (!insertedData?.id) {
        console.error("SUPABASE ERROR: No ID returned from insert");
        return NextResponse.json(
          { success: false, message: "Insert succeeded but no ID returned" },
          { status: 500 }
        );
      }

      resultId = insertedData.id;
      console.log("SUPABASE SUCCESS: Job Card created with ID:", resultId);
    }

    // Save parts to job_card_parts table (only parts with partId from database)
    const partsWithDbId = data.parts.filter((p) => p.partId);
    
    if (partsWithDbId.length > 0) {
      // First, delete existing parts for this job card (for UPDATE scenario)
      if (isUpdate) {
        await supabase
          .from("job_card_parts")
          .delete()
          .eq("job_card_id", resultId);
      }

      // Insert new parts
      const partsToInsert = partsWithDbId.map((p) => ({
        job_card_id: resultId,
        part_id: p.partId,
        quantity: p.qty,
        price_at_submission: p.price,
      }));

      const { error: partsError } = await supabase
        .from("job_card_parts")
        .insert(partsToInsert);

      if (partsError) {
        console.error("SUPABASE PARTS INSERT ERROR:", partsError);
        // Don't fail the whole request, just log the error
      } else {
        console.log("SUPABASE SUCCESS: Inserted", partsToInsert.length, "parts for job card:", resultId);
      }
    }

    // 4. Save labor items to job_card_labor table
    if (data.laborItems && data.laborItems.length > 0) {
      // First delete existing labor items for this job card (for update scenarios)
      if (isUpdate) {
        await supabase
          .from("job_card_labor")
          .delete()
          .eq("job_card_id", resultId);
      }

      const laborToInsert = data.laborItems
        .filter((l: { operationId?: string }) => l.operationId) // Only insert items with operationId from catalog
        .map((l: { operationId: string; techCount?: number; price?: number; notes?: string }) => ({
          job_card_id: resultId,
          operation_id: l.operationId,
          technician_name: data.assignedTechnicians?.[0] || "Unknown",
          actual_hours: l.techCount || 1, // Use techCount as actual hours for now
          start_time: data.diagnostics?.repairStart || null,
          end_time: data.diagnostics?.repairEnd || null,
        }));

      if (laborToInsert.length > 0) {
        const { error: laborError } = await supabase
          .from("job_card_labor")
          .insert(laborToInsert);

        if (laborError) {
          console.error("SUPABASE LABOR INSERT ERROR:", laborError);
          // Don't fail the whole request, just log the error
        } else {
          console.log("SUPABASE SUCCESS: Inserted", laborToInsert.length, "labor items for job card:", resultId);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: isUpdate ? "Job card updated successfully" : "Job card created successfully",
      jobCardId: resultId,
      pendingOrder: hasPendingOrder,
      tempOrderNo: hasPendingOrder ? orderNoToSave : null, // Return temp order number if generated
      status: data.signatureData ? (hasPendingOrder ? "pending_order" : "completed") : "draft",
      isUpdate,
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
