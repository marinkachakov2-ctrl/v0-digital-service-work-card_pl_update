"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { WorkCardHeader } from "@/components/work-card/header";
import { ClientSection } from "@/components/work-card/client-section";
import { DiagnosticsSection, type FaultPhoto } from "@/components/work-card/diagnostics-section";
import { PartsTable } from "@/components/work-card/parts-table";
import { LaborTable } from "@/components/work-card/labor-table";
import { Footer } from "@/components/work-card/footer";

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
}

export interface ClientData {
  clientName: string;
  location: string;
  machineModel: string;
  serialNo: string;
  engineSN: string;
  vin: string;
}

// Sample client / machine database for search
const clientDatabase: ClientData[] = [
  {
    clientName: "Agro Farm Ltd.",
    location: "София, България",
    machineModel: "John Deere 8370R",
    serialNo: "RW8370R001234",
    engineSN: "PE6068T123456",
    vin: "RW8370R001234",
  },
  {
    clientName: "Агроинвест ООД",
    location: "Пловдив, България",
    machineModel: "John Deere 6M",
    serialNo: "1L06155MCHJ100042",
    engineSN: "PE4045T987654",
    vin: "1L06155MCHJ100042",
  },
  {
    clientName: "Био Поле ЕООД",
    location: "Стара Загора, България",
    machineModel: "John Deere T670",
    serialNo: "1T0670HVVLR012345",
    engineSN: "PE6090H543210",
    vin: "1T0670HVVLR012345",
  },
  {
    clientName: "Зърно АД",
    location: "Бургас, България",
    machineModel: "Claas Lexion 770",
    serialNo: "CL7700023456",
    engineSN: "MAN-D2676LE626",
    vin: "CL7700023456",
  },
  {
    clientName: "Ферма Плюс ООД",
    location: "Велико Търново, България",
    machineModel: "Fendt 942 Vario",
    serialNo: "FN942V003210",
    engineSN: "MAN-D1556LE540",
    vin: "FN942V003210",
  },
  {
    clientName: "Агро Макс ЕООД",
    location: "Русе, България",
    machineModel: "New Holland T7.315",
    serialNo: "NH7315V009876",
    engineSN: "FPT-N67EM002",
    vin: "NH7315V009876",
  },
  {
    clientName: "Грийн Харвест ООД",
    location: "Варна, България",
    machineModel: "John Deere S790",
    serialNo: "1H0S790SHN0800123",
    engineSN: "PE6135H654321",
    vin: "1H0S790SHN0800123",
  },
  {
    clientName: "Тракия Агро АД",
    location: "Хасково, България",
    machineModel: "Case IH Magnum 380",
    serialNo: "CIMAGN380002",
    engineSN: "FPT-C13ENT004",
    vin: "CIMAGN380002",
  },
];

