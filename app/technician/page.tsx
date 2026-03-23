"use client";

import { useState, useMemo, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Lock, FileEdit, Loader2 } from "lucide-react";
import { TechnicalPortalLayout } from "@/components/layout/technical-portal-layout";
import { OrderSelector, type SelectedOrder } from "@/components/work-card/order-selector";
import { TechniciansSection } from "@/components/work-card/technicians-section";
import { ClientSection } from "@/components/work-card/client-section";
import { FreeCheckSection, FREE_CHECK_POINTS, type FreeCheckItem } from "@/components/work-card/free-check-section";
import type { DetectedIssue } from "@/components/work-card/future-issues-section";
import { DiagnosticsSection, type FaultPhoto } from "@/components/work-card/diagnostics-section";
import { PartsTable } from "@/components/work-card/parts-table";
import { LaborTable } from "@/components/work-card/labor-table";
import { UnresolvedIssuesAlert, UnresolvedIssuesSection, DynamicUnresolvedIssuesAlert, type UnresolvedIssue } from "@/components/work-card/unresolved-issues";
import { CreditWarningBanner } from "@/components/work-card/credit-warning-banner";
import { HistoricalIssuesBanner } from "@/components/work-card/historical-issues-banner";
import { RecommendationsSection, type RecommendationsData } from "@/components/work-card/recommendations-section";
import { FutureIssuesSection } from "@/components/work-card/future-issues-section";
import { PendingRepairsBanner } from "@/components/work-card/pending-repairs-banner";
import { TechnicianHeader } from "@/components/work-card/technician-header";
import { JDLinkDiagnostics } from "@/components/work-card/jdlink-diagnostics";
import type { ServiceHistoryIssue, PendingRepairItem } from "@/lib/actions";
import { startClocking, stopClocking, updateJobCardDescription, getPreviousMachineHours, uploadEngineHoursPhoto, fetchUnresolvedMachineIssues, savePendingRepairs, fetchJobCardForEdit, type MachineIssue } from "@/lib/actions";
import { Footer } from "@/components/work-card/footer";
import { useClocking } from "@/lib/clocking-context";
import type { PayerStatus } from "@/lib/types";
import { toast } from "sonner";

export interface PartItem {
  id: string;
  partId?: string; // UUID from parts table (for linking to job_card_parts)
  partNo: string;
  description: string;
  status?: "pending" | "completed" | "deferred" | "next_visit"; // For tracking repair status
  qty: number;
  price: number;
  stockQuantity?: number; // Current stock level from database
}

