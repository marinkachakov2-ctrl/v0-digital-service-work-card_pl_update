"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { WorkCardHeader } from "@/components/work-card/header";
import { ClientSection } from "@/components/work-card/client-section";
import { ChecklistModal, ChecklistButton, getDefaultChecklist, type ChecklistItem } from "@/components/work-card/checklist-modal";
import { DiagnosticsSection, type FaultPhoto } from "@/components/work-card/diagnostics-section";
import { PartsTable } from "@/components/work-card/parts-table";
import { LaborTable } from "@/components/work-card/labor-table";
import { UnresolvedIssuesAlert, UnresolvedIssuesSection, type UnresolvedIssue } from "@/components/work-card/unresolved-issues";
import { Footer } from "@/components/work-card/footer";
import { useClocking } from "@/lib/clocking-context";

export interface PartItem {
  id: string;
  partNo: string;
  description: string;
  qty: number;
  price: number;
}

export interface LaborItem {
  id: string;
  operationName: string;
  techCount: number;
  price: number;
  notes: string;
}

export interface ClientData {
  machineOwner: string;
  billingEntity: string;
  location: string;
  machineModel: string;
  serialNo: string;
  engineSN: string;
  previousEngineHours: number | null;
}

export default function WorkCardPage() {
  const { isAdmin, setIsAdmin, signJobCard } = useClocking();

  const [searchValue, setSearchValue] = useState("");
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [isScanned, setIsScanned] = useState(false);

  // Order hierarchy
  const [orderNumber, setOrderNumber] = useState("");
  const [jobCardNumber, setJobCardNumber] = useState("");
  const [jobType, setJobType] = useState<"warranty" | "repair" | "internal">("repair");

  // Technicians — dynamic list
  const [assignedTechnicians, setAssignedTechnicians] = useState<string[]>([""]);
  const [leadTechnicianId, setLeadTechnicianId] = useState<string | null>(null);
  const [clockAtJobLevel, setClockAtJobLevel] = useState(false);

  // Signature
  const [isSigned, setIsSigned] = useState(false);

  // Timer
  const [timerStatus, setTimerStatus] = useState<"idle" | "running" | "paused">("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const formatTime = useCallback((totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }, []);

  const elapsedTime = formatTime(elapsedSeconds);

  useEffect(() => {
    if (timerStatus === "running") {
      intervalRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [timerStatus]);

  const handleTimerStart = () => setTimerStatus("running");
  const handleTimerPause = () => setTimerStatus("paused");
  const handleTimerStop = () => {
    setTimerStatus("idle");
    setElapsedSeconds(0);
  };

  // Job type handlers
  const handleJobTypeChange = (type: "warranty" | "repair" | "internal") => {
    setJobType(type);
  };

  // Diagnostics
  const [reasonCode, setReasonCode] = useState("");
  const [defectCode, setDefectCode] = useState("");
  const [description, setDescription] = useState("");
  const [faultDate, setFaultDate] = useState("");
  const [repairStart, setRepairStart] = useState("");
  const [repairEnd, setRepairEnd] = useState("");
  const [engineHours, setEngineHours] = useState("");
  const [faultPhotos, setFaultPhotos] = useState<FaultPhoto[]>([]);

  // Engine hours photo validation
  const [engineHoursPhoto, setEngineHoursPhoto] = useState<FaultPhoto | null>(null);
  const [engineHoursPhotoMissingReason, setEngineHoursPhotoMissingReason] = useState("");

  // Checklist
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>(getDefaultChecklist());
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [checklistCompleted, setChecklistCompleted] = useState(false);
  const [checklistSkipped, setChecklistSkipped] = useState(false);
  const [checklistSkipReason, setChecklistSkipReason] = useState("");

  // Unresolved issues
  const [unresolvedIssues, setUnresolvedIssues] = useState<UnresolvedIssue[]>([]);
  // Simulated previous unresolved issues (would come from DB in production)
  const [previousUnresolvedIssues] = useState<UnresolvedIssue[]>([
    {
      id: "prev-1",
      description: "Хидравличен маркуч на десен цилиндър показва микропукнатини",
      severity: "high",
      fromPreviousCard: true,
      previousCardId: "JC-0015",
    },
    {
      id: "prev-2",
      description: "Лек теч на масло при предната ос",
      severity: "medium",
      fromPreviousCard: true,
      previousCardId: "JC-0012",
    },
  ]);

  // Parts & Labor
  const [parts, setParts] = useState<PartItem[]>([]);
  const [laborItems, setLaborItems] = useState<LaborItem[]>([]);

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<"bank" | "cash">("bank");

  const handleSimulateScan = () => {
    setClientData({
      machineOwner: "Агроинвест ЕООД",
      billingEntity: "Агроинвест ЕООД",
      location: "София, България",
      machineModel: "John Deere 8370R",
      serialNo: "RW8370R001234",
      engineSN: "PE6068T123456",
      previousEngineHours: 4520,
    });
    setSearchValue("RW8370R001234");
    setIsScanned(true);
    setOrderNumber("ON-5521");
    setJobCardNumber("JC-0018");
  };

  const handleBillingEntityChange = (value: string) => {
    if (clientData) {
      setClientData({ ...clientData, billingEntity: value });
    }
  };

  const handleSign = () => {
    setIsSigned(true);
    // Auto-stop timer on signature
    if (timerStatus === "running" || timerStatus === "paused") {
      setTimerStatus("idle");
      setElapsedSeconds(0);
    }
    if (jobCardNumber) {
      signJobCard(jobCardNumber);
    }
  };

  // Calculate totals
  const partsTotal = useMemo(() => {
    return parts.reduce((sum, part) => sum + part.qty * part.price, 0);
  }, [parts]);

  const laborTotal = useMemo(() => {
    return laborItems.reduce((sum, item) => sum + item.techCount * item.price, 0);
  }, [laborItems]);

  const subtotal = partsTotal + laborTotal;
  const vat = subtotal * 0.2;
  const grandTotal = subtotal + vat;

  // Save card handler
  const handleSaveCard = useCallback(async (): Promise<{ success: boolean; message?: string }> => {
    try {
      const payload = {
        orderNumber,
        jobCardNumber,
        jobType,
        assignedTechnicians,
        leadTechnicianId,
        clockAtJobLevel,
        elapsedSeconds,
        clientData,
        diagnostics: {
          reasonCode,
          defectCode,
          description,
          faultDate,
          repairStart,
          repairEnd,
          engineHours,
        },
        parts,
        laborItems,
        paymentMethod,
        totals: {
          partsTotal,
          laborTotal,
          vat,
          grandTotal,
        },
        isSigned,
        submittedAt: new Date().toISOString(),
      };

      const response = await fetch("/api/job-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      return { success: result.success, message: result.message };
    } catch (error) {
      console.error("[v0] Error saving card:", error);
      return { success: false, message: "Network error" };
    }
  }, [
    orderNumber, jobCardNumber, jobType, assignedTechnicians, leadTechnicianId,
    clockAtJobLevel, elapsedSeconds, clientData, reasonCode, defectCode,
    description, faultDate, repairStart, repairEnd, engineHours, parts,
    laborItems, paymentMethod, partsTotal, laborTotal, vat, grandTotal, isSigned
  ]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-6 lg:px-8">
        <WorkCardHeader
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          onSimulateScan={handleSimulateScan}
          orderNumber={orderNumber}
          jobCardNumber={jobCardNumber}
          assignedTechnicians={assignedTechnicians}
          onAssignedTechniciansChange={setAssignedTechnicians}
          leadTechnicianId={leadTechnicianId}
          onLeadTechnicianIdChange={setLeadTechnicianId}
          clockAtJobLevel={clockAtJobLevel}
          onClockAtJobLevelChange={setClockAtJobLevel}
          timerStatus={timerStatus}
          elapsedTime={elapsedTime}
          onTimerStart={handleTimerStart}
          onTimerPause={handleTimerPause}
          onTimerStop={handleTimerStop}
          isAdmin={isAdmin}
          onAdminToggle={setIsAdmin}
          isSigned={isSigned}
        />

        <div className="mt-6 space-y-6">
          {/* Unresolved Issues Alert Banner — prominent at top */}
          {isScanned && (
            <UnresolvedIssuesAlert previousIssues={previousUnresolvedIssues} />
          )}

          <ClientSection
            clientData={clientData}
            isScanned={isScanned}
            jobType={jobType}
            onJobTypeChange={handleJobTypeChange}
            onBillingEntityChange={handleBillingEntityChange}
          />

          {/* Mandatory Checklist — between Client and Diagnostics */}
          <ChecklistButton
            completed={checklistCompleted}
            skipped={checklistSkipped}
            onOpen={() => setChecklistOpen(true)}
          />
          <ChecklistModal
            open={checklistOpen}
            onOpenChange={setChecklistOpen}
            items={checklistItems}
            onItemsChange={setChecklistItems}
            completed={checklistCompleted}
            onComplete={() => setChecklistCompleted(true)}
            skipReason={checklistSkipReason}
            onSkipReasonChange={setChecklistSkipReason}
            onSkip={() => setChecklistSkipped(true)}
            skipped={checklistSkipped}
          />

          <DiagnosticsSection
            reasonCode={reasonCode}
            defectCode={defectCode}
            description={description}
            faultDate={faultDate}
            repairStart={repairStart}
            repairEnd={repairEnd}
            engineHours={engineHours}
            photos={faultPhotos}
            onReasonChange={setReasonCode}
            onDefectChange={setDefectCode}
            onDescriptionChange={setDescription}
            onFaultDateChange={setFaultDate}
            onRepairStartChange={setRepairStart}
            onRepairEndChange={setRepairEnd}
            onEngineHoursChange={setEngineHours}
            onPhotosChange={setFaultPhotos}
            previousEngineHours={clientData?.previousEngineHours ?? null}
            engineHoursPhoto={engineHoursPhoto}
            onEngineHoursPhotoChange={setEngineHoursPhoto}
            engineHoursPhotoMissingReason={engineHoursPhotoMissingReason}
            onEngineHoursPhotoMissingReasonChange={setEngineHoursPhotoMissingReason}
          />

          <PartsTable parts={parts} onPartsChange={setParts} />

          <LaborTable
            laborItems={laborItems}
            onLaborItemsChange={setLaborItems}
            isAdmin={isAdmin}
          />

          {/* Unresolved Issues — after Labor/Work Done */}
          <UnresolvedIssuesSection
            issues={unresolvedIssues}
            onIssuesChange={setUnresolvedIssues}
            previousIssues={previousUnresolvedIssues}
          />

          <Footer
            paymentMethod={paymentMethod}
            onPaymentMethodChange={setPaymentMethod}
            laborTotal={laborTotal}
            partsTotal={partsTotal}
            vat={vat}
            grandTotal={grandTotal}
            isSigned={isSigned}
            onSign={handleSign}
            timerStatus={timerStatus}
            onSaveCard={handleSaveCard}
          />
        </div>
      </div>
    </main>
  );
}