export default function WorkCardPage() {
  const [searchValue, setSearchValue] = useState("");
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [isScanned, setIsScanned] = useState(false);

  // Multi-field search results
  const searchResults = useMemo(() => {
    const q = searchValue.trim().toLowerCase();
    if (q.length < 2) return [];
    return clientDatabase.filter((c) =>
      [c.clientName, c.location, c.machineModel, c.serialNo, c.engineSN, c.vin]
        .some((field) => field.toLowerCase().includes(q))
    );
  }, [searchValue]);

  const handleSelectClient = useCallback((client: ClientData) => {
    setClientData(client);
    setSearchValue(client.serialNo);
    setIsScanned(true);
  }, []);

  // Technicians – dynamic list, starts with one
  const [technicians, setTechnicians] = useState<string[]>([""]);

  // Work card traffic-light status: green = working, yellow = waiting, red = blocked
  const [workCardStatus, setWorkCardStatus] = useState<"green" | "yellow" | "red">("green");

  // Per-technician timer state keyed by index
  const [techTimers, setTechTimers] = useState<
    Record<number, { status: "idle" | "running" | "paused"; elapsed: number }>
  >({});
  const intervalsRef = useRef<Record<number, NodeJS.Timeout>>({});

  const formatTime = useCallback((totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }, []);

  // Start / resume a single technician's timer
  const handleTechTimerStart = useCallback((index: number) => {
    setTechTimers((prev) => ({
      ...prev,
      [index]: { status: "running", elapsed: prev[index]?.elapsed ?? 0 },
    }));
  }, []);

  // Pause a single technician's timer
  const handleTechTimerPause = useCallback((index: number) => {
    setTechTimers((prev) => ({
      ...prev,
      [index]: { ...prev[index], status: "paused" },
    }));
  }, []);

  // Stop & reset a single technician's timer
  const handleTechTimerStop = useCallback((index: number) => {
    setTechTimers((prev) => ({
      ...prev,
      [index]: { status: "idle", elapsed: 0 },
    }));
  }, []);

  // Tick running timers
  useEffect(() => {
    // Start intervals for running timers
    Object.entries(techTimers).forEach(([key, timer]) => {
      const idx = Number(key);
      if (timer.status === "running" && !intervalsRef.current[idx]) {
        intervalsRef.current[idx] = setInterval(() => {
          setTechTimers((prev) => ({
            ...prev,
            [idx]: { ...prev[idx], elapsed: (prev[idx]?.elapsed ?? 0) + 1 },
          }));
        }, 1000);
      } else if (timer.status !== "running" && intervalsRef.current[idx]) {
        clearInterval(intervalsRef.current[idx]);
        delete intervalsRef.current[idx];
      }
    });

    return () => {
      Object.values(intervalsRef.current).forEach(clearInterval);
      intervalsRef.current = {};
    };
  }, [techTimers]);

  // Order type
  const [orderType, setOrderType] = useState<"warranty" | "repair" | "internal">("repair");

  // Diagnostics
  const [reasonCode, setReasonCode] = useState("");
  const [defectCode, setDefectCode] = useState("");
  const [description, setDescription] = useState("");
  const [faultDate, setFaultDate] = useState("");
  const [repairStart, setRepairStart] = useState("");
  const [repairEnd, setRepairEnd] = useState("");
  const [engineHours, setEngineHours] = useState("");
  const [engineHoursPhoto, setEngineHoursPhoto] = useState<FaultPhoto | null>(null);
  const [faultPhotos, setFaultPhotos] = useState<FaultPhoto[]>([]);

  // Parts & Labor
  const [parts, setParts] = useState<PartItem[]>([]);
  const [laborItems, setLaborItems] = useState<LaborItem[]>([]);
  const [workNotes, setWorkNotes] = useState("");

  const handleSimulateScan = () => {
    handleSelectClient(clientDatabase[0]);
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

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-6 lg:px-8">
        <WorkCardHeader
          orderType={orderType}
          onOrderTypeChange={setOrderType}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchResults={searchResults}
          onSelectClient={handleSelectClient}
          onSimulateScan={handleSimulateScan}
          technicians={technicians}
          onTechniciansChange={setTechnicians}
          workCardStatus={workCardStatus}
          onWorkCardStatusChange={setWorkCardStatus}
          techTimers={techTimers}
          formatTime={formatTime}
          onTechTimerStart={handleTechTimerStart}
          onTechTimerPause={handleTechTimerPause}
          onTechTimerStop={handleTechTimerStop}
        />

        <div className="mt-6 space-y-6">
          <ClientSection
            clientData={clientData}
            isScanned={isScanned}
          />

          <DiagnosticsSection
            reasonCode={reasonCode}
            defectCode={defectCode}
            description={description}
            faultDate={faultDate}
            repairStart={repairStart}
            repairEnd={repairEnd}
            engineHours={engineHours}
            engineHoursPhoto={engineHoursPhoto}
            photos={faultPhotos}
            onReasonChange={setReasonCode}
            onDefectChange={setDefectCode}
            onDescriptionChange={setDescription}
            onFaultDateChange={setFaultDate}
            onRepairStartChange={setRepairStart}
            onRepairEndChange={setRepairEnd}
            onEngineHoursChange={setEngineHours}
            onEngineHoursPhotoChange={setEngineHoursPhoto}
            onPhotosChange={setFaultPhotos}
          />

          <PartsTable parts={parts} onPartsChange={setParts} />

          <LaborTable
            laborItems={laborItems}
            onLaborItemsChange={setLaborItems}
            workNotes={workNotes}
            onWorkNotesChange={setWorkNotes}
          />

          <Footer
            laborTotal={laborTotal}
            partsTotal={partsTotal}
            vat={vat}
            grandTotal={grandTotal}
          />
        </div>
      </div>
    </main>
  );
}