export interface LaborItem {
  id: string;
  operationId?: string; // UUID from labor_catalog
  operationCode?: string; // Code from labor_catalog
  operationName: string;
  techCount: number;
  price: number;
  standardHours?: number; // From labor_catalog
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

// Main page component (wrapped with Suspense for useSearchParams)
function WorkCardPageContent() {
  const { isAdmin, setIsAdmin, signJobCard } = useClocking();
  const searchParams = useSearchParams();
  const router = useRouter();
  const editId = searchParams.get("editId");

  // Hydration flag to prevent UI flickering
  const [isHydrated, setIsHydrated] = useState(false);
  
  // Loading state for edit mode
  const [isLoadingEditCard, setIsLoadingEditCard] = useState(false);

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
  const [leadTechnicianName, setLeadTechnicianName] = useState<string>("");
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

  // Engine hours validation
  const [currentEngineHours, setCurrentEngineHours] = useState<number | null>(null);
  const [isHoursWarningConfirmed, setIsHoursWarningConfirmed] = useState(false);

  // Engine hours photo
  const [hoursPhotoUrl, setHoursPhotoUrl] = useState<string | null>(null);
  const [skipPhoto, setSkipPhoto] = useState(false);
  const [missingPhotoReason, setMissingPhotoReason] = useState("");
  const [isCapturingPhoto, setIsCapturingPhoto] = useState(false);

  // Service location with GPS auto-fill
  const [serviceLocation, setServiceLocation] = useState<string>("");
  const [isGpsAutoFilled, setIsGpsAutoFilled] = useState(false);

  // Historical issues from previous job cards
  const [historicalIssues, setHistoricalIssues] = useState<ServiceHistoryIssue[]>([]);
  
  // Machine issues from database (unresolved issues for selected machine)
  const [machineIssues, setMachineIssues] = useState<MachineIssue[]>([]);

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
  // 3C fields - warranty specific
  const [causalPartNo, setCausalPartNo] = useState("");
  const [assemblyGroup, setAssemblyGroup] = useState("");
  const [correction, setCorrection] = useState(""); // C2: Cause description
  const [workDone, setWorkDone] = useState(""); // C3: Correction/work done

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

  // Load draft card for editing when editId is present
  useEffect(() => {
    if (!editId || !isHydrated) return;
    
    const loadDraftCard = async () => {
      setIsLoadingEditCard(true);
      try {
        const result = await fetchJobCardForEdit(editId);
        
        if (!result.success || !result.data) {
          toast.error("Failed to load job card", {
            description: result.error || "Job card not found",
          });
          router.push("/");
          return;
        }

        const data = result.data;
        
        // Populate all form fields with loaded data
        setSavedJobCardId(data.id);
        setOrderNumber(data.orderNumber);
        setCardStatus(data.status === "completed" ? "completed" : "draft");
        
        // Machine/Client data
        if (data.machineId) {
          setSelectedMachineId(data.machineId);
        }
        setClientData({
          machineOwner: data.machineOwner,
          billingEntity: data.billingEntity,
          location: data.location,
          machineModel: data.machineModel,
          serialNo: data.serialNo,
          engineSN: data.engineSN,
          previousEngineHours: data.previousEngineHours,
        });
        setIsScanned(true);
        
        // Technician
        if (data.technicianId) {
          setAssignedTechnicians([data.technicianId]);
          setLeadTechnicianId(data.technicianId);
        }
        
        // Diagnostics
        setReasonCode(data.reasonCode);
        setDefectCode(data.defectCode);
        setDescription(data.description);
        setFaultDate(data.faultDate);
        setRepairStart(data.repairStart);
        setRepairEnd(data.repairEnd);
        setCausalPartNo(data.causalPartNo);
        setAssemblyGroup(data.assemblyGroup);
        
        // Engine hours
        if (data.currentEngineHours) {
          setCurrentEngineHours(data.currentEngineHours);
          setEngineHours(String(data.currentEngineHours));
        }
        
        // Photos
        if (data.hoursPhotoUrl) {
          setHoursPhotoUrl(data.hoursPhotoUrl);
        }
        if (data.missingPhotoReason) {
          setSkipPhoto(true);
          setMissingPhotoReason(data.missingPhotoReason);
        }
        if (data.photoUrls?.length > 0) {
          setFaultPhotos(data.photoUrls.map((url, idx) => ({
            id: `loaded-${idx}`,
            url,
            caption: "",
          })));
        }
        
        // Timer
        if (data.totalSeconds > 0) {
          setElapsedSeconds(data.totalSeconds);
          setTimerStatus("paused");
        }
        
        // Recommendations
        setRecommendationsData({
          pendingIssues: data.pendingIssues,
          pendingReason: data.pendingReason,
          recommendations: data.recommendations,
        });
        
        // Parts and labor
        if (data.parts?.length > 0) {
          setParts(data.parts.map(p => ({
            id: p.id,
            partId: p.partId,
            partNo: p.partNo,
            description: p.description,
            qty: p.qty,
            price: p.price,
          })));
        }
        if (data.laborItems?.length > 0) {
          setLaborItems(data.laborItems.map(l => ({
            id: l.id,
            operationId: l.operationId,
            operationCode: l.operationCode,
            operationName: l.operationName,
            techCount: l.techCount,
            price: l.price,
            notes: "",
          })));
        }
        
        toast.success("Draft loaded", {
          description: `Editing job card: ${data.orderNumber || data.id.slice(0, 8)}`,
        });
        
        // Clear the URL param to prevent reload issues
        router.replace("/", { scroll: false });
      } catch (error) {
        console.error("Error loading draft card:", error);
        toast.error("Failed to load draft", {
          description: "An unexpected error occurred",
        });
      } finally {
        setIsLoadingEditCard(false);
      }
    };
    
    loadDraftCard();
  }, [editId, isHydrated, router]);
  
  // Save form state to localStorage whenever it changes (after hydration)
  useEffect(() => {
    if (!isHydrated) return; // Don't save during initial hydration

    const formData = {
      orderNumber,
      jobCardNumber,
      jobType,
      clientData,
      isScanned,
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
    isHydrated, orderNumber, jobCardNumber, jobType, clientData, isScanned,
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

 const handleTimerStart = async () => {
  // Prevent starting work if payer is blocked
  if (isPayerBlocked) {
    return;
  }
  
  // Set timer state first for immediate UI feedback
  setTimerJobCardId(savedJobCardId || jobCardNumber);
  setTimerStatus("running");
  
  // Call server action to create time_logs entries
  if (savedJobCardId) {
    const result = await startClocking({
      jobCardId: savedJobCardId,
      technicianIds: assignedTechnicians.filter(Boolean),
      orderType: jobType,
      machineId: selectedMachineId,
      currentMachineHours: currentEngineHours,
      hoursConfirmedByTech: isHoursWarningConfirmed || (
        currentEngineHours !== null && 
        (clientData?.previousEngineHours === null || 
         clientData?.previousEngineHours === undefined ||
         currentEngineHours >= clientData.previousEngineHours)
      ),
      complaintDescription: description,
    });
    
    if (!result.success) {
      console.error("Failed to start clocking:", result.error);
    }
  }
  };
  
  const handleTimerPause = () => setTimerStatus("paused");
  
  const handleTimerStop = async () => {
    // Call server action to stop time_logs entries
    if (savedJobCardId) {
      const result = await stopClocking({
        jobCardId: savedJobCardId,
        technicianIds: assignedTechnicians.filter(Boolean),
        machineId: selectedMachineId,
        currentMachineHours: currentEngineHours,
        hoursConfirmedByTech: isHoursWarningConfirmed || (
          currentEngineHours !== null && 
          (clientData?.previousEngineHours === null || 
           clientData?.previousEngineHours === undefined ||
           currentEngineHours >= clientData.previousEngineHours)
        ),
        complaintDescription: description,
        totalSeconds: elapsedSeconds,
        hoursPhotoUrl: hoursPhotoUrl,
        missingPhotoReason: skipPhoto ? missingPhotoReason : undefined,
      });
      
      if (!result.success) {
        console.error("Failed to stop clocking:", result.error);
      }
    }
    
    // Reset timer state
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



  // FREE CHECK items state (managed by FreeCheckSection, mirrored here for FutureIssuesSection)
  const [freeCheckItems, setFreeCheckItems] = useState<Record<string, FreeCheckItem>>({});

  // Unresolved issues
  const [unresolvedIssues, setUnresolvedIssues] = useState<UnresolvedIssue[]>([]);
  // Simulated previous unresolved issues (would come from DB in production)
  const [previousUnresolvedIssues] = useState<UnresolvedIssue[]>([
    {
      id: "prev-1",
      description: "Хидравличен маркуч на десен цил��н��ър показва микропукнатини",
      severity: "high",
      fromPreviousCard: true,
      previousCardId: "JC-0015",
    },
    {
      id: "prev-2",
      description: "Лек теч на масл���� при предната ос",
      severity: "medium",
      fromPreviousCard: true,
      previousCardId: "JC-0012",
    },
  ]);

  const handleBillingEntityChange = (value: string) => {
    if (clientData) {
      setClientData({ ...clientData, billingEntity: value });
    }
  };

  // Debounced description save to database
  const descriptionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleDescriptionChange = useCallback((value: string) => {
    setDescription(value);
    
    // Clear existing timeout
    if (descriptionTimeoutRef.current) {
      clearTimeout(descriptionTimeoutRef.current);
    }
    
    // Debounce save to database (1 second after typing stops)
    if (savedJobCardId) {
      descriptionTimeoutRef.current = setTimeout(async () => {
        const result = await updateJobCardDescription(savedJobCardId, value);
        if (!result.success) {
          console.error("Failed to save description:", result.error);
        }
      }, 1000);
    }
  }, [savedJobCardId]);

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
  setCurrentEngineHours(null);
  setIsHoursWarningConfirmed(false);
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

    // Auto-generate jobCardNumber if not provided
    // Format: JC-YYYY-MMDD-XXXX (e.g., JC-2026-0302-1234)
    let finalJobCardNumber = jobCardNumber;
    if (!finalJobCardNumber || finalJobCardNumber.trim() === "") {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      finalJobCardNumber = `JC-${year}-${month}${day}-${randomSuffix}`;
      // Update state with generated number
      setJobCardNumber(finalJobCardNumber);
    }

    try {
      const payload = {
        // Include existing job card ID for UPDATE instead of INSERT
        existingJobCardId: savedJobCardId,
        orderNumber,
        jobCardNumber: finalJobCardNumber,
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
          // 3C fields
          causalPartNo: causalPartNo || null,
          assemblyGroup: assemblyGroup || null,
          correction: correction || null,
          workDone: workDone || null,
          // Photo URLs for Supabase Storage
          photo_urls: faultPhotos.map(p => p.url),
          hour_meter_photo: hoursPhotoUrl || null,
          engine_hours_photo_missing_reason: skipPhoto ? missingPhotoReason : null,
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

        // If card is being finalized (signed), save deferred repairs to machine history
        if (isSigned && clientData?.serialNo) {
          const deferredParts = parts.filter(
            (p) => p.status === "deferred" || p.status === "next_visit"
          );
          if (deferredParts.length > 0) {
            await savePendingRepairs(
              clientData.serialNo,
              result.jobCardId,
              deferredParts.map((p) => ({
                description: p.description,
                status: (p.status as "deferred" | "next_visit") || "deferred",
                estimatedCost: p.unitPrice * p.qty,
                partId: p.partId || null,
              }))
            );
          }
        }
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
    faultPhotos, hoursPhotoUrl, skipPhoto, missingPhotoReason, selectedMachineId, payerStatus, recommendationsData,
    causalPartNo, assemblyGroup, correction, workDone, savePendingRepairs
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
    <TechnicalPortalLayout
      subtitle="Работна Карта"
      onNewJobCard={handleFormReset}
      onSelectJobCard={(jobCardId) => {
        router.push(`/technician?editId=${jobCardId}`);
      }}
    >
      <main className="min-h-screen bg-background text-foreground">
        {/* Technician Mobile Header - High contrast interface for outdoor use */}
        {isScanned && clientData?.serialNo && (
          <TechnicianHeader
            jobCard={{
              id: savedJobCardId || jobCardNumber || "NEW",
              orderNo: orderNumber || "N/A",
              customerName: clientData?.machineOwner || "Сканирайте машина",
              location: clientData?.ownerAddress || "",
              machineModel: clientData?.machineModel || (clientData?.machineType ? `${clientData.machineBrand || ""} ${clientData.machineType}`.trim() : "N/A"),
              serialNumber: clientData?.serialNo || "",
            }}
            isEnabled={isScanned}
            telematics={selectedOrder?.telematics}
            dtcCodes={selectedOrder?.dtcCodes}
            onImportRepairs={(repairs) => {
              const newParts: PartItem[] = repairs.map((r) => ({
                id: crypto.randomUUID(),
                partId: r.partId || undefined,
                partNo: "IMPORTED",
                description: r.description,
                qty: 1,
                price: r.estimatedCost,
                status: "deferred" as const,
              }));
              setParts((prev) => [...prev, ...newParts]);
            }}
          />
        )}

      {/* Loading overlay for edit mode */}
      {isLoadingEditCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg font-medium">Loading draft job card...</p>
          </div>
        </div>
      )}

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



        {/* Order Type Selector & Unified Search - Right below header */}
        <OrderSelector
          onOrderSelect={async (order) => {
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
              
              // Fetch previous machine hours and unresolved issues from database
              let previousHours: number | null = null;
              if (order.machineId) {
                const hoursData = await getPreviousMachineHours(order.machineId);
                previousHours = hoursData.hours;
                
                // Fetch unresolved machine issues
                const issuesData = await fetchUnresolvedMachineIssues(order.machineId);
                setMachineIssues(issuesData.issues);
              } else {
                setMachineIssues([]);
              }
              
              // Set client data from order with previous hours
              setClientData({
                machineOwner: order.clientName,
                billingEntity: order.clientName,
                location: "",
                machineModel: order.machineModel,
                serialNo: order.machineSerial,
                engineSN: "",
                previousEngineHours: previousHours,
              });
              // Reset payer change state when selecting new order
              setIsPayerChanged(false);
              setPayerChangeReason("");
              
              // Auto-fill engine hours from JDLink telematics if available
              if (order.telematics?.engineHours) {
                setCurrentEngineHours(order.telematics.engineHours);
              } else {
                setCurrentEngineHours(null);
              }
              setIsHoursWarningConfirmed(false);
              setHoursPhotoUrl(null);
              setSkipPhoto(false);
              setMissingPhotoReason("");
              // Pre-populate description from Navision (editable by technician)
              if (order.navisionDescription) {
                setDescription(order.navisionDescription);
              }
              
              // Auto-fill GPS location from telematics if available
              if (order.telematics) {
                // Simulate GPS coordinates from JDLink telematics
                const gpsLocations = [
                  "GPS: 43.417, 24.616 (с. Долна Митрополия)",
                  "GPS: 42.697, 23.322 (гр. София, Витоша)",
                  "GPS: 42.150, 24.750 (гр. Пловдив)",
                  "GPS: 43.204, 27.911 (гр. Варна)",
                  "GPS: 42.435, 25.617 (гр. Стара Загора)",
                ];
                const randomLocation = gpsLocations[Math.floor(Math.random() * gpsLocations.length)];
                setServiceLocation(order.clientLocation 
                  ? `${randomLocation} - ${order.clientLocation}` 
                  : randomLocation);
                setIsGpsAutoFilled(true);
                // Reset GPS pulse after 3 seconds
                setTimeout(() => setIsGpsAutoFilled(false), 3000);
              } else if (order.clientLocation) {
                setServiceLocation(order.clientLocation);
                setIsGpsAutoFilled(false);
              } else {
                setServiceLocation("");
                setIsGpsAutoFilled(false);
              }
            } else {
              setOrderNumber("");
              setJobCardNumber("");
              setSelectedMachineId(null);
              setIsScanned(false);
  setClientData(null);
  setPayerStatus(null);
  setIsPayerChanged(false);
  setPayerChangeReason("");
  setCurrentEngineHours(null);
  setIsHoursWarningConfirmed(false);
  setHoursPhotoUrl(null);
  setSkipPhoto(false);
setMissingPhotoReason("");
  setDescription("");
  setMachineIssues("");
  setServiceLocation("");
  setIsGpsAutoFilled(false);
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
        />

        {/* Technicians Section - Below search, above client section */}
        <TechniciansSection
          assignedTechnicians={assignedTechnicians}
          onAssignedTechniciansChange={setAssignedTechnicians}
          leadTechnicianId={leadTechnicianId}
          onLeadTechnicianIdChange={setLeadTechnicianId}
          onLeadTechnicianNameChange={setLeadTechnicianName}
          clockAtJobLevel={clockAtJobLevel}
          onClockAtJobLevelChange={setClockAtJobLevel}
          timerStatus={timerStatus}
          elapsedTime={elapsedTime}
          onTimerStart={handleTimerStart}
          onTimerPause={handleTimerPause}
          onTimerStop={handleTimerStop}
          isJobSelected={isScanned || selectedOrder !== null}
          isHoursValid={
            currentEngineHours !== null && (
              // Hours are valid if: no previous hours OR current >= previous OR warning confirmed
              clientData?.previousEngineHours === null ||
              clientData?.previousEngineHours === undefined ||
              currentEngineHours >= clientData.previousEngineHours ||
              isHoursWarningConfirmed
            )
          }
          currentOrderType={jobType}
          isPhotoValid={
            // Photo is valid if: photo uploaded OR (skip checked AND reason provided)
            hoursPhotoUrl !== null || (skipPhoto && missingPhotoReason.trim().length > 0)
          }
        />

        <div className="mt-6 space-y-6">
  {/* Historical Issues Banner - Yellow alert for pending issues from previous visits */}
  {historicalIssues.length > 0 && (
  <HistoricalIssuesBanner issues={historicalIssues} />
  )}

  {/* Pending Repairs Banner - Deferred repairs from machine history */}
  <PendingRepairsBanner
    machineSerialNumber={clientData?.serialNo || null}
    isEnabled={isScanned}
    onImportRepairs={(repairs) => {
      // Import repairs as parts/recommendations in the current job card
      const newParts: PartItem[] = repairs.map((r) => ({
        id: crypto.randomUUID(),
        partId: r.partId || undefined,
        partNo: "IMPORTED",
        description: r.description,
        qty: 1,
        unitPrice: r.estimatedCost,
        status: "deferred" as const,
      }));
      setParts((prev) => [...prev, ...newParts]);
      // Also add to recommendations if there are deferred items
      const descriptions = repairs.map((r) => r.description).join("; ");
      setRecommendationsData((prev) => ({
        ...prev,
        pendingIssues: prev.pendingIssues
          ? `${prev.pendingIssues}\n[Импортирано]: ${descriptions}`
          : `[Импортирано]: ${descriptions}`,
      }));
    }}
  />

  {/* Unresolved Issues Alert Banner — prominent at top, fetched from database */}
  {isScanned && machineIssues.length > 0 && (
    <DynamicUnresolvedIssuesAlert
      machineIssues={machineIssues}
      onIssueResolved={(issueId) => {
        setMachineIssues(prev => prev.filter(issue => issue.id !== issueId));
      }}
      currentJobCardId={savedJobCardId}
    />
  )}

 <ClientSection
  clientData={clientData}
  isScanned={isScanned}
  onBillingEntityChange={handleBillingEntityChange}
  onPayerStatusChange={setPayerStatus}
  currentPayer={payerStatus}
  originalOwner={clientData?.machineOwner || null}
  onPayerChange={(payer, reason) => {
    setPayerStatus(payer);
    if (payer && reason) {
      setIsPayerChanged(true);
      setPayerChangeReason(reason);
    }
  }}
  isPayerChanged={isPayerChanged}
  payerChangeReason={payerChangeReason}
  currentEngineHours={currentEngineHours}
  onEngineHoursChange={setCurrentEngineHours}
  isHoursWarningConfirmed={isHoursWarningConfirmed}
  onHoursWarningConfirm={setIsHoursWarningConfirmed}
  hoursPhotoUrl={hoursPhotoUrl}
  onHoursPhotoChange={setHoursPhotoUrl}
  skipPhoto={skipPhoto}
  onSkipPhotoChange={setSkipPhoto}
  missingPhotoReason={missingPhotoReason}
  onMissingPhotoReasonChange={setMissingPhotoReason}
  onCapturePhoto={async () => {
    if (!savedJobCardId) return null;
    setIsCapturingPhoto(true);
    try {
      // Open camera and capture photo
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.capture = "environment";
      
      return new Promise<string | null>((resolve) => {
        input.onchange = async (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (!file) {
            setIsCapturingPhoto(false);
            resolve(null);
            return;
          }
          
          // Convert to base64
          const reader = new FileReader();
          reader.onload = async () => {
            const base64 = reader.result as string;
            const result = await uploadEngineHoursPhoto(savedJobCardId, base64);
            setIsCapturingPhoto(false);
            if (result.success && result.url) {
              resolve(result.url);
            } else {
              console.error("Photo upload failed:", result.error);
              resolve(null);
            }
          };
          reader.readAsDataURL(file);
        };
        input.click();
      });
    } catch (err) {
      console.error("Photo capture error:", err);
      setIsCapturingPhoto(false);
      return null;
    }
  }}
  isCapturingPhoto={isCapturingPhoto}
  serviceLocation={serviceLocation}
  onServiceLocationChange={setServiceLocation}
  isGpsAutoFilled={isGpsAutoFilled}
  />

          {/* Live JDLink Diagnostics - ECU data streaming from the machine */}
          {isScanned && selectedOrder?.telematics && (
            <JDLinkDiagnostics
              engineHours={selectedOrder.telematics.engineHours}
              batteryVoltage={selectedOrder.telematics.batteryVoltage}
              fuelLevel={selectedOrder.telematics.fuelLevel}
              defLevel={selectedOrder.telematics.defLevel}
              engineTemp={selectedOrder.telematics.engineTemp}
              coolantTemp={selectedOrder.telematics.coolantTemp}
              hydraulicTemp={selectedOrder.telematics.hydraulicTemp}
              engineLoad={selectedOrder.telematics.engineLoad}
              hydraulicPressure={selectedOrder.telematics.hydraulicPressure}
              dtcCodes={selectedOrder.dtcCodes || []}
              onAppendToNotes={(text) => {
                // Append DTC code to the repair description
                setDescription((prev) =>
                  prev ? `${prev}\n${text}` : text
                );
              }}
              isConnected={true}
            />
          )}

          {/* FREE CHECK Section - 14 point John Deere inspection */}
          <FreeCheckSection
            jobCardId={savedJobCardId}
            isEnabled={isScanned}
            onItemsChange={setFreeCheckItems}
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
            onDescriptionChange={handleDescriptionChange}
            onFaultDateChange={setFaultDate}
            onRepairStartChange={setRepairStart}
            onRepairEndChange={setRepairEnd}
            onEngineHoursChange={setEngineHours}
            onPhotosChange={setFaultPhotos}
            previousEngineHours={clientData?.previousEngineHours ?? null}
            jobCardId={savedJobCardId || jobCardNumber}
            jobType={jobType}
            causalPartNo={causalPartNo}
            onCausalPartNoChange={setCausalPartNo}
            assemblyGroup={assemblyGroup}
            onAssemblyGroupChange={setAssemblyGroup}
            correction={correction}
            onCorrectionChange={setCorrection}
            recommendations={workDone}
            onRecommendationsChange={setWorkDone}
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

          {/* Future Issues - for next technician + Detected issues from FREE CHECK */}
          <FutureIssuesSection
            machineId={selectedMachineId}
            jobCardId={savedJobCardId}
            isReadOnly={isReadOnly}
            detectedIssues={Object.entries(freeCheckItems)
              .filter(([, item]) => item.status === "0" || item.status === "repair")
              .map(([id, item]) => {
                const point = FREE_CHECK_POINTS.find((p) => p.id === id);
                return {
                  id,
                  name: point?.name || id,
                  desc: point?.desc || "",
                  status: item.status as "+" | "0" | "repair" | null,
                  comment: item.comments,
                  photoUrl: item.photoUrl,
                };
              })}
            onGenerateQuote={(issue) => {
              // Navigate to parts section or open quote modal
              console.log("[v0] Generate quote for issue:", issue);
              // Could add a part with the issue name as description
            }}
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
            clientName={clientData?.machineOwner || ""}
            machineModel={clientData?.machineModel || ""}
            jobCardId={savedJobCardId || undefined}
            pdfData={{
              orderNumber,
              jobCardNumber,
              jobType,
              date: new Date().toLocaleDateString("bg-BG"),
              technicians: assignedTechnicians.filter(t => t),
              leadTechnician: leadTechnicianName || undefined,
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
              photoUrls: [
                ...faultPhotos.map(p => p.url),
                // Include Free Check inspection photos
                ...Object.values(freeCheckItems)
                  .filter(item => item.photoUrl)
                  .map(item => item.photoUrl as string),
              ],
              engineHoursPhotoUrl: hoursPhotoUrl,
              totalWorkTime: elapsedTime,
            }}
          />
        </div>
      </div>
      </main>
    </TechnicalPortalLayout>
  );
}

// Default export with Suspense boundary for useSearchParams
export default function WorkCardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    }>
      <WorkCardPageContent />
    </Suspense>
  );
}
