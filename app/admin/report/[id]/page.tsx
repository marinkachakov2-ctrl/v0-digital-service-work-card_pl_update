"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  ArrowLeft,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Calendar,
  User,
  Wrench,
  FileText,
  ImageIcon,
  DollarSign,
  PenLine,
} from "lucide-react";

// 14-point check items
const FREE_CHECK_POINTS = [
  { id: "01", name: "Горивен филтър", desc: "Проверка за вода, остатъци и течове" },
  { id: "02", name: "Пистов ремък", desc: "Състояние и обтяжна шайба" },
  { id: "03", name: "Водна помпа", desc: "Проверка за теч" },
  { id: "04", name: "Маркучи на климатика", desc: "Износване и позиция на монтаж" },
  { id: "05", name: "Въздушен филтър и отдушници", desc: "Кабина и капачки на отдушници" },
  { id: "06", name: "Линии на спирачките", desc: "Корозия и повреда на задния мост" },
  { id: "07", name: "Софтуер и свързаност", desc: "Версии и JDLink статус" },
  { id: "08", name: "Пробно каране", desc: "Функционална проверка в движение" },
  { id: "09", name: "Информационен панел", desc: "Проверка на дисплеи и индикатори" },
  { id: "10", name: "Седалка и Волан", desc: "Проверка на механизми и луфтове" },
  { id: "11", name: "Турбокомпресор", desc: "Оглед на двигател и турбо" },
  { id: "12", name: "Алтернатор", desc: "Зареждане и състояние" },
  { id: "13", name: "Охладителна система", desc: "Нива и течове" },
  { id: "14", name: "MFWD и TLS окачване", desc: "Преден мост и кормилна уредба" },
];

interface ReportData {
  id: string;
  orderNumber: string;
  navisionOrderNo: string | null;
  status: string;
  date: string;
  machineModel: string;
  serialNumber: string;
  engineSN: string;
  engineHours: number;
  technicianName: string;
  clientName: string;
  description: string;
  partsTotal: number;
  laborTotal: number;
  vat: number;
  grandTotal: number;
  signatureUrl: string | null;
  signatureData: string | null;
  signerName: string | null;
  photoUrls: string[];
  inspectionResults: Array<{
    controlPointNo: string;
    controlPointName: string;
    status: string;
    comments: string | null;
    photoUrl: string | null;
  }>;
  defectPhotos: Array<{
    url: string;
    description: string;
  }>;
}

