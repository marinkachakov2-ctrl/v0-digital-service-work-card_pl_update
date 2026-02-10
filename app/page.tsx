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

export default function WorkCardPage() {
  const [searchValue, setSearchValue] = useState("");
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [isScanned, setIsScanned] = useState(false);

  // Technicians
  const [technician1, setTechnician1] = useState("");
  const [technician2, setTechnician2] = useState("");

  // Timer
  const [timerStatus, setTimerStatus] = useState<"idle" | "running" | "paused">(
    "idle"
  );
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

  // Checkboxes
  const [warranty, setWarranty] = useState(false);
  const [repair, setRepair] = useState(false);
  const [internalLabor, setInternalLabor] = useState(false);

  // Diagnostics
  const [reasonCode, setReasonCode] = useState("");
  const [defectCode, setDefectCode] = useState("");
  const [description, setDescription] = useState("");
  const [faultDate, setFaultDate] = useState("");
  const [repairStart, setRepairStart] = useState("");
  const [repairEnd, setRepairEnd] = useState("");
  const [engineHours, setEngineHours] = useState("");
  const [faultPhotos, setFaultPhotos] = useState<FaultPhoto[]>([]);

  // Parts & Labor
  const [parts, setParts] = useState<PartItem[]>([]);
  const [laborItems, setLaborItems] = useState<LaborItem[]>([]);

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<"bank" | "cash">("bank");

  const handleSimulateScan = () => {
    setClientData({
      clientName: "Agro Farm Ltd.",
      location: "София, България",
      machineModel: "John Deere 8370R",
      serialNo: "RW8370R001234",
      engineSN: "PE6068T123456",
      vin: "RW8370R001234",
    });
    setSearchValue("RW8370R001234");
    setIsScanned(true);
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
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          onSimulateScan={handleSimulateScan}
          technician1={technician1}
          technician2={technician2}
          onTechnician1Change={setTechnician1}
          onTechnician2Change={setTechnician2}
          timerStatus={timerStatus}
          elapsedTime={elapsedTime}
          onTimerStart={handleTimerStart}
          onTimerPause={handleTimerPause}
          onTimerStop={handleTimerStop}
        />

        <div className="mt-6 space-y-6">
          <ClientSection
            clientData={clientData}
            isScanned={isScanned}
            warranty={warranty}
            repair={repair}
            internalLabor={internalLabor}
            onWarrantyChange={setWarranty}
            onRepairChange={setRepair}
            onInternalLaborChange={setInternalLabor}
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
          />

          <PartsTable parts={parts} onPartsChange={setParts} />

          <LaborTable laborItems={laborItems} onLaborItemsChange={setLaborItems} />

          <Footer
            paymentMethod={paymentMethod}
            onPaymentMethodChange={setPaymentMethod}
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
