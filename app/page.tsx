"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Lock, FileEdit } from "lucide-react";
import { WorkCardHeader } from "@/components/work-card/header";
import { OrderSelector, type SelectedOrder } from "@/components/work-card/order-selector";
import { ClientSection } from "@/components/work-card/client-section";
import { ChecklistModal, ChecklistButton, getDefaultChecklist, type ChecklistItem } from "@/components/work-card/checklist-modal";
import { DiagnosticsSection, type FaultPhoto } from "@/components/work-card/diagnostics-section";
import { PartsTable } from "@/components/work-card/parts-table";
import { LaborTable } from "@/components/work-card/labor-table";
import { UnresolvedIssuesAlert, UnresolvedIssuesSection, type UnresolvedIssue } from "@/components/work-card/unresolved-issues";
import { CreditWarningBanner } from "@/components/work-card/credit-warning-banner";
import { HistoricalIssuesBanner } from "@/components/work-card/historical-issues-banner";
import { RecommendationsSection, type RecommendationsData } from "@/components/work-card/recommendations-section";
import type { ServiceHistoryIssue } from "@/lib/actions";
import { Footer } from "@/components/work-card/footer";
import { useClocking } from "@/lib/clocking-context";
import type { MachineSearchResult, PayerStatus } from "@/lib/types";

export interface PartItem {
  id: string;
  partId?: string; // UUID from parts table (for linking to job_card_parts)
  partNo: string;
  description: string;
  qty: number;
  price: number;
  stockQuantity?: number; // Current stock level from database
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

// localStorage keys
const STORAGE_KEY_FORM = "workcard_form";
const STORAGE_KEY_TIMER = "workcard_timer";

export default function WorkCardPage() {
  const { isAdmin, setIsAdmin, signJobCard } = useClocking();

  // Hydration flag to prevent UI flickering
  const [isHydrated, setIsHydrated] = useState(false);

  const [searchValue, setSearchValue] = useState("");
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [isScanned, setIsScanned] = useState(false);

  // Order hierarchy
  const [orderNumber, setOrderNumber] = useState("");
  const [jobCardNumber, setJobCardNumber] = useState("");
  const [jobType, setJobType] = useState<"warranty" | "repair" | "internal">("repair");
  
  // Selected order from unified search
  const [selectedOrder, setSelectedOrder] = useState<SelectedOrder | null>(null);
  const [isPayerChanged, setIsPayerChanged] = useState(false);
  const [payerChangeReason, setPayerChangeReason] = useState<string>("");

  // Technicians — dynamic list
  const [assignedTechnicians, setAssignedTechnicians] = useState<string[]>([""]);
  const [leadTechnicianId, setLeadTechnicianId] = useState<string | null>(null);
  const [clockAtJobLevel, setClockAtJobLevel] = useState(false);

  // Signature
  const [isSigned, setIsSigned] = useState(false);

  // Card status tracking (for read-only locking)
  const [cardStatus, setCardStatus] = useState<"new" | "draft" | "completed">("new");

  // Supabase Job Card ID (for UPDATE instead of INSERT on subsequent saves)
  const [savedJobCardId, setSavedJobCardId] = useState<string | null>(null);

  // Payer financial status (for credit warning)
  const [payerStatus, setPayerStatus] = useState<PayerStatus | null>(null);
  const isPayerBlocked = payerStatus?.isBlocked === true;

  // Machine and Payer IDs for database relations
  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null);

  // Historical issues from previous job cards
  const [historicalIssues, setHistoricalIssues] = useState<ServiceHistoryIssue[]>([]);

  // Recommendations and pending issues for current card
  const [recommendationsData, setRecommendationsData] = useState<RecommendationsData>({
    pendingIssues: "",
    pendingReason: "",
    recommendations: "",
  });

  // Diagnostics (must be declared before localStorage hydration useEffect)
  const [reasonCode, setReasonCode] = useState("");
  const [defectCode, setDefectCode] = useState("");
  const [description, setDescription] = useState("");
  const [faultDate, setFaultDate] = useState("");
  const [repairStart, setRepairStart] = useState("");
  const [repairEnd, setRepairEnd] = useState("");
  const [engineHours, setEngineHours] = useState("");

  // Parts & Labor (must be declared before localStorage hydration useEffect)
  const [parts, setParts] = useState<PartItem[]>([]);
  const [laborItems, setLaborItems] = useState<LaborItem[]>([]);