export default function ServiceCompletionReportPage() {
  const params = useParams();
  const jobCardId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);

  const fetchReportData = useCallback(async () => {
    const supabase = createClient();

    try {
      // Fetch job card with related data
      const { data: jobCard, error: jobCardError } = await supabase
        .from("job_cards")
        .select(`
          *,
          machines (
            brand,
            model,
            serial_number,
            engine_sn,
            client_name
          ),
          technicians (
            name
          )
        `)
        .eq("id", jobCardId)
        .single();

      if (jobCardError || !jobCard) {
        toast.error("Job card not found");
        return;
      }

      // Fetch parts
      const { data: partsData } = await supabase
        .from("job_card_parts")
        .select(`
          quantity,
          price_at_submission,
          parts (
            part_number,
            description
          )
        `)
        .eq("job_card_id", jobCardId);

      // Fetch labor
      const { data: laborData } = await supabase
        .from("job_card_labor")
        .select("actual_hours")
        .eq("job_card_id", jobCardId);

      // Fetch free check results
      const { data: inspectionData } = await supabase
        .from("free_check_results")
        .select("control_point_no, control_point_name, status, comments, photo_url")
        .eq("job_card_id", jobCardId);

      // Calculate totals
      const partsTotal = (partsData || []).reduce((sum, p) => {
        const partData = p as { quantity?: number; price_at_submission?: number };
        return sum + ((partData.price_at_submission || 0) * (partData.quantity || 1));
      }, 0);

      const laborTotal = (laborData || []).reduce((sum, l) => {
        const laborItem = l as { actual_hours?: number };
        return sum + ((laborItem.actual_hours || 0) * 50);
      }, 0);

      const vat = (partsTotal + laborTotal) * 0.2;
      const grandTotal = partsTotal + laborTotal + vat;

      // Get machine data
      const machineData = jobCard.machines as {
        brand?: string;
        model?: string;
        serial_number?: string;
        engine_sn?: string;
        client_name?: string;
      } | null;

      const techData = jobCard.technicians as { name?: string } | null;

      // Build inspection results with all 14 points
      const inspectionResults = FREE_CHECK_POINTS.map(point => {
        const result = (inspectionData || []).find(
          (r) => (r as { control_point_no: string }).control_point_no === point.id
        ) as { control_point_no: string; control_point_name: string; status: string; comments: string | null; photo_url: string | null } | undefined;
        return {
          controlPointNo: point.id,
          controlPointName: point.name,
          status: result?.status || "pending",
          comments: result?.comments || null,
          photoUrl: result?.photo_url || null,
        };
      });

      // Build defect photos array
      const defectPhotos: Array<{ url: string; description: string }> = [];
      
      // Add photos from job card
      if (jobCard.photo_urls && Array.isArray(jobCard.photo_urls)) {
        jobCard.photo_urls.forEach((url: string, idx: number) => {
          defectPhotos.push({
            url,
            description: `Defect Photo ${idx + 1}`,
          });
        });
      }

      // Add inspection photos with repair status
      inspectionResults.forEach(result => {
        if (result.photoUrl && result.status === "repair") {
          defectPhotos.push({
            url: result.photoUrl,
            description: `${result.controlPointName}: ${result.comments || "Needs attention"}`,
          });
        }
      });

      setReportData({
        id: jobCard.id,
        orderNumber: jobCard.order_no || `TEMP-${jobCard.id.slice(0, 8)}`,
        navisionOrderNo: jobCard.navision_order_no,
        status: jobCard.status,
        date: new Date(jobCard.created_at).toLocaleDateString("bg-BG"),
        machineModel: `${machineData?.brand || ""} ${machineData?.model || ""}`.trim() || "N/A",
        serialNumber: machineData?.serial_number || jobCard.serial_number || "N/A",
        engineSN: machineData?.engine_sn || "N/A",
        engineHours: jobCard.current_machine_hours || 0,
        technicianName: techData?.name || jobCard.technician_name || "N/A",
        clientName: machineData?.client_name || "N/A",
        description: jobCard.complaint_description || jobCard.notes || "N/A",
        partsTotal,
        laborTotal,
        vat,
        grandTotal,
        signatureUrl: jobCard.signature_url,
        signatureData: jobCard.signature_data,
        signerName: jobCard.client_name_signed,
        photoUrls: jobCard.photo_urls || [],
        inspectionResults,
        defectPhotos,
      });
    } catch (error) {
      console.error("Error fetching report data:", error);
      toast.error("Failed to load report data");
    } finally {
      setIsLoading(false);
    }
  }, [jobCardId]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      // Trigger browser print which can save as PDF
      window.print();
      toast.success("PDF export initiated", {
        description: "Use your browser's print dialog to save as PDF",
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading service report...</p>
        </div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Report Not Found</h2>
            <p className="text-muted-foreground mb-4">The requested service report could not be loaded.</p>
            <Link href="/admin/job-cards">
              <Button>Back to Job Cards</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const passedCount = reportData.inspectionResults.filter(r => r.status === "+").length;
  const actionNeededCount = reportData.inspectionResults.filter(r => r.status === "repair" || r.status === "0").length;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
      {/* Header - Print controls (hidden in print) */}
      <header className="sticky top-0 z-40 border-b border-border bg-card print:hidden">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link href="/admin/job-cards">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-semibold">Service Completion Report</h1>
              <p className="text-xs text-muted-foreground">Preview & Export</p>
            </div>
          </div>
          <Button
            size="lg"
            onClick={handleExportPDF}
            disabled={isExporting}
            className="gap-2 bg-primary hover:bg-primary/90 px-6"
          >
            {isExporting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Printer className="h-5 w-5" />
            )}
            Export to PDF
          </Button>
        </div>
      </header>

      {/* A4 Document Preview */}
      <main className="container py-8 px-4 print:p-0 print:py-0">
        <div className="mx-auto max-w-[210mm] bg-white dark:bg-slate-950 shadow-xl print:shadow-none rounded-lg overflow-hidden">
          
          {/* Document Header */}
          <div className="bg-gradient-to-r from-green-800 to-green-700 text-white p-6 print:p-8">
            <div className="flex items-start justify-between">
              {/* Logo Placeholder */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/10 rounded-lg flex items-center justify-center border border-white/20">
                  <Wrench className="h-8 w-8" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">MEGATRON</h1>
                  <p className="text-green-200 text-sm">Digital Service</p>
                </div>
              </div>

              {/* Document Title & Order Number */}
              <div className="text-right">
                <h2 className="text-lg font-semibold mb-2">John Deere Service Protocol</h2>
                <Badge className="bg-yellow-400 text-yellow-900 hover:bg-yellow-400 text-sm px-3 py-1">
                  {reportData.navisionOrderNo || reportData.orderNumber}
                </Badge>
              </div>
            </div>
          </div>

          {/* Document Content */}
          <div className="p-6 print:p-8 space-y-6">
            
            {/* Grid Info - Two Columns */}
            <div className="grid grid-cols-2 gap-6 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Wrench className="h-4 w-4 text-green-600" />
                  <span className="text-slate-500 dark:text-slate-400">Machine Model:</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{reportData.machineModel}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-green-600" />
                  <span className="text-slate-500 dark:text-slate-400">Serial Number:</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{reportData.serialNumber}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-green-600" />
                  <span className="text-slate-500 dark:text-slate-400">Engine Hours:</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{reportData.engineHours.toLocaleString()} h</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-green-600" />
                  <span className="text-slate-500 dark:text-slate-400">Technician:</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{reportData.technicianName}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-green-600" />
                  <span className="text-slate-500 dark:text-slate-400">Date:</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{reportData.date}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-green-600" />
                  <span className="text-slate-500 dark:text-slate-400">Client:</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{reportData.clientName}</span>
                </div>
              </div>
            </div>

            {/* Complaint Description */}
            {reportData.description && reportData.description !== "N/A" && (
              <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">Complaint / Work Description</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">{reportData.description}</p>
              </div>
            )}

            <Separator />

            {/* Inspection Section - 14 Point Check */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  14-Point Inspection Protocol
                </h3>
                <div className="flex gap-2">
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {passedCount} Passed
                  </Badge>
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {actionNeededCount} Action Needed
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {reportData.inspectionResults.map((item) => {
                  const isPassed = item.status === "+";
                  const isActionNeeded = item.status === "repair" || item.status === "0";
                  const isPending = !isPassed && !isActionNeeded;

                  return (
                    <div
                      key={item.controlPointNo}
                      className={`flex items-center gap-3 p-3 rounded-lg border ${
                        isPassed
                          ? "bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800"
                          : isActionNeeded
                          ? "bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800"
                          : "bg-slate-50 border-slate-200 dark:bg-slate-800/50 dark:border-slate-700"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        isPassed
                          ? "bg-green-500 text-white"
                          : isActionNeeded
                          ? "bg-red-500 text-white"
                          : "bg-slate-300 text-slate-600 dark:bg-slate-600 dark:text-slate-300"
                      }`}>
                        {isPassed ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : isActionNeeded ? (
                          <AlertTriangle className="h-4 w-4" />
                        ) : (
                          <span className="text-xs font-medium">{item.controlPointNo}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${
                          isPassed
                            ? "text-green-800 dark:text-green-300"
                            : isActionNeeded
                            ? "text-red-800 dark:text-red-300"
                            : "text-slate-600 dark:text-slate-400"
                        }`}>
                          {item.controlPointNo}. {item.controlPointName}
                        </p>
                        {item.comments && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{item.comments}</p>
                        )}
                      </div>
                      <div className="text-xs font-medium">
                        {isPassed ? (
                          <span className="text-green-600 dark:text-green-400">Passed</span>
                        ) : isActionNeeded ? (
                          <span className="text-red-600 dark:text-red-400">Action Needed</span>
                        ) : (
                          <span className="text-slate-400">Pending</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Defects & Gallery */}
            {reportData.defectPhotos.length > 0 && (
              <>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-4">
                    <ImageIcon className="h-5 w-5 text-green-600" />
                    Defects & Photo Documentation
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {reportData.defectPhotos.map((photo, idx) => (
                      <div key={idx} className="group">
                        <div className="aspect-square relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                          <Image
                            src={photo.url}
                            alt={photo.description}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 line-clamp-2">
                          {photo.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Financial Summary */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-4">
                <DollarSign className="h-5 w-5 text-green-600" />
                Financial Summary
              </h3>
              <Card className="border-slate-200 dark:border-slate-800">
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <tbody>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <td className="p-3 text-slate-600 dark:text-slate-400">Total Parts</td>
                        <td className="p-3 text-right font-medium text-slate-900 dark:text-slate-100">
                          {reportData.partsTotal.toLocaleString("bg-BG", { minimumFractionDigits: 2 })} BGN
                        </td>
                      </tr>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <td className="p-3 text-slate-600 dark:text-slate-400">Total Labor</td>
                        <td className="p-3 text-right font-medium text-slate-900 dark:text-slate-100">
                          {reportData.laborTotal.toLocaleString("bg-BG", { minimumFractionDigits: 2 })} BGN
                        </td>
                      </tr>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <td className="p-3 text-slate-600 dark:text-slate-400">VAT (20%)</td>
                        <td className="p-3 text-right font-medium text-slate-900 dark:text-slate-100">
                          {reportData.vat.toLocaleString("bg-BG", { minimumFractionDigits: 2 })} BGN
                        </td>
                      </tr>
                      <tr className="bg-green-50 dark:bg-green-900/20">
                        <td className="p-3 font-semibold text-green-800 dark:text-green-300">Grand Total</td>
                        <td className="p-3 text-right font-bold text-lg text-green-800 dark:text-green-300">
                          {reportData.grandTotal.toLocaleString("bg-BG", { minimumFractionDigits: 2 })} BGN
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>

            <Separator />

            {/* Signatures Footer */}
            <div className="grid grid-cols-2 gap-8 pt-4">
              {/* Technician Signature */}
              <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                  <PenLine className="h-4 w-4 text-green-600" />
                  Technician Signature
                </h4>
                <div className="h-24 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg flex items-center justify-center bg-slate-50 dark:bg-slate-800/50">
                  <div className="text-center">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{reportData.technicianName}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Service Technician</p>
                  </div>
                </div>
              </div>

              {/* Client Signature */}
              <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                  <PenLine className="h-4 w-4 text-green-600" />
                  Client Signature
                </h4>
                <div className="h-24 border-2 border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-900">
                  {reportData.signatureUrl || reportData.signatureData ? (
                    <div className="relative h-full w-full">
                      <Image
                        src={reportData.signatureUrl || reportData.signatureData || ""}
                        alt="Client Signature"
                        fill
                        className="object-contain p-2"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-xs text-slate-400 dark:text-slate-500">Awaiting signature</p>
                    </div>
                  )}
                </div>
                {reportData.signerName && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 text-center">{reportData.signerName}</p>
                )}
              </div>
            </div>

            {/* Document Footer */}
            <div className="pt-6 border-t border-slate-200 dark:border-slate-800 mt-6">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <p>Document ID: {reportData.id.slice(0, 12).toUpperCase()}</p>
                <p>Generated: {new Date().toLocaleDateString("bg-BG")} {new Date().toLocaleTimeString("bg-BG", { hour: "2-digit", minute: "2-digit" })}</p>
                <p>Megatron Digital Service</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:p-0 {
            padding: 0 !important;
          }
          .print\\:py-0 {
            padding-top: 0 !important;
            padding-bottom: 0 !important;
          }
          .print\\:p-8 {
            padding: 2rem !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}