  // Payment (must be declared before localStorage hydration useEffect)
  const [paymentMethod, setPaymentMethod] = useState<"bank" | "cash">("bank");

  // Timer with localStorage persistence
  const [timerStatus, setTimerStatus] = useState<"idle" | "running" | "paused">("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timerJobCardId, setTimerJobCardId] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const formatTime = useCallback((totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }, []);

  const elapsedTime = formatTime(elapsedSeconds);

  // Load ALL form state from localStorage on mount (prevents flickering)
  useEffect(() => {
    // Load form state
    const savedForm = localStorage.getItem(STORAGE_KEY_FORM);
    if (savedForm) {
      try {
        const form = JSON.parse(savedForm);
        if (form.orderNumber) setOrderNumber(form.orderNumber);
        if (form.jobCardNumber) setJobCardNumber(form.jobCardNumber);
        if (form.jobType) setJobType(form.jobType);
        if (form.clientData) setClientData(form.clientData);
        if (form.isScanned !== undefined) setIsScanned(form.isScanned);
        if (form.searchValue) setSearchValue(form.searchValue);
        if (form.assignedTechnicians) setAssignedTechnicians(form.assignedTechnicians);
        if (form.leadTechnicianId) setLeadTechnicianId(form.leadTechnicianId);
        if (form.clockAtJobLevel !== undefined) setClockAtJobLevel(form.clockAtJobLevel);
        if (form.reasonCode) setReasonCode(form.reasonCode);
        if (form.defectCode) setDefectCode(form.defectCode);
        if (form.description) setDescription(form.description);
        if (form.faultDate) setFaultDate(form.faultDate);
        if (form.repairStart) setRepairStart(form.repairStart);
        if (form.repairEnd) setRepairEnd(form.repairEnd);
        if (form.engineHours) setEngineHours(form.engineHours);
        if (form.parts) setParts(form.parts);
        if (form.laborItems) setLaborItems(form.laborItems);
        if (form.paymentMethod) setPaymentMethod(form.paymentMethod);
        // Restore saved job card ID and status for UPDATE on subsequent saves
        if (form.savedJobCardId) setSavedJobCardId(form.savedJobCardId);
        if (form.cardStatus) setCardStatus(form.cardStatus);
      } catch {
        localStorage.removeItem(STORAGE_KEY_FORM);
      }
    }

    // Load timer state
    const savedTimer = localStorage.getItem(STORAGE_KEY_TIMER);
    if (savedTimer) {
      try {
        const { status, seconds, jobCardId, lastUpdated } = JSON.parse(savedTimer);
        setTimerJobCardId(jobCardId || null);
        
        if (status === "running" && lastUpdated) {
          // Calculate elapsed time since last update
          const now = Date.now();
          const additionalSeconds = Math.floor((now - lastUpdated) / 1000);
          setElapsedSeconds(seconds + additionalSeconds);
          setTimerStatus("running");
        } else if (status === "paused") {
          setElapsedSeconds(seconds);
          setTimerStatus("paused");
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY_TIMER);
      }
    }

    // Mark hydration complete
    setIsHydrated(true);
  }, []);

  // Save form state to localStorage whenever it changes (after hydration)
  useEffect(() => {
    if (!isHydrated) return; // Don't save during initial hydration

    const formData = {
      orderNumber,
      jobCardNumber,
      jobType,
      clientData,
      isScanned,
      searchValue,
      assignedTechnicians,
      leadTechnicianId,
      clockAtJobLevel,
      reasonCode,
      defectCode,
      description,
      faultDate,
      repairStart,
      repairEnd,
      engineHours,
      parts,
      laborItems,
      paymentMethod,
      // Persist Supabase job card ID for UPDATE on subsequent saves
      savedJobCardId,
      cardStatus,
    };

    localStorage.setItem(STORAGE_KEY_FORM, JSON.stringify(formData));
  }, [
    isHydrated, orderNumber, jobCardNumber, jobType, clientData, isScanned, searchValue,
    assignedTechnicians, leadTechnicianId, clockAtJobLevel, reasonCode, defectCode,
    description, faultDate, repairStart, repairEnd, engineHours, parts, laborItems, paymentMethod,
    savedJobCardId, cardStatus
  ]);

  // Save timer state to localStorage whenever it changes
  useEffect(() => {
    if (timerStatus === "idle" && elapsedSeconds === 0) {
      localStorage.removeItem(STORAGE_KEY_TIMER);
    } else {
      const timerData = {
        status: timerStatus,
        seconds: elapsedSeconds,
        jobCardId: timerJobCardId || jobCardNumber,
        lastUpdated: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY_TIMER, JSON.stringify(timerData));
    }
  }, [timerStatus, elapsedSeconds, timerJobCardId, jobCardNumber]);

  // Timer interval logic
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

 const handleTimerStart = () => {
  // Prevent starting work if payer is blocked
  if (isPayerBlocked) {
    return;
  }
  setTimerJobCardId(jobCardNumber);
  setTimerStatus("running");
  };
  const handleTimerPause = () => setTimerStatus("paused");
  const handleTimerStop = () => {
    setTimerStatus("idle");
    setElapsedSeconds(0);
    setTimerJobCardId(null);
    localStorage.removeItem(STORAGE_KEY_TIMER);
  };

  // Job type handlers
  const handleJobTypeChange = (type: "warranty" | "repair" | "internal") => {
    setJobType(type);
  };

  // Fault photos (not persisted to localStorage)
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

  // Handle machine selection from search - auto-fills all machine details and order numbers
  const handleMachineSelect = useCallback((machine: MachineSearchResult) => {
  // Store machine ID for database relation
  setSelectedMachineId(machine.id);
  
  // Auto-fill client/machine data including Engine SN
  setClientData({
  machineOwner: machine.ownerName,
  billingEntity: machine.ownerName,
  location: machine.location || "",
  machineModel: `${machine.manufacturer} ${machine.model}`,
  serialNo: machine.serialNo,
  engineSN: machine.engineSN || "",
  previousEngineHours: machine.engineHours,
  });
    
    // Auto-fill order numbers from server-generated suggestions
    if (machine.suggestedOrderNumber) {
      setOrderNumber(machine.suggestedOrderNumber);
    }
    if (machine.suggestedJobCardNumber) {
      setJobCardNumber(machine.suggestedJobCardNumber);
    }
    
    setIsScanned(true);
    setSearchValue(machine.serialNo);
  }, []);

  // Reset form and clear ALL localStorage (called ONLY after successful save)
  const handleFormReset = useCallback(() => {
    // Clear timer state
    setTimerStatus("idle");
    setElapsedSeconds(0);
    setTimerJobCardId(null);
    
    // Reset card status
    setCardStatus("new");
    
    // Reset all form fields
    setOrderNumber("");
    setJobCardNumber("");
    setClientData(null);
    setIsScanned(false);
    setSearchValue("");
    setAssignedTechnicians([""]);
    setLeadTechnicianId(null);
    setClockAtJobLevel(false);
    setReasonCode("");
    setDefectCode("");
    setDescription("");
    setFaultDate("");
    setRepairStart("");
    setRepairEnd("");
    setEngineHours("");
    setParts([]);
    setLaborItems([]);
    setPaymentMethod("bank");
    setIsSigned(false);
    
    // Clear photo states
    setFaultPhotos([]);
    setEngineHoursPhoto(null);
    setEngineHoursPhotoMissingReason("");
    
    // Clear machine and payer IDs
    setSelectedMachineId(null);
    setPayerStatus(null);
    
    // Clear selected order and payer change state
    setSelectedOrder(null);
    setIsPayerChanged(false);
    setPayerChangeReason("");
    
    // Clear historical issues and recommendations
    setHistoricalIssues([]);
    setRecommendationsData({
      pendingIssues: "",
      pendingReason: "",
      recommendations: "",
    });
    
    // Clear Supabase job card ID
    setSavedJobCardId(null);
    
    // Clear localStorage AFTER resetting state (prevents re-saving empty state)
    localStorage.removeItem(STORAGE_KEY_FORM);
    localStorage.removeItem(STORAGE_KEY_TIMER);
  }, []);

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

  // Save card handler with validation - accepts optional signature data and signer name
  const handleSaveCard = useCallback(async (signatureData?: string | null, signerName?: string): Promise<{ success: boolean; message?: string; jobCardId?: string; pendingOrder?: boolean }> => {
    // Validate required fields
    const validTechnicians = assignedTechnicians.filter(t => t && t.trim() !== "");
    
    if (validTechnicians.length === 0) {
      return { 
        success: false, 
        message: "Моля, изберете поне един техник преди да запазите картата." 
      };
    }

    if (!clientData || !clientData.serialNo) {
      return { 
        success: false, 
        message: "Моля, изберете машина от търсачката преди да запазите картата." 
      };
    }

    // Only jobCardNumber is required - orderNumber is optional ("Work First, Order Later")
    if (!jobCardNumber) {
      return { 
        success: false, 
        message: "Job Card номерът е задължителен." 
      };
    }

    try {
      const payload = {
        // Include existing job card ID for UPDATE instead of INSERT
        existingJobCardId: savedJobCardId,
        orderNumber,
        jobCardNumber,
        jobType,
        assignedTechnicians: validTechnicians,
        leadTechnicianId,
        clockAtJobLevel,
        // Timer data for persistence
        timerData: {
          status: timerStatus,
          elapsedSeconds,
          startedAt: timerStatus !== "idle" ? new Date().toISOString() : null,
        },
        clientData,
        diagnostics: {
          reasonCode,
          defectCode,
          description,
          faultDate,
          repairStart,
          repairEnd,
          engineHours,
          // Photo URLs for Supabase Storage
          photo_urls: faultPhotos.map(p => p.url),
          hour_meter_photo: engineHoursPhoto?.url || null,
          engine_hours_photo_missing_reason: engineHoursPhotoMissingReason || null,
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
        // Machine and Payer IDs for database relations
        machineId: selectedMachineId || undefined,
        payerId: payerStatus?.payerId || undefined,
        // Recommendations and pending issues
        pendingIssues: recommendationsData.pendingIssues || null,
        pendingReason: recommendationsData.pendingReason || null,
        recommendations: recommendationsData.recommendations || null,
        // Signature workflow - status is determined by presence of signature
        signatureData: signatureData || null,
        signerName: signerName || null,
        status: signatureData ? "completed" : "draft",
      };

      const response = await fetch("/api/job-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      
      // Store the job card ID for subsequent UPDATE operations
      if (result.success && result.jobCardId) {
        setSavedJobCardId(result.jobCardId);
      }
      
      return { success: result.success, message: result.message, jobCardId: result.jobCardId, pendingOrder: result.pendingOrder };
    } catch (error) {
      console.error("[v0] Error saving card:", error);
      return { success: false, message: "Network error" };
    }
  }, [
    orderNumber, jobCardNumber, jobType, assignedTechnicians, leadTechnicianId,
    clockAtJobLevel, timerStatus, elapsedSeconds, clientData, reasonCode, defectCode,
    description, faultDate, repairStart, repairEnd, engineHours, parts,
    laborItems, paymentMethod, partsTotal, laborTotal, vat, grandTotal, isSigned, savedJobCardId,
    faultPhotos, engineHoursPhoto, engineHoursPhotoMissingReason, selectedMachineId, payerStatus, recommendationsData
  ]);

  // Show loading skeleton during hydration to prevent flickering
  if (!isHydrated) {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <div className="mx-auto max-w-5xl px-4 py-6 md:px-6 lg:px-8">
          <div className="space-y-6 animate-pulse">
            <div className="h-32 bg-muted/30 rounded-lg" />
            <div className="h-48 bg-muted/30 rounded-lg" />
            <div className="h-64 bg-muted/30 rounded-lg" />
          </div>
        </div>
      </main>
    );
  }

  // Check if form should be read-only (completed cards are locked)
  const isReadOnly = cardStatus === "completed";

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-6 lg:px-8">
        {/* Status Badge - shows DRAFT (yellow) or COMPLETED (green) */}
        {cardStatus !== "new" && (
          <div className="mb-4 flex justify-center">
            {cardStatus === "draft" ? (
              <Badge variant="outline" className="border-amber-500/50 bg-amber-500/10 text-amber-500 px-4 py-2 text-sm gap-2">
                <FileEdit className="h-4 w-4" />
                ЧЕРНОВА (DRAFT)
              </Badge>
            ) : (
              <Badge variant="outline" className="border-emerald-500/50 bg-emerald-500/10 text-emerald-500 px-4 py-2 text-sm gap-2">
                <Lock className="h-4 w-4" />
                ЗАВЪРШЕНА (COMPLETED) - Заключена
              </Badge>
            )}
          </div>
        )}

        {/* Credit Warning Banner - Sticky at top when payer is blocked */}
        {payerStatus && (payerStatus.isBlocked || payerStatus.isOverCreditLimit) && (
          <CreditWarningBanner 
            payerStatus={payerStatus} 
            onDismiss={payerStatus.isBlocked ? undefined : () => setPayerStatus(null)}
          />
        )}

        {/* Read-only overlay message for completed cards */}
        {isReadOnly && (
          <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 text-center">
            <p className="text-sm text-emerald-600">
              Тази работна карта е подписана и заключена. Не може да бъде редактирана.
            </p>
          </div>
        )}

        {/* Spacer when credit warning banner is shown */}
        {payerStatus && (payerStatus.isBlocked || payerStatus.isOverCreditLimit) && (
          <div className="h-20" />
        )}

        {/* Order Type Selector & Unified Search - Top Section */}
        <OrderSelector
          onOrderSelect={(order) => {
            setSelectedOrder(order);
            if (order) {
              setOrderNumber(order.orderNumber);
              setJobCardNumber(order.jobCardNumber);
              setSelectedMachineId(order.machineId);
              setIsScanned(true);
              // Map service type to job type
              const typeMap: Record<string, "warranty" | "repair" | "internal"> = {
                warranty: "warranty",
                repair: "repair",
                internal: "internal",
                service_contract: "repair",
              };
              setJobType(typeMap[order.serviceType] || "repair");
              // Set client data from order
              setClientData({
                machineOwner: order.clientName,
                billingEntity: order.clientName,
                location: "",
                machineModel: order.machineModel,
                serialNo: order.machineSerial,
                engineSN: "",
                previousEngineHours: null,
              });
            } else {
              setOrderNumber("");
              setJobCardNumber("");
              setSelectedMachineId(null);
              setIsScanned(false);
              setClientData(null);
              setIsPayerChanged(false);
              setPayerChangeReason("");
            }
          }}
          onPayerChange={(payer, reason) => {
            setPayerStatus(payer);
            if (payer && reason) {
              setIsPayerChanged(true);
              setPayerChangeReason(reason);
            } else {
              setIsPayerChanged(false);
              setPayerChangeReason("");
            }
          }}
          onOrderTypeChange={(type) => {
            const typeMap: Record<string, "warranty" | "repair" | "internal"> = {
              warranty: "warranty",
              repair: "repair",
              internal: "internal",
              service_contract: "repair",
            };
            setJobType(typeMap[type] || "repair");
          }}
          selectedOrder={selectedOrder}
          currentPayer={payerStatus}
          isPayerChanged={isPayerChanged}
          payerChangeReason={payerChangeReason}
        />

        <WorkCardHeader
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          onSimulateScan={handleSimulateScan}
          orderNumber={selectedOrder?.orderNumber || orderNumber}
          jobCardNumber={selectedOrder?.jobCardNumber || jobCardNumber}
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
  isPayerBlocked={isPayerBlocked}
  />

        <div className="mt-6 space-y-6">
          {/* Historical Issues Banner - Yellow alert for pending issues from previous visits */}
          {historicalIssues.length > 0 && (
            <HistoricalIssuesBanner issues={historicalIssues} />
          )}

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
  onMachineSelect={handleMachineSelect}
  onPayerStatusChange={setPayerStatus}
  onHistoricalIssuesChange={setHistoricalIssues}
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
            jobCardId={savedJobCardId || jobCardNumber}
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

          {/* Recommendations and Pending Issues for Future */}
          <RecommendationsSection
            data={recommendationsData}
            onChange={setRecommendationsData}
          />

          <Footer
            paymentMethod={paymentMethod}
            onPaymentMethodChange={setPaymentMethod}
            laborTotal={laborTotal}
            partsTotal={partsTotal}
            vat={vat}
            grandTotal={grandTotal}
            timerStatus={timerStatus}
            orderNumber={orderNumber}
            onSaveCard={handleSaveCard}
            onFormReset={handleFormReset}
            isReadOnly={isReadOnly}
            onStatusChange={setCardStatus}
            pdfData={{
              orderNumber,
              jobCardNumber,
              jobType,
              date: new Date().toLocaleDateString("bg-BG"),
              technicians: assignedTechnicians.filter(t => t),
              leadTechnician: leadTechnicianId || undefined,
              machineOwner: clientData?.machineOwner || "",
              billingEntity: clientData?.billingEntity || "",
              location: clientData?.location || "",
              machineModel: clientData?.machineModel || "",
              serialNo: clientData?.serialNo || "",
              engineSN: clientData?.engineSN || "",
              engineHours,
              previousEngineHours: clientData?.previousEngineHours,
              reasonCode,
              defectCode,
              description,
              faultDate,
              repairStart,
              repairEnd,
              parts,
              laborItems,
              photoUrls: faultPhotos.map(p => p.url),
              engineHoursPhotoUrl: engineHoursPhoto?.url,
              totalWorkTime: elapsedTime,
            }}
          />
        </div>
      </div>
    </main>
  );
}
